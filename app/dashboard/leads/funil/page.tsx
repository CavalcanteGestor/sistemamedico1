'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { KanbanBoard } from '@/components/leads/kanban-board'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Search,
  Eye,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  TrendingUp,
  Download,
  FileText,
  Users,
  Kanban,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

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
  contexto?: string
  email?: string
  observacoes?: string
  data_criacao?: string
  created_at?: string
}

const ETAPA_COLORS: Record<string, string> = {
  primeiro_contato: 'bg-blue-500',
  interesse: 'bg-yellow-500',
  agendado: 'bg-green-500',
  confirmou_presenca: 'bg-purple-500',
  compareceu: 'bg-emerald-500',
  realizado: 'bg-gray-600',
  followup: 'bg-orange-500',
}

const ETAPA_LABELS: Record<string, string> = {
  primeiro_contato: 'Primeiro Contato',
  interesse: 'Interesse',
  agendado: 'Agendado',
  confirmou_presenca: 'Confirmou Presença',
  compareceu: 'Compareceu',
  realizado: 'Realizado',
  followup: 'Follow-up',
}

export default function FunilKanbanPage() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    primeiro_contato: 0,
    interesse: 0,
    agendado: 0,
    convertidos: 0,
  })
  const supabase = createClient()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('leads')
        .select('etapa')

      if (error) throw error
      
      const leadsData = data || []
      setStats({
        total: leadsData.length,
        primeiro_contato: leadsData.filter(l => l.etapa === 'primeiro_contato').length,
        interesse: leadsData.filter(l => l.etapa === 'interesse').length,
        agendado: leadsData.filter(l => l.etapa === 'agendado').length,
        convertidos: leadsData.filter(l => ['compareceu', 'realizado'].includes(l.etapa)).length,
      })
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível carregar as estatísticas',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLeadClick = (lead: Lead) => {
    // Carregar dados completos do lead
    loadLeadDetails(lead.id)
  }

  const loadLeadDetails = async (leadId: string) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single()

      if (error) throw error
      setSelectedLead(data)
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os detalhes do lead',
        variant: 'destructive',
      })
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR })
    } catch {
      return '-'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Funil de Leads</h1>
          <p className="text-muted-foreground mt-1">
            Visualize e gerencie seus leads através do funil de vendas (Kanban)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/leads')}>
            <FileText className="h-4 w-4 mr-2" />
            Ver Tabela
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/leads/follow-up')}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Follow-up
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/leads')}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Gerenciados pela IA
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Primeiro Contato</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.primeiro_contato}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.primeiro_contato / stats.total) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Interesse</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.interesse}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.interesse / stats.total) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Convertidos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.convertidos}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.convertidos / stats.total) * 100) : 0}% conversão
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {searchQuery && (
              <Button variant="ghost" onClick={() => setSearchQuery('')}>
                Limpar Busca
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <Card>
        <CardHeader>
          <CardTitle>Funil Kanban</CardTitle>
        </CardHeader>
        <CardContent>
          <KanbanBoard onLeadClick={handleLeadClick} searchQuery={searchQuery} />
        </CardContent>
      </Card>

      {/* Dialog de Detalhes do Lead */}
      {selectedLead && (
        <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedLead.nome || 'Lead'}</DialogTitle>
              <DialogDescription>
                Lead gerenciado pela IA - {ETAPA_LABELS[selectedLead.etapa] || selectedLead.etapa}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Badge de Status de Conversão */}
              {selectedLead.status === 'convertido' && (
                <div className="mb-4">
                  <Badge className="bg-emerald-500 text-white text-base py-2 px-4">
                    ✓ Lead Convertido em Paciente
                  </Badge>
                </div>
              )}

              {/* Informações Principais */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Telefone
                  </Label>
                  <p className="text-sm font-medium mt-1">
                    {selectedLead.telefone?.replace('@s.whatsapp.net', '')}
                  </p>
                </div>
                {selectedLead.email && (
                  <div>
                    <Label className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <p className="text-sm font-medium mt-1">{selectedLead.email}</p>
                  </div>
                )}
                <div>
                  <Label>Etapa Atual</Label>
                  <div className="mt-1">
                    <Badge className={`${ETAPA_COLORS[selectedLead.etapa] || 'bg-gray-500'} text-white`}>
                      {ETAPA_LABELS[selectedLead.etapa] || selectedLead.etapa}
                    </Badge>
                  </div>
                </div>
                {selectedLead.status && (
                  <div>
                    <Label>Status</Label>
                    <Badge 
                      variant={selectedLead.status === 'convertido' ? 'default' : 'secondary'} 
                      className={selectedLead.status === 'convertido' ? 'bg-emerald-500 mt-1' : 'mt-1'}
                    >
                      {selectedLead.status}
                    </Badge>
                  </div>
                )}
                {selectedLead.origem && (
                  <div>
                    <Label>Origem</Label>
                    <Badge variant="secondary" className="mt-1">
                      {selectedLead.origem}
                    </Badge>
                  </div>
                )}
                <div>
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data Criação
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(selectedLead.data_criacao || selectedLead.created_at)}
                  </p>
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Última Mensagem
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(selectedLead.data_ultima_msg)}
                  </p>
                </div>
              </div>

              {/* Interesse */}
              {selectedLead.interesse && (
                <div>
                  <Label>Interesses</Label>
                  <div className="mt-2 p-3 bg-muted rounded-md">
                    <p className="text-sm">{selectedLead.interesse}</p>
                  </div>
                </div>
              )}

              {/* Contexto da IA */}
              {selectedLead.contexto && (
                <div>
                  <Label className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Contexto da IA (Histórico da Conversa)
                  </Label>
                  <ScrollArea className="h-48 border rounded-md p-4 mt-2 bg-muted/50">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {selectedLead.contexto}
                    </p>
                  </ScrollArea>
                </div>
              )}

              {/* Última Mensagem */}
              {selectedLead.mensagem && (
                <div>
                  <Label>Última Mensagem do Lead</Label>
                  <div className="mt-2 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                    <p className="text-sm">{selectedLead.mensagem}</p>
                  </div>
                </div>
              )}

              {/* Observações */}
              {selectedLead.observacoes && (
                <div>
                  <Label>Observações</Label>
                  <p className="text-sm text-muted-foreground mt-2">{selectedLead.observacoes}</p>
                </div>
              )}

              {/* Ações Rápidas */}
              <div className="flex gap-2 pt-4 border-t flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => {
                    router.push(`/dashboard/whatsapp`)
                    setSelectedLead(null)
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Abrir WhatsApp
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    router.push('/dashboard/leads/follow-up')
                    setSelectedLead(null)
                  }}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Criar Follow-up
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    router.push('/dashboard/orcamentos/novo')
                    setSelectedLead(null)
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Criar Orçamento
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

