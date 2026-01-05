'use client'

import { useEffect, useRef } from 'react'
import { logger } from '@/lib/logger'

/**
 * Componente que inicia o processamento automático de follow-ups agendados
 * Processa a cada 1 minuto automaticamente quando o dashboard está aberto
 */
export function FollowUpScheduler() {
  const isProcessingRef = useRef(false)

  useEffect(() => {
    const processFollowUps = async () => {
      // Evitar processamento simultâneo
      if (isProcessingRef.current) {
        return
      }

      try {
        isProcessingRef.current = true
        
        const response = await fetch('/api/follow-up/process-scheduled', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })

        const result = await response.json()
        
        if (result.success && result.data) {
          const { agendados, recorrentes } = result.data
          const totalSent = agendados.sent + recorrentes.sent
          
          if (totalSent > 0) {
            logger.info('Follow-ups processados', {
              agendados: agendados.sent,
              recorrentes: recorrentes.sent,
            })
          }
          
          if (agendados.failed > 0 || recorrentes.failed > 0) {
            logger.warn('Falhas ao processar follow-ups', {
              agendadosFailed: agendados.failed,
              recorrentesFailed: recorrentes.failed,
            })
          }
        }
      } catch (error) {
        logger.error('Erro ao processar follow-ups', error)
      } finally {
        isProcessingRef.current = false
      }
    }

    // Processar imediatamente ao montar (quando usuário acessa o dashboard)
    processFollowUps()

    // Processar a cada 1 minuto (60000ms)
    const interval = setInterval(processFollowUps, 60000)

    logger.debug('Follow-up Scheduler iniciado - processando a cada 1 minuto')

    return () => {
      clearInterval(interval)
      logger.debug('Follow-up Scheduler parado')
    }
  }, [])

  return null // Componente invisível
}

