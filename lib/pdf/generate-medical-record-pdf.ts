import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { addLogoToPDF } from './utils'

interface MedicalRecordPDFData {
  clinicName?: string
  clinicAddress?: string
  clinicPhone?: string
  clinicEmail?: string
  clinicLogoUrl?: string
  patientName: string
  patientCPF: string
  patientBirthDate?: string
  patientPhone?: string
  patientEmail?: string
  doctorName: string
  doctorCRM: string
  recordDate: string
  appointmentDate?: string
  anamnesis?: {
    chief_complaint?: string
    history_of_present_illness?: string
    past_medical_history?: string
    family_history?: string
    social_history?: string
    medications?: string[]
    allergies?: string[]
  }
  physicalExam?: {
    vital_signs?: any
    general_appearance?: string
    cardiovascular?: string
    respiratory?: string
    abdominal?: string
    neurological?: string
    musculoskeletal?: string
    skin?: string
  }
  evolutions?: Array<{
    date: string
    notes: string
    doctorName?: string
  }>
}

export async function generateMedicalRecordPDF(data: MedicalRecordPDFData): Promise<jsPDF> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let yPos = margin

  // Logo da Clínica (se disponível)
  yPos = await addLogoToPDF(doc, data.clinicLogoUrl, pageWidth, yPos)

  // Header da Clínica
  if (data.clinicName) {
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(data.clinicName, pageWidth / 2, yPos, { align: 'center' })
    yPos += 8
  }

  if (data.clinicAddress) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(data.clinicAddress, pageWidth / 2, yPos, { align: 'center' })
    yPos += 5
  }

  if (data.clinicPhone || data.clinicEmail) {
    doc.setFontSize(9)
    const contactInfo = [data.clinicPhone, data.clinicEmail].filter(Boolean).join(' | ')
    doc.text(contactInfo, pageWidth / 2, yPos, { align: 'center' })
    yPos += 10
  }

  // Título
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('PRONTUÁRIO ELETRÔNICO', pageWidth / 2, yPos, { align: 'center' })
  yPos += 10

  // Linha separadora
  doc.setLineWidth(0.5)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 10

  // Dados do Paciente
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('DADOS DO PACIENTE', margin, yPos)
  yPos += 7

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Nome: ${data.patientName}`, margin, yPos)
  yPos += 5

  doc.text(`CPF: ${data.patientCPF}`, margin, yPos)
  yPos += 5

  if (data.patientBirthDate) {
    const birthDate = new Date(data.patientBirthDate).toLocaleDateString('pt-BR')
    doc.text(`Data de Nascimento: ${birthDate}`, margin, yPos)
    yPos += 5
  }

  if (data.patientPhone) {
    doc.text(`Telefone: ${data.patientPhone}`, margin, yPos)
    yPos += 5
  }

  if (data.patientEmail) {
    doc.text(`Email: ${data.patientEmail}`, margin, yPos)
    yPos += 5
  }

  yPos += 5

  // Dados do Médico
  doc.setFont('helvetica', 'bold')
  doc.text('MÉDICO RESPONSÁVEL', margin, yPos)
  yPos += 7

  doc.setFont('helvetica', 'normal')
  doc.text(`Dr(a). ${data.doctorName} - CRM: ${data.doctorCRM}`, margin, yPos)
  yPos += 5

  if (data.appointmentDate) {
    const appointmentDate = new Date(data.appointmentDate).toLocaleDateString('pt-BR')
    doc.text(`Data da Consulta: ${appointmentDate}`, margin, yPos)
    yPos += 5
  }

  const recordDate = new Date(data.recordDate).toLocaleDateString('pt-BR')
  doc.text(`Data do Registro: ${recordDate}`, margin, yPos)
  yPos += 10

  // Linha separadora
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 10

  // Anamnese
  if (data.anamnesis) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('ANAMNESE', margin, yPos)
    yPos += 7

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    if (data.anamnesis.chief_complaint) {
      doc.setFont('helvetica', 'bold')
      doc.text('Queixa Principal:', margin, yPos)
      yPos += 5

      doc.setFont('helvetica', 'normal')
      const complaintLines = doc.splitTextToSize(
        data.anamnesis.chief_complaint,
        pageWidth - 2 * margin
      )
      doc.text(complaintLines, margin, yPos)
      yPos += complaintLines.length * 5 + 3
    }

    if (data.anamnesis.history_of_present_illness) {
      doc.setFont('helvetica', 'bold')
      doc.text('História da Doença Atual:', margin, yPos)
      yPos += 5

      doc.setFont('helvetica', 'normal')
      const hdaLines = doc.splitTextToSize(
        data.anamnesis.history_of_present_illness,
        pageWidth - 2 * margin
      )
      doc.text(hdaLines, margin, yPos)
      yPos += hdaLines.length * 5 + 3
    }

    if (data.anamnesis.past_medical_history) {
      doc.setFont('helvetica', 'bold')
      doc.text('História Patológica Pregressa:', margin, yPos)
      yPos += 5

      doc.setFont('helvetica', 'normal')
      const pastLines = doc.splitTextToSize(
        data.anamnesis.past_medical_history,
        pageWidth - 2 * margin
      )
      doc.text(pastLines, margin, yPos)
      yPos += pastLines.length * 5 + 3
    }

    if (data.anamnesis.medications && data.anamnesis.medications.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.text('Medicações em Uso:', margin, yPos)
      yPos += 5

      doc.setFont('helvetica', 'normal')
      data.anamnesis.medications.forEach((med) => {
        doc.text(`• ${med}`, margin + 5, yPos)
        yPos += 5
      })
      yPos += 3
    }

    if (data.anamnesis.allergies && data.anamnesis.allergies.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.text('Alergias:', margin, yPos)
      yPos += 5

      doc.setFont('helvetica', 'normal')
      data.anamnesis.allergies.forEach((allergy) => {
        doc.text(`• ${allergy}`, margin + 5, yPos)
        yPos += 5
      })
      yPos += 3
    }

    yPos += 5
  }

  // Verificar se precisa de nova página
  if (yPos > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage()
    yPos = margin
  }

  // Exame Físico
  if (data.physicalExam) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('EXAME FÍSICO', margin, yPos)
    yPos += 7

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    if (data.physicalExam.vital_signs) {
      doc.setFont('helvetica', 'bold')
      doc.text('Sinais Vitais:', margin, yPos)
      yPos += 5

      doc.setFont('helvetica', 'normal')
      const vs = data.physicalExam.vital_signs
      if (vs.blood_pressure_systolic) {
        doc.text(
          `PA: ${vs.blood_pressure_systolic}/${vs.blood_pressure_diastolic} mmHg`,
          margin,
          yPos
        )
        yPos += 5
      }
      if (vs.heart_rate) {
        doc.text(`FC: ${vs.heart_rate} bpm`, margin, yPos)
        yPos += 5
      }
      if (vs.temperature) {
        doc.text(`Temperatura: ${vs.temperature}°C`, margin, yPos)
        yPos += 5
      }
      if (vs.oxygen_saturation) {
        doc.text(`SpO2: ${vs.oxygen_saturation}%`, margin, yPos)
        yPos += 5
      }
      if (vs.weight) {
        doc.text(`Peso: ${vs.weight} kg`, margin, yPos)
        yPos += 5
      }
      if (vs.height) {
        doc.text(`Altura: ${vs.height} cm`, margin, yPos)
        yPos += 5
      }
      if (vs.bmi) {
        doc.text(`IMC: ${vs.bmi}`, margin, yPos)
        yPos += 5
      }
      yPos += 3
    }

    if (data.physicalExam.general_appearance) {
      doc.setFont('helvetica', 'bold')
      doc.text('Aspecto Geral:', margin, yPos)
      yPos += 5

      doc.setFont('helvetica', 'normal')
      const appearanceLines = doc.splitTextToSize(
        data.physicalExam.general_appearance,
        pageWidth - 2 * margin
      )
      doc.text(appearanceLines, margin, yPos)
      yPos += appearanceLines.length * 5 + 3
    }

    if (data.physicalExam.cardiovascular) {
      doc.setFont('helvetica', 'bold')
      doc.text('Cardiovascular:', margin, yPos)
      yPos += 5

      doc.setFont('helvetica', 'normal')
      const cardioLines = doc.splitTextToSize(
        data.physicalExam.cardiovascular,
        pageWidth - 2 * margin
      )
      doc.text(cardioLines, margin, yPos)
      yPos += cardioLines.length * 5 + 3
    }

    if (data.physicalExam.respiratory) {
      doc.setFont('helvetica', 'bold')
      doc.text('Respiratório:', margin, yPos)
      yPos += 5

      doc.setFont('helvetica', 'normal')
      const respLines = doc.splitTextToSize(
        data.physicalExam.respiratory,
        pageWidth - 2 * margin
      )
      doc.text(respLines, margin, yPos)
      yPos += respLines.length * 5 + 3
    }

    yPos += 5
  }

  // Verificar se precisa de nova página
  if (yPos > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage()
    yPos = margin
  }

  // Evoluções
  if (data.evolutions && data.evolutions.length > 0) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('EVOLUÇÕES', margin, yPos)
    yPos += 7

    doc.setFontSize(10)
    data.evolutions.forEach((evolution, index) => {
      if (yPos > doc.internal.pageSize.getHeight() - 60) {
        doc.addPage()
        yPos = margin
      }

      doc.setFont('helvetica', 'bold')
      const evolutionDate = new Date(evolution.date).toLocaleDateString('pt-BR')
      doc.text(`${evolutionDate}${evolution.doctorName ? ` - Dr(a). ${evolution.doctorName}` : ''}`, margin, yPos)
      yPos += 5

      doc.setFont('helvetica', 'normal')
      const evolutionLines = doc.splitTextToSize(evolution.notes, pageWidth - 2 * margin)
      doc.text(evolutionLines, margin, yPos)
      yPos += evolutionLines.length * 5 + 5

      if (index < data.evolutions!.length - 1) {
        doc.line(margin, yPos, pageWidth - margin, yPos)
        yPos += 5
      }
    })
  }

  // Data de impressão
  yPos = doc.internal.pageSize.getHeight() - 20
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  const now = new Date().toLocaleString('pt-BR')
  doc.text(`Data de impressão: ${now}`, pageWidth / 2, yPos, { align: 'center' })

  return doc
}

export async function generateMedicalRecordPDFBlob(data: MedicalRecordPDFData): Promise<Uint8Array> {
  const doc = await generateMedicalRecordPDF(data)
  // No servidor Next.js, usar 'arraybuffer' e converter para Uint8Array
  const arrayBuffer = doc.output('arraybuffer')
  return new Uint8Array(arrayBuffer)
}

