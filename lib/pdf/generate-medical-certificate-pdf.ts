import jsPDF from 'jspdf'
import { addLogoToPDF } from './utils'

interface MedicalCertificateData {
  clinicName?: string
  clinicAddress?: string
  clinicPhone?: string
  clinicCNPJ?: string
  clinicLogoUrl?: string
  doctorName: string
  doctorCRM: string
  patientName: string
  patientCPF: string
  patientBirthDate?: string
  certificateDate: string
  absenceDays?: number
  startDate?: string
  endDate?: string
  cidCode?: string
  cidDescription?: string
  observations?: string
  reason: string
}

export async function generateMedicalCertificatePDF(data: MedicalCertificateData): Promise<jsPDF> {
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

  if (data.clinicPhone) {
    doc.setFontSize(9)
    doc.text(`Tel: ${data.clinicPhone}`, pageWidth / 2, yPos, { align: 'center' })
    yPos += 5
  }

  if (data.clinicCNPJ) {
    doc.setFontSize(9)
    doc.text(`CNPJ: ${data.clinicCNPJ}`, pageWidth / 2, yPos, { align: 'center' })
    yPos += 10
  }

  // Título
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('ATESTADO MÉDICO', pageWidth / 2, yPos, { align: 'center' })
  yPos += 15

  // Corpo do texto
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')

  const text = [
    `Atesto para os devidos fins que ${data.patientName},`,
    `portador(a) do CPF ${data.patientCPF},`,
  ]

  if (data.patientBirthDate) {
    const birthDate = new Date(data.patientBirthDate).toLocaleDateString('pt-BR')
    text.push(`nascido(a) em ${birthDate},`)
  }

  text.push('encontra-se sob meus cuidados médicos.')

  if (data.absenceDays) {
    text.push(``)
    text.push(
      `Recomendo afastamento das atividades por ${data.absenceDays} dia(s),`
    )
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate).toLocaleDateString('pt-BR')
      const end = new Date(data.endDate).toLocaleDateString('pt-BR')
      text.push(`no período de ${start} a ${end}.`)
    } else if (data.startDate) {
      const start = new Date(data.startDate).toLocaleDateString('pt-BR')
      text.push(`a partir de ${start}.`)
    }
  }

  text.push(``)
  text.push(`Motivo: ${data.reason}`)

  if (data.cidCode) {
    text.push(``)
    text.push(`CID-10: ${data.cidCode}`)
    if (data.cidDescription) {
      text.push(`Descrição: ${data.cidDescription}`)
    }
  }

  if (data.observations) {
    text.push(``)
    text.push(`Observações: ${data.observations}`)
  }

  // Escrever texto justificado
  const lineHeight = 7
  const maxWidth = pageWidth - 2 * margin

  text.forEach((line) => {
    if (line === '') {
      yPos += lineHeight / 2
    } else {
      const lines = doc.splitTextToSize(line, maxWidth)
      lines.forEach((l: string) => {
        doc.text(l, margin, yPos, { maxWidth })
        yPos += lineHeight
      })
    }
  })

  // Espaço para assinatura
  yPos = doc.internal.pageSize.getHeight() - 50
  const certificateDate = new Date(data.certificateDate).toLocaleDateString('pt-BR')
  doc.setFontSize(10)
  doc.text(
    `Por ser expressão da verdade, firmo o presente atestado em ${certificateDate}.`,
    margin,
    yPos,
    { maxWidth }
  )

  yPos += 15
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `${data.doctorName}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  )

  yPos += 5
  doc.setFontSize(9)
  doc.text(
    `CRM: ${data.doctorCRM}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  )

  // Data e hora de impressão
  yPos += 10
  const now = new Date().toLocaleString('pt-BR')
  doc.setFontSize(8)
  doc.text(`Data de impressão: ${now}`, pageWidth / 2, yPos, { align: 'center' })

  return doc
}

export async function generateMedicalCertificatePDFBlob(data: MedicalCertificateData): Promise<Uint8Array> {
  const doc = await generateMedicalCertificatePDF(data)
  // No servidor Next.js, usar 'arraybuffer' e converter para Uint8Array
  const arrayBuffer = doc.output('arraybuffer')
  return new Uint8Array(arrayBuffer)
}

