import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { addLogoToPDF } from './utils'

interface ReportPDFData {
  reportType: string
  reportTitle: string
  period: string
  startDate?: string
  endDate?: string
  stats?: {
    total?: number
    completed?: number
    cancelled?: number
    revenue?: number
    expenses?: number
    balance?: number
    [key: string]: number | undefined
  }
  data: any[]
  clinicName?: string
  clinicAddress?: string
  clinicPhone?: string
  clinicEmail?: string
  clinicLogoUrl?: string
}

export async function generateReportPDF(data: ReportPDFData): Promise<jsPDF> {
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

  // Título do Relatório
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(data.reportTitle.toUpperCase(), pageWidth / 2, yPos, { align: 'center' })
  yPos += 8

  // Período
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  let periodText = `Período: ${data.period}`
  if (data.startDate && data.endDate) {
    periodText = `Período: ${format(new Date(data.startDate), 'dd/MM/yyyy', { locale: ptBR })} a ${format(new Date(data.endDate), 'dd/MM/yyyy', { locale: ptBR })}`
  }
  doc.text(periodText, pageWidth / 2, yPos, { align: 'center' })
  yPos += 5

  // Data de geração
  doc.setFontSize(9)
  doc.setFont('helvetica', 'italic')
  doc.text(
    `Gerado em: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  )
  yPos += 10

  // Linha separadora
  doc.setLineWidth(0.5)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 10

  // Estatísticas Resumidas
  if (data.stats) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('RESUMO ESTATÍSTICO', margin, yPos)
    yPos += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    if (data.stats.total !== undefined) {
      doc.text(`Total: ${data.stats.total}`, margin, yPos)
      yPos += 6
    }

    if (data.reportType === 'appointments') {
      if (data.stats.completed !== undefined) {
        doc.text(`Concluídos: ${data.stats.completed}`, margin, yPos)
        yPos += 6
      }
      if (data.stats.cancelled !== undefined) {
        doc.text(`Cancelados: ${data.stats.cancelled}`, margin, yPos)
        yPos += 6
      }
      if (data.stats.scheduled !== undefined) {
        doc.text(`Agendados: ${data.stats.scheduled}`, margin, yPos)
        yPos += 6
      }
    }

    if (data.reportType === 'financial') {
      if (data.stats.revenue !== undefined) {
        doc.text(`Receitas: ${formatCurrency(data.stats.revenue)}`, margin, yPos)
        yPos += 6
      }
      if (data.stats.expenses !== undefined) {
        doc.text(`Despesas: ${formatCurrency(data.stats.expenses)}`, margin, yPos)
        yPos += 6
      }
      if (data.stats.balance !== undefined) {
        doc.setFont('helvetica', 'bold')
        doc.text(`Saldo: ${formatCurrency(data.stats.balance)}`, margin, yPos)
        yPos += 6
        doc.setFont('helvetica', 'normal')
      }
    }

    yPos += 5
  }

  // Tabela de Dados
  if (data.data && data.data.length > 0) {
    // Verificar se precisa de nova página
    const remainingSpace = doc.internal.pageSize.getHeight() - yPos - 30
    if (remainingSpace < 50) {
      doc.addPage()
      yPos = margin
    }

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('DETALHES DO RELATÓRIO', margin, yPos)
    yPos += 8

    // Preparar dados da tabela baseado no tipo de relatório
    const tableData = prepareTableData(data.reportType, data.data)

    autoTable(doc, {
      startY: yPos,
      head: [tableData.headers],
      body: tableData.rows,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [59, 130, 246], // Azul
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      columnStyles: tableData.columnStyles,
      theme: 'striped',
      didDrawPage: function (tableData) {
        // Header em cada página
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(data.reportTitle.toUpperCase(), pageWidth / 2, 15, { align: 'center' })
      },
    })
  }

  return doc
}

function prepareTableData(reportType: string, data: any[]) {
  const headers: string[] = []
  const rows: any[][] = []
  const columnStyles: any = {}

  if (reportType === 'appointments') {
    headers.push('Data', 'Hora', 'Paciente', 'Médico', 'Status', 'Tipo')
    columnStyles[0] = { cellWidth: 25 }
    columnStyles[1] = { cellWidth: 20 }
    columnStyles[2] = { cellWidth: 40 }
    columnStyles[3] = { cellWidth: 40 }
    columnStyles[4] = { cellWidth: 30 }
    columnStyles[5] = { cellWidth: 30 }

    data.forEach((item: any) => {
      rows.push([
        item.appointment_date
          ? format(new Date(item.appointment_date), 'dd/MM/yyyy', { locale: ptBR })
          : '',
        item.appointment_time || '',
        item.patients?.name || 'N/A',
        item.doctors?.name || 'N/A',
        getStatusLabel(item.status),
        item.consultation_type || 'N/A',
      ])
    })
  } else if (reportType === 'patients') {
    headers.push('Nome', 'CPF', 'Email', 'Telefone', 'Data de Cadastro')
    columnStyles[0] = { cellWidth: 50 }
    columnStyles[1] = { cellWidth: 30 }
    columnStyles[2] = { cellWidth: 50 }
    columnStyles[3] = { cellWidth: 30 }
    columnStyles[4] = { cellWidth: 35 }

    data.forEach((item: any) => {
      rows.push([
        item.name || '',
        item.cpf || '',
        item.email || '',
        item.phone || '',
        item.created_at
          ? format(new Date(item.created_at), 'dd/MM/yyyy', { locale: ptBR })
          : '',
      ])
    })
  } else if (reportType === 'financial') {
    headers.push('Data', 'Tipo', 'Valor', 'Método', 'Paciente', 'Status')
    columnStyles[0] = { cellWidth: 25 }
    columnStyles[1] = { cellWidth: 20 }
    columnStyles[2] = { cellWidth: 30 }
    columnStyles[3] = { cellWidth: 25 }
    columnStyles[4] = { cellWidth: 40 }
    columnStyles[5] = { cellWidth: 25 }

    data.forEach((item: any) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const isPaid = item.paid_date || (item.due_date && new Date(item.due_date) <= today)
      
      rows.push([
        item.transaction_date
          ? format(new Date(item.transaction_date), 'dd/MM/yyyy', { locale: ptBR })
          : '',
        item.transaction_type === 'income' ? 'Receita' : 'Despesa',
        formatCurrency(Number(item.amount) || 0),
        item.payment_method || 'N/A',
        item.patients?.name || 'N/A',
        isPaid ? 'Pago' : 'Pendente',
      ])
    })
  } else if (reportType === 'doctors') {
    headers.push('Médico', 'Total de Consultas', 'Concluídas', 'Taxa de Conclusão')
    columnStyles[0] = { cellWidth: 70 }
    columnStyles[1] = { cellWidth: 40 }
    columnStyles[2] = { cellWidth: 40 }
    columnStyles[3] = { cellWidth: 35 }

    data.forEach((item: any) => {
      const completionRate =
        item.count > 0 ? `${((item.completed / item.count) * 100).toFixed(1)}%` : '0%'
      rows.push([item.name || 'N/A', item.count || 0, item.completed || 0, completionRate])
    })
  } else if (reportType === 'telemedicine') {
    headers.push('Data/Hora', 'Paciente', 'Médico', 'Status', 'Duração')
    columnStyles[0] = { cellWidth: 35 }
    columnStyles[1] = { cellWidth: 50 }
    columnStyles[2] = { cellWidth: 50 }
    columnStyles[3] = { cellWidth: 30 }
    columnStyles[4] = { cellWidth: 30 }

    data.forEach((item: any) => {
      rows.push([
        item.started_at
          ? format(new Date(item.started_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
          : 'N/A',
        item.appointments?.patients?.name || 'N/A',
        item.appointments?.doctors?.name || 'N/A',
        item.status === 'completed' ? 'Concluída' : item.status || 'N/A',
        item.duration ? `${Math.round(item.duration / 60)} min` : 'N/A',
      ])
    })
  } else if (reportType === 'prescriptions') {
    headers.push('Data', 'Paciente', 'Médico')
    columnStyles[0] = { cellWidth: 35 }
    columnStyles[1] = { cellWidth: 60 }
    columnStyles[2] = { cellWidth: 60 }

    data.forEach((item: any) => {
      rows.push([
        item.prescription_date
          ? format(new Date(item.prescription_date), 'dd/MM/yyyy', { locale: ptBR })
          : 'N/A',
        item.patients?.name || 'N/A',
        item.doctors?.name || 'N/A',
      ])
    })
  } else if (reportType === 'exams') {
    headers.push('Data Solicitação', 'Tipo', 'Paciente', 'Status')
    columnStyles[0] = { cellWidth: 35 }
    columnStyles[1] = { cellWidth: 50 }
    columnStyles[2] = { cellWidth: 50 }
    columnStyles[3] = { cellWidth: 30 }

    data.forEach((item: any) => {
      rows.push([
        item.requested_date
          ? format(new Date(item.requested_date), 'dd/MM/yyyy', { locale: ptBR })
          : 'N/A',
        item.exam_type || 'N/A',
        item.patients?.name || 'N/A',
        getExamStatusLabel(item.status),
      ])
    })
  }

  return { headers, rows, columnStyles }
}

function getStatusLabel(status: string) {
  const labels: { [key: string]: string } = {
    scheduled: 'Agendado',
    confirmed: 'Confirmado',
    completed: 'Concluído',
    cancelled: 'Cancelado',
    no_show: 'Não Compareceu',
  }
  return labels[status] || status
}

function getExamStatusLabel(status: string) {
  const labels: { [key: string]: string } = {
    requested: 'Solicitado',
    pending: 'Pendente',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  }
  return labels[status] || status
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export async function generateReportPDFBlob(data: ReportPDFData): Promise<Uint8Array> {
  const pdf = await generateReportPDF(data)
  const arrayBuffer = pdf.output('arraybuffer') as ArrayBuffer
  return new Uint8Array(arrayBuffer)
}

