import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    const leadTelefone = searchParams.get('leadTelefone')
    const status = searchParams.get('status')

    let query = supabase
      .from('orcamentos')
      .select('*')
      .order('criado_em', { ascending: false })

    if (leadTelefone) {
      query = query.eq('lead_telefone', leadTelefone)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Erro ao buscar orçamentos:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar orçamentos' },
      { status: 500 }
    )
  }
}

