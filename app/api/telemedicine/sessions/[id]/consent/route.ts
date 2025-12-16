import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * API para registrar consentimento de IA (médico ou paciente)
 */
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
    const { isDoctor = false } = body

    // Buscar sessão para verificar permissões
    const { data: session, error: sessionError } = await supabase
      .from('telemedicine_sessions')
      .select('appointment_id, ai_summary_enabled')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      )
    }

    if (!session.ai_summary_enabled) {
      return NextResponse.json(
        { error: 'Esta sessão não utiliza recursos de IA' },
        { status: 400 }
      )
    }

    // Verificar permissão do usuário
    if (isDoctor) {
      // Verificar se é médico do agendamento
      const { data: appointment } = await supabase
        .from('appointments')
        .select('doctor_id, doctors:doctor_id (user_id)')
        .eq('id', session.appointment_id)
        .maybeSingle()

      const doctor = Array.isArray(appointment?.doctors) ? appointment.doctors[0] : appointment?.doctors
      if (!doctor?.user_id || doctor.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Sem permissão para dar consentimento como médico' },
          { status: 403 }
        )
      }

      // Atualizar consentimento do médico
      const { error: updateError } = await supabase
        .from('telemedicine_sessions')
        .update({
          ai_consent_doctor: true,
          ai_consent_doctor_at: new Date().toISOString(),
        })
        .eq('id', sessionId)

      if (updateError) {
        throw updateError
      }
    } else {
      // Verificar se é paciente do agendamento
      const { data: appointment } = await supabase
        .from('appointments')
        .select('patient_id, patients:patient_id (id, user_id)')
        .eq('id', session.appointment_id)
        .maybeSingle()

      const patient = Array.isArray(appointment?.patients) ? appointment.patients[0] : appointment?.patients

      if (!patient || !patient.user_id || patient.user_id !== user.id || appointment?.patient_id !== patient.id) {
        return NextResponse.json(
          { error: 'Sem permissão para dar consentimento como paciente' },
          { status: 403 }
        )
      }

      // Atualizar consentimento do paciente
      const { error: updateError } = await supabase
        .from('telemedicine_sessions')
        .update({
          ai_consent_patient: true,
          ai_consent_patient_at: new Date().toISOString(),
        })
        .eq('id', sessionId)

      if (updateError) {
        throw updateError
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Consentimento registrado com sucesso',
    })
  } catch (error: any) {
    console.error('Erro ao registrar consentimento:', error)
    return NextResponse.json(
      {
        error: error.message || 'Erro ao registrar consentimento',
      },
      { status: 500 }
    )
  }
}

