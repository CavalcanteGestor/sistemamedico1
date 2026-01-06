import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuditLogs } from '@/lib/services/audit-service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar permissão - apenas admin e desenvolvedor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || !['admin', 'desenvolvedor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id') || undefined
    const tableName = searchParams.get('table_name') || undefined
    const action = searchParams.get('action') || undefined
    const startDate = searchParams.get('start_date') ? new Date(searchParams.get('start_date')!) : undefined
    const endDate = searchParams.get('end_date') ? new Date(searchParams.get('end_date')!) : undefined
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const logs = await getAuditLogs({
      user_id: userId,
      table_name: tableName,
      action,
      start_date: startDate,
      end_date: endDate,
      limit,
      offset,
    })

    return NextResponse.json({ success: true, data: logs })
  } catch (error: any) {
    console.error('Erro ao buscar logs de auditoria:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar logs de auditoria' },
      { status: 500 }
    )
  }
}

