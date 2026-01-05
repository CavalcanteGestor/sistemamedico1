'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { WebRTCCall } from '@/components/telemedicine/webrtc-call'
import { PreCallInstructions } from '@/components/telemedicine/pre-call-instructions'
import { AIConsent } from '@/components/telemedicine/ai-consent'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { ArrowLeft, Clock, User, XCircle, AlertTriangle, Loader2, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const passwordSchema = z.object({
  password: z.string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número'),
  confirmPassword: z.string().min(8, 'Confirmação de senha obrigatória'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

type PasswordInput = z.infer<typeof passwordSchema>

function TelemedicineLinkContent() {
  const params = useParams()
  const router = useRouter()
  const appointmentId = params.appointmentId as string
  const token = params.token as string
  const [session, setSession] = useState<any>(null)
  const [appointment, setAppointment] = useState<any>(null)
  const [patient, setPatient] = useState<any>(null)
  const [patientName, setPatientName] = useState<string>('Paciente')
  const [loading, setLoading] = useState(true)
  const [showInstructions, setShowInstructions] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [showAIConsent, setShowAIConsent] = useState(false)
  const [needsAIConsent, setNeedsAIConsent] = useState(false)
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordInput>({
    resolver: zodResolver(passwordSchema),
  })

  useEffect(() => {
    if (appointmentId && token) {
      loadData()
    }
  }, [appointmentId, token])

  // Monitorar status da sessão em tempo real (para detectar quando médico encerra)
  useEffect(() => {
    if (!session?.id || !appointmentId) return

    // Configurar listener realtime para detectar quando sessão é encerrada
    const channel = supabase
      .channel(`telemedicine-session-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'telemedicine_sessions',
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          const updatedSession = payload.new as any
          
          // Se sessão foi encerrada ou cancelada
          if (updatedSession.status === 'ended' || updatedSession.status === 'cancelled') {
            setSession(updatedSession)
            toast({
              title: updatedSession.status === 'ended' ? 'Consulta encerrada' : 'Consulta cancelada',
              description: updatedSession.status === 'ended' 
                ? 'O médico encerrou esta consulta de telemedicina.'
                : updatedSession.cancellation_reason || 'Esta consulta foi cancelada.',
              variant: updatedSession.status === 'ended' ? 'default' : 'destructive',
            })
            // Redirecionar após alguns segundos
            setTimeout(() => {
              router.push('/login')
            }, 3000)
          }
        }
      )
      .subscribe()

    // Polling de backup (verificar a cada 5 segundos)
    const pollInterval = setInterval(async () => {
      try {
        const { data: currentSession } = await supabase
          .from('telemedicine_sessions')
          .select('status, cancellation_reason')
          .eq('id', session.id)
          .single()

        if (currentSession) {
          if (currentSession.status === 'ended' || currentSession.status === 'cancelled') {
            if (session.status !== currentSession.status) {
              setSession({ ...session, status: currentSession.status, cancellation_reason: currentSession.cancellation_reason })
              toast({
                title: currentSession.status === 'ended' ? 'Consulta encerrada' : 'Consulta cancelada',
                description: currentSession.status === 'ended' 
                  ? 'O médico encerrou esta consulta de telemedicina.'
                  : currentSession.cancellation_reason || 'Esta consulta foi cancelada.',
                variant: currentSession.status === 'ended' ? 'default' : 'destructive',
              })
              setTimeout(() => {
                router.push('/login')
              }, 3000)
            }
          }
        }
      } catch (error) {
        // Erro silencioso
      }
    }, 5000)

    return () => {
      channel.unsubscribe()
      clearInterval(pollInterval)
    }
  }, [session?.id, session?.status, appointmentId, supabase, toast, router])

  const loadData = async () => {
    try {
      setLoading(true)

      // Buscar paciente pelo token de login
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('id, name, email, user_id, login_token, login_token_expires_at')
        .eq('login_token', token)
        .single()

      if (patientError || !patientData) {
        toast({
          title: 'Link inválido',
          description: 'Este link de acesso não é válido ou expirou.',
          variant: 'destructive',
        })
        return
      }

      // Verificar se token expirou
      if (patientData.login_token_expires_at) {
        const expiresAt = new Date(patientData.login_token_expires_at)
        if (expiresAt < new Date()) {
          toast({
            title: 'Link expirado',
            description: 'Este link expirou. Entre em contato com a clínica para gerar um novo link.',
            variant: 'destructive',
          })
          return
        }
      }

      setPatient(patientData)
      setPatientName(patientData.name || 'Paciente')

      // Buscar agendamento
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
        .eq('patient_id', patientData.id)
        .single()

      if (appointmentError || !appointmentData) {
        toast({
          title: 'Acesso negado',
          description: 'Você não tem permissão para acessar esta consulta.',
          variant: 'destructive',
        })
        return
      }

      setAppointment(appointmentData)
      setAuthorized(true)

      // Se paciente tem user_id, verificar se precisa mudar senha
      if (patientData.user_id) {
        const { data: { user } } = await supabase.auth.getUser()
        
        // Se não está autenticado, verificar metadata usando admin client via API
        if (!user) {
          try {
            // Buscar informações do usuário via API para verificar must_change_password
            const response = await fetch(`/api/auth/check-user?email=${encodeURIComponent(patientData.email)}`)
            if (response.ok) {
              const { mustChangePassword } = await response.json()
              if (mustChangePassword) {
                setNeedsPasswordChange(true)
                return // Retornar para mostrar tela de mudança de senha
              }
            }
            // Se não precisa mudar senha, redirecionar para login normal
            toast({
              title: 'Login necessário',
              description: 'Você precisa fazer login para acessar esta consulta. Use seu email e senha.',
              variant: 'default',
            })
            router.push(`/login-paciente/${token}?redirect=/telemedicina/${appointmentId}/${token}`)
            return
          } catch (error) {
            // Se falhar, assumir que precisa de login normal
            router.push(`/login-paciente/${token}?redirect=/telemedicina/${appointmentId}/${token}`)
            return
          }
        } else {
          // Já está autenticado, verificar se precisa mudar senha
          const mustChangePassword = user.user_metadata?.must_change_password === true
          if (mustChangePassword) {
            setNeedsPasswordChange(true)
            return
          }
          // Se não precisa mudar senha e já está autenticado, verificar se é o paciente correto
          if (user.id !== patientData.user_id) {
            // Não é o paciente correto, fazer logout e redirecionar
            await supabase.auth.signOut()
            router.push(`/login-paciente/${token}?redirect=/telemedicina/${appointmentId}/${token}`)
            return
          }
        }
      } else {
        // Paciente não tem user_id - não precisa verificar senha, pode acessar direto
        // Continuar com o fluxo normalmente
      }

      // Buscar sessão de telemedicina
      const { data: existingSession } = await supabase
        .from('telemedicine_sessions')
        .select('*, cancellation_reason, cancelled_at, cancelled_by, ai_summary_enabled, ai_consent_patient')
        .eq('appointment_id', appointmentId)
        .maybeSingle()

      if (existingSession) {
        if (existingSession.status === 'cancelled') {
          setSession(existingSession)
        } else if (existingSession.status === 'ended') {
          // Sessão já foi encerrada
          setSession(existingSession)
          toast({
            title: 'Consulta encerrada',
            description: 'O médico encerrou esta consulta de telemedicina.',
            variant: 'default',
          })
        } else {
          setSession(existingSession)
          
          if (existingSession.ai_summary_enabled && !existingSession.ai_consent_patient) {
            setNeedsAIConsent(true)
            setShowAIConsent(true)
          }
        }
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

  const handleChangePassword = async (data: PasswordInput) => {
    try {
      setChangingPassword(true)

      // Criar usuário se não existir
      if (!patient.user_id) {
        const response = await fetch('/api/auth/create-user-for-patient', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            patientId: patient.id,
            email: patient.email,
            name: patient.name,
          }),
        })

        if (!response.ok) {
          throw new Error('Erro ao criar conta')
        }

        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error || 'Erro ao criar conta')
        }

        // Aguardar um pouco
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Fazer login com senha padrão
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: patient.email,
        password: 'paciente123',
      })

      if (authError) {
        // Se não conseguir, pode ser que já tenha senha personalizada
        throw new Error('Não foi possível validar as credenciais. Entre em contato com a clínica.')
      }

      // Atualizar senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
        data: {
          must_change_password: false,
        },
      })

      if (updateError) throw updateError

      toast({
        title: 'Senha definida com sucesso!',
        description: 'Acessando a consulta de telemedicina...',
      })

      setNeedsPasswordChange(false)
      // Recarregar dados para continuar
      await loadData()
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error)
      toast({
        title: 'Erro ao definir senha',
        description: error.message || 'Não foi possível definir a senha. Entre em contato com a clínica.',
        variant: 'destructive',
      })
    } finally {
      setChangingPassword(false)
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
  }

  const handleEndCall = async () => {
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Carregando consulta de telemedicina...</div>
      </div>
    )
  }

  if (!authorized || !appointment || !patient) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Acesso não autorizado.</p>
        <Link href="/login">
          <Button variant="outline" className="mt-4">
            Ir para Login
          </Button>
        </Link>
      </div>
    )
  }

  // Se precisa mudar senha (primeiro acesso)
  if (needsPasswordChange) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <User className="h-6 w-6" />
              Definir Senha
            </CardTitle>
            <CardDescription>
              Olá, <strong>{patient.name}</strong>! Este é seu primeiro acesso. 
              Por favor, defina uma senha para acessar a consulta de telemedicina.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitPassword(handleChangePassword)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <Input
                  id="password"
                  type="password"
                  {...registerPassword('password')}
                  placeholder="Mínimo 8 caracteres, com maiúscula, minúscula e número"
                />
                {passwordErrors.password && (
                  <p className="text-sm text-destructive">{passwordErrors.password.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  A senha deve ter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas e números.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...registerPassword('confirmPassword')}
                  placeholder="Digite a senha novamente"
                />
                {passwordErrors.confirmPassword && (
                  <p className="text-sm text-destructive">{passwordErrors.confirmPassword.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={changingPassword}>
                {changingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Configurando...
                  </>
                ) : (
                  'Definir Senha e Acessar Consulta'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
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

  if (session.status === 'cancelled') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
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
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Se sessão foi encerrada
  if (session.status === 'ended') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              Consulta Encerrada
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
              <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded">
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900 dark:text-green-100 mb-2">Consulta Finalizada</p>
                    <p className="text-sm text-muted-foreground">
                      O médico encerrou esta consulta de telemedicina. Obrigado por utilizar nossos serviços!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-center pt-4">
              <Button onClick={() => router.push('/login')}>
                Voltar ao Início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showAIConsent && needsAIConsent && session) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
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
        patientId={appointment?.patient_id}
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

export default function TelemedicineLinkPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <TelemedicineLinkContent />
    </Suspense>
  )
}

