'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface Conversation {
  telefone: string
  nome: string
  ultima_mensagem: string
  data_ultima_msg: string
  unread_count: number
  etapa?: string
  _originalUnread?: number // Temporário, para fallback
  avatar?: string // URL da foto de perfil
}

interface ConversationListProps {
  selectedPhone?: string
  onSelectConversation: (phone: string, name?: string, avatar?: string) => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
}

export function ConversationList({
  selectedPhone,
  onSelectConversation,
  searchQuery = '',
  onSearchChange,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false) // Começar como false - carregar tudo de uma vez
  const [currentPage, setCurrentPage] = useState(1)
  const [allConversationsLoaded, setAllConversationsLoaded] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  
  // Cache de fotos de perfil para evitar requisições repetidas
  const avatarCacheRef = useRef<Record<string, { url: string; timestamp: number }>>({})
  const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 horas
  
  // Função para normalizar telefone (consistente em todo o código)
  // IMPORTANTE: Deve ser idêntica à função no extractChatsFromMessages
  const normalizePhoneForComparison = (p: string): string => {
    if (!p) return ''
    // Remover todos os sufixos possíveis e espaços
    return p
      .replace('@s.whatsapp.net', '')
      .replace('@lid', '')
      .replace('@c.us', '')
      .replace('@g.us', '')
      .replace('@broadcast', '')
      .trim()
      // Remover qualquer outro sufixo que comece com @
      .replace(/@[^\s]+/g, '')
      .trim()
  }
  
  // Função para padronizar telefone (sempre usar formato @s.whatsapp.net)
  const standardizePhone = (p: string): string => {
    const normalized = normalizePhoneForComparison(p)
    return `${normalized}@s.whatsapp.net`
  }

  useEffect(() => {
    loadConversations()
    const unsubscribe = subscribeToConversations()
    
    return () => {
      if (unsubscribe) unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  // Debounce na busca para evitar requisições excessivas
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    // Limpar timeout anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // Aguardar 300ms antes de buscar (debounce)
    searchTimeoutRef.current = setTimeout(() => {
      if (!loading) {
        loadConversations()
      }
    }, 300)
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  const loadConversations = async (retryCount = 0, page = 1, append = false) => {
    const MAX_RETRIES = 3
    const RETRY_DELAY = 1000 // 1 segundo
    
    try {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      // Buscar conversas da Evolution API com retry logic (OTIMIZADO - timeout menor)
      let response: Response | null = null
      let result: any = null
      
      try {
        response = await fetch(`/api/whatsapp/chats?page=${page}`, {
          signal: AbortSignal.timeout(15000), // Timeout de 15 segundos (reduzido para falhar rápido)
        })
        result = await response.json()
      } catch (fetchError: any) {
        // Se for erro de timeout ou rede, tentar novamente
        if (retryCount < MAX_RETRIES && (fetchError.name === 'TimeoutError' || fetchError.name === 'TypeError')) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)))
          return loadConversations(retryCount + 1)
        }
        throw fetchError
      }

      if (!result.success) {
        // Se for erro temporário, tentar novamente
        if (retryCount < MAX_RETRIES && result.error?.includes('timeout')) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)))
          return loadConversations(retryCount + 1)
        }
        
        // Log detalhado do erro
        console.error('[ConversationList] Erro ao buscar conversas:', {
          error: result.error,
          details: result.details,
          status: response?.status,
        })
        
        throw new Error(result.error || 'Erro ao buscar conversas')
      }

      const chats = result.data || []
      
      // Log para debug
      if (chats.length === 0 && result.message) {
        console.warn('[ConversationList] Nenhuma conversa encontrada:', result.message)
        if (result.debug) {
          console.warn('[ConversationList] Debug info:', result.debug)
        }
      }

      // Se não houver conversas, retornar lista vazia
      if (chats.length === 0) {
        // Nenhuma conversa encontrada
        setConversations([])
        setLoading(false)
        return
      }

      // Log removido para produção

      // OTIMIZAÇÃO: Buscar leads apenas uma vez e cachear (não a cada página)
      // Cache de leads para evitar múltiplas queries
      const leadsCacheKey = 'whatsapp_leads_cache'
      const cachedLeads = sessionStorage.getItem(leadsCacheKey)
      const leadsCacheTimestamp = cachedLeads ? JSON.parse(cachedLeads).timestamp : 0
      const LEADS_CACHE_DURATION = 5 * 60 * 1000 // 5 minutos
      
      let leadNames: Record<string, string> = {} // telefone -> nome
      let leadPhones: Record<string, string> = {} // nome normalizado -> telefone (número correto)
      let leadEtapas: Record<string, string> = {}
      
      // Usar cache se ainda válido
      if (cachedLeads && Date.now() - leadsCacheTimestamp < LEADS_CACHE_DURATION) {
        const cached = JSON.parse(cachedLeads)
        leadNames = cached.leadNames || {}
        leadPhones = cached.leadPhones || {}
        leadEtapas = cached.leadEtapas || {}
      } else {
        // Buscar leads apenas se cache expirou
        try {
          const { data: leadsData, error: leadsError } = await supabase
            .from('leads')
            .select('telefone, nome, etapa')

          if (leadsError) {
            console.warn('Erro ao buscar leads (não crítico):', leadsError)
          } else if (leadsData) {
            leadsData.forEach((lead) => {
              if (lead.telefone && lead.nome) {
                const normalizedPhone = normalizePhoneForComparison(lead.telefone)
                const leadName = lead.nome.trim()
                
                // Mapear telefone -> nome (todas as variações)
                leadNames[lead.telefone] = leadName
                leadNames[normalizedPhone] = leadName
                
                // Mapear nome normalizado -> telefone (número CORRETO do banco)
                const normalizedName = leadName.toLowerCase().trim()
                if (!leadPhones[normalizedName] || normalizedPhone.startsWith('55')) {
                  // Priorizar número brasileiro se houver múltiplos
                  leadPhones[normalizedName] = standardizePhone(normalizedPhone)
                }
                
                if (lead.etapa) {
                  leadEtapas[lead.telefone] = lead.etapa
                  leadEtapas[normalizedPhone] = lead.etapa
                }
              }
            })
            
            // Salvar no cache
            sessionStorage.setItem(leadsCacheKey, JSON.stringify({
              timestamp: Date.now(),
              leadNames,
              leadPhones,
              leadEtapas,
            }))
          }
        } catch (error) {
          console.warn('Erro ao buscar leads (não crítico):', error)
        }
      }
      
      // Usar APENAS dados da Evolution API (como WhatsApp Web)
      const conversationsData: Conversation[] = chats
        .map((chat: any) => {
          const chatId = chat.id || chat.jid || ''
          // Normalizar e padronizar o telefone para garantir consistência
          const normalizedPhone = normalizePhoneForComparison(chatId)
          const phone = standardizePhone(normalizedPhone) // Sempre usar formato padrão
          const phoneOnly = normalizedPhone
          
          // Nome: priorizar lead cadastrado, depois nome do chat da Evolution API
          let chatName = chat.name || chat.pushName || chat.notifyName || ''
          
          // Remover "Você" e outros nomes genéricos
          if (chatName.toLowerCase() === 'você' || chatName.toLowerCase() === 'you' || chatName.trim() === '') {
            chatName = phoneOnly
          }
          
          // Buscar nome do lead usando telefone normalizado (múltiplas variações)
          const nome = leadNames[phone] || 
                       leadNames[chatId] || 
                       leadNames[normalizedPhone] || 
                       (chatName && chatName !== phoneOnly ? chatName : null) || 
                       phoneOnly || 
                       'Sem nome'
          
          // Última mensagem diretamente da Evolution API
          // IMPORTANTE: Tentar buscar mensagens de texto mais recentes primeiro
          let ultima_mensagem = ''
          
          // PRIORIDADE 1: Usar lastMessageText se já vier processado do servidor
          if (chat.lastMessageText && chat.lastMessageText.trim()) {
            const cleanText = chat.lastMessageText.trim()
            if (cleanText && !cleanText.match(/^\[Mídia\]|^📷|^🎥|^🎤|^📄|^😀|^📍|^👤$/i)) {
              ultima_mensagem = cleanText
            }
          }
          
          // PRIORIDADE 2: Se o chat tem lastMessage, tentar extrair texto
          if (!ultima_mensagem && chat.lastMessage) {
            const msg = chat.lastMessage
            // PRIORIZAR TEXTO REAL - tentar todas as formas de texto primeiro
            ultima_mensagem = msg.conversation || 
                             msg.extendedTextMessage?.text ||
                             msg.imageMessage?.caption ||
                             msg.videoMessage?.caption ||
                             msg.audioMessage?.caption ||
                             msg.documentMessage?.caption ||
                             msg.documentMessage?.fileName ||
                             msg.stickerMessage?.caption ||
                             msg.locationMessage?.caption ||
                             msg.contactMessage?.displayName ||
                             msg.contactMessage?.vcard ||
                             msg.buttonsResponseMessage?.selectedButtonId ||
                             msg.listResponseMessage?.singleSelectReply?.selectedRowId ||
                             msg.body ||
                             ''
            
            // Limpar espaços e verificar se é texto válido
            ultima_mensagem = ultima_mensagem.trim()
            
            // Se não encontrou texto válido e é mídia, usar ícone apropriado
            if (!ultima_mensagem || ultima_mensagem === '') {
              if (msg.imageMessage) {
                ultima_mensagem = '📷 Imagem'
              } else if (msg.videoMessage) {
                ultima_mensagem = '🎥 Vídeo'
              } else if (msg.audioMessage) {
                ultima_mensagem = '🎤 Áudio'
              } else if (msg.documentMessage) {
                ultima_mensagem = '📄 Documento'
              } else if (msg.stickerMessage) {
                ultima_mensagem = '😀 Figurinha'
              } else if (msg.locationMessage) {
                ultima_mensagem = '📍 Localização'
              } else if (msg.contactMessage) {
                ultima_mensagem = '👤 Contato'
              } else {
                ultima_mensagem = '[Mídia]'
              }
            }
          }
          
          // Timestamp da última mensagem da Evolution API
          const lastMessageTimestamp = chat.lastMessageTimestamp || 
                                     chat.conversationTimestamp ||
                                     (chat.lastMessage?.messageTimestamp || 0)
          const data_ultima_msg = lastMessageTimestamp 
            ? new Date(lastMessageTimestamp * 1000).toISOString() 
            : new Date().toISOString()

          // Contagem de não lidas: buscar do nosso banco (mensagens recebidas não lidas)
          let unreadCount = 0

          return {
            telefone: phone,
            nome,
            ultima_mensagem: ultima_mensagem.substring(0, 100),
            data_ultima_msg,
            unread_count: unreadCount,
            etapa: leadEtapas[phone] || '',
          }
        })
        .filter((conv: Conversation) => conv.telefone)
        
        // MESCLAGEM INTELIGENTE:
        // 1. Por número normalizado (mesmo número = mesma conversa)
        // 2. Por nome (mesmo nome = mesmo contato, mesmo que números diferentes)
        .reduce((acc: Conversation[], conv: Conversation) => {
          const normalizedPhone = normalizePhoneForComparison(conv.telefone)
          const convName = conv.nome.trim().toLowerCase()
          
          // Verificar se já existe uma conversa com o mesmo número normalizado
          let existingIndex = acc.findIndex(c => normalizePhoneForComparison(c.telefone) === normalizedPhone)
          
          // Se não encontrou por número, verificar por nome (caso de números diferentes para mesmo contato)
          if (existingIndex === -1 && convName && convName.length > 1 && convName !== normalizedPhone) {
            existingIndex = acc.findIndex(c => {
              const cName = c.nome.trim().toLowerCase()
              // Mesmo nome e não é apenas o número
              return cName === convName && cName !== normalizePhoneForComparison(c.telefone)
            })
            
            // Se encontrou por nome, verificar se há lead no banco para confirmar
            if (existingIndex !== -1) {
              const existingConv = acc[existingIndex]
              const existingNormalized = normalizePhoneForComparison(existingConv.telefone)
              
              // Se temos lead no banco, verificar se ambos números pertencem ao mesmo lead
              const leadNameForExisting = leadNames[existingNormalized] || leadNames[existingConv.telefone]
              const leadNameForCurrent = leadNames[normalizedPhone] || leadNames[conv.telefone]
              
              // Se os nomes dos leads são diferentes, não mesclar
              if (leadNameForExisting && leadNameForCurrent && leadNameForExisting.toLowerCase() !== leadNameForCurrent.toLowerCase()) {
                existingIndex = -1
              }
            }
          }
          
          if (existingIndex === -1) {
            // Nova conversa - adicionar
            acc.push(conv)
          } else {
            // Mesclar com conversa existente (mesmo número)
            const existing = acc[existingIndex]
            const existingDate = new Date(existing.data_ultima_msg).getTime()
            const currentDate = new Date(conv.data_ultima_msg).getTime()
            
            // Escolher melhor nome (priorizar nome real sobre número)
            let bestName = existing.nome
            const existingNameIsNumber = existing.nome === normalizePhoneForComparison(existing.telefone)
            const currentNameIsNumber = conv.nome === normalizedPhone
            
            // Priorizar: nome do lead > nome da conversa real > número
            const leadName = leadNames[normalizedPhone] || leadNames[conv.telefone] || leadNames[normalizePhoneForComparison(existing.telefone)]
            if (leadName) {
              bestName = leadName
            } else if (!currentNameIsNumber && existingNameIsNumber) {
              bestName = conv.nome
            } else if (currentNameIsNumber && !existingNameIsNumber) {
              bestName = existing.nome
            } else if (!currentNameIsNumber && !existingNameIsNumber) {
              // Ambos têm nomes reais - usar o mais completo
              bestName = conv.nome.length > existing.nome.length ? conv.nome : existing.nome
            }
            
            // Escolher melhor telefone: priorizar número do banco de dados > número brasileiro (55...) > número existente
            const existingNormalized = normalizePhoneForComparison(existing.telefone)
            let bestPhone = existing.telefone
            
            // PRIORIDADE 1: Se temos nome, buscar o número correto no banco de dados (FONTE DA VERDADE)
            if (leadName) {
              const normalizedLeadName = leadName.toLowerCase().trim()
              const correctPhoneFromDB = leadPhones[normalizedLeadName]
              
              if (correctPhoneFromDB) {
                bestPhone = correctPhoneFromDB
                console.log(`[ConversationList] ✅ Usando número do banco para "${leadName}": ${bestPhone}`)
              } else {
                // Tentar buscar diretamente do cache usando o nome
                const foundPhone = leadPhones[normalizedLeadName]
                if (foundPhone) {
                  bestPhone = foundPhone
                }
              }
            }
            
            // PRIORIDADE 2: Se não temos lead no banco, priorizar número brasileiro (55...)
            if (bestPhone === existing.telefone) {
              if (normalizedPhone.startsWith('55') && !existingNormalized.startsWith('55')) {
                bestPhone = standardizePhone(normalizedPhone)
                // Log removido para produção
              } else if (!normalizedPhone.startsWith('55') && existingNormalized.startsWith('55')) {
                bestPhone = existing.telefone
                // Log removido para produção
              } else if (normalizedPhone.startsWith('55') && existingNormalized.startsWith('55')) {
                // Ambos são brasileiros - usar o mais longo (mais completo)
                bestPhone = normalizedPhone.length >= existingNormalized.length 
                  ? standardizePhone(normalizedPhone)
                  : existing.telefone
              }
            }
            
            // Escolher última mensagem mais recente
            const bestLastMessage = currentDate > existingDate ? conv.ultima_mensagem : existing.ultima_mensagem
            const bestDate = currentDate > existingDate ? conv.data_ultima_msg : existing.data_ultima_msg
            
            // Mesclar - log removido para produção
            
            acc[existingIndex] = {
              telefone: bestPhone, // Usar melhor telefone (lead > brasileiro)
              nome: bestName,
              ultima_mensagem: bestLastMessage,
              data_ultima_msg: bestDate,
              unread_count: Math.max(existing.unread_count || 0, conv.unread_count || 0),
              etapa: existing.etapa || conv.etapa || leadEtapas[normalizedPhone] || leadEtapas[conv.telefone] || leadEtapas[existingNormalized],
            }
          }
          
          return acc
        }, [])
        .sort((a: Conversation, b: Conversation) => {
          // Ordenar por última mensagem (mais recente primeiro)
          return new Date(b.data_ultima_msg).getTime() - new Date(a.data_ultima_msg).getTime()
        })

      // Buscar última mensagem real e contagem de não lidas do banco para todas as conversas
      // Também buscar fotos de perfil da Evolution API
      try {
        const phoneList = conversationsData.map(c => c.telefone).filter(Boolean)
        if (phoneList.length > 0) {
          // Buscar fotos de perfil em paralelo com cache
          // Fazer de forma não-bloqueante para não atrasar o carregamento da lista
          const avatarMap: Record<string, string> = {}
          const now = Date.now()
          
          // Filtrar telefones que precisam buscar foto (não estão em cache ou cache expirado)
          const phonesToFetch = phoneList.slice(0, 5).filter(phone => {
            const normalizedPhone = normalizePhoneForComparison(phone)
            const cached = avatarCacheRef.current[phone] || avatarCacheRef.current[normalizedPhone]
            if (cached && (now - cached.timestamp) < CACHE_DURATION) {
              // Usar foto do cache
              avatarMap[phone] = cached.url
              avatarMap[normalizedPhone] = cached.url
              return false // Não precisa buscar
            }
            return true // Precisa buscar
          })
          
          // Buscar fotos em background (não bloquear renderização)
          Promise.all(
            phonesToFetch.map(async (phone) => {
              try {
                const response = await fetch(`/api/whatsapp/profile-picture?phone=${encodeURIComponent(phone)}`, {
                  signal: AbortSignal.timeout(3000), // Timeout de 3 segundos
                })
                if (response.ok) {
                  const data = await response.json()
                  if (data.avatar) {
                    const normalizedPhone = normalizePhoneForComparison(phone)
                    const avatarUrl = data.avatar
                    
                    // Salvar no cache
                    avatarCacheRef.current[phone] = { url: avatarUrl, timestamp: now }
                    avatarCacheRef.current[normalizedPhone] = { url: avatarUrl, timestamp: now }
                    
                    avatarMap[phone] = avatarUrl
                    avatarMap[normalizedPhone] = avatarUrl
                    
                    // Atualizar estado para re-renderizar com foto
                    setConversations(prev => prev.map(conv => {
                      const convNormalized = normalizePhoneForComparison(conv.telefone)
                      if (convNormalized === normalizedPhone || conv.telefone === phone) {
                        return { ...conv, avatar: avatarUrl }
                      }
                      return conv
                    }))
                  }
                }
              } catch (error) {
                // Ignorar erros silenciosamente - não é crítico
              }
            })
          ).catch(() => {
            // Ignorar erros - não crítico
          })
          
          // Aplicar cache imediatamente para conversas que já têm foto em cache
          conversationsData.forEach(conv => {
            const normalizedPhone = normalizePhoneForComparison(conv.telefone)
            if (avatarMap[conv.telefone] || avatarMap[normalizedPhone]) {
              conv.avatar = avatarMap[conv.telefone] || avatarMap[normalizedPhone]
            }
          })
          
          // Buscar TODAS as mensagens para cada telefone e processar localmente
          const { data: allMessages, error: messagesError } = await supabase
            .from('whatsapp_messages')
            .select('telefone, mensagem, tipo, read, created_at, timestamp')
            .in('telefone', phoneList)

          if (!messagesError && allMessages && allMessages.length > 0) {
            // Agrupar mensagens por telefone normalizado
            const messagesByPhone: Record<string, any[]> = {}
            allMessages.forEach((msg: any) => {
              const msgPhone = normalizePhoneForComparison(msg.telefone)
              if (!messagesByPhone[msgPhone]) {
                messagesByPhone[msgPhone] = []
              }
              messagesByPhone[msgPhone].push(msg)
            })

            // Para cada telefone, encontrar a mensagem MAIS RECENTE DE TEXTO e contar não lidas
            const lastMessageMap: Record<string, string> = {}
            const unreadCounts: Record<string, number> = {}

            Object.keys(messagesByPhone).forEach((phone) => {
              const messages = messagesByPhone[phone]
              
              // Ordenar por timestamp/created_at (mais recente primeiro)
              messages.sort((a, b) => {
                const timeA = new Date(a.timestamp || a.created_at).getTime()
                const timeB = new Date(b.timestamp || b.created_at).getTime()
                return timeB - timeA // Ordenar DESC (mais recente primeiro)
              })

              // Pegar a PRIMEIRA mensagem DE TEXTO da lista ordenada (a mais recente)
              // Ignorar mensagens que são apenas "[Mídia]" ou tipos de mídia sem texto
              if (messages.length > 0) {
                // Procurar primeira mensagem com texto real (não apenas indicador de mídia)
                const mostRecentWithText = messages.find(msg => 
                  msg.mensagem && 
                  msg.mensagem.trim() !== '' && 
                  !msg.mensagem.match(/^\[Mídia\]|^📷|^🎥|^🎤|^📄|^😀|^📍|^👤$/i)
                )
                
                if (mostRecentWithText && mostRecentWithText.mensagem) {
                  // Limpar e truncar mensagem
                  const cleanMessage = mostRecentWithText.mensagem.trim()
                  lastMessageMap[phone] = cleanMessage.substring(0, 100)
                } else {
                  // Se não encontrou texto, usar a primeira mensagem mesmo que seja mídia
                  const mostRecent = messages[0]
                  if (mostRecent.mensagem) {
                    lastMessageMap[phone] = mostRecent.mensagem.substring(0, 100)
                  }
                }
              }
              
              // Contar mensagens recebidas não lidas
              const unread = messages.filter(msg => msg.tipo === 'received' && !msg.read)
              unreadCounts[phone] = unread.length
            })

            // Atualizar conversas com dados reais do banco
            conversationsData.forEach((conv) => {
              const normalizedPhone = normalizePhoneForComparison(conv.telefone)
              
              // Adicionar foto de perfil se disponível
              if (avatarMap[conv.telefone] || avatarMap[normalizedPhone]) {
                conv.avatar = avatarMap[conv.telefone] || avatarMap[normalizedPhone]
              }
              
              // Comparar timestamp da última mensagem do banco com a da Evolution API
              // SEMPRE priorizar mensagem de texto do banco se ela existir e tiver texto real
              if (lastMessageMap[normalizedPhone] && messagesByPhone[normalizedPhone]?.length > 0) {
                const dbMessageText = lastMessageMap[normalizedPhone]
                const isDbMessageText = dbMessageText && 
                                       dbMessageText.trim() !== '' && 
                                       !dbMessageText.match(/^\[Mídia\]|^📷|^🎥|^🎤|^📄|^😀|^📍|^👤$/i)
                
                // Se o banco tem texto real, SEMPRE usar ele (independente de timestamp)
                if (isDbMessageText) {
                  conv.ultima_mensagem = dbMessageText.substring(0, 100)
                } else {
                  // Se não tem texto real no banco, verificar se a API tem texto
                  const apiMessageText = conv.ultima_mensagem || ''
                  const isApiMessageText = apiMessageText && 
                                           apiMessageText.trim() !== '' && 
                                           !apiMessageText.match(/^\[Mídia\]|^📷|^🎥|^🎤|^📄|^😀|^📍|^👤$/i)
                  
                  // Se a API tem texto real, manter ele
                  if (isApiMessageText) {
                    // Já está definido em conv.ultima_mensagem, não precisa fazer nada
                  } else {
                    // Se nenhuma das duas tem texto, verificar timestamp para decidir qual usar
                    const dbLastMessage = messagesByPhone[normalizedPhone][0] // Já está ordenada (mais recente primeiro)
                    const dbLastMessageTime = new Date(dbLastMessage.timestamp || dbLastMessage.created_at).getTime()
                    const apiLastMessageTime = new Date(conv.data_ultima_msg).getTime()
                    
                    // Se a mensagem do banco for mais recente, usar ela mesmo que seja mídia
                    if (dbLastMessageTime >= apiLastMessageTime - 5000) {
                      conv.ultima_mensagem = dbMessageText || '[Mídia]'
                      
                      // Atualizar também o timestamp se for mais recente
                      if (dbLastMessageTime > apiLastMessageTime) {
                        conv.data_ultima_msg = new Date(dbLastMessage.timestamp || dbLastMessage.created_at).toISOString()
                      }
                    }
                    // Caso contrário, manter a da API (já está em conv.ultima_mensagem)
                  }
                }
              }
              
              // Atualizar contagem de não lidas
              conv.unread_count = unreadCounts[normalizedPhone] || 0
            })
          }
        }
      } catch (error) {
        console.warn('Erro ao buscar última mensagem e não lidas (não crítico):', error)
        // Se der erro, usar contagem original da Evolution API como fallback
        conversationsData.forEach((conv: any) => {
          if (conv._originalUnread !== undefined && !conv.unread_count) {
            conv.unread_count = conv._originalUnread
          }
        })
      }

      // Remover campo temporário
      conversationsData.forEach((conv: any) => {
        delete conv._originalUnread
      })

      // Filtrar por busca se houver
      const filtered = searchQuery
        ? conversationsData.filter(
            (c) =>
              c.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
              c.telefone.includes(searchQuery)
          )
        : conversationsData

      if (append) {
        // Adicionar novas conversas (evitar duplicatas)
        setConversations(prev => {
          const existingPhones = new Set(prev.map(c => c.telefone))
          const newConversations = filtered.filter(c => !existingPhones.has(c.telefone))
          return [...prev, ...newConversations]
        })
        // Se retornou menos conversas que o esperado, provavelmente não há mais
        setHasMore(chats.length >= 50)
        setCurrentPage(page + 1)
      } else {
        setConversations(filtered)
        // Na primeira página, sempre carregar tudo de uma vez (já está sendo feito no servidor)
        // Se retornou conversas, pode haver mais, mas o servidor já carregou todas
        setHasMore(false) // Desabilitar scroll infinito - já carregou tudo
        setCurrentPage(1)
        console.log(`[ConversationList] ✅ Carregadas ${filtered.length} conversas (todas disponíveis)`)
      }
    } catch (error: any) {
      // Melhorar serialização do erro
      const errorDetails = {
        message: error?.message || 'Erro desconhecido',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        name: error?.name,
        stack: error?.stack,
      }
      
      console.error('❌ Erro ao carregar conversas:', errorDetails)
      console.error('Erro completo:', error)
      
      // Se o erro for 404, significa que o endpoint não existe
      if (error?.message?.includes('404') || error?.message?.includes('Not Found')) {
        console.error('⚠️ Endpoint não encontrado (404). Verifique:')
        console.error('1. Se o nome da instância está correto nas variáveis de ambiente')
        console.error('2. Se a URL da Evolution API está correta')
        console.error('3. Se a Evolution API está rodando e acessível')
        console.error('4. Qual é o endpoint correto na documentação da Evolution API v2.3.6')
      }
      
      // Garantir que sempre temos uma lista vazia em caso de erro
      if (!append) {
        setConversations([])
      }
      setHasMore(false)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // Função para carregar mais conversas
  const loadMoreConversations = async () => {
    if (loadingMore || !hasMore || searchQuery) return // Não carregar mais se estiver buscando
    
    const nextPage = currentPage + 1
    setCurrentPage(nextPage)
    await loadConversations(0, nextPage, true)
  }

  // Detectar scroll para carregar mais
  useEffect(() => {
    const scrollArea = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (!scrollArea) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollArea
      // Carregar mais quando estiver a 200px do final
      if (scrollHeight - scrollTop - clientHeight < 200 && hasMore && !loadingMore && !loading && !searchQuery) {
        loadMoreConversations()
      }
    }

    scrollArea.addEventListener('scroll', handleScroll)
    return () => scrollArea.removeEventListener('scroll', handleScroll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, loading, searchQuery])

  const subscribeToConversations = () => {
    // Escutar mudanças em mensagens WhatsApp para atualizar lista
    // Usar debounce para evitar recarregamentos excessivos
    let reloadTimeout: NodeJS.Timeout | null = null
    
    const messagesChannel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages',
        },
        () => {
          // Debounce: esperar 2 segundos antes de recarregar
          if (reloadTimeout) {
            clearTimeout(reloadTimeout)
          }
          reloadTimeout = setTimeout(() => {
            loadConversations()
          }, 2000)
        }
      )
      .subscribe()

    // Recarregar conversas periodicamente para pegar atualizações da Evolution API
    // Aumentar intervalo para reduzir carga e evitar recarregamentos desnecessários
    const intervalId = setInterval(() => {
      // Só recarregar se não estiver carregando e não houver busca ativa
      if (!loading && !searchQuery) {
        loadConversations()
      }
    }, 300000) // Recarregar a cada 300 segundos (5 minutos) para reduzir carga no servidor

    // Retornar função de cleanup
    return () => {
      messagesChannel.unsubscribe()
      clearInterval(intervalId)
      if (reloadTimeout) {
        clearTimeout(reloadTimeout)
      }
    }
  }

  const formatLastMessageTime = (dateString: string) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays === 0) {
        return format(date, 'HH:mm', { locale: ptBR })
      } else if (diffDays === 1) {
        return 'Ontem'
      } else if (diffDays < 7) {
        return format(date, 'EEE', { locale: ptBR })
      } else {
        return format(date, 'dd/MM/yyyy', { locale: ptBR })
      }
    } catch {
      return ''
    }
  }

  // Memoizar conversas filtradas para evitar re-renders desnecessários
  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations
    const queryLower = searchQuery.toLowerCase()
    return conversations.filter(
      (c) =>
        c.nome.toLowerCase().includes(queryLower) ||
        c.telefone.includes(searchQuery)
    )
  }, [conversations, searchQuery])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">Carregando conversas...</p>
        {/* Skeleton loaders */}
        <div className="w-full space-y-3 mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 p-3 animate-pulse">
              <div className="w-12 h-12 rounded-full bg-muted"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full border-r bg-muted/50">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 space-y-3">
            <div className="text-center max-w-sm">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Nenhuma conversa encontrada
              </p>
              <p className="text-xs text-muted-foreground/80 mb-3">
                As conversas serão carregadas diretamente da Evolution API, igual ao WhatsApp Web.
              </p>
              <div className="text-xs text-muted-foreground/70 space-y-1 mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="font-medium mb-2">Verificações:</p>
                <ul className="list-disc list-inside space-y-1 text-left">
                  <li>Certifique-se que o WhatsApp está conectado na Evolution API</li>
                  <li>Verifique se o nome da instância está correto</li>
                  <li>Verifique os logs do servidor para ver quais endpoints foram testados</li>
                  <li>As conversas do WhatsApp aparecerão automaticamente aqui</li>
                </ul>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 pt-3 border-t border-muted">
                  💡 Se nenhuma conversa aparecer, verifique os logs do servidor (terminal) para ver quais endpoints da Evolution API estão sendo testados e quais erros estão ocorrendo.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conversation) => {
              const getInitials = (name?: string) => {
                if (!name) return '?'
                const parts = name.trim().split(' ')
                if (parts.length >= 2) {
                  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                }
                return name.substring(0, 2).toUpperCase()
              }

              return (
                <button
                  key={conversation.telefone}
                  onClick={() => onSelectConversation(conversation.telefone, conversation.nome, conversation.avatar)}
                  className={cn(
                    'w-full p-3 text-left hover:bg-muted transition-colors',
                    selectedPhone === conversation.telefone && 'bg-muted'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center relative">
                      {conversation.avatar ? (
                        <img 
                          src={conversation.avatar} 
                          alt={conversation.nome}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            // Se falhar ao carregar imagem, mostrar iniciais
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const parent = target.parentElement
                            if (parent && !parent.querySelector('span')) {
                              const initials = document.createElement('span')
                              initials.className = 'text-primary font-medium text-sm'
                              initials.textContent = getInitials(conversation.nome)
                              parent.appendChild(initials)
                            }
                          }}
                        />
                      ) : (
                        <span className="text-primary font-medium text-sm">
                          {getInitials(conversation.nome)}
                        </span>
                      )}
                    </div>
                    
                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-semibold text-sm truncate">{conversation.nome}</p>
                        <div className="flex items-center gap-2">
                          {conversation.etapa && (
                            <Badge variant="outline" className="text-xs">
                              {conversation.etapa}
                            </Badge>
                          )}
                          <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatLastMessageTime(conversation.data_ultima_msg)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground truncate">
                          {conversation.ultima_mensagem || 'Sem mensagens'}
                        </p>
                        {conversation.unread_count > 0 && (
                          <Badge className="bg-primary text-primary-foreground min-w-[20px] h-5 flex items-center justify-center text-xs">
                            {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
        
        {/* Indicador de carregamento de mais conversas */}
        {loadingMore && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Carregando mais conversas...</span>
          </div>
        )}
        
        {/* Indicador de fim da lista */}
        {!hasMore && filteredConversations.length > 0 && !searchQuery && (
          <div className="flex items-center justify-center p-4">
            <span className="text-xs text-muted-foreground">Todas as conversas foram carregadas</span>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

