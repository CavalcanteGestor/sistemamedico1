/**
 * Serviço de Auditoria
 * Registra ações importantes dos usuários para rastreabilidade e compliance
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export interface AuditLogData {
  user_id?: string
  action: string
  table_name: string
  record_id?: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  ip_address?: string
  user_agent?: string
}

/**
 * Registra uma ação no log de auditoria
 */
export async function logAudit(data: AuditLogData): Promise<void> {
  try {
    const adminClient = createAdminClient()
    
    // Remover valores sensíveis antes de salvar
    const sanitizedOldValues = sanitizeSensitiveData(data.old_values)
    const sanitizedNewValues = sanitizeSensitiveData(data.new_values)
    
    const { error } = await adminClient.from('audit_logs').insert({
      user_id: data.user_id || null,
      action: data.action,
      table_name: data.table_name,
      record_id: data.record_id || null,
      old_values: sanitizedOldValues || null,
      new_values: sanitizedNewValues || null,
      ip_address: data.ip_address || null,
      user_agent: data.user_agent || null,
    })

    if (error) {
      logger.error('Erro ao registrar log de auditoria', error, data)
    }
  } catch (error) {
    // Não falhar a operação principal se o log falhar
    logger.error('Erro ao registrar log de auditoria', error, data)
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
 * Helper para extrair IP e User-Agent de uma requisição Next.js
 */
export function extractRequestInfo(request: { headers: Headers }): {
  ip_address?: string
  user_agent?: string
} {
  const headers = request.headers
  
  // Tentar obter IP real (pode estar em diferentes headers dependendo do proxy)
  const ipAddress =
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    null

  const userAgent = headers.get('user-agent') || null

  return {
    ip_address: ipAddress || undefined,
    user_agent: userAgent || undefined,
  }
}

/**
 * Busca logs de auditoria com filtros
 */
export async function getAuditLogs(filters?: {
  user_id?: string
  table_name?: string
  action?: string
  start_date?: Date
  end_date?: Date
  limit?: number
  offset?: number
}) {
  try {
    const adminClient = createAdminClient()
    let query = adminClient.from('audit_logs').select('*')

    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id)
    }

    if (filters?.table_name) {
      query = query.eq('table_name', filters.table_name)
    }

    if (filters?.action) {
      query = query.eq('action', filters.action)
    }

    if (filters?.start_date) {
      query = query.gte('created_at', filters.start_date.toISOString())
    }

    if (filters?.end_date) {
      query = query.lte('created_at', filters.end_date.toISOString())
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
    logger.error('Erro ao buscar logs de auditoria', error)
    throw error
  }
}

