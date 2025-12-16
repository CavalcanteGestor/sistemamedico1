'use client'

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Circle, Square, Download, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface RecordingControlProps {
  sessionId: string
  isDoctor: boolean
  peerConnection: RTCPeerConnection | null
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  onRecordingChange?: (isRecording: boolean) => void
  autoStart?: boolean
  hideControls?: boolean
}

export interface RecordingControlRef {
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
}

export const RecordingControl = forwardRef<RecordingControlRef, RecordingControlProps>(({
  sessionId,
  isDoctor,
  peerConnection,
  localStream,
  remoteStream,
  onRecordingChange,
  autoStart = false,
  hideControls = false,
}, ref) => {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingPermission, setRecordingPermission] = useState<boolean | null>(null)
  const [showPermissionDialog, setShowPermissionDialog] = useState(false)
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Gravações separadas para diarização precisa
  const doctorRecorderRef = useRef<MediaRecorder | null>(null)
  const patientRecorderRef = useRef<MediaRecorder | null>(null)
  const doctorChunksRef = useRef<Blob[]>([])
  const patientChunksRef = useRef<Blob[]>([])
  
  const supabase = createClient()
  const { toast } = useToast()

  // Expor métodos para o componente pai
  useImperativeHandle(ref, () => ({
    startRecording: async () => {
      await startRecording()
    },
    stopRecording: async () => {
      await stopRecording()
    },
  }))

  useEffect(() => {
    // Carregar estado da gravação
    loadRecordingStatus()
  }, [sessionId])

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      // Limpar gravações separadas
      if (doctorRecorderRef.current && doctorRecorderRef.current.state !== 'inactive') {
        doctorRecorderRef.current.stop()
      }
      if (patientRecorderRef.current && patientRecorderRef.current.state !== 'inactive') {
        patientRecorderRef.current.stop()
      }
    }
  }, [])

  const loadRecordingStatus = async () => {
    try {
      const { data: sessionData } = await supabase
        .from('telemedicine_sessions')
        .select('recording_enabled, recording_permission_given, recording_url')
        .eq('id', sessionId)
        .maybeSingle()

      if (sessionData) {
        setRecordingPermission(sessionData.recording_permission_given || false)
        if (sessionData.recording_enabled && sessionData.recording_url) {
          setRecordingUrl(sessionData.recording_url)
        }
      }
    } catch (error) {
      // Erro silencioso - sessão pode não estar carregada ainda
    }
  }

  const requestPermission = async () => {
    setShowPermissionDialog(false)
    
    // Atualizar no banco
    const { error } = await supabase
      .from('telemedicine_sessions')
      .update({ recording_permission_given: true })
      .eq('id', sessionId)

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a permissão.',
        variant: 'destructive',
      })
      return
    }

    setRecordingPermission(true)
    toast({
      title: 'Permissão concedida',
      description: 'Você pode iniciar a gravação agora.',
    })
  }

  const startRecording = async () => {
    if (!recordingPermission && !isDoctor) {
      setShowPermissionDialog(true)
      return
    }

    if (!peerConnection || !localStream) {
      toast({
        title: 'Erro',
        description: 'Conexão não está pronta para gravar.',
        variant: 'destructive',
      })
      return
    }

    try {
      // Se for gravação automática (com resumo), gravar apenas áudio
      // Caso contrário, gravar vídeo + áudio
      const audioOnly = hideControls
      
      // Criar stream combinado (local + remoto)
      const streamToRecord = new MediaStream()
      
      // Adicionar áudio local
      localStream.getAudioTracks().forEach(track => {
        // Clonar track local para poder identificar como "médico"
        const clonedTrack = track.clone()
        // Adicionar metadata para identificar como médico
        ;(clonedTrack as any).source = 'local'
        streamToRecord.addTrack(clonedTrack)
      })

      // Adicionar vídeo local apenas se não for gravação automática
      if (!audioOnly) {
        localStream.getVideoTracks().forEach(track => streamToRecord.addTrack(track))
      }

      // Adicionar áudio remoto se disponível (para capturar voz do paciente)
      if (remoteStream) {
        remoteStream.getAudioTracks().forEach(track => {
          const clonedTrack = track.clone()
          // Adicionar metadata para identificar como paciente
          ;(clonedTrack as any).source = 'remote'
          streamToRecord.addTrack(clonedTrack)
        })
        // Adicionar vídeo remoto apenas se não for gravação automática
        if (!audioOnly) {
          remoteStream.getVideoTracks().forEach(track => streamToRecord.addTrack(track.clone()))
        }
      }

      if (streamToRecord.getTracks().length === 0) {
        throw new Error('Nenhum stream disponível para gravar')
      }

      // Usar codec de áudio se for gravação automática, senão usar vídeo
      const options: MediaRecorderOptions = audioOnly
        ? { mimeType: 'audio/webm' }
        : { mimeType: 'video/webm;codecs=vp9' }

      // Tentar outros codecs se necessário
      if (!audioOnly) {
        if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
          options.mimeType = 'video/webm;codecs=vp8'
          if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
            options.mimeType = 'video/webm'
          }
        }
      } else {
        // Para áudio, tentar outros formatos se webm não estiver disponível
        if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
          options.mimeType = 'audio/ogg;codecs=opus'
          if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
            options.mimeType = 'audio/webm;codecs=opus'
          }
        }
      }

      const mediaRecorder = new MediaRecorder(streamToRecord, options)
      mediaRecorderRef.current = mediaRecorder
      recordedChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const blobType = audioOnly ? 'audio/webm' : 'video/webm'
        const blob = new Blob(recordedChunksRef.current, { type: blobType })
        await uploadRecording(blob)
        setIsRecording(false)
        setRecordingTime(0)
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current)
        }
        if (onRecordingChange) {
          onRecordingChange(false)
        }
      }

      mediaRecorder.start(1000) // Coletar dados a cada segundo

      // ESTRATÉGIA 1: Gravação separada - Áudio do médico e paciente separados para diarização precisa
      // Isso permite identificar automaticamente quem está falando baseado no stream
      if (localStream && isDoctor) {
        const doctorAudioStream = new MediaStream()
        localStream.getAudioTracks().forEach(track => {
          if (track.kind === 'audio' && track.readyState === 'live') {
            doctorAudioStream.addTrack(track.clone())
          }
        })

        if (doctorAudioStream.getAudioTracks().length > 0 && MediaRecorder.isTypeSupported('audio/webm')) {
          const doctorRecorder = new MediaRecorder(doctorAudioStream, {
            mimeType: 'audio/webm',
          })
          doctorRecorderRef.current = doctorRecorder
          doctorChunksRef.current = []

          doctorRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              doctorChunksRef.current.push(event.data)
            }
          }

          doctorRecorder.start(1000)
        }
      }

      if (remoteStream && isDoctor) {
        const patientAudioStream = new MediaStream()
        remoteStream.getAudioTracks().forEach(track => {
          if (track.kind === 'audio' && track.readyState === 'live') {
            patientAudioStream.addTrack(track.clone())
          }
        })

        if (patientAudioStream.getAudioTracks().length > 0 && MediaRecorder.isTypeSupported('audio/webm')) {
          const patientRecorder = new MediaRecorder(patientAudioStream, {
            mimeType: 'audio/webm',
          })
          patientRecorderRef.current = patientRecorder
          patientChunksRef.current = []

          patientRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              patientChunksRef.current.push(event.data)
            }
          }

          patientRecorder.start(1000)
        }
      }

      setIsRecording(true)
      if (onRecordingChange) {
        onRecordingChange(true)
      }

      // Atualizar no banco
      try {
        await supabase
          .from('telemedicine_sessions')
          .update({
            recording_enabled: true,
            recording_started_at: new Date().toISOString(),
          })
          .eq('id', sessionId)
      } catch (error) {
        // Erro silencioso - campo pode não existir ainda
        // Tentar sem recording_started_at
        await supabase
          .from('telemedicine_sessions')
          .update({
            recording_enabled: true,
          })
          .eq('id', sessionId)
      }

      // Timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)

      toast({
        title: 'Gravação iniciada',
        description: 'A consulta está sendo gravada.',
      })
    } catch (error: any) {
      // Erro silencioso
      toast({
        title: 'Erro ao gravar',
        description: error.message || 'Não foi possível iniciar a gravação.',
        variant: 'destructive',
      })
    }
  }

  const stopRecording = async () => {
    // Parar gravação combinada
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    // Parar gravações separadas (para diarização)
    if (doctorRecorderRef.current && doctorRecorderRef.current.state !== 'inactive') {
      doctorRecorderRef.current.stop()
    }
    if (patientRecorderRef.current && patientRecorderRef.current.state !== 'inactive') {
      patientRecorderRef.current.stop()
    }

    // Aguardar que os blobs sejam finalizados
    await new Promise(resolve => setTimeout(resolve, 500))

    // Fazer upload das gravações separadas se existirem (para diarização precisa)
    if (isDoctor && doctorChunksRef.current.length > 0 && patientChunksRef.current.length > 0) {
      try {
        const doctorBlob = new Blob(doctorChunksRef.current, { type: 'audio/webm' })
        const patientBlob = new Blob(patientChunksRef.current, { type: 'audio/webm' })

        // Salvar blobs separados temporariamente (podem ser usados para transcrição separada)
        // Por enquanto, apenas armazenar para uso posterior na transcrição
        ;(window as any).__telemedicineDoctorAudio = doctorBlob
        ;(window as any).__telemedicinePatientAudio = patientBlob

        toast({
          title: 'Gravações separadas prontas',
          description: 'Áudios do médico e paciente gravados separadamente para transcrição precisa.',
        })
      } catch (error) {
        // Erro silencioso
      }
    }

    try {
      await supabase
        .from('telemedicine_sessions')
        .update({
          recording_enabled: false,
          recording_ended_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
    } catch (error) {
      // Erro silencioso - campo pode não existir ainda
      // Tentar sem recording_ended_at
      await supabase
        .from('telemedicine_sessions')
        .update({
          recording_enabled: false,
        })
        .eq('id', sessionId)
    }
  }

  const uploadRecording = async (blob: Blob) => {
    try {
      const formData = new FormData()
      // Determinar extensão baseado no tipo do blob
      const isAudio = blob.type.startsWith('audio/')
      const extension = isAudio ? 'webm' : 'webm'
      const fileName = `recording-${sessionId}-${Date.now()}.${extension}`
      formData.append('file', blob, fileName)
      formData.append('bucket', 'medical-records')
      formData.append('folder', 'telemedicine-recordings')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Erro ao fazer upload da gravação')
      }

      const { url, path } = await response.json()

      // Atualizar sessão com URL da gravação
      await supabase
        .from('telemedicine_sessions')
        .update({
          recording_url: url,
          recording_file_path: path,
        })
        .eq('id', sessionId)

      setRecordingUrl(url)
      toast({
        title: 'Gravação salva',
        description: 'A gravação foi salva com sucesso.',
      })
    } catch (error: any) {
      // Erro silencioso
      toast({
        title: 'Erro ao salvar gravação',
        description: error.message || 'Não foi possível salvar a gravação.',
        variant: 'destructive',
      })
    }
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return [h, m, s].map((v) => v.toString().padStart(2, '0')).join(':')
  }

  if (!isDoctor && !recordingPermission) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Gravação</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPermissionDialog(true)}
            className="w-full"
          >
            Permitir Gravação
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Gravação da Consulta</CardTitle>
            {isRecording && (
              <Badge variant="destructive" className="animate-pulse">
                <Circle className="h-3 w-3 mr-1 fill-red-500" />
                Gravando
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isRecording && (
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-destructive">
                {formatTime(recordingTime)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Tempo de gravação</p>
            </div>
          )}

          {!hideControls && isDoctor ? (
            <div className="flex gap-2">
              {!isRecording ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={startRecording}
                  className="flex-1"
                  disabled={!recordingPermission && !isDoctor}
                >
                  <Circle className="h-4 w-4 mr-2 fill-red-500" />
                  Iniciar Gravação
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopRecording}
                  className="flex-1"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Parar Gravação
                </Button>
              )}
            </div>
          ) : hideControls && isDoctor ? (
            <div className="text-xs text-muted-foreground text-center">
              {isRecording ? (
                <div className="flex items-center justify-center gap-2">
                  <Circle className="h-3 w-3 fill-red-500 animate-pulse" />
                  <span>Gravação automática em andamento</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Gravação automática ativada</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground text-center">
              {recordingPermission ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Gravação permitida</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span>Aguardando permissão</span>
                </div>
              )}
            </div>
          )}

          {recordingUrl && (
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(recordingUrl, '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                Ver Gravação
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Permissão para Gravar</DialogTitle>
            <DialogDescription>
              O médico gostaria de gravar esta consulta. Você permite?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissionDialog(false)}>
              Recusar
            </Button>
            <Button onClick={requestPermission}>
              Permitir Gravação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
})

RecordingControl.displayName = 'RecordingControl'

