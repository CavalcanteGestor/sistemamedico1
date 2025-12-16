import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { activateHumanSupport, deactivateHumanSupport } from '@/lib/services/whatsapp-service'

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
    const { phone, active } = body

    if (!phone) {
      return NextResponse.json({ error: 'Telefone é obrigatório' }, { status: 400 })
    }

    if (active) {
      await activateHumanSupport(phone, user.id)
    } else {
      await deactivateHumanSupport(phone)
    }

    return NextResponse.json({ success: true, active })
  } catch (error: any) {
    console.error('Erro ao controlar atendimento humano:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao controlar atendimento humano' },
      { status: 500 }
    )
  }
}

