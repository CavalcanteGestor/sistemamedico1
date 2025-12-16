'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowLeft,
  ArrowRight,
  Send,
  Sparkles,
  FileText,
  Clock,
  Repeat,
  Loader2,
  Users,
  Filter,
  X,
  Eye,
  Phone,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Lead {
  id: string
  nome: string
  telefone: string
  etapa: string
  contexto?: string
  interesse?: string
  origem?: string
  status?: string
  data_ultima_msg?: string
  data_criacao?: string
}

const TIPO_FOLLOW_UP_OPTIONS = [
  { value: 'reativacao', label: 'Reativação' },
  { value: 'promocao', label: 'Promoção' },
  { value: 'lembrete_consulta', label: 'Lembrete de Consulta' },
  { value: 'orcamento', label: 'Orçamento não respondido' },
  { value: 'pos_consulta', label: 'Follow-up Pós-consulta' },
  { value: 'confirmacao', label: 'Confirmação de Presença' },
  { value: 'reagendamento', label: 'Reagendamento' },
  { value: 'oferta', label: 'Oferta Personalizada' },
]

const ETAPA_OPTIONS = [
  { value: 'todas', label: 'Todas as etapas' },
  { value: 'primeiro_contato', label: 'Primeiro Contato' },
  { value: 'interesse', label: 'Interesse' },
  { value: 'agendado', label: 'Agendado' },
  { value: 'confirmou_presenca', label: 'Confirmou Presença' },
  { value: 'compareceu', label: 'Compareceu' },
  { value: 'realizado', label: 'Realizado' },
  { value: 'followup', label: 'Follow-up' },
]

export default function NovoFollowUpPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  // Passo atual do wizard
  const [step, setStep] = useState(1)

  // Leads disponíveis
  const [leads, setLeads] = useState<Lead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [loadingLeads, setLoadingLeads] = useState(true)

  // Filtros de seleção
  const [filtroEtapa, setFiltroEtapa] = useState('todas')
  const [filtroOrigem, setFiltroOrigem] = useState('')
  const [filtroInteresse, setFiltroInteresse] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroDiasSemResposta, setFiltroDiasSemResposta] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [apenasComAgendamento, setApenasComAgendamento] = useState(false)
  const [apenasSemResposta, setApenasSemResposta] = useState(false)

  // Dados do follow-up
  const [tipoFollowUp, setTipoFollowUp] = useState('')
  const [tipoMensagem, setTipoMensagem] = useState<'fixo' | 'ia' | 'customizado'>('fixo')
  
  // Total de steps muda dependendo do tipo de mensagem
  // Se for IA, pula o step 3 (mensagem) - totalSteps = 3
  // Se for fixo ou customizado, mostra todos - totalSteps = 4
  const totalSteps = tipoMensagem === 'ia' ? 3 : 4
  const [usarContexto, setUsarContexto] = useState(true)
  const [promptPersonalizado, setPromptPersonalizado] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [templates, setTemplates] = useState<any[]>([])
  
  // Agendamento
  const [tipoEnvio, setTipoEnvio] = useState<'imediato' | 'agendado' | 'recorrente'>('imediato')
  const [agendadoPara, setAgendadoPara] = useState('')
  const [agendadoParaHora, setAgendadoParaHora] = useState('')
  const [recorrente, setRecorrente] = useState(false)
  const [tipoRecorrencia, setTipoRecorrencia] = useState<'diario' | 'semanal' | 'mensal'>('diario')
  const [intervaloRecorrencia, setIntervaloRecorrencia] = useState(1)
  const [dataFimRecorrencia, setDataFimRecorrencia] = useState('')

  // Estados de UI
  const [generatingAI, setGeneratingAI] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(true)

  useEffect(() => {
    loadLeads()
  }, [])

  useEffect(() => {
    applyAdvancedFilters()
  }, [
    leads,
    filtroEtapa,
    filtroOrigem,
    filtroInteresse,
    filtroStatus,
    filtroDiasSemResposta,
    filtroDataInicio,
    filtroDataFim,
    apenasComAgendamento,
    apenasSemResposta,
  ])

  useEffect(() => {
    if (tipoFollowUp && tipoMensagem === 'fixo') {
      loadTemplates()
    }
  }, [tipoFollowUp, tipoMensagem])

  const loadLeads = async () => {
    try {
      setLoadingLeads(true)
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .not('telefone', 'is', null)
        .order('nome', { ascending: true })

      if (error) throw error
      setLeads(data || [])
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível carregar os leads',
        variant: 'destructive',
      })
    } finally {
      setLoadingLeads(false)
    }
  }

  const applyAdvancedFilters = () => {
    let filtered = [...leads]

    // Filtro por etapa
    if (filtroEtapa && filtroEtapa !== 'todas') {
      filtered = filtered.filter((lead) => lead.etapa === filtroEtapa)
    }

    // Filtro por origem
    if (filtroOrigem) {
      filtered = filtered.filter((lead) =>
        lead.origem?.toLowerCase().includes(filtroOrigem.toLowerCase())
      )
    }

    // Filtro por interesse
    if (filtroInteresse) {
      filtered = filtered.filter((lead) =>
        lead.interesse?.toLowerCase().includes(filtroInteresse.toLowerCase())
      )
    }

    // Filtro por status
    if (filtroStatus && filtroStatus !== 'todos') {
      filtered = filtered.filter((lead) => lead.status === filtroStatus)
    }

    // Filtro por dias sem resposta
    if (filtroDiasSemResposta) {
      const days = parseInt(filtroDiasSemResposta)
      const cutoffDate = subDays(new Date(), days)
      filtered = filtered.filter((lead) => {
        if (!lead.data_ultima_msg) return true
        const lastMsgDate = new Date(lead.data_ultima_msg)
        return lastMsgDate < cutoffDate
      })
    }

    // Filtro por data de criação/última mensagem
    if (filtroDataInicio) {
      filtered = filtered.filter((lead) => {
        const date = new Date(lead.data_ultima_msg || lead.data_criacao || '')
        return date >= new Date(filtroDataInicio)
      })
    }

    if (filtroDataFim) {
      filtered = filtered.filter((lead) => {
        const date = new Date(lead.data_ultima_msg || lead.data_criacao || '')
        const fim = new Date(filtroDataFim)
        fim.setHours(23, 59, 59, 999)
        return date <= fim
      })
    }

    // Filtro: apenas com agendamento (verificar na tabela agendamentos)
    if (apenasComAgendamento) {
      // Por enquanto, vamos apenas filtrar por etapa 'agendado'
      filtered = filtered.filter((lead) => lead.etapa === 'agendado')
    }

    // Filtro: apenas sem resposta
    if (apenasSemResposta) {
      filtered = filtered.filter((lead) => !lead.data_ultima_msg || new Date(lead.data_ultima_msg) < subDays(new Date(), 3))
    }

    setFilteredLeads(filtered)
  }

  const clearFilters = () => {
    setFiltroEtapa('todas')
    setFiltroOrigem('')
    setFiltroInteresse('')
    setFiltroStatus('todos')
    setFiltroDiasSemResposta('')
    setFiltroDataInicio('')
    setFiltroDataFim('')
    setApenasComAgendamento(false)
    setApenasSemResposta(false)
  }

  const loadTemplates = async () => {
    try {
      const response = await fetch(`/api/follow-up/templates?tipoFollowUp=${tipoFollowUp}`)
      const data = await response.json()
      if (data.success) {
        setTemplates(data.data)
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error)
    }
  }

  const handleGenerateAI = async () => {
    if (filteredLeads.length === 0) {
      toast({
        title: 'Erro',
        description: 'Nenhum lead encontrado com os filtros aplicados',
        variant: 'destructive',
      })
      return
    }

    try {
      setGeneratingAI(true)
      const lead = filteredLeads[0] // Gera para o primeiro como exemplo
      
      const response = await fetch('/api/follow-up/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadContexto: usarContexto ? (lead.contexto || 'Sem contexto') : '',
          leadNome: lead.nome,
          tipoFollowUp,
          promptPersonalizado: promptPersonalizado || undefined,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setMensagem(data.mensagem)
        toast({
          title: 'Mensagem gerada',
          description: 'Mensagem criada pela IA. Você pode editá-la antes de salvar.',
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível gerar mensagem',
        variant: 'destructive',
      })
    } finally {
      setGeneratingAI(false)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return tipoFollowUp && tipoMensagem
      case 2:
        return filteredLeads.length > 0
      case 3:
        // Se for IA, não precisa de mensagem (será gerada automaticamente)
        if (tipoMensagem === 'ia') {
          // Este é o step de agendamento quando tipoMensagem === 'ia'
          if (tipoEnvio === 'agendado') {
            return agendadoPara && agendadoParaHora
          }
          if (tipoEnvio === 'recorrente') {
            return tipoRecorrencia && intervaloRecorrencia > 0
          }
          return true
        }
        // Se não for IA, precisa de mensagem
        return mensagem.trim().length > 0
      case 4:
        if (tipoEnvio === 'agendado') {
          return agendadoPara && agendadoParaHora
        }
        if (tipoEnvio === 'recorrente') {
          return tipoRecorrencia && intervaloRecorrencia > 0
        }
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (!canProceed()) {
      toast({
        title: 'Atenção',
        description: 'Preencha todos os campos obrigatórios antes de continuar',
        variant: 'destructive',
      })
      return
    }

    // Se está no step 2 e tipoMensagem é IA, pula direto para agendamento (step 4 se totalSteps = 4, step 3 se totalSteps = 3)
    if (step === 2 && tipoMensagem === 'ia') {
      // Calcula o próximo step considerando que pulamos a mensagem
      const nextStep = totalSteps === 3 ? 3 : 4
      setStep(nextStep)
      return
    }

    if (step < totalSteps) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleSave = async () => {
    if (!canProceed()) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      })
      return
    }

    if (filteredLeads.length === 0) {
      toast({
        title: 'Erro',
        description: 'Nenhum lead selecionado para receber o follow-up',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)

      // Calcular data/hora agendada
      let agendadoParaFinal: string | undefined = undefined
      let proximaExecucao: string | undefined = undefined

      if (tipoEnvio === 'agendado' && agendadoPara && agendadoParaHora) {
        const dateTime = new Date(`${agendadoPara}T${agendadoParaHora}`)
        agendadoParaFinal = dateTime.toISOString()
        proximaExecucao = agendadoParaFinal
      }

      if (tipoEnvio === 'recorrente' && recorrente) {
        const now = new Date()
        const nextDate = new Date(now)
        switch (tipoRecorrencia) {
          case 'diario':
            nextDate.setDate(nextDate.getDate() + intervaloRecorrencia)
            break
          case 'semanal':
            nextDate.setDate(nextDate.getDate() + intervaloRecorrencia * 7)
            break
          case 'mensal':
            nextDate.setMonth(nextDate.getMonth() + intervaloRecorrencia)
            break
        }
        proximaExecucao = nextDate.toISOString()
      }

      const dataFimRecorrenciaFinal = dataFimRecorrencia
        ? new Date(dataFimRecorrencia).toISOString()
        : undefined

      // Criar follow-ups
      // Se for IA, não precisa de mensagem (será gerada no envio usando contexto de cada lead)
      const response = await fetch('/api/follow-up/bulk-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads: filteredLeads.map((lead) => ({
            leadId: lead.id,
            leadTelefone: lead.telefone,
            leadNome: lead.nome,
          })),
          tipoFollowUp,
          tipoMensagem,
          mensagem: tipoMensagem === 'ia' ? '' : mensagem, // Se for IA, mensagem vazia (será gerada no envio)
          templateId: templateId || undefined,
          usarContexto,
          promptPersonalizado: promptPersonalizado || undefined,
          agendadoPara: agendadoParaFinal,
          recorrente,
          tipoRecorrencia: recorrente ? tipoRecorrencia : undefined,
          intervaloRecorrencia: recorrente ? intervaloRecorrencia : undefined,
          dataFimRecorrencia: dataFimRecorrenciaFinal,
          proximaExecucao,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      // Se for imediato, enviar agora
      if (tipoEnvio === 'imediato' && result.data?.ids) {
        const sendResponse = await fetch('/api/follow-up/send-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            followUpIds: result.data.ids,
          }),
        })

        const sendResult = await sendResponse.json()
        if (!sendResult.success) {
          toast({
            title: 'Aviso',
            description: 'Follow-ups criados mas alguns não foram enviados',
            variant: 'default',
          })
        }
      }

      toast({
        title: 'Sucesso',
        description: `Follow-up${filteredLeads.length > 1 ? 's' : ''} criado${filteredLeads.length > 1 ? 's' : ''} para ${filteredLeads.length} lead${filteredLeads.length > 1 ? 's' : ''}!`,
      })

      router.push('/dashboard/leads/follow-up/dashboard')
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar o follow-up',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Criar Follow-up</h1>
          <p className="text-muted-foreground mt-1">
            Configure uma campanha de follow-up para seus leads
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      {/* Indicador de progresso */}
      <Card>
        <CardContent className="p-6">
          {(() => {
            const stepsToShow = tipoMensagem === 'ia' ? [1, 2, 3] : [1, 2, 3, 4]
            const stepLabels = tipoMensagem === 'ia' 
              ? ['Tipo e Mensagem', 'Selecionar Leads', 'Agendamento']
              : ['Tipo e Mensagem', 'Selecionar Leads', 'Mensagem', 'Agendamento']
            
            return (
              <>
                <div className="flex items-center justify-between">
                  {stepsToShow.map((s, index, array) => (
                    <div key={s} className="flex items-center flex-1">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                          step >= s
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-muted-foreground'
                        }`}
                      >
                        {step > s ? '✓' : s}
                      </div>
                      {index < array.length - 1 && (
                        <div
                          className={`flex-1 h-1 mx-2 ${
                            step > s ? 'bg-primary' : 'bg-muted'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className={`flex justify-between mt-4 text-sm text-muted-foreground ${
                  tipoMensagem === 'ia' ? 'grid grid-cols-3' : 'grid grid-cols-4'
                }`}>
                  {stepLabels.map((label, index) => (
                    <span key={index}>{label}</span>
                  ))}
                </div>
              </>
            )
          })()}
        </CardContent>
      </Card>

      {/* Passo 1: Tipo e Mensagem */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Passo 1: Tipo de Follow-up e Mensagem</CardTitle>
            <CardDescription>
              Escolha o tipo de follow-up e como a mensagem será criada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Tipo de Follow-up *</Label>
              <Select value={tipoFollowUp} onValueChange={setTipoFollowUp}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_FOLLOW_UP_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Mensagem *</Label>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <Card
                  className={`cursor-pointer transition-all ${
                    tipoMensagem === 'fixo' ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setTipoMensagem('fixo')}
                >
                  <CardContent className="p-4 text-center">
                    <FileText className="h-8 w-8 mx-auto mb-2" />
                    <p className="font-medium">Template Fixo</p>
                    <p className="text-xs text-muted-foreground">Use um template pré-definido</p>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer transition-all ${
                    tipoMensagem === 'ia' ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setTipoMensagem('ia')}
                >
                  <CardContent className="p-4 text-center">
                    <Sparkles className="h-8 w-8 mx-auto mb-2" />
                    <p className="font-medium">Gerado por IA</p>
                    <p className="text-xs text-muted-foreground">IA cria mensagem personalizada</p>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer transition-all ${
                    tipoMensagem === 'customizado' ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setTipoMensagem('customizado')}
                >
                  <CardContent className="p-4 text-center">
                    <FileText className="h-8 w-8 mx-auto mb-2" />
                    <p className="font-medium">Personalizado</p>
                    <p className="text-xs text-muted-foreground">Escreva sua própria mensagem</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {tipoMensagem === 'ia' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="usar-contexto"
                    checked={usarContexto}
                    onCheckedChange={(checked) => setUsarContexto(checked === true)}
                  />
                  <Label htmlFor="usar-contexto">Usar contexto do lead na mensagem</Label>
                </div>

                <div>
                  <Label>Prompt Personalizado (Opcional)</Label>
                  <Textarea
                    placeholder="Ex: Seja mais formal, mencione promoção especial..."
                    value={promptPersonalizado}
                    onChange={(e) => setPromptPersonalizado(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Instruções adicionais para a IA criar a mensagem
                  </p>
                </div>
              </div>
            )}

            {tipoMensagem === 'fixo' && templates.length > 0 && (
              <div>
                <Label>Template *</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Passo 2: Selecionar Leads com Filtros Avançados */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Filtros */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Passo 2: Filtrar Leads</CardTitle>
                  <CardDescription>
                    Use os filtros abaixo para definir quais leads receberão este follow-up
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar Filtros
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Etapa</Label>
                  <Select value={filtroEtapa} onValueChange={setFiltroEtapa}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ETAPA_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Status</Label>
                  <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os status</SelectItem>
                      <SelectItem value="novo">Novo</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="perdido">Perdido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Origem</Label>
                  <Input
                    placeholder="Ex: GoogleADS, Instagram..."
                    value={filtroOrigem}
                    onChange={(e) => setFiltroOrigem(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Interesse</Label>
                  <Input
                    placeholder="Procedimento de interesse"
                    value={filtroInteresse}
                    onChange={(e) => setFiltroInteresse(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Dias sem resposta</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 7, 14, 30"
                    value={filtroDiasSemResposta}
                    onChange={(e) => setFiltroDiasSemResposta(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Data Início</Label>
                  <Input
                    type="date"
                    value={filtroDataInicio}
                    onChange={(e) => setFiltroDataInicio(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Data Fim</Label>
                  <Input
                    type="date"
                    value={filtroDataFim}
                    onChange={(e) => setFiltroDataFim(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-2 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="com-agendamento"
                    checked={apenasComAgendamento}
                    onCheckedChange={(checked) => setApenasComAgendamento(checked === true)}
                  />
                  <Label htmlFor="com-agendamento" className="text-sm">
                    Apenas com agendamento
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sem-resposta"
                    checked={apenasSemResposta}
                    onCheckedChange={(checked) => setApenasSemResposta(checked === true)}
                  />
                  <Label htmlFor="sem-resposta" className="text-sm">
                    Sem resposta há mais de 3 dias
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Preview</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? <Eye className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <CardDescription>
                Leads que receberão o follow-up
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLeads ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        Total: {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
                      </span>
                      {filteredLeads.length > 0 && (
                        <Badge variant="secondary">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Pronto
                        </Badge>
                      )}
                    </div>
                    {filteredLeads.length === 0 && (
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>Nenhum lead encontrado com os filtros aplicados</span>
                      </div>
                    )}
                  </div>

                  {showPreview && filteredLeads.length > 0 && (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {filteredLeads.slice(0, 50).map((lead) => (
                          <div
                            key={lead.id}
                            className="p-3 rounded-lg border bg-card text-card-foreground"
                          >
                            <p className="font-medium text-sm">{lead.nome || 'Sem nome'}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              <Phone className="h-3 w-3 inline mr-1" />
                              {lead.telefone?.replace('@s.whatsapp.net', '')}
                            </p>
                            {lead.interesse && (
                              <Badge variant="outline" className="mt-2 text-xs">
                                {lead.interesse}
                              </Badge>
                            )}
                          </div>
                        ))}
                        {filteredLeads.length > 50 && (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            ... e mais {filteredLeads.length - 50} lead{filteredLeads.length - 50 !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Passo 3: Mensagem - Só aparece se NÃO for IA */}
      {step === 3 && tipoMensagem !== 'ia' && (
        <Card>
          <CardHeader>
            <CardTitle>Passo 3: Mensagem</CardTitle>
            <CardDescription>
              Escreva ou edite a mensagem
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Mensagem *</Label>
              <Textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Digite ou gere a mensagem aqui..."
                rows={8}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Variáveis disponíveis: {'{'}nome{'}'}, {'{'}procedimento{'}'}, {'{'}data{'}'}, {'{'}horario{'}'}
              </p>
            </div>

            {filteredLeads.length > 1 && (
              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  Esta mensagem será enviada para {filteredLeads.length} leads. As variáveis serão
                  substituídas automaticamente por cada lead.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Informação quando é IA - mostra no lugar do step 3 */}
      {step === 3 && tipoMensagem === 'ia' && (
        <Card>
          <CardHeader>
            <CardTitle>Passo 3: Agendamento</CardTitle>
            <CardDescription>
              Configure quando as mensagens serão enviadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-primary">Mensagens Geradas por IA</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    A IA gerará automaticamente uma mensagem personalizada para cada um dos {filteredLeads.length} leads selecionados,
                    usando o contexto individual de cada lead da tabela. As mensagens serão criadas no momento do envio.
                  </p>
                  {promptPersonalizado && (
                    <div className="mt-3 p-3 bg-background rounded border">
                      <p className="text-xs font-medium mb-1">Prompt personalizado:</p>
                      <p className="text-xs text-muted-foreground">{promptPersonalizado}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Passo 4: Agendamento - Só aparece se NÃO for IA (se for IA, o agendamento é o step 3) */}
      {(step === 4 || (step === 3 && tipoMensagem === 'ia')) && (
        <Card>
          <CardHeader>
            <CardTitle>{tipoMensagem === 'ia' ? 'Passo 3: Agendamento' : 'Passo 4: Agendamento'}</CardTitle>
            <CardDescription>
              Configure quando e como a mensagem será enviada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Tipo de Envio *</Label>
              <Select value={tipoEnvio} onValueChange={(v: any) => setTipoEnvio(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="imediato">Enviar Imediatamente</SelectItem>
                  <SelectItem value="agendado">Agendar Envio</SelectItem>
                  <SelectItem value="recorrente">Envio Recorrente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tipoEnvio === 'agendado' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data *</Label>
                  <Input
                    type="date"
                    value={agendadoPara}
                    onChange={(e) => setAgendadoPara(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                <div>
                  <Label>Hora *</Label>
                  <Input
                    type="time"
                    value={agendadoParaHora}
                    onChange={(e) => setAgendadoParaHora(e.target.value)}
                  />
                </div>
              </div>
            )}

            {tipoEnvio === 'recorrente' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="recorrente"
                    checked={recorrente}
                    onCheckedChange={(checked) => setRecorrente(checked === true)}
                  />
                  <Label htmlFor="recorrente">Ativar recorrência</Label>
                </div>

                {recorrente && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tipo de Recorrência *</Label>
                        <Select
                          value={tipoRecorrencia}
                          onValueChange={(v: any) => setTipoRecorrencia(v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="diario">Diário</SelectItem>
                            <SelectItem value="semanal">Semanal</SelectItem>
                            <SelectItem value="mensal">Mensal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Intervalo *</Label>
                        <Input
                          type="number"
                          min={1}
                          value={intervaloRecorrencia}
                          onChange={(e) => setIntervaloRecorrencia(parseInt(e.target.value) || 1)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          A cada {intervaloRecorrencia}{' '}
                          {tipoRecorrencia === 'diario'
                            ? 'dia(s)'
                            : tipoRecorrencia === 'semanal'
                            ? 'semana(s)'
                            : 'mês(es)'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label>Data de Término (Opcional)</Label>
                      <Input
                        type="date"
                        value={dataFimRecorrencia}
                        onChange={(e) => setDataFimRecorrencia(e.target.value)}
                        min={format(new Date(), 'yyyy-MM-dd')}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Deixe em branco para continuar indefinidamente
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Resumo do Follow-up</p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>• Leads: {filteredLeads.length} destinatário{filteredLeads.length !== 1 ? 's' : ''}</p>
                <p>• Tipo: {TIPO_FOLLOW_UP_OPTIONS.find(t => t.value === tipoFollowUp)?.label}</p>
                <p>• Envio: {
                  tipoEnvio === 'imediato' ? 'Imediato' :
                  tipoEnvio === 'agendado' ? `Agendado para ${agendadoPara} ${agendadoParaHora}` :
                  recorrente ? `Recorrente (${tipoRecorrencia})` : 'Não configurado'
                }</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botões de navegação */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack} disabled={step === 1}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        {step < totalSteps ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Próximo
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={!canProceed() || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Criar Follow-up ({filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''})
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
