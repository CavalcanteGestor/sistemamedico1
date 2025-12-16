'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, User, Video, AlertTriangle, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface WaitingRoomProps {
  doctorName?: string
  appointmentDate?: string
  appointmentTime?: string
  onEnter?: () => void
  isDoctor?: boolean
}

export function WaitingRoom({
  doctorName,
  appointmentDate,
  appointmentTime,
  onEnter,
  isDoctor = false,
}: WaitingRoomProps) {
  return (
    <div className="flex items-center justify-center min-h-[600px]">
      <Card className="w-full max-w-lg border-2 border-primary/20 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
          <CardTitle className="text-center text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Sala de Espera
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-8">
          <div className="text-center">
            <div className="relative mx-auto w-32 h-32 mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full animate-pulse"></div>
              <div className="relative w-full h-full bg-primary/10 rounded-full flex items-center justify-center">
                <Clock className="h-16 w-16 text-primary animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-3">
              {isDoctor ? 'Aguardando Paciente' : 'Aguardando Médico'}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isDoctor
                ? 'O paciente será notificado automaticamente quando você iniciar a consulta.'
                : 'Aguarde o médico iniciar a consulta. Você será conectado automaticamente quando ele estiver pronto.'}
            </p>
          </div>

          {doctorName && (
            <div className="border-2 border-primary/20 rounded-xl p-5 bg-gradient-to-br from-primary/5 to-primary/10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Médico Responsável</span>
                  <span className="text-sm font-semibold">{doctorName}</span>
                </div>
              </div>
              {appointmentDate && appointmentTime && (
                <div className="flex items-center gap-3 pt-3 border-t border-primary/10">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Data e Horário</span>
                    <span className="text-sm font-semibold">
                      {new Date(appointmentDate).toLocaleDateString('pt-BR')} às {appointmentTime}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {isDoctor && (
            <Button 
              onClick={onEnter} 
              className="w-full h-14 text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105" 
              size="lg"
            >
              <Video className="mr-2 h-5 w-5" />
              Iniciar Consulta
            </Button>
          )}

          {!isDoctor && (
            <div className="text-center space-y-4">
              <Badge variant="outline" className="px-4 py-2 text-sm border-primary/30 bg-primary/10">
                Status: Aguardando Médico
              </Badge>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Você será conectado automaticamente quando o médico iniciar a consulta.
              </p>
              {onEnter && (
                <Button
                  onClick={onEnter}
                  variant="outline"
                  className="w-full border-primary/50 hover:border-primary hover:bg-primary/10"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Pré-visualizar câmera e microfone
                </Button>
              )}
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/50 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl">
                <p className="text-xs text-yellow-800 dark:text-yellow-200 font-bold mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Aviso Importante:
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 leading-relaxed">
                  Quando o médico entrar, seu navegador vai solicitar permissão para usar sua câmera e microfone. 
                  <strong className="block mt-1"> Por favor, clique em "Permitir" para continuar a consulta.</strong>
                </p>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/20 rounded-xl p-4">
            <p className="text-xs text-primary-foreground font-medium flex items-start gap-2">
              <span className="text-base">💡</span>
              <span><strong>Dica:</strong> Certifique-se de que sua câmera e microfone estão funcionando corretamente antes da consulta começar.</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

