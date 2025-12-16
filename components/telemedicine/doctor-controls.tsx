'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Mic, MicOff, Video, VideoOff, UserX, Shield, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface DoctorControlsProps {
  isDoctor: boolean
  peerConnection: RTCPeerConnection | null
  onMutePatient?: () => void
  onDisablePatientVideo?: () => void
}

export function DoctorControls({
  isDoctor,
  peerConnection,
  onMutePatient,
  onDisablePatientVideo,
}: DoctorControlsProps) {
  const [patientMuted, setPatientMuted] = useState(false)
  const [patientVideoDisabled, setPatientVideoDisabled] = useState(false)
  const { toast } = useToast()

  if (!isDoctor) {
    return null
  }

  const handleMutePatient = () => {
    // Implementar controle de mute do paciente via WebRTC
    // Isso requer controle sobre o peer connection remoto
    setPatientMuted(!patientMuted)
    
    // Notificar via Supabase Realtime
    if (onMutePatient) {
      onMutePatient()
    }

    toast({
      title: patientMuted ? 'Áudio do paciente habilitado' : 'Paciente silenciado',
      description: patientMuted 
        ? 'O paciente pode falar novamente.'
        : 'O paciente foi silenciado.',
    })
  }

  const handleDisablePatientVideo = () => {
    setPatientVideoDisabled(!patientVideoDisabled)
    
    if (onDisablePatientVideo) {
      onDisablePatientVideo()
    }

    toast({
      title: patientVideoDisabled ? 'Vídeo do paciente habilitado' : 'Vídeo do paciente desabilitado',
      description: patientVideoDisabled
        ? 'O paciente pode mostrar vídeo novamente.'
        : 'O vídeo do paciente foi desabilitado.',
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Controles do Médico
          </CardTitle>
          <Badge variant="outline" className="text-xs">Moderador</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          variant={patientMuted ? 'default' : 'outline'}
          size="sm"
          onClick={handleMutePatient}
          className="w-full justify-start"
        >
          {patientMuted ? (
            <>
              <MicOff className="h-4 w-4 mr-2" />
              Habilitar Áudio do Paciente
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 mr-2" />
              Silenciar Paciente
            </>
          )}
        </Button>

        <Button
          variant={patientVideoDisabled ? 'default' : 'outline'}
          size="sm"
          onClick={handleDisablePatientVideo}
          className="w-full justify-start"
        >
          {patientVideoDisabled ? (
            <>
              <Video className="h-4 w-4 mr-2" />
              Habilitar Vídeo do Paciente
            </>
          ) : (
            <>
              <VideoOff className="h-4 w-4 mr-2" />
              Desabilitar Vídeo do Paciente
            </>
          )}
        </Button>

        <div className="pt-2 border-t">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>
              Como moderador, você pode controlar o áudio e vídeo do paciente durante a consulta.
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

