'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Download, 
  Calendar, 
  FileText, 
  Users, 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  Activity,
  UserCheck,
  Video,
  Pill,
  FileSearch,
  BarChart3
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { generateReportPDF } from '@/lib/pdf/generate-report-pdf'
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

// Paleta azul moderna e tecnológica
const COLORS = [
  '#3B82F6', // Azul vibrante
  '#60A5FA', // Azul claro
  '#2563EB', // Azul escuro
  '#1D4ED8', // Azul profundo
  '#93C5FD', // Azul suave
  '#1E40AF', // Azul muito escuro
]

interface ReportStats {
  total: number
  completed?: number
  cancelled?: number
  pending?: number
  revenue?: number
  expenses?: number
  balance?: number
  [key: string]: number | undefined
}

export default function RelatoriosPage() {
  const [reportType, setReportType] = useState('appointments')
  const [dateRange, setDateRange] = useState('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [doctorFilter, setDoctorFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [reportData, setReportData] = useState<any>(null)
  const [reportStats, setReportStats] = useState<ReportStats | null>(null)
  const [rawData, setRawData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [doctors, setDoctors] = useState<any[]>([])
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadDoctors()
  }, [])

  useEffect(() => {
    loadReport()
  }, [reportType, dateRange, doctorFilter, statusFilter])

  const loadDoctors = async () => {
    try {
      const { data } = await supabase
        .from('doctors')
        .select('id, name, crm')
        .eq('active', true)
        .order('name')
      
      setDoctors(data || [])
    } catch (error) {
      console.error('Erro ao carregar médicos:', error)
    }
  }

  const getDateRange = () => {
    const now = new Date()
    let start = new Date()
    let end = new Date()
    end.setHours(23, 59, 59, 999)

    if (dateRange === 'custom') {
      if (startDate && endDate) {
        start = new Date(startDate)
        end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        return { start, end }
      } else {
        // Se não tiver datas customizadas, usar mês atual
        start = new Date(now.getFullYear(), now.getMonth(), 1)
      }
    } else if (dateRange === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (dateRange === 'quarter') {
      const quarter = Math.floor(now.getMonth() / 3)
      start = new Date(now.getFullYear(), quarter * 3, 1)
    } else if (dateRange === 'year') {
      start = new Date(now.getFullYear(), 0, 1)
    } else if (dateRange === 'week') {
      const dayOfWeek = now.getDay()
      start = new Date(now)
      start.setDate(now.getDate() - dayOfWeek)
      start.setHours(0, 0, 0, 0)
    }

    return { start, end }
  }

  const loadReport = async () => {
    try {
      setLoading(true)
      const { start, end } = getDateRange()
      
      const startISO = start.toISOString().split('T')[0]
      const endISO = end.toISOString().split('T')[0]

      if (reportType === 'appointments') {
        await loadAppointmentsReport(startISO, endISO)
      } else if (reportType === 'patients') {
        await loadPatientsReport(startISO, endISO)
      } else if (reportType === 'financial') {
        await loadFinancialReport(startISO, endISO)
      } else if (reportType === 'doctors') {
        await loadDoctorsReport(startISO, endISO)
      } else if (reportType === 'telemedicine') {
        await loadTelemedicineReport(startISO, endISO)
      } else if (reportType === 'prescriptions') {
        await loadPrescriptionsReport(startISO, endISO)
      } else if (reportType === 'exams') {
        await loadExamsReport(startISO, endISO)
      }
    } catch (error: any) {
      console.error('Erro ao carregar relatório:', error)
      toast({
        title: 'Erro ao carregar relatório',
        description: error.message || 'Não foi possível carregar o relatório',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadAppointmentsReport = async (startISO: string, endISO: string) => {
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
        patients:patient_id (name, cpf),
        doctors:doctor_id (name, crm)
      `)
      .gte('appointment_date', startISO)
      .lte('appointment_date', endISO)

    // Se for médico, filtrar apenas seus agendamentos
    if (doctorId) {
      query = query.eq('doctor_id', doctorId)
    } else if (doctorFilter !== 'all') {
      query = query.eq('doctor_id', doctorFilter)
    }

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data, error } = await query.order('appointment_date', { ascending: false })

    if (error) throw error

    setRawData(data || [])

    // Estatísticas
    const stats: ReportStats = {
      total: data?.length || 0,
      completed: data?.filter((a: any) => a.status === 'completed').length || 0,
      cancelled: data?.filter((a: any) => a.status === 'cancelled').length || 0,
      scheduled: data?.filter((a: any) => a.status === 'scheduled').length || 0,
      confirmed: data?.filter((a: any) => a.status === 'confirmed').length || 0,
      no_show: data?.filter((a: any) => a.status === 'no_show').length || 0,
    }
    setReportStats(stats)

    // Gráfico por status
    const statusCounts: { [key: string]: number } = {}
    data?.forEach((apt: any) => {
      statusCounts[apt.status] = (statusCounts[apt.status] || 0) + 1
    })

    // Gráfico mensal
    const monthly: { [key: string]: number } = {}
    data?.forEach((apt: any) => {
      const date = new Date(apt.appointment_date)
      const monthKey = format(date, 'MMM yyyy', { locale: ptBR })
      monthly[monthKey] = (monthly[monthKey] || 0) + 1
    })

    setReportData({
      charts: [
        {
          type: 'pie',
          title: 'Agendamentos por Status',
          data: Object.entries(statusCounts).map(([name, value]) => ({
            name: getStatusLabel(name),
            value,
          })),
        },
        {
          type: 'bar',
          title: 'Agendamentos por Mês',
          data: Object.entries(monthly)
            .sort((a, b) => {
              const dateA = new Date(Number(a[0].split(' ')[1]), getMonthIndex(a[0].split(' ')[0]))
              const dateB = new Date(Number(b[0].split(' ')[1]), getMonthIndex(b[0].split(' ')[0]))
              return dateA.getTime() - dateB.getTime()
            })
            .map(([month, count]) => ({
              month,
              agendamentos: count,
            })),
        },
      ],
    })
  }

  const loadPatientsReport = async (startISO: string, endISO: string) => {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .gte('created_at', startISO + 'T00:00:00')
      .lte('created_at', endISO + 'T23:59:59')
      .order('created_at', { ascending: false })

    if (error) throw error

    setRawData(data || [])

    const stats: ReportStats = {
      total: data?.length || 0,
    }
    setReportStats(stats)

    // Agrupar por mês
    const monthly: { [key: string]: number } = {}
    data?.forEach((patient: any) => {
      const date = new Date(patient.created_at)
      const monthKey = format(date, 'MMM yyyy', { locale: ptBR })
      monthly[monthKey] = (monthly[monthKey] || 0) + 1
    })

    setReportData({
      charts: [
        {
          type: 'bar',
          title: 'Novos Pacientes por Mês',
          data: Object.entries(monthly)
            .sort((a, b) => {
              const dateA = new Date(Number(a[0].split(' ')[1]), getMonthIndex(a[0].split(' ')[0]))
              const dateB = new Date(Number(b[0].split(' ')[1]), getMonthIndex(b[0].split(' ')[0]))
              return dateA.getTime() - dateB.getTime()
            })
            .map(([month, count]) => ({
              month,
              pacientes: count,
            })),
        },
      ],
    })
  }

  const loadFinancialReport = async (startISO: string, endISO: string) => {
    const { data, error } = await supabase
      .from('financial_transactions')
      .select(`
        *,
        patients:patient_id (name)
      `)
      .gte('transaction_date', startISO)
      .lte('transaction_date', endISO)
      .order('transaction_date', { ascending: false })

    if (error) throw error

    setRawData(data || [])

    // Calcular estatísticas
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const income = data?.filter((t: any) => {
      if (t.transaction_type !== 'income') return false
      if (t.paid_date) return true
      if (t.due_date && new Date(t.due_date) <= today) return true
      return false
    }).reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0) || 0

    const expenses = data?.filter((t: any) => {
      if (t.transaction_type !== 'expense') return false
      if (t.paid_date) return true
      if (t.due_date && new Date(t.due_date) <= today) return true
      return false
    }).reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0) || 0

    const pendingIncome = data?.filter((t: any) => 
      t.transaction_type === 'income' && !t.paid_date && (!t.due_date || new Date(t.due_date) > today)
    ).reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0) || 0

    const stats: ReportStats = {
      total: data?.length || 0,
      revenue: income,
      expenses: expenses,
      balance: income - expenses,
      pending: pendingIncome,
    }
    setReportStats(stats)

    // Agrupar por mês
    const monthly: {
      [key: string]: { receitas: number; despesas: number }
    } = {}

    data?.forEach((t: any) => {
      const date = new Date(t.transaction_date)
      const monthKey = format(date, 'MMM yyyy', { locale: ptBR })
      if (!monthly[monthKey]) {
        monthly[monthKey] = { receitas: 0, despesas: 0 }
      }
      if (t.transaction_type === 'income') {
        monthly[monthKey].receitas += Number(t.amount) || 0
      } else {
        monthly[monthKey].despesas += Number(t.amount) || 0
      }
    })

    setReportData({
      charts: [
        {
          type: 'line',
          title: 'Fluxo Financeiro Mensal',
          data: Object.entries(monthly)
            .sort((a, b) => {
              const dateA = new Date(Number(a[0].split(' ')[1]), getMonthIndex(a[0].split(' ')[0]))
              const dateB = new Date(Number(b[0].split(' ')[1]), getMonthIndex(b[0].split(' ')[0]))
              return dateA.getTime() - dateB.getTime()
            })
            .map(([month, data]) => ({
              month,
              ...data,
            })),
        },
      ],
    })
  }

  const loadDoctorsReport = async (startISO: string, endISO: string) => {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        doctor_id,
        doctors:doctor_id (name, crm),
        status
      `)
      .gte('appointment_date', startISO)
      .lte('appointment_date', endISO)

    if (error) throw error

    // Agrupar por médico
    const doctorCounts: { [key: string]: { count: number; completed: number; name: string } } = {}
    
    data?.forEach((apt: any) => {
      const doctorId = apt.doctor_id
      const doctorName = apt.doctors?.name || 'Desconhecido'
      
      if (!doctorCounts[doctorId]) {
        doctorCounts[doctorId] = { count: 0, completed: 0, name: doctorName }
      }
      doctorCounts[doctorId].count++
      if (apt.status === 'completed') {
        doctorCounts[doctorId].completed++
      }
    })

    const stats: ReportStats = {
      total: Object.keys(doctorCounts).length,
    }
    setReportStats(stats)

    setReportData({
      charts: [
        {
          type: 'bar',
          title: 'Consultas por Médico',
          data: Object.entries(doctorCounts)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10)
            .map(([id, data]) => ({
              medico: data.name,
              consultas: data.count,
              concluidas: data.completed,
            })),
        },
      ],
    })

    setRawData(Object.entries(doctorCounts).map(([id, data]) => ({ id, ...data })))
  }

  const loadTelemedicineReport = async (startISO: string, endISO: string) => {
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

    let query = supabase
      .from('telemedicine_sessions')
      .select(`
        *,
        appointments:appointment_id (
          doctor_id,
          patients:patient_id (name),
          doctors:doctor_id (name)
        )
      `)
      .gte('started_at', startISO + 'T00:00:00')
      .lte('started_at', endISO + 'T23:59:59')

    // Se for médico, filtrar apenas suas sessões
    if (doctorId) {
      // Filtrar pelo doctor_id do appointment
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', doctorId)
        .gte('appointment_date', startISO.split('T')[0])
        .lte('appointment_date', endISO.split('T')[0])

      if (appointments && appointments.length > 0) {
        const appointmentIds = appointments.map(apt => apt.id)
        query = query.in('appointment_id', appointmentIds)
      } else {
        // Se não tiver agendamentos, retornar vazio
        setRawData([])
        setReportStats({ total: 0 })
        setReportData(null)
        return
      }
    }

    const { data, error } = await query.order('started_at', { ascending: false })

    if (error) throw error

    setRawData(data || [])

    const stats: ReportStats = {
      total: data?.length || 0,
      completed: data?.filter((s: any) => s.status === 'completed').length || 0,
      cancelled: data?.filter((s: any) => s.status === 'cancelled').length || 0,
    }
    setReportStats(stats)

    // Agrupar por mês
    const monthly: { [key: string]: number } = {}
    data?.forEach((session: any) => {
      const date = new Date(session.started_at)
      const monthKey = format(date, 'MMM yyyy', { locale: ptBR })
      monthly[monthKey] = (monthly[monthKey] || 0) + 1
    })

    setReportData({
      charts: [
        {
          type: 'bar',
          title: 'Sessões de Telemedicina por Mês',
          data: Object.entries(monthly)
            .sort((a, b) => {
              const dateA = new Date(Number(a[0].split(' ')[1]), getMonthIndex(a[0].split(' ')[0]))
              const dateB = new Date(Number(b[0].split(' ')[1]), getMonthIndex(b[0].split(' ')[0]))
              return dateA.getTime() - dateB.getTime()
            })
            .map(([month, count]) => ({
              month,
              sessoes: count,
            })),
        },
      ],
    })
  }

  const loadPrescriptionsReport = async (startISO: string, endISO: string) => {
    // Verificar se é médico para filtrar apenas suas prescrições
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
      .from('prescriptions')
      .select(`
        *,
        patients:patient_id (name),
        doctors:doctor_id (name, crm)
      `)
      .gte('prescription_date', startISO)
      .lte('prescription_date', endISO)

    // Se for médico, filtrar apenas suas prescrições
    if (doctorId) {
      query = query.eq('doctor_id', doctorId)
    }

    const { data, error } = await query.order('prescription_date', { ascending: false })

    if (error) throw error

    setRawData(data || [])

    const stats: ReportStats = {
      total: data?.length || 0,
    }
    setReportStats(stats)

    // Agrupar por mês
    const monthly: { [key: string]: number } = {}
    data?.forEach((prescription: any) => {
      const date = new Date(prescription.prescription_date)
      const monthKey = format(date, 'MMM yyyy', { locale: ptBR })
      monthly[monthKey] = (monthly[monthKey] || 0) + 1
    })

    setReportData({
      charts: [
        {
          type: 'bar',
          title: 'Prescrições por Mês',
          data: Object.entries(monthly)
            .sort((a, b) => {
              const dateA = new Date(Number(a[0].split(' ')[1]), getMonthIndex(a[0].split(' ')[0]))
              const dateB = new Date(Number(b[0].split(' ')[1]), getMonthIndex(b[0].split(' ')[0]))
              return dateA.getTime() - dateB.getTime()
            })
            .map(([month, count]) => ({
              month,
              prescricoes: count,
            })),
        },
      ],
    })
  }

  const loadExamsReport = async (startISO: string, endISO: string) => {
    // Verificar se é médico para filtrar apenas seus exames
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
      .from('exams')
      .select(`
        *,
        patients:patient_id (name),
        doctors:doctor_id (name, crm)
      `)
      .gte('requested_date', startISO)
      .lte('requested_date', endISO)

    // Se for médico, filtrar apenas seus exames
    if (doctorId) {
      query = query.eq('doctor_id', doctorId)
    }

    const { data, error } = await query.order('requested_date', { ascending: false })

    if (error) throw error

    setRawData(data || [])

    const stats: ReportStats = {
      total: data?.length || 0,
      completed: data?.filter((e: any) => e.status === 'completed').length || 0,
      pending: data?.filter((e: any) => e.status === 'requested' || e.status === 'pending').length || 0,
    }
    setReportStats(stats)

    // Agrupar por status
    const statusCounts: { [key: string]: number } = {}
    data?.forEach((exam: any) => {
      statusCounts[exam.status] = (statusCounts[exam.status] || 0) + 1
    })

    setReportData({
      charts: [
        {
          type: 'pie',
          title: 'Exames por Status',
          data: Object.entries(statusCounts).map(([name, value]) => ({
            name: getExamStatusLabel(name),
            value,
          })),
        },
      ],
    })
  }

  const getMonthIndex = (monthName: string): number => {
    const months: { [key: string]: number } = {
      jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
      jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
    }
    return months[monthName.toLowerCase()] || 0
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

  const getExamStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      requested: 'Solicitado',
      pending: 'Pendente',
      completed: 'Concluído',
      cancelled: 'Cancelado',
    }
    return labels[status] || status
  }

  const exportToCSV = () => {
    if (!rawData || rawData.length === 0) {
      toast({
        title: 'Nenhum dado para exportar',
        description: 'Carregue um relatório primeiro.',
        variant: 'destructive',
      })
      return
    }

    let csvContent = ''
    let headers: string[] = []

    if (reportType === 'appointments') {
      headers = ['Data', 'Hora', 'Paciente', 'Médico', 'Status', 'Tipo', 'Sala']
      csvContent = headers.join(',') + '\n'
      rawData.forEach((apt: any) => {
        const row = [
          format(new Date(apt.appointment_date), 'dd/MM/yyyy'),
          apt.appointment_time || '',
          apt.patients?.name || '',
          apt.doctors?.name || '',
          getStatusLabel(apt.status),
          apt.consultation_type || '',
          apt.room_id || '',
        ]
        csvContent += row.map((cell) => `"${cell}"`).join(',') + '\n'
      })
    } else if (reportType === 'patients') {
      headers = ['Nome', 'CPF', 'Email', 'Telefone', 'Data de Nascimento', 'Data de Cadastro']
      csvContent = headers.join(',') + '\n'
      rawData.forEach((patient: any) => {
        const row = [
          patient.name || '',
          patient.cpf || '',
          patient.email || '',
          patient.phone || '',
          patient.birth_date ? format(new Date(patient.birth_date), 'dd/MM/yyyy') : '',
          format(new Date(patient.created_at), 'dd/MM/yyyy HH:mm'),
        ]
        csvContent += row.map((cell) => `"${cell}"`).join(',') + '\n'
      })
    } else if (reportType === 'financial') {
      headers = ['Data', 'Tipo', 'Valor', 'Método de Pagamento', 'Descrição', 'Paciente', 'Status']
      csvContent = headers.join(',') + '\n'
      rawData.forEach((transaction: any) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const isPaid = transaction.paid_date || (transaction.due_date && new Date(transaction.due_date) <= today)
        const row = [
          format(new Date(transaction.transaction_date), 'dd/MM/yyyy'),
          transaction.transaction_type === 'income' ? 'Receita' : 'Despesa',
          `R$ ${Number(transaction.amount).toFixed(2).replace('.', ',')}`,
          transaction.payment_method || '',
          transaction.description || '',
          transaction.patients?.name || '',
          isPaid ? 'Pago' : 'Pendente',
        ]
        csvContent += row.map((cell) => `"${cell}"`).join(',') + '\n'
      })
    }

    // Download
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `relatorio-${reportType}-${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: 'Relatório exportado!',
      description: 'O arquivo CSV foi baixado com sucesso.',
    })
  }

  const exportToPDF = async () => {
    if (!rawData || rawData.length === 0 || !reportStats) {
      toast({
        title: 'Nenhum dado para exportar',
        description: 'Carregue um relatório primeiro.',
        variant: 'destructive',
      })
      return
    }

    try {
      // Buscar configurações da clínica
      const { data: clinicSettings } = await supabase
        .from('clinic_settings')
        .select('*')
        .single()

      // Preparar título do relatório
      const reportTitles: { [key: string]: string } = {
        appointments: 'Relatório de Agendamentos',
        patients: 'Relatório de Pacientes',
        financial: 'Relatório Financeiro',
        doctors: 'Relatório de Médicos',
        telemedicine: 'Relatório de Telemedicina',
        prescriptions: 'Relatório de Prescrições',
        exams: 'Relatório de Exames',
      }

      // Preparar período
      const { start, end } = getDateRange()
      let periodText = dateRange === 'custom' ? 'Personalizado' : 
        dateRange === 'week' ? 'Esta Semana' :
        dateRange === 'month' ? 'Este Mês' :
        dateRange === 'quarter' ? 'Este Trimestre' : 'Este Ano'

      // Gerar PDF
      const pdf = await generateReportPDF({
        reportType,
        reportTitle: reportTitles[reportType] || 'Relatório',
        period: periodText,
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        stats: reportStats,
        data: rawData,
        clinicName: clinicSettings?.clinic_name,
        clinicAddress: clinicSettings?.clinic_address,
        clinicPhone: clinicSettings?.clinic_phone,
        clinicEmail: clinicSettings?.clinic_email,
        clinicLogoUrl: clinicSettings?.clinic_logo_url,
      })

      // Download
      const filename = `relatorio-${reportType}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
      pdf.save(filename)

      toast({
        title: 'Relatório exportado!',
        description: 'O arquivo PDF foi baixado com sucesso.',
      })
    } catch (error: any) {
      console.error('Erro ao exportar PDF:', error)
      toast({
        title: 'Erro ao exportar PDF',
        description: error.message || 'Não foi possível gerar o PDF.',
        variant: 'destructive',
      })
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Relatórios
          </h1>
          <p className="text-muted-foreground mt-2">
            Visualize relatórios detalhados e estatísticas do sistema
          </p>
        </div>
        {reportData && (
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
            <Button onClick={exportToPDF} variant="default">
              <FileText className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros do Relatório</CardTitle>
          <CardDescription>Configure os parâmetros para gerar o relatório desejado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Relatório</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appointments">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Agendamentos
                    </div>
                  </SelectItem>
                  <SelectItem value="patients">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Pacientes
                    </div>
                  </SelectItem>
                  <SelectItem value="financial">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Financeiro
                    </div>
                  </SelectItem>
                  <SelectItem value="doctors">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Médicos
                    </div>
                  </SelectItem>
                  <SelectItem value="telemedicine">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Telemedicina
                    </div>
                  </SelectItem>
                  <SelectItem value="prescriptions">
                    <div className="flex items-center gap-2">
                      <Pill className="h-4 w-4" />
                      Prescrições
                    </div>
                  </SelectItem>
                  <SelectItem value="exams">
                    <div className="flex items-center gap-2">
                      <FileSearch className="h-4 w-4" />
                      Exames
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Esta Semana</SelectItem>
                  <SelectItem value="month">Este Mês</SelectItem>
                  <SelectItem value="quarter">Este Trimestre</SelectItem>
                  <SelectItem value="year">Este Ano</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === 'appointments' && (
              <div className="space-y-2">
                <Label>Médico</Label>
                <Select value={doctorFilter} onValueChange={setDoctorFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Médicos</SelectItem>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.name} - {doctor.crm}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {reportType === 'appointments' && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="scheduled">Agendado</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                    <SelectItem value="no_show">Não Compareceu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {dateRange === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>Data Inicial</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Final</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              </div>
              <p className="text-muted-foreground font-medium">Carregando relatório...</p>
            </div>
          </CardContent>
        </Card>
      ) : reportData && reportStats ? (
        <>
          {/* Cards de Estatísticas */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportStats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {reportType === 'appointments' && 'agendamentos'}
                  {reportType === 'patients' && 'pacientes'}
                  {reportType === 'financial' && 'transações'}
                  {reportType === 'doctors' && 'médicos'}
                  {reportType === 'telemedicine' && 'sessões'}
                  {reportType === 'prescriptions' && 'prescrições'}
                  {reportType === 'exams' && 'exames'}
                </p>
              </CardContent>
            </Card>

            {reportType === 'appointments' && reportStats.completed !== undefined && (
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{reportStats.completed}</div>
                  <p className="text-xs text-muted-foreground">
                    {reportStats.total > 0 
                      ? `${((reportStats.completed / reportStats.total) * 100).toFixed(1)}% do total`
                      : 'N/A'}
                  </p>
                </CardContent>
              </Card>
            )}

            {reportType === 'appointments' && reportStats.cancelled !== undefined && (
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cancelados</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{reportStats.cancelled}</div>
                  <p className="text-xs text-muted-foreground">
                    {reportStats.total > 0 
                      ? `${((reportStats.cancelled / reportStats.total) * 100).toFixed(1)}% do total`
                      : 'N/A'}
                  </p>
                </CardContent>
              </Card>
            )}

            {reportType === 'financial' && reportStats.revenue !== undefined && (
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receitas</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(reportStats.revenue)}
                  </div>
                  <p className="text-xs text-muted-foreground">Receitas recebidas</p>
                </CardContent>
              </Card>
            )}

            {reportType === 'financial' && reportStats.expenses !== undefined && (
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Despesas</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(reportStats.expenses)}
                  </div>
                  <p className="text-xs text-muted-foreground">Despesas pagas</p>
                </CardContent>
              </Card>
            )}

            {reportType === 'financial' && reportStats.balance !== undefined && (
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Saldo</CardTitle>
                  <DollarSign className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${reportStats.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(reportStats.balance)}
                  </div>
                  <p className="text-xs text-muted-foreground">Saldo líquido</p>
                </CardContent>
              </Card>
            )}

            {reportType === 'telemedicine' && reportStats.completed !== undefined && (
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
                  <Activity className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportStats.completed}</div>
                  <p className="text-xs text-muted-foreground">Sessões finalizadas</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Gráficos */}
          {reportData.charts.map((chart: any, index: number) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{chart.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  {chart.type === 'pie' ? (
                    <PieChart>
                      <defs>
                        {COLORS.map((color, idx) => (
                          <linearGradient key={`pieGradient${idx}`} id={`pieGradient${idx}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie
                        data={chart.data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={130}
                        innerRadius={40}
                        fill="hsl(var(--primary))"
                        dataKey="value"
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                      >
                        {chart.data.map((entry: any, idx: number) => (
                          <Cell 
                            key={`cell-${idx}`} 
                            fill={`url(#pieGradient${idx % COLORS.length})`}
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
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    </PieChart>
                  ) : chart.type === 'bar' ? (
                    <BarChart data={chart.data}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#2563EB" stopOpacity={0.7} />
                        </linearGradient>
                        {chart.data.some((d: any) => d.concluidas !== undefined) && (
                          <linearGradient id="barGradient2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                          </linearGradient>
                        )}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey={Object.keys(chart.data[0] || {})[0] || 'month'}
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
                        dataKey={Object.keys(chart.data[0] || {}).find((k) => k !== Object.keys(chart.data[0] || {})[0]) || 'value'}
                        fill="url(#barGradient)"
                        radius={[8, 8, 0, 0]}
                        stroke="#2563EB"
                        strokeWidth={1}
                      />
                      {chart.data.some((d: any) => d.concluidas !== undefined) && (
                        <Bar 
                          dataKey="concluidas"
                          fill="url(#barGradient2)"
                          radius={[8, 8, 0, 0]}
                          stroke="#059669"
                          strokeWidth={1}
                        />
                      )}
                    </BarChart>
                  ) : (
                    <LineChart data={chart.data}>
                      <defs>
                        <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
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
                        formatter={(value: any) => formatCurrency(value)}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Line 
                        type="monotone" 
                        dataKey="receitas" 
                        stroke="#10B981" 
                        strokeWidth={3}
                        dot={{ fill: '#10B981', strokeWidth: 2, r: 5 }}
                        activeDot={{ r: 7, stroke: '#059669', strokeWidth: 2 }}
                        fill="url(#incomeGradient)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="despesas" 
                        stroke="#EF4444" 
                        strokeWidth={3}
                        dot={{ fill: '#EF4444', strokeWidth: 2, r: 5 }}
                        activeDot={{ r: 7, stroke: '#DC2626', strokeWidth: 2 }}
                        fill="url(#expenseGradient)"
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ))}

          {/* Tabela Detalhada */}
          {rawData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Relatório</CardTitle>
                <CardDescription>
                  {rawData.length} {reportType === 'appointments' && 'agendamentos'}
                  {reportType === 'patients' && 'pacientes'}
                  {reportType === 'financial' && 'transações'}
                  {reportType === 'doctors' && 'médicos'}
                  {reportType === 'telemedicine' && 'sessões'}
                  {reportType === 'prescriptions' && 'prescrições'}
                  {reportType === 'exams' && 'exames'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        {reportType === 'appointments' && (
                          <>
                            <th className="text-left p-2 font-semibold">Data</th>
                            <th className="text-left p-2 font-semibold">Hora</th>
                            <th className="text-left p-2 font-semibold">Paciente</th>
                            <th className="text-left p-2 font-semibold">Médico</th>
                            <th className="text-left p-2 font-semibold">Status</th>
                            <th className="text-left p-2 font-semibold">Tipo</th>
                          </>
                        )}
                        {reportType === 'patients' && (
                          <>
                            <th className="text-left p-2 font-semibold">Nome</th>
                            <th className="text-left p-2 font-semibold">CPF</th>
                            <th className="text-left p-2 font-semibold">Email</th>
                            <th className="text-left p-2 font-semibold">Telefone</th>
                            <th className="text-left p-2 font-semibold">Data de Cadastro</th>
                          </>
                        )}
                        {reportType === 'financial' && (
                          <>
                            <th className="text-left p-2 font-semibold">Data</th>
                            <th className="text-left p-2 font-semibold">Tipo</th>
                            <th className="text-left p-2 font-semibold">Valor</th>
                            <th className="text-left p-2 font-semibold">Método</th>
                            <th className="text-left p-2 font-semibold">Paciente</th>
                            <th className="text-left p-2 font-semibold">Status</th>
                          </>
                        )}
                        {reportType === 'doctors' && (
                          <>
                            <th className="text-left p-2 font-semibold">Médico</th>
                            <th className="text-left p-2 font-semibold">Total de Consultas</th>
                            <th className="text-left p-2 font-semibold">Concluídas</th>
                            <th className="text-left p-2 font-semibold">Taxa de Conclusão</th>
                          </>
                        )}
                        {reportType === 'telemedicine' && (
                          <>
                            <th className="text-left p-2 font-semibold">Data/Hora</th>
                            <th className="text-left p-2 font-semibold">Paciente</th>
                            <th className="text-left p-2 font-semibold">Médico</th>
                            <th className="text-left p-2 font-semibold">Status</th>
                            <th className="text-left p-2 font-semibold">Duração</th>
                          </>
                        )}
                        {reportType === 'prescriptions' && (
                          <>
                            <th className="text-left p-2 font-semibold">Data</th>
                            <th className="text-left p-2 font-semibold">Paciente</th>
                            <th className="text-left p-2 font-semibold">Médico</th>
                          </>
                        )}
                        {reportType === 'exams' && (
                          <>
                            <th className="text-left p-2 font-semibold">Data Solicitação</th>
                            <th className="text-left p-2 font-semibold">Tipo</th>
                            <th className="text-left p-2 font-semibold">Paciente</th>
                            <th className="text-left p-2 font-semibold">Status</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {rawData.slice(0, 50).map((item: any, index: number) => (
                        <tr key={index} className="border-b hover:bg-accent/50">
                          {reportType === 'appointments' && (
                            <>
                              <td className="p-2">{format(new Date(item.appointment_date), 'dd/MM/yyyy')}</td>
                              <td className="p-2">{item.appointment_time}</td>
                              <td className="p-2">{item.patients?.name || 'N/A'}</td>
                              <td className="p-2">{item.doctors?.name || 'N/A'}</td>
                              <td className="p-2">
                                <Badge variant={
                                  item.status === 'completed' ? 'default' :
                                  item.status === 'cancelled' ? 'destructive' :
                                  item.status === 'confirmed' ? 'secondary' : 'outline'
                                }>
                                  {getStatusLabel(item.status)}
                                </Badge>
                              </td>
                              <td className="p-2">{item.consultation_type || 'N/A'}</td>
                            </>
                          )}
                          {reportType === 'patients' && (
                            <>
                              <td className="p-2">{item.name}</td>
                              <td className="p-2">{item.cpf}</td>
                              <td className="p-2">{item.email}</td>
                              <td className="p-2">{item.phone}</td>
                              <td className="p-2">{format(new Date(item.created_at), 'dd/MM/yyyy')}</td>
                            </>
                          )}
                          {reportType === 'financial' && (
                            <>
                              <td className="p-2">{format(new Date(item.transaction_date), 'dd/MM/yyyy')}</td>
                              <td className="p-2">
                                <Badge variant={item.transaction_type === 'income' ? 'default' : 'destructive'}>
                                  {item.transaction_type === 'income' ? 'Receita' : 'Despesa'}
                                </Badge>
                              </td>
                              <td className="p-2 font-semibold">{formatCurrency(Number(item.amount))}</td>
                              <td className="p-2">{item.payment_method || 'N/A'}</td>
                              <td className="p-2">{item.patients?.name || 'N/A'}</td>
                              <td className="p-2">
                                {(() => {
                                  const today = new Date()
                                  today.setHours(0, 0, 0, 0)
                                  const isPaid = item.paid_date || (item.due_date && new Date(item.due_date) <= today)
                                  return (
                                    <Badge variant={isPaid ? 'default' : 'secondary'}>
                                      {isPaid ? 'Pago' : 'Pendente'}
                                    </Badge>
                                  )
                                })()}
                              </td>
                            </>
                          )}
                          {reportType === 'doctors' && (
                            <>
                              <td className="p-2">{item.name}</td>
                              <td className="p-2">{item.count}</td>
                              <td className="p-2">{item.completed}</td>
                              <td className="p-2">
                                {item.count > 0 
                                  ? `${((item.completed / item.count) * 100).toFixed(1)}%`
                                  : '0%'}
                              </td>
                            </>
                          )}
                          {reportType === 'telemedicine' && (
                            <>
                              <td className="p-2">
                                {item.started_at 
                                  ? format(new Date(item.started_at), 'dd/MM/yyyy HH:mm')
                                  : 'N/A'}
                              </td>
                              <td className="p-2">{item.appointments?.patients?.name || 'N/A'}</td>
                              <td className="p-2">{item.appointments?.doctors?.name || 'N/A'}</td>
                              <td className="p-2">
                                <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>
                                  {item.status === 'completed' ? 'Concluída' : item.status}
                                </Badge>
                              </td>
                              <td className="p-2">
                                {item.duration ? `${Math.round(item.duration / 60)} min` : 'N/A'}
                              </td>
                            </>
                          )}
                          {reportType === 'prescriptions' && (
                            <>
                              <td className="p-2">
                                {item.prescription_date 
                                  ? format(new Date(item.prescription_date), 'dd/MM/yyyy')
                                  : 'N/A'}
                              </td>
                              <td className="p-2">{item.patients?.name || 'N/A'}</td>
                              <td className="p-2">{item.doctors?.name || 'N/A'}</td>
                            </>
                          )}
                          {reportType === 'exams' && (
                            <>
                              <td className="p-2">
                                {item.requested_date 
                                  ? format(new Date(item.requested_date), 'dd/MM/yyyy')
                                  : 'N/A'}
                              </td>
                              <td className="p-2">{item.exam_type || 'N/A'}</td>
                              <td className="p-2">{item.patients?.name || 'N/A'}</td>
                              <td className="p-2">
                                <Badge variant={
                                  item.status === 'completed' ? 'default' :
                                  item.status === 'cancelled' ? 'destructive' : 'secondary'
                                }>
                                  {getExamStatusLabel(item.status)}
                                </Badge>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rawData.length > 50 && (
                    <div className="mt-4 text-center text-sm text-muted-foreground">
                      Mostrando 50 de {rawData.length} registros. Exporte para CSV para ver todos.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              Selecione os filtros e aguarde o carregamento do relatório.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
