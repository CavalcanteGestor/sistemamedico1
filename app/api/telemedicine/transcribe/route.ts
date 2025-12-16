import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se é médico
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'medico' && profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Apenas médicos podem transcrever áudio' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const sessionId = formData.get('sessionId') as string

    // Verificar consentimento de IA se sessão usar IA
    if (sessionId) {
      const { data: session } = await supabase
        .from('telemedicine_sessions')
        .select('ai_summary_enabled, transcription_enabled, ai_consent_doctor, ai_consent_patient')
        .eq('id', sessionId)
        .maybeSingle()

      if (session?.transcription_enabled || session?.ai_summary_enabled) {
        if (!session.ai_consent_doctor) {
          return NextResponse.json(
            { error: 'Consentimento do médico para uso de IA não foi registrado' },
            { status: 403 }
          )
        }

        if (session.ai_summary_enabled && !session.ai_consent_patient) {
          return NextResponse.json(
            { error: 'Consentimento do paciente para uso de IA não foi registrado. Aguarde o paciente aceitar o termo.' },
            { status: 403 }
          )
        }
      }
    }

    // ESTRATÉGIA 1: Apenas gravação separada (médico e paciente)
    const audioFileDoctor = formData.get('audioDoctor') as File | null
    const audioFilePatient = formData.get('audioPatient') as File | null

    // Requer áudio separado para identificação precisa
    if (!audioFileDoctor && !audioFilePatient) {
      return NextResponse.json(
        { error: 'Arquivos de áudio separados (médico e/ou paciente) são obrigatórios para transcrição precisa' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key não configurada' },
        { status: 500 }
      )
    }

    // ESTRATÉGIA 1: Gravação separada - Transcrever áudio do médico e paciente separadamente
    const doctorSegments: Array<{ text: string; start: number; end: number; speaker: 'doctor' }> = []
    const patientSegments: Array<{ text: string; start: number; end: number; speaker: 'patient' }> = []

    // Transcrever áudio do médico
    if (audioFileDoctor) {
      try {
        const doctorBuffer = Buffer.from(await audioFileDoctor.arrayBuffer())
        const doctorTranscription = await openai.audio.transcriptions.create({
          file: new File([doctorBuffer], audioFileDoctor.name, { type: audioFileDoctor.type }),
          model: 'whisper-1',
          language: 'pt',
          response_format: 'verbose_json',
          timestamp_granularities: ['segment'],
        })

        const doctorSegs = (doctorTranscription as any).segments?.map((seg: any) => ({
          text: seg.text,
          start: seg.start,
          end: seg.end,
          speaker: 'doctor' as const,
        })) || []

        doctorSegments.push(...doctorSegs)
      } catch (error: any) {
        console.error('Erro ao transcrever áudio do médico:', error)
        return NextResponse.json(
          { error: `Erro ao transcrever áudio do médico: ${error.message}` },
          { status: 500 }
        )
      }
    }

    // Transcrever áudio do paciente
    if (audioFilePatient) {
      try {
        const patientBuffer = Buffer.from(await audioFilePatient.arrayBuffer())
        const patientTranscription = await openai.audio.transcriptions.create({
          file: new File([patientBuffer], audioFilePatient.name, { type: audioFilePatient.type }),
          model: 'whisper-1',
          language: 'pt',
          response_format: 'verbose_json',
          timestamp_granularities: ['segment'],
        })

        const patientSegs = (patientTranscription as any).segments?.map((seg: any) => ({
          text: seg.text,
          start: seg.start,
          end: seg.end,
          speaker: 'patient' as const,
        })) || []

        patientSegments.push(...patientSegs)
      } catch (error: any) {
        console.error('Erro ao transcrever áudio do paciente:', error)
        return NextResponse.json(
          { error: `Erro ao transcrever áudio do paciente: ${error.message}` },
          { status: 500 }
        )
      }
    }

    // Combinar segmentos e ordenar por timestamp (diarização precisa)
    const segments = [...doctorSegments, ...patientSegments].sort((a, b) => a.start - b.start)

    // Salvar transcrição no banco
    if (sessionId && segments.length > 0) {
      for (const segment of segments) {
        await supabase.from('telemedicine_transcriptions').upsert({
          session_id: sessionId,
          text: segment.text,
          timestamp: segment.start,
          speaker: segment.speaker,
          included: true,
        })
      }
    }

    const fullText = segments.map(s => s.text).join(' ')

    return NextResponse.json({
      success: true,
      segments,
      fullText,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || 'Erro ao transcrever áudio',
      },
      { status: 500 }
    )
  }
}

