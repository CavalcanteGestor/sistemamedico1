import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { predictFollowUpPerformance } from '@/lib/services/follow-up-ai-service'

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
    const { leadId, tipoFollowUp } = body

    if (!leadId || !tipoFollowUp) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: leadId, tipoFollowUp' },
        { status: 400 }
      )
    }

    const prediction = await predictFollowUpPerformance(leadId, tipoFollowUp)

    return NextResponse.json({
      success: true,
      prediction,
    })
  } catch (error: any) {
    console.error('Erro ao prever performance:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao prever performance' },
      { status: 500 }
    )
  }
}

