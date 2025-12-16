import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { endTelemedicineSession } from '@/lib/services/telemedicine-service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { id } = await params
    const sessionId = id

    // Verificar se o usuário tem permissão
    const { data: session, error: sessionError } = await supabase
      .from('telemedicine_sessions')
      .select(`
        *,
        appointments:appointment_id (
          *,
          doctors:doctor_id (user_id)
        )
      `)
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      )
    }

    // Verificar permissão
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'medico') {
      if (session.appointments?.doctors?.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Sem permissão para encerrar esta sessão' },
          { status: 403 }
        )
      }
    }

    // Encerrar sessão
    await endTelemedicineSession(sessionId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao encerrar sessão:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao encerrar sessão' },
      { status: 500 }
    )
  }
}

