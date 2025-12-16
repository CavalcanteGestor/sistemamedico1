'use client'

import { useEffect, useState } from 'react'
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
}

interface ConversationListProps {
  selectedPhone?: string
  onSelectConversation: (phone: string, name?: string) => void
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
  const supabase = createClient()
  
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
  
  useEffect(() => {
    if (!loading) {
      loadConversations()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  const loadConversations = async () => {
    try {
      setLoading(true)

      // Buscar conversas da Evolution API
      const response = await fetch('/api/whatsapp/chats')
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Erro ao buscar conversas')
      }

      const chats = result.data || []

      // Se não houver conversas, retornar lista vazia
      if (chats.length === 0) {
        // Nenhuma conversa encontrada
        setConversations([])
        setLoading(false)
        return
      }

      // Log removido para produção

      // Extrair números de telefone para buscar nomes dos leads (opcional)
      const phoneNumbers = chats
        .map((chat: any) => {
          const chatId = chat.id || chat.jid || ''
          return chatId.includes('@') ? chatId : `${chatId}@s.whatsapp.net`
        })
        .filter(Boolean)

      // Buscar nomes dos leads do banco (CRÍTICO para mesclar conversas corretamente)
      const leadNames: Record<string, string> = {} // telefone -> nome
      const leadPhones: Record<string, string> = {} // nome normalizado -> telefone (número correto)
      const leadEtapas: Record<string, string> = {}
      let allLeads: any[] | null = null

      try {
        // Buscar todos os leads para ter nomes corretos e números reais
        const { data: leadsData, error: leadsError } = await supabase
          .from('leads')
          .select('telefone, nome, etapa')

        if (leadsError) {
          console.warn('Erro ao buscar leads (não crítico):', leadsError)
        }

        allLeads = leadsData || null

        if (allLeads) {
          allLeads.forEach((lead) => {
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
        }
      } catch (error) {
        console.warn('Erro ao buscar leads (não crítico):', error)
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
          let ultima_mensagem = ''
          if (chat.lastMessage) {
            const msg = chat.lastMessage
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
                             (msg.imageMessage ? '📷 Imagem' : 
                              msg.videoMessage ? '🎥 Vídeo' : 
                              msg.audioMessage ? '🎤 Áudio' : 
                              msg.documentMessage ? '📄 Documento' : 
                              msg.stickerMessage ? '😀 Figurinha' : 
                              msg.locationMessage ? '📍 Localização' : 
                              msg.contactMessage ? '👤 Contato' : 
                              '[Mídia]')
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
                // Tentar buscar diretamente no array de leads
                const leadEntry = allLeads?.find((l: any) => 
                  l.nome && l.nome.trim().toLowerCase() === normalizedLeadName
                )
                if (leadEntry?.telefone) {
                  bestPhone = standardizePhone(normalizePhoneForComparison(leadEntry.telefone))
                  // Log removido para produção
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
      try {
        const phoneList = conversationsData.map(c => c.telefone).filter(Boolean)
        if (phoneList.length > 0) {
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

            // Para cada telefone, encontrar a mensagem MAIS RECENTE e contar não lidas
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

              // Pegar a PRIMEIRA mensagem da lista ordenada (a mais recente)
              if (messages.length > 0) {
                const mostRecent = messages[0]
                if (mostRecent.mensagem) {
                  lastMessageMap[phone] = mostRecent.mensagem.substring(0, 100)
                }
              }
              
              // Contar mensagens recebidas não lidas
              const unread = messages.filter(msg => msg.tipo === 'received' && !msg.read)
              unreadCounts[phone] = unread.length
            })

            // Atualizar conversas com dados reais do banco
            conversationsData.forEach((conv) => {
              const normalizedPhone = normalizePhoneForComparison(conv.telefone)
              
              // Comparar timestamp da última mensagem do banco com a da Evolution API
              // Usar a mensagem mais recente entre as duas fontes
              if (lastMessageMap[normalizedPhone] && messagesByPhone[normalizedPhone]?.length > 0) {
                const dbLastMessage = messagesByPhone[normalizedPhone][0] // Já está ordenada (mais recente primeiro)
                const dbLastMessageTime = new Date(dbLastMessage.timestamp || dbLastMessage.created_at).getTime()
                const apiLastMessageTime = new Date(conv.data_ultima_msg).getTime()
                
                // Se a mensagem do banco for mais recente ou igual (com margem de 5 segundos para compensar diferenças de clock)
                if (dbLastMessageTime >= apiLastMessageTime - 5000) {
                  conv.ultima_mensagem = lastMessageMap[normalizedPhone]
                  // Atualizar também o timestamp se for mais recente
                  if (dbLastMessageTime > apiLastMessageTime) {
                    conv.data_ultima_msg = new Date(dbLastMessage.timestamp || dbLastMessage.created_at).toISOString()
                  }
                }
                // Se não, manter conv.ultima_mensagem da Evolution API (já está preenchida)
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

      setConversations(filtered)
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
      setConversations([])
    } finally {
      setLoading(false)
    }
  }

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
    // Aumentar intervalo para reduzir carga
    const intervalId = setInterval(() => {
      loadConversations()
    }, 60000) // Recarregar a cada 60 segundos (1 minuto)

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Carregando conversas...</p>
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

      <ScrollArea className="flex-1">
        {conversations.length === 0 ? (
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
            {conversations.map((conversation) => {
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
                  onClick={() => onSelectConversation(conversation.telefone, conversation.nome)}
                  className={cn(
                    'w-full p-3 text-left hover:bg-muted transition-colors',
                    selectedPhone === conversation.telefone && 'bg-muted'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-medium text-sm">
                        {getInitials(conversation.nome)}
                      </span>
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
      </ScrollArea>
    </div>
  )
}

