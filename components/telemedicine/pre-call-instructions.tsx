'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle, Camera, Mic, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface PreCallInstructionsProps {
  onReady: () => void
  onSkip?: () => void
}

export function PreCallInstructions({ onReady, onSkip }: PreCallInstructionsProps) {
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null)
  const [micPermission, setMicPermission] = useState<boolean | null>(null)
  const [cameraTest, setCameraTest] = useState(false)
  const [micTest, setMicTest] = useState(false)
  const [allReady, setAllReady] = useState(false)

  useEffect(() => {
    checkPermissions()
  }, [])

  useEffect(() => {
    setAllReady(cameraPermission === true && micPermission === true)
  }, [cameraPermission, micPermission])

  const checkPermissions = async () => {
    try {
      // Verificar permissão de câmera
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true })
      setCameraPermission(true)
      cameraStream.getTracks().forEach(track => track.stop())

      // Verificar permissão de microfone
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setMicPermission(true)
      micStream.getTracks().forEach(track => track.stop())
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        if (error.message.includes('video')) {
          setCameraPermission(false)
        }
        if (error.message.includes('audio')) {
          setMicPermission(false)
        }
      } else {
        setCameraPermission(false)
        setMicPermission(false)
      }
    }
  }

  const testCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      setCameraTest(true)
      stream.getTracks().forEach(track => track.stop())
      setTimeout(() => setCameraTest(false), 2000)
    } catch (error) {
      setCameraPermission(false)
    }
  }

  const testMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setMicTest(true)
      stream.getTracks().forEach(track => track.stop())
      setTimeout(() => setMicTest(false), 2000)
    } catch (error) {
      setMicPermission(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Preparação para Consulta de Telemedicina
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            {cameraPermission === true ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            ) : (
              <Circle className="h-5 w-5 text-gray-400 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-medium">Câmera</p>
                {cameraPermission === true && (
                  <Badge variant="default" className="bg-green-500">Funcionando</Badge>
                )}
                {cameraPermission === false && (
                  <Badge variant="destructive">Permissão Negada</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                A câmera será usada para que o médico possa vê-lo durante a consulta.
              </p>
              {cameraPermission === false && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={testCamera}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Testar Câmera
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            {micPermission === true ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            ) : (
              <Circle className="h-5 w-5 text-gray-400 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-medium">Microfone</p>
                {micPermission === true && (
                  <Badge variant="default" className="bg-green-500">Funcionando</Badge>
                )}
                {micPermission === false && (
                  <Badge variant="destructive">Permissão Negada</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                O microfone será usado para que o médico possa ouvi-lo durante a consulta.
              </p>
              {micPermission === false && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={testMicrophone}
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Testar Microfone
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">Dicas para uma boa consulta:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Escolha um local tranquilo e com boa iluminação</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Teste sua conexão de internet antes da consulta</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Tenha em mãos seus documentos de identidade, se necessário</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Prepare uma lista de medicamentos que você está tomando</span>
            </li>
          </ul>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">Privacidade:</h3>
          <p className="text-sm text-muted-foreground">
            Sua consulta é privada e confidencial. A conversa será criptografada e apenas você e o médico terão acesso.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          {onSkip && (
            <Button
              variant="outline"
              onClick={onSkip}
              className="flex-1"
            >
              Pular e Entrar
            </Button>
          )}
          <Button
            onClick={onReady}
            disabled={!allReady && cameraPermission !== null}
            className="flex-1"
          >
            {allReady ? 'Entrar na Consulta' : 'Aguardando Permissões...'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
