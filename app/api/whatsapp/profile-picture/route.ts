import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProfilePicture } from '@/lib/services/whatsapp-service'
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
      .maybeSingle()

    if (!profile || !['admin', 'medico', 'recepcionista', 'desenvolvedor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const phone = searchParams.get('phone')

    if (!phone) {
      return NextResponse.json({ error: 'Telefone é obrigatório' }, { status: 400 })
    }

    try {
      const avatarUrl = await getProfilePicture(phone)
      
      return NextResponse.json({ 
        success: true, 
        avatar: avatarUrl,
      })
    } catch (apiError: any) {
      logger.error('Erro ao buscar foto de perfil da Evolution API', apiError, {
        phone,
      })
      
      return NextResponse.json({
        success: false,
        avatar: null,
        error: apiError.message || 'Erro ao buscar foto de perfil',
      }, { status: 500 })
    }
  } catch (error: any) {
    logger.error('Erro ao buscar foto de perfil', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar foto de perfil' },
      { status: 500 }
    )
  }
}

