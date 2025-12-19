import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * API Route para reenviar email de convite para médico
 * Rate limiting: 1 minuto entre envios por médico
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
        { error: 'Apenas administradores, recepcionistas e desenvolvedores podem reenviar emails' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { doctorId } = body

    if (!doctorId) {
      return NextResponse.json(
        { error: 'ID do médico é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar dados do médico
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('id, name, email, user_id')
      .eq('id', doctorId)
      .single()

    if (doctorError || !doctor) {
      return NextResponse.json(
        { error: 'Médico não encontrado' },
        { status: 404 }
      )
    }

    if (!doctor.email) {
      return NextResponse.json(
        { error: 'Médico não possui email cadastrado' },
        { status: 400 }
      )
    }

    // Verificar se o médico tem user_id (tem login)
    if (!doctor.user_id) {
      return NextResponse.json(
        { error: 'Médico não possui login. Crie um login primeiro.' },
        { status: 400 }
      )
    }

    // Verificar rate limiting (1 minuto)
    // Buscar último envio na tabela de logs ou usar metadata do médico
    const adminClient = createAdminClient()
    
    // Buscar informações do usuário para verificar último envio
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(doctor.user_id)
    
    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Erro ao buscar informações do usuário' },
        { status: 500 }
      )
    }

    // Verificar último envio no metadata (usaremos metadata para armazenar timestamp do último envio)
    const lastEmailSentAt = userData.user.user_metadata?.last_invite_email_sent_at
    
    if (lastEmailSentAt) {
      const lastSent = new Date(lastEmailSentAt)
      const now = new Date()
      const diffInSeconds = Math.floor((now.getTime() - lastSent.getTime()) / 1000)
      
      if (diffInSeconds < 60) {
        const remainingSeconds = 60 - diffInSeconds
        return NextResponse.json(
          { 
            error: 'Aguarde antes de reenviar',
            message: `Você pode reenviar o email em ${remainingSeconds} segundo(s).`,
            cooldownSeconds: remainingSeconds,
          },
          { status: 429 } // Too Many Requests
        )
      }
    }

    // Enviar email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    // O redirect_to deve ser simples, o Supabase adicionará token_hash automaticamente
    // Quando o usuário chegar em /auth/confirm, ele será redirecionado para /medico/definir-senha
    const redirectUrl = `${appUrl}/auth/confirm?type=recovery&next=/medico/definir-senha`

    try {
      // Chamar API REST do Supabase para enviar email de recuperação
      // IMPORTANTE: O redirect_to DEVE estar na lista de URLs permitidas no Supabase
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Variáveis de ambiente do Supabase não configuradas')
      }

      console.log('Enviando email para:', doctor.email, 'com redirect_to:', redirectUrl)

      // Enviar email usando a API REST com redirect_to correto
      const emailResponse = await fetch(`${supabaseUrl}/auth/v1/recover`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: doctor.email,
          redirect_to: redirectUrl,
        }),
      })

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text()
        console.error('Erro ao enviar email via Supabase API:', errorText)
        console.error('Status:', emailResponse.status)
        console.error('redirect_to usado:', redirectUrl)
        
        throw new Error(`Erro ao enviar email de recuperação: ${errorText}`)
      }

      // Atualizar metadata do usuário com timestamp do último envio
      await adminClient.auth.admin.updateUserById(doctor.user_id, {
        user_metadata: {
          ...userData.user.user_metadata,
          last_invite_email_sent_at: new Date().toISOString(),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Email de convite reenviado com sucesso!',
      })
    } catch (emailError: any) {
      console.error('Erro ao reenviar email:', emailError)
      return NextResponse.json(
        { error: emailError.message || 'Erro ao reenviar email de convite' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Erro ao reenviar convite por email:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao reenviar email de convite' },
      { status: 500 }
    )
  }
}

