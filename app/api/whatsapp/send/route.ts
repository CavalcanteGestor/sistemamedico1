import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendMessageAsStaff } from '@/lib/services/whatsapp-service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar permissão (admin, medico, recepcionista)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'medico', 'recepcionista'].includes(profile.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const { phone, message, mediaUrl, mediaType } = body

    if (!phone) {
      return NextResponse.json({ error: 'Telefone é obrigatório' }, { status: 400 })
    }

    // Permitir enviar só com mídia (sem texto)
    if (!message && !mediaUrl) {
      return NextResponse.json({ error: 'Mensagem ou mídia é obrigatória' }, { status: 400 })
    }

    const response = await sendMessageAsStaff({
      phone,
      message,
      mediaUrl,
      mediaType,
      userId: user.id,
    })

    return NextResponse.json({ success: true, data: response })
  } catch (error: any) {
    console.error('Erro ao enviar mensagem WhatsApp:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao enviar mensagem' },
      { status: 500 }
    )
  }
}

