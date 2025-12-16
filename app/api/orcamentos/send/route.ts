import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendOrcamento } from '@/lib/services/orcamento-service'

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
    const { orcamentoId, mensagemPersonalizada } = body

    if (!orcamentoId) {
      return NextResponse.json(
        { error: 'orcamentoId é obrigatório' },
        { status: 400 }
      )
    }

    await sendOrcamento({
      orcamentoId,
      mensagemPersonalizada,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao enviar orçamento:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao enviar orçamento' },
      { status: 500 }
    )
  }
}

