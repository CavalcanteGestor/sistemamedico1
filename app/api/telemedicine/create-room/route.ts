import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      appointmentId, 
      provider,
      aiSummaryEnabled = false,
      aiSummaryPrompt,
      transcriptionEnabled = false,
      aiConsentDoctor = false,
    } = body

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'ID do agendamento é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o usuário tem permissão
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        doctors:doctor_id (
          user_id
        )
      `)
      .eq('id', appointmentId)
      .single()

    if (appointmentError || !appointment) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    // Verificar permissão (médico ou admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'medico') {
      if (appointment.doctors?.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Sem permissão para criar sessão de telemedicina' },
          { status: 403 }
        )
      }
    }

    // Criar sessão diretamente usando WebRTC nativo (sem Jitsi ou login)
    // Formato simplificado do roomId (sem prefixo webrtc duplicado)
    const roomId = `${appointmentId}-${Date.now()}`
    // room_url não é necessário para WebRTC nativo, mas mantemos para compatibilidade
    const roomUrl = `webrtc://${roomId}`

    const { data: session, error: sessionError } = await supabase
      .from('telemedicine_sessions')
      .insert({
        appointment_id: appointmentId,
        room_id: roomId,
        room_url: roomUrl,
        status: 'pending',
        ai_summary_enabled: aiSummaryEnabled || false,
        ai_summary_prompt: aiSummaryPrompt || null,
        transcription_enabled: transcriptionEnabled || false,
        ai_consent_doctor: aiConsentDoctor || false,
        ai_consent_doctor_at: aiConsentDoctor ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: sessionError?.message || 'Erro ao criar sessão de telemedicina' },
        { status: 500 }
      )
    }

    // Enviar notificação para o paciente
    try {
      // Buscar dados do agendamento para notificar o paciente
      const { data: appointmentForNotification } = await supabase
        .from('appointments')
        .select(`
          *,
          patients:patient_id (
            id,
            name,
            user_id
          ),
          doctors:doctor_id (
            id,
            name
          )
        `)
        .eq('id', appointmentId)
        .single()

      if (appointmentForNotification?.patients?.user_id) {
        const doctorName = appointmentForNotification.doctors?.name || 'seu médico'
        const appointmentDate = new Date(`${appointmentForNotification.appointment_date}T${appointmentForNotification.appointment_time}`)

        // Criar notificação para o paciente
        await supabase.from('notifications').insert({
          user_id: appointmentForNotification.patients.user_id,
          title: 'Consulta de Telemedicina Disponível',
          message: `Sua consulta de telemedicina com Dr(a). ${doctorName} está disponível. Clique para entrar na consulta.`,
          type: 'success',
          link: `/portal/consultas/telemedicina/${appointmentId}`,
          read: false,
        })
      }
    } catch (notificationError) {
      // Não falhar a criação da sessão se a notificação falhar
      console.error('Erro ao enviar notificação:', notificationError)
    }

    return NextResponse.json({ session })
  } catch (error: any) {
    console.error('Erro ao criar sala de telemedicina:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar sala de telemedicina' },
      { status: 500 }
    )
  }
}

