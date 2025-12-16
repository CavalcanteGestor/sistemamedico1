import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAppointmentReminders, notifyDoctorAboutAppointment } from '@/lib/services/follow-up-service'

/**
 * API para criar lembretes automáticos de agendamento e notificar médico
 * Esta API é chamada automaticamente quando um agendamento é criado
 */
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
    const { appointmentId } = body

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'appointmentId é obrigatório' },
        { status: 400 }
      )
    }

    // Criar lembretes automaticamente (para o paciente)
    const remindersResult = await createAppointmentReminders(appointmentId)

    // Notificar médico sobre o novo agendamento
    try {
      await notifyDoctorAboutAppointment(appointmentId)
    } catch (notifyError) {
      // Erro silencioso - não bloquear criação dos lembretes
      console.error('Erro ao notificar médico:', notifyError)
    }

    return NextResponse.json({
      success: true,
      message: 'Lembretes de agendamento criados e médico notificado com sucesso',
      data: remindersResult,
    })
  } catch (error: any) {
    console.error('Erro ao criar lembretes de agendamento:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar lembretes de agendamento' },
      { status: 500 }
    )
  }
}

