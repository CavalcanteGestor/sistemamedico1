'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Sparkles, Loader2, FileText, Copy, Check, Mic, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createClient } from '@/lib/supabase/client'

interface AISummaryProps {
  sessionId: string
  appointmentId?: string
  isDoctor: boolean
  notes?: string
  duration?: number
  localStream?: MediaStream | null
  remoteStream?: MediaStream | null
  autoTranscribe?: boolean
  hideTranscribeButton?: boolean
  isRecording?: boolean
  onRecordingStop?: () => void
}

interface TranscriptionSegment {
  id: string
  text: string
  timestamp: number // em segundos
  speaker: 'doctor' | 'patient' | 'unknown'
  included: boolean
}

export function AISummary({ sessionId, appointmentId, isDoctor, notes, duration, localStream, remoteStream, autoTranscribe = false, hideTranscribeButton = false, isRecording = false, onRecordingStop }: AISummaryProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [transcription, setTranscription] = useState<TranscriptionSegment[]>([])
  const [showTranscriptionEditor, setShowTranscriptionEditor] = useState(false)
  const [wasRecording, setWasRecording] = useState(false)
  const [autoTranscribeAttempted, setAutoTranscribeAttempted] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  // Carregar resumo e transcrição salvas quando componente monta
  useEffect(() => {
    if (sessionId) {
      loadSavedSummary()
      loadTranscription()
    }
  }, [sessionId])

  // Carregar transcrição ao montar (se já existir gravação)
  useEffect(() => {
    if (sessionId && isDoctor) {
      // Tentar transcrever gravação existente se houver
      checkForRecording()
    }
  }, [sessionId, isDoctor])

  // Monitorar quando a gravação parar para iniciar transcrição automaticamente
  useEffect(() => {
    if (autoTranscribe && isDoctor && wasRecording && !isRecording && !autoTranscribeAttempted && transcription.length === 0) {
      // Gravação acabou, verificar se foi salva e iniciar transcrição automaticamente
      setAutoTranscribeAttempted(true)
      
      // Verificar periodicamente se a gravação foi salva
      const checkInterval = setInterval(async () => {
        try {
          const { data: sessionData } = await supabase
            .from('telemedicine_sessions')
            .select('recording_url')
            .eq('id', sessionId)
            .maybeSingle()

          if (sessionData?.recording_url) {
            // Gravação foi salva, iniciar transcrição
            clearInterval(checkInterval)
            // Chamar transcribeFromRecording através de uma função wrapper
            setTimeout(() => {
              transcribeFromRecording().catch(() => {
                // Erro silencioso
              })
            }, 1000)
          }
        } catch (error) {
          // Erro silencioso
        }
      }, 2000) // Verificar a cada 2 segundos

      // Timeout máximo de 30 segundos
      const timeout = setTimeout(() => {
        clearInterval(checkInterval)
      }, 30000)

      return () => {
        clearInterval(checkInterval)
        clearTimeout(timeout)
      }
    }
    
    // Atualizar estado anterior da gravação
    if (isRecording) {
      setWasRecording(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, autoTranscribe, wasRecording, autoTranscribeAttempted, transcription.length, isDoctor, sessionId])

  const checkForRecording = async () => {
    try {
      // Verificar se existe gravação salva
      const { data: sessionData } = await supabase
        .from('telemedicine_sessions')
        .select('recording_url')
        .eq('id', sessionId)
        .maybeSingle()

      if (sessionData?.recording_url) {
        // Se houver gravação, permitir transcrição manual
        // Por enquanto, deixamos o médico iniciar a transcrição manualmente
      }
    } catch (error) {
      // Erro silencioso
    }
  }

  const transcribeFromRecording = async () => {
    if (!isDoctor) return

    // Verificar consentimento de IA antes de transcrever
    try {
      const { data: sessionData } = await supabase
        .from('telemedicine_sessions')
        .select('recording_url, ai_summary_enabled, transcription_enabled, ai_consent_doctor, ai_consent_patient')
        .eq('id', sessionId)
        .maybeSingle()

      if (sessionData?.transcription_enabled || sessionData?.ai_summary_enabled) {
        if (!sessionData.ai_consent_doctor) {
          toast({
            title: 'Consentimento necessário',
            description: 'É necessário aceitar o termo de consentimento para uso de IA antes de transcrever.',
            variant: 'destructive',
          })
          return
        }

        if (sessionData.ai_summary_enabled && !sessionData.ai_consent_patient) {
          toast({
            title: 'Aguardando consentimento do paciente',
            description: 'O paciente ainda não aceitou o termo de consentimento. Aguarde a aceitação.',
            variant: 'destructive',
          })
          return
        }
      }

      if (!sessionData?.recording_url) {
        toast({
          title: 'Nenhuma gravação encontrada',
          description: 'Inicie uma gravação primeiro para poder transcrever.',
          variant: 'destructive',
        })
        return
      }
    } catch (error) {
      // Erro silencioso - continuar
    }

    try {
      setTranscribing(true)

      // ESTRATÉGIA 1: Usar apenas gravações separadas (diarização precisa)
      const doctorAudio = (window as any).__telemedicineDoctorAudio as Blob | undefined
      const patientAudio = (window as any).__telemedicinePatientAudio as Blob | undefined

      if (!doctorAudio || !patientAudio) {
        toast({
          title: 'Gravações separadas não disponíveis',
          description: 'A transcrição precisa requer gravações separadas do médico e do paciente. Certifique-se de que a gravação foi feita com ambos os participantes conectados.',
          variant: 'destructive',
        })
        setTranscribing(false)
        return
      }

      // Usar API de transcrição separada
      const formData = new FormData()
      formData.append('audioDoctor', doctorAudio, 'doctor-audio.webm')
      formData.append('audioPatient', patientAudio, 'patient-audio.webm')
      formData.append('sessionId', sessionId)

      const transcribeResponse = await fetch('/api/telemedicine/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!transcribeResponse.ok) {
        throw new Error('Erro ao transcrever áudio')
      }

      const { segments } = await transcribeResponse.json()
      
      if (segments && segments.length > 0) {
        const newSegments = segments.map((seg: any, idx: number) => ({
          id: `${Date.now()}-${idx}`,
          text: seg.text,
          timestamp: seg.start || 0,
          speaker: seg.speaker || 'unknown',
          included: true,
        }))
        
        setTranscription(newSegments)
        await saveTranscription()
        
        toast({
          title: 'Transcrição concluída',
          description: `${segments.length} segmentos transcritos com sucesso.`,
        })
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao transcrever',
        description: error.message || 'Não foi possível transcrever a gravação.',
        variant: 'destructive',
      })
    } finally {
      setTranscribing(false)
    }
  }

  const loadTranscription = async () => {
    try {
      const { data, error } = await supabase
        .from('telemedicine_transcriptions')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true })

      if (error) {
        // Erro pode ser normal se a tabela não existir ou RLS bloquear
        if (error.code === 'PGRST116' || error.code === '42P01') {
          return
        }
        throw error
      }

      if (data) {
        const segments = data.map((item: any) => ({
          id: item.id,
          text: item.text,
          timestamp: item.timestamp,
          speaker: item.speaker,
          included: item.included !== false,
        }))
        setTranscription(segments)
      }
    } catch (error) {
      // Erro silencioso - tabela pode não existir ou RLS pode bloquear
    }
  }

  const saveTranscription = async () => {
    try {
      // Salvar segmentos no banco
      for (const segment of transcription) {
        const { error } = await supabase
          .from('telemedicine_transcriptions')
          .upsert({
            id: segment.id || undefined, // Se não tiver ID, deixar o banco gerar
            session_id: sessionId,
            text: segment.text,
            timestamp: Number(segment.timestamp) || 0,
            speaker: segment.speaker || 'unknown',
            included: segment.included !== false,
          }, {
            onConflict: segment.id ? 'id' : undefined,
          })
        
        if (error) {
          // Log silencioso - pode ser problema de RLS
        }
      }
    } catch (error) {
      // Erro silencioso - pode ser problema de permissão ou tabela
    }
  }

  const toggleSegmentInclusion = (segmentId: string) => {
    setTranscription((prev) =>
      prev.map((seg) =>
        seg.id === segmentId ? { ...seg, included: !seg.included } : seg
      )
    )
  }

  const removeSegment = (segmentId: string) => {
    setTranscription((prev) => prev.filter((seg) => seg.id !== segmentId))
  }

  const loadSavedSummary = async () => {
    try {
      const { data, error } = await supabase
        .from('telemedicine_sessions')
        .select('ai_summary')
        .eq('id', sessionId)
        .maybeSingle()

      if (error) {
        // Erro pode ser normal se RLS bloquear ou campo não existir
        if (error.code === 'PGRST116' || error.code === '42P01' || error.code === '42703') {
          // Campo não existe ou sem acesso
          return
        }
        // Outros erros também são silenciosos
        return
      }

      if (data?.ai_summary) {
        setSummary(data.ai_summary)
      }
    } catch (error) {
      // Erro silencioso - resumo pode não existir ainda
    } finally {
      setLoading(false)
    }
  }

  const generateSummary = async () => {
    if (!isDoctor) {
      toast({
        title: 'Acesso negado',
        description: 'Apenas médicos podem gerar resumos.',
        variant: 'destructive',
      })
      return
    }

    // Verificar consentimento de IA antes de gerar
    try {
      const { data: sessionData } = await supabase
        .from('telemedicine_sessions')
        .select('ai_summary_enabled, ai_consent_doctor, ai_consent_patient')
        .eq('id', sessionId)
        .maybeSingle()

      if (sessionData?.ai_summary_enabled) {
        if (!sessionData.ai_consent_doctor) {
          toast({
            title: 'Consentimento necessário',
            description: 'É necessário aceitar o termo de consentimento para uso de IA antes de gerar o resumo.',
            variant: 'destructive',
          })
          return
        }

        if (!sessionData.ai_consent_patient) {
          toast({
            title: 'Aguardando consentimento do paciente',
            description: 'O paciente ainda não aceitou o termo de consentimento para uso de IA. Aguarde a aceitação antes de gerar o resumo.',
            variant: 'destructive',
          })
          return
        }
      }
    } catch (error) {
      // Erro silencioso - continuar
    }

    // Coletar apenas os segmentos incluídos
    const includedSegments = transcription.filter((seg) => seg.included)
    
    if (includedSegments.length === 0 && !notes) {
      toast({
        title: 'Nenhum conteúdo selecionado',
        description: 'Selecione partes da conversa ou adicione anotações para gerar o resumo.',
        variant: 'destructive',
      })
      return
    }

    try {
      setGenerating(true)

      // Salvar seleções antes de gerar
      await saveTranscription()

      const response = await fetch(`/api/telemedicine/sessions/${sessionId}/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          duration,
          notes,
          transcriptionSegments: includedSegments.map((seg) => ({
            text: seg.text,
            timestamp: seg.timestamp,
            speaker: seg.speaker,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao gerar resumo')
      }

      const { summary: generatedSummary } = await response.json()
      setSummary(generatedSummary)

      // Recarregar resumo salvo para garantir sincronização
      await loadSavedSummary()

      toast({
        title: 'Resumo gerado',
        description: 'O resumo da consulta foi gerado com sucesso usando IA.',
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar resumo',
        description: error.message || 'Não foi possível gerar o resumo da consulta.',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  const copySummary = async () => {
    if (!summary) return

    await navigator.clipboard.writeText(summary)
    setCopied(true)
    toast({
      title: 'Copiado!',
      description: 'Resumo copiado para a área de transferência.',
    })

    setTimeout(() => setCopied(false), 2000)
  }

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isDoctor && !summary) {
    return null
  }

  const includedCount = transcription.filter((seg) => seg.included).length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Resumo da Consulta (IA)
          </CardTitle>
          {summary && (
            <Badge variant="outline" className="text-xs">
              Gerado
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!summary ? (
          <div className="space-y-4">
            {/* Botão para transcrever gravação - esconder se for automático */}
            {transcription.length === 0 && !hideTranscribeButton && (
              <Card className="border-2 border-dashed">
                <CardContent className="p-4">
                  <div className="text-center space-y-3">
                    <Mic className="h-8 w-8 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Transcrever Conversa</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Inicie uma gravação da consulta e depois clique aqui para transcrever automaticamente
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={transcribeFromRecording}
                      disabled={transcribing}
                    >
                      {transcribing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Transcrevendo...
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4 mr-2" />
                          Transcrever Gravação
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Indicador de transcrição automática */}
            {transcription.length === 0 && hideTranscribeButton && (
              <Card className="border-2 border-dashed">
                <CardContent className="p-4">
                  <div className="text-center space-y-3">
                    <Mic className="h-8 w-8 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Transcrição Automática</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isRecording 
                          ? 'A gravação está em andamento. A transcrição será iniciada automaticamente ao finalizar.'
                          : transcribing
                          ? 'Transcrevendo conversa automaticamente...'
                          : 'Aguardando gravação para transcrição automática'}
                      </p>
                    </div>
                    {transcribing && (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">Transcrevendo...</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Seletor de conteúdo da conversa */}
            {transcription.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Transcrição da Conversa</p>
                    <p className="text-xs text-muted-foreground">
                      {includedCount} de {transcription.length} segmentos selecionados
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={transcribeFromRecording}
                      disabled={transcribing}
                    >
                      {transcribing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowTranscriptionEditor(!showTranscriptionEditor)}
                    >
                      {showTranscriptionEditor ? 'Ocultar' : 'Editar'}
                    </Button>
                  </div>
                </div>

                {showTranscriptionEditor && (
                  <Card className="border-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs">Selecione o que incluir no resumo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[200px] pr-4">
                        <div className="space-y-2">
                          {transcription.map((segment) => (
                            <div
                              key={segment.id}
                              className={`flex items-start gap-2 p-2 rounded-lg border ${
                                segment.included ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'
                              }`}
                            >
                              <Checkbox
                                checked={segment.included}
                                onCheckedChange={() => toggleSegmentInclusion(segment.id)}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                      segment.speaker === 'doctor'
                                        ? 'border-blue-500 text-blue-700'
                                        : segment.speaker === 'patient'
                                        ? 'border-green-500 text-green-700'
                                        : ''
                                    }`}
                                  >
                                    {segment.speaker === 'doctor' ? '👨‍⚕️ Médico' : 
                                     segment.speaker === 'patient' ? '👤 Paciente' : '❓'}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {formatTimestamp(segment.timestamp)}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 ml-auto"
                                    onClick={() => removeSegment(segment.id)}
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>
                                <p className="text-sm">{segment.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setTranscription((prev) =>
                              prev.map((seg) => ({ ...seg, included: true }))
                            )
                          }
                        >
                          Selecionar Todos
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setTranscription((prev) =>
                              prev.map((seg) => ({ ...seg, included: false }))
                            )
                          }
                        >
                          Desmarcar Todos
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={saveTranscription}
                          className="ml-auto"
                        >
                          Salvar Seleções
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {transcription.length > 0
                  ? 'Selecione os trechos da conversa que deseja incluir no resumo. O resumo será gerado com base na conversa transcrita e nas anotações.'
                  : hideTranscribeButton
                  ? 'A transcrição será iniciada automaticamente quando a gravação terminar. Após a transcrição, você poderá gerar o resumo.'
                  : 'Gere um resumo automático da consulta usando inteligência artificial. O resumo será baseado nas anotações e conversa da reunião.'}
              </p>
              {transcribing && (
                <Badge variant="outline" className="text-xs">
                  <Mic className="h-3 w-3 mr-1 animate-pulse" />
                  Transcrevendo conversa...
                </Badge>
              )}
              {transcription.length > 0 && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  <Check className="h-3 w-3 mr-1" />
                  Transcrição concluída
                </Badge>
              )}
              <Button
                onClick={generateSummary}
                disabled={generating || (transcription.length === 0 && !notes) || transcribing}
                className="w-full"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando resumo...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar Resumo com IA
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Textarea
                value={summary}
                readOnly
                className="min-h-[200px] resize-none bg-muted"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copySummary}
                className="flex-1"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSummary(null)
                  setShowTranscriptionEditor(true)
                }}
                className="flex-1"
              >
                Editar Seleção
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={generateSummary}
                disabled={generating}
                className="flex-1"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Regenerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Regenerar
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Este resumo foi gerado automaticamente por IA e pode ser editado e salvo no prontuário.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
