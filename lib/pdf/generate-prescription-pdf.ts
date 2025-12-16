import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { addLogoToPDF } from './utils'

interface PrescriptionData {
  clinicName?: string
  clinicAddress?: string
  clinicPhone?: string
  clinicEmail?: string
  clinicLogoUrl?: string
  doctorName: string
  doctorCRM: string
  patientName: string
  patientCPF: string
  patientBirthDate?: string
  prescriptionDate: string
  items: Array<{
    medication_name: string
    dosage: string
    frequency: string
    duration: string
    instructions?: string
  }>
  notes?: string
}

export async function generatePrescriptionPDF(data: PrescriptionData): Promise<jsPDF> {
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
  doc.text('RECEITA MÉDICA', pageWidth / 2, yPos, { align: 'center' })
  yPos += 10

  // Linha separadora
  doc.setLineWidth(0.5)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 10

  // Dados do Médico
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Médico:', margin, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(`${data.doctorName} - CRM: ${data.doctorCRM}`, margin + 25, yPos)
  yPos += 7

  // Dados do Paciente
  doc.setFont('helvetica', 'bold')
  doc.text('Paciente:', margin, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(data.patientName, margin + 30, yPos)
  yPos += 5

  doc.setFont('helvetica', 'bold')
  doc.text('CPF:', margin, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(data.patientCPF, margin + 15, yPos)

  if (data.patientBirthDate) {
    doc.setFont('helvetica', 'bold')
    doc.text('Data de Nascimento:', margin + 60, yPos)
    doc.setFont('helvetica', 'normal')
    const birthDate = new Date(data.patientBirthDate).toLocaleDateString('pt-BR')
    doc.text(birthDate, margin + 105, yPos)
  }

  yPos += 5

  doc.setFont('helvetica', 'bold')
  doc.text('Data da Receita:', margin, yPos)
  doc.setFont('helvetica', 'normal')
  const prescriptionDate = new Date(data.prescriptionDate).toLocaleDateString('pt-BR')
  doc.text(prescriptionDate, margin + 45, yPos)
  yPos += 10

  // Linha separadora
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 10

  // Tabela de Medicamentos
  const tableData = data.items.map((item) => [
    item.medication_name,
    item.dosage,
    item.frequency,
    item.duration,
    item.instructions || '-',
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['Medicamento', 'Dosagem', 'Frequência', 'Duração', 'Instruções']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 30 },
      2: { cellWidth: 30 },
      3: { cellWidth: 25 },
      4: { cellWidth: 45 },
    },
    margin: { left: margin, right: margin },
  })

  yPos = (doc as any).lastAutoTable.finalY + 10

  // Observações
  if (data.notes) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Observações:', margin, yPos)
    yPos += 6

    doc.setFont('helvetica', 'normal')
    const notesLines = doc.splitTextToSize(data.notes, pageWidth - 2 * margin)
    doc.text(notesLines, margin, yPos)
    yPos += notesLines.length * 5 + 5
  }

  // Espaço para assinatura
  yPos = doc.internal.pageSize.getHeight() - 40
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `${data.doctorName} - CRM: ${data.doctorCRM}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  )

  // Data e hora
  yPos += 6
  const now = new Date().toLocaleString('pt-BR')
  doc.setFontSize(8)
  doc.text(`Data de impressão: ${now}`, pageWidth / 2, yPos, { align: 'center' })

  return doc
}

export async function generatePrescriptionPDFBlob(data: PrescriptionData): Promise<Uint8Array> {
  const doc = await generatePrescriptionPDF(data)
  // No servidor Next.js, usar 'arraybuffer' e converter para Uint8Array
  const arrayBuffer = doc.output('arraybuffer')
  return new Uint8Array(arrayBuffer)
}

