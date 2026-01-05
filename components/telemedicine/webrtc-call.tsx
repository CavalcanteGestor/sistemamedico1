'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, Wifi, WifiOff, AlertCircle, MessageSquare, User, Maximize2, Minimize2, Eye } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { ConsultationChat } from './consultation-chat'
import { ConsultationTimer } from './consultation-timer'
import { ConnectionQuality } from './connection-quality'
import { WaitingRoom } from './waiting-room'
import { RecordingControl, RecordingControlRef } from './recording-control'
import { FileShare } from './file-share'
import { ConsultationNotes } from './consultation-notes'
import { DoctorControls } from './doctor-controls'
import { AISummary } from './ai-summary'
import { ConsultationFeedback } from './consultation-feedback'
import { ProntuarioIntegration } from './prontuario-integration'

interface WebRTCCallProps {
  roomId: string
  sessionId?: string
  appointmentId?: string
  patientId?: string
  onEndCall?: () => void
  isDoctor?: boolean
  userName?: string
  doctorName?: string
  appointmentDate?: string
  appointmentTime?: string
  onStartCall?: () => void
  aiSummaryEnabled?: boolean
  transcriptionEnabled?: boolean
}

export function WebRTCCall({
  roomId,
  sessionId,
  appointmentId,
  patientId,
  onEndCall,
  isDoctor = false,
  userName = 'Participante',
  doctorName,
  appointmentDate,
  appointmentTime,
  onStartCall,
  aiSummaryEnabled = false,
  transcriptionEnabled = false,
}: WebRTCCallProps) {
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [screenShared, setScreenShared] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'waiting'>('waiting')
  const [participants, setParticipants] = useState(0)
  const [showChat, setShowChat] = useState(true) // Abrir chat por padrão quando conectar
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [notes, setNotes] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single') // Modo de visualização
  const [backgroundBlur, setBackgroundBlur] = useState(false) // Blur de fundo
  const [showPreview, setShowPreview] = useState(false) // Pré-visualização antes de entrar
  const startTimeRef = useRef<boolean>(false)
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const channelRef = useRef<RTCDataChannel | null>(null)
  const recordingControlRef = useRef<RecordingControlRef | null>(null)
  const autoRecordingStartedRef = useRef(false)
  
  const { toast } = useToast()
  const supabase = createClient()

  // Configuração STUN/TURN (gratuitos e públicos)
  const rtcConfiguration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  }

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Não ativar atalhos se o usuário estiver digitando em um input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key.toLowerCase()) {
        case 'v':
          if (connectionStatus === 'connected') {
            e.preventDefault()
            toggleVideo()
          }
          break
        case 'm':
          if (connectionStatus === 'connected') {
            e.preventDefault()
            toggleAudio()
          }
          break
        case 'e':
          if (connectionStatus === 'connected') {
            e.preventDefault()
            handleEndCall()
          }
          break
        case 's':
          if (connectionStatus === 'connected' && isDoctor) {
            e.preventDefault()
            toggleScreenShare()
          }
          break
        case 'f':
          if (connectionStatus === 'connected') {
            e.preventDefault()
            toggleFullscreen()
          }
          break
        case 'g':
          if (connectionStatus === 'connected') {
            e.preventDefault()
            toggleViewMode()
          }
          break
        case 'b':
          if (connectionStatus === 'connected') {
            e.preventDefault()
            setBackgroundBlur(!backgroundBlur)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [connectionStatus, videoEnabled, audioEnabled, screenShared, isDoctor, backgroundBlur, viewMode])

  useEffect(() => {
    // Conectar ao canal de sinalização sempre que o roomId mudar (para paciente)
    if (roomId && !isDoctor && connectionStatus === 'waiting') {
      setupRealtimeListener()
    }

    // Se for médico, iniciar automaticamente após um pequeno delay
    // O médico não precisa esperar o paciente - pode iniciar a chamada sozinho
    if (isDoctor && connectionStatus === 'waiting' && roomId) {
      // Delay pequeno para garantir que tudo está carregado
      const timer = setTimeout(() => {
        handleStartCall()
      }, 1000)
      
      return () => {
        clearTimeout(timer)
      }
    }

    return () => {
      // Não fazer cleanup completo aqui, apenas se o componente for desmontado
    }
  }, [roomId, isDoctor, connectionStatus])

  // Setup listener para detectar quando médico inicia chamada (para paciente)
  const setupRealtimeListener = useCallback(async () => {
    if (isDoctor) return // Médico não precisa deste listener

    try {
      // Limpar listener anterior se existir
      const existingChannel = (window as any).__telemedicinePatientChannel
      if (existingChannel) {
        existingChannel.unsubscribe()
      }

      // Usar o mesmo canal que será usado na sinalização (para detectar quando médico inicia)
      const channel = supabase.channel(`telemedicine-${roomId}`, {
        config: {
          broadcast: { self: false },
        },
      })

      // Listener para detectar quando médico envia offer
      channel.on('broadcast', { event: 'signal' }, async ({ payload }: any) => {
        const signal = payload
        
        // Se receber um offer e ainda estiver aguardando, iniciar chamada automaticamente
        if (signal.type === 'offer') {
          toast({
            title: 'Médico entrou na consulta',
            description: 'Conectando automaticamente...',
          })
          // Iniciar chamada imediatamente se ainda não iniciou
          if (connectionStatus === 'waiting') {
            setConnectionStatus('connecting')
            await initializeCall()
          }
        }
      })

      await channel.subscribe()

      // Armazenar referência (será substituído pelo canal de sinalização quando inicializar)
      ;(window as any).__telemedicinePatientChannel = channel
    } catch (error) {
      // Erro silencioso ao configurar listener
    }
  }, [roomId, isDoctor, connectionStatus, toast])

  const initializeCall = async () => {
    try {
      setConnectionStatus('connecting')
      
      // 1. Obter acesso à câmera e microfone
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      
      localStreamRef.current = stream
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // 2. Criar conexão peer-to-peer
      const pc = new RTCPeerConnection(rtcConfiguration)
      peerConnectionRef.current = pc

      // 3. Adicionar stream local à conexão
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream)
      })

      // 4. Receber stream remoto (quando paciente conectar)
      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0]
          setParticipants(2) // Agora tem médico + paciente
        }
      }

      // 5. Detectar quando conexão é fechada (médico encerrou)
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'closed' || pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          if (!isDoctor) {
            // Paciente detectou que médico desconectou
            const wasConnected = peerConnectionRef.current?.connectionState === 'connected' || connectionStatus === 'connected'
            if (wasConnected) {
              toast({
                title: 'Médico desconectou',
                description: 'O médico encerrou a consulta. Você será redirecionado em instantes.',
                variant: 'default',
              })
              setConnectionStatus('disconnected')
              cleanup()
              // Chamar onEndCall para notificar a página
              if (onEndCall) {
                setTimeout(() => {
                  onEndCall()
                }, 1000)
              }
            }
          }
        }
      }

      // 6. Detectar quando ICE connection fecha
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'closed' || pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          if (!isDoctor) {
            // Paciente detectou desconexão
            const wasConnected = peerConnectionRef.current?.iceConnectionState === 'connected' || connectionStatus === 'connected'
            if (wasConnected && pc.iceConnectionState === 'closed') {
              toast({
                title: 'Conexão encerrada',
                description: 'A consulta foi encerrada pelo médico.',
                variant: 'default',
              })
              setConnectionStatus('disconnected')
              cleanup()
              // Chamar onEndCall para notificar a página
              if (onEndCall) {
                setTimeout(() => {
                  onEndCall()
                }, 1000)
              }
            }
          }
        }
      }

      // 7. Configurar sinalização via Supabase Realtime
      await setupSignaling(pc)

      // 8. Se for médico, marcar como conectado imediatamente (pode estar sozinho)
      if (isDoctor) {
        // Médico conectado sozinho - não precisa esperar paciente
        setParticipants(1)
        setConnectionStatus('connected')
        if (!startTimeRef.current) {
          startTimeRef.current = true
          const now = new Date()
          setStartTime(now)
          
          // Atualizar status da sessão para 'active' quando médico inicia
          if (sessionId) {
            supabase
              .from('telemedicine_sessions')
              .update({
                status: 'active',
                started_at: now.toISOString(),
              })
              .eq('id', sessionId)
          }
          
          if (onStartCall) {
            onStartCall()
          }
          
          // Iniciar gravação automaticamente se aiSummaryEnabled for true
          if (aiSummaryEnabled && isDoctor && !autoRecordingStartedRef.current) {
            autoRecordingStartedRef.current = true
            // Tentar iniciar a gravação com vários delays para garantir que o componente está montado
            const tryStartRecording = (attempts = 0) => {
              if (recordingControlRef.current) {
                recordingControlRef.current.startRecording().catch(() => {
                  // Erro silencioso - pode ser que ainda não esteja pronto
                })
              } else if (attempts < 5) {
                // Tentar novamente após 1 segundo
                setTimeout(() => tryStartRecording(attempts + 1), 1000)
              }
            }
            // Primeira tentativa após 2 segundos
            setTimeout(() => tryStartRecording(), 2000)
          }
        }
        
        // Criar oferta para quando paciente conectar
        setTimeout(async () => {
          if (pc.signalingState === 'stable') {
            try {
              const offer = await pc.createOffer()
              await pc.setLocalDescription(offer)
              const channel = (window as any).__telemedicineChannel
              if (channel) {
                await sendSignal(channel, 'offer', offer)
              }
            } catch (error) {
              // Erro silencioso ao criar oferta
            }
          }
        }, 1000)
      }
    } catch (error: any) {
      let errorMessage = 'Não foi possível acessar câmera/microfone.'
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Permissão negada. Por favor, permita o acesso à câmera e microfone nas configurações do navegador e tente novamente.'
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'Nenhuma câmera ou microfone encontrado. Verifique se seus dispositivos estão conectados.'
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Não foi possível acessar os dispositivos. Eles podem estar sendo usados por outro aplicativo.'
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        errorMessage = 'As configurações de câmera/microfone não podem ser satisfeitas.'
      } else if (error.message?.includes('Permissions policy')) {
        errorMessage = 'A política de permissões está bloqueando o acesso. Recarregue a página e tente novamente.'
      }
      
      toast({
        title: 'Erro ao iniciar chamada',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      })
      setConnectionStatus('waiting')
    }
  }

  const setupSignaling = async (pc: RTCPeerConnection) => {
    // Usar Supabase Realtime para sinalização WebRTC
    const channel = supabase.channel(`telemedicine-${roomId}`, {
      config: {
        broadcast: { self: false },
      },
    })

    // Handler para receber sinais
    channel.on('broadcast', { event: 'signal' }, async ({ payload }: any) => {
      if (!peerConnectionRef.current) return

      const signal = payload

      try {
        if (signal.type === 'offer' && !isDoctor) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal.data))
          const answer = await peerConnectionRef.current.createAnswer()
          await peerConnectionRef.current.setLocalDescription(answer)
          await sendSignal(channel, 'answer', answer)
        } else if (signal.type === 'answer' && isDoctor) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal.data))
        } else if (signal.type === 'ice-candidate') {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signal.data))
        }
      } catch (error) {
        // Erro silencioso ao processar sinal
      }
    })

    await channel.subscribe()

    // Armazenar referência para cleanup
    ;(window as any).__telemedicineChannel = channel

    // Handler para ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(channel, 'ice-candidate', event.candidate)
      }
    }
  }

  const sendSignal = async (channel: any, type: string, data: any) => {
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'signal',
        payload: {
          type,
          data,
          from: userName,
          timestamp: Date.now(),
        },
      })
    }
  }

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoEnabled
        setVideoEnabled(!videoEnabled)
        toast({
          title: !videoEnabled ? 'Vídeo ligado' : 'Vídeo desligado',
        })
      }
    }
  }

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioEnabled
        setAudioEnabled(!audioEnabled)
        toast({
          title: !audioEnabled ? 'Áudio ligado' : 'Áudio desligado',
        })
      }
    }
  }

  const toggleScreenShare = async () => {
    try {
      if (!screenShared) {
        // Compartilhar tela
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        })

        if (peerConnectionRef.current && localStreamRef.current) {
          const screenTrack = screenStream.getVideoTracks()[0]
          const sender = peerConnectionRef.current.getSenders().find(
            (s) => s.track && s.track.kind === 'video'
          )

          if (sender && screenTrack) {
            await sender.replaceTrack(screenTrack)
          }

          screenTrack.onended = () => {
            toggleScreenShare()
          }

          setScreenShared(true)
          toast({
            title: 'Compartilhamento de tela iniciado',
          })
        }
      } else {
        // Parar compartilhamento e voltar para câmera
        if (localStreamRef.current && peerConnectionRef.current) {
          const cameraTrack = localStreamRef.current.getVideoTracks()[0]
          const sender = peerConnectionRef.current.getSenders().find(
            (s) => s.track && s.track.kind === 'video'
          )

          if (sender && cameraTrack) {
            await sender.replaceTrack(cameraTrack)
          }

          setScreenShared(false)
          toast({
            title: 'Compartilhamento de tela encerrado',
          })
        }
      }
    } catch (error) {
      toast({
        title: 'Erro ao compartilhar tela',
        variant: 'destructive',
      })
    }
  }

  const cleanup = () => {
    // Parar todas as tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
    }

    // Fechar conexão peer
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }

    // Desconectar do canal de sinalização (médico)
    const channel = (window as any).__telemedicineChannel
    if (channel) {
      channel.unsubscribe()
    }

    // Desconectar do canal de listener (paciente)
    const patientChannel = (window as any).__telemedicinePatientChannel
    if (patientChannel) {
      patientChannel.unsubscribe()
    }

    setConnectionStatus('disconnected')
  }

  // Função para entrar/sair do fullscreen
  const toggleFullscreen = async () => {
    if (!videoContainerRef.current) return

    try {
      if (!isFullscreen) {
        if (videoContainerRef.current.requestFullscreen) {
          await videoContainerRef.current.requestFullscreen()
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        }
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível alternar o modo tela cheia.',
        variant: 'destructive',
      })
    }
  }

  // Listener para detectar mudanças no fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Função para alternar modo de visualização (single/grid)
  const toggleViewMode = () => {
    setViewMode(viewMode === 'single' ? 'grid' : 'single')
  }

  // Função para aplicar blur de fundo (usando Canvas API ou filtros CSS)
  useEffect(() => {
    if (backgroundBlur && localVideoRef.current && localStreamRef.current) {
      // Aplicar filtro CSS blur (simples)
      if (localVideoRef.current) {
        localVideoRef.current.style.filter = 'blur(10px)'
      }
    } else if (localVideoRef.current) {
      localVideoRef.current.style.filter = ''
    }
  }, [backgroundBlur])

  // Função para pré-visualizar antes de entrar
  const startPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      
      setShowPreview(true)
    } catch (error: any) {
      toast({
        title: 'Erro ao acessar câmera/microfone',
        description: error.message || 'Não foi possível acessar seus dispositivos.',
        variant: 'destructive',
      })
    }
  }

  const handleEndCall = () => {
    cleanup()
    if (onEndCall) {
      onEndCall()
    }
  }

  const getConnectionStatusBadge = () => {
    switch (connectionStatus) {
      case 'waiting':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600">Aguardando...</Badge>
      case 'connecting':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">Conectando...</Badge>
      case 'connected':
        return <Badge variant="default" className="bg-green-500">Conectado ({participants} participantes)</Badge>
      case 'disconnected':
        return <Badge variant="destructive">Desconectado</Badge>
      default:
        return null
    }
  }

  const handleStartCall = async () => {
    if (connectionStatus === 'waiting') {
      setConnectionStatus('connecting')
      try {
        await initializeCall()
      } catch (error) {
        toast({
          title: 'Erro ao iniciar chamada',
          description: 'Não foi possível iniciar a chamada. Verifique as permissões de câmera e microfone.',
          variant: 'destructive',
        })
        setConnectionStatus('waiting')
      }
    }
  }

  // Mostrar pré-visualização se solicitada
  if (showPreview) {
    return (
      <Card className="w-full border-2 border-primary/20 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Pré-visualização
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Verifique sua câmera e microfone antes de entrar na consulta
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '16/9', minHeight: '400px' }}>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {!videoEnabled && (
              <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                <VideoOff className="h-16 w-16 text-white" />
              </div>
            )}
            <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
              {userName}
            </div>
            {backgroundBlur && (
              <div className="absolute top-4 right-4 bg-blue-500/90 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                Blur Ativado
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button
                variant={videoEnabled ? 'default' : 'destructive'}
                onClick={toggleVideo}
                size="lg"
              >
                {videoEnabled ? <Video className="h-5 w-5 mr-2" /> : <VideoOff className="h-5 w-5 mr-2" />}
                {videoEnabled ? 'Câmera Ligada' : 'Câmera Desligada'}
              </Button>
              
              <Button
                variant={audioEnabled ? 'default' : 'destructive'}
                onClick={toggleAudio}
                size="lg"
              >
                {audioEnabled ? <Mic className="h-5 w-5 mr-2" /> : <MicOff className="h-5 w-5 mr-2" />}
                {audioEnabled ? 'Microfone Ligado' : 'Microfone Desligado'}
              </Button>
              
              <Button
                variant={backgroundBlur ? 'default' : 'outline'}
                onClick={() => setBackgroundBlur(!backgroundBlur)}
                size="lg"
              >
                <Eye className="h-5 w-5 mr-2" />
                {backgroundBlur ? 'Desativar Blur' : 'Ativar Blur'}
              </Button>
            </div>
            
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPreview(false)
                  if (localStreamRef.current) {
                    localStreamRef.current.getTracks().forEach(track => track.stop())
                  }
                }}
                size="lg"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  setShowPreview(false)
                  handleStartCall()
                }}
                size="lg"
                className="min-w-[200px]"
              >
                <Video className="h-5 w-5 mr-2" />
                Entrar na Consulta
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Mostrar sala de espera se estiver aguardando (paciente)
  if (connectionStatus === 'waiting' && !isDoctor && !showPreview) {
    return (
      <WaitingRoom
        doctorName={doctorName}
        appointmentDate={appointmentDate}
        appointmentTime={appointmentTime}
        isDoctor={false}
        onEnter={startPreview}
      />
    )
  }

  return (
    <div className="space-y-6">
      <Card className="w-full border-2 border-primary/20 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Consulta de Telemedicina
              </CardTitle>
              {appointmentDate && appointmentTime && (
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(appointmentDate).toLocaleDateString('pt-BR')} às {appointmentTime}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {connectionStatus === 'connected' ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">Online</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/30 rounded-full">
                  <WifiOff className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Conectando...</span>
                </div>
              )}
              {getConnectionStatusBadge()}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-0">
        {/* Layout melhorado: vídeo remoto grande, local pequeno */}
        <div ref={videoContainerRef} className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg overflow-hidden shadow-2xl" style={{ aspectRatio: '16/9', minHeight: '500px' }}>
          {/* Vídeo Remoto (Principal) */}
          {connectionStatus === 'connecting' ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-white">
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-20 w-20 border-4 border-primary/30 border-t-primary"></div>
                  </div>
                  <Video className="h-10 w-10 text-primary mx-auto relative z-10" />
                </div>
                <p className="text-xl font-semibold mb-2">Conectando...</p>
                <p className="text-sm text-gray-300">Aguardando participante entrar na consulta</p>
                <div className="flex gap-1 justify-center mt-4">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          ) : connectionStatus === 'connected' ? (
            viewMode === 'grid' ? (
              /* Grid View - Vídeos lado a lado */
              <div className="grid grid-cols-2 gap-2 p-2 h-full">
                <div className="relative rounded-lg overflow-hidden bg-black">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {!remoteVideoRef.current?.srcObject && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                      <User className="h-12 w-12 text-primary" />
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                    {isDoctor ? 'Paciente' : doctorName || 'Participante'}
                  </div>
                </div>
                <div className="relative rounded-lg overflow-hidden bg-black border-2 border-primary/50">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {!videoEnabled && (
                    <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                      <VideoOff className="h-8 w-8 text-white" />
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                    {userName} {isDoctor && '(Você)'}
                  </div>
                  {!audioEnabled && (
                    <div className="absolute top-2 right-2 bg-red-500/90 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                      <MicOff className="h-3 w-3" />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Single View - Vídeo remoto grande, local pequeno */
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {/* Overlay com informações quando não há vídeo remoto */}
                {!remoteVideoRef.current?.srcObject && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-center text-white">
                      <User className="h-16 w-16 mx-auto mb-4 text-primary" />
                      <p className="text-lg font-medium">Aguardando vídeo...</p>
                    </div>
                  </div>
                )}
              </>
            )
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-white">
                <div className="mx-auto w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mb-6">
                  <Video className="h-12 w-12 text-primary" />
                </div>
                <p className="text-xl font-semibold mb-2">Pronto para iniciar</p>
                <p className="text-sm text-gray-300 mb-6">
                  {isDoctor 
                    ? 'Clique no botão abaixo para iniciar a consulta' 
                    : 'Aguardando médico iniciar a consulta...'}
                </p>
                {isDoctor && (
                  <Button 
                    size="lg" 
                    onClick={handleStartCall}
                    className="bg-primary hover:bg-primary/90 text-white shadow-lg"
                  >
                    <Video className="h-5 w-5 mr-2" />
                    Iniciar Consulta
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Vídeo Local (Pequeno, canto inferior direito) - Melhorado */}
          {connectionStatus === 'connected' && (
            <div className="absolute bottom-20 right-6 w-56 h-40 bg-black/90 backdrop-blur-sm rounded-xl overflow-hidden border-2 border-primary/50 shadow-2xl transition-all hover:scale-105 hover:border-primary">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {!videoEnabled && (
                <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                  <VideoOff className="h-8 w-8 text-white" />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <div className="flex items-center justify-between">
                  <span className="text-white text-xs font-medium truncate">{userName}</span>
                  {!audioEnabled && (
                    <MicOff className="h-3 w-3 text-red-400" />
                  )}
                </div>
              </div>
              {isRecording && (
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500/90 text-white px-2 py-1 rounded-full text-xs">
                  <div className="h-2 w-2 bg-white rounded-full animate-pulse"></div>
                  <span>Gravando</span>
                </div>
              )}
            </div>
          )}

          {/* Controles melhorados - Barra flutuante dentro do vídeo */}
          {connectionStatus === 'connected' && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/80 to-transparent p-6">
          <div className="flex items-center justify-center gap-3 flex-wrap max-w-4xl mx-auto">
            <Button
              variant={videoEnabled ? 'default' : 'destructive'}
              size="lg"
              onClick={toggleVideo}
              title={videoEnabled ? 'Desligar câmera (V)' : 'Ligar câmera (V)'}
              className="min-w-[130px] h-12 shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              {videoEnabled ? (
                <Video className="h-5 w-5 mr-2" />
              ) : (
                <VideoOff className="h-5 w-5 mr-2" />
              )}
              {videoEnabled ? 'Câmera' : 'Sem Câmera'}
            </Button>

            <Button
              variant={audioEnabled ? 'default' : 'destructive'}
              size="lg"
              onClick={toggleAudio}
              title={audioEnabled ? 'Desligar microfone (M)' : 'Ligar microfone (M)'}
              className="min-w-[130px] h-12 shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              {audioEnabled ? (
                <Mic className="h-5 w-5 mr-2" />
              ) : (
                <MicOff className="h-5 w-5 mr-2" />
              )}
              {audioEnabled ? 'Microfone' : 'Mudo'}
            </Button>

            {isDoctor && (
              <Button
                variant={screenShared ? 'default' : 'outline'}
                size="lg"
                onClick={toggleScreenShare}
                title="Compartilhar tela (S)"
                className="min-w-[140px] h-12 shadow-lg hover:shadow-xl transition-all hover:scale-105 border-primary/50 hover:border-primary"
              >
                <Monitor className="h-5 w-5 mr-2" />
                {screenShared ? 'Parar' : 'Compartilhar'}
              </Button>
            )}

            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="lg"
              onClick={toggleViewMode}
              title="Alternar visualização (G)"
              className="min-w-[130px] h-12 shadow-lg hover:shadow-xl transition-all hover:scale-105 border-primary/50 hover:border-primary"
            >
              {viewMode === 'grid' ? (
                <>
                  <Video className="h-5 w-5 mr-2" />
                  Vista Simples
                </>
              ) : (
                <>
                  <Monitor className="h-5 w-5 mr-2" />
                  Vista Grid
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={toggleFullscreen}
              title="Tela cheia (F)"
              className="min-w-[120px] h-12 shadow-lg hover:shadow-xl transition-all hover:scale-105 border-primary/50 hover:border-primary"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-5 w-5 mr-2" />
                  Sair
                </>
              ) : (
                <>
                  <Maximize2 className="h-5 w-5 mr-2" />
                  Tela Cheia
                </>
              )}
            </Button>

            <Button
              variant={backgroundBlur ? 'default' : 'outline'}
              size="lg"
              onClick={() => setBackgroundBlur(!backgroundBlur)}
              title="Blur de fundo (B)"
              className="min-w-[120px] h-12 shadow-lg hover:shadow-xl transition-all hover:scale-105 border-primary/50 hover:border-primary"
            >
              <Eye className="h-5 w-5 mr-2" />
              Blur
            </Button>

            <Button 
              variant="destructive" 
              size="lg" 
              onClick={handleEndCall} 
              title="Encerrar chamada (E)"
              className="min-w-[140px] h-12 shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <PhoneOff className="h-5 w-5 mr-2" />
              Encerrar
            </Button>
          </div>
              <p className="text-xs text-white/60 text-center mt-3">
                Atalhos: <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">V</kbd> Câmera | 
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs mx-1">M</kbd> Microfone | 
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs mx-1">F</kbd> Tela Cheia | 
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs mx-1">G</kbd> Grid | 
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs mx-1">B</kbd> Blur | 
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs mx-1">E</kbd> Encerrar
              </p>
            </div>
          )}
        </div>

        {/* Informações adicionais abaixo do vídeo */}
        {connectionStatus === 'connected' && (
          <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-full">
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Conexão Estabelecida</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <span className="font-medium">Participantes: <span className="text-primary">{participants}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Sala: <span className="text-primary font-mono">{roomId.substring(0, 20)}...</span></span>
              </div>
            </div>
          </div>
        )}

        </CardContent>
      </Card>

      {/* Painel Lateral com todas as funcionalidades */}
      {connectionStatus === 'connected' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Coluna Esquerda: Informações e Controles */}
          <div className="lg:col-span-3 space-y-4">
            {/* Timer e Qualidade */}
            <Card className="border-2 border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent border-b">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <div className="h-2 w-2 bg-primary rounded-full animate-pulse"></div>
                  Informações da Consulta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {startTime && (
                  <div className="p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                    <p className="text-xs text-muted-foreground mb-2 font-semibold">Duração</p>
                    <ConsultationTimer startTime={startTime} />
                  </div>
                )}
                <div className="p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-2 font-semibold">Qualidade da Conexão</p>
                  <ConnectionQuality peerConnection={peerConnectionRef.current} />
                </div>
              </CardContent>
            </Card>

            {/* Gravação */}
            {sessionId && (
              <RecordingControl
                ref={recordingControlRef}
                sessionId={sessionId}
                isDoctor={isDoctor}
                peerConnection={peerConnectionRef.current}
                localStream={localStreamRef.current}
                remoteStream={remoteVideoRef.current?.srcObject as MediaStream || null}
                onRecordingChange={setIsRecording}
                autoStart={aiSummaryEnabled}
                hideControls={aiSummaryEnabled}
              />
            )}

            {/* Controles do Médico */}
            {isDoctor && (
              <DoctorControls
                isDoctor={isDoctor}
                peerConnection={peerConnectionRef.current}
              />
            )}

            {/* Prontuário */}
            {sessionId && appointmentId && (
              <ProntuarioIntegration
                sessionId={sessionId}
                appointmentId={appointmentId}
                patientId={patientId}
                isDoctor={isDoctor}
                notes={notes}
              />
            )}
          </div>

          {/* Coluna Central: Chat e Arquivos */}
          <div className="lg:col-span-6 space-y-4">
            {/* Chat - Só renderizar se sessionId existir e conexão estiver estabelecida */}
            {sessionId && connectionStatus === 'connected' && (
              <ConsultationChat
                sessionId={sessionId}
                userName={userName}
                isDoctor={isDoctor}
              />
            )}

            {/* Compartilhamento de Arquivos - Só renderizar se sessionId existir e conexão estiver estabelecida */}
            {sessionId && connectionStatus === 'connected' && (
              <FileShare
                sessionId={sessionId}
                isDoctor={isDoctor}
              />
            )}
          </div>

          {/* Coluna Direita: Anotações, IA e Feedback */}
          <div className="lg:col-span-3 space-y-4">
            {/* Anotações */}
            {sessionId && (
              <ConsultationNotes
                sessionId={sessionId}
                isDoctor={isDoctor}
                appointmentId={appointmentId}
              />
            )}

            {/* Resumo com IA - Só mostrar se estiver habilitado */}
            {sessionId && isDoctor && startTime && aiSummaryEnabled && (
              <AISummary
                sessionId={sessionId}
                appointmentId={appointmentId}
                isDoctor={isDoctor}
                duration={startTime ? Math.floor((Date.now() - startTime.getTime()) / 1000) : 0}
                localStream={localStreamRef.current}
                remoteStream={remoteVideoRef.current?.srcObject as MediaStream || null}
                autoTranscribe={aiSummaryEnabled}
                hideTranscribeButton={aiSummaryEnabled}
                isRecording={isRecording}
                onRecordingStop={() => {
                  // Quando a gravação parar, iniciar transcrição automaticamente
                  if (aiSummaryEnabled) {
                    // A transcrição será iniciada automaticamente pelo AISummary
                  }
                }}
              />
            )}

            {/* Feedback (após consulta) */}
            {sessionId && (
              <ConsultationFeedback
                sessionId={sessionId}
                isDoctor={isDoctor}
              />
            )}
          </div>
        </div>
      )}

      {/* Botão para iniciar se estiver aguardando (médico) */}
      {connectionStatus === 'waiting' && isDoctor && (
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Pronto para iniciar a consulta?</h3>
              <p className="text-muted-foreground">
                Clique no botão abaixo para iniciar a chamada de vídeo. O paciente será notificado automaticamente.
              </p>
            </div>
            <Button size="lg" onClick={handleStartCall} className="mt-4">
              Iniciar Consulta de Telemedicina
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

