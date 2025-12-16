import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createFollowUp } from '@/lib/services/follow-up-service'

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
    const {
      leadId,
      leadTelefone,
      leadNome,
      tipoFollowUp,
      tipoMensagem,
      mensagem,
      templateId,
      metadata,
      observacoes,
    } = body

    if (!leadTelefone || !tipoFollowUp || !tipoMensagem || !mensagem) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: leadTelefone, tipoFollowUp, tipoMensagem, mensagem' },
        { status: 400 }
      )
    }

    const result = await createFollowUp(
      {
        leadId,
        leadTelefone,
        leadNome,
        tipoFollowUp,
        tipoMensagem,
        mensagem,
        templateId,
        metadata,
        observacoes,
      },
      user.id
    )

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Erro ao criar follow-up:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar follow-up' },
      { status: 500 }
    )
  }
}

