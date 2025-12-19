import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/client'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!OPENAI_API_KEY) {
  console.warn('OpenAI API Key não configurada')
}

/**
 * Análise completa do contexto do lead para geração de mensagem personalizada
 */
export interface LeadContextAnalysis {
  contexto: string
  historicoConversas: string[]
  interesses: string[]
  objeções: string[]
  ultimaInteracao?: string
  diasSemResposta?: number
  etapa?: string
  origem?: string
  metadata?: Record<string, any>
}

/**
 * Resultado da análise de sentimento e tom
 */
export interface SentimentAnalysis {
  tom: 'formal' | 'informal' | 'neutro'
  urgencia: 'alta' | 'media' | 'baixa'
  preocupacoes: string[]
  pontosInteresse: string[]
  abordagemSugerida: 'amigavel' | 'profissional' | 'urgente' | 'neutro'
}

/**
 * Sugestão de timing otimizado
 */
export interface TimingSuggestion {
  hora: string // HH:MM
  diaSemana?: string
  justificativa: string
  probabilidadeResposta: number // 0-100
}

/**
 * Classificação de resposta do lead
 */
export interface ResponseClassification {
  tipo: 'positivo' | 'negativo' | 'neutro' | 'objeção' | 'pergunta'
  tipoObjeção?: 'preco' | 'tempo' | 'medo' | 'duvida' | 'outro'
  sentimento: number // -1 a 1
  confianca: number // 0 a 1
  informacoesExtraidas?: Record<string, any>
  acaoSugerida?: string
}

/**
 * Previsão de performance
 */
export interface PerformancePrediction {
  probabilidadeResposta: number // 0-100
  tempoEstimadoResposta?: string // em horas
  probabilidadeConversao: number // 0-100
  tipoFollowUpRecomendado?: string
  justificativa: string
}

/**
 * Busca contexto completo do lead
 */
export async function getLeadFullContext(leadId: string): Promise<LeadContextAnalysis | null> {
  const supabase = await createAdminClient()

  try {
    // Buscar dados do lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return null
    }

    // Buscar histórico de conversas via WhatsApp
    const { data: messages, error: messagesError } = await supabase
      .from('whatsapp_messages')
      .select('message, from_me, created_at')
      .eq('phone', lead.telefone)
      .order('created_at', { ascending: false })
      .limit(20)

    const historicoConversas: string[] = []
    if (!messagesError && messages) {
      messages.forEach((msg) => {
        historicoConversas.push(`${msg.from_me ? 'Você' : 'Lead'}: ${msg.message}`)
      })
    }

    // Buscar interesses da tabela interesses
    const { data: interessesData, error: interessesError } = await supabase
      .from('interesses')
      .select('interesse')
      .eq('lead_id', leadId)

    const interesses: string[] = interessesData?.map((i) => i.interesse) || []

    // Identificar objeções do contexto
    const objeções: string[] = []
    if (lead.contexto) {
      const contextoLower = lead.contexto.toLowerCase()
      if (contextoLower.includes('preço') || contextoLower.includes('caro')) {
        objeções.push('preço')
      }
      if (contextoLower.includes('tempo') || contextoLower.includes('horário')) {
        objeções.push('tempo')
      }
      if (contextoLower.includes('medo') || contextoLower.includes('receio')) {
        objeções.push('medo')
      }
    }

    // Calcular dias sem resposta
    let diasSemResposta: number | undefined
    if (lead.data_ultima_msg) {
      const ultimaMsg = new Date(lead.data_ultima_msg)
      const hoje = new Date()
      diasSemResposta = Math.floor((hoje.getTime() - ultimaMsg.getTime()) / (1000 * 60 * 60 * 24))
    }

    return {
      contexto: lead.contexto || '',
      historicoConversas: historicoConversas.reverse(), // Mais antiga primeiro
      interesses,
      objeções,
      ultimaInteracao: lead.data_ultima_msg,
      diasSemResposta,
      etapa: lead.etapa,
      origem: lead.origem,
      metadata: {},
    }
  } catch (error) {
    console.error('Erro ao buscar contexto do lead:', error)
    return null
  }
}

/**
 * Analisa sentimento e tom do contexto do lead
 */
export async function analyzeLeadSentiment(context: LeadContextAnalysis): Promise<SentimentAnalysis> {
  if (!OPENAI_API_KEY) {
    return {
      tom: 'neutro',
      urgencia: 'media',
      preocupacoes: [],
      pontosInteresse: context.interesses,
      abordagemSugerida: 'neutro',
    }
  }

  try {
    const historicoTexto = context.historicoConversas.slice(-5).join('\n')
    
    const prompt = `
Analise o contexto de comunicação com o lead:

CONTEXTO:
${context.contexto}

HISTÓRICO (últimas 5 mensagens):
${historicoTexto || 'Sem histórico'}

INTERESSES:
${context.interesses.join(', ') || 'Nenhum interesse registrado'}

OBJEÇÕES IDENTIFICADAS:
${context.objeções.join(', ') || 'Nenhuma objeção'}

ANÁLISE NECESSÁRIA:
1. Identifique o TOM da conversa (formal/informal/neutro)
2. Identifique o nível de URGÊNCIA (alta/média/baixa)
3. Liste PRINCIPAIS PREOCUPAÇÕES
4. Liste PONTOS DE INTERESSE principais
5. Sugira ABORDAGEM (amigável/profissional/urgente/neutro)

Retorne APENAS um JSON válido no formato:
{
  "tom": "formal|informal|neutro",
  "urgencia": "alta|media|baixa",
  "preocupacoes": ["preocupação1", "preocupação2"],
  "pontosInteresse": ["interesse1", "interesse2"],
  "abordagemSugerida": "amigavel|profissional|urgente|neutro"
}
`

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
            content: 'Você é um analista de comunicação especializado em identificar tom, sentimento e padrões em conversas. Retorne APENAS JSON válido, sem explicações.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      throw new Error('Erro ao analisar sentimento')
    }

    const data = await response.json()
    const content = data.choices[0].message.content.trim()
    
    // Extrair JSON da resposta
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    throw new Error('Resposta inválida da IA')
  } catch (error) {
    console.error('Erro ao analisar sentimento:', error)
    return {
      tom: 'neutro',
      urgencia: 'media',
      preocupacoes: context.objeções,
      pontosInteresse: context.interesses,
      abordagemSugerida: 'neutro',
    }
  }
}

/**
 * Gera mensagem personalizada avançada usando análise completa
 */
export async function generateAdvancedAIMessage(params: {
  leadContext: LeadContextAnalysis
  tipoFollowUp: string
  promptPersonalizado?: string
  sentimentAnalysis?: SentimentAnalysis
  templateId?: string
}): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API Key não configurada')
  }

  const sentiment = params.sentimentAnalysis || await analyzeLeadSentiment(params.leadContext)

  const historicoTexto = params.leadContext.historicoConversas.slice(-3).join('\n')
  
  // Tentar buscar template de IA do banco
  let basePrompt = ''
  try {
    const { getFollowUpTemplates } = await import('./follow-up-service')
    
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
      reativacao: `Crie uma mensagem curta e amigável para reativar um lead que parou de responder. Seja natural e humanizada.`,
      promocao: `Crie uma mensagem curta sobre uma promoção ou oferta especial. Seja atraente mas não insistente.`,
      lembrete_consulta: `Crie uma mensagem curta lembrando sobre uma consulta agendada. Seja cordial e profissional.`,
      orcamento: `Crie uma mensagem curta perguntando se ficou alguma dúvida sobre o orçamento enviado. Seja prestativo.`,
      pos_consulta: `Crie uma mensagem curta de follow-up pós-consulta/procedimento. Demonstre cuidado e disponibilidade.`,
      confirmacao: `Crie uma mensagem curta pedindo confirmação de presença para uma consulta. Seja direto mas cordial.`,
      reagendamento: `Crie uma mensagem curta oferecendo reagendar uma consulta. Seja compreensivo e flexível.`,
      oferta: `Crie uma mensagem curta com uma oferta personalizada. Seja atraente mas profissional.`,
    }
    basePrompt = promptsByType[params.tipoFollowUp] || promptsByType.reativacao
  }

  let contextInfo = `
DADOS DO LEAD:
Nome: ${params.leadContext.contexto.split(' ')[0] || 'Cliente'}
Interesses: ${params.leadContext.interesses.join(', ') || 'Não especificado'}
Objeções anteriores: ${params.leadContext.objeções.join(', ') || 'Nenhuma'}
Dias sem resposta: ${params.leadContext.diasSemResposta || 'N/A'}

CONTEXTO DA CONVERSA:
${params.leadContext.contexto}

HISTÓRICO RECENTE:
${historicoTexto || 'Sem histórico'}

ANÁLISE DE SENTIMENTO:
- Tom identificado: ${sentiment.tom}
- Urgência: ${sentiment.urgencia}
- Preocupações: ${sentiment.preocupacoes.join(', ') || 'Nenhuma'}
- Pontos de interesse: ${sentiment.pontosInteresse.join(', ') || 'Nenhum'}
- Abordagem sugerida: ${sentiment.abordagemSugerida}
`

  let fullPrompt = `${basePrompt}

${contextInfo}`

  if (params.promptPersonalizado) {
    fullPrompt += `\n\nInstruções adicionais: ${params.promptPersonalizado}`
  }

  fullPrompt += `

INSTRUÇÕES PARA A MENSAGEM:
- Use o mesmo TOM identificado (${sentiment.tom})
- Se houver preocupações, aborde-as de forma natural
- Destaque os pontos de interesse identificados
- Use a abordagem sugerida: ${sentiment.abordagemSugerida}
- Seja natural e humanizada, como WhatsApp
- Máximo 3 linhas
- Use o nome do lead naturalmente
- Não use markdown ou formatação especial
- Use 1-2 emojis apenas se apropriado ao tom
- ${sentiment.preocupacoes.length > 0 ? `Aborde a preocupação sobre: ${sentiment.preocupacoes[0]}` : ''}

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
 * Classifica resposta do lead automaticamente
 */
export async function classifyLeadResponse(message: string): Promise<ResponseClassification> {
  if (!OPENAI_API_KEY) {
    // Fallback básico
    const msgLower = message.toLowerCase()
    if (msgLower.includes('sim') || msgLower.includes('quero') || msgLower.includes('ok')) {
      return {
        tipo: 'positivo',
        sentimento: 0.7,
        confianca: 0.6,
      }
    }
    if (msgLower.includes('não') || msgLower.includes('não quero') || msgLower.includes('desculpa')) {
      return {
        tipo: 'negativo',
        sentimento: -0.5,
        confianca: 0.6,
      }
    }
    return {
      tipo: 'neutro',
      sentimento: 0,
      confianca: 0.5,
    }
  }

  try {
    const prompt = `
Analise a seguinte resposta do lead e classifique:

RESPOSTA: "${message}"

Classifique como:
- positivo: Demonstra interesse, quer agendar, pergunta sobre procedimento, confirma presença
- negativo: Recusou, não tem interesse, pediu para parar, cancelou
- neutro: Agradeceu, disse que vai pensar, não deu resposta clara, apenas respondeu educadamente
- objeção: Tem preocupação específica (preço, tempo, medo, dúvida)
- pergunta: Quer mais informações, tem dúvidas específicas

Se for objeção, identifique o tipo:
- preco: Preocupação com valor, muito caro
- tempo: Falta de tempo/disponibilidade
- medo: Preocupação com procedimento, medo
- duvida: Dúvidas sobre o procedimento
- outro: Outras objeções

ANÁLISE:
1. Classifique o tipo de resposta
2. Identifique sentimento (-1 a 1, onde -1 é muito negativo e 1 é muito positivo)
3. Nível de confiança na classificação (0 a 1)
4. Se for objeção, identifique o tipo
5. Se possível, extraia informações (datas, procedimentos, valores mencionados)

Retorne APENAS um JSON válido:
{
  "tipo": "positivo|negativo|neutro|objeção|pergunta",
  "tipoObjeção": "preco|tempo|medo|duvida|outro" (apenas se tipo for "objeção"),
  "sentimento": -1 a 1,
  "confianca": 0 a 1,
  "informacoesExtraidas": {},
  "acaoSugerida": "string com ação sugerida"
}
`

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
            content: 'Você é um analista especializado em classificar respostas de clientes. Retorne APENAS JSON válido, sem explicações.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      throw new Error('Erro ao classificar resposta')
    }

    const data = await response.json()
    const content = data.choices[0].message.content.trim()
    
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    throw new Error('Resposta inválida da IA')
  } catch (error) {
    console.error('Erro ao classificar resposta:', error)
    return {
      tipo: 'neutro',
      sentimento: 0,
      confianca: 0.5,
    }
  }
}

/**
 * Sugere melhor horário para envio baseado em histórico
 */
export async function suggestOptimalTiming(leadId: string): Promise<TimingSuggestion> {
  const supabase = await createAdminClient()

  try {
    // Buscar lead
    const { data: lead } = await supabase
      .from('leads')
      .select('telefone, data_ultima_msg')
      .eq('id', leadId)
      .single()

    if (!lead) {
      return {
        hora: '14:00',
        justificativa: 'Horário padrão recomendado (tarde)',
        probabilidadeResposta: 50,
      }
    }

    // Buscar histórico de mensagens e respostas
    const { data: messages } = await supabase
      .from('whatsapp_messages')
      .select('message, from_me, created_at')
      .eq('phone', lead.telefone)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!messages || messages.length === 0) {
      return {
        hora: '14:00',
        justificativa: 'Horário padrão recomendado para novos leads',
        probabilidadeResposta: 50,
      }
    }

    // Analisar padrões de resposta
    const horariosResposta: number[] = []
    messages.forEach((msg) => {
      if (!msg.from_me && msg.created_at) {
        const hora = new Date(msg.created_at).getHours()
        horariosResposta.push(hora)
      }
    })

    // Encontrar horário mais comum
    const horarioMaisFrequente = horariosResposta.length > 0
      ? horariosResposta.reduce((a, b, _, arr) =>
          arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
        )
      : 14

    // Ajustar para horário comercial (9h-18h)
    const horaRecomendada = Math.max(9, Math.min(18, horarioMaisFrequente))
    const horaFormatada = `${horaRecomendada.toString().padStart(2, '0')}:00`

    // Calcular probabilidade baseada em padrão
    const totalRespostas = horariosResposta.length
    const respostasNoHorario = horariosResposta.filter(h => h === horarioMaisFrequente).length
    const probabilidade = totalRespostas > 0
      ? Math.round((respostasNoHorario / totalRespostas) * 100)
      : 50

    return {
      hora: horaFormatada,
      justificativa: `Baseado no histórico, o lead responde mais frequentemente às ${horaFormatada}h`,
      probabilidadeResposta: Math.max(50, probabilidade),
    }
  } catch (error) {
    console.error('Erro ao sugerir timing:', error)
    return {
      hora: '14:00',
      justificativa: 'Horário padrão recomendado',
      probabilidadeResposta: 50,
    }
  }
}

/**
 * Previne taxa de resposta e probabilidade de conversão
 */
export async function predictFollowUpPerformance(
  leadId: string,
  tipoFollowUp: string
): Promise<PerformancePrediction> {
  const supabase = await createAdminClient()

  try {
    const context = await getLeadFullContext(leadId)
    if (!context) {
      return {
        probabilidadeResposta: 50,
        probabilidadeConversao: 30,
        justificativa: 'Dados insuficientes para análise',
      }
    }

    // Buscar histórico de follow-ups similares
    const { data: similarFollowUps } = await supabase
      .from('follow_ups')
      .select('status, resposta_recebida, tipo_follow_up')
      .eq('tipo_follow_up', tipoFollowUp)
      .limit(100)

    let taxaRespostaHistorica = 0.5
    if (similarFollowUps && similarFollowUps.length > 0) {
      const enviados = similarFollowUps.filter(f => f.status === 'enviado').length
      const comResposta = similarFollowUps.filter(f => f.resposta_recebida === true).length
      taxaRespostaHistorica = enviados > 0 ? comResposta / enviados : 0.5
    }

    // Ajustar baseado em contexto
    let multiplicador = 1.0
    if (context.diasSemResposta) {
      if (context.diasSemResposta > 30) multiplicador *= 0.7
      else if (context.diasSemResposta < 7) multiplicador *= 1.2
    }
    if (context.interesses.length > 0) multiplicador *= 1.1
    if (context.objeções.length > 0) multiplicador *= 0.8

    const probabilidadeResposta = Math.min(95, Math.round(taxaRespostaHistorica * multiplicador * 100))
    const probabilidadeConversao = Math.min(80, Math.round(probabilidadeResposta * 0.6))

    return {
      probabilidadeResposta,
      tempoEstimadoResposta: '4-8 horas',
      probabilidadeConversao,
      justificativa: `Baseado em histórico similar (${Math.round(taxaRespostaHistorica * 100)}% taxa de resposta) e contexto do lead`,
    }
  } catch (error) {
    console.error('Erro ao prever performance:', error)
    return {
      probabilidadeResposta: 50,
      probabilidadeConversao: 30,
      justificativa: 'Erro ao analisar dados',
    }
  }
}

/**
 * Extrai informações da mensagem do lead
 */
export async function extractLeadInformation(message: string): Promise<Record<string, any>> {
  if (!OPENAI_API_KEY) {
    return {}
  }

  try {
    const prompt = `
Analise a seguinte mensagem e extraia informações relevantes:

MENSAGEM: "${message}"

Extraia:
- data_consulta: Data mencionada (formato YYYY-MM-DD)
- hora_consulta: Hora mencionada
- procedimento: Procedimento mencionado
- valor: Valores monetários mencionados
- objeção_preco: Se mencionou preço caro/alto
- objeção_tempo: Se mencionou falta de tempo
- interesse_confirmado: Se confirmou interesse
- necessidade_urgencia: Se demonstrou urgência

Retorne APENAS um JSON válido com as informações extraídas (apenas campos que foram identificados):
{
  "data_consulta": "2024-12-15" (se encontrado),
  "hora_consulta": "14:00" (se encontrado),
  "procedimento": "Botox" (se encontrado),
  ...
}
`

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
            content: 'Você é um assistente que extrai informações estruturadas de mensagens. Retorne APENAS JSON válido, sem explicações.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    })

    if (!response.ok) {
      return {}
    }

    const data = await response.json()
    const content = data.choices[0].message.content.trim()
    
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    return {}
  } catch (error) {
    console.error('Erro ao extrair informações:', error)
    return {}
  }
}

