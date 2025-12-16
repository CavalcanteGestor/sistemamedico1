import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendBulkFollowUp } from '@/lib/services/follow-up-service'

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
    const { followUpIds } = body

    if (!followUpIds || !Array.isArray(followUpIds) || followUpIds.length === 0) {
      return NextResponse.json(
        { error: 'Campo "followUpIds" deve ser um array não vazio' },
        { status: 400 }
      )
    }

    const result = await sendBulkFollowUp(followUpIds)

    return NextResponse.json({
      success: true,
      data: {
        success: result.success.length,
        failed: result.failed.length,
        total: followUpIds.length,
      },
    })
  } catch (error: any) {
    console.error('Erro ao enviar follow-ups em lote:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao enviar follow-ups em lote' },
      { status: 500 }
    )
  }
}

