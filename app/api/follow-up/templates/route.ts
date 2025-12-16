import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFollowUpTemplates } from '@/lib/services/follow-up-service'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const tipoFollowUp = searchParams.get('tipoFollowUp') || undefined

    const templates = await getFollowUpTemplates(tipoFollowUp)

    return NextResponse.json({ success: true, data: templates })
  } catch (error: any) {
    console.error('Erro ao buscar templates:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar templates' },
      { status: 500 }
    )
  }
}

