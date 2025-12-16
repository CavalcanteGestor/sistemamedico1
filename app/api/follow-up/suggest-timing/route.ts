import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { suggestOptimalTiming } from '@/lib/services/follow-up-ai-service'

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
    const { leadId } = body

    if (!leadId) {
      return NextResponse.json(
        { error: 'Campo "leadId" é obrigatório' },
        { status: 400 }
      )
    }

    const suggestion = await suggestOptimalTiming(leadId)

    return NextResponse.json({
      success: true,
      suggestion,
    })
  } catch (error: any) {
    console.error('Erro ao sugerir timing:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao sugerir timing' },
      { status: 500 }
    )
  }
}

