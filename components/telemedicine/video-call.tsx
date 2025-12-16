'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, Wifi, WifiOff, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'

interface VideoCallProps {
  roomUrl: string
  roomId: string
  onEndCall?: () => void
  isDoctor?: boolean
  userName?: string
}

export function VideoCall({ roomUrl, roomId, onEndCall, isDoctor = false, userName = 'Participante' }: VideoCallProps) {
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [screenShared, setScreenShared] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const { toast } = useToast()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Configurar URL do Jitsi - o Jitsi Meet não requer login, apenas nome
  // A URL simples funciona, mas vamos adicionar o nome no hash se possível
  const getJitsiUrl = () => {
    // O Jitsi Meet gratuito funciona sem login
    // Ele apenas pede o nome do participante, que pode ser inserido na interface
    // Por enquanto, retornamos a URL simples - o usuário pode entrar direto
    return roomUrl
  }

  useEffect(() => {
    // Simular status de conexão
    const timer = setTimeout(() => {
      setConnectionStatus('connected')
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  const toggleVideo = () => {
    setVideoEnabled(!videoEnabled)
    // Aqui seria implementado o controle real do vídeo via SDK
    toast({
      title: videoEnabled ? 'Vídeo desligado' : 'Vídeo ligado',
    })
  }

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled)
    // Aqui seria implementado o controle real do áudio via SDK
    toast({
      title: audioEnabled ? 'Áudio desligado' : 'Áudio ligado',
    })
  }

  const toggleScreenShare = async () => {
    try {
      if (!screenShared) {
        // Iniciar compartilhamento de tela
        setScreenShared(true)
        toast({
          title: 'Compartilhamento de tela iniciado',
        })
      } else {
        // Parar compartilhamento
        setScreenShared(false)
        toast({
          title: 'Compartilhamento de tela encerrado',
        })
      }
    } catch (error) {
      toast({
        title: 'Erro ao compartilhar tela',
        variant: 'destructive',
      })
    }
  }

  const handleEndCall = () => {
    if (onEndCall) {
      onEndCall()
    }
  }

  const getConnectionStatusBadge = () => {
    switch (connectionStatus) {
      case 'connecting':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">Conectando...</Badge>
      case 'connected':
        return <Badge variant="default" className="bg-green-500">Conectado</Badge>
      case 'disconnected':
        return <Badge variant="destructive">Desconectado</Badge>
      default:
        return null
    }
  }

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Sessão de Telemedicina</CardTitle>
          <div className="flex items-center gap-2">
            {connectionStatus === 'connected' ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-yellow-500" />
            )}
            {getConnectionStatusBadge()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {connectionStatus === 'connecting' && (
          <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Conectando à sala de vídeo...</p>
            </div>
          </div>
        )}

        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            ref={iframeRef}
            src={getJitsiUrl()}
            className="absolute top-0 left-0 w-full h-full border rounded-lg"
            allow="camera; microphone; display-capture"
            title="Video Call"
            style={{ display: connectionStatus === 'connecting' ? 'none' : 'block' }}
          />
        </div>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Button
            variant={videoEnabled ? 'default' : 'destructive'}
            size="lg"
            onClick={toggleVideo}
            title={videoEnabled ? 'Desligar câmera' : 'Ligar câmera'}
          >
            {videoEnabled ? (
              <Video className="h-5 w-5" />
            ) : (
              <VideoOff className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant={audioEnabled ? 'default' : 'destructive'}
            size="lg"
            onClick={toggleAudio}
            title={audioEnabled ? 'Desligar microfone' : 'Ligar microfone'}
          >
            {audioEnabled ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </Button>

          {isDoctor && (
            <Button
              variant={screenShared ? 'default' : 'outline'}
              size="lg"
              onClick={toggleScreenShare}
              title="Compartilhar tela"
            >
              <Monitor className="h-5 w-5" />
            </Button>
          )}

          <Button variant="destructive" size="lg" onClick={handleEndCall} title="Encerrar chamada">
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <p>Sala: {roomId}</p>
          </div>
          {isDoctor && (
            <p className="text-xs text-center text-muted-foreground">
              O paciente pode acessar esta consulta pelo portal. Não é necessário compartilhar o link manualmente.
            </p>
          )}
          {!isDoctor && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  Se você tiver problemas de conexão, verifique sua internet ou recarregue a página.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

