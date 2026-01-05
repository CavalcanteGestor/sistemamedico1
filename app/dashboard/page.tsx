'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  Users, 
  UserCheck, 
  DollarSign, 
  TrendingUp, 
  Activity,
  Clock,
  ArrowRight,
  Zap,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  Stethoscope,
  XCircle,
  Percent,
  BarChart3,
  UserPlus,
  TrendingDown
} from 'lucide-react'
import Link from 'next/link'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

// Paleta azul moderna e tecnológica
const COLORS = [
  '#3B82F6', // Azul vibrante
  '#60A5FA', // Azul claro
  '#2563EB', // Azul escuro
  '#1D4ED8', // Azul profundo
  '#93C5FD', // Azul suave
  '#1E40AF', // Azul muito escuro
]

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalDoctors: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    todayAppointments: 0,
    pendingAppointments: 0,
    newPatientsThisMonth: 0,
    revenueThisMonth: 0,
    revenueLastMonth: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    avgAppointmentsPerDay: 0,
    upcomingAppointments: 0,
    totalPrescriptions: 0,
    totalExams: 0,
  })
  const [appointmentsByMonth, setAppointmentsByMonth] = useState<any[]>([])
  const [revenueByMonth, setRevenueByMonth] = useState<any[]>([])
  const [appointmentsByStatus, setAppointmentsByStatus] = useState<any[]>([])
  const [recentAppointments, setRecentAppointments] = useState<any[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([])
  const [topDoctors, setTopDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Carregar estatísticas gerais
      const [
        patientsRes, 
        doctorsRes, 
        appointmentsRes, 
        transactionsRes,
        newPatientsRes,
        thisMonthRevenueRes,
        lastMonthRevenueRes,
        prescriptionsRes,
        examsRes,
        upcomingAppointmentsRes,
        topDoctorsRes
      ] = await Promise.all([
        supabase.from('patients').select('id', { count: 'exact', head: true }),
        supabase.from('doctors').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('appointments').select('id, status, appointment_date, doctor_id', { count: 'exact' }),
        supabase
          .from('financial_transactions')
          .select('amount, transaction_type, created_at, paid_date, due_date')
          .eq('transaction_type', 'income'),
        supabase
          .from('patients')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', firstDayThisMonth),
        supabase
          .from('financial_transactions')
          .select('amount, transaction_type, paid_date, due_date, created_at'),
        supabase
          .from('financial_transactions')
          .select('amount, transaction_type, paid_date, due_date, created_at'),
        supabase.from('prescriptions').select('id', { count: 'exact', head: true }),
        supabase.from('exams').select('id', { count: 'exact', head: true }),
        supabase
          .from('appointments')
          .select(`
            *,
            patients:patient_id (name),
            doctors:doctor_id (name)
          `)
          .gte('appointment_date', today)
          .lte('appointment_date', nextWeek)
          .in('status', ['scheduled', 'confirmed'])
          .order('appointment_date', { ascending: true })
          .order('appointment_time', { ascending: true })
          .limit(10),
        supabase
          .from('appointments')
          .select(`
            doctor_id,
            doctors:doctor_id (name),
            id
          `)
          .eq('status', 'completed')
      ])

      // Contar pacientes
      const totalPatients = patientsRes.count || 0
      const newPatientsThisMonth = newPatientsRes.count || 0

      // Contar médicos
      const totalDoctors = doctorsRes.count || 0

      // Processar agendamentos
      const appointments = appointmentsRes.data || []
      const totalAppointments = appointmentsRes.count || 0
      const todayAppointments = appointments.filter(
        (apt: any) => apt.appointment_date === today
      ).length
      const pendingAppointments = appointments.filter(
        (apt: any) => apt.status === 'scheduled' || apt.status === 'confirmed'
      ).length
      const completedAppointments = appointments.filter(
        (apt: any) => apt.status === 'completed'
      ).length
      const cancelledAppointments = appointments.filter(
        (apt: any) => apt.status === 'cancelled' || apt.status === 'no_show'
      ).length
      const upcomingAppointments = appointments.filter(
        (apt: any) => apt.appointment_date >= today && 
                     (apt.status === 'scheduled' || apt.status === 'confirmed')
      ).length

      // Calcular receita - mesma lógica da página financeira
      const transactions = transactionsRes.data || []
      const currentDate = new Date()
      const todayDateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
      
      // Receita total: apenas receitas que foram pagas ou já venceram (mesma lógica da página financeira)
      const totalRevenue = transactions
        .filter((t: any) => {
          if (t.transaction_type !== 'income') return false
          // Se já foi pago, contar
          if (t.paid_date) return true
          // Se a data de vencimento já passou, contar como recebido
          if (t.due_date && new Date(t.due_date) <= todayDateObj) return true
          return false
        })
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

      // Receita deste mês: apenas receitas recebidas/pagas neste mês
      const firstDayThisMonthObj = new Date(firstDayThisMonth)
      firstDayThisMonthObj.setHours(0, 0, 0, 0)
      
      const revenueThisMonth = (thisMonthRevenueRes.data || [])
        .filter((t: any) => {
          if (t.transaction_type !== 'income') return false
          // Se já foi pago, verificar se foi pago neste mês
          if (t.paid_date) {
            const paidDate = new Date(t.paid_date)
            return paidDate >= firstDayThisMonthObj && paidDate <= now
          }
          // Se a data de vencimento já passou e é deste mês, contar
          if (t.due_date) {
            const dueDate = new Date(t.due_date)
            dueDate.setHours(0, 0, 0, 0)
            return dueDate <= todayDateObj && dueDate >= firstDayThisMonthObj
          }
          return false
        })
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

      // Receita do mês anterior: apenas receitas recebidas/pagas no mês anterior
      const firstDayLastMonthObj = new Date(firstDayLastMonth)
      firstDayLastMonthObj.setHours(0, 0, 0, 0)
      const lastDayLastMonthObj = new Date(lastDayLastMonth)
      lastDayLastMonthObj.setHours(23, 59, 59, 999)
      
      const revenueLastMonth = (lastMonthRevenueRes.data || [])
        .filter((t: any) => {
          if (t.transaction_type !== 'income') return false
          // Se já foi pago, verificar se foi pago no mês anterior
          if (t.paid_date) {
            const paidDate = new Date(t.paid_date)
            return paidDate >= firstDayLastMonthObj && paidDate <= lastDayLastMonthObj
          }
          // Se a data de vencimento já passou e é do mês anterior, contar
          if (t.due_date) {
            const dueDate = new Date(t.due_date)
            dueDate.setHours(0, 0, 0, 0)
            return dueDate >= firstDayLastMonthObj && dueDate <= lastDayLastMonthObj
          }
          return false
        })
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

      // Calcular média de agendamentos por dia (últimos 30 dias)
      const daysAgo30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const appointmentsLast30Days = appointments.filter(
        (apt: any) => apt.appointment_date >= daysAgo30
      ).length
      const avgAppointmentsPerDay = Math.round((appointmentsLast30Days / 30) * 10) / 10

      // Calcular top médicos
      const doctorCounts: { [key: string]: { count: number; name: string } } = {}
      if (topDoctorsRes.data) {
        topDoctorsRes.data.forEach((apt: any) => {
          const doctorId = apt.doctor_id
          if (doctorId && apt.doctors) {
            if (!doctorCounts[doctorId]) {
              doctorCounts[doctorId] = { count: 0, name: apt.doctors.name || 'Desconhecido' }
            }
            doctorCounts[doctorId].count++
          }
        })
      }
      const topDoctorsList = Object.entries(doctorCounts)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Total de prescrições e exames
      const totalPrescriptions = prescriptionsRes.count || 0
      const totalExams = examsRes.count || 0

      // Agendamentos por mês (últimos 6 meses)
      const monthsData: { [key: string]: number } = {}
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
        monthsData[monthKey] = 0
      }

      appointments.forEach((apt: any) => {
        const date = new Date(apt.appointment_date)
        const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
        if (monthsData.hasOwnProperty(monthKey)) {
          monthsData[monthKey]++
        }
      })

      const appointmentsChartData = Object.entries(monthsData).map(([month, count]) => ({
        month,
        agendamentos: count,
      }))

      // Receita por mês (últimos 6 meses)
      const revenueByMonthData: { [key: string]: number } = {}
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
        revenueByMonthData[monthKey] = 0
      }

      transactions.forEach((t: any) => {
        // Filtrar apenas receitas recebidas (pagas ou vencidas)
        if (t.transaction_type !== 'income') return
        if (!t.paid_date && (!t.due_date || new Date(t.due_date) > todayDateObj)) return
        
        // Usar paid_date ou due_date (se já venceu) para alocar no mês correto
        let dateToUse: Date | null = null
        
        if (t.paid_date) {
          dateToUse = new Date(t.paid_date)
        } else if (t.due_date) {
          const dueDate = new Date(t.due_date)
          dueDate.setHours(0, 0, 0, 0)
          // Só contar se já venceu (foi recebido)
          if (dueDate <= todayDateObj) {
            dateToUse = dueDate
          }
        }
        
        if (dateToUse) {
          const monthKey = dateToUse.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
          if (revenueByMonthData.hasOwnProperty(monthKey)) {
            revenueByMonthData[monthKey] += Number(t.amount) || 0
          }
        }
      })

      const revenueChartData = Object.entries(revenueByMonthData).map(([month, amount]) => ({
        month,
        receita: amount,
      }))

      // Agendamentos por status
      const statusCounts: { [key: string]: number } = {}
      appointments.forEach((apt: any) => {
        const status = apt.status || 'scheduled'
        statusCounts[status] = (statusCounts[status] || 0) + 1
      })

      const statusData = Object.entries(statusCounts).map(([name, value]) => ({
        name: getStatusLabel(name),
        value,
      }))

      // Agendamentos recentes
      const recent = await supabase
        .from('appointments')
        .select(
          `
          *,
          patients:patient_id (name),
          doctors:doctor_id (name)
        `
        )
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })
        .limit(5)

      setStats({
        totalPatients,
        totalDoctors,
        totalAppointments,
        totalRevenue,
        todayAppointments,
        pendingAppointments,
        newPatientsThisMonth,
        revenueThisMonth,
        revenueLastMonth,
        completedAppointments,
        cancelledAppointments,
        avgAppointmentsPerDay,
        upcomingAppointments,
        totalPrescriptions,
        totalExams,
      })

      setAppointmentsByMonth(appointmentsChartData)
      setRevenueByMonth(revenueChartData)
      setAppointmentsByStatus(statusData)
      setRecentAppointments(recent.data || [])
      setUpcomingAppointments(upcomingAppointmentsRes.data || [])
      setTopDoctors(topDoctorsList)
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      scheduled: 'Agendado',
      confirmed: 'Confirmado',
      completed: 'Concluído',
      cancelled: 'Cancelado',
      no_show: 'Não Compareceu',
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
          <p className="text-muted-foreground font-medium">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header melhorado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">Visão geral completa do Lumi</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/relatorios">
              <FileText className="h-4 w-4 mr-2" />
              Relatórios
            </Link>
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas Principais */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/pacientes" className="group">
          <Card className="hover-lift relative overflow-hidden border-primary/20 group-hover:border-primary/40 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold mb-1">{stats.totalPatients}</div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Pacientes cadastrados</p>
                <TrendingUp className="h-3 w-3 text-primary" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/medicos" className="group">
          <Card className="hover-lift relative overflow-hidden border-primary/20 group-hover:border-primary/40 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">Médicos Ativos</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <UserCheck className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold mb-1">{stats.totalDoctors}</div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Médicos na clínica</p>
                <Activity className="h-3 w-3 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/agendamentos" className="group">
          <Card className="hover-lift relative overflow-hidden border-primary/20 group-hover:border-primary/40 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold mb-1">{stats.todayAppointments}</div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {stats.pendingAppointments} pendentes
                </Badge>
                <Clock className="h-3 w-3 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/financeiro" className="group">
          <Card className="hover-lift relative overflow-hidden border-primary/20 group-hover:border-primary/40 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold mb-1">
                R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Receita acumulada</p>
                <TrendingUp className="h-3 w-3 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Cards de Estatísticas Secundárias */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-lift relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Novos Pacientes</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10">
              <UserPlus className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold mb-1">{stats.newPatientsThisMonth}</div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>

        <Card className="hover-lift relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Receita do Mês</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold mb-1">
              R$ {stats.revenueThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-2">
              {stats.revenueLastMonth > 0 && (
                <>
                  {stats.revenueThisMonth >= stats.revenueLastMonth ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {stats.revenueLastMonth > 0 
                      ? `${((stats.revenueThisMonth - stats.revenueLastMonth) / stats.revenueLastMonth * 100).toFixed(1)}% vs mês anterior`
                      : 'vs mês anterior'
                    }
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Percent className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold mb-1">
              {stats.totalAppointments > 0 
                ? Math.round((stats.completedAppointments / stats.totalAppointments) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.completedAppointments} de {stats.totalAppointments} agendamentos
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Média Diária</CardTitle>
            <div className="p-2 rounded-lg bg-orange-500/10">
              <BarChart3 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold mb-1">{stats.avgAppointmentsPerDay}</div>
            <p className="text-xs text-muted-foreground">Agendamentos/dia (últimos 30 dias)</p>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Próximos Agendamentos e Top Médicos */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Próximos Agendamentos */}
        <Card className="hover-lift">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Próximos Agendamentos</CardTitle>
                <CardDescription>Agendamentos da próxima semana</CardDescription>
              </div>
              <Badge variant="secondary">{upcomingAppointments.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground font-medium">Nenhum agendamento próximo</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.slice(0, 5).map((appointment: any) => {
                  const appointmentDate = new Date(appointment.appointment_date)
                  const todayStr = new Date().toISOString().split('T')[0]
                  const appointmentDateStr = appointmentDate.toISOString().split('T')[0]
                  const isToday = appointmentDateStr === todayStr
                  
                  return (
                    <Link 
                      key={appointment.id}
                      href={`/dashboard/agendamentos`}
                      className="block"
                    >
                      <div className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent hover:border-primary/30 transition-all duration-200 group">
                        <div className={`p-2 rounded-lg ${isToday ? 'bg-primary/20' : 'bg-primary/5'} group-hover:bg-primary/10 transition-colors`}>
                          <Calendar className={`h-4 w-4 ${isToday ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm">
                              {appointmentDate.toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                ...(isToday ? {} : { year: 'numeric' })
                              })}
                            </p>
                            {isToday && (
                              <Badge variant="default" className="text-xs">Hoje</Badge>
                            )}
                            <span className="text-muted-foreground">•</span>
                            <p className="text-sm font-medium text-primary">
                              {appointment.appointment_time}
                            </p>
                          </div>
                          <p className="text-sm text-foreground truncate">
                            {appointment.patients?.name || 'Paciente não informado'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {appointment.doctors?.name || 'Médico não informado'}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
            {upcomingAppointments.length > 5 && (
              <div className="mt-4">
                <Button variant="ghost" size="sm" asChild className="w-full">
                  <Link href="/dashboard/agendamentos">
                    Ver todos ({upcomingAppointments.length})
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Médicos */}
        <Card className="hover-lift">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Médicos Mais Ativos</CardTitle>
                <CardDescription>Médicos com mais consultas concluídas</CardDescription>
              </div>
              <Stethoscope className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {topDoctors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <UserCheck className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground font-medium">Sem dados disponíveis</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topDoctors.map((doctor, index) => (
                  <div 
                    key={doctor.id}
                    className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{doctor.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {doctor.count} {doctor.count === 1 ? 'consulta' : 'consultas'} concluídas
                      </p>
                    </div>
                    <Badge variant="secondary">{doctor.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Melhorados */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover-lift">
          <CardHeader>
            <div>
              <CardTitle>Agendamentos por Mês</CardTitle>
              <CardDescription>Evolução dos agendamentos nos últimos 6 meses</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={appointmentsByMonth}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
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
                  dataKey="agendamentos" 
                  fill="url(#barGradient)"
                  radius={[8, 8, 0, 0]}
                  stroke="#2563EB"
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader>
            <div>
              <CardTitle>Agendamentos por Status</CardTitle>
              <CardDescription>Distribuição dos agendamentos por status</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <defs>
                  {COLORS.map((color, index) => (
                    <linearGradient key={`pieGradient${index}`} id={`pieGradient${index}`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                    </linearGradient>
                  ))}
                </defs>
                <Pie
                  data={appointmentsByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
                  innerRadius={30}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                >
                  {appointmentsByStatus.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`url(#pieGradient${index % COLORS.length})`}
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
          </CardContent>
        </Card>
      </div>

      {/* Receita por Mês Melhorado */}
      <Card className="hover-lift">
        <CardHeader>
          <div>
            <CardTitle>Receita por Mês</CardTitle>
            <CardDescription>Evolução da receita nos últimos 6 meses</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueByMonth}>
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
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
                formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line 
                type="monotone" 
                dataKey="receita" 
                stroke="#3B82F6" 
                strokeWidth={3}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 7, stroke: '#2563EB', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Agendamentos Recentes Melhorados */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Agendamentos Recentes</CardTitle>
              <CardDescription>Últimos agendamentos do sistema</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/agendamentos">
                Ver todos
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground font-medium">Nenhum agendamento recente</p>
              <p className="text-sm text-muted-foreground mt-1">
                Os agendamentos recentes aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAppointments.map((appointment: any) => {
                const statusConfig = {
                  scheduled: { label: 'Agendado', variant: 'default' as const, icon: Clock },
                  confirmed: { label: 'Confirmado', variant: 'default' as const, icon: CheckCircle2 },
                  completed: { label: 'Concluído', variant: 'default' as const, icon: CheckCircle2 },
                  cancelled: { label: 'Cancelado', variant: 'destructive' as const, icon: AlertCircle },
                  no_show: { label: 'Não Compareceu', variant: 'destructive' as const, icon: AlertCircle },
                }
                const config = statusConfig[appointment.status as keyof typeof statusConfig] || statusConfig.scheduled
                const StatusIcon = config.icon

                return (
                  <Link 
                    key={appointment.id}
                    href={`/dashboard/agendamentos`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent hover:border-primary/30 transition-all duration-200 group">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-2 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors">
                          <Calendar className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-semibold text-sm">
                              {new Date(appointment.appointment_date).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                            <span className="text-muted-foreground">•</span>
                            <p className="text-sm font-medium text-primary">
                              {appointment.appointment_time}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm text-foreground font-medium">
                              {appointment.patients?.name || 'Paciente não informado'}
                            </p>
                            <span className="text-muted-foreground">•</span>
                            <p className="text-sm text-muted-foreground">
                              {appointment.doctors?.name || 'Médico não informado'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={config.variant} className="flex items-center gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

