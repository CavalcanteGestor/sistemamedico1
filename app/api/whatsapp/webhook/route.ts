import { NextRequest, NextResponse } from 'next/server'
import { isHumanSupportActive, updateLeadLastMessage } from '@/lib/services/whatsapp-service'

/**
 * Webhook para receber mensagens da Evolution API
 * Este endpoint recebe notificações quando uma mensagem é recebida
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Verificar estrutura do webhook da Evolution API
    // A estrutura pode variar, então vamos tratar diferentes formatos
    const event = body.event || body.type || 'message'
    const messageData = body.data || body.message || body

    // Extrair informações da mensagem
    let phone: string = ''
    let message: string = ''
    let messageId: string = ''
    let timestamp: string = ''
    let from: string = ''
    let mediaUrl: string | undefined
    let mediaType: string | undefined

    // Formato Evolution API comum
    if (messageData.key) {
      messageId = messageData.key.id || ''
      from = messageData.key.remoteJid || messageData.key.from || ''
      phone = from.replace('@s.whatsapp.net', '') + '@s.whatsapp.net'
    }

    if (messageData.message) {
      // Mensagem de texto
      if (messageData.message.conversation) {
        message = messageData.message.conversation
      } else if (messageData.message.extendedTextMessage?.text) {
        message = messageData.message.extendedTextMessage.text
      }
      // Mensagem com mídia
      else if (messageData.message.imageMessage) {
        message = messageData.message.imageMessage.caption || ''
        mediaUrl = messageData.message.imageMessage.url || messageData.message.imageMessage.directPath
        mediaType = 'image'
      } else if (messageData.message.videoMessage) {
        message = messageData.message.videoMessage.caption || ''
        mediaUrl = messageData.message.videoMessage.url || messageData.message.videoMessage.directPath
        mediaType = 'video'
      } else if (messageData.message.audioMessage) {
        mediaUrl = messageData.message.audioMessage.url || messageData.message.audioMessage.directPath
        mediaType = 'audio'
      } else if (messageData.message.documentMessage) {
        message = messageData.message.documentMessage.caption || messageData.message.documentMessage.fileName || ''
        mediaUrl = messageData.message.documentMessage.url || messageData.message.documentMessage.directPath
        mediaType = 'document'
      }
    }

    timestamp = messageData.messageTimestamp
      ? new Date(messageData.messageTimestamp * 1000).toISOString()
      : new Date().toISOString()

    // Se não conseguiu extrair telefone, tentar outros campos
    if (!phone && messageData.from) {
      phone = messageData.from.includes('@') ? messageData.from : messageData.from + '@s.whatsapp.net'
    }

    if (!phone || !message) {
      // Se não tem mensagem de texto mas tem mídia, ainda processar
      if (!phone || (!message && !mediaUrl)) {
        console.warn('Mensagem sem telefone ou conteúdo:', body)
        return NextResponse.json({ success: true, message: 'Mensagem ignorada' })
      }
    }

    // Verificar se atendimento humano está ativo
    const humanSupportActive = await isHumanSupportActive(phone)

    // NÃO salvar mensagem no banco - usar apenas Evolution API
    // A mensagem já está salva na Evolution API

    // Atualizar lead com última mensagem (via serviço)
    const { updateLeadLastMessage } = await import('@/lib/services/whatsapp-service')
    await updateLeadLastMessage(phone, message || '')

    // Verificar se é mensagem recebida (não enviada por nós)
    // Evolution API: key.fromMe indica se foi enviada por nós
    const isFromMe = messageData.key?.fromMe || messageData.fromMe || false
    
    // Se for mensagem recebida (não enviada por nós), analisar automaticamente
    if (!isFromMe && from && !from.includes('@g.us') && message) {
      try {
        // Buscar lead por telefone
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const supabase = createAdminClient()
        
        const { data: lead } = await supabase
          .from('leads')
          .select('id')
          .eq('telefone', phone)
          .single()

        if (lead) {
          // Buscar follow-up pendente mais recente
          const { data: followUp } = await supabase
            .from('follow_ups')
            .select('id')
            .eq('lead_id', lead.id)
            .eq('status', 'enviado')
            .eq('resposta_recebida', false)
            .order('enviado_em', { ascending: false })
            .limit(1)
            .single()

          if (followUp) {
            // Analisar resposta automaticamente
            const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/follow-up/analyze-response`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message,
                leadId: lead.id,
                leadTelefone: phone,
                followUpId: followUp.id,
              }),
            })

            // Não esperar resposta - processar em background
            response.json().catch((err) => {
              // Silenciar erro de background processing
            })
          }
        }
      } catch (error) {
        // Não bloquear o webhook se análise falhar
        console.error('Erro ao analisar resposta automaticamente:', error)
      }
    }

    // Se atendimento humano NÃO está ativo, a IA vai processar
    // (a IA vai verificar a tabela atendimento_humano antes de responder)
    if (!humanSupportActive) {
      // A IA será processada pelo n8n que monitora os leads
      // As mensagens são buscadas diretamente da Evolution API
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao processar webhook WhatsApp:', error)
    // Retornar 200 para evitar retentativas desnecessárias
    return NextResponse.json({ error: error.message }, { status: 200 })
  }
}

