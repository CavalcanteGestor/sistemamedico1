import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBulkFollowUp } from '@/lib/services/follow-up-service'

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
      leads,
      tipoFollowUp,
      tipoMensagem,
      mensagem,
      templateId,
      metadata,
      observacoes,
      usarContexto,
      promptPersonalizado,
      agendadoPara,
      recorrente,
      tipoRecorrencia,
      intervaloRecorrencia,
      dataFimRecorrencia,
      proximaExecucao,
    } = body

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { error: 'Campo "leads" deve ser um array não vazio' },
        { status: 400 }
      )
    }

    if (!tipoFollowUp || !tipoMensagem) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: tipoFollowUp, tipoMensagem' },
        { status: 400 }
      )
    }

    // Se não for IA, mensagem é obrigatória
    if (tipoMensagem !== 'ia' && !mensagem) {
      return NextResponse.json(
        { error: 'Campo "mensagem" é obrigatório para tipo de mensagem fixa ou customizada' },
        { status: 400 }
      )
    }

    const result = await createBulkFollowUp(
      {
        leads,
        tipoFollowUp,
        tipoMensagem,
        mensagem,
        templateId,
        metadata,
        observacoes,
        usarContexto,
        promptPersonalizado,
        agendadoPara,
        recorrente,
        tipoRecorrencia,
        intervaloRecorrencia,
        dataFimRecorrencia,
        proximaExecucao,
      },
      user.id
    )

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Erro ao criar follow-ups em lote:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar follow-ups em lote' },
      { status: 500 }
    )
  }
}

