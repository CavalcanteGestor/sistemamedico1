'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Video,
  VideoOff,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  ExternalLink,
  Copy,
  Check,
  Plus,
  Zap,
  Search,
  Filter,
  TrendingUp,
  Timer,
  Star,
  BarChart3,
  FileText,
  Download,
  Sparkles,
  PlayCircle,
  X,
  AlertTriangle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export default function TelemedicinaPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    ended: 0,
    cancelled: 0,
    avgDuration: 0,
    avgRating: 0,
    totalRecordings: 0,
    todayCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'ended' | 'cancelled'>('all')
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [sessionToCancel, setSessionToCancel] = useState<any>(null)
  const [cancellationReason, setCancellationReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [doctorFilter, setDoctorFilter] = useState<string>('all')
  const [availableDoctors, setAvailableDoctors] = useState<any[]>([])
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [statusData, setStatusData] = useState<any[]>([])
  const [showImmediateDialog, setShowImmediateDialog] = useState(false)
  const [immediateLoading, setImmediateLoading] = useState(false)
  const [immediateAiSummaryEnabled, setImmediateAiSummaryEnabled] = useState(true)
  const [immediateTranscriptionEnabled, setImmediateTranscriptionEnabled] = useState(true)
  const [immediateAiSummaryPrompt, setImmediateAiSummaryPrompt] = useState('')
  const [patients, setPatients] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('')
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    loadSessions()
    loadDoctorsForFilter()
  }, [filter, dateFilter, doctorFilter])

  useEffect(() => {
    if (showImmediateDialog) {
      loadPatientsAndDoctors()
    }
  }, [showImmediateDialog])

  const loadPatientsAndDoctors = async () => {
    try {
      const [patientsRes, doctorsRes] = await Promise.all([
        supabase.from('patients').select('id, name').order('name'),
        supabase.from('doctors').select('id, name, crm').eq('active', true).order('name'),
      ])

      if (patientsRes.error) throw patientsRes.error
      if (doctorsRes.error) throw doctorsRes.error

      setPatients(patientsRes.data || [])
      setDoctors(doctorsRes.data || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar pacientes e médicos.',
        variant: 'destructive',
      })
    }
  }

  const loadDoctorsForFilter = async () => {
    const { getAvailableDoctors } = await import('@/lib/utils/doctor-helpers')
    const doctors = await getAvailableDoctors(supabase, { active: true })
    setAvailableDoctors(doctors.map(d => ({ id: d.id, name: d.name, crm: d.crm })))
  }

  const loadSessions = async () => {
    try {
      setLoading(true)

      // Verificar se é médico para filtrar apenas suas sessões
      const { data: { user } } = await supabase.auth.getUser()
      let doctorId: string | null = null

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (profile?.role === 'medico') {
          const { data: doctor } = await supabase
            .from('doctors')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle()
          doctorId = doctor?.id || null
        }
      }

      // Construir query com filtros
      // Primeiro buscar sessões sem feedback (mais seguro)
      let query = supabase
        .from('telemedicine_sessions')
        .select(`
          *,
          cancellation_reason,
          cancelled_at,
          cancelled_by,
          appointments:appointment_id (
            id,
            appointment_date,
            appointment_time,
            status,
            consultation_type,
            doctor_id,
            patients:patient_id (
              id,
              name,
              phone,
              email
            ),
            doctors:doctor_id (
              id,
              name,
              crm,
              specialties:specialty_id (
                name
              )
            )
          )
        `)
        .order('created_at', { ascending: false })

      // Filtro por data
      if (dateFilter === 'today') {
        const today = format(new Date(), 'yyyy-MM-dd')
        query = query.gte('created_at', `${today}T00:00:00`)
        query = query.lte('created_at', `${today}T23:59:59`)
      } else if (dateFilter === 'week') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        query = query.gte('created_at', format(weekAgo, 'yyyy-MM-dd'))
      } else if (dateFilter === 'month') {
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        query = query.gte('created_at', format(monthAgo, 'yyyy-MM-dd'))
      }

      const { data, error } = await query

      if (error) {
        console.error('Erro na query do Supabase:', error)
        throw new Error(error.message || 'Erro ao buscar sessões')
      }

      // Buscar feedback separadamente para evitar erros
      const sessionIds = (data || []).map((s: any) => s.id)
      let feedbackMap: Record<string, any> = {}
      
      if (sessionIds.length > 0) {
        try {
          const { data: feedbackData } = await supabase
            .from('telemedicine_feedback')
            .select('session_id, rating, technical_quality, audio_quality, video_quality')
            .in('session_id', sessionIds)
          
          if (feedbackData) {
            feedbackData.forEach((fb: any) => {
              if (!feedbackMap[fb.session_id]) {
                feedbackMap[fb.session_id] = []
              }
              feedbackMap[fb.session_id].push(fb)
            })
          }
        } catch (feedbackError) {
          console.warn('Erro ao carregar feedback (não crítico):', feedbackError)
        }
      }

      let sessionsData = (data || []).map((session: any) => ({
        ...session,
        appointment: session.appointments || null,
        feedback: feedbackMap[session.id] || [],
      })).filter((session: any) => session.appointment !== null) // Filtrar sessões sem agendamento

      // Filtro por status
      if (filter !== 'all') {
        sessionsData = sessionsData.filter((s: any) => s.status === filter)
      }

      // Filtro por médico
      if (doctorFilter !== 'all') {
        sessionsData = sessionsData.filter(
          (s: any) => s.appointment?.doctors?.id === doctorFilter
        )
      }

      // Filtro por busca
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase()
        sessionsData = sessionsData.filter(
          (s: any) =>
            s.appointment?.patients?.name?.toLowerCase().includes(search) ||
            s.appointment?.doctors?.name?.toLowerCase().includes(search) ||
            s.room_id?.toLowerCase().includes(search)
        )
      }

      setSessions(sessionsData)

      // Calcular estatísticas avançadas (usar dados originais, não filtrados)
      const allSessions = (data || []).filter((s: any) => s.appointments !== null)
      const total = allSessions.length
      const active = allSessions.filter((s: any) => s.status === 'active').length
      const pending = allSessions.filter((s: any) => s.status === 'pending').length
      const ended = allSessions.filter((s: any) => s.status === 'ended').length
      const cancelled = allSessions.filter((s: any) => s.status === 'cancelled').length

      // Duração média
      const endedSessions = allSessions.filter(
        (s: any) => s.status === 'ended' && s.duration_seconds
      )
      const avgDuration =
        endedSessions.length > 0
          ? Math.round(
              endedSessions.reduce((acc: number, s: any) => acc + (s.duration_seconds || 0), 0) /
                endedSessions.length /
                60
            )
          : 0

      // Avaliação média (buscar feedback separadamente)
      const allSessionIds = allSessions.map((s: any) => s.id)
      let sessionsWithFeedback = 0
      let totalRating = 0
      
      if (allSessionIds.length > 0) {
        try {
          const { data: allFeedback } = await supabase
            .from('telemedicine_feedback')
            .select('session_id, rating')
            .in('session_id', allSessionIds)
            .not('rating', 'is', null)
          
          if (allFeedback && allFeedback.length > 0) {
            sessionsWithFeedback = allFeedback.length
            totalRating = allFeedback.reduce((acc: number, fb: any) => acc + (fb.rating || 0), 0)
          }
        } catch (feedbackError) {
          console.warn('Erro ao calcular avaliação média:', feedbackError)
        }
      }
      
      const avgRating = sessionsWithFeedback > 0 ? (totalRating / sessionsWithFeedback).toFixed(1) : 0

      // Gravações
      const totalRecordings = allSessions.filter((s: any) => s.recording_url).length

      // Hoje
      const today = format(new Date(), 'yyyy-MM-dd')
      const todayCount = allSessions.filter((s: any) =>
        s.created_at?.startsWith(today)
      ).length

      setStats({
        total,
        active,
        pending,
        ended,
        cancelled,
        avgDuration,
        avgRating: Number(avgRating),
        totalRecordings,
        todayCount,
      })

      // Preparar dados para gráficos
      prepareChartData(allSessions)
    } catch (error: any) {
      console.error('Erro ao carregar sessões:', error)
      const errorMessage = error?.message || error?.code || 'Erro desconhecido ao carregar as sessões'
      toast({
        title: 'Erro ao carregar sessões',
        description: errorMessage,
        variant: 'destructive',
      })
      // Garantir que sempre temos dados válidos
      setSessions([])
      setStats({
        total: 0,
        active: 0,
        pending: 0,
        ended: 0,
        cancelled: 0,
        avgDuration: 0,
        avgRating: 0,
        totalRecordings: 0,
        todayCount: 0,
      })
      setMonthlyData([])
      setStatusData([])
    } finally {
      setLoading(false)
    }
  }

  const prepareChartData = (allSessions: any[]) => {
    // Gráfico mensal
    const monthlyMap = new Map<string, number>()
    allSessions.forEach((session) => {
      const month = format(new Date(session.created_at), 'MMM/yyyy', { locale: ptBR })
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + 1)
    })

    const monthly = Array.from(monthlyMap.entries())
      .map(([month, count]) => ({ month, sessões: count }))
      .sort((a, b) => {
        const dateA = new Date(a.month.split('/')[1] + '-' + a.month.split('/')[0])
        const dateB = new Date(b.month.split('/')[1] + '-' + b.month.split('/')[0])
        return dateA.getTime() - dateB.getTime()
      })
      .slice(-6) // Últimos 6 meses

    setMonthlyData(monthly)

    // Gráfico de status
    const statusMap = {
      pending: allSessions.filter((s: any) => s.status === 'pending').length,
      active: allSessions.filter((s: any) => s.status === 'active').length,
      ended: allSessions.filter((s: any) => s.status === 'ended').length,
      cancelled: allSessions.filter((s: any) => s.status === 'cancelled').length,
    }

    setStatusData([
      { name: 'Pendentes', value: statusMap.pending },
      { name: 'Ativas', value: statusMap.active },
      { name: 'Finalizadas', value: statusMap.ended },
      { name: 'Canceladas', value: statusMap.cancelled },
    ])
  }

  const copyRoomUrl = async (roomUrl: string) => {
    try {
      await navigator.clipboard.writeText(roomUrl)
      toast({
        title: 'Link copiado!',
        description: 'O link da consulta foi copiado para a área de transferência.',
      })
    } catch (error) {
      toast({
        title: 'Erro ao copiar link',
        variant: 'destructive',
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
      pending: { label: 'Pendente', variant: 'secondary' },
      active: { label: 'Ativa', variant: 'default' },
      ended: { label: 'Finalizada', variant: 'secondary' },
      cancelled: { label: 'Cancelada', variant: 'destructive' },
    }
    return variants[status] || { label: status, variant: 'default' }
  }

  const handleImmediateConsultation = async () => {
    if (!selectedPatientId || !selectedDoctorId) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, selecione o paciente e o médico.',
        variant: 'destructive',
      })
      return
    }

    try {
      setImmediateLoading(true)

      // Criar data/hora atual
      const now = new Date()
      const appointmentDate = format(now, 'yyyy-MM-dd')
      const appointmentTime = format(now, 'HH:mm')

      // Criar agendamento imediato
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          patient_id: selectedPatientId,
          doctor_id: selectedDoctorId,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          consultation_type: 'telemedicina',
          status: 'scheduled',
          notes: 'Consulta imediata iniciada via telemedicina',
        })
        .select()
        .single()

      if (appointmentError) throw appointmentError

      // Criar lembretes automáticos (1 dia antes e 15 minutos antes)
      try {
        await fetch('/api/appointments/create-reminders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            appointmentId: appointment.id,
          }),
        })
      } catch (reminderError) {
        // Erro silencioso - não bloquear criação do agendamento
        console.error('Erro ao criar lembretes automáticos:', reminderError)
      }

      // Criar sessão de telemedicina
      const response = await fetch('/api/telemedicine/create-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId: appointment.id,
          provider: 'webrtc',
          aiSummaryEnabled: immediateAiSummaryEnabled,
          aiSummaryPrompt: immediateAiSummaryPrompt.trim() || undefined,
          transcriptionEnabled: immediateTranscriptionEnabled,
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao criar sessão de telemedicina')
      }

      toast({
        title: 'Consulta iniciada!',
        description: 'Redirecionando para a consulta de telemedicina...',
      })

      // Fechar modal e redirecionar
      setShowImmediateDialog(false)
      router.push(`/dashboard/consultas/detalhes/${appointment.id}`)
    } catch (error: any) {
      console.error('Erro ao iniciar consulta imediata:', error)
      toast({
        title: 'Erro ao iniciar consulta',
        description: error.message || 'Não foi possível iniciar a consulta imediata',
        variant: 'destructive',
      })
    } finally {
      setImmediateLoading(false)
    }
  }

  // Paleta azul moderna e tecnológica
  const COLORS = [
    '#3B82F6', // Azul vibrante
    '#60A5FA', // Azul claro
    '#2563EB', // Azul escuro
    '#1D4ED8', // Azul profundo
    '#93C5FD', // Azul suave
  ]

  const handleCancelSession = (session: any) => {
    setSessionToCancel(session)
    setCancellationReason('')
    setShowCancelDialog(true)
  }

  const confirmCancel = async () => {
    if (!sessionToCancel) return

    try {
      setCancelling(true)
      
      const response = await fetch(`/api/telemedicine/sessions/${sessionToCancel.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: cancellationReason.trim() || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao cancelar sessão')
      }

      toast({
        title: 'Sessão cancelada!',
        description: 'A sessão de telemedicina foi cancelada com sucesso.',
      })

      setShowCancelDialog(false)
      setSessionToCancel(null)
      setCancellationReason('')
      
      // Recarregar sessões
      loadSessions()
    } catch (error: any) {
      toast({
        title: 'Erro ao cancelar sessão',
        description: error.message || 'Não foi possível cancelar a sessão',
        variant: 'destructive',
      })
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Carregando sessões de telemedicina...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Telemedicina</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todas as consultas de telemedicina
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowImmediateDialog(true)}
          >
            <Zap className="h-4 w-4 mr-2" />
            Consulta Imediata
          </Button>
          <Link href="/dashboard/agendamentos/novo?tipo=telemedicina">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Consulta Agendada
            </Button>
          </Link>
        </div>
      </div>

      {/* Dialog para Consulta Imediata */}
      <Dialog open={showImmediateDialog} onOpenChange={setShowImmediateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Iniciar Consulta Imediata</DialogTitle>
            <DialogDescription>
              Selecione o paciente e o médico para iniciar uma consulta de telemedicina agora.
              A consulta será criada com a data e horário atual.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="immediate-patient">Paciente *</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="immediate-doctor">Médico *</Label>
              <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o médico" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.name} - CRM: {doctor.crm}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Opções de IA */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="immediate-transcription"
                  checked={immediateTranscriptionEnabled}
                  onCheckedChange={(checked) => {
                    setImmediateTranscriptionEnabled(checked as boolean)
                    if (!checked) {
                      setImmediateAiSummaryEnabled(false)
                    }
                  }}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="immediate-transcription" className="text-sm font-medium cursor-pointer">
                    Habilitar Transcrição
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Permite transcrever a conversa durante a consulta (necessário para resumo com IA)
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="immediate-ai-summary"
                  checked={immediateAiSummaryEnabled}
                  onCheckedChange={(checked) => {
                    setImmediateAiSummaryEnabled(checked as boolean)
                    if (!checked) {
                      setImmediateAiSummaryPrompt('')
                    } else if (!immediateTranscriptionEnabled) {
                      setImmediateTranscriptionEnabled(true)
                    }
                  }}
                  className="mt-1"
                  disabled={!immediateTranscriptionEnabled}
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="immediate-ai-summary" className="text-sm font-medium cursor-pointer">
                    Gerar Resumo com IA
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Um resumo profissional da consulta será gerado automaticamente usando Inteligência Artificial
                  </p>

                  {/* Prompt Personalizado */}
                  {immediateAiSummaryEnabled && (
                    <div className="mt-3 space-y-2">
                      <Label htmlFor="immediate-ai-prompt" className="text-xs font-medium">
                        Script/Prompt Personalizado para a IA (opcional)
                      </Label>
                      <Textarea
                        id="immediate-ai-prompt"
                        placeholder="Ex: Foque em sintomas respiratórios e medicações prescritas. Inclua observações sobre o estado geral do paciente..."
                        value={immediateAiSummaryPrompt}
                        onChange={(e) => setImmediateAiSummaryPrompt(e.target.value)}
                        className="min-h-[80px] text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Instruções adicionais para orientar a IA na geração do resumo. Se deixado em branco, será usado o script padrão.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowImmediateDialog(false)}
              disabled={immediateLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImmediateConsultation}
              disabled={immediateLoading || !selectedPatientId || !selectedDoctorId}
            >
              {immediateLoading ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Video className="h-4 w-4 mr-2" />
                  Iniciar Consulta
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Cancelar Sessão */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancelar Sessão de Telemedicina
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar esta sessão? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          {sessionToCancel && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-md space-y-2">
                <p className="text-sm font-medium">Detalhes da Sessão:</p>
                <p className="text-sm text-muted-foreground">
                  <strong>Paciente:</strong> {sessionToCancel.appointment?.patients?.name || 'N/A'}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Data:</strong>{' '}
                  {sessionToCancel.appointment?.appointment_date
                    ? format(new Date(sessionToCancel.appointment.appointment_date), "dd/MM/yyyy", {
                        locale: ptBR,
                      })
                    : 'N/A'}{' '}
                  às {sessionToCancel.appointment?.appointment_time || 'N/A'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cancellation-reason">
                  Motivo do Cancelamento (Opcional)
                </Label>
                <Textarea
                  id="cancellation-reason"
                  placeholder="Ex: Paciente não compareceu, problema técnico, reagendamento..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Informe o motivo do cancelamento para melhorar o acompanhamento.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false)
                setSessionToCancel(null)
                setCancellationReason('')
              }}
              disabled={cancelling}
            >
              Não Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancel}
              disabled={cancelling}
            >
              {cancelling ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Confirmar Cancelamento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Estatísticas Melhoradas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Sessões</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.todayCount} hoje
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aguardando início
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativas</CardTitle>
            <Video className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Em andamento
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Finalizadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.ended}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? Math.round((stats.ended / stats.total) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? Math.round((stats.cancelled / stats.total) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas Adicionais */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duração Média</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDuration} min</div>
            <p className="text-xs text-muted-foreground mt-1">
              Por consulta
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avaliação Média</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {stats.avgRating > 0 ? stats.avgRating : 'N/A'}
              {stats.avgRating > 0 && <span className="text-sm text-yellow-500">⭐</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.avgRating > 0 ? 'de 5 estrelas' : 'Sem avaliações'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gravações</CardTitle>
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecordings}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Consultas gravadas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total > 0 ? Math.round((stats.ended / stats.total) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Consultas finalizadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sessões por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <defs>
                    <linearGradient id="teleBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar 
                    dataKey="sessões" 
                    fill="url(#teleBarGradient)"
                    radius={[8, 8, 0, 0]}
                    stroke="#2563EB"
                    strokeWidth={1}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.some((s) => s.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <defs>
                    {COLORS.map((color, index) => (
                      <linearGradient key={`telePieGradient${index}`} id={`telePieGradient${index}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent, value }) =>
                      value > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''
                    }
                    outerRadius={90}
                    innerRadius={30}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  >
                    {statusData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`url(#telePieGradient${index % COLORS.length})`}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lista de Sessões */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sessões de Telemedicina</CardTitle>
            <Link href="/dashboard/telemedicina/historico">
              <Button variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                Ver Histórico Completo
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros Avançados */}
          <div className="space-y-4 mb-6">
            {/* Busca e Filtros Rápidos */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por paciente, médico ou sala..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <Select value={dateFilter} onValueChange={(v: any) => setDateFilter(v)}>
                <SelectTrigger className="w-[150px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as datas</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Últimos 7 dias</SelectItem>
                  <SelectItem value="month">Último mês</SelectItem>
                </SelectContent>
              </Select>

              <Select value={doctorFilter} onValueChange={setDoctorFilter}>
                <SelectTrigger className="w-[180px]">
                  <User className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Todos os médicos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os médicos</SelectItem>
                  {availableDoctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtros de Status */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                Todas ({stats.total})
              </Button>
              <Button
                variant={filter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('pending')}
              >
                Pendentes ({stats.pending})
              </Button>
              <Button
                variant={filter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('active')}
              >
                Ativas ({stats.active})
              </Button>
              <Button
                variant={filter === 'ended' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('ended')}
              >
                Finalizadas ({stats.ended})
              </Button>
              <Button
                variant={filter === 'cancelled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('cancelled')}
              >
                Canceladas ({stats.cancelled})
              </Button>
            </div>
          </div>
          
          <div>
            {sessions.length === 0 ? (
                <div className="text-center py-12">
                  <VideoOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {filter === 'all'
                      ? 'Nenhuma sessão de telemedicina encontrada.'
                      : `Nenhuma sessão ${filter === 'pending' ? 'pendente' : filter === 'active' ? 'ativa' : filter === 'ended' ? 'finalizada' : 'cancelada'} encontrada.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session) => {
                    const statusBadge = getStatusBadge(session.status)
                    const appointment = session.appointment

                    if (!appointment) return null

                    const appointmentDate = appointment.appointment_date
                      ? format(new Date(appointment.appointment_date), "dd 'de' MMMM 'de' yyyy", {
                          locale: ptBR,
                        })
                      : 'Data não informada'

                    const appointmentTime = appointment.appointment_time || 'Horário não informado'

                    return (
                      <Card key={session.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-4">
                              {/* Header */}
                              <div className="flex items-center gap-3">
                                <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(session.created_at), "dd/MM/yyyy 'às' HH:mm", {
                                    locale: ptBR,
                                  })}
                                </span>
                              </div>

                              {/* Informações da Consulta */}
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">Consulta:</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {appointmentDate} às {appointmentTime}
                                  </p>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">Paciente:</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {appointment.patients?.name || 'Nome não informado'}
                                  </p>
                                </div>

                                {appointment.doctors && (
                                  <div className="space-y-2">
                                    <span className="text-sm font-medium">Médico:</span>
                                    <p className="text-sm text-muted-foreground">
                                      {appointment.doctors.name} - CRM: {appointment.doctors.crm}
                                    </p>
                                  </div>
                                )}

                                <div className="space-y-2">
                                  <span className="text-sm font-medium">Tipo:</span>
                                  <Badge variant="outline">
                                    {appointment.consultation_type === 'telemedicina'
                                      ? 'Telemedicina'
                                      : appointment.consultation_type === 'hibrida'
                                      ? 'Híbrida'
                                      : 'Presencial'}
                                  </Badge>
                                </div>
                              </div>

                              {/* Informações Adicionais */}
                              <div className="flex flex-wrap gap-3 text-sm">
                                {session.started_at && (
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <PlayCircle className="h-3 w-3" />
                                    <span>
                                      Iniciada: {format(new Date(session.started_at), "dd/MM HH:mm", { locale: ptBR })}
                                    </span>
                                  </div>
                                )}

                                {session.ended_at && (
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>
                                      Finalizada: {format(new Date(session.ended_at), "dd/MM HH:mm", { locale: ptBR })}
                                    </span>
                                  </div>
                                )}

                                {session.cancelled_at && (
                                  <div className="flex items-center gap-1 text-destructive">
                                    <XCircle className="h-3 w-3" />
                                    <span>
                                      Cancelada: {format(new Date(session.cancelled_at), "dd/MM HH:mm", { locale: ptBR })}
                                    </span>
                                  </div>
                                )}

                                {session.cancellation_reason && (
                                  <div className="w-full mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm">
                                    <div className="flex items-start gap-2">
                                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="font-medium text-destructive mb-1">Motivo do Cancelamento:</p>
                                        <p className="text-muted-foreground">{session.cancellation_reason}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {session.duration_seconds && (
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Timer className="h-3 w-3" />
                                    <span>
                                      Duração: {Math.floor(session.duration_seconds / 60)} min
                                    </span>
                                  </div>
                                )}

                                {session.recording_url && (
                                  <Badge variant="outline" className="text-xs">
                                    <PlayCircle className="h-3 w-3 mr-1" />
                                    Gravada
                                  </Badge>
                                )}

                                {session.ai_summary && (
                                  <Badge variant="outline" className="text-xs">
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    Resumo IA
                                  </Badge>
                                )}

                                {session.feedback && session.feedback.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                    <span className="text-muted-foreground">
                                      {session.feedback[0].rating}/5
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Link da Sala */}
                              {session.room_url && (
                                <div className="pt-4 border-t">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm font-medium">Link da Sala:</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyRoomUrl(session.room_url)}
                                    >
                                      <Copy className="h-3 w-3 mr-1" />
                                      Copiar
                                    </Button>
                                  </div>
                                  <p className="text-xs text-muted-foreground break-all">
                                    {session.room_url}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Ações */}
                            <div className="flex flex-col gap-2 ml-4">
                              {session.status === 'active' || session.status === 'pending' ? (
                                <>
                                  <Link href={`/dashboard/consultas/detalhes/${appointment.id}`}>
                                    <Button>
                                      <Video className="h-4 w-4 mr-2" />
                                      {session.status === 'active' ? 'Entrar' : 'Iniciar'}
                                    </Button>
                                  </Link>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleCancelSession(session)}
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Cancelar
                                  </Button>
                                </>
                              ) : null}

                              {session.status === 'cancelled' && (
                                <div className="text-center p-2 bg-destructive/10 rounded text-sm text-destructive">
                                  <XCircle className="h-4 w-4 mx-auto mb-1" />
                                  Cancelada
                                </div>
                              )}

                              {session.status === 'ended' && (
                                <div className="flex flex-col gap-2">
                                  {session.recording_url && (
                                    <Button variant="outline" size="sm" asChild>
                                      <a
                                        href={session.recording_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <PlayCircle className="h-4 w-4 mr-2" />
                                        Gravação
                                      </a>
                                    </Button>
                                  )}
                                  {session.ai_summary && (
                                    <Link href={`/dashboard/consultas/detalhes/${appointment.id}`}>
                                      <Button variant="outline" size="sm">
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        Ver Resumo
                                      </Button>
                                    </Link>
                                  )}
                                </div>
                              )}

                              <Link href={`/dashboard/agendamentos/${appointment.id}`}>
                                <Button variant="outline" size="sm" className="w-full">
                                  <FileText className="h-4 w-4 mr-2" />
                                  Agendamento
                                </Button>
                              </Link>
                              
                              {appointment.patients?.id && (
                                <Link href={`/dashboard/prontuario/${appointment.patients.id}`}>
                                  <Button variant="ghost" size="sm" className="w-full">
                                    <User className="h-4 w-4 mr-2" />
                                    Prontuário
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

