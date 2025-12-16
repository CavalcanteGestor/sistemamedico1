'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bot, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface AIControlToggleProps {
  phone: string
  onToggle?: (active: boolean) => void
}

export function AIControlToggle({ phone, onToggle }: AIControlToggleProps) {
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadStatus()
  }, [phone])

  const loadStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('atendimento_humano')
        .select('ativo')
        .eq('telefone', phone)
        .maybeSingle()

      // PGRST116 = nenhum resultado encontrado (isso é OK)
      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar status do atendimento humano:', error)
        setActive(false) // Default para IA ativa se não conseguir carregar
        return
      }

      // Se não existe registro ou ativo é false, a IA está ativa (botão mostra "IA Ativa")
      // Se ativo é true, o atendimento humano está ativo (botão mostra "Atendimento Humano")
      setActive(data?.ativo === true)
    } catch (error) {
      console.error('Erro ao carregar status:', error)
      setActive(false) // Default: IA ativa (sem atendimento humano)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async () => {
    try {
      setLoading(true)
      const newStatus = !active

      const response = await fetch('/api/whatsapp/human-support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          active: newStatus,
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao alterar status')
      }

      setActive(newStatus)
      onToggle?.(newStatus)

      toast({
        title: newStatus ? 'Atendimento humano ativado' : 'IA reativada',
        description: newStatus
          ? 'A IA não responderá mais. A secretaria está atendendo.'
          : 'A IA voltou a responder automaticamente.',
      })
      
      // Recarregar status para garantir sincronização
      setTimeout(() => {
        loadStatus()
      }, 500)
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível alterar o status',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="w-8 h-8 animate-pulse bg-muted rounded" />
  }

  return (
    <Button
      variant={active ? 'default' : 'outline'}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className="gap-2"
    >
      {active ? (
        <>
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Atendimento Humano</span>
        </>
      ) : (
        <>
          <Bot className="h-4 w-4" />
          <span className="hidden sm:inline">IA Ativa</span>
        </>
      )}
    </Button>
  )
}

