'use client'

import { useState } from 'react'
import { ConversationList } from '@/components/whatsapp/conversation-list'
import { WhatsAppChat } from '@/components/whatsapp/whatsapp-chat'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function WhatsAppFullscreenPage() {
  const [selectedPhone, setSelectedPhone] = useState<string>('')
  const [contactName, setContactName] = useState<string>('')
  const [contactAvatar, setContactAvatar] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Verificar autenticação
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Verificar permissão
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || !['admin', 'medico', 'recepcionista', 'desenvolvedor'].includes(profile.role)) {
        router.push('/dashboard')
        return
      }

      setLoading(false)
    }

    checkAuth()
  }, [router])

  const handleSelectConversation = async (phone: string, name?: string) => {
    setSelectedPhone(phone)
    setContactName(name || '')
    
    // Buscar avatar se houver lead
    const supabase = createClient()
    const phoneClean = phone.replace('@s.whatsapp.net', '').trim()
    
    try {
      const { data: lead } = await supabase
        .from('leads')
        .select('nome, telefone')
        .or(`telefone.eq.${phone},telefone.eq.${phoneClean},telefone.ilike.%${phoneClean}%`)
        .maybeSingle()
      
      if (lead?.nome) {
        setContactName(lead.nome)
      }
      
      // Avatar pode ser implementado depois se necessário
      setContactAvatar('')
    } catch (error) {
      // Não crítico
    }
  }

  const handleQuickMessage = (message: string) => {
    // Passar mensagem para o chat
    // Isso será gerenciado pelo WhatsAppChat internamente
  }

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50 overflow-hidden">
      {/* Header minimalista (opcional - pode remover se quiser totalmente limpo) */}
      <div className="h-16 bg-white border-b flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">WhatsApp</h1>
            <p className="text-xs text-gray-500">Lumi</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/dashboard/whatsapp')}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            Modo Dashboard
          </button>
        </div>
      </div>

      {/* Área principal: Lista de conversas + Chat */}
      <div className="flex-1 flex overflow-hidden">
        {/* Lista de conversas */}
        <div className="w-96 border-r bg-white flex flex-col flex-shrink-0">
          <ConversationList
            selectedPhone={selectedPhone}
            onSelectConversation={handleSelectConversation}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col bg-gray-100">
          {selectedPhone ? (
            <WhatsAppChat
              phone={selectedPhone}
              contactName={contactName}
              contactAvatar={contactAvatar}
              showSidebar={true}
              onQuickMessage={handleQuickMessage}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center max-w-md px-6">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-12 h-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-gray-700 mb-2">
                  WhatsApp
                </h2>
                <p className="text-gray-500">
                  Selecione uma conversa da lista ao lado para começar a conversar
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

