import { createAdminClient } from '@/lib/supabase/admin'
import { createBulkFollowUp } from './follow-up-service'
import { getLeadFullContext } from './follow-up-ai-service'

/**
 * Sistema de automações inteligentes de follow-up
 * Detecta eventos e cria follow-ups automaticamente
 */

interface AutomationRule {
  trigger: 'no_response' | 'quote_sent' | 'appointment_scheduled' | 'appointment_completed' | 'quote_expired'
  days?: number // Dias até disparar (para no_response)
  tipoFollowUp: string
  tipoMensagem: 'ia' | 'fixo'
  templateId?: string
  promptPersonalizado?: string
}

/**
 * Verifica leads sem resposta e cria follow-ups de reativação
 */
export async function checkLeadsWithoutResponse(days: number = 7) {
  const supabase = await createAdminClient()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  try {
    // Buscar leads sem resposta há X dias
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, telefone, nome, data_ultima_msg')
      .not('telefone', 'is', null)
      .or(`data_ultima_msg.lt.${cutoffDate.toISOString()},data_ultima_msg.is.null`)
      .eq('status', 'em_andamento')
      .limit(100)

    if (error) {
      console.error('Erro ao buscar leads sem resposta:', error)
      return
    }

    if (!leads || leads.length === 0) {
      return
    }

    // Verificar se já existe follow-up de reativação pendente para estes leads
    const leadIds = leads.map(l => l.id)
    const { data: existingFollowUps } = await supabase
      .from('follow_ups')
      .select('lead_id')
      .in('lead_id', leadIds)
      .eq('tipo_follow_up', 'reativacao')
      .eq('status', 'pendente')

    const existingLeadIds = new Set(existingFollowUps?.map(f => f.lead_id) || [])

    // Filtrar leads que já têm follow-up pendente
    const leadsToFollowUp = leads.filter(l => !existingLeadIds.has(l.id))

    if (leadsToFollowUp.length === 0) {
      return
    }

    // Criar follow-ups de reativação
    await createBulkFollowUp(
      {
        leads: leadsToFollowUp.map(lead => ({
          leadId: lead.id,
          leadTelefone: lead.telefone!,
          leadNome: lead.nome || undefined,
        })),
        tipoFollowUp: 'reativacao',
        tipoMensagem: 'ia',
        mensagem: '', // Será gerado pela IA
        usarContexto: true,
        recorrente: false,
      },
      undefined // System user
    )

    console.log(`Criados ${leadsToFollowUp.length} follow-ups de reativação`)
  } catch (error) {
    console.error('Erro ao verificar leads sem resposta:', error)
  }
}

/**
 * Cria follow-up para orçamentos não respondidos
 */
export async function checkUnansweredQuotes(days: number = 3) {
  const supabase = await createAdminClient()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  try {
    // Buscar orçamentos enviados sem resposta
    const { data: orcamentos, error } = await supabase
      .from('orcamentos')
      .select('id, lead_id, lead_telefone, lead_nome')
      .eq('status', 'enviado')
      .lt('enviado_em', cutoffDate.toISOString())
      .not('lead_id', 'is', null)
      .limit(50)

    if (error || !orcamentos || orcamentos.length === 0) {
      return
    }

    // Verificar se já existe follow-up pendente
    const leadIds = orcamentos.map(o => o.lead_id).filter(Boolean) as string[]
    const { data: existingFollowUps } = await supabase
      .from('follow_ups')
      .select('lead_id')
      .in('lead_id', leadIds)
      .eq('tipo_follow_up', 'orcamento')
      .eq('status', 'pendente')

    const existingLeadIds = new Set(existingFollowUps?.map(f => f.lead_id) || [])

    const orcamentosToFollowUp = orcamentos.filter(
      o => o.lead_id && !existingLeadIds.has(o.lead_id)
    )

    if (orcamentosToFollowUp.length === 0) {
      return
    }

    // Criar follow-ups
    await createBulkFollowUp(
      {
        leads: orcamentosToFollowUp.map(o => ({
          leadId: o.lead_id!,
          leadTelefone: o.lead_telefone,
          leadNome: o.lead_nome || undefined,
        })),
        tipoFollowUp: 'orcamento',
        tipoMensagem: 'ia',
        mensagem: '',
        usarContexto: true,
        metadata: {
          orcamento_id: orcamentosToFollowUp.map(o => o.id),
        },
        recorrente: false,
      },
      undefined
    )

    console.log(`Criados ${orcamentosToFollowUp.length} follow-ups de orçamento não respondido`)
  } catch (error) {
    console.error('Erro ao verificar orçamentos não respondidos:', error)
  }
}

/**
 * Cria lembretes para consultas agendadas
 */
export async function scheduleAppointmentReminders() {
  const supabase = await createAdminClient()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  const dayAfterTomorrow = new Date(tomorrow)
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)

  try {
    // Buscar agendamentos para amanhã
    const { data: agendamentos, error } = await supabase
      .from('agendamentos')
      .select('id, lead_id, paciente_nome, paciente_telefone, data_inicio, tipo')
      .gte('appointment_date', tomorrow.toISOString().split('T')[0])
      .lt('appointment_date', dayAfterTomorrow.toISOString().split('T')[0])
      .eq('status', 'agendado')
      .not('lead_id', 'is', null)
      .limit(100)

    if (error || !agendamentos || agendamentos.length === 0) {
      return
    }

    // Verificar se já existe lembrete
    const leadIds = agendamentos.map(a => a.lead_id).filter(Boolean) as string[]
    const { data: existingFollowUps } = await supabase
      .from('follow_ups')
      .select('lead_id')
      .in('lead_id', leadIds)
      .eq('tipo_follow_up', 'lembrete_consulta')
      .gte('agendado_para', tomorrow.toISOString())
      .lt('agendado_para', dayAfterTomorrow.toISOString())

    const existingLeadIds = new Set(existingFollowUps?.map(f => f.lead_id) || [])

    const agendamentosToRemind = agendamentos.filter(
      a => a.lead_id && !existingLeadIds.has(a.lead_id)
    )

    if (agendamentosToRemind.length === 0) {
      return
    }

    // Criar lembretes agendados para hoje às 18h
    const hoje18h = new Date()
    hoje18h.setHours(18, 0, 0, 0)

    await createBulkFollowUp(
      {
        leads: agendamentosToRemind.map(a => ({
          leadId: a.lead_id!,
          leadTelefone: a.paciente_telefone || '',
          leadNome: a.paciente_nome || undefined,
        })),
        tipoFollowUp: 'lembrete_consulta',
        tipoMensagem: 'ia',
        mensagem: '',
        usarContexto: true,
        metadata: {
          agendamento_id: agendamentosToRemind.map(a => a.id),
          data: agendamentosToRemind[0].data_inicio,
          procedimento: agendamentosToRemind[0].tipo,
        },
        agendadoPara: hoje18h.toISOString(),
        recorrente: false,
      },
      undefined
    )

    console.log(`Criados ${agendamentosToRemind.length} lembretes de consulta`)
  } catch (error) {
    console.error('Erro ao criar lembretes de consulta:', error)
  }
}

/**
 * Executa todas as automações
 */
export async function runAllAutomations() {
  console.log('Executando automações de follow-up...')
  
  await Promise.all([
    checkLeadsWithoutResponse(7), // Leads sem resposta há 7 dias
    checkLeadsWithoutResponse(14), // Leads sem resposta há 14 dias
    checkUnansweredQuotes(3), // Orçamentos não respondidos há 3 dias
    scheduleAppointmentReminders(), // Lembretes para amanhã
  ])

  console.log('Automações concluídas')
}

