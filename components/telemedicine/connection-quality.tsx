'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, Signal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ConnectionQualityProps {
  peerConnection?: RTCPeerConnection | null
}

interface QualityMetrics {
  latency: number | null
  bandwidth: number | null
  videoQuality: 'excellent' | 'good' | 'fair' | 'poor' | null
  audioQuality: 'excellent' | 'good' | 'fair' | 'poor' | null
}

export function ConnectionQuality({ peerConnection }: ConnectionQualityProps) {
  const [quality, setQuality] = useState<QualityMetrics>({
    latency: null,
    bandwidth: null,
    videoQuality: null,
    audioQuality: null,
  })

  useEffect(() => {
    if (!peerConnection) return

    const checkQuality = async () => {
      try {
        // Obter estatísticas da conexão
        const stats = await peerConnection.getStats()
        let latency = null
        let bandwidth = null

        stats.forEach((report) => {
          // Calcular latência
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            if (report.currentRoundTripTime) {
              latency = Math.round(report.currentRoundTripTime * 1000) // em ms
            }
          }

          // Calcular largura de banda
          if (report.type === 'inbound-rtp' || report.type === 'outbound-rtp') {
            if (report.bytesReceived || report.bytesSent) {
              // Estimativa simples de banda
              bandwidth = 1000 // placeholder - cálculo mais complexo necessário
            }
          }
        })

        // Avaliar qualidade baseado em latência
        let videoQuality: QualityMetrics['videoQuality'] = null
        let audioQuality: QualityMetrics['audioQuality'] = null

        if (latency !== null) {
          if (latency < 100) {
            videoQuality = 'excellent'
            audioQuality = 'excellent'
          } else if (latency < 200) {
            videoQuality = 'good'
            audioQuality = 'good'
          } else if (latency < 400) {
            videoQuality = 'fair'
            audioQuality = 'fair'
          } else {
            videoQuality = 'poor'
            audioQuality = 'poor'
          }
        }

        setQuality({
          latency,
          bandwidth,
          videoQuality,
          audioQuality,
        })
      } catch (error) {
        // Erro silencioso ao verificar qualidade
      }
    }

    // Verificar qualidade a cada 5 segundos
    const interval = setInterval(checkQuality, 5000)
    checkQuality() // Verificar imediatamente

    return () => clearInterval(interval)
  }, [peerConnection])

  const getQualityColor = (q: QualityMetrics['videoQuality']) => {
    switch (q) {
      case 'excellent':
        return 'text-green-500'
      case 'good':
        return 'text-green-600'
      case 'fair':
        return 'text-yellow-500'
      case 'poor':
        return 'text-red-500'
      default:
        return 'text-muted-foreground'
    }
  }

  const getQualityBadge = (q: QualityMetrics['videoQuality']) => {
    switch (q) {
      case 'excellent':
        return { label: 'Excelente', variant: 'default' as const, className: 'bg-green-500' }
      case 'good':
        return { label: 'Boa', variant: 'default' as const, className: 'bg-green-600' }
      case 'fair':
        return { label: 'Regular', variant: 'default' as const, className: 'bg-yellow-500' }
      case 'poor':
        return { label: 'Ruim', variant: 'destructive' as const, className: '' }
      default:
        return { label: 'Verificando...', variant: 'outline' as const, className: '' }
    }
  }

  const overallQuality =
    quality.videoQuality === 'poor' || quality.audioQuality === 'poor'
      ? 'poor'
      : quality.videoQuality === 'fair' || quality.audioQuality === 'fair'
        ? 'fair'
        : quality.videoQuality

  const qualityInfo = getQualityBadge(overallQuality)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Signal className={cn('h-5 w-5', getQualityColor(overallQuality))} />
            {overallQuality && (
              <div className={cn(
                'absolute -top-1 -right-1 h-3 w-3 rounded-full animate-pulse',
                overallQuality === 'excellent' || overallQuality === 'good' ? 'bg-green-500' :
                overallQuality === 'fair' ? 'bg-yellow-500' : 'bg-red-500'
              )}></div>
            )}
          </div>
          <span className="text-sm font-semibold">Conexão</span>
        </div>
        <Badge 
          variant={qualityInfo.variant} 
          className={cn(
            'text-xs font-semibold px-2 py-1',
            qualityInfo.className,
            overallQuality === 'excellent' || overallQuality === 'good' ? 'bg-green-500 hover:bg-green-600' :
            overallQuality === 'fair' ? 'bg-yellow-500 hover:bg-yellow-600' :
            overallQuality === 'poor' ? 'bg-red-500 hover:bg-red-600' : ''
          )}
        >
          {qualityInfo.label}
        </Badge>
      </div>

      {quality.latency !== null && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Latência:</span>
            <span className={cn(
              'font-semibold',
              quality.latency < 100 ? 'text-green-600' :
              quality.latency < 200 ? 'text-green-500' :
              quality.latency < 400 ? 'text-yellow-500' : 'text-red-500'
            )}>
              {quality.latency}ms
            </span>
          </div>
          
          {/* Barra de qualidade visual */}
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-500',
                overallQuality === 'excellent' || overallQuality === 'good' ? 'bg-green-500' :
                overallQuality === 'fair' ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{
                width: overallQuality === 'excellent' ? '100%' :
                       overallQuality === 'good' ? '75%' :
                       overallQuality === 'fair' ? '50%' : '25%'
              }}
            ></div>
          </div>

          {quality.latency > 300 && (
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 text-xs bg-yellow-50 dark:bg-yellow-950/50 border border-yellow-200 dark:border-yellow-800 rounded p-2">
              <AlertCircle className="h-3 w-3 flex-shrink-0" />
              <span>Latência alta - Verifique sua conexão</span>
            </div>
          )}
        </div>
      )}

      {overallQuality === 'poor' && (
        <div className="text-xs bg-red-50 dark:bg-red-950/50 border-2 border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold text-red-800 dark:text-red-200">
                Conexão instável
              </p>
              <p className="text-red-700 dark:text-red-300">
                Verifique sua conexão com a internet ou tente reconectar.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

