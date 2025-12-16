import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// PUT - Atualizar usuário (apenas admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    
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

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, role } = body

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, email, role' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Atualizar perfil
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ name, email, role })
      .eq('id', id)

    if (profileError) throw profileError

    // Atualizar email no auth se mudou
    const { data: currentProfile } = await adminClient
      .from('profiles')
      .select('email')
      .eq('id', id)
      .single()

    if (currentProfile && email !== currentProfile.email) {
      await adminClient.auth.admin.updateUserById(id, { email })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao atualizar usuário:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar usuário' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir usuário (apenas admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    
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

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Não permitir auto-exclusão
    if (id === user.id) {
      return NextResponse.json(
        { error: 'Você não pode excluir seu próprio usuário' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Deletar usuário (isso também deleta o perfil por CASCADE)
    const { error } = await adminClient.auth.admin.deleteUser(id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao excluir usuário:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao excluir usuário' },
      { status: 500 }
    )
  }
}

