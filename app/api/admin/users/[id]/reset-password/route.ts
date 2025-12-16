import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST - Redefinir senha do usuário (apenas admin)
export async function POST(
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
    const { password } = body

    if (!password) {
      return NextResponse.json(
        { error: 'Campo obrigatório: password' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Atualizar senha
    const { error } = await adminClient.auth.admin.updateUserById(id, {
      password,
    })

    if (error) throw error

    return NextResponse.json({ success: true, password })
  } catch (error: any) {
    console.error('Erro ao redefinir senha:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao redefinir senha' },
      { status: 500 }
    )
  }
}

