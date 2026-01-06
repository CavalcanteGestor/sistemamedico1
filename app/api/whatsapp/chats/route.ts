import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAllChats } from '@/lib/services/whatsapp-service'
import { logger } from '@/lib/logger'

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
      const chats = await getAllChats()
      
      if (chats.length === 0) {
        logger.warn('Nenhuma conversa encontrada na Evolution API', {
          evolutionApiUrl: process.env.EVOLUTION_API_URL || process.env.NEXT_PUBLIC_EVOLUTION_API_URL,
          instanceName: process.env.EVOLUTION_INSTANCE_NAME,
        })
        
        // Retornar sucesso mas com array vazio e mensagem informativa
        return NextResponse.json({ 
          success: true, 
          data: [],
          message: 'Nenhuma conversa encontrada. Verifique se o WhatsApp está conectado na Evolution API.',
          debug: {
            url: process.env.EVOLUTION_API_URL || process.env.NEXT_PUBLIC_EVOLUTION_API_URL,
            instance: process.env.EVOLUTION_INSTANCE_NAME,
            hasUrl: !!process.env.EVOLUTION_API_URL,
            hasKey: !!process.env.EVOLUTION_API_KEY,
            hasInstance: !!process.env.EVOLUTION_INSTANCE_NAME,
          }
        })
      }
      
      return NextResponse.json({ 
        success: true, 
        data: chats || [],
      })
    } catch (apiError: any) {
      logger.error('Erro ao buscar conversas da Evolution API', apiError, {
        url: process.env.EVOLUTION_API_URL || process.env.NEXT_PUBLIC_EVOLUTION_API_URL,
        instance: process.env.EVOLUTION_INSTANCE_NAME,
      })
      
      // Se der erro na Evolution API, retornar erro detalhado
      return NextResponse.json({
        success: false,
        error: apiError.message || 'Erro ao buscar conversas da Evolution API',
        details: {
          message: apiError.message,
          url: process.env.EVOLUTION_API_URL || process.env.NEXT_PUBLIC_EVOLUTION_API_URL,
          instance: process.env.EVOLUTION_INSTANCE_NAME,
          hasUrl: !!process.env.EVOLUTION_API_URL,
          hasKey: !!process.env.EVOLUTION_API_KEY,
          hasInstance: !!process.env.EVOLUTION_INSTANCE_NAME,
        }
      }, { status: 500 })
    }
  } catch (error: any) {
    logger.error('Erro ao buscar conversas', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar conversas' },
      { status: 500 }
    )
  }
}

