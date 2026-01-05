import { createClient } from '@/lib/supabase/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from './whatsapp-service'
import {
  getLeadFullContext,
  analyzeLeadSentiment,
  generateAdvancedAIMessage,
} from './follow-up-ai-service'

interface CreateFollowUpParams {
  leadId?: string
  leadTelefone: string
  leadNome?: string
  tipoFollowUp: string
  tipoMensagem: 'fixo' | 'ia' | 'customizado'
  mensagem: string
  templateId?: string
  metadata?: Record<string, any>
  observacoes?: string
}

interface CreateBulkFollowUpParams {
  leads: Array<{
    leadId?: string
    leadTelefone: string
    leadNome?: string
  }>
  tipoFollowUp: string
  tipoMensagem: 'fixo' | 'ia' | 'customizado'
  mensagem: string // Pode conter variáveis {{nome}}, {{procedimento}}, etc.
  templateId?: string
  metadata?: Record<string, any>
  observacoes?: string
  usarContexto?: boolean
  promptPersonalizado?: string
  agendadoPara?: string
  recorrente?: boolean
  tipoRecorrencia?: 'diario' | 'semanal' | 'mensal'
  intervaloRecorrencia?: number
  dataFimRecorrencia?: string
  proximaExecucao?: string
}

interface GenerateAIMessageParams {
  leadContexto: string
  leadNome: string
  tipoFollowUp: string
  promptPersonalizado?: string
  metadata?: Record<string, any>
  templateId?: string
}

/**
 * Cria um follow-up individual
 */
export async function createFollowUp(params: CreateFollowUpParams, userId?: string): Promise<{ id: string }> {
  const supabase = userId ? await createAdminClient() : createClient()

  const { data, error } = await supabase
    .from('follow_ups')
    .insert({
      lead_id: params.leadId,
      lead_telefone: params.leadTelefone,
      lead_nome: params.leadNome,
      tipo_follow_up: params.tipoFollowUp,
      tipo_mensagem: params.tipoMensagem,
      mensagem: params.mensagem,
      template_id: params.templateId,
      status: 'pendente',
      metadata: params.metadata || {},
      observacoes: params.observacoes,
      criado_por: userId,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Erro ao criar follow-up:', error)
    throw new Error('Erro ao criar follow-up')
  }

  return { id: data.id }
}

/**
 * Cria múltiplos follow-ups (envio em lote)
 */
export async function createBulkFollowUp(params: CreateBulkFollowUpParams, userId?: string): Promise<{ ids: string[] }> {
  const supabase = userId ? await createAdminClient() : createClient()

  const followUps = params.leads.map(lead => {
    // Substituir variáveis na mensagem
    let mensagem = params.mensagem
    mensagem = mensagem.replace(/\{\{nome\}\}/g, lead.leadNome || 'cliente')
    
    // Substituir outras variáveis se presentes no metadata
    if (params.metadata) {
      Object.keys(params.metadata).forEach(key => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
        mensagem = mensagem.replace(regex, params.metadata![key])
      })
    }

    return {
      lead_id: lead.leadId,
      lead_telefone: lead.leadTelefone,
      lead_nome: lead.leadNome,
      tipo_follow_up: params.tipoFollowUp,
      tipo_mensagem: params.tipoMensagem,
      mensagem,
      template_id: params.templateId,
      status: 'pendente',
      metadata: params.metadata || {},
      observacoes: params.observacoes,
      criado_por: userId,
      agendado_para: params.agendadoPara || null,
      recorrente: params.recorrente || false,
      tipo_recorrencia: params.tipoRecorrencia || null,
      intervalo_recorrencia: params.intervaloRecorrencia || 1,
      data_fim_recorrencia: params.dataFimRecorrencia || null,
      proxima_execucao: params.proximaExecucao || null,
      usar_contexto: params.usarContexto !== false, // Default true
      prompt_personalizado: params.promptPersonalizado || null,
    }
  })

  const { data, error } = await supabase
    .from('follow_ups')
    .insert(followUps)
    .select('id')

  if (error) {
    console.error('Erro ao criar follow-ups em lote:', error)
    throw new Error('Erro ao criar follow-ups em lote')
  }

  return { ids: data.map(f => f.id) }
}

/**
 * Envia um follow-up via WhatsApp
 */
export async function sendFollowUp(followUpId: string): Promise<void> {
  const supabase = await createAdminClient()

  // Buscar follow-up
  const { data: followUp, error: fetchError } = await supabase
    .from('follow_ups')
    .select('*')
    .eq('id', followUpId)
    .single()

  if (fetchError || !followUp) {
    throw new Error('Follow-up não encontrado')
  }

  if (followUp.status !== 'pendente') {
    throw new Error('Follow-up já foi enviado ou cancelado')
  }

  try {
    let mensagemFinal = followUp.mensagem

    // Se for tipo IA e não houver mensagem, gerar usando contexto completo do lead
    if (followUp.tipo_mensagem === 'ia' && (!mensagemFinal || mensagemFinal.trim() === '')) {
      const leadId = followUp.lead_id || undefined

      if (!leadId) {
        // Fallback para busca por telefone
        const { data: lead } = await supabase
          .from('leads')
          .select('id')
          .eq('telefone', followUp.lead_telefone)
          .single()

        if (lead) {
          // Usar contexto completo avançado
          const leadContext = await getLeadFullContext(lead.id)
          
          if (leadContext && followUp.usar_contexto) {
            // Gerar mensagem avançada com análise de sentimento
            const sentimentAnalysis = await analyzeLeadSentiment(leadContext)
            mensagemFinal = await generateAdvancedAIMessage({
              leadContext,
              tipoFollowUp: followUp.tipo_follow_up,
              promptPersonalizado: followUp.prompt_personalizado || undefined,
              sentimentAnalysis,
              templateId: followUp.template_id || undefined,
            })
          } else {
            // Fallback para método antigo se não conseguir contexto completo
            let leadContexto = leadContext?.contexto || 'Sem contexto disponível'
            let leadNome = followUp.lead_nome || 'Cliente'
            
            let metadata: Record<string, any> = {}
            if (followUp.metadata && typeof followUp.metadata === 'object') {
              metadata = followUp.metadata as Record<string, any>
            }

            mensagemFinal = await generateAIMessage({
              leadContexto: followUp.usar_contexto ? leadContexto : '',
              leadNome,
              tipoFollowUp: followUp.tipo_follow_up,
              promptPersonalizado: followUp.prompt_personalizado || undefined,
              metadata,
              templateId: followUp.template_id || undefined,
            })
          }
        }
      } else {
        // Usar contexto completo avançado
        const leadContext = await getLeadFullContext(leadId)
        
        if (leadContext && followUp.usar_contexto) {
          // Gerar mensagem avançada com análise de sentimento
          const sentimentAnalysis = await analyzeLeadSentiment(leadContext)
          mensagemFinal = await generateAdvancedAIMessage({
            leadContext,
            tipoFollowUp: followUp.tipo_follow_up,
            promptPersonalizado: followUp.prompt_personalizado || undefined,
            sentimentAnalysis,
            templateId: followUp.template_id || undefined,
          })
        } else {
          // Fallback para método antigo
          const { data: lead } = await supabase
            .from('leads')
            .select('contexto, nome, interesse')
            .eq('id', leadId)
            .single()

          let leadContexto = lead?.contexto || 'Sem contexto disponível'
          let leadNome = lead?.nome || followUp.lead_nome || 'Cliente'
          
          let metadata: Record<string, any> = {}
          if (followUp.metadata && typeof followUp.metadata === 'object') {
            metadata = followUp.metadata as Record<string, any>
          }

          mensagemFinal = await generateAIMessage({
            leadContexto: followUp.usar_contexto ? leadContexto : '',
            leadNome,
            tipoFollowUp: followUp.tipo_follow_up,
            promptPersonalizado: followUp.prompt_personalizado || undefined,
            metadata,
            templateId: followUp.template_id || undefined,
          })
        }
      }

      // Atualizar follow-up com a mensagem gerada
      if (mensagemFinal) {
        await supabase
          .from('follow_ups')
          .update({
            mensagem: mensagemFinal,
          })
          .eq('id', followUpId)
      }
    }

    // Enviar via WhatsApp
    await sendWhatsAppMessage({
      phone: followUp.lead_telefone,
      message: mensagemFinal,
    })

    // Atualizar status
    const { error: updateError } = await supabase
      .from('follow_ups')
      .update({
        status: 'enviado',
        enviado_em: new Date().toISOString(),
      })
      .eq('id', followUpId)

    if (updateError) {
      console.error('Erro ao atualizar status do follow-up:', updateError)
    }

    // Criar notificação para o usuário que criou o follow-up (se houver)
    if (followUp.criado_por) {
      try {
        // criado_por já é o user_id (UUID do auth.users)
        await supabase.from('notifications').insert({
          user_id: followUp.criado_por,
          title: 'Follow-up Enviado',
          message: `Mensagem de follow-up enviada para ${followUp.lead_nome || followUp.lead_telefone.replace('@s.whatsapp.net', '')}`,
          type: 'success',
          link: `/dashboard/leads/follow-up/historico`,
          read: false,
        })
      } catch (notificationError) {
        // Erro silencioso - não bloquear o envio
        console.error('Erro ao criar notificação de follow-up enviado:', notificationError)
      }
    }
  } catch (error: any) {
    console.error('Erro ao enviar follow-up:', error)
    
    // Marcar como falhou
    await supabase
      .from('follow_ups')
      .update({
        status: 'falhou',
        observacoes: `${followUp.observacoes || ''}\n\nErro: ${error.message}`,
      })
      .eq('id', followUpId)

    throw error
  }
}

/**
 * Envia múltiplos follow-ups
 */
export async function sendBulkFollowUp(followUpIds: string[]): Promise<{ success: string[], failed: string[] }> {
  const success: string[] = []
  const failed: string[] = []

  // Enviar sequencialmente para evitar sobrecarga
  for (const id of followUpIds) {
    try {
      await sendFollowUp(id)
      success.push(id)
      
      // Pequeno delay entre envios para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      failed.push(id)
    }
  }

  return { success, failed }
}

/**
 * Calcula a próxima execução para um follow-up recorrente
 */
function calculateNextExecution(
  tipoRecorrencia: 'diario' | 'semanal' | 'mensal',
  intervaloRecorrencia: number,
  dataFimRecorrencia?: string | null
): Date | null {
  const now = new Date()
  const nextDate = new Date(now)

  switch (tipoRecorrencia) {
    case 'diario':
      nextDate.setDate(nextDate.getDate() + intervaloRecorrencia)
      break
    case 'semanal':
      nextDate.setDate(nextDate.getDate() + intervaloRecorrencia * 7)
      break
    case 'mensal':
      nextDate.setMonth(nextDate.getMonth() + intervaloRecorrencia)
      break
  }

  // Verificar se passou da data de término
  if (dataFimRecorrencia) {
    const fimDate = new Date(dataFimRecorrencia)
    if (nextDate > fimDate) {
      return null // Não há mais execuções
    }
  }

  return nextDate
}

/**
 * Processa follow-ups agendados e recorrentes que estão prontos para envio
 */
export async function processScheduledFollowUps(): Promise<{
  agendados: { sent: number; failed: number }
  recorrentes: { sent: number; failed: number; nextCreated: number }
}> {
  const supabase = await createAdminClient()
  const now = new Date()

  const result = {
    agendados: { sent: 0, failed: 0 },
    recorrentes: { sent: 0, failed: 0, nextCreated: 0 },
  }

  try {
    // 1. Processar follow-ups agendados (não recorrentes) que já passaram da data
    // Usar lte para pegar todos que já passaram, incluindo os que estão exatamente no horário
    const { data: scheduledFollowUps, error: scheduledError } = await supabase
      .from('follow_ups')
      .select('*')
      .eq('status', 'pendente')
      .eq('recorrente', false)
      .not('agendado_para', 'is', null)
      .lte('agendado_para', now.toISOString())
      .order('agendado_para', { ascending: true })

    if (scheduledError) {
      console.error('❌ Erro ao buscar follow-ups agendados:', scheduledError)
    } else if (scheduledFollowUps && scheduledFollowUps.length > 0) {
      console.log(`📅 Processando ${scheduledFollowUps.length} follow-up(s) agendado(s)...`)
      
      for (const followUp of scheduledFollowUps) {
        try {
          const agendadoPara = new Date(followUp.agendado_para)
          const diffMinutes = Math.floor((now.getTime() - agendadoPara.getTime()) / (1000 * 60))
          
          console.log(`  → Enviando follow-up ${followUp.id} (agendado para ${agendadoPara.toLocaleString('pt-BR')}, ${diffMinutes} min atrás)`)
          
          await sendFollowUp(followUp.id)
          result.agendados.sent++
          
          console.log(`  ✅ Follow-up ${followUp.id} enviado com sucesso`)
        } catch (error: any) {
          console.error(`  ❌ Erro ao enviar follow-up agendado ${followUp.id}:`, error.message)
          result.agendados.failed++
        }
        
        // Pequeno delay entre envios para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } else {
      console.log('📅 Nenhum follow-up agendado para processar no momento')
    }

    // 2. Processar follow-ups recorrentes que precisam ser executados
    // Usar lte para pegar todos que já passaram da próxima execução
    const { data: recurringFollowUps, error: recurringError } = await supabase
      .from('follow_ups')
      .select('*')
      .eq('status', 'pendente')
      .eq('recorrente', true)
      .not('proxima_execucao', 'is', null)
      .lte('proxima_execucao', now.toISOString())
      .order('proxima_execucao', { ascending: true })

    if (recurringError) {
      console.error('❌ Erro ao buscar follow-ups recorrentes:', recurringError)
    } else if (recurringFollowUps && recurringFollowUps.length > 0) {
      console.log(`🔄 Processando ${recurringFollowUps.length} follow-up(s) recorrente(s)...`)
      
      for (const followUp of recurringFollowUps) {
        try {
          // Calcular próxima execução ANTES de enviar
          const nextExecution = calculateNextExecution(
            followUp.tipo_recorrencia as 'diario' | 'semanal' | 'mensal',
            followUp.intervalo_recorrencia || 1,
            followUp.data_fim_recorrencia
          )

          // Enviar o follow-up (isso vai marcar como "enviado", mas vamos reverter depois se for recorrente)
          await sendFollowUp(followUp.id)

          if (nextExecution) {
            // Atualizar com próxima execução e voltar status para pendente
            const { error: updateError } = await supabase
              .from('follow_ups')
              .update({
                proxima_execucao: nextExecution.toISOString(),
                status: 'pendente', // Manter como pendente para próxima execução
                enviado_em: new Date().toISOString(), // Registrar que foi enviado agora
              })
              .eq('id', followUp.id)

            if (updateError) {
              console.error(`  ❌ Erro ao atualizar próxima execução do follow-up ${followUp.id}:`, updateError)
            } else {
              console.log(`  ✅ Follow-up recorrente ${followUp.id} enviado. Próxima execução: ${nextExecution.toLocaleString('pt-BR')}`)
            }

            result.recorrentes.nextCreated++
            result.recorrentes.sent++
          } else {
            // Não há mais execuções - manter como enviado (final)
            console.log(`  ✅ Follow-up recorrente ${followUp.id} enviado (última execução)`)
            result.recorrentes.sent++
          }
        } catch (error: any) {
          console.error(`  ❌ Erro ao processar follow-up recorrente ${followUp.id}:`, error.message)
          result.recorrentes.failed++
          
          // Em caso de erro, tentar atualizar próxima execução mesmo assim
          try {
            const nextExecution = calculateNextExecution(
              followUp.tipo_recorrencia as 'diario' | 'semanal' | 'mensal',
              followUp.intervalo_recorrencia || 1,
              followUp.data_fim_recorrencia
            )

            if (nextExecution) {
              await supabase
                .from('follow_ups')
                .update({
                  proxima_execucao: nextExecution.toISOString(),
                  // Manter status como pendente se houver próxima execução
                })
                .eq('id', followUp.id)
            }
          } catch (updateError) {
            console.error(`Erro ao atualizar próxima execução do follow-up ${followUp.id}:`, updateError)
          }
        }
        
        // Pequeno delay entre processamentos
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    console.log('✅ Processamento concluído:', {
      agendados: `${result.agendados.sent} enviados, ${result.agendados.failed} falharam`,
      recorrentes: `${result.recorrentes.sent} enviados, ${result.recorrentes.failed} falharam, ${result.recorrentes.nextCreated} próximos criados`
    })
    return result
  } catch (error: any) {
    console.error('Erro ao processar follow-ups agendados e recorrentes:', error)
    throw error
  }
}

/**
 * Cria automaticamente lembretes de agendamento (1 dia antes e 15 minutos antes)
 */
export async function createAppointmentReminders(appointmentId: string): Promise<{ confirmationId?: string; reminderId?: string }> {
  const supabase = await createAdminClient()

  try {
    // Buscar agendamento com dados do paciente e médico
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        patients:patient_id (
          id,
          name,
          phone
        ),
        doctors:doctor_id (
          id,
          name
        )
      `)
      .eq('id', appointmentId)
      .single()

    if (appointmentError || !appointment) {
      console.error('Erro ao buscar agendamento:', appointmentError)
      return {}
    }

    // Verificar se tem telefone do paciente
    const patientPhone = appointment.patients?.phone
    const patientName = appointment.patients?.name
    const doctorName = appointment.doctors?.name

    if (!patientPhone) {
      console.warn(`Agendamento ${appointmentId} não tem telefone do paciente. Lembretes não serão criados.`)
      return {}
    }

    // Formatar telefone para WhatsApp (adicionar @s.whatsapp.net se não tiver)
    let whatsappPhone = patientPhone
    if (!whatsappPhone.includes('@s.whatsapp.net')) {
      // Remover caracteres não numéricos e adicionar sufixo
      whatsappPhone = whatsappPhone.replace(/\D/g, '')
      if (whatsappPhone.length >= 10) {
        whatsappPhone = `${whatsappPhone}@s.whatsapp.net`
      } else {
        console.warn(`Telefone inválido para agendamento ${appointmentId}: ${patientPhone}`)
        return {}
      }
    }

    // Calcular data/hora do agendamento
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
    
    // 1. Lembrete de confirmação: 1 dia antes às 18h
    const confirmationDate = new Date(appointmentDateTime)
    confirmationDate.setDate(confirmationDate.getDate() - 1)
    confirmationDate.setHours(18, 0, 0, 0)

    // 2. Lembrete final: 15 minutos antes
    const reminderDate = new Date(appointmentDateTime)
    reminderDate.setMinutes(reminderDate.getMinutes() - 15)

    // Verificar se as datas não são no passado (se for agendamento muito próximo)
    const now = new Date()
    const result: { confirmationId?: string; reminderId?: string } = {}

    // Formatar data e horário para a mensagem (uma vez só)
    const appointmentDateFormatted = new Date(appointment.appointment_date).toLocaleDateString('pt-BR')
    const appointmentTimeFormatted = appointment.appointment_time.substring(0, 5) // HH:mm

    // Criar follow-up de confirmação (1 dia antes)
    if (confirmationDate > now) {
      try {
        const confirmationFollowUp = await createFollowUp(
          {
            leadTelefone: whatsappPhone,
            leadNome: patientName,
            tipoFollowUp: 'confirmacao',
            tipoMensagem: 'ia',
            mensagem: '', // Será gerado pela IA
            metadata: {
              appointment_id: appointmentId,
              appointment_date: appointment.appointment_date,
              appointment_time: appointment.appointment_time,
              data: appointmentDateFormatted,
              horario: appointmentTimeFormatted,
              doctor_name: doctorName,
              procedimento: appointment.consultation_type || 'consulta',
              consultation_type: appointment.consultation_type || 'presencial',
            },
            observacoes: `Confirmação automática de agendamento ${appointmentId} - 1 dia antes`,
          },
          undefined // System user
        )

        // Agendar para 1 dia antes
        await supabase
          .from('follow_ups')
          .update({
            agendado_para: confirmationDate.toISOString(),
          })
          .eq('id', confirmationFollowUp.id)

        result.confirmationId = confirmationFollowUp.id
        console.log(`Follow-up de confirmação criado para agendamento ${appointmentId}`)
      } catch (error) {
        console.error(`Erro ao criar follow-up de confirmação para agendamento ${appointmentId}:`, error)
      }
    }

    // Criar follow-up de lembrete (15 minutos antes)
    if (reminderDate > now) {
      try {
        const reminderFollowUp = await createFollowUp(
          {
            leadTelefone: whatsappPhone,
            leadNome: patientName,
            tipoFollowUp: 'lembrete_consulta',
            tipoMensagem: 'ia',
            mensagem: '', // Será gerado pela IA
            metadata: {
              appointment_id: appointmentId,
              appointment_date: appointment.appointment_date,
              appointment_time: appointment.appointment_time,
              data: appointmentDateFormatted,
              horario: appointmentTimeFormatted,
              doctor_name: doctorName,
              procedimento: appointment.consultation_type || 'consulta',
              consultation_type: appointment.consultation_type || 'presencial',
            },
            observacoes: `Lembrete automático de agendamento ${appointmentId} - 15 minutos antes`,
          },
          undefined // System user
        )

        // Agendar para 15 minutos antes
        await supabase
          .from('follow_ups')
          .update({
            agendado_para: reminderDate.toISOString(),
          })
          .eq('id', reminderFollowUp.id)

        result.reminderId = reminderFollowUp.id
        console.log(`Follow-up de lembrete criado para agendamento ${appointmentId}`)
      } catch (error) {
        console.error(`Erro ao criar follow-up de lembrete para agendamento ${appointmentId}:`, error)
      }
    }

    return result
  } catch (error: any) {
    console.error(`Erro ao criar lembretes de agendamento ${appointmentId}:`, error)
    return {}
  }
}

/**
 * Notifica médico sobre novo agendamento via WhatsApp e notificação in-app
 */
export async function notifyDoctorAboutAppointment(appointmentId: string): Promise<void> {
  const supabase = await createAdminClient()

  try {
    // Buscar agendamento com dados do paciente e médico (incluindo quem criou)
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        patients:patient_id (
          id,
          name,
          phone
        ),
        doctors:doctor_id (
          id,
          name,
          whatsapp_phone,
          user_id
        )
      `)
      .eq('id', appointmentId)
      .single()

    if (appointmentError || !appointment) {
      console.error('Erro ao buscar agendamento para notificar médico:', appointmentError)
      return
    }

    const doctor = appointment.doctors
    if (!doctor) {
      console.warn(`Agendamento ${appointmentId} não tem médico associado`)
      return
    }

    const patientName = appointment.patients?.name || 'Paciente'
    const doctorName = doctor.name
    const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString('pt-BR')
    const appointmentTime = appointment.appointment_time.substring(0, 5) // HH:mm
    const consultationType = appointment.consultation_type || 'presencial'
    
    // Determinar quem criou o agendamento para incluir na mensagem
    let createdByText = ''
    if (appointment.created_by_type === 'admin') {
      createdByText = `\n\n*Agendado por:* ${appointment.created_by_name || 'Administrador'} (Admin)`
    } else if (appointment.created_by_type === 'secretaria') {
      createdByText = `\n\n*Agendado por:* ${appointment.created_by_name || 'Secretária'}`
    } else if (appointment.created_by_type === 'ia') {
      createdByText = `\n\n*Agendado por:* Assistente Virtual`
    } else if (appointment.created_by_name) {
      // Fallback caso tenha nome mas não tenha type
      createdByText = `\n\n*Agendado por:* ${appointment.created_by_name}`
    }

    // Criar notificação in-app para o médico
    if (doctor.user_id) {
      try {
        // Incluir quem criou na notificação in-app também
        let notificationMessage = `Consulta agendada para ${appointmentDate} às ${appointmentTime} com ${patientName}`
        if (appointment.created_by_type === 'admin') {
          notificationMessage += ` (Agendado por ${appointment.created_by_name || 'Administrador'})`
        } else if (appointment.created_by_type === 'secretaria') {
          notificationMessage += ` (Agendado por ${appointment.created_by_name || 'Secretária'})`
        } else if (appointment.created_by_type === 'ia') {
          notificationMessage += ` (Agendado por Assistente Virtual)`
        } else if (appointment.created_by_name) {
          notificationMessage += ` (Agendado por ${appointment.created_by_name})`
        }
        
        await supabase.from('notifications').insert({
          user_id: doctor.user_id,
          title: 'Novo Agendamento',
          message: notificationMessage,
          type: 'info',
          link: `/dashboard/agendamentos`,
          read: false,
        })
        console.log(`Notificação in-app criada para médico ${doctorName}`)
      } catch (notifyError) {
        console.error('Erro ao criar notificação in-app para médico:', notifyError)
      }
    }

    // Enviar WhatsApp para o médico se tiver número cadastrado
    if (doctor.whatsapp_phone) {
      try {
        // Formatar telefone se necessário
        let whatsappPhone = doctor.whatsapp_phone
        if (!whatsappPhone.includes('@s.whatsapp.net')) {
          whatsappPhone = whatsappPhone.replace(/\D/g, '')
          if (whatsappPhone.length >= 10) {
            whatsappPhone = `${whatsappPhone}@s.whatsapp.net`
          } else {
            logger.warn('Telefone WhatsApp inválido do médico', { doctorName, whatsappPhone: doctor.whatsapp_phone })
            return
          }
        }

        // Mensagem para o médico (incluindo quem criou o agendamento)
        const message = `👨‍⚕️ *Novo Agendamento*\n\n` +
          `Paciente: ${patientName}\n` +
          `Data: ${appointmentDate}\n` +
          `Horário: ${appointmentTime}\n` +
          `Tipo: ${consultationType}${createdByText}\n\n` +
          `Acesse o sistema para mais detalhes.`

        await sendWhatsAppMessage({
          phone: whatsappPhone,
          message: message,
        })

        logger.info('WhatsApp enviado para médico sobre agendamento', { doctorName, appointmentId })
      } catch (whatsappError) {
        logger.error('Erro ao enviar WhatsApp para médico', whatsappError, { doctorName, appointmentId })
        // Não lançar erro - notificação in-app já foi criada
      }
    } else {
      logger.debug('Médico sem WhatsApp cadastrado - apenas notificação in-app criada', { doctorName, appointmentId })
    }
  } catch (error: any) {
    logger.error('Erro ao notificar médico sobre agendamento', error, { appointmentId })
    // Não lançar erro - não deve bloquear criação do agendamento
  }
}

/**
 * Gera mensagem usando OpenAI baseada no contexto do lead
 */
export async function generateAIMessage(params: GenerateAIMessageParams): Promise<string> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY

  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API Key não configurada')
  }

  // Tentar buscar template de IA do banco
  let basePrompt = ''
  try {
    // Se tiver templateId, buscar template específico
    if (params.templateId) {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const supabase = await createAdminClient()
      const { data: template } = await supabase
        .from('follow_up_templates')
        .select('*')
        .eq('id', params.templateId)
        .eq('tipo_template', 'ia')
        .single()
      
      if (template && template.ativa) {
        basePrompt = template.conteudo
      }
    }
    
    // Se não encontrou template específico, buscar por tipo
    if (!basePrompt) {
      const aiTemplates = await getFollowUpTemplates(params.tipoFollowUp, 'ia')
      
      if (aiTemplates && aiTemplates.length > 0) {
        // Usar o primeiro template de IA encontrado
        basePrompt = aiTemplates[0].conteudo
      }
    }
  } catch (error) {
    console.warn('Erro ao buscar template de IA, usando padrão:', error)
  }

  // Fallback para prompts padrão se não houver template
  if (!basePrompt) {
    const promptsByType: Record<string, string> = {
      reativacao: `Crie uma mensagem curta e amigável para reativar um lead que parou de responder. Use linguagem natural e humanizada, como se fosse uma pessoa da clínica enviando WhatsApp. Não use emojis em excesso.`,
      promocao: `Crie uma mensagem curta sobre uma promoção ou oferta especial. Seja atraente mas não seja insistente. Use linguagem natural de WhatsApp.`,
      lembrete_consulta: `Crie uma mensagem curta lembrando sobre uma consulta agendada. Seja cordial e profissional, mas com tom amigável. Se houver informações de data, horário ou médico no contexto, inclua-as na mensagem.`,
      orcamento: `Crie uma mensagem curta perguntando se ficou alguma dúvida sobre o orçamento enviado. Seja prestativo e aberto para responder perguntas.`,
      pos_consulta: `Crie uma mensagem curta de follow-up pós-consulta/procedimento. Demonstre cuidado e disponibilidade.`,
      confirmacao: `Crie uma mensagem curta pedindo confirmação de presença para uma consulta. Seja direto mas cordial. Se houver informações de data, horário ou médico no contexto, inclua-as na mensagem.`,
      reagendamento: `Crie uma mensagem curta oferecendo reagendar uma consulta. Seja compreensivo e flexível.`,
      oferta: `Crie uma mensagem curta com uma oferta personalizada. Seja atraente mas profissional.`,
    }
    basePrompt = promptsByType[params.tipoFollowUp] || promptsByType.reativacao
  }

  let contextInfo = `
Nome do lead: ${params.leadNome}
Contexto da conversa: ${params.leadContexto}
`

  if (params.metadata) {
    if (params.metadata.procedimento) {
      contextInfo += `\nProcedimento de interesse: ${params.metadata.procedimento}`
    }
    if (params.metadata.data) {
      contextInfo += `\nData da consulta: ${params.metadata.data}`
    }
    if (params.metadata.horario) {
      contextInfo += `\nHorário da consulta: ${params.metadata.horario}`
    }
    if (params.metadata.doctor_name) {
      contextInfo += `\nMédico: Dr(a). ${params.metadata.doctor_name}`
    }
    if (params.metadata.consultation_type) {
      const tipoConsulta = params.metadata.consultation_type === 'telemedicina' 
        ? 'telemedicina (online)' 
        : params.metadata.consultation_type === 'hibrida'
        ? 'híbrida (presencial + online)'
        : 'presencial'
      contextInfo += `\nTipo de consulta: ${tipoConsulta}`
    }
  }

  let fullPrompt = `${basePrompt}

${contextInfo}`

  if (params.promptPersonalizado) {
    fullPrompt += `\n\nInstruções adicionais: ${params.promptPersonalizado}`
  }

  fullPrompt += `

Regras:
- Máximo 3 linhas
- Use o nome do lead naturalmente
- Não use markdown, negrito ou formatação especial
- Escreva como se fosse um WhatsApp informal mas profissional
- Seja direto e objetivo
- Use no máximo 1 ou 2 emojis relevantes

Mensagem:`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é uma assistente de uma clínica médica que escreve mensagens de follow-up no WhatsApp. Seja natural, amigável e profissional.',
          },
          {
            role: 'user',
            content: fullPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    })

    if (!response.ok) {
      throw new Error('Erro ao gerar mensagem com IA')
    }

    const data = await response.json()
    return data.choices[0].message.content.trim()
  } catch (error) {
    console.error('Erro ao chamar OpenAI:', error)
    throw new Error('Erro ao gerar mensagem com IA')
  }
}

/**
 * Busca histórico de follow-ups de um lead
 */
export async function getFollowUpHistory(leadTelefone: string): Promise<any[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('follow_ups')
    .select('*')
    .eq('lead_telefone', leadTelefone)
    .order('criado_em', { ascending: false })

  if (error) {
    console.error('Erro ao buscar histórico de follow-ups:', error)
    return []
  }

  return data || []
}

/**
 * Cancela um follow-up
 */
export async function cancelFollowUp(followUpId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('follow_ups')
    .update({
      status: 'cancelado',
    })
    .eq('id', followUpId)
    .eq('status', 'pendente') // Só pode cancelar se estiver pendente

  if (error) {
    console.error('Erro ao cancelar follow-up:', error)
    throw new Error('Erro ao cancelar follow-up')
  }
}

/**
 * Busca templates de follow-up
 */
export async function getFollowUpTemplates(
  tipoFollowUp?: string,
  tipoTemplate?: 'fixo' | 'ia'
): Promise<any[]> {
  const supabase = createClient()

  let query = supabase
    .from('follow_up_templates')
    .select('*')
    .eq('ativa', true)
    .order('nome')

  if (tipoFollowUp) {
    query = query.eq('tipo_follow_up', tipoFollowUp)
  }

  if (tipoTemplate) {
    query = query.eq('tipo_template', tipoTemplate)
  }

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar templates:', error)
    return []
  }

  return data || []
}

/**
 * Substitui variáveis em um template
 */
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template

  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    result = result.replace(regex, variables[key])
  })

  return result
}

