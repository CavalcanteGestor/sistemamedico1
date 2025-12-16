import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAppointmentReminder } from '@/lib/services/notification-service'

// Este endpoint será chamado por um cron job ou função agendada
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Buscar agendamentos nas próximas 24 horas
    const tomorrow = new Date()
    tomorrow.setHours(24, 0, 0, 0)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        status,
        patients:patient_id (
          id,
          user_id
        ),
        doctors:doctor_id (
          id,
          user_id
        )
      `)
      .eq('appointment_date', tomorrowStr)
      .eq('status', 'scheduled')
      .order('appointment_time', { ascending: true })

    if (error) {
      console.error('Erro ao buscar agendamentos:', error)
      return NextResponse.json({ error: 'Erro ao buscar agendamentos' }, { status: 500 })
    }

    // Criar notificações de lembrete
    const reminders = []
    for (const appointment of appointments || []) {
      try {
        await createAppointmentReminder(appointment.id)
        reminders.push(appointment.id)
      } catch (error) {
        console.error(`Erro ao criar lembrete para agendamento ${appointment.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      remindersCreated: reminders.length,
      appointmentIds: reminders,
    })
  } catch (error: any) {
    console.error('Erro ao processar lembretes:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao processar lembretes' },
      { status: 500 }
    )
  }
}

