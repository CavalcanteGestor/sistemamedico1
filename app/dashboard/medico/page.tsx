'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  Users, 
  Stethoscope,
  Clock,
  ArrowRight,
  FileText,
  Activity,
  Video,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

/**
 * Dashboard específico para Médicos
 * Foca em consultas, pacientes e prontuários
 */
export default function DoctorDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState({
    todayAppointments: 0,
    upcomingAppointments: 0,
    totalPatients: 0,
    completedAppointments: 0,
    pendingNotes: 0,
    telemedicineSessions: 0,
  })
  const [todayAppointments, setTodayAppointments] = useState<any[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Verificar se é médico
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

      if (profile?.role !== 'medico' && profile?.role !== 'admin' && profile?.role !== 'desenvolvedor') {
        router.push('/dashboard')
        return
      }

      loadDoctorDashboard()
    }

    checkRole()
  }, [router])

  const loadDoctorDashboard = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Buscar médico pelo user_id
      const { data: doctor } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!doctor) {
        setLoading(false)
        return
      }

      const today = new Date().toISOString().split('T')[0]
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Buscar agendamentos do médico
      const [todayRes, upcomingRes, patientsRes, completedRes, notesRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('*, patients:patient_id (name), doctors:doctor_id (name)')
          .eq('doctor_id', doctor.id)
          .eq('appointment_date', today)
          .in('status', ['scheduled', 'confirmed'])
          .order('appointment_time', { ascending: true }),
        supabase
          .from('appointments')
          .select('*, patients:patient_id (name), doctors:doctor_id (name)')
          .eq('doctor_id', doctor.id)
          .gte('appointment_date', today)
          .lte('appointment_date', nextWeek)
          .in('status', ['scheduled', 'confirmed'])
          .order('appointment_date', { ascending: true })
          .order('appointment_time', { ascending: true })
          .limit(10),
        supabase
          .from('appointments')
          .select('patient_id', { count: 'exact', head: true })
          .eq('doctor_id', doctor.id),
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('doctor_id', doctor.id)
          .eq('status', 'completed')
          .gte('appointment_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
        supabase
          .from('medical_records')
          .select('id', { count: 'exact', head: true })
          .eq('doctor_id', doctor.id)
          .is('notes', null),
      ])

      // Buscar sessões de telemedicina do médico (separadamente)
      let telemedicineCount = 0
      try {
        // Primeiro buscar IDs dos agendamentos do médico
        const { data: doctorAppointments } = await supabase
          .from('appointments')
          .select('id')
          .eq('doctor_id', doctor.id)

        if (doctorAppointments && doctorAppointments.length > 0) {
          const appointmentIds = doctorAppointments.map(apt => apt.id)
          const { data: telemedicineData } = await supabase
            .from('telemedicine_sessions')
            .select('id')
            .eq('status', 'active')
            .in('appointment_id', appointmentIds)
          
          telemedicineCount = telemedicineData?.length || 0
        }
      } catch (error) {
        // Erro silencioso
      }

      setTodayAppointments(todayRes.data || [])
      setUpcomingAppointments(upcomingRes.data || [])
      
      setStats({
        todayAppointments: todayRes.data?.length || 0,
        upcomingAppointments: upcomingRes.data?.length || 0,
        totalPatients: patientsRes.count || 0,
        completedAppointments: completedRes.count || 0,
        pendingNotes: notesRes.count || 0,
        telemedicineSessions: telemedicineCount,
      })
    } catch (error) {
      console.error('Erro ao carregar dashboard do médico:', error)
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
            Dashboard Médico
          </h1>
          <p className="text-muted-foreground mt-2">Visão geral das suas consultas e pacientes</p>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consultas Hoje</CardTitle>
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
            <CardTitle className="text-sm font-medium">Próximas Consultas</CardTitle>
            <Clock className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.upcomingAppointments}</div>
            <p className="text-xs text-muted-foreground mt-1">Próximos 7 dias</p>
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
            <CardTitle className="text-sm font-medium">Consultas Concluídas</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.completedAppointments}</div>
            <p className="text-xs text-muted-foreground mt-1">Este mês</p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Telemedicina</CardTitle>
            <Video className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.telemedicineSessions}</div>
            <Link href="/dashboard/telemedicina">
              <Button variant="ghost" size="sm" className="mt-2">
                Ver sessões <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anotações Pendentes</CardTitle>
            <FileText className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendingNotes}</div>
            <Link href="/dashboard/prontuario">
              <Button variant="ghost" size="sm" className="mt-2">
                Ver prontuários <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Consultas de Hoje */}
      <Card>
        <CardHeader>
          <CardTitle>Consultas de Hoje</CardTitle>
          <CardDescription>Suas consultas agendadas para hoje</CardDescription>
        </CardHeader>
        <CardContent>
          {todayAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground font-medium">Nenhuma consulta hoje</p>
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
                      <p className="text-sm text-muted-foreground">
                        {appointment.patients?.name || 'Paciente'}
                      </p>
                    </div>
                    <Badge variant="secondary">{appointment.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Próximas Consultas */}
      <Card>
        <CardHeader>
          <CardTitle>Próximas Consultas</CardTitle>
          <CardDescription>Consultas dos próximos 7 dias</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground font-medium">Nenhuma consulta agendada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((appointment: any) => (
                <Link 
                  key={appointment.id}
                  href={`/dashboard/agendamentos`}
                  className="block"
                >
                  <div className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent transition-colors">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">
                        {new Date(appointment.appointment_date).toLocaleDateString('pt-BR')} às {appointment.appointment_time}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.patients?.name || 'Paciente'}
                      </p>
                    </div>
                    <Badge variant="secondary">{appointment.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

