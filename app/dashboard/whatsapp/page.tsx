'use client'

import { useState } from 'react'
import { ConversationList } from '@/components/whatsapp/conversation-list'
import { WhatsAppChat } from '@/components/whatsapp/whatsapp-chat'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Maximize2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'

export default function WhatsAppPage() {
  const router = useRouter()
  const [selectedPhone, setSelectedPhone] = useState<string | undefined>()
  const [contactName, setContactName] = useState<string | undefined>()
  const [contactAvatar, setContactAvatar] = useState<string | undefined>()
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()

  const handleSelectConversation = async (phone: string, conversationName?: string, avatar?: string) => {
    // Se for o mesmo telefone, não fazer nada
    if (selectedPhone === phone) {
      return
    }
    
    // Limpar nome e avatar primeiro
    setContactName(undefined)
    setContactAvatar(undefined)
    
    // Mudar telefone - a key do componente vai garantir recriação completa
    setSelectedPhone(phone)
    
    // Se já temos avatar da lista, usar ele
    if (avatar) {
      setContactAvatar(avatar)
    }
    
    // Buscar nome do contato e avatar (priorizar lead cadastrado, depois nome da conversa, depois telefone)
    try {
      // Primeiro tentar buscar do lead
      const { data: lead, error } = await supabase
        .from('leads')
        .select('nome')
        .eq('telefone', phone)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        logger.error('Erro ao buscar nome do lead', error, { phone })
      }

      // Priorizar: lead > nome da conversa > telefone
      if (lead?.nome) {
        setContactName(lead.nome)
      } else if (conversationName && conversationName.toLowerCase() !== 'você' && conversationName.toLowerCase() !== 'you') {
        setContactName(conversationName)
      } else {
        setContactName(phone.replace('@s.whatsapp.net', '').replace('@lid', ''))
      }
      
      // Buscar avatar se não tiver
      if (!avatar) {
        try {
          const response = await fetch(`/api/whatsapp/profile-picture?phone=${encodeURIComponent(phone)}`)
          if (response.ok) {
            const data = await response.json()
            if (data.avatar) {
              setContactAvatar(data.avatar)
            }
          }
        } catch (error) {
          // Não crítico
        }
      }
    } catch (error) {
      logger.error('Erro ao buscar contato', error, { phone })
      setContactName(phone.replace('@s.whatsapp.net', '').replace('@lid', ''))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">WhatsApp</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gerencie suas conversas e mensagens
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const width = 1200
            const height = 800
            const left = (window.screen.width - width) / 2
            const top = (window.screen.height - height) / 2
            
            window.open(
              '/whatsapp',
              'WhatsAppFullscreen',
              `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no`
            )
          }}
          className="gap-2 w-full sm:w-auto"
        >
          <Maximize2 className="h-4 w-4" />
          <span className="hidden sm:inline">Modo Tela Cheia</span>
          <span className="sm:hidden">Tela Cheia</span>
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-12rem)] border rounded-lg overflow-hidden">
        <div className="w-full lg:w-96 flex-shrink-0 border-b lg:border-b-0 lg:border-r">
          <ConversationList
            selectedPhone={selectedPhone}
            onSelectConversation={handleSelectConversation}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>
        <div className="flex-1 min-w-0 min-h-[400px] lg:min-h-0">
          {selectedPhone && (
            <WhatsAppChat 
              key={`chat-${selectedPhone}`} 
              phone={selectedPhone} 
              contactName={contactName}
              contactAvatar={contactAvatar}
            />
          )}
          {!selectedPhone && (
            <div className="flex items-center justify-center h-full text-gray-500 p-4 text-center">
              <div>
                <p className="text-lg font-medium mb-2">Selecione uma conversa</p>
                <p className="text-sm text-muted-foreground">Escolha uma conversa da lista para começar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

