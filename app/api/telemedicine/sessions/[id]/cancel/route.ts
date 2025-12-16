import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    const body = await request.json()
    const { reason } = body // Motivo do cancelamento (opcional)

    // Verificar se o usuário tem permissão
    const { data: session, error: sessionError } = await supabase
      .from('telemedicine_sessions')
      .select(`
        *,
        appointments:appointment_id (
          *,
          doctors:doctor_id (user_id),
          patients:patient_id (user_id, name, email)
        )
      `)
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se já está cancelada ou finalizada
    if (session.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Esta sessão já foi cancelada' },
        { status: 400 }
      )
    }

    if (session.status === 'ended') {
      return NextResponse.json(
        { error: 'Não é possível cancelar uma sessão já finalizada' },
        { status: 400 }
      )
    }

    // Verificar permissão
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    const isDoctor = profile?.role === 'medico' && session.appointments?.doctors?.user_id === user.id
    const isPatient = session.appointments?.patients?.user_id === user.id

    if (!isAdmin && !isDoctor && !isPatient) {
      return NextResponse.json(
        { error: 'Sem permissão para cancelar esta sessão' },
        { status: 403 }
      )
    }

    // Cancelar sessão
    const { error: updateError } = await supabase
      .from('telemedicine_sessions')
      .update({
        status: 'cancelled',
        cancellation_reason: reason || null,
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
        ended_at: session.status === 'active' ? new Date().toISOString() : null, // Se estava ativa, também marca como encerrada
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Erro ao cancelar sessão:', updateError)
      return NextResponse.json(
        { error: 'Erro ao cancelar sessão' },
        { status: 500 }
      )
    }

    // Criar notificação para o paciente (se não foi o paciente que cancelou)
    if (session.appointments?.patients && !isPatient) {
      const patientUserId = session.appointments.patients.user_id
      if (patientUserId) {
        await supabase.from('notifications').insert({
          user_id: patientUserId,
          title: 'Consulta de Telemedicina Cancelada',
          message: `A consulta de telemedicina marcada para ${new Date(session.appointments.appointment_date).toLocaleDateString('pt-BR')} às ${session.appointments.appointment_time} foi cancelada.${reason ? ` Motivo: ${reason}` : ''}`,
          type: 'telemedicine_cancelled',
          related_id: sessionId,
          read: false,
        })
      }
    }

    // Criar notificação para o médico (se não foi o médico que cancelou)
    if (session.appointments?.doctors && !isDoctor) {
      const doctorUserId = session.appointments.doctors.user_id
      if (doctorUserId) {
        await supabase.from('notifications').insert({
          user_id: doctorUserId,
          title: 'Consulta de Telemedicina Cancelada',
          message: `A consulta de telemedicina marcada para ${new Date(session.appointments.appointment_date).toLocaleDateString('pt-BR')} às ${session.appointments.appointment_time} foi cancelada.${reason ? ` Motivo: ${reason}` : ''}`,
          type: 'telemedicine_cancelled',
          related_id: sessionId,
          read: false,
        })
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Sessão cancelada com sucesso'
    })
  } catch (error: any) {
    console.error('Erro ao cancelar sessão:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao cancelar sessão' },
      { status: 500 }
    )
  }
}

