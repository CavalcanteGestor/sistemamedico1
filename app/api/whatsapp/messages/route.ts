import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getConversationMessages } from '@/lib/services/whatsapp-service'

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

    const searchParams = request.nextUrl.searchParams
    const phone = searchParams.get('phone')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!phone) {
      return NextResponse.json({ error: 'Telefone é obrigatório' }, { status: 400 })
    }

    const messages = await getConversationMessages(phone, limit, offset)
    
    return NextResponse.json({ success: true, data: messages })
  } catch (error: any) {
    console.error('Erro ao buscar mensagens:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar mensagens' },
      { status: 500 }
    )
  }
}

