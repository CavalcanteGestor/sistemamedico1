'use client'

import { useEffect, useRef } from 'react'

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
            console.log(`[Follow-up Scheduler] ✅ Processados: ${agendados.sent} agendados, ${recorrentes.sent} recorrentes`)
          }
          
          if (agendados.failed > 0 || recorrentes.failed > 0) {
            console.warn(`[Follow-up Scheduler] ⚠️ Falhas: ${agendados.failed} agendados, ${recorrentes.failed} recorrentes`)
          }
        }
      } catch (error) {
        console.error('[Follow-up Scheduler] ❌ Erro ao processar:', error)
      } finally {
        isProcessingRef.current = false
      }
    }

    // Processar imediatamente ao montar (quando usuário acessa o dashboard)
    processFollowUps()

    // Processar a cada 1 minuto (60000ms)
    const interval = setInterval(processFollowUps, 60000)

    console.log('[Follow-up Scheduler] 🚀 Iniciado - processando a cada 1 minuto')

    return () => {
      clearInterval(interval)
      console.log('[Follow-up Scheduler] 🛑 Parado')
    }
  }, [])

  return null // Componente invisível
}

