import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get('email')

    if (!email || !email.includes('@')) {
      return NextResponse.json({ exists: false })
    }

    const normalizedEmail = email.toLowerCase().trim()
    
    // Usar admin client para garantir acesso (não afetado por RLS)
    const adminClient = createAdminClient()

    // Verificar se existe usuário no auth.users (mais confiável)
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers()
    
    if (listError) {
      console.error('Erro ao listar usuários:', listError)
      // Fallback: tentar verificar na tabela profiles
      const supabase = await createClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle()
      
      return NextResponse.json({ 
        exists: !!profile,
        emailNotConfirmed: false
      })
    }

    // Buscar usuário pelo email
    const user = users?.find(u => u.email?.toLowerCase() === normalizedEmail)

    if (!user) {
      return NextResponse.json({ exists: false })
    }

    // Verificar se tem perfil
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle()

    // Usuário existe - retornar informações
    return NextResponse.json({
      exists: true,
      emailNotConfirmed: !user.email_confirmed_at,
      hasProfile: !!profile,
    })
  } catch (error: any) {
    console.error('Erro na API de verificação:', error)
    // Em caso de erro, retornar false para não bloquear login
    return NextResponse.json({ exists: false })
  }
}

