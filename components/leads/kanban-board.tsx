'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LeadCard } from './lead-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

interface KanbanColumn {
  id: string
  column_key: string
  column_label: string
  column_color: string
  column_order: number
  is_active: boolean
}

const ETAPAS_PADRAO = [
  { id: 'primeiro_contato', label: 'Primeiro Contato', color: 'bg-blue-500' },
  { id: 'interesse', label: 'Interesse', color: 'bg-yellow-500' },
  { id: 'agendado', label: 'Agendado', color: 'bg-green-500' },
  { id: 'confirmou_presenca', label: 'Confirmou Presença', color: 'bg-purple-500' },
  { id: 'compareceu', label: 'Compareceu', color: 'bg-emerald-500' },
]

const CORES_DISPONIVEIS = [
  { value: 'bg-blue-500', label: 'Azul' },
  { value: 'bg-yellow-500', label: 'Amarelo' },
  { value: 'bg-green-500', label: 'Verde' },
  { value: 'bg-purple-500', label: 'Roxo' },
  { value: 'bg-emerald-500', label: 'Esmeralda' },
  { value: 'bg-orange-500', label: 'Laranja' },
  { value: 'bg-red-500', label: 'Vermelho' },
  { value: 'bg-pink-500', label: 'Rosa' },
  { value: 'bg-indigo-500', label: 'Índigo' },
  { value: 'bg-gray-500', label: 'Cinza' },
]

interface KanbanBoardProps {
  onLeadClick?: (lead: Lead) => void
  searchQuery?: string
}

export function KanbanBoard({ onLeadClick, searchQuery = '' }: KanbanBoardProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [columns, setColumns] = useState<KanbanColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedLead, setDraggedLead] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [showCreateColumn, setShowCreateColumn] = useState(false)
  const [newColumn, setNewColumn] = useState({ label: '', color: 'bg-blue-500', key: '' })
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadColumns()
    loadLeads()
    subscribeToLeads()
  }, [])

  const loadColumns = async () => {
    try {
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('kanban_type', 'leads')
        .eq('is_active', true)
        .order('column_order', { ascending: true })

      if (error) throw error
      
      if (data && data.length > 0) {
        setColumns(data)
      } else {
        // Usar etapas padrão se não houver colunas no banco
        const etapasPadrao = ETAPAS_PADRAO.map((etapa, index) => ({
          id: etapa.id,
          column_key: etapa.id,
          column_label: etapa.label,
          column_color: etapa.color,
          column_order: index + 1,
          is_active: true,
        }))
        setColumns(etapasPadrao)
      }
    } catch (error: any) {
      console.error('Erro ao carregar colunas:', error)
      // Fallback para etapas padrão
      const etapasPadrao = ETAPAS_PADRAO.map((etapa, index) => ({
        id: etapa.id,
        column_key: etapa.id,
        column_label: etapa.label,
        column_color: etapa.color,
        column_order: index + 1,
        is_active: true,
      }))
      setColumns(etapasPadrao)
    }
  }

  const subscribeToColumns = () => {
    const channel = supabase
      .channel('kanban-columns')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kanban_columns',
          filter: `kanban_type=eq.leads`,
        },
        () => {
          loadColumns()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }

  useEffect(() => {
    subscribeToColumns()
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

      const column = columns.find((c) => c.column_key === novaEtapa)
      toast({
        title: 'Lead atualizado',
        description: `Lead movido para ${column?.column_label || novaEtapa}`,
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

  const handleCreateColumn = async () => {
    if (!newColumn.label.trim() || !newColumn.key.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha o nome e a chave da coluna',
        variant: 'destructive',
      })
      return
    }

    try {
      const maxOrder = columns.length > 0 
        ? Math.max(...columns.map(c => c.column_order)) 
        : 0

      const columnKey = newColumn.key.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')

      // Verificar se a chave já existe
      const { data: existing } = await supabase
        .from('kanban_columns')
        .select('id')
        .eq('kanban_type', 'leads')
        .eq('column_key', columnKey)
        .single()

      if (existing) {
        toast({
          title: 'Erro',
          description: 'Já existe uma coluna com esta chave',
          variant: 'destructive',
        })
        return
      }

      const { error } = await supabase
        .from('kanban_columns')
        .insert({
          id: crypto.randomUUID(),
          kanban_type: 'leads',
          column_key: columnKey,
          column_label: newColumn.label,
          column_color: newColumn.color,
          column_order: maxOrder + 1,
          is_active: true,
          status_value: columnKey,
        })

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Coluna criada com sucesso',
      })

      setShowCreateColumn(false)
      setNewColumn({ label: '', color: 'bg-blue-500', key: '' })
      loadColumns()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar a coluna',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Carregando leads...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-8rem)]">
        {columns.map((column) => {
          const etapaLeads = getLeadsByEtapa(column.column_key)
          const isDragOver = dragOverColumn === column.column_key

          return (
            <Card
              key={column.id}
              className={cn(
                'min-w-[300px] max-w-[300px] flex flex-col',
                isDragOver && 'ring-2 ring-primary ring-offset-2'
              )}
              onDragOver={(e) => handleDragOver(e, column.column_key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.column_key)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-3 h-3 rounded-full', column.column_color)} />
                    <CardTitle className="text-sm font-semibold">{column.column_label}</CardTitle>
                  </div>
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

        {/* Botão para criar nova coluna */}
        <Dialog open={showCreateColumn} onOpenChange={setShowCreateColumn}>
          <DialogTrigger asChild>
            <Card className="min-w-[300px] max-w-[300px] flex flex-col border-dashed border-2 hover:border-primary/50 cursor-pointer transition-colors">
              <CardContent className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                  <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Adicionar Coluna</p>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Coluna</DialogTitle>
              <DialogDescription>
                Adicione uma nova etapa ao funil kanban de leads
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="label">Nome da Coluna</Label>
                <Input
                  id="label"
                  placeholder="Ex: Em Negociação"
                  value={newColumn.label}
                  onChange={(e) => setNewColumn({ ...newColumn, label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="key">Chave (ID interno)</Label>
                <Input
                  id="key"
                  placeholder="Ex: em_negociacao"
                  value={newColumn.key}
                  onChange={(e) => setNewColumn({ ...newColumn, key: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Use apenas letras minúsculas, números e underscores
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Cor</Label>
                <Select
                  value={newColumn.color}
                  onValueChange={(value) => setNewColumn({ ...newColumn, color: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CORES_DISPONIVEIS.map((cor) => (
                      <SelectItem key={cor.value} value={cor.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn('w-4 h-4 rounded-full', cor.value)} />
                          {cor.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateColumn} className="w-full">
                Criar Coluna
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

