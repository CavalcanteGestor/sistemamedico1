import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendMessageAsStaff } from '@/lib/services/whatsapp-service'
import { rateLimiters } from '@/lib/middleware/rate-limit'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting para WhatsApp
    const rateLimitResponse = await rateLimiters.whatsapp(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

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
    const { phone, message, mediaUrl, mediaType, isTest } = body

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
      skipHumanSupport: isTest === true, // Não ativar atendimento humano para mensagens de teste
    })

    return NextResponse.json({ success: true, data: response })
  } catch (error: any) {
    // Tentar obter phone do body se possível, senão usar 'unknown'
    let phoneParam = 'unknown'
    try {
      const bodyClone = await request.clone().json().catch(() => ({}))
      phoneParam = bodyClone?.phone || 'unknown'
    } catch {
      // Ignorar se não conseguir parsear
    }
    logger.error('Erro ao enviar mensagem WhatsApp', error, { phone: phoneParam })
    return NextResponse.json(
      { error: error.message || 'Erro ao enviar mensagem' },
      { status: 500 }
    )
  }
}

