import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFollowUpHistory } from '@/lib/services/follow-up-service'

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

    const { searchParams } = new URL(request.url)
    const leadTelefone = searchParams.get('leadTelefone')

    if (!leadTelefone) {
      return NextResponse.json(
        { error: 'leadTelefone é obrigatório' },
        { status: 400 }
      )
    }

    const history = await getFollowUpHistory(leadTelefone)

    return NextResponse.json({ success: true, data: history })
  } catch (error: any) {
    console.error('Erro ao buscar histórico de follow-ups:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar histórico' },
      { status: 500 }
    )
  }
}

