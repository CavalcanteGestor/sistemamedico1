import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processScheduledFollowUps } from '@/lib/services/follow-up-service'

/**
 * API para processar follow-ups agendados e recorrentes
 * Esta API deve ser chamada por um cron job periodicamente (ex: a cada 5 minutos)
 * 
 * Pode ser chamada por:
 * - Cron job externo (Vercel Cron, GitHub Actions, etc)
 * - Sistema de agendamento interno
 * - Manualmente por admin
 */
export async function POST(request: NextRequest) {
  try {
    // Criar cliente Supabase com cookies da requisição
    const supabase = await createClient()
    
    // Tentar obter usuário (pode ser null se não autenticado)
    let user = null
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      user = authUser
    } catch (error) {
      // Se der erro ao obter usuário, continuar sem autenticação (pode ser cron job)
      console.log('[process-scheduled] Não foi possível obter usuário, pode ser chamada de cron job')
    }

    // Verificar se é uma chamada autorizada (com token de autenticação ou secret)
    // Permitir chamadas sem autenticação se tiver secret key (para cron jobs)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET_KEY

    // Se tiver secret key configurado, verificar primeiro
    if (cronSecret && authHeader) {
      const providedSecret = authHeader.replace('Bearer ', '').trim()
      if (providedSecret === cronSecret) {
        // Secret key válido - permitir execução
      } else {
        // Secret key inválido
        return NextResponse.json(
          { error: 'Não autorizado. Forneça o secret key correto.' },
          { status: 401 }
        )
      }
    } else if (user) {
      // Usuário autenticado - verificar permissão
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      // Permitir admin, medico e recepcionista (não apenas admin)
      if (!profile || !['admin', 'medico', 'recepcionista', 'desenvolvedor'].includes(profile.role)) {
        return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
      }
    } else {
      // Sem autenticação e sem secret key válido
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Processar follow-ups agendados e recorrentes
    const result = await processScheduledFollowUps()

    return NextResponse.json({
      success: true,
      message: 'Follow-ups processados com sucesso',
      data: result,
    })
  } catch (error: any) {
    console.error('Erro ao processar follow-ups agendados:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao processar follow-ups agendados' },
      { status: 500 }
    )
  }
}

/**
 * GET também disponível para verificar status sem processar
 */
export async function GET(request: NextRequest) {
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
      .single()

    if (!profile || !['admin', 'medico', 'recepcionista'].includes(profile.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Buscar estatísticas de follow-ups agendados e recorrentes pendentes
    const now = new Date().toISOString()

    const { count: scheduledCount } = await supabase
      .from('follow_ups')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pendente')
      .eq('recorrente', false)
      .not('agendado_para', 'is', null)
      .lte('agendado_para', now)

    const { count: recurringCount } = await supabase
      .from('follow_ups')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pendente')
      .eq('recorrente', true)
      .not('proxima_execucao', 'is', null)
      .lte('proxima_execucao', now)

    const scheduled = scheduledCount || 0
    const recurring = recurringCount || 0

    return NextResponse.json({
      success: true,
      data: {
        agendadosPendentes: scheduled,
        recorrentesPendentes: recurring,
        totalPendentes: scheduled + recurring,
      },
    })
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas de follow-ups:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar estatísticas' },
      { status: 500 }
    )
  }
}

