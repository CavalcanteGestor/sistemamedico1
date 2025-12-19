'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Calendar as CalendarIcon,
  Video,
  Search,
  Filter,
  Clock,
  User,
  UserPlus,
  Stethoscope,
  ArrowRight,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  MoreVertical,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CalendarView } from '@/components/calendar/calendar-view'
import { DateAgendamentosModal } from '@/components/calendar/date-agendamentos-modal'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter } from 'next/navigation'

interface CalendarEvent {
  id: string
  title: string
  date: string
  time: string
  type: 'appointment'
  status: string
  patientName?: string
  doctorName?: string
}

export default function AgendamentosPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [appointments, setAppointments] = useState<any[]>([])
  const [telemedicineSessions, setTelemedicineSessions] = useState<Record<string, any>>({})
  const [allDoctors, setAllDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [doctorFilter, setDoctorFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [newStatus, setNewStatus] = useState<string>('')
  const [cancellationReason, setCancellationReason] = useState<string>('')
  const [actionLoading, setActionLoading] = useState(false)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadAppointments()
    loadDoctors()
  }, [])
  
  const loadDoctors = async () => {
    try {
      const { getAvailableDoctors } = await import('@/lib/utils/doctor-helpers')
      const doctors = await getAvailableDoctors(supabase, { active: true })
      setAllDoctors(doctors.map(d => ({ id: d.id, name: d.name })))
    } catch (error) {
      console.error('Erro ao carregar médicos:', error)
    }
  }

  const loadAppointments = async () => {
    try {
      // Verificar se é médico para filtrar apenas seus agendamentos
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

      let query = supabase
        .from('appointments')
        .select(`
          *,
          patients:patient_id (
            id,
            name,
            phone
          ),
          doctors:doctor_id (
            id,
            name,
            crm
          )
        `)
        // Incluir campos de rastreamento de quem criou (já estão na tabela appointments)

      // Se for médico, filtrar apenas seus agendamentos
      if (doctorId) {
        query = query.eq('doctor_id', doctorId)
      }

      const { data, error } = await query
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })

      if (error) throw error
      setAppointments(data || [])

      // Criar eventos para o calendário
      const calendarEvents: CalendarEvent[] = (data || []).map((apt) => ({
        id: apt.id,
        title: `Consulta - ${apt.patients?.name || 'Sem nome'}`,
        date: apt.appointment_date,
        time: apt.appointment_time,
        type: 'appointment' as const,
        status: apt.status,
        patientName: apt.patients?.name,
        doctorName: apt.doctors?.name,
      }))
      setCalendarEvents(calendarEvents)

      // Buscar sessões de telemedicina
      if (data && data.length > 0) {
        const appointmentIds = data.map((apt: any) => apt.id)
        const { data: sessions } = await supabase
          .from('telemedicine_sessions')
          .select('*')
          .in('appointment_id', appointmentIds)

        if (sessions) {
          const sessionsMap: Record<string, any> = {}
          sessions.forEach((session: any) => {
            sessionsMap[session.appointment_id] = session
          })
          setTelemedicineSessions(sessionsMap)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  const canStartTelemedicine = (appointment: any) => {
    if (appointment.consultation_type !== 'telemedicina' && appointment.consultation_type !== 'hibrida') {
      return false
    }

    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
    const now = new Date()
    const minutesBefore = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60)

    // Permitir iniciar 15 minutos antes até 2 horas depois
    return minutesBefore <= 15 && minutesBefore >= -120
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      scheduled: 'default',
      confirmed: 'default',
      completed: 'secondary',
      cancelled: 'destructive',
      no_show: 'destructive',
    }
    return variants[status] || 'default'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: 'Agendada',
      confirmed: 'Confirmada',
      completed: 'Concluída',
      cancelled: 'Cancelada',
      no_show: 'Falta',
    }
    return labels[status] || status
  }

  const handleDeleteClick = (appointment: any) => {
    setSelectedAppointment(appointment)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedAppointment) return

    try {
      setActionLoading(true)
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', selectedAppointment.id)

      if (error) throw error

      toast({
        title: 'Agendamento excluído',
        description: 'O agendamento foi removido com sucesso.',
      })

      loadAppointments()
      setDeleteDialogOpen(false)
      setSelectedAppointment(null)
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir agendamento',
        description: error.message || 'Não foi possível excluir o agendamento',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleStatusChangeClick = (appointment: any) => {
    setSelectedAppointment(appointment)
    setNewStatus('')
    setCancellationReason('')
    setStatusDialogOpen(true)
  }

  const handleStatusConfirm = async () => {
    if (!selectedAppointment || !newStatus) return

    try {
      setActionLoading(true)
      const updateData: any = {
        status: newStatus,
      }

      // Se for cancelamento, adicionar motivo
      if (newStatus === 'cancelled' && cancellationReason) {
        updateData.notes = selectedAppointment.notes 
          ? `${selectedAppointment.notes}\n\n[Motivo do cancelamento: ${cancellationReason}]`
          : `[Motivo do cancelamento: ${cancellationReason}]`
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', selectedAppointment.id)

      if (error) throw error

      toast({
        title: 'Status atualizado',
        description: `O status do agendamento foi alterado para "${getStatusLabel(newStatus)}".`,
      })

      loadAppointments()
      setStatusDialogOpen(false)
      setSelectedAppointment(null)
      setNewStatus('')
      setCancellationReason('')
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message || 'Não foi possível atualizar o status',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Filtrar agendamentos
  const today = new Date().toISOString().split('T')[0]
  const filteredAppointments = appointments.filter((apt: any) => {
    // Filtro de busca
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const matchesSearch =
        apt.patients?.name?.toLowerCase().includes(search) ||
        apt.doctors?.name?.toLowerCase().includes(search) ||
        apt.appointment_date.includes(search) ||
        apt.appointment_time.includes(search) ||
        apt.notes?.toLowerCase().includes(search)
      if (!matchesSearch) return false
    }

    // Filtro de status
    if (statusFilter !== 'all' && apt.status !== statusFilter) return false

    // Filtro de médico
    if (doctorFilter !== 'all' && apt.doctor_id !== doctorFilter) return false

    // Filtro de data
    if (dateFilter === 'today' && apt.appointment_date !== today) return false
    if (dateFilter === 'upcoming' && apt.appointment_date < today) return false
    if (dateFilter === 'past' && apt.appointment_date >= today) return false
    if (dateFilter === 'week') {
      const weekFromNow = new Date()
      weekFromNow.setDate(weekFromNow.getDate() + 7)
      const aptDate = new Date(apt.appointment_date)
      if (aptDate < new Date(today) || aptDate > weekFromNow) return false
    }

    // Filtro de tipo
    if (typeFilter !== 'all') {
      if (typeFilter === 'telemedicina' && apt.consultation_type !== 'telemedicina') return false
      if (typeFilter === 'presencial' && apt.consultation_type !== 'presencial') return false
      if (typeFilter === 'hibrida' && apt.consultation_type !== 'hibrida') return false
    }

    return true
  })

  // Separar por status
  const upcomingAppointments = filteredAppointments.filter(
    (apt) => apt.appointment_date >= today && apt.status !== 'cancelled' && apt.status !== 'completed'
  )
  const pastAppointments = filteredAppointments.filter(
    (apt) => apt.appointment_date < today || apt.status === 'completed' || apt.status === 'cancelled'
  )

  // Estatísticas rápidas
  const stats = {
    today: appointments.filter((apt) => apt.appointment_date === today).length,
    upcoming: appointments.filter((apt) => apt.appointment_date >= today && apt.status !== 'cancelled').length,
    completed: appointments.filter((apt) => apt.status === 'completed').length,
    cancelled: appointments.filter((apt) => apt.status === 'cancelled').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
          <p className="text-muted-foreground font-medium">Carregando agendamentos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header melhorado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Agendamentos
          </h1>
          <p className="text-muted-foreground mt-2">Gerencie todos os agendamentos da clínica</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/agendamentos/novo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Agendamento
            </Button>
          </Link>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoje</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today}</div>
            <p className="text-xs text-muted-foreground">Agendamentos hoje</p>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos</CardTitle>
            <CalendarIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcoming}</div>
            <p className="text-xs text-muted-foreground">Agendamentos futuros</p>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Consultas finalizadas</p>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cancelled}</div>
            <p className="text-xs text-muted-foreground">Consultas canceladas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros e Busca</CardTitle>
          <CardDescription>Filtre e encontre agendamentos rapidamente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por paciente, médico, data..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="scheduled">Agendada</SelectItem>
                <SelectItem value="confirmed">Confirmada</SelectItem>
                <SelectItem value="completed">Concluída</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
                <SelectItem value="no_show">Falta</SelectItem>
              </SelectContent>
            </Select>
            <Select value={doctorFilter} onValueChange={setDoctorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Médico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Médicos</SelectItem>
                {allDoctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Próximos 7 dias</SelectItem>
                <SelectItem value="upcoming">Futuros</SelectItem>
                <SelectItem value="past">Passados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tipo de Consulta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="presencial">Presencial</SelectItem>
                <SelectItem value="telemedicina">Telemedicina</SelectItem>
                <SelectItem value="hibrida">Híbrida</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs para alternar entre Lista e Calendário - Destacado e Visível */}
      <Tabs defaultValue="lista" className="space-y-6">
        {/* Card destacado com os botões de alternância - MUITO VISÍVEL */}
        <Card className="border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-primary/15 to-primary/10 shadow-2xl hover:shadow-primary/20 transition-all ring-2 ring-primary/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold flex items-center justify-center gap-3 text-primary">
              <div className="p-2 bg-primary/20 rounded-lg">
                <CalendarIcon className="h-6 w-6" />
              </div>
              <span>Alternar Modo de Visualização</span>
            </CardTitle>
            <CardDescription className="text-center text-base">
              Selecione como deseja visualizar seus agendamentos
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 pb-6">
            <div className="flex flex-col items-center">
              <TabsList className="grid w-full max-w-2xl grid-cols-2 h-20 bg-background/90 backdrop-blur-md border-2 border-primary/40 rounded-2xl p-2 shadow-2xl">
                <TabsTrigger 
                  value="lista" 
                  className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-xl text-lg font-bold transition-all duration-300 hover:scale-[1.02] rounded-xl py-4 data-[state=inactive]:hover:bg-primary/10"
                >
                  <FileText className="h-6 w-6 mr-3" />
                  <div className="text-left">
                    <div className="font-bold">Lista</div>
                    <div className="text-xs font-normal opacity-90">Agendamentos em lista</div>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="calendario" 
                  className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-xl text-lg font-bold transition-all duration-300 hover:scale-[1.02] rounded-xl py-4 data-[state=inactive]:hover:bg-primary/10"
                >
                  <CalendarIcon className="h-6 w-6 mr-3" />
                  <div className="text-left">
                    <div className="font-bold">Calendário Visual</div>
                    <div className="text-xs font-normal opacity-90">Visualização em calendário</div>
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>
          </CardContent>
        </Card>

        {/* Aba de Lista */}
        <TabsContent value="lista" className="space-y-6 mt-6">
          {/* Lista de Agendamentos Profissional */}
          <div className="space-y-6">
        {/* Próximos Agendamentos */}
        {upcomingAppointments.length > 0 && (
          <Card className="hover-lift">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    Próximos Agendamentos
                  </CardTitle>
                  <CardDescription>
                    {upcomingAppointments.length} {upcomingAppointments.length === 1 ? 'agendamento' : 'agendamentos'} encontrado{upcomingAppointments.length === 1 ? '' : 's'}
                  </CardDescription>
                </div>
                <Badge variant="secondary">{upcomingAppointments.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingAppointments.map((appointment: any) => {
                  const appointmentDate = new Date(appointment.appointment_date)
                  const isToday = appointment.appointment_date === today
                  const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
                  const now = new Date()
                  const isUpcoming = appointmentDateTime > now
                  
                  return (
                    <div 
                      key={appointment.id}
                      className="group p-4 border rounded-lg hover:bg-accent hover:border-primary/30 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <Link 
                          href={`/dashboard/pacientes/${appointment.patient_id}`}
                          className="flex items-start gap-4 flex-1 min-w-0 hover:opacity-80 transition-opacity"
                        >
                          <div className={`p-3 rounded-lg ${isToday ? 'bg-primary/20' : 'bg-primary/5'} group-hover:bg-primary/10 transition-colors flex-shrink-0`}>
                            <CalendarIcon className={`h-5 w-5 ${isToday ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <p className="font-semibold text-base">
                                {format(appointmentDate, "dd 'de' MMMM", { locale: ptBR })} às {appointment.appointment_time}
                              </p>
                              {isToday && (
                                <Badge variant="default" className="text-xs">Hoje</Badge>
                              )}
                              {!isUpcoming && appointment.status !== 'completed' && (
                                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                  Em andamento
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <p className="text-sm font-medium text-foreground">
                                  {appointment.patients?.name || 'Paciente não informado'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Stethoscope className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <p className="text-sm text-muted-foreground">
                                  {appointment.doctors?.name || 'Médico não informado'}
                                </p>
                              </div>
                              {appointment.created_by_name && (
                                <div className="flex items-center gap-2">
                                  <UserPlus className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                  <p className="text-xs text-muted-foreground">
                                    Agendado por: {appointment.created_by_name}
                                    {appointment.created_by_type === 'admin' && ' (Admin)'}
                                    {appointment.created_by_type === 'ia' && ' (Assistente Virtual)'}
                                  </p>
                                </div>
                              )}
                              {appointment.notes && (
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {appointment.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            <Badge variant={getStatusBadge(appointment.status) as any}>
                              {getStatusLabel(appointment.status)}
                            </Badge>
                            {(appointment.consultation_type === 'telemedicina' || appointment.consultation_type === 'hibrida') && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Video className="h-3 w-3" />
                                {appointment.consultation_type === 'telemedicina' ? 'Telemedicina' : 'Híbrida'}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            {canStartTelemedicine(appointment) && (
                              <Link 
                                href={`/dashboard/consultas/telemedicina/${appointment.id}`}
                              >
                                <Button size="sm" variant="default" className="gap-1">
                                  <Video className="h-3 w-3" />
                                  {telemedicineSessions[appointment.id] ? 'Entrar' : 'Iniciar'}
                                </Button>
                              </Link>
                            )}
                            {appointment.status === 'completed' && (
                              <Link 
                                href={`/dashboard/prontuario/novo?appointment_id=${appointment.id}`}
                              >
                                <Button size="sm" variant="outline" className="gap-1">
                                  <FileText className="h-3 w-3" />
                                  Prontuário
                                </Button>
                              </Link>
                            )}
                            <Link 
                              href={`/dashboard/pacientes/${appointment.patient_id}`}
                            >
                              <Button size="sm" variant="ghost">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/dashboard/agendamentos/${appointment.id}/editar`}>
                              <Button size="sm" variant="ghost" title="Editar">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleStatusChangeClick(appointment)}
                              title="Alterar Status"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleDeleteClick(appointment)}
                              title="Excluir"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Histórico */}
        {pastAppointments.length > 0 && (
          <Card className="hover-lift">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Histórico de Agendamentos</CardTitle>
                  <CardDescription>
                    {pastAppointments.length} {pastAppointments.length === 1 ? 'agendamento' : 'agendamentos'} passado{pastAppointments.length === 1 ? '' : 's'}
                  </CardDescription>
                </div>
                <Badge variant="secondary">{pastAppointments.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pastAppointments.slice(0, 20).map((appointment: any) => (
                  <div 
                    key={appointment.id}
                    className="group p-4 border rounded-lg hover:bg-accent hover:border-primary/30 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <Link 
                        href={`/dashboard/pacientes/${appointment.patient_id}`}
                        className="flex items-start gap-4 flex-1 min-w-0 hover:opacity-80 transition-opacity"
                      >
                        <div className="p-3 rounded-lg bg-muted group-hover:bg-primary/5 transition-colors flex-shrink-0">
                          <Clock className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <p className="font-semibold">
                              {format(new Date(appointment.appointment_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} às {appointment.appointment_time}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <p className="text-sm font-medium">
                                {appointment.patients?.name || 'Paciente não informado'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Stethoscope className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <p className="text-sm text-muted-foreground">
                                {appointment.doctors?.name || 'Médico não informado'}
                              </p>
                            </div>
                            {appointment.created_by_name && (
                              <div className="flex items-center gap-2">
                                <UserPlus className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <p className="text-xs text-muted-foreground">
                                  Agendado por: {appointment.created_by_name}
                                  {appointment.created_by_type === 'admin' && ' (Admin)'}
                                  {appointment.created_by_type === 'ia' && ' (Assistente Virtual)'}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <Badge variant={getStatusBadge(appointment.status) as any}>
                          {getStatusLabel(appointment.status)}
                        </Badge>
                        {appointment.status === 'completed' && (
                          <Link 
                            href={`/dashboard/prontuario/novo?appointment_id=${appointment.id}`}
                          >
                            <Button size="sm" variant="outline" className="gap-1">
                              <FileText className="h-3 w-3" />
                              Prontuário
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {pastAppointments.length > 20 && (
                  <div className="text-center pt-4">
                    <p className="text-sm text-muted-foreground">
                      Mostrando 20 de {pastAppointments.length} agendamentos
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mensagem quando não há resultados */}
        {filteredAppointments.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-center">
                <CalendarIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground font-medium">Nenhum agendamento encontrado</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tente ajustar os filtros ou criar um novo agendamento
                </p>
                <Link href="/dashboard/agendamentos/novo" className="mt-4">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Agendamento
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
          </div>
        </TabsContent>

        {/* Aba de Calendário */}
        <TabsContent value="calendario" className="space-y-6">
          {/* Legenda de Status */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="font-semibold text-muted-foreground">Legenda:</span>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500/10 border border-blue-500/20"></div>
                  <span>Agendada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-500/10 border border-green-500/20"></div>
                  <span>Confirmada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-gray-500/10 border border-gray-500/20"></div>
                  <span>Concluída</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-red-500/10 border border-red-500/20"></div>
                  <span>Cancelada</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <CalendarView
            events={calendarEvents}
            onDateClick={(date) => {
              setSelectedDate(date)
              setModalOpen(true)
            }}
            onEventClick={(event) => {
              router.push(`/dashboard/agendamentos`)
            }}
          />

          {/* Modal de agendamentos do dia */}
          <DateAgendamentosModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            date={selectedDate}
            onRefresh={loadAppointments}
          />
        </TabsContent>
      </Tabs>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
              {selectedAppointment && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="font-medium">
                    {new Date(selectedAppointment.appointment_date).toLocaleDateString('pt-BR')} às {selectedAppointment.appointment_time}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedAppointment.patients?.name} - {selectedAppointment.doctors?.name}
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setSelectedAppointment(null)
              }}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={actionLoading}
            >
              {actionLoading ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Alteração de Status */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Status do Agendamento</DialogTitle>
            <DialogDescription>
              Selecione o novo status para este agendamento.
              {selectedAppointment && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="font-medium">
                    {new Date(selectedAppointment.appointment_date).toLocaleDateString('pt-BR')} às {selectedAppointment.appointment_time}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedAppointment.patients?.name} - {selectedAppointment.doctors?.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Status atual: <Badge variant={getStatusBadge(selectedAppointment.status) as any}>
                      {getStatusLabel(selectedAppointment.status)}
                    </Badge>
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Novo Status *</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Agendada</SelectItem>
                  <SelectItem value="confirmed">Confirmada</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                  <SelectItem value="no_show">Falta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newStatus === 'cancelled' && (
              <div className="space-y-2">
                <Label htmlFor="cancellation_reason">Motivo do Cancelamento</Label>
                <Textarea
                  id="cancellation_reason"
                  placeholder="Informe o motivo do cancelamento (opcional)"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setStatusDialogOpen(false)
                setSelectedAppointment(null)
                setNewStatus('')
                setCancellationReason('')
              }}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleStatusConfirm}
              disabled={actionLoading || !newStatus}
            >
              {actionLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

