'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { MessageBubble } from './message-bubble'
import { MessageInput } from './message-input'
import { AIControlToggle } from './ai-control-toggle'
import { ContactInfoSidebar } from './contact-info-sidebar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { markMessagesAsRead } from '@/lib/services/whatsapp-service'
import { format, isToday, isYesterday, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/logger'

interface Message {
  id: string
  telefone: string
  mensagem: string
  tipo: 'sent' | 'received'
  remetente?: string
  destinatario?: string
  message_id?: string
  timestamp: string
  media_url?: string
  media_type?: string
  read: boolean
  created_at: string
  contact_name?: string
  contact_avatar?: string
}

interface WhatsAppChatProps {
  phone: string
  contactName?: string
  contactAvatar?: string
  showSidebar?: boolean
  onQuickMessage?: (message: string) => void
}

export function WhatsAppChat({ phone, contactName, contactAvatar, showSidebar = true, onQuickMessage }: WhatsAppChatProps) {
  // CRÍTICO: Inicializar mensagens vazias para garantir estado limpo
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  // Status de conexão removido
  const [quickMessage, setQuickMessage] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const currentPhoneRef = useRef<string | null>(null)
  const loadingRef = useRef(false)
  const subscriptionRef = useRef<(() => void) | null>(null)
  const { toast } = useToast()
  
  useEffect(() => {
    // CRÍTICO: Limpar mensagens ANTES de qualquer outra coisa
    setMessages([])
    
    if (!phone) {
      setLoading(false)
      currentPhoneRef.current = null
      return
    }
    
    const targetPhone = phone
    
    // Limpar subscription anterior se existir
    if (subscriptionRef.current) {
      subscriptionRef.current()
      subscriptionRef.current = null
    }
    
    // Limpar TODOS os estados
    setLoading(true)
    setHasMore(true)
    loadingRef.current = false
    currentPhoneRef.current = targetPhone
    
    let isCancelled = false
    let timeoutId: NodeJS.Timeout | null = null
    
    // Função para carregar tudo
    const initializeChat = async () => {
      // Verificar se foi cancelado
      if (isCancelled || currentPhoneRef.current !== targetPhone) {
        return
      }
      
      try {
        // Carregar mensagens primeiro
        await loadMessages(0)
        
        // Verificar novamente antes de continuar
        if (isCancelled || currentPhoneRef.current !== targetPhone) {
          return
        }
        
        // Configurar subscription e salvar referência
        subscriptionRef.current = subscribeToMessages()
        
        // Depois carregar status e marcar como lido
        // checkConnectionStatus() removido
        markAsRead()
        
        setLoading(false)
      } catch (error) {
        console.error('Erro ao inicializar chat:', error)
        if (!isCancelled && currentPhoneRef.current === targetPhone) {
          setLoading(false)
        }
      }
    }
    
    // Executar inicialização após pequeno delay
    timeoutId = setTimeout(() => {
      if (!isCancelled) {
        initializeChat()
      }
    }, 100)
    
    // Cleanup quando mudar de telefone
    return () => {
      isCancelled = true
      loadingRef.current = false
      
      // Limpar timeout
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      
      // Limpar subscription
      if (subscriptionRef.current) {
        subscriptionRef.current()
        subscriptionRef.current = null
      }
      
      // Limpar mensagens no cleanup também
      setMessages([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone])

  useEffect(() => {
    // Scroll para o final quando mensagens carregarem ou mudarem
    const timeouts: NodeJS.Timeout[] = []
    
    if (messages.length > 0 && !loading && phone) {
      // Tentar várias vezes para garantir que o scroll funcione
      [100, 300, 500, 800, 1000].forEach((delay) => {
        const timeout = setTimeout(() => {
          scrollToBottom()
        }, delay)
        timeouts.push(timeout)
      })
    }
    
    return () => {
      if (timeouts && timeouts.length > 0) {
        timeouts.forEach(clearTimeout)
      }
    }
  }, [messages, loading, phone])
  
  // Scroll específico quando muda o telefone (nova conversa)
  useEffect(() => {
    let timeout: NodeJS.Timeout | undefined
    
    if (phone && messages.length > 0 && !loading) {
      // Aguardar renderização completa e então fazer scroll
      timeout = setTimeout(() => {
        scrollToBottom()
      }, 500)
    }
    
    return () => {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }, [phone, messages, loading])

  // checkConnectionStatus removido

  const loadMessages = async (offset = 0) => {
    if (!phone) return
    
    // Evitar carregamentos duplicados
    if (loadingRef.current) {
      logger.debug('Já está carregando mensagens para este telefone', { phone })
      return
    }
    
    const targetPhone = phone // Capturar telefone atual
    
    try {
      loadingRef.current = true
      setLoading(true)
      // Log removido para produção
      
      const response = await fetch(`/api/whatsapp/messages?phone=${encodeURIComponent(targetPhone)}&limit=50&offset=${offset}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erro HTTP ${response.status}: ${errorText || 'Erro ao carregar mensagens'}`)
      }
      
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || result.message || 'Erro ao carregar mensagens')
      }

      // Verificar se ainda é o telefone atual antes de atualizar estado
      if (currentPhoneRef.current !== targetPhone) {
        // Telefone mudou durante carregamento - ignorar
        return
      }

      const newMessages = result.data || []
      // Log removido para produção
      
      // Adicionar informações de contato às mensagens
      const messagesWithContact = newMessages.map((msg: Message) => ({
        ...msg,
        contact_name: contactName || targetPhone.replace('@s.whatsapp.net', ''),
        contact_avatar: contactAvatar,
      }))
      
      // Ordenar mensagens por timestamp (mais antigas primeiro, mais recentes embaixo)
      const sortedMessages = messagesWithContact.sort((a: any, b: any) => {
        const timeA = new Date(a.timestamp || a.created_at).getTime()
        const timeB = new Date(b.timestamp || b.created_at).getTime()
        return timeA - timeB
      })
      
      // Verificar uma última vez antes de atualizar
      if (currentPhoneRef.current === targetPhone) {
        // Filtrar mensagens para garantir que sejam apenas do telefone correto
        const messagesForThisPhone = sortedMessages.filter((msg: any) => {
          if (!msg.telefone) return false
          // Normalizar telefones para comparação
          const normalize = (p: string) => p.replace('@s.whatsapp.net', '').replace('@lid', '').trim()
          return normalize(msg.telefone) === normalize(targetPhone) || msg.telefone === targetPhone
        })
        
        if (offset === 0) {
          // IMPORTANTE: Substituir TODAS as mensagens (não fazer merge)
          setMessages(messagesForThisPhone)
          // Log removido para produção
        } else {
          setMessages((prev) => {
            // Filtrar mensagens antigas também
            const filteredPrev = prev.filter(msg => {
              if (!msg.telefone) return false
              const normalize = (p: string) => p.replace('@s.whatsapp.net', '').replace('@lid', '').trim()
              return normalize(msg.telefone) === normalize(targetPhone)
            })
            return [...filteredPrev, ...messagesForThisPhone]
          })
        }

        setHasMore(newMessages.length === 50)
        
        // Scroll para o final após carregar
        if (offset === 0 && sortedMessages.length > 0) {
          setTimeout(() => {
            scrollToBottom()
          }, 200)
        }
      } else {
        // Telefone mudou antes de atualizar estado - ignorar
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Erro desconhecido ao carregar mensagens'
      logger.error('Erro ao carregar mensagens', error, { phone: targetPhone, errorMessage })
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }

  const subscribeToMessages = () => {
    if (!phone) return () => {}
    
    const currentPhone = phone
    let isActive = true
    
    // Polling simples: buscar novas mensagens a cada 5 segundos
    const pollForNewMessages = async () => {
      if (!isActive || currentPhoneRef.current !== currentPhone) {
        return
      }
      
      try {
        // Buscar apenas as últimas mensagens para verificar se há novas
        const response = await fetch(`/api/whatsapp/messages?phone=${encodeURIComponent(currentPhone)}&limit=10&offset=0`)
        const result = await response.json()
        
        if (!result.success || !result.data || result.data.length === 0) {
          return
        }
        
        // Verificar se ainda é o telefone correto
        if (currentPhoneRef.current !== currentPhone || !isActive) {
          return
        }
        
        const apiMessages = result.data || []
        
        // Obter IDs das mensagens que já temos
        setMessages((prev) => {
          const existingIds = new Set([
            ...prev.map(m => m.id),
            ...prev.map(m => m.message_id).filter(Boolean)
          ])
          
          // Verificar se há mensagens novas
          const newMessages = apiMessages.filter((msg: Message) => {
            const msgId = msg.id || msg.message_id
            return msgId && !existingIds.has(msgId)
          })
          
          if (newMessages.length === 0) {
            return prev
          }
          
          // Adicionar novas mensagens
          const messagesWithContact = newMessages.map((msg: Message) => ({
            ...msg,
            contact_name: contactName || currentPhone.replace('@s.whatsapp.net', ''),
            contact_avatar: contactAvatar,
          }))
          
          // Combinar e ordenar
          const allMessages = [...prev, ...messagesWithContact]
          return allMessages.sort((a, b) => {
            const timeA = new Date(a.timestamp || a.created_at).getTime()
            const timeB = new Date(b.timestamp || b.created_at).getTime()
            return timeA - timeB
          })
        })
        
        // Marcar como lida se houver novas mensagens
        if (apiMessages.length > 0) {
          markAsRead()
        }
      } catch (error) {
        logger.error('Erro ao buscar novas mensagens na subscription', error, { phone })
      }
    }
    
    // Iniciar polling a cada 5 segundos
    const intervalId = setInterval(pollForNewMessages, 5000)
    
    // Buscar imediatamente também
    pollForNewMessages()

    return () => {
      isActive = false
      clearInterval(intervalId)
    }
  }

  const markAsRead = async () => {
    try {
      await markMessagesAsRead(phone)
    } catch (error) {
      logger.error('Erro ao marcar mensagens como lidas', error, { phone })
    }
  }

  const handleSend = async (message: string, mediaFile?: File, mediaType?: string) => {
    if (!message.trim() && !mediaFile) return

    try {
      setSending(true)

      let mediaUrl: string | undefined

      // Se houver arquivo, fazer upload primeiro
      if (mediaFile) {
        const formData = new FormData()
        formData.append('file', mediaFile)
        formData.append('bucket', 'whatsapp-media')
        formData.append('folder', 'media')

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadResponse.ok) {
          throw new Error('Erro ao fazer upload do arquivo')
        }

        const uploadData = await uploadResponse.json()
        mediaUrl = uploadData.url
      }

      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          message: message || '',
          mediaUrl,
          mediaType: mediaType || (mediaFile?.type.startsWith('image/') ? 'image' :
                                  mediaFile?.type.startsWith('video/') ? 'video' :
                                  mediaFile?.type.startsWith('audio/') ? 'audio' : 'document'),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao enviar mensagem')
      }

      // Recarregar mensagens imediatamente após enviar
      setTimeout(() => {
        loadMessages(0).then(() => {
          setTimeout(() => scrollToBottom(), 200)
        })
      }, 500)
      
      toast({
        title: 'Mensagem enviada',
        description: 'Sua mensagem foi enviada com sucesso.',
      })
    } catch (error: any) {
      logger.error('Erro ao enviar mensagem WhatsApp', error, { phone })
      toast({
        title: 'Erro ao enviar',
        description: error.message || 'Não foi possível enviar a mensagem',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const scrollToBottom = () => {
    if (!scrollAreaRef.current) return
    
    // O ScrollArea customizado tem: div externo > div interno com overflow-y-auto
    const scrollContainer = scrollAreaRef.current.querySelector('div[class*="overflow-y-auto"]') as HTMLElement
    
    if (scrollContainer) {
      // Forçar scroll para o final imediatamente (sem animação para garantir)
      scrollContainer.scrollTop = scrollContainer.scrollHeight
      
      // Garantir múltiplas vezes
      requestAnimationFrame(() => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      })
      
      setTimeout(() => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }, 50)
      
      setTimeout(() => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }, 200)
    }
  }

  // Agrupar mensagens por data - apenas mensagens do telefone atual
  // Usar useMemo para recalcular quando mensagens ou telefone mudarem
  const groupedMessages = useMemo(() => {
    if (!phone || messages.length === 0) {
      return []
    }
    
    // Função auxiliar para normalizar telefone (remover sufixos)
    const normalizePhone = (p: string): string => {
      if (!p) return ''
      // Remover sufixos comuns e normalizar
      return p.replace('@s.whatsapp.net', '').replace('@lid', '').trim()
    }
    
    const normalizedCurrentPhone = normalizePhone(phone)
    
    // Filtrar APENAS mensagens do telefone atual (comparação EXATA)
    // IMPORTANTE: Todas as mensagens já devem usar o telefone da conversa,
    // mas vamos verificar por segurança
    const filteredMessages = messages.filter(msg => {
      if (!msg.telefone) {
        return false
      }
      
      // Normalizar telefone da mensagem para comparação
      const normalizedMsgPhone = normalizePhone(msg.telefone)
      
      // Comparação EXATA - aceitar se os números normalizados forem iguais
      // Isso garante que mensagens enviadas e recebidas da mesma conversa fiquem juntas
      return normalizedMsgPhone === normalizedCurrentPhone
    })
    
    if (filteredMessages.length === 0) {
      return []
    }
    
    // IMPORTANTE: Ordenar mensagens por timestamp ANTES de agrupar por data
    // Garantir que todas as mensagens tenham timestamps válidos
    const messagesWithValidTimestamps = filteredMessages.map(msg => {
      const timestamp = msg.timestamp || msg.created_at
      if (!timestamp || isNaN(new Date(timestamp).getTime())) {
        logger.warn('Mensagem sem timestamp válido', { messageId: msg.id, timestamp: msg.timestamp, createdAt: msg.created_at })
        // Se não tem timestamp válido, usar timestamp atual como fallback (colocar no final)
        return {
          ...msg,
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }
      }
      return msg
    })
    
    const sortedFilteredMessages = [...messagesWithValidTimestamps].sort((a, b) => {
      const timeA = new Date(a.timestamp || a.created_at).getTime()
      const timeB = new Date(b.timestamp || b.created_at).getTime()
      return timeA - timeB // Ordem cronológica: mais antigas primeiro
    })
    
    // Agrupar por data (mensagens já estão ordenadas cronologicamente)
    const grouped = sortedFilteredMessages.reduce((groups: { date: Date; messages: Message[] }[], msg) => {
      const msgDate = new Date(msg.timestamp || msg.created_at)
      const dateKey = startOfDay(msgDate)

      let group = groups.find(g => g.date.getTime() === dateKey.getTime())
      if (!group) {
        group = { date: dateKey, messages: [] }
        groups.push(group)
      }
      group.messages.push(msg)
      return groups
    }, [])
    
    // Ordenar grupos por data (mais antigas primeiro)
    const sortedGroups = grouped.sort((a, b) => a.date.getTime() - b.date.getTime())
    
    // CRÍTICO: Ordenar mensagens dentro de cada grupo por timestamp também
    // Isso garante que mesmo se houver alguma inconsistência, as mensagens fiquem na ordem correta
    sortedGroups.forEach(group => {
      group.messages.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.created_at).getTime()
        const timeB = new Date(b.timestamp || b.created_at).getTime()
        
        // Se os timestamps forem iguais, manter a ordem original
        if (timeA === timeB) {
          return 0
        }
        
        return timeA - timeB // Ordem cronológica dentro do grupo
      })
    })
    
    return sortedGroups
  }, [messages, phone])

  const formatDateHeader = (date: Date) => {
    if (isToday(date)) {
      return 'Hoje'
    } else if (isYesterday(date)) {
      return 'Ontem'
    } else {
      return format(date, "d 'de' MMMM, yyyy", { locale: ptBR })
    }
  }

  const shouldShowAvatar = (currentMsg: Message, prevMsg: Message | null, nextMsg: Message | null) => {
    if (currentMsg.tipo === 'sent') return false
    
    // Se não tem mensagem anterior, mostrar
    if (!prevMsg) return true
    
    // Se a mensagem anterior é de outro remetente, mostrar
    if (prevMsg.tipo !== currentMsg.tipo) return true
    
    // Se a mensagem anterior é muito antiga (mais de 5 minutos), mostrar
    const prevTime = new Date(prevMsg.timestamp || prevMsg.created_at).getTime()
    const currentTime = new Date(currentMsg.timestamp || currentMsg.created_at).getTime()
    if (currentTime - prevTime > 5 * 60 * 1000) return true
    
    return false
  }

  const isGrouped = (currentMsg: Message, prevMsg: Message | null) => {
    if (!prevMsg) return false
    if (prevMsg.tipo !== currentMsg.tipo) return false
    
    const prevTime = new Date(prevMsg.timestamp || prevMsg.created_at).getTime()
    const currentTime = new Date(currentMsg.timestamp || currentMsg.created_at).getTime()
    
    return currentTime - prevTime < 5 * 60 * 1000
  }

  if (!phone) {
    return (
      <Card className="flex-1 flex items-center justify-center">
        <CardContent className="text-center p-8">
          <p className="text-muted-foreground">Selecione uma conversa para começar</p>
        </CardContent>
      </Card>
    )
  }

  const handleQuickMessage = (message: string) => {
    if (onQuickMessage) {
      onQuickMessage(message)
    } else {
      // Apenas preencher o input, não enviar automaticamente
      setQuickMessage(message)
    }
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      <Card className="flex-1 flex flex-col h-full bg-[#EFE7DD]">
        <CardHeader className="border-b pb-3 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="font-semibold">{contactName || phone.replace('@s.whatsapp.net', '')}</h3>
                {/* Status de conexão removido */}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
            {loading && messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
              </div>
            ) : (
              <div className="space-y-4" key={`messages-container-${phone}`}>
                {groupedMessages.map((group, groupIndex) => (
                  <div key={`${phone}-${group.date.getTime()}`}>
                    {/* Cabeçalho de data */}
                    <div className="flex items-center justify-center my-4">
                      <div className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-gray-600">
                        {formatDateHeader(group.date)}
                      </div>
                    </div>
                    
                    {/* Mensagens do grupo */}
                    <div className="space-y-0.5">
                      {group.messages.map((msg, msgIndex) => {
                        const prevMsg = msgIndex > 0 ? group.messages[msgIndex - 1] : 
                                       groupIndex > 0 ? groupedMessages[groupIndex - 1].messages[groupedMessages[groupIndex - 1].messages.length - 1] : null
                        
                        return (
                          <MessageBubble
                            key={`${phone}-${msg.id}`}
                            message={msg.mensagem}
                            timestamp={msg.timestamp || msg.created_at}
                            isSent={msg.tipo === 'sent'}
                            read={msg.read}
                            mediaUrl={msg.media_url}
                            mediaType={msg.media_type}
                            contactName={msg.contact_name}
                            contactAvatar={msg.contact_avatar}
                            showAvatar={shouldShowAvatar(msg, prevMsg, null)}
                            isGrouped={isGrouped(msg, prevMsg)}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <MessageInput onSend={handleSend} disabled={sending} initialMessage={quickMessage || undefined} />
        </CardContent>
      </Card>

      {/* Sidebar de Informações do Contato */}
      {showSidebar && (
        <ContactInfoSidebar
          phone={phone}
          contactName={contactName}
          onQuickMessage={handleQuickMessage}
        />
      )}
    </div>
  )
}
