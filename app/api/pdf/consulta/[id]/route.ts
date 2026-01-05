import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    // Carregar dados da consulta
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        doctors:doctor_id (
          id,
          name,
          crm,
          email,
          specialty
        ),
        patients:patient_id (
          id,
          name,
          cpf,
          birth_date,
          phone,
          email
        )
      `)
      .eq('id', id)
      .single()

    if (appointmentError || !appointment) {
      return NextResponse.json(
        { error: 'Consulta não encontrada' },
        { status: 404 }
      )
    }

    // Carregar sessão de telemedicina se houver
    const { data: session } = await supabase
      .from('telemedicine_sessions')
      .select('*')
      .eq('appointment_id', id)
      .maybeSingle()

    // Carregar transcrições se houver
    let transcriptionText = null
    if (session) {
      const { data: transcriptions } = await supabase
        .from('telemedicine_transcriptions')
        .select('*')
        .eq('session_id', session.id)
        .order('timestamp', { ascending: true })

      if (transcriptions && transcriptions.length > 0) {
        transcriptionText = transcriptions
          .map((t: any) => {
            const speakerLabel = t.speaker === 'doctor' ? 'Médico' : 
                                t.speaker === 'patient' ? 'Paciente' : 'Participante'
            const minutes = Math.floor(t.timestamp / 60)
            const seconds = Math.floor(t.timestamp % 60)
            return `[${minutes}:${seconds.toString().padStart(2, '0')}] ${speakerLabel}: ${t.text}`
          })
          .join('\n')
      }
    }

    // Carregar prontuário se houver
    const { data: medicalRecord } = await supabase
      .from('medical_records')
      .select(`
        *,
        anamnesis:anamnesis (
          *
        ),
        physical_exams:physical_exams (
          *
        ),
        evolutions:evolutions (
          *
        )
      `)
      .eq('appointment_id', id)
      .maybeSingle()

    // Gerar HTML do PDF
    const html = generatePDFHTML(appointment, session, medicalRecord, transcriptionText)

    // Retornar HTML (o cliente pode usar biblioteca como html2pdf ou jsPDF)
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="consulta-${id}.html"`,
      },
    })
  } catch (error: any) {
    console.error('Erro ao gerar PDF da consulta:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar PDF' },
      { status: 500 }
    )
  }
}

function generatePDFHTML(appointment: any, session: any, medicalRecord: any, transcriptionText: string | null) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isTelemedicine = appointment.consultation_type === 'telemedicina' || appointment.consultation_type === 'hibrida'
  const hasAISummary = session?.ai_summary && session.ai_summary.trim() !== ''
  const hasTranscription = transcriptionText && transcriptionText.trim() !== ''
  const hasMedicalRecord = !!medicalRecord

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Consulta - ${appointment.id}</title>
  <style>
    @media print {
      @page {
        margin: 2cm;
      }
    }
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .section h2 {
      border-bottom: 1px solid #ccc;
      padding-bottom: 10px;
      margin-bottom: 15px;
      font-size: 18px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }
    .info-item {
      margin-bottom: 10px;
    }
    .info-label {
      font-weight: bold;
      color: #666;
      font-size: 12px;
      text-transform: uppercase;
    }
    .info-value {
      font-size: 14px;
      margin-top: 5px;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }
    .badge-completed {
      background-color: #10b981;
      color: white;
    }
    .badge-telemedicine {
      background-color: #3b82f6;
      color: white;
    }
    .badge-presencial {
      background-color: #6b7280;
      color: white;
    }
    .content-box {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      padding: 15px;
      margin-top: 10px;
    }
    .transcription {
      white-space: pre-wrap;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.8;
    }
    .summary {
      line-height: 1.8;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ccc;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Detalhes da Consulta</h1>
    <p>Gerado em ${new Date().toLocaleString('pt-BR')}</p>
  </div>

  <div class="section">
    <h2>Informações da Consulta</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Paciente</div>
        <div class="info-value">${appointment.patients?.name || 'N/A'}</div>
        ${appointment.patients?.cpf ? `<div class="info-value" style="font-size: 12px; color: #666;">CPF: ${appointment.patients.cpf}</div>` : ''}
      </div>
      <div class="info-item">
        <div class="info-label">Médico</div>
        <div class="info-value">${appointment.doctors?.name || 'N/A'}</div>
        ${appointment.doctors?.crm ? `<div class="info-value" style="font-size: 12px; color: #666;">CRM: ${appointment.doctors.crm}</div>` : ''}
      </div>
      <div class="info-item">
        <div class="info-label">Data</div>
        <div class="info-value">${formatDate(appointment.appointment_date)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Hora</div>
        <div class="info-value">${appointment.appointment_time || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Tipo</div>
        <div class="info-value">
          <span class="badge ${isTelemedicine ? 'badge-telemedicine' : 'badge-presencial'}">
            ${isTelemedicine ? 'Telemedicina' : 'Presencial'}
          </span>
        </div>
      </div>
      <div class="info-item">
        <div class="info-label">Status</div>
        <div class="info-value">
          <span class="badge badge-completed">
            ${appointment.status === 'completed' ? 'Concluída' : appointment.status}
          </span>
        </div>
      </div>
    </div>
  </div>

  ${hasAISummary ? `
  <div class="section">
    <h2>Resumo da Consulta (IA)</h2>
    <div class="content-box summary">
      ${session.ai_summary.replace(/\n/g, '<br>')}
    </div>
  </div>
  ` : ''}

  ${hasTranscription ? `
  <div class="section">
    <h2>Transcrição da Consulta</h2>
    <div class="content-box transcription">
      ${transcriptionText.replace(/\n/g, '<br>')}
    </div>
  </div>
  ` : ''}

  ${isTelemedicine && session ? `
  <div class="section">
    <h2>Sessão de Telemedicina</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Status</div>
        <div class="info-value">${session.status === 'ended' ? 'Finalizada' : session.status}</div>
      </div>
      ${session.started_at ? `
      <div class="info-item">
        <div class="info-label">Iniciada em</div>
        <div class="info-value">${formatDateTime(session.started_at)}</div>
      </div>
      ` : ''}
      ${session.ended_at ? `
      <div class="info-item">
        <div class="info-label">Finalizada em</div>
        <div class="info-value">${formatDateTime(session.ended_at)}</div>
      </div>
      ` : ''}
      ${session.recording_duration ? `
      <div class="info-item">
        <div class="info-label">Duração</div>
        <div class="info-value">${Math.floor(session.recording_duration / 60)} minutos</div>
      </div>
      ` : ''}
    </div>
    <div style="margin-top: 15px;">
      <div class="info-label">Recursos Utilizados:</div>
      <div style="margin-top: 5px;">
        ${session.transcription_enabled ? '<span class="badge">Transcrição</span>' : ''}
        ${session.ai_summary_enabled ? '<span class="badge">Resumo IA</span>' : ''}
        ${session.recording_enabled ? '<span class="badge">Gravação</span>' : ''}
      </div>
    </div>
  </div>
  ` : ''}

  ${hasMedicalRecord ? `
  <div class="section">
    <h2>Prontuário Médico</h2>
    ${medicalRecord.anamnesis ? `
    <div style="margin-bottom: 15px;">
      <h3 style="font-size: 16px; margin-bottom: 10px;">Anamnese</h3>
      ${medicalRecord.anamnesis.chief_complaint ? `
      <div class="info-item">
        <div class="info-label">Queixa Principal</div>
        <div class="info-value">${medicalRecord.anamnesis.chief_complaint}</div>
      </div>
      ` : ''}
      ${medicalRecord.anamnesis.history_of_present_illness ? `
      <div class="info-item">
        <div class="info-label">História da Doença Atual</div>
        <div class="info-value">${medicalRecord.anamnesis.history_of_present_illness}</div>
      </div>
      ` : ''}
    </div>
    ` : ''}
    ${medicalRecord.physical_exams ? `
    <div style="margin-bottom: 15px;">
      <h3 style="font-size: 16px; margin-bottom: 10px;">Exame Físico</h3>
      ${medicalRecord.physical_exams.general_appearance ? `
      <div class="info-item">
        <div class="info-label">Estado Geral</div>
        <div class="info-value">${medicalRecord.physical_exams.general_appearance}</div>
      </div>
      ` : ''}
    </div>
    ` : ''}
    ${medicalRecord.evolutions && medicalRecord.evolutions.length > 0 ? `
    <div>
      <h3 style="font-size: 16px; margin-bottom: 10px;">Evoluções</h3>
      ${medicalRecord.evolutions.map((evolution: any) => `
      <div class="content-box" style="margin-bottom: 10px;">
        <div class="info-label">${formatDateTime(evolution.evolution_date)}</div>
        <div class="info-value" style="margin-top: 5px;">${evolution.notes}</div>
      </div>
      `).join('')}
    </div>
    ` : ''}
  </div>
  ` : ''}

  ${appointment.notes ? `
  <div class="section">
    <h2>Observações</h2>
    <div class="content-box">
      ${appointment.notes.replace(/\n/g, '<br>')}
    </div>
  </div>
  ` : ''}

  <div class="footer">
    <p>Documento gerado automaticamente pelo sistema Lumi</p>
    <p>ID da Consulta: ${appointment.id}</p>
  </div>
</body>
</html>
  `
}

