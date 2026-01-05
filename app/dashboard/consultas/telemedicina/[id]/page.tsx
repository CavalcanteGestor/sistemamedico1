'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { WebRTCCall } from '@/components/telemedicine/webrtc-call'
import { SessionSetup } from '@/components/telemedicine/session-setup'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { ArrowLeft, Copy, Check, XCircle, AlertTriangle } from 'lucide-react'

function TelemedicineContent() {
  const params = useParams()
  const router = useRouter()
  const appointmentId = params.id as string
  const [session, setSession] = useState<any>(null)
  const [appointment, setAppointment] = useState<any>(null)
  const [userName, setUserName] = useState<string>('Médico')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [sessionConfig, setSessionConfig] = useState<{
    aiSummaryEnabled: boolean
    aiSummaryPrompt?: string
    transcriptionEnabled: boolean
  } | null>(null)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    if (appointmentId) {
      loadSession()
    }
  }, [appointmentId])

  const loadSession = async () => {
    try {
      setLoading(true)

      // Buscar agendamento para pegar nome do médico e paciente
      const { data: appointmentData } = await supabase
        .from('appointments')
        .select(`
          *,
          doctors:doctor_id (
            id,
            name
          ),
          patients:patient_id (
            id,
            name
          )
        `)
        .eq('id', appointmentId)
        .single()

      if (appointmentData) {
        setAppointment(appointmentData)
        if (appointmentData.doctors?.name) {
          setUserName(`Dr(a). ${appointmentData.doctors.name}`)
        }
      }

      // Buscar nome do médico logado
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single()
        
        if (profile?.name) {
          setUserName(profile.name)
        }
      }

      // Verificar se já existe sessão
      const { data: existingSession } = await supabase
        .from('telemedicine_sessions')
        .select('*, cancellation_reason, cancelled_at, cancelled_by, ai_summary_enabled, ai_summary_prompt, transcription_enabled')
        .eq('appointment_id', appointmentId)
        .maybeSingle()

      if (existingSession) {
        // Verificar se está cancelada
        if (existingSession.status === 'cancelled') {
          toast({
            title: 'Sessão cancelada',
            description: existingSession.cancellation_reason 
              ? `Esta sessão foi cancelada. Motivo: ${existingSession.cancellation_reason}`
              : 'Esta sessão de telemedicina foi cancelada.',
            variant: 'destructive',
          })
          router.push('/dashboard/telemedicina')
          return
        }
        setSession(existingSession)
        // Se já tem sessão, não mostrar setup
        setShowSetup(false)
      } else {
        // Nova sessão - mostrar configuração primeiro
        setShowSetup(true)
      }
    } catch (error: any) {
      console.error('Erro ao carregar sessão:', error)
      toast({
        title: 'Erro ao carregar sessão',
        description: error.message || 'Não foi possível carregar a sessão de telemedicina',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const copyRoomUrl = async () => {
    try {
      // Gerar link correto do paciente usando a API
      const response = await fetch('/api/telemedicine/generate-patient-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao gerar link')
      }

      const { link } = await response.json()
      
      // Copiar link HTTP/HTTPS válido
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast({
        title: 'Link copiado!',
        description: 'O link da consulta foi copiado para a área de transferência.',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error: any) {
      console.error('Erro ao copiar link:', error)
      toast({
        title: 'Erro ao copiar link',
        description: error.message || 'Não foi possível gerar o link. Verifique se o paciente tem token de login.',
        variant: 'destructive',
      })
    }
  }

  const handleEndCall = async () => {
    try {
      if (session) {
        const response = await fetch(`/api/telemedicine/sessions/${session.id}/end`, {
          method: 'POST',
        })

        if (response.ok) {
          toast({
            title: 'Consulta encerrada',
            description: 'A sessão de telemedicina foi finalizada.',
          })
          router.push('/dashboard/agendamentos')
        }
      }
    } catch (error) {
      // Erro silencioso
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Carregando sessão de telemedicina...</div>
      </div>
    )
  }

  const handleSetupComplete = async (config: {
    aiSummaryEnabled: boolean
    aiSummaryPrompt?: string
    transcriptionEnabled: boolean
    aiConsentGiven?: boolean
  }) => {
    setSessionConfig(config)
    setShowSetup(false)

    try {
      // Criar sessão com as configurações
      const response = await fetch('/api/telemedicine/create-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId,
          provider: 'webrtc',
          aiSummaryEnabled: config.aiSummaryEnabled,
          aiSummaryPrompt: config.aiSummaryPrompt,
          transcriptionEnabled: config.transcriptionEnabled,
          aiConsentDoctor: config.aiConsentGiven || false,
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao criar sessão')
      }

      const { session: newSession } = await response.json()
      setSession(newSession)
    } catch (error: any) {
      toast({
        title: 'Erro ao criar sessão',
        description: error.message || 'Não foi possível criar a sessão',
        variant: 'destructive',
      })
      setShowSetup(true) // Voltar para setup em caso de erro
    }
  }

  if (!session && showSetup) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/agendamentos">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <SessionSetup onComplete={handleSetupComplete} />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Erro ao carregar sessão de telemedicina.</p>
        <div className="flex gap-2 justify-center mt-4">
          <Link href="/dashboard/agendamentos">
            <Button variant="outline">
              Voltar para Agendamentos
            </Button>
          </Link>
          <Link href="/dashboard/telemedicina">
            <Button variant="outline">
              Ver Telemedicina
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Verificar se está cancelada (double check)
  if (session.status === 'cancelled') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="text-center py-12">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-destructive">
                  <XCircle className="h-6 w-6" />
                  <h2 className="text-xl font-bold">Sessão Cancelada</h2>
                </div>
                <div className="space-y-2 text-left">
                  {appointment && (
                    <>
                      <p className="text-sm text-muted-foreground">
                        <strong>Paciente:</strong> {appointment.patients?.name || 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>Médico:</strong> {appointment.doctors?.name || 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>Data:</strong> {appointment.appointment_date 
                          ? new Date(appointment.appointment_date).toLocaleDateString('pt-BR') 
                          : 'N/A'} às {appointment.appointment_time || 'N/A'}
                      </p>
                    </>
                  )}
                </div>
                {session.cancellation_reason && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-destructive mb-2">Motivo do Cancelamento:</p>
                        <p className="text-muted-foreground">{session.cancellation_reason}</p>
                      </div>
                    </div>
                  </div>
                )}
                {session.cancelled_at && (
                  <p className="text-sm text-muted-foreground">
                    Cancelada em: {new Date(session.cancelled_at).toLocaleString('pt-BR')}
                  </p>
                )}
                <div className="flex gap-2 justify-center pt-4">
                  <Link href="/dashboard/telemedicina">
                    <Button>
                      Voltar para Telemedicina
                    </Button>
                  </Link>
                  <Link href="/dashboard/agendamentos">
                    <Button variant="outline">
                      Ver Agendamentos
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/agendamentos">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <Button onClick={copyRoomUrl} variant="outline">
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Copiado!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copiar Link
            </>
          )}
        </Button>
      </div>

      <WebRTCCall
        roomId={session.room_id}
        sessionId={session.id}
        appointmentId={appointmentId}
        patientId={appointment?.patient_id}
        onEndCall={handleEndCall}
        isDoctor={true}
        userName={userName}
        doctorName={appointment?.doctors?.name}
        appointmentDate={appointment?.appointment_date}
        appointmentTime={appointment?.appointment_time}
        aiSummaryEnabled={session.ai_summary_enabled || false}
        transcriptionEnabled={session.transcription_enabled || false}
      />
    </div>
  )
}

export default function TelemedicinePage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <TelemedicineContent />
    </Suspense>
  )
}

