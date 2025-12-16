'use client'

import { useState } from 'react'
import { ConversationList } from '@/components/whatsapp/conversation-list'
import { WhatsAppChat } from '@/components/whatsapp/whatsapp-chat'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Maximize2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function WhatsAppPage() {
  const router = useRouter()
  const [selectedPhone, setSelectedPhone] = useState<string | undefined>()
  const [contactName, setContactName] = useState<string | undefined>()
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()

  const handleSelectConversation = async (phone: string, conversationName?: string) => {
    // Se for o mesmo telefone, não fazer nada
    if (selectedPhone === phone) {
      return
    }
    
    // Limpar nome primeiro
    setContactName(undefined)
    
    // Mudar telefone - a key do componente vai garantir recriação completa
    setSelectedPhone(phone)
    
    // Buscar nome do contato (priorizar lead cadastrado, depois nome da conversa, depois telefone)
    try {
      // Primeiro tentar buscar do lead
      const { data: lead, error } = await supabase
        .from('leads')
        .select('nome')
        .eq('telefone', phone)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar nome do lead:', error)
      }

      // Priorizar: lead > nome da conversa > telefone
      if (lead?.nome) {
        setContactName(lead.nome)
      } else if (conversationName && conversationName.toLowerCase() !== 'você' && conversationName.toLowerCase() !== 'you') {
        setContactName(conversationName)
      } else {
        setContactName(phone.replace('@s.whatsapp.net', '').replace('@lid', ''))
      }
    } catch (error) {
      console.error('Erro ao buscar contato:', error)
      setContactName(phone.replace('@s.whatsapp.net', '').replace('@lid', ''))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WhatsApp</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie suas conversas e mensagens
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/whatsapp')}
          className="gap-2"
        >
          <Maximize2 className="h-4 w-4" />
          Modo Tela Cheia
        </Button>
      </div>

      <div className="flex h-[calc(100vh-12rem)] border rounded-lg overflow-hidden">
        <div className="w-full md:w-96 flex-shrink-0">
          <ConversationList
            selectedPhone={selectedPhone}
            onSelectConversation={handleSelectConversation}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>
        <div className="flex-1 min-w-0">
          {selectedPhone && (
            <WhatsAppChat 
              key={`chat-${selectedPhone}`} 
              phone={selectedPhone} 
              contactName={contactName}
              contactAvatar={undefined}
            />
          )}
          {!selectedPhone && (
            <div className="flex items-center justify-center h-full text-gray-500">
              Selecione uma conversa para começar
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

