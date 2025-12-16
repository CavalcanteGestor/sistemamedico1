'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Search,
  Filter,
  Send,
  Eye,
  X,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Repeat,
  ArrowLeft,
  MessageSquare,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', color: 'bg-yellow-500', icon: Clock },
  enviado: { label: 'Enviado', color: 'bg-blue-500', icon: Send },
  cancelado: { label: 'Cancelado', color: 'bg-gray-500', icon: X },
  falhou: { label: 'Falhou', color: 'bg-red-500', icon: XCircle },
}

const TIPO_FOLLOW_UP_LABELS: Record<string, string> = {
  reativacao: 'Reativação',
  promocao: 'Promoção',
  lembrete_consulta: 'Lembrete de Consulta',
  orcamento: 'Orçamento não respondido',
  pos_consulta: 'Follow-up Pós-consulta',
  confirmacao: 'Confirmação de Presença',
  reagendamento: 'Reagendamento',
  oferta: 'Oferta Personalizada',
}

export default function FollowUpHistoricoPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [followUps, setFollowUps] = useState<any[]>([])
  const [filteredFollowUps, setFilteredFollowUps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFollowUp, setSelectedFollowUp] = useState<any | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Filtros
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [tipoFilter, setTipoFilter] = useState('todos')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [apenasRecorrentes, setApenasRecorrentes] = useState(false)

  useEffect(() => {
    loadFollowUps()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [followUps, searchQuery, statusFilter, tipoFilter, dataInicio, dataFim, apenasRecorrentes])

  const loadFollowUps = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('follow_ups')
        .select('*')
        .order('criado_em', { ascending: false })

      if (error) throw error
      setFollowUps(data || [])
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível carregar o histórico',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...followUps]

    // Filtro de busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (f) =>
          f.lead_nome?.toLowerCase().includes(query) ||
          f.lead_telefone?.toLowerCase().includes(query) ||
          f.mensagem?.toLowerCase().includes(query)
      )
    }

    // Filtro de status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter((f) => f.status === statusFilter)
    }

    // Filtro de tipo
    if (tipoFilter !== 'todos') {
      filtered = filtered.filter((f) => f.tipo_follow_up === tipoFilter)
    }

    // Filtro de data
    if (dataInicio) {
      filtered = filtered.filter((f) => {
        const data = new Date(f.criado_em)
        return data >= new Date(dataInicio)
      })
    }

    if (dataFim) {
      filtered = filtered.filter((f) => {
        const data = new Date(f.criado_em)
        const fim = new Date(dataFim)
        fim.setHours(23, 59, 59, 999)
        return data <= fim
      })
    }

    // Filtro de recorrentes
    if (apenasRecorrentes) {
      filtered = filtered.filter((f) => f.recorrente === true)
    }

    setFilteredFollowUps(filtered)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('todos')
    setTipoFilter('todos')
    setDataInicio('')
    setDataFim('')
    setApenasRecorrentes(false)
  }

  const handleCancel = async (followUpId: string) => {
    if (!confirm('Tem certeza que deseja cancelar este follow-up?')) return

    try {
      const response = await fetch('/api/follow-up/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followUpId }),
      })

      const result = await response.json()
      if (result.success) {
        toast({
          title: 'Sucesso',
          description: 'Follow-up cancelado com sucesso',
        })
        loadFollowUps()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível cancelar o follow-up',
        variant: 'destructive',
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pendente
    const Icon = config.icon

    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Histórico de Follow-ups</h1>
          <p className="text-muted-foreground mt-1">
            Visualize e gerencie todos os follow-ups criados
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone ou mensagem..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
                <SelectItem value="falhou">Falhou</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {Object.entries(TIPO_FOLLOW_UP_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" />
              Mais Filtros
            </Button>
            {(statusFilter !== 'todos' ||
              tipoFilter !== 'todos' ||
              dataInicio ||
              dataFim ||
              apenasRecorrentes) && (
              <Button variant="ghost" onClick={clearFilters}>
                Limpar
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div>
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div>
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="recorrentes"
                    checked={apenasRecorrentes}
                    onChange={(e) => setApenasRecorrentes(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="recorrentes">Apenas recorrentes</Label>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>
            Follow-ups ({filteredFollowUps.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : filteredFollowUps.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <p className="text-muted-foreground">Nenhum follow-up encontrado</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-24rem)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFollowUps.map((followUp) => (
                    <TableRow key={followUp.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{followUp.lead_nome || 'Sem nome'}</p>
                          <p className="text-sm text-muted-foreground">
                            {followUp.lead_telefone?.replace('@s.whatsapp.net', '')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {TIPO_FOLLOW_UP_LABELS[followUp.tipo_follow_up] || followUp.tipo_follow_up}
                        </Badge>
                        {followUp.recorrente && (
                          <Badge variant="secondary" className="ml-1">
                            <Repeat className="h-3 w-3 mr-1" />
                            Recorrente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">{followUp.mensagem}</div>
                      </TableCell>
                      <TableCell>{getStatusBadge(followUp.status)}</TableCell>
                      <TableCell>
                        {format(new Date(followUp.criado_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {followUp.enviado_em
                          ? format(new Date(followUp.enviado_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedFollowUp(followUp)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {followUp.status === 'pendente' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCancel(followUp.id)}
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Dialog de detalhes */}
      {selectedFollowUp && (
        <Dialog open={!!selectedFollowUp} onOpenChange={() => setSelectedFollowUp(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Follow-up</DialogTitle>
              <DialogDescription>Informações completas do follow-up</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Lead</Label>
                  <p className="text-sm font-medium">{selectedFollowUp.lead_nome || 'Sem nome'}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedFollowUp.lead_telefone?.replace('@s.whatsapp.net', '')}
                  </p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedFollowUp.status)}</div>
                </div>
                <div>
                  <Label>Tipo de Follow-up</Label>
                  <p className="text-sm">
                    {TIPO_FOLLOW_UP_LABELS[selectedFollowUp.tipo_follow_up] ||
                      selectedFollowUp.tipo_follow_up}
                  </p>
                </div>
                <div>
                  <Label>Tipo de Mensagem</Label>
                  <p className="text-sm capitalize">{selectedFollowUp.tipo_mensagem}</p>
                </div>
                <div>
                  <Label>Criado em</Label>
                  <p className="text-sm">
                    {format(new Date(selectedFollowUp.criado_em), 'dd/MM/yyyy HH:mm', {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                {selectedFollowUp.enviado_em && (
                  <div>
                    <Label>Enviado em</Label>
                    <p className="text-sm">
                      {format(new Date(selectedFollowUp.enviado_em), 'dd/MM/yyyy HH:mm', {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                )}
                {selectedFollowUp.agendado_para && (
                  <div>
                    <Label>Agendado para</Label>
                    <p className="text-sm">
                      {format(new Date(selectedFollowUp.agendado_para), 'dd/MM/yyyy HH:mm', {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                )}
                {selectedFollowUp.recorrente && (
                  <>
                    <div>
                      <Label>Recorrência</Label>
                      <p className="text-sm">
                        {selectedFollowUp.tipo_recorrencia === 'diario'
                          ? 'Diário'
                          : selectedFollowUp.tipo_recorrencia === 'semanal'
                          ? 'Semanal'
                          : 'Mensal'}
                        {' a cada '}
                        {selectedFollowUp.intervalo_recorrencia}
                        {selectedFollowUp.tipo_recorrencia === 'diario'
                          ? ' dia(s)'
                          : selectedFollowUp.tipo_recorrencia === 'semanal'
                          ? ' semana(s)'
                          : ' mês(es)'}
                      </p>
                    </div>
                    {selectedFollowUp.proxima_execucao && (
                      <div>
                        <Label>Próxima Execução</Label>
                        <p className="text-sm">
                          {format(new Date(selectedFollowUp.proxima_execucao), 'dd/MM/yyyy HH:mm', {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <Label>Mensagem</Label>
                <ScrollArea className="h-32 border rounded-md p-3 mt-2">
                  <p className="text-sm whitespace-pre-wrap">{selectedFollowUp.mensagem}</p>
                </ScrollArea>
              </div>

              {selectedFollowUp.observacoes && (
                <div>
                  <Label>Observações</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedFollowUp.observacoes}
                  </p>
                </div>
              )}

              {selectedFollowUp.resposta_recebida && selectedFollowUp.resposta_em && (
                <div className="bg-green-50 dark:bg-green-950 p-3 rounded-md">
                  <Label className="text-green-900 dark:text-green-100">
                    Resposta recebida em{' '}
                    {format(new Date(selectedFollowUp.resposta_em), 'dd/MM/yyyy HH:mm', {
                      locale: ptBR,
                    })}
                  </Label>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

