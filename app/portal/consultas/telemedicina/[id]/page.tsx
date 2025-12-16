'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { WebRTCCall } from '@/components/telemedicine/webrtc-call'
import { PreCallInstructions } from '@/components/telemedicine/pre-call-instructions'
import { AIConsent } from '@/components/telemedicine/ai-consent'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { ArrowLeft, Clock, User, XCircle, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

function PatientTelemedicineContent() {
  const params = useParams()
  const router = useRouter()
  const appointmentId = params.id as string
  const [session, setSession] = useState<any>(null)
  const [appointment, setAppointment] = useState<any>(null)
  const [patientName, setPatientName] = useState<string>('Paciente')
  const [loading, setLoading] = useState(true)
  const [showInstructions, setShowInstructions] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [showAIConsent, setShowAIConsent] = useState(false)
  const [needsAIConsent, setNeedsAIConsent] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    if (appointmentId) {
      loadData()
    }
  }, [appointmentId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Verificar se o usuário é o paciente da consulta
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Buscar paciente via API route para evitar erro 406
      const patientRes = await fetch('/api/portal/patient-profile', {
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      })
      
      // Verificar se a resposta é JSON
      const contentType = patientRes.headers.get('content-type')
      if (!patientRes.ok || patientRes.status === 404 || !contentType || !contentType.includes('application/json')) {
        const errorText = await patientRes.text().catch(() => '')
        console.error('Erro ao buscar paciente:', patientRes.status, errorText.substring(0, 100))
        toast({
          title: 'Acesso negado',
          description: 'Você não é um paciente cadastrado.',
          variant: 'destructive',
        })
        router.push('/portal/dashboard')
        return
      }
      
      const { data: patient } = await patientRes.json()
      if (!patient) {
        toast({
          title: 'Acesso negado',
          description: 'Você não é um paciente cadastrado.',
          variant: 'destructive',
        })
        router.push('/portal/dashboard')
        return
      }

      if (patient.name) {
        setPatientName(patient.name)
      }

      // Buscar agendamento com verificação de autorização
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          *,
          doctors:doctor_id (
            id,
            name,
            crm
          )
        `)
        .eq('id', appointmentId)
        .eq('patient_id', patient.id)
        .single()

      if (appointmentError || !appointmentData) {
        toast({
          title: 'Acesso negado',
          description: 'Você não tem permissão para acessar esta consulta.',
          variant: 'destructive',
        })
        router.push('/portal/consultas')
        return
      }

      setAppointment(appointmentData)
      setAuthorized(true)

      // Verificar se existe sessão de telemedicina
      const { data: existingSession } = await supabase
        .from('telemedicine_sessions')
        .select('*, cancellation_reason, cancelled_at, cancelled_by, ai_summary_enabled, ai_consent_patient')
        .eq('appointment_id', appointmentId)
        .maybeSingle()

      if (existingSession) {
        // Verificar se está cancelada
        if (existingSession.status === 'cancelled') {
          toast({
            title: 'Consulta cancelada',
            description: existingSession.cancellation_reason 
              ? `Esta consulta foi cancelada. Motivo: ${existingSession.cancellation_reason}`
              : 'Esta consulta de telemedicina foi cancelada.',
            variant: 'destructive',
          })
          setSession(existingSession)
        } else {
          setSession(existingSession)
          
          // Verificar se precisa de consentimento de IA do paciente
          if (existingSession.ai_summary_enabled && !existingSession.ai_consent_patient) {
            setNeedsAIConsent(true)
            setShowAIConsent(true)
          }
        }
      } else {
        // Sessão ainda não foi criada pelo médico
        setSession(null)
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error)
      toast({
        title: 'Erro ao carregar consulta',
        description: error.message || 'Não foi possível carregar os dados da consulta',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReady = () => {
    setShowInstructions(false)
  }

  const handleAIConsentAccept = async () => {
    if (!session) return

    try {
      const response = await fetch(`/api/telemedicine/sessions/${session.id}/consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isDoctor: false,
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao registrar consentimento')
      }

      setShowAIConsent(false)
      setNeedsAIConsent(false)
      
      // Atualizar sessão local
      setSession({
        ...session,
        ai_consent_patient: true,
        ai_consent_patient_at: new Date().toISOString(),
      })

      toast({
        title: 'Consentimento registrado',
        description: 'Você aceitou o uso de IA nesta consulta.',
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao registrar consentimento',
        description: error.message || 'Não foi possível registrar seu consentimento.',
        variant: 'destructive',
      })
    }
  }

  const handleAIConsentDecline = async () => {
    toast({
      title: 'Consulta sem IA',
      description: 'A consulta continuará, mas não utilizará recursos de IA para transcrição ou resumo.',
      variant: 'default',
    })
    setShowAIConsent(false)
    setNeedsAIConsent(false)
    
    // Nota: O paciente pode continuar a consulta mesmo sem consentir IA
    // O médico será notificado que o paciente não consentiu
  }

  const handleEndCall = async () => {
    router.push('/portal/consultas')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Carregando consulta de telemedicina...</div>
      </div>
    )
  }

  if (!authorized || !appointment) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Acesso não autorizado.</p>
        <Link href="/portal/consultas">
          <Button variant="outline" className="mt-4">
            Voltar para Consultas
          </Button>
        </Link>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Link href="/portal/consultas">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Consulta de Telemedicina</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>Médico:</strong> {appointment.doctors?.name} - CRM: {appointment.doctors?.crm}
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Data:</strong> {new Date(appointment.appointment_date).toLocaleDateString('pt-BR')} às {appointment.appointment_time}
              </p>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">
                A sala de telemedicina ainda não foi criada. Aguarde o médico iniciar a consulta.
                Você receberá uma notificação quando a consulta estiver disponível.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Verificar se está cancelada
  if (session.status === 'cancelled') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Link href="/portal/consultas">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Consulta Cancelada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>Médico:</strong> {appointment.doctors?.name} - CRM: {appointment.doctors?.crm}
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Data:</strong> {new Date(appointment.appointment_date).toLocaleDateString('pt-BR')} às {appointment.appointment_time}
              </p>
            </div>

            <div className="border-t pt-4">
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-destructive mb-2">Consulta Cancelada</p>
                    {session.cancellation_reason ? (
                      <>
                        <p className="text-sm font-medium mb-1">Motivo do Cancelamento:</p>
                        <p className="text-sm text-muted-foreground">{session.cancellation_reason}</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Esta consulta foi cancelada.</p>
                    )}
                    {session.cancelled_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Cancelada em: {new Date(session.cancelled_at).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Mostrar termo de consentimento de IA se necessário
  if (showAIConsent && needsAIConsent && session) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Link href="/portal/consultas">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <AIConsent
          onAccept={handleAIConsentAccept}
          onDecline={handleAIConsentDecline}
          isDoctor={false}
          userName={patientName}
        />
      </div>
    )
  }

  if (showInstructions) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Link href="/portal/consultas">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Consulta de Telemedicina</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{appointment.doctors?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {new Date(appointment.appointment_date).toLocaleDateString('pt-BR')} às {appointment.appointment_time}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <PreCallInstructions onReady={handleReady} onSkip={handleReady} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/portal/consultas">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <div className="flex items-center gap-4">
          <Badge variant="default">
            {appointment.doctors?.name} - CRM: {appointment.doctors?.crm}
          </Badge>
        </div>
      </div>

      <WebRTCCall
        roomId={session.room_id}
        sessionId={session.id}
        appointmentId={appointmentId}
        onEndCall={handleEndCall}
        isDoctor={false}
        userName={patientName}
        doctorName={appointment?.doctors?.name}
        appointmentDate={appointment?.appointment_date}
        appointmentTime={appointment?.appointment_time}
      />
    </div>
  )
}

export default function PatientTelemedicinePage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <PatientTelemedicineContent />
    </Suspense>
  )
}
