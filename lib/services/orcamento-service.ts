import { createClient } from '@/lib/supabase/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from './whatsapp-service'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Procedimento {
  nome: string
  descricao?: string
  valor: number
}

interface CreateOrcamentoParams {
  leadId?: string
  leadTelefone: string
  leadNome?: string
  procedimentos: Procedimento[]
  valores: {
    subtotal: number
    desconto?: number
    total: number
  }
  validadeAte?: Date
  observacoes?: string
}

interface SendOrcamentoParams {
  orcamentoId: string
  mensagemPersonalizada?: string
}

/**
 * Cria um orçamento
 */
export async function createOrcamento(params: CreateOrcamentoParams, userId?: string): Promise<{ id: string }> {
  const supabase = userId ? await createAdminClient() : createClient()

  const { data, error } = await supabase
    .from('orcamentos')
    .insert({
      lead_id: params.leadId,
      lead_telefone: params.leadTelefone,
      lead_nome: params.leadNome,
      procedimentos: params.procedimentos,
      valores: params.valores,
      valor_total: params.valores.total,
      validade_ate: params.validadeAte?.toISOString().split('T')[0],
      status: 'pendente',
      observacoes: params.observacoes,
      criado_por: userId,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Erro ao criar orçamento:', error)
    throw new Error('Erro ao criar orçamento')
  }

  return { id: data.id }
}

/**
 * Envia orçamento via WhatsApp
 */
export async function sendOrcamento(params: SendOrcamentoParams): Promise<void> {
  const supabase = await createAdminClient()

  // Buscar orçamento
  const { data: orcamento, error: fetchError } = await supabase
    .from('orcamentos')
    .select('*')
    .eq('id', params.orcamentoId)
    .single()

  if (fetchError || !orcamento) {
    throw new Error('Orçamento não encontrado')
  }

  // Montar mensagem
  let mensagem = params.mensagemPersonalizada || `Olá ${orcamento.lead_nome}! 😊\n\n`
  mensagem += `Segue o orçamento dos procedimentos:\n\n`
  
  const procedimentos = orcamento.procedimentos as Procedimento[]
  procedimentos.forEach((proc, index) => {
    mensagem += `${index + 1}. ${proc.nome} - R$ ${proc.valor.toFixed(2)}\n`
    if (proc.descricao) {
      mensagem += `   ${proc.descricao}\n`
    }
  })

  const valores = orcamento.valores as any
  mensagem += `\n`
  if (valores.desconto && valores.desconto > 0) {
    mensagem += `Subtotal: R$ ${valores.subtotal.toFixed(2)}\n`
    mensagem += `Desconto: R$ ${valores.desconto.toFixed(2)}\n`
  }
  mensagem += `*Total: R$ ${orcamento.valor_total.toFixed(2)}*\n\n`

  if (orcamento.validade_ate) {
    mensagem += `Orçamento válido até: ${format(new Date(orcamento.validade_ate), 'dd/MM/yyyy', { locale: require('date-fns/locale').ptBR })}\n\n`
  }

  mensagem += `Ficou com alguma dúvida? Estou aqui para te ajudar! 💙`

  try {
    // Enviar via WhatsApp
    await sendWhatsAppMessage({
      phone: orcamento.lead_telefone,
      message: mensagem,
    })

    // Atualizar status
    const { error: updateError } = await supabase
      .from('orcamentos')
      .update({
        status: 'enviado',
        enviado_em: new Date().toISOString(),
      })
      .eq('id', params.orcamentoId)

    if (updateError) {
      console.error('Erro ao atualizar status do orçamento:', updateError)
    }
  } catch (error: any) {
    console.error('Erro ao enviar orçamento:', error)
    throw error
  }
}

/**
 * Atualiza status do orçamento
 */
export async function updateOrcamentoStatus(
  orcamentoId: string,
  status: 'aceito' | 'recusado' | 'expirado'
): Promise<void> {
  const supabase = createClient()

  const updateData: any = {
    status,
  }

  if (status === 'aceito' || status === 'recusado') {
    updateData.respondido_em = new Date().toISOString()
  }

  const { error } = await supabase
    .from('orcamentos')
    .update(updateData)
    .eq('id', orcamentoId)

  if (error) {
    console.error('Erro ao atualizar status do orçamento:', error)
    throw new Error('Erro ao atualizar status do orçamento')
  }
}

/**
 * Busca orçamentos de um lead
 */
export async function getLeadOrcamentos(leadTelefone: string): Promise<any[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('orcamentos')
    .select('*')
    .eq('lead_telefone', leadTelefone)
    .order('criado_em', { ascending: false })

  if (error) {
    console.error('Erro ao buscar orçamentos:', error)
    return []
  }

  return data || []
}

/**
 * Busca procedimentos disponíveis
 */
export async function getProcedimentos(): Promise<any[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('procedures')
    .select('*')
    .eq('active', true)
    .order('name')

  if (error) {
    console.error('Erro ao buscar procedimentos:', error)
    return []
  }

  return data || []
}

