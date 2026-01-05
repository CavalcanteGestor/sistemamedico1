/**
 * Serviço para processar follow-ups agendados automaticamente
 * Este serviço pode ser usado tanto em client-side (com polling) quanto server-side
 */

import { processScheduledFollowUps } from './follow-up-service'
import { logger } from '@/lib/logger'

let pollingInterval: NodeJS.Timeout | null = null
let isProcessing = false

/**
 * Inicia o processamento automático de follow-ups agendados
 * @param interval Intervalo em minutos (padrão: 1 minuto)
 */
export function startFollowUpScheduler(intervalMinutes: number = 1) {
  // Parar qualquer intervalo existente
  stopFollowUpScheduler()

  // Converter minutos para milissegundos
  const intervalMs = intervalMinutes * 60 * 1000

  logger.info('Iniciando processamento automático de follow-ups', { intervalMinutes })

  // Processar imediatamente na primeira vez
  processScheduledFollowUps().catch((error) => logger.error('Erro ao processar follow-ups inicial', error))

  // Configurar intervalo
  pollingInterval = setInterval(async () => {
    if (isProcessing) {
      logger.debug('Processamento anterior ainda em andamento, pulando ciclo')
      return
    }

    try {
      isProcessing = true
      logger.debug('Processando follow-ups agendados')
      const result = await processScheduledFollowUps()
      
      if (result.agendados.sent > 0 || result.recorrentes.sent > 0) {
        logger.info('Follow-ups processados', {
          agendados: result.agendados.sent,
          recorrentes: result.recorrentes.sent,
        })
      }
    } catch (error) {
      logger.error('Erro ao processar follow-ups agendados', error)
    } finally {
      isProcessing = false
    }
  }, intervalMs)
}

/**
 * Para o processamento automático
 */
export function stopFollowUpScheduler() {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
    console.log('[Follow-up Scheduler] Processamento automático parado')
  }
}

/**
 * Processa follow-ups agendados uma vez (sem intervalo)
 */
export async function processOnce() {
  if (isProcessing) {
    console.log('[Follow-up Scheduler] Processamento já em andamento')
    return
  }

  try {
    isProcessing = true
    const result = await processScheduledFollowUps()
    return result
  } catch (error) {
    console.error('[Follow-up Scheduler] Erro ao processar:', error)
    throw error
  } finally {
    isProcessing = false
  }
}


