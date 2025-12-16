import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verificar se o usuário está autenticado
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, role } = body

    // Verificar se o perfil já existe
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      return NextResponse.json({ success: true, message: 'Perfil já existe' })
    }

    // Criar perfil se não existir
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email!,
        name: name || user.user_metadata?.name || 'Usuário',
        role: role || user.user_metadata?.role || 'paciente',
      })

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError)
      return NextResponse.json(
        { error: 'Erro ao criar perfil', details: profileError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Perfil criado com sucesso' })
  } catch (error: any) {
    console.error('Erro na API de criar perfil:', error)
    return NextResponse.json(
      { error: 'Erro interno', details: error.message },
      { status: 500 }
    )
  }
}

