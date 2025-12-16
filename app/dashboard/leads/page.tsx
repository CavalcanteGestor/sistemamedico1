'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import {
  Search,
  Eye,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  TrendingUp,
  Download,
  Filter,
  Users,
  Kanban,
  FileText,
  Loader2,
  AlertCircle,
  Clock,
  Edit,
  Save,
  X,
  CheckCircle2,
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface Lead {
  id: string
  nome: string
  telefone: string
  etapa: string
  contexto?: string
  mensagem?: string
  data_ultima_msg?: string
  interesse?: string
  email?: string
  status?: string
  origem?: string
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

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [etapaFilter, setEtapaFilter] = useState('')
  const [origemFilter, setOrigemFilter] = useState('')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showConvertDialog, setShowConvertDialog] = useState(false)
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null)
  const [cpf, setCpf] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [converting, setConverting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingLead, setEditingLead] = useState<Partial<Lead>>({})
  const [saving, setSaving] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [leadPatientInfo, setLeadPatientInfo] = useState<{ isPatient: boolean; patient: any } | null>(null)
  const [loadingPatientInfo, setLoadingPatientInfo] = useState(false)
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
    loadUserRole()
    loadLeads()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [leads, searchQuery, etapaFilter, origemFilter])

  useEffect(() => {
    if (selectedLead) {
      checkIfPatient(selectedLead.id)
      if (isEditing) {
        setEditingLead(selectedLead)
      } else {
        setEditingLead({})
      }
    }
  }, [selectedLead, isEditing])

  const loadUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      setUserRole(profile?.role || null)
    } catch (error) {
      console.error('Erro ao carregar role:', error)
    }
  }

  const checkIfPatient = async (leadId: string) => {
    try {
      setLoadingPatientInfo(true)
      const response = await fetch(`/api/leads/${leadId}`)
      const data = await response.json()

      if (data.success) {
        setLeadPatientInfo({
          isPatient: data.isPatient,
          patient: data.patient,
        })
      }
    } catch (error) {
      console.error('Erro ao verificar se é paciente:', error)
    } finally {
      setLoadingPatientInfo(false)
    }
  }

  const handleSaveLead = async () => {
    if (!selectedLead) return

    try {
      setSaving(true)
      const response = await fetch(`/api/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingLead),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Lead atualizado!',
          description: 'As alterações foram salvas com sucesso',
        })
        setIsEditing(false)
        loadLeads()
        setSelectedLead(data.data)
      } else {
        throw new Error(data.error || 'Erro ao atualizar')
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o lead',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEditClick = () => {
    setIsEditing(true)
    setEditingLead(selectedLead || {})
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditingLead({})
  }

  const canEdit = userRole === 'admin' || userRole === 'recepcionista' || userRole === 'desenvolvedor'

  const loadLeads = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('data_ultima_msg', { ascending: false, nullsFirst: false })

      if (error) throw error
      
      setLeads(data || [])
      calculateStats(data || [])
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

  const calculateStats = (leadsData: Lead[]) => {
    setStats({
      total: leadsData.length,
      primeiro_contato: leadsData.filter(l => l.etapa === 'primeiro_contato').length,
      interesse: leadsData.filter(l => l.etapa === 'interesse').length,
      agendado: leadsData.filter(l => l.etapa === 'agendado').length,
      convertidos: leadsData.filter(l => ['compareceu', 'realizado'].includes(l.etapa)).length,
    })
  }

  const applyFilters = () => {
    let filtered = [...leads]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (lead) =>
          lead.nome?.toLowerCase().includes(query) ||
          lead.telefone?.toLowerCase().includes(query) ||
          lead.email?.toLowerCase().includes(query)
      )
    }

    if (etapaFilter) {
      filtered = filtered.filter((lead) => lead.etapa === etapaFilter)
    }

    if (origemFilter) {
      filtered = filtered.filter((lead) => 
        lead.origem?.toLowerCase().includes(origemFilter.toLowerCase())
      )
    }

    setFilteredLeads(filtered)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setEtapaFilter('')
    setOrigemFilter('')
  }

  const exportToCSV = () => {
    const headers = ['ID', 'Nome', 'Telefone', 'Email', 'Etapa', 'Interesse', 'Origem', 'Status', 'Última Mensagem']
    const rows = filteredLeads.map((lead) => [
      lead.id,
      lead.nome || '',
      lead.telefone?.replace('@s.whatsapp.net', '') || '',
      lead.email || '',
      lead.etapa || '',
      lead.interesse || '',
      lead.origem || '',
      lead.status || '',
      lead.data_ultima_msg || '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `leads-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR })
    } catch {
      return '-'
    }
  }

  const getDaysSinceLastMessage = (dateString?: string) => {
    if (!dateString) return null
    try {
      const days = differenceInDays(new Date(), new Date(dateString))
      return days
    } catch {
      return null
    }
  }

  const getDaysAlert = (days: number | null) => {
    if (!days) return null
    if (days >= 14) return { color: 'text-red-500', label: `${days}d sem resposta`, icon: AlertCircle }
    if (days >= 7) return { color: 'text-orange-500', label: `${days}d sem resposta`, icon: Clock }
    if (days >= 3) return { color: 'text-yellow-600', label: `${days}d`, icon: Clock }
    return null
  }

  const handleConvertToPatient = async () => {
    if (!convertingLead || !cpf || !birthDate) {
      toast({
        title: 'Erro',
        description: 'Preencha CPF e data de nascimento',
        variant: 'destructive',
      })
      return
    }

    try {
      setConverting(true)

      const response = await fetch('/api/leads/convert-to-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: convertingLead.id,
          cpf,
          birthDate,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Lead convertido!',
          description: 'Lead foi convertido em paciente com sucesso',
        })
        setShowConvertDialog(false)
        setConvertingLead(null)
        setCpf('')
        setBirthDate('')
        loadLeads()
        
        // Redirecionar para página do paciente
        router.push(`/dashboard/pacientes/${data.patientId}`)
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível converter lead',
        variant: 'destructive',
      })
    } finally {
      setConverting(false)
    }
  }

  const openConvertDialog = (lead: Lead) => {
    setConvertingLead(lead)
    setShowConvertDialog(true)
    setSelectedLead(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Leads</h1>
          <p className="text-muted-foreground mt-1">
            Todos os leads gerenciados pela IA
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/leads/funil')}>
            <Kanban className="h-4 w-4 mr-2" />
            Ver Kanban
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/leads/follow-up')}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Follow-up
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
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

      {/* Filtros Rápidos */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">Filtros Rápidos:</span>
              <Button
                variant={etapaFilter === 'interesse' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEtapaFilter(etapaFilter === 'interesse' ? '' : 'interesse')}
              >
                Com Interesse ({stats.interesse})
              </Button>
              <Button
                variant={etapaFilter === 'primeiro_contato' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEtapaFilter(etapaFilter === 'primeiro_contato' ? '' : 'primeiro_contato')}
              >
                Primeiro Contato ({stats.primeiro_contato})
              </Button>
              <Button
                variant={etapaFilter === 'agendado' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEtapaFilter(etapaFilter === 'agendado' ? '' : 'agendado')}
              >
                Agendados ({stats.agendado})
              </Button>
            </div>
            
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
              <Select value={etapaFilter || 'todas'} onValueChange={(value) => setEtapaFilter(value === 'todas' ? '' : value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todas as etapas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as etapas</SelectItem>
                  <SelectItem value="primeiro_contato">Primeiro Contato</SelectItem>
                  <SelectItem value="interesse">Interesse</SelectItem>
                  <SelectItem value="agendado">Agendado</SelectItem>
                  <SelectItem value="confirmou_presenca">Confirmou Presença</SelectItem>
                  <SelectItem value="compareceu">Compareceu</SelectItem>
                  <SelectItem value="realizado">Realizado</SelectItem>
                  <SelectItem value="followup">Follow-up</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Filtrar por origem..."
                value={origemFilter}
                onChange={(e) => setOrigemFilter(e.target.value)}
                className="w-[200px]"
              />
              {(searchQuery || etapaFilter || origemFilter) && (
                <Button variant="ghost" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Leads */}
      <Card>
        <CardHeader>
          <CardTitle>Leads ({filteredLeads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Carregando leads...</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum lead encontrado</p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Interesse</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Última Mensagem</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {lead.nome || 'Sem nome'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {lead.telefone?.replace('@s.whatsapp.net', '')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${ETAPA_COLORS[lead.etapa] || 'bg-gray-500'} text-white`}>
                          {ETAPA_LABELS[lead.etapa] || lead.etapa}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {lead.status === 'convertido' ? (
                          <Badge className="bg-emerald-500 text-white text-xs">
                            Convertido
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Ativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.interesse ? (
                          <Badge variant="outline" className="text-xs">
                            {lead.interesse.slice(0, 30)}
                            {lead.interesse.length > 30 ? '...' : ''}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.origem ? (
                          <Badge variant="secondary" className="text-xs">
                            {lead.origem}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-muted-foreground">
                            {formatDate(lead.data_ultima_msg)}
                          </span>
                          {(() => {
                            const days = getDaysSinceLastMessage(lead.data_ultima_msg)
                            const alert = getDaysAlert(days)
                            if (alert) {
                              const AlertIcon = alert.icon
                              return (
                                <div className={`flex items-center gap-1 ${alert.color} text-xs`}>
                                  <AlertIcon className="h-3 w-3" />
                                  <span>{alert.label}</span>
                                </div>
                              )
                            }
                            return null
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLead(lead)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedLead(lead)
                                setIsEditing(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalhes do Lead */}
      {selectedLead && (
        <Dialog 
          open={!!selectedLead} 
          onOpenChange={() => {
            setSelectedLead(null)
            setIsEditing(false)
            setEditingLead({})
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>{isEditing ? 'Editar Lead' : (selectedLead.nome || 'Lead')}</DialogTitle>
                  <DialogDescription>
                    {isEditing ? 'Edite as informações do lead' : `Lead gerenciado pela IA - ${ETAPA_LABELS[selectedLead.etapa] || selectedLead.etapa}`}
                  </DialogDescription>
                </div>
                {canEdit && !isEditing && (
                  <Button variant="outline" size="sm" onClick={handleEditClick}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                )}
              </div>
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

              {/* Informação de Paciente Existente */}
              {loadingPatientInfo ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando se é paciente...
                </div>
              ) : leadPatientInfo?.isPatient && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">
                        Este lead já possui cadastro como paciente
                      </p>
                      {leadPatientInfo.patient && (
                        <p className="text-xs text-blue-700 mt-1">
                          Nome: {leadPatientInfo.patient.name} | CPF: {leadPatientInfo.patient.cpf}
                        </p>
                      )}
                      {leadPatientInfo.patient && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            router.push(`/dashboard/pacientes/${leadPatientInfo.patient.id}`)
                            setSelectedLead(null)
                          }}
                        >
                          Ver Paciente
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Informações Principais */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Nome
                  </Label>
                  {isEditing ? (
                    <Input
                      value={editingLead.nome || ''}
                      onChange={(e) => setEditingLead({ ...editingLead, nome: e.target.value })}
                      className="mt-1"
                      placeholder="Nome do lead"
                    />
                  ) : (
                    <p className="text-sm font-medium mt-1">{selectedLead.nome || 'Sem nome'}</p>
                  )}
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Telefone
                  </Label>
                  {isEditing ? (
                    <Input
                      value={editingLead.telefone?.replace('@s.whatsapp.net', '') || ''}
                      onChange={(e) => setEditingLead({ ...editingLead, telefone: e.target.value })}
                      className="mt-1"
                      placeholder="Telefone"
                    />
                  ) : (
                    <p className="text-sm font-medium mt-1">
                      {selectedLead.telefone?.replace('@s.whatsapp.net', '')}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={editingLead.email || ''}
                      onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                      className="mt-1"
                      placeholder="Email"
                    />
                  ) : selectedLead.email ? (
                    <p className="text-sm font-medium mt-1">{selectedLead.email}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">-</p>
                  )}
                </div>
                <div>
                  <Label>Etapa Atual</Label>
                  {isEditing ? (
                    <Select
                      value={editingLead.etapa || selectedLead.etapa}
                      onValueChange={(value) => setEditingLead({ ...editingLead, etapa: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ETAPA_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-1">
                      <Badge className={`${ETAPA_COLORS[selectedLead.etapa] || 'bg-gray-500'} text-white`}>
                        {ETAPA_LABELS[selectedLead.etapa] || selectedLead.etapa}
                      </Badge>
                    </div>
                  )}
                </div>
                <div>
                  <Label>Status</Label>
                  {isEditing ? (
                    <Select
                      value={editingLead.status || selectedLead.status || 'ativo'}
                      onValueChange={(value) => setEditingLead({ ...editingLead, status: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="convertido">Convertido</SelectItem>
                        <SelectItem value="perdido">Perdido</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : selectedLead.status ? (
                    <Badge 
                      variant={selectedLead.status === 'convertido' ? 'default' : 'secondary'} 
                      className={selectedLead.status === 'convertido' ? 'bg-emerald-500 mt-1' : 'mt-1'}
                    >
                      {selectedLead.status}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="mt-1">Ativo</Badge>
                  )}
                </div>
                <div>
                  <Label>Origem</Label>
                  {isEditing ? (
                    <Input
                      value={editingLead.origem || ''}
                      onChange={(e) => setEditingLead({ ...editingLead, origem: e.target.value })}
                      className="mt-1"
                      placeholder="Origem do lead"
                    />
                  ) : selectedLead.origem ? (
                    <Badge variant="secondary" className="mt-1">
                      {selectedLead.origem}
                    </Badge>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">-</p>
                  )}
                </div>
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
              <div>
                <Label>Interesses</Label>
                {isEditing ? (
                  <Textarea
                    value={editingLead.interesse || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, interesse: e.target.value })}
                    className="mt-1"
                    placeholder="Interesses do lead"
                    rows={3}
                  />
                ) : selectedLead.interesse ? (
                  <div className="mt-2 p-3 bg-muted rounded-md">
                    <p className="text-sm">{selectedLead.interesse}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">-</p>
                )}
              </div>

              {/* Contexto da IA */}
              {selectedLead.contexto && (
                <div>
                  <Label className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Contexto da IA (Histórico da Conversa)
                  </Label>
                  {isEditing ? (
                    <Textarea
                      value={editingLead.contexto || selectedLead.contexto || ''}
                      onChange={(e) => setEditingLead({ ...editingLead, contexto: e.target.value })}
                      className="mt-1"
                      placeholder="Contexto da conversa"
                      rows={6}
                    />
                  ) : (
                    <ScrollArea className="h-48 border rounded-md p-4 mt-2 bg-muted/50">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {selectedLead.contexto}
                      </p>
                    </ScrollArea>
                  )}
                </div>
              )}

              {/* Última Mensagem */}
              {selectedLead.mensagem && (
                <div>
                  <Label>Última Mensagem do Lead</Label>
                  {isEditing ? (
                    <Textarea
                      value={editingLead.mensagem || selectedLead.mensagem || ''}
                      onChange={(e) => setEditingLead({ ...editingLead, mensagem: e.target.value })}
                      className="mt-1"
                      placeholder="Última mensagem"
                      rows={3}
                    />
                  ) : (
                    <div className="mt-2 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                      <p className="text-sm">{selectedLead.mensagem}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Observações */}
              <div>
                <Label>Observações</Label>
                {isEditing ? (
                  <Textarea
                    value={editingLead.observacoes || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, observacoes: e.target.value })}
                    className="mt-1"
                    placeholder="Observações adicionais"
                    rows={4}
                  />
                ) : selectedLead.observacoes ? (
                  <p className="text-sm text-muted-foreground mt-2">{selectedLead.observacoes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">-</p>
                )}
              </div>

              {/* Ações Rápidas */}
              <div className="flex gap-2 pt-4 border-t flex-wrap">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={saving}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveLead}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Salvar Alterações
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
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
                    {selectedLead.status !== 'convertido' && (
                      <Button
                        onClick={() => openConvertDialog(selectedLead)}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Converter em Paciente
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog de Converter em Paciente */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Converter Lead em Paciente</DialogTitle>
            <DialogDescription>
              Preencha os dados necessários para criar o cadastro de paciente
            </DialogDescription>
          </DialogHeader>

          {convertingLead && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Nome</Label>
                <p className="text-sm font-medium mt-1">{convertingLead.nome}</p>
              </div>

              <div>
                <Label>Telefone</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {convertingLead.telefone?.replace('@s.whatsapp.net', '')}
                </p>
              </div>

              {convertingLead.email && (
                <div>
                  <Label>Email</Label>
                  <p className="text-sm text-muted-foreground mt-1">{convertingLead.email}</p>
                </div>
              )}

              <div>
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="birthDate">Data de Nascimento *</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>Atenção:</strong> O lead será marcado como convertido e um novo cadastro de paciente será criado.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowConvertDialog(false)
                setConvertingLead(null)
                setCpf('')
                setBirthDate('')
              }}
              disabled={converting}
            >
              Cancelar
            </Button>
            <Button onClick={handleConvertToPatient} disabled={converting || !cpf || !birthDate}>
              {converting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Convertendo...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Converter em Paciente
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

