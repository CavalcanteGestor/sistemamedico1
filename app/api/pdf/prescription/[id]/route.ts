import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePrescriptionPDFBlob } from '@/lib/pdf/generate-prescription-pdf'

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
    const prescriptionId = id

    // Buscar prescrição com dados relacionados
    const { data: prescription, error: prescriptionError } = await supabase
      .from('prescriptions')
      .select(`
        *,
        patients:patient_id (
          id,
          name,
          cpf,
          birth_date
        ),
        doctors:doctor_id (
          id,
          name,
          crm
        )
      `)
      .eq('id', prescriptionId)
      .single()

    if (prescriptionError || !prescription) {
      return NextResponse.json(
        { error: 'Prescrição não encontrada' },
        { status: 404 }
      )
    }

    // Buscar itens da prescrição
    const { data: items, error: itemsError } = await supabase
      .from('prescription_items')
      .select(`
        *,
        medications:medication_id (
          name
        )
      `)
      .eq('prescription_id', prescriptionId)

    if (itemsError) {
      return NextResponse.json(
        { error: 'Erro ao buscar itens da prescrição' },
        { status: 500 }
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
      clinicEmail: clinicSettings?.clinic_email,
      clinicLogoUrl: clinicSettings?.clinic_logo_url,
      doctorName: prescription.doctors?.name || '',
      doctorCRM: prescription.doctors?.crm || '',
      patientName: prescription.patients?.name || '',
      patientCPF: prescription.patients?.cpf || '',
      patientBirthDate: prescription.patients?.birth_date,
      prescriptionDate: prescription.prescription_date,
      items: (items || []).map((item) => ({
        medication_name: item.medications?.name || item.medication_name || '',
        dosage: item.dosage || '',
        frequency: item.frequency || '',
        duration: item.duration || '',
        instructions: item.instructions || undefined,
      })),
      notes: prescription.notes || undefined,
    }

    // Gerar PDF
    const pdfBuffer = await generatePrescriptionPDFBlob(pdfData)

    // Retornar PDF
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receita-${prescriptionId}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Erro ao gerar PDF da prescrição:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar PDF' },
      { status: 500 }
    )
  }
}

