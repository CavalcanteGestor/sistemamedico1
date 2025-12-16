import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAllChats } from '@/lib/services/whatsapp-service'

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

    // Buscar conversas DIRETAMENTE da Evolution API (como WhatsApp Web)
    try {
      console.log('[API /whatsapp/chats] Iniciando busca de conversas...')
      console.log('[API /whatsapp/chats] EVOLUTION_API_URL:', process.env.EVOLUTION_API_URL || process.env.NEXT_PUBLIC_EVOLUTION_API_URL)
      console.log('[API /whatsapp/chats] EVOLUTION_INSTANCE_NAME:', process.env.EVOLUTION_INSTANCE_NAME)
      
      const chats = await getAllChats()
      
      console.log(`[API /whatsapp/chats] Total de conversas encontradas: ${chats?.length || 0}`)
      
      if (chats.length === 0) {
        console.warn('[API /whatsapp/chats] ⚠️ Nenhuma conversa encontrada. Verifique os logs anteriores para ver quais endpoints foram testados.')
      }
      
      return NextResponse.json({ 
        success: true, 
        data: chats || [],
      })
    } catch (apiError: any) {
      console.error('[API /whatsapp/chats] Erro ao buscar da Evolution API:', apiError)
      
      // Se der erro na Evolution API, retornar erro detalhado
      return NextResponse.json({
        success: false,
        error: apiError.message || 'Erro ao buscar conversas da Evolution API',
        details: {
          message: apiError.message,
          url: process.env.EVOLUTION_API_URL || process.env.NEXT_PUBLIC_EVOLUTION_API_URL,
          instance: process.env.EVOLUTION_INSTANCE_NAME,
        }
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Erro ao buscar conversas:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar conversas' },
      { status: 500 }
    )
  }
}

