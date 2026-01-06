/**
 * Serviço de Logs do Sistema
 * Gerencia logs de sistema para debug e monitoramento
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface SystemLogData {
  level: LogLevel
  message: string
  context?: Record<string, any>
  route?: string
  user_id?: string
  error_code?: string
  stack_trace?: string
}

/**
 * Registra um log no sistema
 */
export async function logSystem(data: SystemLogData): Promise<void> {
  try {
    const adminClient = createAdminClient()
    
    // Sanitizar dados sensíveis
    const sanitizedContext = sanitizeSensitiveData(data.context)
    
    const { error } = await adminClient.from('system_logs').insert({
      level: data.level,
      message: data.message,
      context: sanitizedContext || null,
      route: data.route || null,
      user_id: data.user_id || null,
      error_code: data.error_code || null,
      stack_trace: data.stack_trace || null,
    })

    if (error) {
      // Se falhar, usar logger padrão como fallback
      logger.error('Erro ao registrar log do sistema', error, data)
    }
  } catch (error) {
    // Não falhar a operação principal se o log falhar
    logger.error('Erro ao registrar log do sistema', error, data)
  }
}

/**
 * Remove dados sensíveis dos valores antes de salvar
 */
function sanitizeSensitiveData(data?: Record<string, any>): Record<string, any> | null {
  if (!data) return null

  const sensitiveFields = [
    'password',
    'senha',
    'token',
    'secret',
    'api_key',
    'service_role_key',
    'access_token',
    'refresh_token',
    'login_token',
  ]

  const sanitized = { ...data }
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]'
    }
  }

  return sanitized
}

/**
 * Busca logs do sistema com filtros
 */
export async function getSystemLogs(filters?: {
  level?: LogLevel | 'all'
  route?: string
  user_id?: string
  start_date?: Date
  end_date?: Date
  limit?: number
  offset?: number
  search?: string
}) {
  try {
    const adminClient = createAdminClient()
    let query = adminClient.from('system_logs').select('*')

    if (filters?.level && filters.level !== 'all') {
      query = query.eq('level', filters.level)
    }

    if (filters?.route) {
      query = query.ilike('route', `%${filters.route}%`)
    }

    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id)
    }

    if (filters?.start_date) {
      query = query.gte('created_at', filters.start_date.toISOString())
    }

    if (filters?.end_date) {
      query = query.lte('created_at', filters.end_date.toISOString())
    }

    if (filters?.search) {
      query = query.or(`message.ilike.%${filters.search}%,route.ilike.%${filters.search}%`)
    }

    query = query.order('created_at', { ascending: false })

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    logger.error('Erro ao buscar logs do sistema', error)
    throw error
  }
}

/**
 * Limpa logs antigos (manter apenas últimos N dias)
 */
export async function cleanOldLogs(daysToKeep: number = 30): Promise<number> {
  try {
    const adminClient = createAdminClient()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const { data, error } = await adminClient
      .from('system_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select()

    if (error) {
      throw error
    }

    return data?.length || 0
  } catch (error) {
    logger.error('Erro ao limpar logs antigos', error)
    throw error
  }
}

