import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOrcamento } from '@/lib/services/orcamento-service'

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
      procedimentos,
      valores,
      validadeAte,
      observacoes,
    } = body

    if (!leadTelefone || !procedimentos || procedimentos.length === 0 || !valores) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: leadTelefone, procedimentos, valores' },
        { status: 400 }
      )
    }

    const result = await createOrcamento(
      {
        leadId,
        leadTelefone,
        leadNome,
        procedimentos,
        valores,
        validadeAte: validadeAte ? new Date(validadeAte) : undefined,
        observacoes,
      },
      user.id
    )

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Erro ao criar orçamento:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar orçamento' },
      { status: 500 }
    )
  }
}

