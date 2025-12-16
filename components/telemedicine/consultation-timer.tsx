'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ConsultationTimerProps {
  startTime?: Date | null
  onTimeAlert?: (minutes: number) => void
}

export function ConsultationTimer({ startTime, onTimeAlert }: ConsultationTimerProps) {
  const [elapsed, setElapsed] = useState(0)
  const [alertShown, setAlertShown] = useState(false)

  useEffect(() => {
    if (!startTime) {
      setElapsed(0)
      return
    }

    const interval = setInterval(() => {
      const now = new Date()
      const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000)
      setElapsed(diff)

      // Alertas em intervalos específicos
      const minutes = Math.floor(diff / 60)
      if (minutes === 5 && !alertShown && onTimeAlert) {
        onTimeAlert(5)
        setAlertShown(true)
      }
      if (minutes === 10 && alertShown && onTimeAlert) {
        onTimeAlert(10)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime, alertShown, onTimeAlert])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const minutes = Math.floor(elapsed / 60)
  const isLongSession = minutes >= 30
  const isVeryLongSession = minutes >= 60

  if (!startTime) {
    return (
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Aguardando início...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock
              className={cn(
                'h-4 w-4',
                isVeryLongSession ? 'text-red-500' : isLongSession ? 'text-yellow-500' : 'text-green-500'
              )}
            />
            <span className="text-sm font-medium">Duração:</span>
            <span
              className={cn(
                'text-sm font-mono font-bold',
                isVeryLongSession ? 'text-red-500' : isLongSession ? 'text-yellow-500' : ''
              )}
            >
              {formatTime(elapsed)}
            </span>
          </div>
          {isLongSession && (
            <Badge variant={isVeryLongSession ? 'destructive' : 'default'} className="text-xs">
              {isVeryLongSession ? 'Sessão Longa' : 'Sessão Estendida'}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

