import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * API para gerar link de telemedicina para paciente (com token)
 * Permite que pacientes acessem telemedicina mesmo sem login
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
        { error: 'ID do agendamento é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar permissão (admin, recepcionista ou médico da consulta)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Buscar agendamento para verificar permissão
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        patients:patient_id (
          id,
          login_token,
          login_token_expires_at
        ),
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

    // Verificar permissão
    const isAdmin = profile?.role === 'admin' || profile?.role === 'desenvolvedor'
    const isRecepcionista = profile?.role === 'recepcionista'
    const isDoctorOfAppointment = appointment.doctors?.user_id === user.id

    if (!isAdmin && !isRecepcionista && !isDoctorOfAppointment) {
      return NextResponse.json(
        { error: 'Sem permissão para gerar link de telemedicina' },
        { status: 403 }
      )
    }

    // Verificar se paciente tem token de login
    const patient = appointment.patients as any
    if (!patient?.login_token) {
      return NextResponse.json(
        { error: 'Paciente não possui token de login. Gere um token de login primeiro.' },
        { status: 400 }
      )
    }

    // Verificar se token não expirou
    if (patient.login_token_expires_at) {
      const expiresAt = new Date(patient.login_token_expires_at)
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'Token de login do paciente expirou. Gere um novo token primeiro.' },
          { status: 400 }
        )
      }
    }

    // Gerar link de telemedicina com token
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const telemedicineLink = `${appUrl}/telemedicina/${appointmentId}/${patient.login_token}`

    return NextResponse.json({
      success: true,
      link: telemedicineLink,
      appointmentId,
    })
  } catch (error: any) {
    console.error('Erro ao gerar link de telemedicina:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar link de telemedicina' },
      { status: 500 }
    )
  }
}

