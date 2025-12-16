'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Eye, Send, Search, FileText, Calendar, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface Orcamento {
  id: string
  lead_id?: string
  lead_telefone: string
  lead_nome?: string
  procedimentos: any[]
  valores: any
  valor_total: number
  validade_ate?: string
  status: string
  enviado_em?: string
  respondido_em?: string
  criado_em: string
  observacoes?: string
}

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', color: 'bg-yellow-500' },
  enviado: { label: 'Enviado', color: 'bg-blue-500' },
  aceito: { label: 'Aceito', color: 'bg-green-500' },
  recusado: { label: 'Recusado', color: 'bg-red-500' },
  expirado: { label: 'Expirado', color: 'bg-gray-500' },
}

export default function OrcamentosPage() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [filteredOrcamentos, setFilteredOrcamentos] = useState<Orcamento[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [selectedOrcamento, setSelectedOrcamento] = useState<Orcamento | null>(null)
  const [sending, setSending] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    loadOrcamentos()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [orcamentos, searchQuery, statusFilter])

  const loadOrcamentos = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/orcamentos')
      const data = await response.json()

      if (data.success) {
        setOrcamentos(data.data)
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível carregar orçamentos',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...orcamentos]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (orc) =>
          orc.lead_nome?.toLowerCase().includes(query) ||
          orc.lead_telefone?.toLowerCase().includes(query)
      )
    }

    if (statusFilter && statusFilter !== 'todos') {
      filtered = filtered.filter((orc) => orc.status === statusFilter)
    }

    setFilteredOrcamentos(filtered)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const handleSendOrcamento = async (orcamentoId: string) => {
    try {
      setSending(true)
      const response = await fetch('/api/orcamentos/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orcamentoId }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Orçamento enviado!',
          description: 'Orçamento enviado via WhatsApp com sucesso',
        })
        loadOrcamentos()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível enviar orçamento',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orçamentos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie orçamentos enviados para leads
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/orcamentos/novo')}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Orçamento
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="aceito">Aceito</SelectItem>
                <SelectItem value="recusado">Recusado</SelectItem>
                <SelectItem value="expirado">Expirado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de orçamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Orçamentos ({filteredOrcamentos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Carregando orçamentos...</p>
            </div>
          ) : filteredOrcamentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum orçamento encontrado</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push('/dashboard/orcamentos/novo')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Orçamento
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Procedimentos</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Data Criação</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrcamentos.map((orcamento) => {
                  const statusConfig = STATUS_CONFIG[orcamento.status as keyof typeof STATUS_CONFIG]
                  
                  return (
                    <TableRow key={orcamento.id}>
                      <TableCell className="font-medium">
                        {orcamento.lead_nome || 'Sem nome'}
                      </TableCell>
                      <TableCell>
                        {orcamento.lead_telefone?.replace('@s.whatsapp.net', '')}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {orcamento.procedimentos.slice(0, 2).map((proc: any, idx: number) => (
                            <span key={idx} className="text-sm">
                              {proc.nome}
                            </span>
                          ))}
                          {orcamento.procedimentos.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{orcamento.procedimentos.length - 2} mais
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(orcamento.valor_total)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusConfig.color} text-white`}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {orcamento.validade_ate
                          ? format(new Date(orcamento.validade_ate), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(orcamento.criado_em), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedOrcamento(orcamento)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {orcamento.status === 'pendente' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendOrcamento(orcamento.id)}
                              disabled={sending}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de detalhes do orçamento */}
      {selectedOrcamento && (
        <Dialog open={!!selectedOrcamento} onOpenChange={() => setSelectedOrcamento(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Orçamento</DialogTitle>
              <DialogDescription>
                Orçamento para {selectedOrcamento.lead_nome}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cliente</Label>
                  <p className="text-sm">{selectedOrcamento.lead_nome || 'Sem nome'}</p>
                </div>
                <div>
                  <Label>Telefone</Label>
                  <p className="text-sm">{selectedOrcamento.lead_telefone?.replace('@s.whatsapp.net', '')}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={`${STATUS_CONFIG[selectedOrcamento.status as keyof typeof STATUS_CONFIG].color} text-white`}>
                    {STATUS_CONFIG[selectedOrcamento.status as keyof typeof STATUS_CONFIG].label}
                  </Badge>
                </div>
                <div>
                  <Label>Valor Total</Label>
                  <p className="text-lg font-semibold">{formatCurrency(selectedOrcamento.valor_total)}</p>
                </div>
              </div>

              <div>
                <Label>Procedimentos</Label>
                <div className="mt-2 space-y-2">
                  {selectedOrcamento.procedimentos.map((proc: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-muted rounded-md">
                      <div>
                        <p className="font-medium">{proc.nome}</p>
                        {proc.descricao && (
                          <p className="text-sm text-muted-foreground">{proc.descricao}</p>
                        )}
                      </div>
                      <p className="font-semibold">{formatCurrency(proc.valor)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrcamento.valores.desconto && selectedOrcamento.valores.desconto > 0 && (
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-md">
                  <p className="text-sm font-medium text-green-700">Desconto</p>
                  <p className="text-sm font-semibold text-green-700">
                    -{formatCurrency(selectedOrcamento.valores.desconto)}
                  </p>
                </div>
              )}

              {selectedOrcamento.validade_ate && (
                <div>
                  <Label>Validade</Label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedOrcamento.validade_ate), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
              )}

              {selectedOrcamento.observacoes && (
                <div>
                  <Label>Observações</Label>
                  <p className="text-sm text-muted-foreground mt-2">{selectedOrcamento.observacoes}</p>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Criado em: {format(new Date(selectedOrcamento.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  {selectedOrcamento.enviado_em && (
                    <p className="text-sm text-muted-foreground">
                      Enviado em: {format(new Date(selectedOrcamento.enviado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </div>
                {selectedOrcamento.status === 'pendente' && (
                  <Button
                    onClick={() => {
                      handleSendOrcamento(selectedOrcamento.id)
                      setSelectedOrcamento(null)
                    }}
                    disabled={sending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Enviar via WhatsApp
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

