import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendFollowUp, sendBulkFollowUp } from '@/lib/services/follow-up-service'

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
    const { followUpId, followUpIds } = body

    // Envio único
    if (followUpId) {
      await sendFollowUp(followUpId)
      return NextResponse.json({ success: true })
    }

    // Envio em lote
    if (followUpIds && Array.isArray(followUpIds)) {
      const result = await sendBulkFollowUp(followUpIds)
      return NextResponse.json({ success: true, data: result })
    }

    return NextResponse.json(
      { error: 'Forneça followUpId ou followUpIds' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Erro ao enviar follow-up:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao enviar follow-up' },
      { status: 500 }
    )
  }
}

