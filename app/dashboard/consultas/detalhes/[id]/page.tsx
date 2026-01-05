'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowLeft,
  FileText,
  Download,
  Printer,
  Video,
  User,
  Calendar,
  Clock,
  Stethoscope,
  Sparkles,
  FileCheck,
  Monitor,
  MapPin,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

function ConsultaDetalhesContent() {
  const params = useParams()
  const router = useRouter()
  const appointmentId = params.id as string
  const [loading, setLoading] = useState(true)
  const [appointment, setAppointment] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [medicalRecord, setMedicalRecord] = useState<any>(null)
  const [transcription, setTranscription] = useState<string | null>(null)
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

      // Verificar autenticação primeiro
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        toast({
          title: 'Não autenticado',
          description: 'Por favor, faça login novamente.',
          variant: 'destructive',
        })
        router.push('/login')
        return
      }

      // Carregar agendamento
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          *,
          doctors:doctor_id (
            id,
            name,
            crm,
            email,
            specialty_id,
            specialties:specialty_id (
              id,
              name
            )
          ),
          patients:patient_id (
            id,
            name,
            cpf,
            birth_date,
            phone,
            email
          )
        `)
        .eq('id', appointmentId)
        .maybeSingle()

      if (appointmentError) {
        // Log detalhado do erro
        const errorDetails = {
          code: appointmentError.code,
          message: appointmentError.message,
          details: appointmentError.details,
          hint: appointmentError.hint,
          appointmentId,
          errorString: JSON.stringify(appointmentError, Object.getOwnPropertyNames(appointmentError)),
        }
        console.error('Erro ao carregar agendamento:', errorDetails)
        console.error('Erro completo:', appointmentError)
        
        // Verificar se é erro de RLS/permissão
        const isPermissionError = 
          appointmentError.code === 'PGRST301' || 
          appointmentError.code === '42501' ||
          appointmentError.message?.toLowerCase().includes('permission') ||
          appointmentError.message?.toLowerCase().includes('row-level security')
        
        if (isPermissionError) {
          // Tentar verificar permissões do usuário
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()

          if (profile?.role === 'medico') {
            // Tentar buscar apenas com doctor_id
            const { data: doctor } = await supabase
              .from('doctors')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle()

            if (doctor) {
              const { data: doctorAppointment, error: doctorError } = await supabase
                .from('appointments')
                .select(`
                  *,
                  doctors:doctor_id (
                    id,
                    name,
                    crm,
                    email,
                    specialty_id,
                    specialties:specialty_id (
                      id,
                      name
                    )
                  ),
                  patients:patient_id (
                    id,
                    name,
                    cpf,
                    birth_date,
                    phone,
                    email
                  )
                `)
                .eq('id', appointmentId)
                .eq('doctor_id', doctor.id)
                .maybeSingle()

              if (doctorError) {
                console.error('Erro ao carregar consulta do médico:', doctorError)
                toast({
                  title: 'Erro ao carregar consulta',
                  description: 'Não foi possível carregar os dados da consulta. Verifique suas permissões.',
                  variant: 'destructive',
                })
                router.push('/dashboard/consultas')
                return
              }

              if (!doctorAppointment) {
                toast({
                  title: 'Consulta não encontrada',
                  description: 'Esta consulta não pertence ao seu médico ou não foi encontrada.',
                  variant: 'destructive',
                })
                router.push('/dashboard/consultas')
                return
              }

              setAppointment(doctorAppointment)
              // Continuar carregando o resto dos dados abaixo
            } else {
              toast({
                title: 'Erro',
                description: 'Médico não encontrado. Verifique seu perfil.',
                variant: 'destructive',
              })
              router.push('/dashboard/consultas')
              return
            }
          } else {
            // Não é médico, pode ser admin ou recepcionista
            toast({
              title: 'Erro de permissão',
              description: 'Você não tem permissão para visualizar esta consulta.',
              variant: 'destructive',
            })
            router.push('/dashboard/consultas')
            return
          }
        } else {
          // Outro tipo de erro - tentar serializar o erro completo
          let errorMessage = 'Erro desconhecido ao carregar consulta'
          try {
            if (appointmentError.message) {
              errorMessage = appointmentError.message
            } else if (appointmentError.details) {
              errorMessage = appointmentError.details
            } else if (appointmentError.hint) {
              errorMessage = appointmentError.hint
            } else if (appointmentError.code) {
              errorMessage = `Erro ${appointmentError.code} ao carregar consulta`
            } else {
              // Tentar serializar o erro completo
              const errorStr = JSON.stringify(appointmentError, null, 2)
              if (errorStr && errorStr !== '{}') {
                errorMessage = `Erro: ${errorStr}`
              }
            }
          } catch (e) {
            errorMessage = 'Erro ao processar consulta. Verifique suas permissões.'
          }
          
          toast({
            title: 'Erro ao carregar consulta',
            description: errorMessage,
            variant: 'destructive',
          })
          router.push('/dashboard/consultas')
          return
        }
      } else if (!appointmentData) {
        toast({
          title: 'Consulta não encontrada',
          description: 'A consulta solicitada não foi encontrada.',
          variant: 'destructive',
        })
        router.push('/dashboard/consultas')
        return
      } else {
        setAppointment(appointmentData)
      }

      // Carregar sessão de telemedicina se houver
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('telemedicine_sessions')
          .select('*')
          .eq('appointment_id', appointmentId)
          .maybeSingle()

        if (sessionError) {
          console.error('Erro ao carregar sessão:', sessionError)
          // Não bloquear se não houver sessão
        } else if (sessionData) {
          setSession(sessionData)
          
          // Carregar transcrições da tabela telemedicine_transcriptions
          try {
            const { data: transcriptionsData, error: transcriptionError } = await supabase
              .from('telemedicine_transcriptions')
              .select('*')
              .eq('session_id', sessionData.id)
              .order('timestamp', { ascending: true })

            if (transcriptionError) {
              console.error('Erro ao carregar transcrições:', transcriptionError)
              // Não bloquear se não houver transcrições
            } else if (transcriptionsData && transcriptionsData.length > 0) {
              // Formatar transcrições como texto
              const transcriptionText = transcriptionsData
                .map((t: any) => {
                  const speakerLabel = t.speaker === 'doctor' ? 'Médico' : 
                                      t.speaker === 'patient' ? 'Paciente' : 'Participante'
                  const minutes = Math.floor((t.timestamp || 0) / 60)
                  const seconds = Math.floor((t.timestamp || 0) % 60)
                  return `[${minutes}:${seconds.toString().padStart(2, '0')}] ${speakerLabel}: ${t.text}`
                })
                .join('\n')
              setTranscription(transcriptionText)
            }
          } catch (transcriptionErr: any) {
            console.error('Erro ao processar transcrições:', transcriptionErr)
            // Continuar mesmo se houver erro
          }
        }
      } catch (sessionErr: any) {
        console.error('Erro ao processar sessão:', sessionErr)
        // Continuar mesmo se houver erro
      }

      // Carregar prontuário relacionado
      try {
        const { data: recordData, error: recordError } = await supabase
          .from('medical_records')
          .select(`
            *,
            anamnesis:anamnesis (
              *
            ),
            physical_exams:physical_exams (
              *
            ),
            evolutions:evolutions (
              *
            )
          `)
          .eq('appointment_id', appointmentId)
          .maybeSingle()

        if (recordError) {
          console.error('Erro ao carregar prontuário:', recordError)
          // Não bloquear se não houver prontuário
        } else if (recordData) {
          setMedicalRecord(recordData)
        }
      } catch (recordErr: any) {
        console.error('Erro ao processar prontuário:', recordErr)
        // Continuar mesmo se houver erro
      }
    } catch (error: any) {
      // Log detalhado do erro
      const errorInfo = {
        error,
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        errorString: error ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : 'Erro vazio',
      }
      console.error('Erro ao carregar dados:', errorInfo)
      
      // Mensagem de erro mais informativa
      let errorMessage = 'Não foi possível carregar os dados da consulta'
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.details) {
        errorMessage = error.details
      } else if (error?.hint) {
        errorMessage = error.hint
      } else if (error?.code) {
        errorMessage = `Erro ${error.code} ao carregar consulta`
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error && typeof error === 'object') {
        try {
          const errorStr = JSON.stringify(error)
          if (errorStr && errorStr !== '{}') {
            errorMessage = `Erro: ${errorStr.substring(0, 200)}`
          }
        } catch (e) {
          errorMessage = 'Erro desconhecido ao carregar consulta'
        }
      }
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      })
      
      // Redirecionar para página de consultas após 2 segundos
      setTimeout(() => {
        router.push('/dashboard/consultas')
      }, 2000)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/pdf/consulta/${appointmentId}`)
      if (!response.ok) throw new Error('Erro ao gerar PDF')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `consulta-${appointmentId}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'PDF gerado',
        description: 'O PDF da consulta foi baixado com sucesso',
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar PDF',
        description: error.message || 'Não foi possível gerar o PDF',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Carregando detalhes da consulta...</div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Consulta não encontrada.</p>
        <Button onClick={() => router.back()} className="mt-4">
          Voltar
        </Button>
      </div>
    )
  }

  const isTelemedicine = appointment.consultation_type === 'telemedicina' || appointment.consultation_type === 'hibrida'
  const hasAISummary = session?.ai_summary && session.ai_summary.trim() !== ''
  const hasTranscription = transcription && transcription.trim() !== ''
  const hasMedicalRecord = !!medicalRecord

  return (
    <div className="space-y-6 print:p-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Detalhes da Consulta</h1>
            <p className="text-muted-foreground">
              {format(new Date(appointment.appointment_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" />
            Baixar PDF
          </Button>
        </div>
      </div>

      {/* Informações da Consulta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Informações da Consulta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Paciente</div>
              <div className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                {appointment.patients?.name || 'N/A'}
              </div>
              {appointment.patients?.cpf && (
                <div className="text-sm text-muted-foreground">CPF: {appointment.patients.cpf}</div>
              )}
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Médico</div>
              <div className="font-medium flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                {appointment.doctors?.name || 'N/A'}
              </div>
              {appointment.doctors?.crm && (
                <div className="text-sm text-muted-foreground">CRM: {appointment.doctors.crm}</div>
              )}
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Data e Hora</div>
              <div className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {format(new Date(appointment.appointment_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <Clock className="h-4 w-4" />
                {appointment.appointment_time || 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Tipo de Consulta</div>
              <div className="font-medium flex items-center gap-2">
                {isTelemedicine ? (
                  <>
                    <Monitor className="h-4 w-4" />
                    Telemedicina
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4" />
                    Presencial
                  </>
                )}
              </div>
              <div className="mt-2">
                <Badge variant={appointment.status === 'completed' ? 'default' : 'secondary'}>
                  {appointment.status === 'completed' ? 'Concluída' : appointment.status}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo da IA (se houver) */}
      {hasAISummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Resumo da Consulta (IA)
            </CardTitle>
            <CardDescription>
              Resumo gerado automaticamente por Inteligência Artificial
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {session.ai_summary}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Transcrição (se houver) */}
      {hasTranscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Transcrição da Consulta
            </CardTitle>
            <CardDescription>
              Transcrição completa da conversa durante a consulta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {transcription}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Prontuário (se houver) */}
      {hasMedicalRecord && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Prontuário Médico
            </CardTitle>
            <CardDescription>
              Informações do prontuário relacionado a esta consulta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {medicalRecord.anamnesis && (
              <div>
                <h4 className="font-semibold mb-2">Anamnese</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  {medicalRecord.anamnesis.chief_complaint && (
                    <div>
                      <strong>Queixa Principal:</strong> {medicalRecord.anamnesis.chief_complaint}
                    </div>
                  )}
                  {medicalRecord.anamnesis.history_of_present_illness && (
                    <div>
                      <strong>História da Doença Atual:</strong> {medicalRecord.anamnesis.history_of_present_illness}
                    </div>
                  )}
                </div>
              </div>
            )}

            {medicalRecord.physical_exams && (
              <div>
                <h4 className="font-semibold mb-2">Exame Físico</h4>
                <div className="text-sm text-muted-foreground">
                  {medicalRecord.physical_exams.general_appearance && (
                    <div>
                      <strong>Estado Geral:</strong> {medicalRecord.physical_exams.general_appearance}
                    </div>
                  )}
                </div>
              </div>
            )}

            {medicalRecord.evolutions && medicalRecord.evolutions.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Evoluções</h4>
                <div className="space-y-2">
                  {medicalRecord.evolutions.map((evolution: any, index: number) => (
                    <div key={index} className="text-sm text-muted-foreground border-l-2 pl-3">
                      <div className="font-medium">
                        {format(new Date(evolution.evolution_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                      <div>{evolution.notes}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t my-4" />

            <div className="flex gap-2">
              <Link href={`/dashboard/prontuario/${medicalRecord.id}`}>
                <Button variant="outline">
                  <FileCheck className="mr-2 h-4 w-4" />
                  Ver Prontuário Completo
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações da Sessão de Telemedicina */}
      {isTelemedicine && session && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Sessão de Telemedicina
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <Badge variant={session.status === 'ended' ? 'default' : 'secondary'}>
                  {session.status === 'ended' ? 'Finalizada' : session.status}
                </Badge>
              </div>
              {session.started_at && (
                <div>
                  <div className="text-sm text-muted-foreground">Iniciada em</div>
                  <div className="font-medium">
                    {format(new Date(session.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                </div>
              )}
              {session.ended_at && (
                <div>
                  <div className="text-sm text-muted-foreground">Finalizada em</div>
                  <div className="font-medium">
                    {format(new Date(session.ended_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                </div>
              )}
              {session.recording_duration && (
                <div>
                  <div className="text-sm text-muted-foreground">Duração</div>
                  <div className="font-medium">
                    {Math.floor(session.recording_duration / 60)} minutos
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Recursos Utilizados:</div>
              <div className="flex flex-wrap gap-2">
                {session.transcription_enabled && (
                  <Badge variant="outline">
                    <FileText className="h-3 w-3 mr-1" />
                    Transcrição
                  </Badge>
                )}
                {session.ai_summary_enabled && (
                  <Badge variant="outline">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Resumo IA
                  </Badge>
                )}
                {session.recording_enabled && (
                  <Badge variant="outline">
                    <Video className="h-3 w-3 mr-1" />
                    Gravação
                  </Badge>
                )}
              </div>
            </div>

            {session.recording_url && (
              <div>
                <Button variant="outline" asChild>
                  <a href={session.recording_url} target="_blank" rel="noopener noreferrer">
                    <Video className="mr-2 h-4 w-4" />
                    Ver Gravação
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Observações */}
      {appointment.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{appointment.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Ações */}
      <div className="flex gap-2 print:hidden">
        <Link href={`/dashboard/agendamentos/${appointmentId}`}>
          <Button variant="outline">
            Ver Agendamento
          </Button>
        </Link>
        {appointment.patients?.id && (
          <Link href={`/dashboard/pacientes/${appointment.patients.id}`}>
            <Button variant="outline">
              Ver Paciente
            </Button>
          </Link>
        )}
        {!hasMedicalRecord && (
          <Link href={`/dashboard/prontuario/novo?appointment_id=${appointmentId}`}>
            <Button>
              Criar Prontuário
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}

export default function ConsultaDetalhesPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ConsultaDetalhesContent />
    </Suspense>
  )
}

