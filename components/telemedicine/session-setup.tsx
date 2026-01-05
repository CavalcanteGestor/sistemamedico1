'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Video, VideoOff, Mic, MicOff, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { AIConsent } from './ai-consent'

interface SessionSetupProps {
  onComplete: (config: {
    aiSummaryEnabled: boolean
    aiSummaryPrompt?: string
    transcriptionEnabled: boolean
    aiConsentGiven?: boolean
  }) => void
  onCancel?: () => void
  userName?: string
  isDoctor?: boolean
}

export function SessionSetup({ onComplete, onCancel, userName, isDoctor = true }: SessionSetupProps) {
  const [aiSummaryEnabled, setAiSummaryEnabled] = useState(false)
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(false)
  const [aiSummaryPrompt, setAiSummaryPrompt] = useState('')
  const [videoWorking, setVideoWorking] = useState<boolean | null>(null)
  const [audioWorking, setAudioWorking] = useState<boolean | null>(null)
  const [testing, setTesting] = useState(false)
  const [showAIConsent, setShowAIConsent] = useState(false)
  const [aiConsentGiven, setAiConsentGiven] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Limpar stream ao desmontar
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const testMediaDevices = async () => {
    setTesting(true)
    let videoOk = false
    let audioOk = false

    try {
      // Solicitar acesso a câmera e microfone
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      streamRef.current = stream

      // Testar vídeo
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        const videoTrack = stream.getVideoTracks()[0]
        if (videoTrack && videoTrack.readyState === 'live') {
          videoOk = true
          setVideoWorking(true)
        } else {
          setVideoWorking(false)
        }
      }

      // Testar áudio
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack && audioTrack.readyState === 'live') {
        audioOk = true
        setAudioWorking(true)
      } else {
        setAudioWorking(false)
      }

      if (videoOk && audioOk) {
        toast({
          title: 'Teste concluído',
          description: 'Câmera e microfone estão funcionando corretamente.',
        })
      } else {
        toast({
          title: 'Atenção',
          description: 'Alguns dispositivos não estão funcionando. Verifique as permissões.',
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast({
          title: 'Permissão negada',
          description: 'Por favor, permita o acesso à câmera e microfone.',
          variant: 'destructive',
        })
      } else if (error.name === 'NotFoundError') {
        toast({
          title: 'Dispositivos não encontrados',
          description: 'Não foram encontrados câmera ou microfone no dispositivo.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Erro ao testar dispositivos',
          description: error.message || 'Não foi possível acessar os dispositivos.',
          variant: 'destructive',
        })
      }
      setVideoWorking(false)
      setAudioWorking(false)
    } finally {
      setTesting(false)
    }
  }

  const stopTest = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setVideoWorking(null)
    setAudioWorking(null)
  }

  const handleContinue = () => {
    if (aiSummaryEnabled && !transcriptionEnabled) {
      toast({
        title: 'Transcrição necessária',
        description: 'Para gerar resumo com IA, é necessário habilitar a transcrição.',
        variant: 'destructive',
      })
      return
    }

    // Se IA ou transcrição estiverem habilitadas, mostrar termo de consentimento primeiro
    if ((aiSummaryEnabled || transcriptionEnabled) && !aiConsentGiven) {
      setShowAIConsent(true)
      return
    }

    // Se já aceitou ou não precisa de IA/transcrição, continuar normalmente
    onComplete({
      aiSummaryEnabled,
      aiSummaryPrompt: aiSummaryEnabled ? aiSummaryPrompt.trim() : undefined,
      transcriptionEnabled,
      aiConsentGiven: (aiSummaryEnabled || transcriptionEnabled) ? aiConsentGiven : false,
    })
  }

  const handleAIConsentAccept = () => {
    setAiConsentGiven(true)
    setShowAIConsent(false)
    // Continuar com a configuração após aceitar
    onComplete({
      aiSummaryEnabled,
      aiSummaryPrompt: aiSummaryPrompt.trim() || undefined,
      transcriptionEnabled,
      aiConsentGiven: true,
    })
  }

  const handleAIConsentDecline = () => {
    toast({
      title: 'IA desabilitada',
      description: 'O resumo com IA foi desabilitado. A consulta continuará sem recursos de IA.',
      variant: 'default',
    })
    setAiSummaryEnabled(false)
    setTranscriptionEnabled(false)
    setAiSummaryPrompt('')
    setAiConsentGiven(false)
    setShowAIConsent(false)
    
    // Continuar sem IA
    onComplete({
      aiSummaryEnabled: false,
      transcriptionEnabled: false,
      aiConsentGiven: false,
    })
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Configuração da Consulta</CardTitle>
          <CardDescription>
            Configure as opções antes de iniciar a consulta de telemedicina
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Teste de Câmera e Microfone */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Teste de Dispositivos</h3>
                <p className="text-sm text-muted-foreground">
                  Verifique se a câmera e o microfone estão funcionando corretamente
                </p>
              </div>
              <div className="flex gap-2">
                {videoWorking !== null && (
                  <Button variant="outline" onClick={stopTest}>
                    Parar Teste
                  </Button>
                )}
                <Button onClick={testMediaDevices} disabled={testing}>
                  {testing ? 'Testando...' : 'Testar Dispositivos'}
                </Button>
              </div>
            </div>

            {/* Preview de Vídeo */}
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', minHeight: '200px' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {videoWorking === null && (
                <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Clique em "Testar Dispositivos" para verificar</p>
                  </div>
                </div>
              )}
            </div>

            {/* Status dos Dispositivos */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 p-3 border rounded-lg">
                {videoWorking === true ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium">Câmera OK</span>
                  </>
                ) : videoWorking === false ? (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="text-sm font-medium">Câmera com problema</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-gray-400" />
                    <span className="text-sm font-medium">Câmera não testada</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 p-3 border rounded-lg">
                {audioWorking === true ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium">Microfone OK</span>
                  </>
                ) : audioWorking === false ? (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="text-sm font-medium">Microfone com problema</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-gray-400" />
                    <span className="text-sm font-medium">Microfone não testado</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="border-t pt-6 space-y-6">
            {/* Opção de Transcrição */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="transcription"
                checked={transcriptionEnabled}
                onCheckedChange={(checked) => setTranscriptionEnabled(checked as boolean)}
                className="mt-1"
              />
              <div className="flex-1 space-y-1">
                <Label htmlFor="transcription" className="text-base font-semibold cursor-pointer">
                  Habilitar Transcrição da Conversa
                </Label>
                <p className="text-sm text-muted-foreground">
                  A conversa será transcrita automaticamente durante a consulta. Necessário para gerar resumo com IA.
                </p>
              </div>
            </div>

            {/* Opção de Resumo com IA */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="ai-summary"
                checked={aiSummaryEnabled}
                onCheckedChange={(checked) => {
                  setAiSummaryEnabled(checked as boolean)
                  if (!checked) {
                    setAiSummaryPrompt('')
                  } else if (!transcriptionEnabled) {
                    setTranscriptionEnabled(true)
                  }
                }}
                className="mt-1"
                disabled={!transcriptionEnabled}
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="ai-summary" className="text-base font-semibold cursor-pointer">
                    Gerar Resumo com IA
                  </Label>
                  {!transcriptionEnabled && (
                    <Badge variant="secondary" className="text-xs">
                      Requer transcrição
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Um resumo profissional da consulta será gerado automaticamente usando Inteligência Artificial.
                </p>

                {/* Prompt Personalizado */}
                {aiSummaryEnabled && (
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="ai-prompt" className="text-sm font-medium">
                      Prompt Personalizado para a IA (opcional)
                    </Label>
                    <Textarea
                      id="ai-prompt"
                      placeholder="Ex: Foque em sintomas respiratórios e medicações prescritas. Inclua observações sobre o estado geral do paciente..."
                      value={aiSummaryPrompt}
                      onChange={(e) => setAiSummaryPrompt(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      Instruções adicionais para orientar a IA na geração do resumo. Se deixado em branco, será usado o prompt padrão.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button onClick={handleContinue} size="lg">
              Iniciar Consulta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

