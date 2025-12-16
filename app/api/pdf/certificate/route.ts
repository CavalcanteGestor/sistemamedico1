import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateMedicalCertificatePDFBlob } from '@/lib/pdf/generate-medical-certificate-pdf'

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
      patient_id,
      reason,
      absenceDays,
      startDate,
      endDate,
      cidCode,
      cidDescription,
      observations,
    } = body

    if (!patient_id || !reason) {
      return NextResponse.json(
        { error: 'Paciente e motivo são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar dados do paciente
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, name, cpf, birth_date')
      .eq('id', patient_id)
      .single()

    if (patientError || !patient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }

    // Buscar dados do médico
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('id, name, crm')
      .eq('user_id', user.id)
      .single()

    if (doctorError || !doctor) {
      return NextResponse.json(
        { error: 'Médico não encontrado' },
        { status: 404 }
      )
    }

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
      clinicCNPJ: clinicSettings?.clinic_cnpj,
      clinicLogoUrl: clinicSettings?.clinic_logo_url,
      doctorName: doctor.name,
      doctorCRM: doctor.crm,
      patientName: patient.name,
      patientCPF: patient.cpf,
      patientBirthDate: patient.birth_date,
      certificateDate: new Date().toISOString().split('T')[0],
      absenceDays: absenceDays ? parseInt(absenceDays) : undefined,
      startDate,
      endDate,
      cidCode,
      cidDescription,
      observations,
      reason,
    }

    // Gerar PDF
    const pdfBuffer = await generateMedicalCertificatePDFBlob(pdfData)

    // Retornar PDF
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="atestado-${patient.name}-${Date.now()}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Erro ao gerar PDF do atestado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar PDF' },
      { status: 500 }
    )
  }
}

