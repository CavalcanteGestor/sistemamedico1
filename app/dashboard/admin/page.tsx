'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  DollarSign, 
  Users, 
  UserCheck,
  Calendar,
  TrendingUp,
  Settings,
  FileText,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

/**
 * Dashboard específico para Administrador/Dono da Clínica
 * Foca em visão gerencial, finanças e relatórios
 */
export default function AdminDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalRevenue: 0,
    revenueThisMonth: 0,
    totalPatients: 0,
    totalDoctors: 0,
    totalAppointments: 0,
    pendingAppointments: 0,
    activeUsers: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Verificar se é admin
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.role !== 'admin' && profile?.role !== 'desenvolvedor') {
        router.push('/dashboard')
        return
      }

      loadAdminDashboard()
    }

    checkRole()
  }, [router])

  const loadAdminDashboard = async () => {
    try {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]
      const firstDayThisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

      // Buscar estatísticas gerais
      const [patientsRes, doctorsRes, appointmentsRes, transactionsRes, usersRes] = await Promise.all([
        supabase.from('patients').select('id', { count: 'exact', head: true }),
        supabase.from('doctors').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase
          .from('appointments')
          .select('id, status, appointment_date')
          .gte('appointment_date', today)
          .in('status', ['scheduled', 'confirmed']),
        supabase
          .from('financial_transactions')
          .select('amount, transaction_type, paid_date, due_date')
          .eq('transaction_type', 'income'),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .in('role', ['medico', 'admin', 'recepcionista']),
      ])

      const totalRevenue = (transactionsRes.data || [])
        .filter((t: any) => {
          if (t.transaction_type !== 'income') return false
          if (t.paid_date) return true
          if (t.due_date && new Date(t.due_date) <= new Date()) return true
          return false
        })
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

      const revenueThisMonth = (transactionsRes.data || [])
        .filter((t: any) => {
          if (t.transaction_type !== 'income') return false
          const paidDate = t.paid_date ? new Date(t.paid_date) : null
          const dueDate = t.due_date ? new Date(t.due_date) : null
          
          if (paidDate && paidDate >= new Date(firstDayThisMonth)) return true
          if (dueDate && dueDate >= new Date(firstDayThisMonth) && dueDate <= new Date()) return true
          return false
        })
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

      setStats({
        totalRevenue,
        revenueThisMonth,
        totalPatients: patientsRes.count || 0,
        totalDoctors: doctorsRes.count || 0,
        totalAppointments: appointmentsRes.count || 0,
        pendingAppointments: appointmentsRes.data?.length || 0,
        activeUsers: usersRes.count || 0,
      })
    } catch (error) {
      console.error('Erro ao carregar dashboard admin:', error)
    } finally {
      setLoading(false)
    }
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Dashboard Administrativo
          </h1>
          <p className="text-muted-foreground mt-2">Visão geral gerencial da clínica</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/relatorios">
              <BarChart3 className="h-4 w-4 mr-2" />
              Relatórios
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/configuracoes">
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Link>
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas Financeiras */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <Link href="/dashboard/financeiro">
              <Button variant="ghost" size="sm" className="mt-2">
                Ver financeiro <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita do Mês</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              R$ {stats.revenueThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Este mês</p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalPatients}</div>
            <Link href="/dashboard/pacientes">
              <Button variant="ghost" size="sm" className="mt-2">
                Ver pacientes <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Médicos Ativos</CardTitle>
            <UserCheck className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalDoctors}</div>
            <Link href="/dashboard/medicos">
              <Button variant="ghost" size="sm" className="mt-2">
                Ver médicos <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Cards Secundários */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos Pendentes</CardTitle>
            <Calendar className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendingAppointments}</div>
            <Link href="/dashboard/agendamentos">
              <Button variant="ghost" size="sm" className="mt-2">
                Ver agendamentos <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeUsers}</div>
            <Link href="/dashboard/usuarios">
              <Button variant="ghost" size="sm" className="mt-2">
                Ver usuários <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Relatórios</CardTitle>
            <FileText className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/relatorios">
              <Button variant="default" className="w-full mt-2">
                Acessar Relatórios <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>Acesso rápido às principais funcionalidades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/dashboard/financeiro/nova">
              <Button variant="outline" className="w-full">
                <DollarSign className="h-4 w-4 mr-2" />
                Nova Transação
              </Button>
            </Link>
            <Link href="/dashboard/agendamentos/novo">
              <Button variant="outline" className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Novo Agendamento
              </Button>
            </Link>
            <Link href="/dashboard/pacientes/novo">
              <Button variant="outline" className="w-full">
                <Users className="h-4 w-4 mr-2" />
                Novo Paciente
              </Button>
            </Link>
            <Link href="/dashboard/configuracoes">
              <Button variant="outline" className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

