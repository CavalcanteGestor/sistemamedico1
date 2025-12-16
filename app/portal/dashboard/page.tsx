'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Pill, FileSearch, Bell, Video, Clock, User, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function PatientDashboardPage() {
  const [stats, setStats] = useState({
    upcomingAppointments: 0,
    prescriptions: 0,
    exams: 0,
    unreadNotifications: 0,
  })
  const [upcomingAppointmentsList, setUpcomingAppointmentsList] = useState<any[]>([])
  const [telemedicineSessions, setTelemedicineSessions] = useState<Record<string, any>>({})
  const [pendingExams, setPendingExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Usar API route para evitar erro 406
      const patientRes = await fetch('/api/portal/patient-id', {
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      })
      
      // Verificar se a resposta é JSON
      const contentType = patientRes.headers.get('content-type')
      if (!patientRes.ok || !contentType || !contentType.includes('application/json')) {
        const errorText = await patientRes.text().catch(() => '')
        console.error('Erro ao buscar patient ID:', patientRes.status, errorText.substring(0, 100))
        
        // Se for 404, redirecionar para página de configuração
        if (patientRes.status === 404) {
          console.warn('Paciente não encontrado - redirecionando para configuração')
          window.location.href = '/portal/configurar-conta'
          return
        }
        
        return
      }
      
      const result = await patientRes.json()
      
      // Se retornou erro 404, redirecionar para página de configuração
      if (result.error && patientRes.status === 404) {
        console.warn('Paciente não encontrado:', result.message)
        window.location.href = '/portal/configurar-conta'
        return
      }
      
      // Se retornou outro erro
      if (result.error) {
        console.error('Erro na resposta da API:', result.error, result.message)
        return
      }
      
      const { patientId } = result
      if (!patientId) {
        console.warn('Patient ID não encontrado na resposta')
        window.location.href = '/portal/configurar-conta'
        return
      }
      
      const patient = { id: patientId }

      // Buscar próximas consultas (próximas 3)
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select(`
          *,
          doctors:doctor_id (
            id,
            name,
            crm
          )
        `)
        .eq('patient_id', patient.id)
        .in('status', ['scheduled', 'confirmed'])
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .limit(3)

      setUpcomingAppointmentsList(appointmentsData || [])

      // Buscar sessões de telemedicina
      if (appointmentsData && appointmentsData.length > 0) {
        const appointmentIds = appointmentsData.map((apt: any) => apt.id)
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

      // Buscar exames pendentes
      const { data: examsData } = await supabase
        .from('exams')
        .select(`
          *,
          doctors:doctor_id (
            name
          )
        `)
        .eq('patient_id', patient.id)
        .in('status', ['requested', 'in_progress'])
        .order('requested_date', { ascending: false })
        .limit(3)

      setPendingExams(examsData || [])

      const [appointmentsRes, prescriptionsRes, examsRes, notificationsRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', patient.id)
          .in('status', ['scheduled', 'confirmed'])
          .gte('appointment_date', new Date().toISOString().split('T')[0]),
        supabase
          .from('prescriptions')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', patient.id),
        supabase
          .from('exams')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', patient.id),
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false),
      ])

      setStats({
        upcomingAppointments: appointmentsRes.count || 0,
        prescriptions: prescriptionsRes.count || 0,
        exams: examsRes.count || 0,
        unreadNotifications: notificationsRes.count || 0,
      })
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  const canJoinTelemedicine = (appointment: any) => {
    const session = telemedicineSessions[appointment.id]
    if (!session) return false
    if (session.status === 'cancelled' || session.status === 'ended') return false
    
    if (appointment.consultation_type !== 'telemedicina' && appointment.consultation_type !== 'hibrida') {
      return false
    }

    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
    const now = new Date()
    const minutesBefore = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60)
    
    return minutesBefore <= 15 && minutesBefore >= -120
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Link href="/portal/consultas">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Próximas Consultas
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingAppointments}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portal/prescricoes">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Prescrições
              </CardTitle>
              <Pill className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.prescriptions}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portal/exames">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Exames
              </CardTitle>
              <FileSearch className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.exams}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portal/notificacoes">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Notificações
              </CardTitle>
              <div className="relative">
                <Bell className="h-4 w-4 text-muted-foreground" />
                {stats.unreadNotifications > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">
                    {stats.unreadNotifications > 9 ? '9+' : stats.unreadNotifications}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unreadNotifications}</div>
              <p className="text-xs text-muted-foreground">não lidas</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Próximas Consultas */}
      {upcomingAppointmentsList.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Próximas Consultas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingAppointmentsList.map((appointment: any) => {
                const canJoin = canJoinTelemedicine(appointment)
                return (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {new Date(appointment.appointment_date).toLocaleDateString('pt-BR')} às {appointment.appointment_time}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {appointment.doctors?.name} - CRM: {appointment.doctors?.crm}
                          </p>
                          {(appointment.consultation_type === 'telemedicina' || appointment.consultation_type === 'hibrida') && (
                            <Badge variant="default" className="mt-1">
                              {appointment.consultation_type === 'telemedicina' ? 'Telemedicina' : 'Híbrida'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {canJoin && (
                      <Link href={`/portal/consultas/telemedicina/${appointment.id}`}>
                        <Button size="sm">
                          <Video className="mr-2 h-4 w-4" />
                          Entrar
                        </Button>
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
            {upcomingAppointmentsList.length >= 3 && (
              <Link href="/portal/consultas">
                <Button variant="outline" className="w-full mt-4">
                  Ver Todas as Consultas
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Exames Pendentes */}
      {pendingExams.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Exames Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingExams.map((exam: any) => (
                <div
                  key={exam.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{exam.exam_type}</p>
                    <p className="text-sm text-muted-foreground">
                      Solicitado em {new Date(exam.requested_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {exam.status === 'requested' ? 'Solicitado' : 'Em andamento'}
                  </Badge>
                </div>
              ))}
            </div>
            <Link href="/portal/exames">
              <Button variant="outline" className="w-full mt-4">
                Ver Todos os Exames
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Bem-vindo ao Portal do Paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Use o menu lateral para navegar e acessar suas informações médicas,
            consultas agendadas, prescrições e exames.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}