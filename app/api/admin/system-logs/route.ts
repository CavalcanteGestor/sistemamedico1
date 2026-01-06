import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSystemLogs } from '@/lib/services/system-logs-service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar permissão - apenas desenvolvedor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'desenvolvedor') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const level = (searchParams.get('level') || 'all') as 'debug' | 'info' | 'warn' | 'error' | 'all'
    const route = searchParams.get('route') || undefined
    const userId = searchParams.get('user_id') || undefined
    const startDate = searchParams.get('start_date') ? new Date(searchParams.get('start_date')!) : undefined
    const endDate = searchParams.get('end_date') ? new Date(searchParams.get('end_date')!) : undefined
    const search = searchParams.get('search') || undefined
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const logs = await getSystemLogs({
      level,
      route,
      user_id: userId,
      start_date: startDate,
      end_date: endDate,
      search,
      limit,
      offset,
    })

    return NextResponse.json({ success: true, data: logs })
  } catch (error: any) {
    console.error('Erro ao buscar logs do sistema:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar logs do sistema' },
      { status: 500 }
    )
  }
}

