import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateMedicalRecordPDFBlob } from '@/lib/pdf/generate-medical-record-pdf'

export async function GET(
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
    const medicalRecordId = id

    // Buscar prontuário com dados relacionados
    const { data: medicalRecord, error: recordError } = await supabase
      .from('medical_records')
      .select(`
        *,
        patients:patient_id (
          id,
          name,
          cpf,
          birth_date,
          phone,
          email
        ),
        doctors:doctor_id (
          id,
          name,
          crm
        ),
        appointments:appointment_id (
          id,
          appointment_date
        )
      `)
      .eq('id', medicalRecordId)
      .single()

    if (recordError || !medicalRecord) {
      return NextResponse.json(
        { error: 'Prontuário não encontrado' },
        { status: 404 }
      )
    }

    // Verificar permissão de acesso
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Se não for admin ou médico, verificar se é o paciente dono do prontuário
    if (profile?.role !== 'admin' && profile?.role !== 'medico') {
      if (profile?.role === 'paciente') {
        // Buscar paciente para verificar se é o dono
        const { data: patient } = await supabase
          .from('patients')
          .select('id')
          .eq('user_id', user.id)
          .eq('id', medicalRecord.patient_id)
          .single()

        if (!patient) {
          return NextResponse.json(
            { error: 'Acesso negado' },
            { status: 403 }
          )
        }
      } else {
        return NextResponse.json(
          { error: 'Acesso negado' },
          { status: 403 }
        )
      }
    }

    // Buscar anamnese
    const { data: anamnesis } = await supabase
      .from('anamnesis')
      .select('*')
      .eq('medical_record_id', medicalRecordId)
      .single()

    // Buscar exame físico
    const { data: physicalExam } = await supabase
      .from('physical_exams')
      .select('*')
      .eq('medical_record_id', medicalRecordId)
      .single()

    // Buscar evoluções
    const { data: evolutions } = await supabase
      .from('evolutions')
      .select(`
        *,
        doctors:doctor_id (
          name
        )
      `)
      .eq('medical_record_id', medicalRecordId)
      .order('evolution_date', { ascending: false })

    // Buscar configurações da clínica
    const { data: clinicSettings } = await supabase
      .from('clinic_settings')
      .select('*')
      .single()

    // Preparar dados para o PDF
    const pdfData = {
      clinicName: clinicSettings?.clinic_name,
      clinicAddress: clinicSettings?.clinic_address,
      clinicPhone: clinicSettings?.clinic_phone,
      clinicEmail: clinicSettings?.clinic_email,
      clinicLogoUrl: clinicSettings?.clinic_logo_url,
      patientName: medicalRecord.patients?.name || '',
      patientCPF: medicalRecord.patients?.cpf || '',
      patientBirthDate: medicalRecord.patients?.birth_date,
      patientPhone: medicalRecord.patients?.phone,
      patientEmail: medicalRecord.patients?.email,
      doctorName: medicalRecord.doctors?.name || '',
      doctorCRM: medicalRecord.doctors?.crm || '',
      recordDate: medicalRecord.created_at,
      appointmentDate: medicalRecord.appointments?.appointment_date,
      anamnesis: anamnesis ? {
        chief_complaint: anamnesis.chief_complaint,
        history_of_present_illness: anamnesis.history_of_present_illness,
        past_medical_history: anamnesis.past_medical_history,
        family_history: anamnesis.family_history,
        social_history: anamnesis.social_history,
        medications: anamnesis.medications,
        allergies: anamnesis.allergies,
      } : undefined,
      physicalExam: physicalExam ? {
        vital_signs: physicalExam.vital_signs,
        general_appearance: physicalExam.general_appearance,
        cardiovascular: physicalExam.cardiovascular,
        respiratory: physicalExam.respiratory,
        abdominal: physicalExam.abdominal,
        neurological: physicalExam.neurological,
        musculoskeletal: physicalExam.musculoskeletal,
        skin: physicalExam.skin,
      } : undefined,
      evolutions: evolutions ? evolutions.map((evo) => ({
        date: evo.evolution_date,
        notes: evo.notes,
        doctorName: evo.doctors?.name,
      })) : undefined,
    }

    // Gerar PDF
    const pdfBuffer = await generateMedicalRecordPDFBlob(pdfData)

    // Retornar PDF
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="prontuario-${medicalRecordId}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Erro ao gerar PDF do prontuário:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar PDF' },
      { status: 500 }
    )
  }
}

