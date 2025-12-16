'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LeadCard } from './lead-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface Lead {
  id: string
  nome: string
  telefone: string
  mensagem?: string
  data_ultima_msg?: string
  etapa: string
  interesse?: string
  status?: string
  origem?: string
}

const ETAPAS = [
  { id: 'primeiro_contato', label: 'Primeiro Contato', color: 'bg-blue-500' },
  { id: 'interesse', label: 'Interesse', color: 'bg-yellow-500' },
  { id: 'agendado', label: 'Agendado', color: 'bg-green-500' },
  { id: 'confirmou_presenca', label: 'Confirmou Presença', color: 'bg-purple-500' },
  { id: 'compareceu', label: 'Compareceu', color: 'bg-emerald-500' },
]

interface KanbanBoardProps {
  onLeadClick?: (lead: Lead) => void
  searchQuery?: string
}

export function KanbanBoard({ onLeadClick, searchQuery = '' }: KanbanBoardProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedLead, setDraggedLead] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadLeads()
    subscribeToLeads()
  }, [])

  const loadLeads = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .not('telefone', 'is', null)
        .order('data_ultima_msg', { ascending: false, nullsFirst: false })

      if (error) throw error
      setLeads(data || [])
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível carregar os leads',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const subscribeToLeads = () => {
    const channel = supabase
      .channel('leads-kanban')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
        },
        () => {
          loadLeads()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLead(leadId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', leadId)
  }

  const handleDragOver = (e: React.DragEvent, etapa: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(etapa)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = async (e: React.DragEvent, novaEtapa: string) => {
    e.preventDefault()
    setDragOverColumn(null)

    if (!draggedLead) return

    const lead = leads.find((l) => l.id === draggedLead)
    if (!lead || lead.etapa === novaEtapa) {
      setDraggedLead(null)
      return
    }

    try {
      const { error } = await supabase
        .from('leads')
        .update({ etapa: novaEtapa, updated_at: new Date().toISOString() })
        .eq('id', draggedLead)

      if (error) throw error

      // Atualizar localmente
      setLeads((prev) =>
        prev.map((l) => (l.id === draggedLead ? { ...l, etapa: novaEtapa } : l))
      )

      toast({
        title: 'Lead atualizado',
        description: `Lead movido para ${ETAPAS.find((e) => e.id === novaEtapa)?.label}`,
      })
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o lead',
        variant: 'destructive',
      })
    } finally {
      setDraggedLead(null)
    }
  }

  const getLeadsByEtapa = (etapa: string) => {
    let filtered = leads.filter((lead) => lead.etapa === etapa)
    
    // Aplicar filtro de busca se houver
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (lead) =>
          lead.nome?.toLowerCase().includes(query) ||
          lead.telefone?.toLowerCase().includes(query) ||
          (lead as any).email?.toLowerCase().includes(query)
      )
    }
    
    return filtered
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Carregando leads...</p>
      </div>
    )
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-8rem)]">
      {ETAPAS.map((etapa) => {
        const etapaLeads = getLeadsByEtapa(etapa.id)
        const isDragOver = dragOverColumn === etapa.id

        return (
          <Card
            key={etapa.id}
            className={cn(
              'min-w-[300px] max-w-[300px] flex flex-col',
              isDragOver && 'ring-2 ring-primary ring-offset-2'
            )}
            onDragOver={(e) => handleDragOver(e, etapa.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, etapa.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{etapa.label}</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {etapaLeads.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-3 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {etapaLeads.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      Nenhum lead
                    </div>
                  ) : (
                    etapaLeads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onDragStart={handleDragStart}
                        onClick={() => onLeadClick?.(lead)}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

