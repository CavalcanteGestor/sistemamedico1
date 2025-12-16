'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Paperclip, Image as ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

interface Message {
  id: string
  message: string
  message_type: 'text' | 'file' | 'image' | 'link'
  file_url?: string
  user_id: string
  created_at: string
  user_name?: string
  is_doctor?: boolean
}

interface ConsultationChatProps {
  sessionId: string
  userName: string
  isDoctor: boolean
}

export function ConsultationChat({ sessionId, userName, isDoctor }: ConsultationChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    // Só carregar mensagens se sessionId existir
    if (!sessionId) return
    
    loadMessages()
    const unsubscribe = subscribeToMessages()
    
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [sessionId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadMessages = async () => {
    if (!sessionId) return
    
    try {
      // Buscar mensagens sem join (evita erro 400)
      const { data, error } = await supabase
        .from('telemedicine_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (error) {
        // Erro pode ser normal se a tabela não existir ou RLS bloquear
        if (error.code === 'PGRST116' || error.code === '42P01') {
          // Tabela não existe ou sem acesso - não é um erro crítico
          return
        }
        throw error
      }

      // Buscar perfis separadamente para cada user_id único
      const userIds = [...new Set((data || []).map((msg: any) => msg.user_id).filter(Boolean))]
      const profilesMap: Record<string, { name: string; role: string }> = {}
      
      if (userIds.length > 0) {
        // Buscar perfis em batch (apenas os que conseguimos acessar)
        for (const userId of userIds) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('name, role')
              .eq('id', userId)
              .maybeSingle()
            
            if (profile) {
              profilesMap[userId] = profile
            }
          } catch {
            // Erro silencioso - perfil pode não estar acessível
          }
        }
      }

      const formattedMessages = (data || []).map((msg: any) => ({
        ...msg,
        user_name: profilesMap[msg.user_id]?.name || 'Usuário',
        is_doctor: profilesMap[msg.user_id]?.role === 'medico' || profilesMap[msg.user_id]?.role === 'admin',
      }))

      setMessages(formattedMessages)
    } catch (error: any) {
      // Erro silencioso - tabela pode não existir ou RLS pode bloquear
      // Não bloquear a interface se houver erro
      setMessages([])
    }
  }

  const subscribeToMessages = () => {
    if (!sessionId) return () => {}
    
    try {
      const channel = supabase.channel(`chat-${sessionId}`)

      channel
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'telemedicine_messages',
          filter: `session_id=eq.${sessionId}`,
        }, async (payload) => {
          try {
            // Buscar nome do usuário (com tratamento de erro)
            let profile: { name?: string; role?: string } | null = null
            try {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('name, role')
                .eq('id', payload.new.user_id)
                .maybeSingle()
              profile = profileData
            } catch {
              // Erro silencioso - perfil pode não estar acessível
            }

            const newMsg: Message = {
              ...(payload.new as any),
              user_name: profile?.name || 'Usuário',
              is_doctor: profile?.role === 'medico' || profile?.role === 'admin',
            }

            setMessages((prev) => [...prev, newMsg])
          } catch (error) {
            // Erro silencioso ao processar nova mensagem
          }
        })
        .subscribe()

      return () => {
        channel.unsubscribe()
      }
    } catch (error) {
      // Erro silencioso ao criar subscription
      return () => {}
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { error } = await supabase.from('telemedicine_messages').insert({
        session_id: sessionId,
        user_id: user.id,
        message: newMessage.trim(),
        message_type: 'text',
      })

      if (error) throw error

      setNewMessage('')
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar mensagem',
        description: 'Não foi possível enviar a mensagem. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <Card className="h-full flex flex-col min-h-[400px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Chat da Consulta</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 p-4">
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                Nenhuma mensagem ainda. Comece a conversar!
              </div>
            ) : (
              messages.map((message) => {
                const isOwnMessage = message.user_name === userName
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-lg p-3 ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {!isOwnMessage && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">
                            {message.is_doctor ? '👨‍⚕️' : '👤'} {message.user_name}
                          </span>
                          {message.is_doctor && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              Médico
                            </Badge>
                          )}
                        </div>
                      )}
                      <p className="text-sm break-words">{message.message}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}
                      >
                        {format(new Date(message.created_at), 'HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-2 border-t">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={loading || !newMessage.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

