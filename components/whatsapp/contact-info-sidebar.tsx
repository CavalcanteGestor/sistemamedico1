'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
// Separator component not available, using div instead
import {
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Users,
  Edit,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Briefcase,
  Stethoscope,
  Loader2,
  UserPlus,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { AIControlToggle } from './ai-control-toggle'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ContactInfoSidebarProps {
  phone: string
  contactName?: string
  onQuickMessage?: (message: string) => void
}

interface QuickMessageTopic {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  order_index: number
  active: boolean
}

interface QuickMessage {
  id: string
  topic_id: string
  label: string
  message: string
  icon?: string
  order_index: number
  active: boolean
}

// Ícone dinâmico helper
const getIconComponent = (iconName?: string) => {
  const iconMap: Record<string, any> = {
    Calendar,
    FileText,
    MessageSquare,
    Clock,
    CheckCircle2,
    Phone,
    Mail,
    MapPin,
    User,
    Users,
    Edit,
    TrendingUp,
    Briefcase,
    Stethoscope,
  }
  return iconName ? (iconMap[iconName] || MessageSquare) : MessageSquare
}

export function ContactInfoSidebar({ phone, contactName, onQuickMessage }: ContactInfoSidebarProps) {
  const [lead, setLead] = useState<any>(null)
  const [patient, setPatient] = useState<any>(null)
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [humanSupportActive, setHumanSupportActive] = useState(false)
  const [topics, setTopics] = useState<QuickMessageTopic[]>([])
  const [quickMessages, setQuickMessages] = useState<QuickMessage[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [showConvertDialog, setShowConvertDialog] = useState(false)
  const [converting, setConverting] = useState(false)
  const [cpf, setCpf] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [email, setEmail] = useState('')
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    loadContactInfo()
    loadQuickMessageTopics()
  }, [phone])

  useEffect(() => {
    if (selectedTopicId) {
      loadQuickMessages(selectedTopicId)
    }
  }, [selectedTopicId])

  const loadContactInfo = async () => {
    try {
      setLoading(true)
      const phoneClean = phone.replace('@s.whatsapp.net', '').trim()

      // Buscar lead
      const { data: leadData } = await supabase
        .from('leads')
        .select('*')
        .or(`telefone.eq.${phone},telefone.eq.${phoneClean},telefone.ilike.%${phoneClean}%`)
        .maybeSingle()

      setLead(leadData)

      // Buscar paciente por telefone
      let patientByPhone = null
      let patientByEmail = null

      const { data: patientByPhoneData } = await supabase
        .from('patients')
        .select('*')
        .eq('phone', phoneClean)
        .maybeSingle()

      patientByPhone = patientByPhoneData

      // Se não encontrou por telefone e lead tem email, tentar por email
      if (!patientByPhone && leadData?.email) {
        const { data: patientByEmailData } = await supabase
          .from('patients')
          .select('*')
          .eq('email', leadData.email.trim())
          .maybeSingle()

        patientByEmail = patientByEmailData
      }

      const currentPatient = patientByPhone || patientByEmail
      if (currentPatient) {
        setPatient(currentPatient)
      }

      // Buscar agendamentos (próximos e recentes)
      if (currentPatient?.id) {
        const { data: appointmentsData } = await supabase
          .from('appointments')
          .select(`
            *,
            doctors:doctor_id (name, crm),
            patients:patient_id (name)
          `)
          .eq('patient_id', currentPatient.id)
          .order('appointment_date', { ascending: false })
          .order('appointment_time', { ascending: false })
          .limit(5)

        setAppointments(appointmentsData || [])
      }

      // Verificar atendimento humano
      const { data: humanSupport } = await supabase
        .from('atendimento_humano')
        .select('ativo')
        .eq('telefone', phone)
        .maybeSingle()

      setHumanSupportActive(humanSupport?.ativo === true)
    } catch (error) {
      console.error('Erro ao carregar informações do contato:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadQuickMessageTopics = async () => {
    try {
      const { data, error } = await supabase
        .from('quick_message_topics')
        .select('*')
        .eq('active', true)
        .order('order_index', { ascending: true })

      if (error) {
        // Se a tabela não existe, não é um erro crítico - apenas não mostrar tópicos
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('Tabela quick_message_topics não existe. Execute a migration 027_quick_message_templates.sql')
          return
        }
        throw error
      }

      if (data && data.length > 0) {
        setTopics(data)
        // Selecionar o primeiro tópico por padrão
        setSelectedTopicId(data[0].id)
      }
    } catch (error: any) {
      // Melhorar log de erro
      const errorMessage = error?.message || error?.code || JSON.stringify(error)
      console.error('Erro ao carregar tópicos:', errorMessage, error)
      // Não mostrar toast para erro de tabela não existente
      if (error?.code !== '42P01' && !error?.message?.includes('does not exist')) {
        toast({
          title: 'Aviso',
          description: 'Não foi possível carregar os tópicos de mensagens rápidas',
          variant: 'destructive',
        })
      }
    }
  }

  const loadQuickMessages = async (topicId: string) => {
    try {
      setLoadingMessages(true)
      const { data, error } = await supabase
        .from('quick_messages')
        .select('*')
        .eq('topic_id', topicId)
        .eq('active', true)
        .order('order_index', { ascending: true })

      if (error) {
        // Se a tabela não existe, não é um erro crítico
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('Tabela quick_messages não existe. Execute a migration 027_quick_message_templates.sql')
          setQuickMessages([])
          return
        }
        throw error
      }

      setQuickMessages(data || [])
    } catch (error: any) {
      const errorMessage = error?.message || error?.code || JSON.stringify(error)
      console.error('Erro ao carregar mensagens rápidas:', errorMessage, error)
      // Não mostrar toast para erro de tabela não existente
      if (error?.code !== '42P01' && !error?.message?.includes('does not exist')) {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as mensagens rápidas',
          variant: 'destructive',
        })
      }
      setQuickMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleQuickMessage = (message: string) => {
    if (onQuickMessage) {
      onQuickMessage(message)
    }
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

  const handleConvertToPatient = async () => {
    if (!lead || !cpf || !birthDate || !email) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios: Email, CPF e data de nascimento',
        variant: 'destructive',
      })
      return
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast({
        title: 'Erro',
        description: 'Email inválido. Por favor, verifique o formato.',
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
          leadId: lead.id,
          cpf: cpf.replace(/\D/g, ''),
          birthDate,
          email: email.trim().toLowerCase(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao converter lead em paciente')
      }

      toast({
        title: 'Sucesso!',
        description: 'Lead convertido em paciente com sucesso!',
      })

      // Fechar dialog e limpar campos
      setShowConvertDialog(false)
      setCpf('')
      setBirthDate('')
      setEmail('')

      // Recarregar informações do contato
      await loadContactInfo()
    } catch (error: any) {
      console.error('Erro ao converter lead:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível converter o lead em paciente',
        variant: 'destructive',
      })
    } finally {
      setConverting(false)
    }
  }

  if (loading) {
    return (
      <div className="w-80 border-l bg-muted/30 p-4 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const hasInfo = lead || patient

  if (!hasInfo) {
    return (
      <div className="w-80 border-l bg-muted/30 p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Informações do Contato</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Nenhum cadastro encontrado para este número.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-80 border-l bg-muted/30 flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Controle de Atendimento Humano */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Atendimento</span>
                <AIControlToggle
                  phone={phone}
                  onToggle={(active) => setHumanSupportActive(active)}
                />
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Informações do Lead */}
          {lead && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Lead
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">{lead.nome || contactName || 'Sem nome'}</p>
                    {lead.status === 'convertido' && (
                      <Badge className="bg-emerald-500 text-white text-xs">Paciente</Badge>
                    )}
                  </div>
                  {lead.etapa && (
                    <Badge className={`${ETAPA_COLORS[lead.etapa] || 'bg-gray-500'} text-white text-xs`}>
                      {ETAPA_LABELS[lead.etapa] || lead.etapa}
                    </Badge>
                  )}
                </div>

                {lead.telefone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {lead.telefone.replace('@s.whatsapp.net', '')}
                    </span>
                  </div>
                )}

                {lead.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{lead.email}</span>
                  </div>
                )}

                {lead.interesse && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Interesse:</p>
                    <p className="text-sm">{lead.interesse}</p>
                  </div>
                )}

                {lead.origem && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Origem:</p>
                    <Badge variant="secondary" className="text-xs">{lead.origem}</Badge>
                  </div>
                )}

                <div className="border-t my-2" />

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      if (lead.id) {
                        router.push(`/dashboard/leads`)
                        // Scroll to lead ou abrir dialog
                      }
                    }}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar Lead
                  </Button>
                  {!patient && lead.status !== 'convertido' && (
                    <Button
                      variant="default"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        // Pré-preencher email se o lead tiver
                        setEmail(lead.email || '')
                        setShowConvertDialog(true)
                      }}
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      Converter em Paciente
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informações do Paciente */}
          {patient && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Paciente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium">{patient.name}</p>
                  {patient.cpf && (
                    <p className="text-xs text-muted-foreground">CPF: {patient.cpf}</p>
                  )}
                </div>

                {patient.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{patient.phone}</span>
                  </div>
                )}

                {patient.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{patient.email}</span>
                  </div>
                )}

                {patient.birth_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {format(new Date(patient.birth_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  </div>
                )}

                {patient.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                    <span className="text-muted-foreground">{patient.address}</span>
                  </div>
                )}

                <div className="border-t my-2" />

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => router.push(`/dashboard/pacientes/${patient.id}`)}
                  >
                    <User className="h-3 w-3 mr-1" />
                    Ver Paciente
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => router.push(`/dashboard/agendamentos/novo?patientId=${patient.id}`)}
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Novo Agendamento
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mensagens Rápidas com Tópicos */}
          {onQuickMessage && topics.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Mensagens Rápidas
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => router.push('/dashboard/configuracoes/mensagens-rapidas')}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Seletor de Tópicos */}
                {topics.length > 1 && (
                  <div className="flex gap-1 flex-wrap">
                    {topics.map((topic) => {
                      const TopicIcon = getIconComponent(topic.icon)
                      const isSelected = selectedTopicId === topic.id
                      return (
                        <Button
                          key={topic.id}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          className={`text-xs h-7 px-2 ${isSelected ? '' : 'text-muted-foreground'}`}
                          onClick={() => setSelectedTopicId(topic.id)}
                        >
                          <TopicIcon className="h-3 w-3 mr-1" />
                          {topic.name}
                        </Button>
                      )
                    })}
                  </div>
                )}

                {/* Mensagens do Tópico Selecionado */}
                {selectedTopicId && (
                  <div className="space-y-2">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : quickMessages.length > 0 ? (
                      quickMessages.map((msg) => {
                        const MsgIcon = getIconComponent(msg.icon)
                        return (
                          <Button
                            key={msg.id}
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-xs h-auto py-2"
                            onClick={() => handleQuickMessage(msg.message)}
                          >
                            <MsgIcon className="h-3 w-3 mr-2 flex-shrink-0" />
                            <span className="text-left">{msg.label}</span>
                          </Button>
                        )
                      })
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Nenhuma mensagem neste tópico
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Próximos Agendamentos */}
          {appointments.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Agendamentos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {appointments.slice(0, 3).map((appt) => {
                  const isUpcoming = new Date(`${appt.appointment_date}T${appt.appointment_time}`) > new Date()
                  const doctorName = (appt.doctors as any)?.name || 'Médico não informado'
                  
                  return (
                    <div
                      key={appt.id}
                      className={`p-2 rounded-md border text-xs ${
                        isUpcoming ? 'bg-blue-50 border-blue-200' : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">
                          {format(new Date(appt.appointment_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                        {isUpcoming && (
                          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                            Próximo
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground">
                        {appt.appointment_time?.slice(0, 5)} - {doctorName}
                      </p>
                      {appt.status && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {appt.status}
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Ações Rápidas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lead && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => router.push('/dashboard/leads/follow-up/novo')}
                >
                  <TrendingUp className="h-3 w-3 mr-2" />
                  Criar Follow-up
                </Button>
              )}
              {lead && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => router.push('/dashboard/orcamentos/novo')}
                >
                  <Briefcase className="h-3 w-3 mr-2" />
                  Criar Orçamento
                </Button>
              )}
              {patient && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => router.push(`/dashboard/pacientes/${patient.id}/historico`)}
                >
                  <FileText className="h-3 w-3 mr-2" />
                  Ver Histórico
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Dialog de Conversão para Paciente */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Converter Lead em Paciente</DialogTitle>
            <DialogDescription>
              Preencha os dados obrigatórios para converter este lead em paciente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
                required
              />
              <p className="text-xs text-muted-foreground">
                O email é obrigatório para criar o cadastro e login do paciente.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, '')
                  if (value.length <= 11) {
                    value = value.replace(/(\d{3})(\d)/, '$1.$2')
                    value = value.replace(/(\d{3})(\d)/, '$1.$2')
                    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2')
                    setCpf(value)
                  }
                }}
                maxLength={14}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthDate">Data de Nascimento *</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            {lead && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium mb-1">Dados que serão usados:</p>
                <p className="text-xs text-muted-foreground">Nome: {lead.nome || contactName || 'Não informado'}</p>
                <p className="text-xs text-muted-foreground">Telefone: {lead.telefone?.replace('@s.whatsapp.net', '') || phone}</p>
                {lead.email && !email && (
                  <p className="text-xs text-blue-600">💡 Email do lead: {lead.email} (pré-preenchido)</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConvertDialog(false)
                setCpf('')
                setBirthDate('')
                setEmail('')
              }}
              disabled={converting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConvertToPatient}
              disabled={converting || !cpf || !birthDate || !email}
            >
              {converting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Convertendo...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Converter
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

