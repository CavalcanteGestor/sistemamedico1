import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAIMessage } from '@/lib/services/follow-up-service'

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
    const { leadContexto, leadNome, tipoFollowUp, metadata, promptPersonalizado } = body

    if (!leadContexto || !leadNome || !tipoFollowUp) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: leadContexto, leadNome, tipoFollowUp' },
        { status: 400 }
      )
    }

    const mensagem = await generateAIMessage({
      leadContexto,
      leadNome,
      tipoFollowUp,
      metadata,
      promptPersonalizado,
    })

    return NextResponse.json({ success: true, mensagem })
  } catch (error: any) {
    console.error('Erro ao gerar mensagem com IA:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar mensagem com IA' },
      { status: 500 }
    )
  }
}

