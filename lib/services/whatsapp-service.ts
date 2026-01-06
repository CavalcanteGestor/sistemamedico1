import { createClient } from '@/lib/supabase/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || process.env.NEXT_PUBLIC_EVOLUTION_API_URL
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || process.env.NEXT_PUBLIC_EVOLUTION_API_KEY
const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'default'

interface SendMessageParams {
  phone: string
  message?: string
  mediaUrl?: string
  mediaType?: 'image' | 'video' | 'audio' | 'document'
  messageId?: string
  timestamp?: string
  type?: 'sent' | 'received'
  remetente?: string
  destinatario?: string
}

interface MessageResponse {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Envia mensagem via Evolution API
 */
export async function sendWhatsAppMessage(params: SendMessageParams): Promise<MessageResponse> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.error('Evolution API não configurada:', {
      hasUrl: !!EVOLUTION_API_URL,
      hasKey: !!EVOLUTION_API_KEY,
    })
    throw new Error('Evolution API não configurada. Verifique as variáveis de ambiente EVOLUTION_API_URL e EVOLUTION_API_KEY.')
  }

  try {
    // Normalizar número de telefone
    let phoneNumber = params.phone.replace('@s.whatsapp.net', '').trim()
    
    // Garantir que o número tenha apenas dígitos
    phoneNumber = phoneNumber.replace(/\D/g, '')
    
    // Se o número não começar com código do país e parecer ser brasileiro (começa com área)
    // e tiver 10 ou 11 dígitos, adicionar código do Brasil (55)
    if (phoneNumber.length >= 10 && phoneNumber.length <= 11 && !phoneNumber.startsWith('55')) {
      phoneNumber = `55${phoneNumber}`
    }
    
    const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`

    const payload: any = {
      number: phoneNumber,
      text: params.message || '',
    }
    
    logger.debug('Enviando mensagem via Evolution API', {
      url,
      phoneNumber,
      hasText: !!params.message,
      instance: EVOLUTION_INSTANCE_NAME,
    })

    if (params.mediaUrl) {
      // Para mídia, usar endpoint diferente
      const mediaUrl = `${EVOLUTION_API_URL}/message/sendMedia/${EVOLUTION_INSTANCE_NAME}`
      const mediaPayload: any = {
        number: phoneNumber,
        mediatype: params.mediaType || 'image',
        media: params.mediaUrl,
      }

      if (params.message) {
        mediaPayload.caption = params.message
      }

      const response = await fetch(mediaUrl, {
        method: 'POST',
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mediaPayload),
      })

      if (!response.ok) {
        let errorMessage = `Erro ao enviar mídia (Status: ${response.status})`
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorData.error || errorMessage
          console.error('Erro da Evolution API (mídia):', errorData)
        } catch (parseError) {
          const textError = await response.text().catch(() => 'Erro desconhecido')
          errorMessage = `Erro ao enviar mídia: ${textError}`
          console.error('Erro ao parsear resposta da Evolution API (mídia):', textError)
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      return { success: true, messageId: data.key?.id }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      let errorMessage = `Erro ao enviar mensagem (Status: ${response.status})`
      let errorDetails: any = {}
      try {
        const errorData = await response.json()
        errorDetails = errorData
        // Tentar extrair mensagem de erro mais específica
        if (errorData.response?.message) {
          if (Array.isArray(errorData.response.message)) {
            errorMessage = errorData.response.message.map((m: any) => {
              if (typeof m === 'object' && m.message) return m.message
              return String(m)
            }).join(', ')
          } else if (typeof errorData.response.message === 'string') {
            errorMessage = errorData.response.message
          } else {
            errorMessage = JSON.stringify(errorData.response.message)
          }
        } else {
          errorMessage = errorData.message || errorData.error || errorMessage
        }
        logger.error('Erro da Evolution API', undefined, {
          status: response.status,
          error: errorData,
          payload,
        })
      } catch (parseError) {
        const textError = await response.text().catch(() => 'Erro desconhecido')
        errorMessage = `Erro ao enviar mensagem: ${textError}`
        logger.error('Erro ao parsear resposta da Evolution API', undefined, {
          status: response.status,
          text: textError,
          payload,
        })
      }
      throw new Error(errorMessage)
    }

    const data = await response.json()
    return { success: true, messageId: data.key?.id }
  } catch (error: any) {
    logger.error('Erro ao enviar mensagem WhatsApp', error, {
      phone: params.phone,
      hasMessage: !!params.message,
    })
    throw error
  }
}

/**
 * Salva mensagem no banco de dados
 */
export async function saveWhatsAppMessage(params: SendMessageParams): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('whatsapp_messages')
    .insert({
      telefone: params.phone,
      mensagem: params.message,
      tipo: params.type,
      remetente: params.remetente || null,
      destinatario: params.destinatario || null,
      message_id: params.messageId || null,
      timestamp: params.timestamp ? new Date(params.timestamp).toISOString() : new Date().toISOString(),
      media_url: params.mediaUrl || null,
      media_type: params.mediaType || null,
      read: params.type === 'sent',
    })

  if (error) {
    console.error('Erro ao salvar mensagem WhatsApp:', error)
    throw error
  }
}

/**
 * Atualiza a última mensagem do lead
 */
export async function updateLeadLastMessage(phone: string, message: string): Promise<void> {
  const supabase = createAdminClient()

  const { data: leads } = await supabase
    .from('leads')
    .select('id')
    .ilike('telefone', `%${phone.replace('@s.whatsapp.net', '')}%`)
    .limit(1)

  if (leads && leads.length > 0) {
    await supabase
      .from('leads')
      .update({
        mensagem: message,
        data_ultima_msg: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', leads[0].id)
  }
}

/**
 * Ativa atendimento humano para um telefone (IA não responde)
 */
export async function activateHumanSupport(phone: string, userId?: string): Promise<void> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('atendimento_humano')
    .upsert({
      telefone: phone,
      ativo: true,
      responsavel_id: userId || null,
      data_ativacao: new Date().toISOString(),
      data_desativacao: null,
    }, {
      onConflict: 'telefone',
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao ativar atendimento humano:', error)
    throw error
  }
}

/**
 * Desativa atendimento humano para um telefone (IA volta a responder)
 */
export async function deactivateHumanSupport(phone: string): Promise<void> {
  const supabase = createClient()

  const { data: existing } = await supabase
    .from('atendimento_humano')
    .select('*')
    .eq('telefone', phone)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('atendimento_humano')
      .update({
        ativo: false,
        data_desativacao: new Date().toISOString(),
      })
      .eq('telefone', phone)

    if (error) {
      console.error('Erro ao desativar atendimento humano:', error)
      throw error
    }
  }
}

/**
 * Verifica se atendimento humano está ativo para um telefone
 */
export async function isHumanSupportActive(phone: string): Promise<boolean> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('atendimento_humano')
    .select('ativo')
    .eq('telefone', phone)
    .eq('ativo', true)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    console.error('Erro ao verificar atendimento humano:', error)
    return false
  }

  return !!data?.ativo
}

/**
 * Obtém status da conexão WhatsApp (Evolution API)
 */
export async function getWhatsAppStatus(): Promise<{ connected: boolean; qrcode?: string; instance?: any }> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { connected: false }
  }

  try {
    const url = `${EVOLUTION_API_URL}/instance/fetchInstances`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    })

    if (!response.ok) {
      return { connected: false }
    }

    const instances = await response.json()
    
    let instance = null
    
    if (Array.isArray(instances)) {
      instance = instances.find((inst: any) => {
        const instanceName = inst.instance?.instanceName || inst.instanceName || inst.name
        return instanceName === EVOLUTION_INSTANCE_NAME
      })
    } else if (instances.instanceName || instances.name) {
      instance = instances
    }

    if (!instance) {
      return { connected: false }
    }

    const instanceData = instance.instance || instance
    const status = instanceData?.status || instance?.status
    
    const connected = status === 'open' || status === 'close' || status === 'connected'

    return {
      connected,
      instance: instanceData || instance,
    }
  } catch (error) {
    console.error('Erro ao verificar status WhatsApp:', error)
    return { connected: false }
  }
}

/**
 * Obtém QR Code para conectar WhatsApp
 */
export async function getQRCode(): Promise<string | null> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return null
  }

  try {
    const url = `${EVOLUTION_API_URL}/instance/connect/${EVOLUTION_INSTANCE_NAME}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.qrcode?.base64 || data.qr?.base64 || null
  } catch (error) {
    console.error('Erro ao obter QR Code:', error)
    return null
  }
}

/**
 * Envia mensagem e salva no banco + ativa atendimento humano
 */
export async function sendMessageAsStaff(params: SendMessageParams & { userId?: string; skipHumanSupport?: boolean }): Promise<MessageResponse> {
  const response = await sendWhatsAppMessage(params)

  // Só ativa atendimento humano se não for mensagem de teste
  if (params.userId && !params.skipHumanSupport) {
    await activateHumanSupport(params.phone, params.userId)
  }

  if (params.message) {
    await updateLeadLastMessage(params.phone, params.message)
  }

  return response
}

/**
 * Busca mensagens de uma conversa - VERSÃO SIMPLIFICADA E ROBUSTA
 */
export async function getConversationMessages(phone: string, limit = 50, offset = 0) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    throw new Error('Evolution API não configurada')
  }

  try {
    // Normalizar telefone
    const normalizePhoneNumber = (p: string): string => {
      if (!p) return ''
      return p.replace('@s.whatsapp.net', '').replace('@lid', '').replace(/@[^\s]+/g, '').trim()
    }
    
    const targetPhoneNormalized = normalizePhoneNumber(phone)
    const targetPhoneClean = phone.replace('@s.whatsapp.net', '').trim()
    const targetPhoneFull = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`

    // Buscar nome do contato (para filtrar por nome também)
    const supabase = createClient()
    let contactName: string | null = null
    
    try {
      // Buscar lead com múltiplas tentativas de correspondência
      const { data: leads } = await supabase
        .from('leads')
        .select('nome, telefone')
        .or(`telefone.eq.${targetPhoneNormalized},telefone.ilike.%${targetPhoneNormalized}%,telefone.ilike.%${targetPhoneClean}%`)
      
      // Tentar encontrar correspondência exata ou parcial
      const lead = leads?.find(l => {
        if (!l.telefone) return false
        const leadPhone = normalizePhoneNumber(l.telefone)
        return leadPhone === targetPhoneNormalized || 
               targetPhoneNormalized.includes(leadPhone) ||
               leadPhone.includes(targetPhoneNormalized.slice(-10)) // Últimos 10 dígitos
      }) || leads?.[0] // Se não encontrar exato, pegar o primeiro
      
      if (lead?.nome) {
        contactName = lead.nome.trim()
        console.log(`[getConversationMessages] Lead encontrado: ${contactName} (telefone: ${lead.telefone})`)
      }
    } catch (error) {
      console.error('[getConversationMessages] Erro ao buscar lead:', error)
      // Não crítico, continuar sem nome
    }

    // ESTRATÉGIA SIMPLES: Buscar TODAS as mensagens e filtrar localmente
    let allMessages: any[] = []
    
    try {
      const url = `${EVOLUTION_API_URL}/chat/findMessages/${EVOLUTION_INSTANCE_NAME}`
      
      // Buscar apenas mensagens recentes (últimas páginas primeiro)
      // Limitar a 5 páginas para não buscar mensagens muito antigas
      let page = 1
      let hasMore = true
      const maxPages = 5 // Limitar para não buscar mensagens muito antigas
      
      while (hasMore && page <= maxPages) {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'apikey': EVOLUTION_API_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            limit: 1000,
            page,
          }),
        })

        if (!response.ok) break

        const data = await response.json()
        
        if (data.messages?.records && Array.isArray(data.messages.records)) {
          allMessages = [...allMessages, ...data.messages.records]
          
          const totalPages = data.messages.pages || 1
          hasMore = page < totalPages
          page++
        } else {
          hasMore = false
        }
      }
      
      // Se não encontrou mensagens suficientes nas primeiras 5 páginas,
      // filtrar por data para pegar apenas mensagens recentes
      const thirtyDaysAgo = Date.now() / 1000 - (30 * 24 * 60 * 60)
      allMessages = allMessages.filter((msg: any) => {
        const msgTimestamp = msg.messageTimestamp || msg.timestamp || 0
        return msgTimestamp >= thirtyDaysAgo
      })
    } catch (error) {
      console.error('[getConversationMessages] Erro ao buscar mensagens:', error)
      return []
    }

    if (allMessages.length === 0) {
      console.log(`[getConversationMessages] Nenhuma mensagem encontrada para ${phone}`)
      return []
    }

    console.log(`[getConversationMessages] Total de mensagens encontradas: ${allMessages.length}, contactName: ${contactName || 'N/A'}, targetPhone: ${targetPhoneNormalized}`)

    // FILTRO ULTRA SIMPLIFICADO E PERMISSIVO
    // Estratégia: Se temos contato conhecido, aceitar TODAS as mensagens relacionadas
    const filteredMessages = allMessages.filter((msg: any) => {
      const key = msg.key || {}
      const fromMe = Boolean(key.fromMe ?? msg.fromMe ?? false)
      
      // REGRA 1: Mensagens ENVIADAS - verificar se destinatário corresponde
      if (fromMe) {
        let recipientPhone = key.remoteJidAlt || msg.remoteJidAlt || key.remoteJid || msg.remoteJid || msg.to || key.participant || ''
        
        if (!recipientPhone) return false
        
        const normalizedRecipient = normalizePhoneNumber(recipientPhone)
        
        // Aceitar se destinatário corresponde ao telefone da conversa
        if (normalizedRecipient === targetPhoneNormalized) return true
        if (recipientPhone === targetPhoneFull || recipientPhone === targetPhoneClean) return true
        
        // Verificar últimos 10 dígitos
        if (normalizedRecipient && targetPhoneNormalized) {
          const last10Recipient = normalizedRecipient.slice(-10)
          const last10Target = targetPhoneNormalized.slice(-10)
          if (last10Recipient === last10Target && last10Recipient.length === 10) return true
        }
        
        return false
      }
      
      // REGRA 2: Mensagens RECEBIDAS - estratégia muito mais permissiva
      // Extrair telefone do remetente de múltiplas fontes
      let senderPhone = key.remoteJidAlt || msg.remoteJidAlt || key.remoteJid || msg.remoteJid || msg.from || key.from || key.participant || msg.participant || ''
      
      // Se temos nome do contato, aceitar TODAS as mensagens recebidas desse nome
      if (contactName) {
        const msgName = msg.pushName || msg.notifyName || msg.name || ''
        const msgNameNormalized = msgName ? msgName.toLowerCase().trim() : ''
        const contactNameNormalized = contactName.toLowerCase().trim()
        
        // Verificar correspondência exata ou parcial do nome
        if (msgNameNormalized && (
          msgNameNormalized === contactNameNormalized ||
          msgNameNormalized.includes(contactNameNormalized) ||
          contactNameNormalized.includes(msgNameNormalized) ||
          msgNameNormalized.split(' ')[0] === contactNameNormalized.split(' ')[0] // Primeiro nome
        )) {
          return true // ACEITAR TODAS as mensagens recebidas com nome correspondente
        }
      }
      
      // Verificar se o telefone do remetente corresponde
      if (!senderPhone || senderPhone.includes('@g.us') || senderPhone.includes('@broadcast')) {
        // Se não temos telefone válido mas temos contato conhecido, aceitar mesmo assim
        // (pode ser @lid ou formato desconhecido)
        if (contactName) {
          return true // ACEITAR mensagens recebidas se temos contato conhecido
        }
        return false
      }
      
      const normalizedSender = normalizePhoneNumber(senderPhone)
      
      // Verificar correspondência de telefone
      if (normalizedSender === targetPhoneNormalized) return true
      if (senderPhone === targetPhoneFull || senderPhone === targetPhoneClean) return true
      
      // Verificar últimos 10 dígitos
      if (normalizedSender && targetPhoneNormalized) {
        const last10Sender = normalizedSender.slice(-10)
        const last10Target = targetPhoneNormalized.slice(-10)
        if (last10Sender === last10Target && last10Sender.length === 10) return true
      }
      
      // Verificar participant (pode ter o número real quando remoteJid é @lid)
      const participant = key.participant || msg.participant || ''
      if (participant && !participant.includes('@g.us') && !participant.includes('@broadcast')) {
        const normalizedParticipant = normalizePhoneNumber(participant)
        if (normalizedParticipant === targetPhoneNormalized) return true
        
        // Verificar últimos 10 dígitos do participant também
        if (normalizedParticipant && targetPhoneNormalized) {
          const last10Participant = normalizedParticipant.slice(-10)
          const last10Target = targetPhoneNormalized.slice(-10)
          if (last10Participant === last10Target && last10Participant.length === 10) return true
        }
      }
      
      // ÚLTIMA CHANCE: Se é mensagem recebida, aceitar se:
      // 1. Temos contato conhecido (aceitar todas)
      // 2. OU se não temos telefone válido mas é mensagem recebida (pode ser @lid)
      // 3. OU se o número parcialmente corresponde
      if (contactName) {
        // Temos contato conhecido - aceitar todas as mensagens recebidas
        return true
      }
      
      // Se não temos telefone válido (é @lid ou grupo), aceitar mensagens recebidas de qualquer forma
      // (pois pode ser do mesmo contato mas com ID interno diferente)
      if (!senderPhone || senderPhone.includes('@lid') || senderPhone.includes('@g.us')) {
        return true // ACEITAR mensagens recebidas com @lid ou sem telefone claro
      }
      
      return false
    })

    console.log(`[getConversationMessages] Mensagens filtradas: ${filteredMessages.length} (de ${allMessages.length} total)`)

    // Converter para formato esperado
    const convertedMessages = filteredMessages.map((msg: any) => {
      const key = msg.key || {}
      const fromMe = Boolean(key.fromMe ?? msg.fromMe ?? false)
      
      // Extrair conteúdo
      const messageContent = msg.message?.conversation || 
                           msg.message?.extendedTextMessage?.text ||
                           msg.message?.imageMessage?.caption ||
                           msg.message?.videoMessage?.caption ||
                           msg.message?.documentMessage?.caption ||
                           msg.message?.documentMessage?.fileName ||
                           msg.message?.audioMessage?.caption ||
                           msg.body ||
                           ''
      
      const mediaUrl = msg.message?.imageMessage?.url || 
                      msg.message?.videoMessage?.url ||
                      msg.message?.audioMessage?.url ||
                      msg.message?.documentMessage?.url ||
                      null
      
      const mediaType = msg.message?.imageMessage ? 'image' :
                       msg.message?.videoMessage ? 'video' :
                       msg.message?.audioMessage ? 'audio' :
                       msg.message?.documentMessage ? 'document' :
                       null
      
      // Timestamp
      let timestamp = new Date().toISOString()
      if (msg.messageTimestamp) {
        const ts = typeof msg.messageTimestamp === 'number' 
          ? (msg.messageTimestamp > 1e12 ? msg.messageTimestamp : msg.messageTimestamp * 1000)
          : parseInt(String(msg.messageTimestamp)) * 1000
        timestamp = new Date(ts).toISOString()
      } else if (msg.timestamp) {
        timestamp = new Date(msg.timestamp).toISOString()
      }
      
      return {
        id: key.id || msg.id || `msg-${Date.now()}-${Math.random()}`,
        telefone: targetPhoneFull, // SEMPRE usar o telefone da conversa
        mensagem: messageContent || (mediaUrl ? '[Mídia]' : ''),
        tipo: fromMe ? 'sent' : 'received',
        remetente: fromMe ? 'system' : targetPhoneFull,
        destinatario: fromMe ? targetPhoneFull : 'system',
        message_id: key.id || null,
        timestamp,
        created_at: timestamp,
        media_url: mediaUrl,
        media_type: mediaType,
        read: fromMe || msg.status === 'read' || msg.status === 'delivered',
      }
    })

    // Ordenar por timestamp (mais RECENTES primeiro)
    convertedMessages.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })

    // Filtrar apenas mensagens dos últimos 90 dias (evitar mensagens muito antigas)
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000)
    const recentMessages = convertedMessages.filter(msg => {
      const msgTime = new Date(msg.timestamp).getTime()
      return msgTime >= ninetyDaysAgo
    })

    // Aplicar limite e offset (pegar as mais recentes primeiro)
    // offset=0 pega as 50 mais recentes, offset=50 pega as próximas 50, etc.
    return recentMessages.slice(offset, offset + limit)
  } catch (error: any) {
    console.error('[getConversationMessages] Erro:', error)
    throw error
  }
}

/**
 * Marca mensagens como lidas
 */
export async function markMessagesAsRead(phone: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('whatsapp_messages')
    .update({ read: true })
    .eq('telefone', phone)
    .eq('tipo', 'received')
    .eq('read', false)

  if (error) {
    console.error('Erro ao marcar mensagens como lidas:', error)
  }
}

/**
 * Extrai chats únicos de um array de mensagens da Evolution API
 */
function extractChatsFromMessages(messages: any[]): any[] {
  const normalizePhone = (p: string): string => {
    if (!p) return ''
    return p
      .replace('@s.whatsapp.net', '')
      .replace('@lid', '')
      .replace('@c.us', '')
      .replace('@g.us', '')
      .replace('@broadcast', '')
      .trim()
      .replace(/@[^\s]+/g, '')
      .trim()
  }
  
  if (!Array.isArray(messages) || messages.length === 0) {
    return []
  }
  
  const chatMap = new Map<string, any>()
  const phoneToNameMap = new Map<string, { name: string; timestamp: number }>()
  
  messages.forEach((msg: any) => {
    try {
      const key = msg.key || {}
      const fromMe = Boolean(key.fromMe ?? msg.fromMe ?? false)
      
      // Extrair número do contato
      let contactPhone = ''
      if (fromMe) {
        contactPhone = key.remoteJidAlt || msg.remoteJidAlt || key.remoteJid || msg.remoteJid || msg.to || ''
      } else {
        contactPhone = key.remoteJidAlt || msg.remoteJidAlt || key.remoteJid || msg.remoteJid || msg.from || key.from || key.participant || ''
      }
      
      if (!contactPhone || contactPhone.includes('@g.us') || contactPhone.includes('@broadcast')) {
        return
      }
      
      const normalizedPhone = normalizePhone(contactPhone)
      if (!normalizedPhone) return
      
      const standardPhone = `${normalizedPhone}@s.whatsapp.net`
      
      // Coletar nome
      const contactName = msg.pushName || msg.notifyName || msg.name || ''
      if (contactName && contactName.toLowerCase() !== 'você' && contactName.toLowerCase() !== 'you') {
        const msgTimestamp = msg.messageTimestamp || Date.now() / 1000
        const existing = phoneToNameMap.get(normalizedPhone)
        
        if (!existing || (!fromMe && existing.timestamp < msgTimestamp)) {
          phoneToNameMap.set(normalizedPhone, { name: contactName, timestamp: msgTimestamp })
        }
      }
      
      // Criar ou atualizar chat
      const msgTimestamp = msg.messageTimestamp || Date.now() / 1000
      const existingChat = chatMap.get(normalizedPhone)
      
      if (!existingChat || msgTimestamp > existingChat.lastMessageTimestamp) {
        const name = phoneToNameMap.get(normalizedPhone)?.name || normalizedPhone
        
        chatMap.set(normalizedPhone, {
          id: standardPhone,
          jid: standardPhone,
          name,
          lastMessage: msg.message?.conversation || msg.message?.extendedTextMessage?.text || '[Mídia]' || '',
          lastMessageTimestamp: msgTimestamp,
          unreadCount: fromMe ? 0 : 1,
        })
      }
    } catch (error) {
      // Ignorar erro
    }
  })
  
  // Converter para array e ordenar por última mensagem (mais recentes primeiro)
  return Array.from(chatMap.values()).sort((a, b) => {
    return (b.lastMessageTimestamp || 0) - (a.lastMessageTimestamp || 0)
  })
}

/**
 * Busca todas as conversas (chats) da Evolution API
 */
export async function getAllChats(): Promise<any[]> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.error('[getAllChats] Evolution API não configurada:', {
      hasUrl: !!EVOLUTION_API_URL,
      hasKey: !!EVOLUTION_API_KEY,
      url: EVOLUTION_API_URL,
    })
    throw new Error('Evolution API não configurada. Verifique as variáveis de ambiente EVOLUTION_API_URL e EVOLUTION_API_KEY')
  }

  if (!EVOLUTION_INSTANCE_NAME) {
    console.error('[getAllChats] Nome da instância não configurado')
    throw new Error('Nome da instância não configurado. Verifique a variável de ambiente EVOLUTION_INSTANCE_NAME')
  }

  try {
    // Tentar primeiro o endpoint de chats diretamente (mais eficiente)
    let directChats: any[] = []
    
    try {
      const chatsUrl = `${EVOLUTION_API_URL}/chat/fetchChats/${EVOLUTION_INSTANCE_NAME}`
      console.log('[getAllChats] Tentando buscar chats diretamente:', chatsUrl)
      
      const chatsResponse = await fetch(chatsUrl, {
        method: 'GET',
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
      })

      if (chatsResponse.ok) {
        const chatsData = await chatsResponse.json()
        console.log('[getAllChats] Resposta do endpoint de chats:', chatsData)
        
        if (Array.isArray(chatsData)) {
          directChats = chatsData
        } else if (chatsData.chats && Array.isArray(chatsData.chats)) {
          directChats = chatsData.chats
        } else if (chatsData.data && Array.isArray(chatsData.data)) {
          directChats = chatsData.data
        }
        
        if (directChats.length > 0) {
          console.log(`[getAllChats] ✅ Encontrados ${directChats.length} chats diretamente`)
          // Processar e retornar
          const processedChats = directChats.map((chat: any) => ({
            id: chat.id || chat.jid || chat.remoteJid || '',
            jid: chat.jid || chat.id || chat.remoteJid || '',
            name: chat.name || chat.pushName || chat.notifyName || '',
            lastMessage: chat.lastMessage || null,
            lastMessageTimestamp: chat.lastMessageTimestamp || chat.conversationTimestamp || 0,
            unreadCount: chat.unreadCount || 0,
          }))
          
          // Buscar leads para enriquecer nomes
          let leadsMap: Record<string, any> = {}
          
          try {
            // Usar createAdminClient para acesso no servidor
            const supabaseAdmin = createAdminClient()
            const { data: leads } = await supabaseAdmin
              .from('leads')
              .select('nome, telefone')
            
            if (leads) {
              leads.forEach((lead: any) => {
                if (lead.telefone && lead.nome) {
                  const normalized = lead.telefone.replace('@s.whatsapp.net', '').replace(/@[^\s]+/g, '').trim()
                  leadsMap[normalized] = lead.nome
                }
              })
            }
          } catch (error) {
            // Não crítico - apenas log
            console.warn('[getAllChats] Erro ao buscar leads (não crítico):', error)
          }
          
          // Enriquecer com nomes dos leads
          return processedChats.map((chat: any) => {
            const phoneNormalized = (chat.id || chat.jid || '').replace('@s.whatsapp.net', '').replace(/@[^\s]+/g, '').trim()
            const leadName = leadsMap[phoneNormalized]
            
            if (leadName && (!chat.name || chat.name === phoneNormalized)) {
              return { ...chat, name: leadName }
            }
            
            return chat
          })
        }
      } else {
        console.warn('[getAllChats] Endpoint de chats retornou erro:', chatsResponse.status, chatsResponse.statusText)
      }
    } catch (chatsError: any) {
      console.warn('[getAllChats] Erro ao buscar chats diretamente, tentando método alternativo:', chatsError.message)
    }

    // Fallback: buscar mensagens e extrair conversas
    console.log('[getAllChats] Usando método alternativo: buscar mensagens e extrair conversas')
    const url = `${EVOLUTION_API_URL}/chat/findMessages/${EVOLUTION_INSTANCE_NAME}`
    console.log('[getAllChats] URL:', url)
    
    let allMessages: any[] = []
    let page = 1
    let hasMore = true
    const maxPages = 20
    
    while (hasMore && page <= maxPages) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          limit: 1000,
          page,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[getAllChats] Erro na página ${page}:`, response.status, response.statusText, errorText)
        break
      }

      const data = await response.json()
      console.log(`[getAllChats] Página ${page} - Total de registros:`, data.messages?.records?.length || 0)
      
      if (data.messages?.records && Array.isArray(data.messages.records)) {
        allMessages = [...allMessages, ...data.messages.records]
        
        const totalPages = data.messages.pages || 1
        hasMore = page < totalPages
        page++
      } else {
        console.warn('[getAllChats] Formato de resposta inesperado:', data)
        hasMore = false
      }
    }
    
    console.log(`[getAllChats] Total de mensagens coletadas: ${allMessages.length}`)

    if (allMessages.length === 0) {
      console.warn('[getAllChats] ⚠️ Nenhuma mensagem encontrada na Evolution API')
      console.warn('[getAllChats] Verifique:')
      console.warn('  1. Se o WhatsApp está conectado na Evolution API')
      console.warn('  2. Se o nome da instância está correto:', EVOLUTION_INSTANCE_NAME)
      console.warn('  3. Se a URL da Evolution API está correta:', EVOLUTION_API_URL)
      return []
    }

    const extractedChats = extractChatsFromMessages(allMessages)
    console.log(`[getAllChats] ✅ Extraídos ${extractedChats.length} chats de ${allMessages.length} mensagens`)
    
    // Buscar leads para enriquecer nomes
    const leadsMap: Record<string, any> = {}
    
    try {
      // Usar createAdminClient para acesso no servidor
      const supabaseAdmin = createAdminClient()
      const { data: leads } = await supabaseAdmin
        .from('leads')
        .select('nome, telefone')
      
      if (leads) {
        leads.forEach((lead: any) => {
          if (lead.telefone && lead.nome) {
            const normalized = lead.telefone.replace('@s.whatsapp.net', '').replace(/@[^\s]+/g, '').trim()
            leadsMap[normalized] = lead.nome
          }
        })
      }
    } catch (error) {
      // Não crítico - apenas log
      console.warn('[getAllChats] Erro ao buscar leads (não crítico):', error)
    }
    
    const enrichedChats = extractedChats.map((chat: any) => {
      const phoneNormalized = (chat.id || '').replace('@s.whatsapp.net', '').replace(/@[^\s]+/g, '').trim()
      const leadName = leadsMap[phoneNormalized]
      
      if (leadName && (!chat.name || chat.name === phoneNormalized)) {
        return { ...chat, name: leadName }
      }
      
      return chat
    })
    
    console.log(`[getAllChats] ✅ Retornando ${enrichedChats.length} chats enriquecidos`)
    return enrichedChats
  } catch (error: any) {
    console.error('[getAllChats] ❌ Erro completo:', error)
    console.error('[getAllChats] Stack:', error.stack)
    throw new Error(`Erro ao buscar conversas: ${error.message || 'Erro desconhecido'}`)
  }
}

/**
 * Busca foto de perfil de um contato da Evolution API
 */
export async function getProfilePicture(phone: string): Promise<string | null> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return null
  }

  try {
    // Normalizar telefone
    const normalizedPhone = phone.replace('@s.whatsapp.net', '').replace(/@[^\s]+/g, '').trim()
    
    // Tentar diferentes endpoints da Evolution API
    const endpoints = [
      `${EVOLUTION_API_URL}/chat/fetchProfilePictureUrl/${EVOLUTION_INSTANCE_NAME}`,
      `${EVOLUTION_API_URL}/profile/picture/${EVOLUTION_INSTANCE_NAME}`,
    ]
    
    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'apikey': EVOLUTION_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            number: normalizedPhone,
          }),
          // Timeout de 5 segundos
          signal: AbortSignal.timeout(5000),
        })

        if (response.ok) {
          const data = await response.json()
          const avatarUrl = data.url || data.profilePictureUrl || data.picture || null
          if (avatarUrl) {
            return avatarUrl
          }
        }
      } catch (endpointError: any) {
        // Se não for erro de timeout, continuar tentando próximo endpoint
        if (!endpointError.name || endpointError.name !== 'TimeoutError') {
          continue
        }
      }
    }
    
    return null
  } catch (error) {
    // Erro silencioso - não é crítico se não conseguir buscar foto
    return null
  }
}
