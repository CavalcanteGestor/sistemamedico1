import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * API Route para enviar email de convite para médico definir senha
 * Usa resetPasswordForEmail que gera link e envia email automaticamente
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se é admin, recepcionista ou desenvolvedor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'recepcionista' && profile?.role !== 'desenvolvedor') {
      return NextResponse.json(
        { error: 'Apenas administradores, recepcionistas e desenvolvedores podem enviar convites' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, doctorName } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o usuário existe no Supabase Auth
    const adminClient = createAdminClient()
    const { data: users } = await adminClient.auth.admin.listUsers()
    const userExists = users?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase())

    if (!userExists) {
      return NextResponse.json(
        { error: 'Usuário não encontrado no sistema. Crie o médico primeiro.' },
        { status: 404 }
      )
    }

    // Usar a URL da aplicação para o redirect
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const redirectUrl = `${appUrl}/auth/confirm?type=recovery&next=/medico/definir-senha`

    try {
      // Gerar link de recuperação usando admin client
      // Isso cria um link válido que o médico pode usar para definir senha
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: redirectUrl,
        },
      })

      if (linkError) {
        throw linkError
      }

      // O generateLink não envia email automaticamente
      // Precisamos usar a API REST do Supabase para enviar o email
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Variáveis de ambiente do Supabase não configuradas')
      }

      // Enviar email usando a API REST do Supabase Auth
      // O endpoint /auth/v1/recover envia o email automaticamente
      const emailResponse = await fetch(`${supabaseUrl}/auth/v1/recover`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          redirect_to: redirectUrl,
        }),
      })

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text()
        console.error('Erro ao enviar email via Supabase API:', errorText)
        
        // Se falhar, retornar o link gerado para envio manual
        return NextResponse.json({
          success: false,
          message: 'Erro ao enviar email automaticamente, mas o link foi gerado',
          link: linkData?.properties?.action_link,
          note: 'Você pode copiar o link acima e enviar manualmente para o médico.',
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Email de convite enviado com sucesso. O médico receberá um link para definir sua senha.',
      })
    } catch (emailError: any) {
      console.error('Erro ao enviar email de convite:', emailError)
      throw emailError
    }
  } catch (error: any) {
    console.error('Erro ao enviar convite por email:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao enviar email de convite' },
      { status: 500 }
    )
  }
}

