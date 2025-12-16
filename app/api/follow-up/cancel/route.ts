import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cancelFollowUp } from '@/lib/services/follow-up-service'

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
      .single()

    if (!profile || !['admin', 'medico', 'recepcionista'].includes(profile.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const { followUpId } = body

    if (!followUpId) {
      return NextResponse.json({ error: 'followUpId é obrigatório' }, { status: 400 })
    }

    await cancelFollowUp(followUpId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao cancelar follow-up:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao cancelar follow-up' },
      { status: 500 }
    )
  }
}

