import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Modelo padrão: gpt-4o-mini (melhor custo-benefício - Dezembro 2025)
// Alternativas disponíveis:
// - 'gpt-4o-mini' (recomendado) - US$ 0.150/1M entrada, US$ 0.600/1M saída - Melhor custo-benefício
// - 'gpt-4o' - US$ 2.50/1M entrada, US$ 10.00/1M saída - Melhor qualidade
// - 'gpt-4-turbo' - Versão anterior
// Nota: gpt-5.1-mini não existe - usar gpt-4o-mini como padrão
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { id } = await params
    const sessionId = id

    // Verificar se é médico
    let userRole = 'paciente'
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      
      userRole = profileData?.role || 'paciente'
    } catch (error) {
      // Erro ao buscar perfil - continuar (será bloqueado depois se necessário)
    }

    if (userRole !== 'medico' && userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Apenas médicos podem gerar resumos' },
        { status: 403 }
      )
    }

    // Buscar dados da sessão (sem joins complexos para evitar erros 400)
    const { data: session, error: sessionError } = await supabase
      .from('telemedicine_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      )
    }

    // Verificar consentimento de IA
    if (session.ai_summary_enabled) {
      if (!session.ai_consent_doctor) {
        return NextResponse.json(
          { error: 'Consentimento do médico para uso de IA não foi registrado' },
          { status: 403 }
        )
      }

      if (!session.ai_consent_patient) {
        return NextResponse.json(
          { error: 'Consentimento do paciente para uso de IA não foi registrado. Aguarde o paciente aceitar o termo.' },
          { status: 403 }
        )
      }
    }

    // Buscar dados do agendamento separadamente
    let patientName = 'Paciente'
    let doctorName = 'Médico'
    let specialty = ''
    let appointmentDate = ''
    
    if (session.appointment_id) {
      try {
        // Buscar dados do agendamento sem joins para evitar erro 400
        const { data: appointment } = await supabase
          .from('appointments')
          .select('appointment_date, patient_id, doctor_id')
          .eq('id', session.appointment_id)
          .maybeSingle()
        
        if (appointment) {
          appointmentDate = appointment.appointment_date || ''
          
          // Buscar nome do paciente separadamente
          if (appointment.patient_id) {
            try {
              const { data: patientData } = await supabase
                .from('patients')
                .select('name')
                .eq('id', appointment.patient_id)
                .maybeSingle()
              
              if (patientData) {
                patientName = patientData.name || 'Paciente'
              }
            } catch {
              // Erro silencioso
            }
          }
          
          // Buscar nome do médico separadamente
          if (appointment.doctor_id) {
            try {
              const { data: doctorData } = await supabase
                .from('doctors')
                .select('name')
                .eq('id', appointment.doctor_id)
                .maybeSingle()
              
              if (doctorData) {
                doctorName = doctorData.name || 'Médico'
              }
            } catch {
              // Erro silencioso
            }
          }
        }
      } catch {
        // Erro silencioso - continuar sem dados do agendamento
      }
    }

    const body = await request.json()
    const { duration, notes, transcriptionSegments, customPrompt } = body
    
    // Buscar prompt personalizado da sessão se não fornecido
    let finalPrompt = customPrompt
    if (!finalPrompt && session.ai_summary_prompt) {
      finalPrompt = session.ai_summary_prompt
    }

    // Buscar anotações da sessão (se não foram enviadas no body)
    const sessionNotes = notes || ''
    let notesFromDb = ''
    try {
      const { data: notesData } = await supabase
        .from('telemedicine_notes')
        .select('note')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      notesFromDb = notesData?.note || ''
    } catch {
      // Erro silencioso
    }

    const finalNotes = sessionNotes || notesFromDb || session.notes || ''

    // Usar transcrições fornecidas ou buscar do banco
    let conversationText = ''
    
    if (transcriptionSegments && transcriptionSegments.length > 0) {
      // Usar segmentos selecionados pelo médico
      conversationText = transcriptionSegments
        .map((seg: any) => {
          const speakerLabel = seg.speaker === 'doctor' ? 'Médico' : 
                              seg.speaker === 'patient' ? 'Paciente' : 'Participante'
          return `[${Math.floor(seg.timestamp / 60)}:${Math.floor(seg.timestamp % 60).toString().padStart(2, '0')}] ${speakerLabel}: ${seg.text}`
        })
        .join('\n')
    } else {
      // Buscar transcrições do banco (incluídas)
      try {
        const { data: transcriptionData, error: transcriptionError } = await supabase
          .from('telemedicine_transcriptions')
          .select('text, timestamp, speaker')
          .eq('session_id', sessionId)
          .eq('included', true)
          .order('timestamp', { ascending: true })

        if (!transcriptionError && transcriptionData && transcriptionData.length > 0) {
          conversationText = transcriptionData
            .map((item: any) => {
              const speakerLabel = item.speaker === 'doctor' ? 'Médico' : 
                                  item.speaker === 'patient' ? 'Paciente' : 'Participante'
              const timestamp = Number(item.timestamp) || 0
              const minutes = Math.floor(timestamp / 60)
              const seconds = Math.floor(timestamp % 60)
              return `[${minutes}:${seconds.toString().padStart(2, '0')}] ${speakerLabel}: ${item.text}`
            })
            .join('\n')
        }
      } catch {
        // Erro silencioso - continuar sem transcrição
      }
    }

    // Buscar mensagens do chat para contexto adicional
    const { data: messagesData } = await supabase
      .from('telemedicine_messages')
      .select('message, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    const chatMessages = messagesData || []
    const chatContext = chatMessages.length > 0
      ? chatMessages.map((msg: any) => `[${new Date(msg.created_at).toLocaleTimeString('pt-BR')}] ${msg.message}`).join('\n')
      : ''

    // Verificar se OpenAI está configurado
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key não configurada' },
        { status: 500 }
      )
    }

    // Preparar contexto para a IA (já temos os valores acima)
    const durationMinutes = duration ? Math.floor(duration / 60) : 0

    const prompt = `Você é um assistente médico especializado em criar resumos profissionais de consultas médicas de telemedicina.

DADOS DA CONSULTA:
- Paciente: ${patientName}
- Médico: ${doctorName}${specialty ? ` - Especialidade: ${specialty}` : ''}
- Data: ${appointmentDate}
- Duração: ${durationMinutes} minutos

${conversationText ? `TRANSCRIÇÃO DA CONVERSA DA CONSULTA:\n${conversationText}\n` : ''}
${finalNotes ? `ANOTAÇÕES DO MÉDICO DURANTE A CONSULTA:\n${finalNotes}\n` : ''}
${chatContext ? `MENSAGENS DO CHAT DURANTE A CONSULTA:\n${chatContext}\n` : ''}

INSTRUÇÕES:
${finalPrompt ? `INSTRUÇÕES PERSONALIZADAS DO MÉDICO:\n${finalPrompt}\n\n` : ''}Crie um resumo médico profissional, completo e estruturado da consulta de telemedicina. Use as informações disponíveis (anotações e conversa do chat) para montar um resumo detalhado. Se alguma informação não estiver disponível, seja claro sobre isso no resumo.

ESTRUTURA DO RESUMO (siga esta ordem):

1. **Queixa Principal (QP)**
   - Identifique e descreva a principal queixa ou motivo da consulta

2. **História da Doença Atual (HDA)**
   - Descreva os sintomas relatados
   - Início, evolução e características dos sintomas
   - Fatores de melhora e piora, se mencionados

3. **Exame Físico/Clínico**
   - Principais achados observados durante a consulta (quando aplicável em telemedicina)
   - Observações visuais, se houver
   - Se não foi possível realizar exame físico, indique isso claramente

4. **Avaliação e Diagnóstico**
   - Avaliação clínica baseada nas informações coletadas
   - Hipóteses diagnósticas principais
   - Diagnóstico presuntivo ou definitivo, se estabelecido

5. **Plano Terapêutico**
   - Medicações prescritas (se houver)
   - Dosagem, frequência e duração do tratamento
   - Exames complementares solicitados (se houver)

6. **Orientações**
   - Orientações gerais dadas ao paciente
   - Recomendações de cuidados
   - Orientações sobre sinais de alarme

7. **Retorno/Acompanhamento**
   - Quando necessário retorno ou reavaliação
   - Próximos passos do acompanhamento

IMPORTANTE:
- Use linguagem médica profissional e precisa
- Seja objetivo e claro
- Se não houver informações suficientes em alguma seção, indique claramente: "Informação não disponível" ou "Não mencionado durante a consulta"
- Baseie-se estritamente nas informações fornecidas (anotações e chat)
- Não invente informações que não foram mencionadas
- Use formatação markdown para destacar títulos e seções

Agora, crie o resumo seguindo a estrutura acima:`

    // Gerar resumo com OpenAI
    // Modelo configurável via env OPENAI_MODEL (padrão: gpt-5.1-mini)
    // gpt-5.1-mini: melhor custo-benefício, melhor qualidade (Dezembro 2025)
    // gpt-4o-mini: versão anterior (legacy)
    // gpt-5: versão completa (mais caro)
    const model = DEFAULT_MODEL as 'gpt-5.1-mini' | 'gpt-5-mini' | 'gpt-5' | 'gpt-4o-mini' | 'gpt-4o' | 'gpt-4-turbo' | string
    
    let generatedSummary = ''
    
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content:
              'Você é um assistente médico profissional especializado em criar resumos de consultas médicas de telemedicina. Seja preciso, profissional e siga a estrutura médica padrão.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      })

      generatedSummary = completion.choices[0]?.message?.content || ''

      if (!generatedSummary) {
        throw new Error('A OpenAI não retornou um resumo válido')
      }
    } catch (openaiError: any) {
      console.error('Erro ao chamar OpenAI:', openaiError)
      
      // Retornar erro mais específico
      if (openaiError.message?.includes('API key') || openaiError.status === 401) {
        return NextResponse.json(
          { error: 'Erro de configuração da API da OpenAI. Verifique a chave API.' },
          { status: 500 }
        )
      }
      
      if (openaiError.message?.includes('model') || openaiError.status === 404) {
        return NextResponse.json(
          { error: `Modelo ${model} não disponível. Verifique OPENAI_MODEL.` },
          { status: 500 }
        )
      }
      
      throw new Error(`Erro ao gerar resumo com IA: ${openaiError.message || 'Erro desconhecido'}`)
    }

    // Salvar resumo no banco
    try {
      const { error: updateError } = await supabase
        .from('telemedicine_sessions')
        .update({
          ai_summary: generatedSummary,
          ai_summary_generated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)

      if (updateError) {
        console.error('Erro ao salvar resumo:', updateError)
        // Não falhar a requisição se apenas o salvamento falhar
      }
    } catch (saveError) {
      console.error('Erro ao tentar salvar resumo:', saveError)
      // Continuar mesmo se salvar falhar - o resumo já foi gerado
    }

    return NextResponse.json({
      summary: generatedSummary,
    })
  } catch (error: any) {
    console.error('Erro ao gerar resumo:', error)
    return NextResponse.json(
      {
        error: error.message || 'Erro ao gerar resumo da consulta',
      },
      { status: 500 }
    )
  }
}

