'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  Users, 
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  UserPlus,
  PhoneCall,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

/**
 * Dashboard específico para Recepcionista/Atendente
 * Foca em agendamentos, atendimento e cadastros
 */
export default function RecepcionistaDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState({
    todayAppointments: 0,
    pendingCalls: 0,
    newPatients: 0,
    confirmedAppointments: 0,
  })
  const [todayAppointments, setTodayAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Verificar se é recepcionista
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

      if (profile?.role !== 'recepcionista' && profile?.role !== 'admin' && profile?.role !== 'desenvolvedor') {
        router.push('/dashboard')
        return
      }

      loadRecepcionistaDashboard()
    }

    checkRole()
  }, [router])

  const loadRecepcionistaDashboard = async () => {
    try {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]
      const firstDayThisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

      // Buscar dados relevantes para recepcionista
      const [appointmentsRes, patientsRes, leadsRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('*, patients:patient_id (name), doctors:doctor_id (name)')
          .eq('appointment_date', today)
          .in('status', ['scheduled', 'confirmed'])
          .order('appointment_time', { ascending: true }),
        supabase
          .from('patients')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', firstDayThisMonth),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'ativo'),
      ])

      const confirmedToday = (appointmentsRes.data || []).filter(
        (apt: any) => apt.status === 'confirmed'
      ).length

      setTodayAppointments(appointmentsRes.data || [])
      setStats({
        todayAppointments: appointmentsRes.data?.length || 0,
        pendingCalls: leadsRes.count || 0,
        newPatients: patientsRes.count || 0,
        confirmedAppointments: confirmedToday,
      })
    } catch (error) {
      console.error('Erro ao carregar dashboard recepcionista:', error)
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
            Dashboard Atendimento
          </h1>
          <p className="text-muted-foreground mt-2">Central de atendimento e agendamentos</p>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
            <Calendar className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.todayAppointments}</div>
            <Link href="/dashboard/agendamentos">
              <Button variant="ghost" size="sm" className="mt-2">
                Ver agendamentos <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmados</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.confirmedAppointments}</div>
            <p className="text-xs text-muted-foreground mt-1">Consultas confirmadas hoje</p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos Pacientes</CardTitle>
            <UserPlus className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.newPatients}</div>
            <p className="text-xs text-muted-foreground mt-1">Este mês</p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads para Contato</CardTitle>
            <PhoneCall className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendingCalls}</div>
            <Link href="/dashboard/leads">
              <Button variant="ghost" size="sm" className="mt-2">
                Ver leads <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Agendamentos de Hoje */}
      <Card>
        <CardHeader>
          <CardTitle>Agendamentos de Hoje</CardTitle>
          <CardDescription>Consultas agendadas para hoje</CardDescription>
        </CardHeader>
        <CardContent>
          {todayAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground font-medium">Nenhum agendamento hoje</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayAppointments.map((appointment: any) => (
                <Link 
                  key={appointment.id}
                  href={`/dashboard/agendamentos`}
                  className="block"
                >
                  <div className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent transition-colors">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{appointment.appointment_time}</p>
                      <p className="text-sm text-foreground">
                        {appointment.patients?.name || 'Paciente'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {appointment.doctors?.name || 'Médico'}
                      </p>
                    </div>
                    <Badge variant={appointment.status === 'confirmed' ? 'default' : 'secondary'}>
                      {appointment.status === 'confirmed' ? 'Confirmado' : 'Agendado'}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>Acesso rápido às principais funcionalidades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/dashboard/agendamentos/novo">
              <Button variant="default" className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Novo Agendamento
              </Button>
            </Link>
            <Link href="/dashboard/pacientes/novo">
              <Button variant="outline" className="w-full">
                <UserPlus className="h-4 w-4 mr-2" />
                Novo Paciente
              </Button>
            </Link>
            <Link href="/dashboard/leads">
              <Button variant="outline" className="w-full">
                <Phone className="h-4 w-4 mr-2" />
                Ver Leads
              </Button>
            </Link>
            <Link href="/dashboard/agendamentos">
              <Button variant="outline" className="w-full">
                <Clock className="h-4 w-4 mr-2" />
                Ver Calendário
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

