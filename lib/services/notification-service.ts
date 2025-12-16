import { createClient } from '@/lib/supabase/client'

interface CreateNotificationParams {
  userId: string
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
  link?: string
}

export async function createNotification(params: CreateNotificationParams) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: params.userId,
      title: params.title,
      message: params.message,
      type: params.type || 'info',
      link: params.link || null,
      read: false,
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar notificação:', error)
    throw error
  }

  return data
}

export async function createAppointmentReminder(appointmentId: string) {
  const supabase = createClient()

  // Buscar agendamento
  const { data: appointment, error: appointmentError } = await supabase
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
        name,
        user_id
      )
    `)
    .eq('id', appointmentId)
    .single()

  if (appointmentError || !appointment) {
    throw new Error('Agendamento não encontrado')
  }

  const appointmentDate = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
  const now = new Date()
  const hoursUntilAppointment = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60)

  // Criar notificação para o paciente
  if (appointment.patients?.user_id) {
    await createNotification({
      userId: appointment.patients.user_id,
      title: 'Lembrete de Consulta',
      message: `Você tem uma consulta agendada para ${appointmentDate.toLocaleDateString('pt-BR')} às ${appointment.appointment_time} com Dr(a). ${appointment.doctors?.name}`,
      type: 'info',
      link: `/portal/consultas`,
    })
  }

  // Criar notificação para o médico
  if (appointment.doctors?.user_id) {
    await createNotification({
      userId: appointment.doctors.user_id,
      title: 'Consulta Agendada',
      message: `Consulta agendada para ${appointmentDate.toLocaleDateString('pt-BR')} às ${appointment.appointment_time} com ${appointment.patients?.name}`,
      type: 'info',
      link: `/dashboard/agendamentos`,
    })
  }
}

export async function createExamResultNotification(examId: string) {
  const supabase = createClient()

  // Buscar exame
  const { data: exam, error: examError } = await supabase
    .from('exams')
    .select(`
      *,
      patients:patient_id (
        id,
        name,
        user_id
      )
    `)
    .eq('id', examId)
    .single()

  if (examError || !exam) {
    throw new Error('Exame não encontrado')
  }

  // Criar notificação para o paciente
  if (exam.patients?.user_id) {
    await createNotification({
      userId: exam.patients.user_id,
      title: 'Resultado de Exame Disponível',
      message: `O resultado do exame "${exam.exam_type}" está disponível para visualização.`,
      type: 'success',
      link: `/portal/exames`,
    })
  }
}

export async function createTelemedicineNotification(sessionId: string) {
  const supabase = createClient()

  // Buscar sessão de telemedicina com dados do agendamento
  const { data: session, error: sessionError } = await supabase
    .from('telemedicine_sessions')
    .select(`
      *,
      appointments:appointment_id (
        id,
        appointment_date,
        appointment_time,
        consultation_type,
        patients:patient_id (
          id,
          name,
          user_id
        ),
        doctors:doctor_id (
          id,
          name
        )
      )
    `)
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    throw new Error('Sessão de telemedicina não encontrada')
  }

  const appointment = session.appointments as any
  if (!appointment || !appointment.patients?.user_id) {
    throw new Error('Dados do paciente não encontrados')
  }

  const appointmentDate = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
  const doctorName = appointment.doctors?.name || 'seu médico'

  // Criar notificação para o paciente
  await createNotification({
    userId: appointment.patients.user_id,
    title: 'Consulta de Telemedicina Disponível',
    message: `Sua consulta de telemedicina com Dr(a). ${doctorName} está disponível. Clique para entrar na consulta.`,
    type: 'success',
    link: `/portal/consultas/telemedicina/${appointment.id}`,
  })
}

export async function createTelemedicineReminder(appointmentId: string) {
  const supabase = createClient()

  // Buscar agendamento
  const { data: appointment, error: appointmentError } = await supabase
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
        name,
        user_id
      )
    `)
    .eq('id', appointmentId)
    .single()

  if (appointmentError || !appointment) {
    throw new Error('Agendamento não encontrado')
  }

  // Verificar se é consulta de telemedicina
  if (appointment.consultation_type !== 'telemedicina' && appointment.consultation_type !== 'hibrida') {
    return // Não criar lembrete se não for telemedicina
  }

  const appointmentDate = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
  const now = new Date()
  const minutesUntilAppointment = (appointmentDate.getTime() - now.getTime()) / (1000 * 60)

  // Criar notificação apenas se for 30 minutos antes (ou menos, até -5 minutos)
  if (minutesUntilAppointment > 30 || minutesUntilAppointment < -5) {
    return // Não criar lembrete fora da janela de tempo
  }

  // Criar notificação para o paciente
  if (appointment.patients?.user_id) {
    await createNotification({
      userId: appointment.patients.user_id,
      title: 'Lembrete: Consulta de Telemedicina',
      message: `Sua consulta de telemedicina com Dr(a). ${appointment.doctors?.name} está agendada para ${appointmentDate.toLocaleDateString('pt-BR')} às ${appointment.appointment_time}. Você pode entrar na consulta agora.`,
      type: 'info',
      link: `/portal/consultas/telemedicina/${appointmentId}`,
    })
  }
}

