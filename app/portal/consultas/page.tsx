'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Video, Calendar, Clock, User, X, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

export default function PatientConsultasPage() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [telemedicineSessions, setTelemedicineSessions] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [sessionToCancel, setSessionToCancel] = useState<any>(null)
  const [appointmentToCancel, setAppointmentToCancel] = useState<any>(null)
  const [cancellationReason, setCancellationReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadAppointments()
  }, [])

  const loadAppointments = async () => {
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
        console.error('Erro ao buscar patient ID:', patientRes.status)
        return
      }
      
      const { patientId } = await patientRes.json()
      if (!patientId) return
      
      const patient = { id: patientId }

      const { data, error } = await supabase
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
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })

      if (error) throw error

      setAppointments(data || [])

      // Buscar sessões de telemedicina para as consultas
      if (data && data.length > 0) {
        const appointmentIds = data.map((apt: any) => apt.id)
        const { data: sessions } = await supabase
          .from('telemedicine_sessions')
          .select('*, cancellation_reason, cancelled_at')
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
      console.error('Erro ao carregar consultas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSession = (appointment: any, session: any) => {
    setAppointmentToCancel(appointment)
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
      setAppointmentToCancel(null)
      setCancellationReason('')
      
      // Recarregar consultas
      loadAppointments()
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

  const getConsultationTypeLabel = (type: string | null) => {
    const labels: Record<string, string> = {
      presencial: 'Presencial',
      telemedicina: 'Telemedicina',
      hibrida: 'Híbrida',
    }
    return labels[type || 'presencial'] || 'Presencial'
  }

  const getConsultationTypeBadge = (type: string | null) => {
    if (type === 'telemedicina' || type === 'hibrida') {
      return 'default'
    }
    return 'secondary'
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const upcomingAppointments = appointments.filter((apt: any) => {
    const aptDate = new Date(apt.appointment_date)
    aptDate.setHours(0, 0, 0, 0)
    return aptDate >= today && apt.status !== 'cancelled' && apt.status !== 'completed'
  })

  const pastAppointments = appointments.filter((apt: any) => {
    const aptDate = new Date(apt.appointment_date)
    aptDate.setHours(0, 0, 0, 0)
    return aptDate < today || apt.status === 'completed' || apt.status === 'cancelled'
  })

  const canJoinTelemedicine = (appointment: any) => {
    const session = telemedicineSessions[appointment.id]
    if (!session) return false
    if (session.status === 'cancelled' || session.status === 'ended') return false
    
    // Verificar se é consulta de telemedicina
    if (appointment.consultation_type !== 'telemedicina' && appointment.consultation_type !== 'hibrida') {
      return false
    }

    // Verificar se está no horário da consulta (15 minutos antes até 2 horas depois)
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
    const now = new Date()
    const minutesBefore = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60)
    
    return minutesBefore <= 15 && minutesBefore >= -120
  }

  const renderAppointmentCard = (appointment: any) => {
    const session = telemedicineSessions[appointment.id]
    const canJoin = canJoinTelemedicine(appointment)
    
    return (
      <Card key={appointment.id}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {new Date(appointment.appointment_date).toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </CardTitle>
              <p className="text-sm font-medium text-muted-foreground mt-1">
                às {appointment.appointment_time}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant={getStatusBadge(appointment.status) as any}>
                {getStatusLabel(appointment.status)}
              </Badge>
              <Badge variant={getConsultationTypeBadge(appointment.consultation_type) as any}>
                {getConsultationTypeLabel(appointment.consultation_type)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>
              <strong>Médico:</strong> {appointment.doctors?.name} - CRM: {appointment.doctors?.crm}
            </span>
          </div>

          {appointment.notes && (
            <div className="text-sm text-muted-foreground">
              <strong>Observações:</strong> {appointment.notes}
            </div>
          )}

          {session && session.status === 'cancelled' && (
            <div className="pt-2 border-t">
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm">
                <div className="flex items-start gap-2">
                  <X className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-destructive mb-1">Consulta Cancelada</p>
                    {session.cancellation_reason && (
                      <p className="text-muted-foreground">
                        <strong>Motivo:</strong> {session.cancellation_reason}
                      </p>
                    )}
                    {session.cancelled_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Cancelada em: {new Date(session.cancelled_at).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {canJoin && (
            <div className="pt-2 border-t space-y-2">
              <Link href={`/portal/consultas/telemedicina/${appointment.id}`}>
                <Button className="w-full" size="sm">
                  <Video className="mr-2 h-4 w-4" />
                  Entrar na Consulta
                </Button>
              </Link>
              {session && (session.status === 'pending' || session.status === 'active') && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => handleCancelSession(appointment, session)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancelar Consulta
                </Button>
              )}
            </div>
          )}

          {session && !canJoin && session.status !== 'cancelled' && session.status !== 'ended' && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground text-center">
                {session.status === 'pending'
                  ? 'Aguarde o médico iniciar a consulta.'
                  : 'A consulta ainda não está disponível.'}
              </p>
              {(session.status === 'pending' || session.status === 'active') && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => handleCancelSession(appointment, session)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancelar Consulta
                </Button>
              )}
            </div>
          )}

          {appointment.consultation_type === 'telemedicina' && !canJoin && session && (
            <div className="text-xs text-muted-foreground">
              {session.status === 'pending' && 'Aguarde o médico iniciar a consulta.'}
              {session.status === 'active' && 'A consulta está ativa. Entre para participar.'}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Carregando consultas...</div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Minhas Consultas</h1>

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhuma consulta encontrada
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList>
            <TabsTrigger value="upcoming">
              Próximas ({upcomingAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Passadas ({pastAppointments.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upcoming" className="space-y-4 mt-6">
            {upcomingAppointments.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma consulta agendada
                </CardContent>
              </Card>
            ) : (
              upcomingAppointments.map(renderAppointmentCard)
            )}
          </TabsContent>
          
          <TabsContent value="past" className="space-y-4 mt-6">
            {pastAppointments.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma consulta passada
                </CardContent>
              </Card>
            ) : (
              pastAppointments.map(renderAppointmentCard)
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Dialog para Cancelar Sessão */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancelar Consulta de Telemedicina
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar esta consulta? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          {appointmentToCancel && sessionToCancel && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-md space-y-2">
                <p className="text-sm font-medium">Detalhes da Consulta:</p>
                <p className="text-sm text-muted-foreground">
                  <strong>Médico:</strong> {appointmentToCancel.doctors?.name || 'N/A'}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Data:</strong>{' '}
                  {appointmentToCancel.appointment_date
                    ? new Date(appointmentToCancel.appointment_date).toLocaleDateString('pt-BR')
                    : 'N/A'}{' '}
                  às {appointmentToCancel.appointment_time || 'N/A'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cancellation-reason">
                  Motivo do Cancelamento (Opcional)
                </Label>
                <Textarea
                  id="cancellation-reason"
                  placeholder="Ex: Não poderei comparecer, problema técnico, reagendamento..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Informe o motivo do cancelamento para melhorar o atendimento.
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
                setAppointmentToCancel(null)
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
    </div>
  )
}