import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit, extractRequestInfo } from '@/lib/services/audit-service'
import { logger } from '@/lib/logger'

/**
 * API para criar backup do banco de dados
 * Apenas admin e desenvolvedor podem executar
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar permissão
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || !['admin', 'desenvolvedor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Verificar secret key para cron jobs
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET_KEY
    const providedSecret = authHeader?.replace('Bearer ', '')

    // Se tiver secret key configurado, verificar
    if (cronSecret && providedSecret !== cronSecret && profile.role !== 'desenvolvedor') {
      return NextResponse.json(
        { error: 'Não autorizado. Forneça o secret key correto.' },
        { status: 401 }
      )
    }

    const adminClient = createAdminClient()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFileName = `backup-${timestamp}.sql`

    // Listar todas as tabelas principais para backup
    const tables = [
      'profiles',
      'specialties',
      'doctors',
      'patients',
      'appointments',
      'medical_records',
      'anamnesis',
      'physical_exams',
      'evolutions',
      'prescriptions',
      'prescription_items',
      'exams',
      'exam_results',
      'leads',
      'follow_ups',
      'whatsapp_messages',
      'notifications',
      'clinic_settings',
      'financial_transactions',
      'telemedicine_sessions',
      'telemedicine_transcriptions',
      'telemedicine_feedback',
      'kanban_columns',
      'orcamentos',
      'audit_logs',
      'system_logs',
    ]

    // Criar backup estruturado
    const backup: any = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      tables: {},
    }

    // Buscar dados de cada tabela
    for (const table of tables) {
      try {
        const { data, error } = await adminClient.from(table).select('*')
        if (!error && data) {
          backup.tables[table] = data
        }
      } catch (err) {
        logger.warn(`Erro ao fazer backup da tabela ${table}`, { error: err })
      }
    }

    // Salvar backup no Supabase Storage (se bucket existir)
    const backupJson = JSON.stringify(backup, null, 2)
    const storageBucket = 'backups'
    const backupPath = `${new Date().toISOString().split('T')[0]}/${backupFileName}`

    try {
      // Verificar se bucket existe antes de tentar upload
      const { data: buckets } = await adminClient.storage.listBuckets()
      const backupsBucketExists = buckets?.some(b => b.id === storageBucket)

      if (backupsBucketExists) {
        const backupBuffer = Buffer.from(backupJson, 'utf-8')
        const { error: uploadError } = await adminClient.storage
          .from(storageBucket)
          .upload(backupPath, backupBuffer, {
            contentType: 'application/json',
            upsert: false,
          })

        if (uploadError) {
          logger.warn('Erro ao fazer upload do backup para storage', { error: uploadError })
        } else {
          logger.info('Backup salvo no storage', { path: backupPath })
        }
      } else {
        logger.warn('Bucket de backups não encontrado. Execute a migração 041 para criar o bucket.')
      }
    } catch (storageError) {
      logger.warn('Erro ao acessar storage para backup', { error: storageError })
    }

    // Limpar backups antigos (manter apenas últimos 30 dias)
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      // Listar backups antigos
      const { data: oldBackups } = await adminClient.storage
        .from(storageBucket)
        .list()

      if (oldBackups) {
        for (const file of oldBackups) {
          if (file.created_at && new Date(file.created_at) < thirtyDaysAgo) {
            await adminClient.storage.from(storageBucket).remove([file.name])
          }
        }
      }
    } catch (cleanupError) {
      logger.warn('Erro ao limpar backups antigos', { error: cleanupError })
    }

    // Registrar auditoria
    const requestInfo = extractRequestInfo(request)
    await logAudit({
      user_id: user.id,
      action: 'backup',
      table_name: 'system',
      new_values: {
        backup_file: backupFileName,
        tables_count: Object.keys(backup.tables).length,
      },
      ...requestInfo,
    })

    return NextResponse.json({
      success: true,
      message: 'Backup criado com sucesso',
      backup: {
        file_name: backupFileName,
        timestamp: backup.timestamp,
        tables: Object.keys(backup.tables),
        size: backupJson.length,
      },
    })
  } catch (error: any) {
    logger.error('Erro ao criar backup', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar backup' },
      { status: 500 }
    )
  }
}

