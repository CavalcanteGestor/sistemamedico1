import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET - Listar todos os usuários (apenas admin)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Permitir admin e desenvolvedor
    if (profile?.role !== 'admin' && profile?.role !== 'desenvolvedor') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar todos os perfis
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ users: data || [] })
  } catch (error: any) {
    console.error('Erro ao listar usuários:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao listar usuários' },
      { status: 500 }
    )
  }
}

// POST - Criar novo usuário (apenas admin)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Permitir admin e desenvolvedor
    if (profile?.role !== 'admin' && profile?.role !== 'desenvolvedor') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, role } = body

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, email, password, role' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Criar usuário no Supabase Auth
    const { data: newUser, error: userError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role,
      },
    })

    if (userError || !newUser.user) {
      throw userError || new Error('Erro ao criar usuário')
    }

    // Criar perfil
    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: newUser.user.id,
      email,
      name,
      role,
    })

    if (profileError) throw profileError

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user.id,
        email,
        name,
        role,
      },
    })
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar usuário' },
      { status: 500 }
    )
  }
}

