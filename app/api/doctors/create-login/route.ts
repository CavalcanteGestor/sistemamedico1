import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimiters } from '@/lib/middleware/rate-limit'

/**
 * API Route para criar login para médico existente (sem user_id)
 * Permite completar cadastro de médico criado pelo desenvolvedor
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting para criação de recursos
    const rateLimitResponse = await rateLimiters.create(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se é admin ou recepcionista
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'recepcionista' && profile?.role !== 'desenvolvedor') {
      return NextResponse.json(
        { error: 'Apenas administradores e recepcionistas podem criar login para médicos' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { doctor_id, name, crm, email, phone, specialty_id, whatsapp_phone, active, password } = body

    if (!doctor_id || !name || !crm || !email || !phone) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: doctor_id, name, crm, email, phone' },
        { status: 400 }
      )
    }

    // Verificar se o médico existe e não tem login
    const { data: existingDoctor, error: doctorError } = await supabase
      .from('doctors')
      .select('id, user_id')
      .eq('id', doctor_id)
      .single()

    if (doctorError || !existingDoctor) {
      return NextResponse.json(
        { error: 'Médico não encontrado' },
        { status: 404 }
      )
    }

    if (existingDoctor.user_id) {
      return NextResponse.json(
        { error: 'Este médico já possui login' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Verificar se o email já está em uso
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const emailExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase())

    if (emailExists) {
      return NextResponse.json(
        { error: 'Este email já está cadastrado no sistema' },
        { status: 400 }
      )
    }

    // Gerar senha temporária muito forte (será alterada pelo médico)
    // O médico receberá um email para definir sua própria senha
    const tempPassword = password || `Temp${Math.random().toString(36).slice(-12)}${Date.now().toString(36)}!@#`

    // Criar usuário no Supabase Auth
    const { data: newUser, error: userError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'medico',
        must_change_password: true, // Forçar mudança de senha no primeiro login
      },
    })

    if (userError || !newUser.user) {
      throw userError || new Error('Erro ao criar usuário')
    }

    // Criar perfil com role=medico
    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: newUser.user.id,
      email,
      name,
      role: 'medico',
    })

    if (profileError) {
      // Limpar usuário criado em caso de erro
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      throw profileError
    }

    // Formatar WhatsApp phone se fornecido
    let formattedWhatsappPhone = whatsapp_phone
    if (formattedWhatsappPhone && !formattedWhatsappPhone.includes('@s.whatsapp.net')) {
      const cleaned = formattedWhatsappPhone.replace(/\D/g, '')
      if (cleaned.length >= 10) {
        formattedWhatsappPhone = `${cleaned}@s.whatsapp.net`
      } else {
        formattedWhatsappPhone = null
      }
    }

    // Atualizar médico com user_id e demais informações
    const { data: updatedDoctor, error: updateError } = await supabase
      .from('doctors')
      .update({
        user_id: newUser.user.id,
        name,
        crm,
        specialty_id: specialty_id || null,
        phone,
        email,
        whatsapp_phone: formattedWhatsappPhone || null,
        active: active ?? true,
      })
      .eq('id', doctor_id)
      .select()
      .single()

    if (updateError) {
      // Limpar usuário e perfil criados em caso de erro
      await adminClient.from('profiles').delete().eq('id', newUser.user.id)
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      throw updateError
    }

    // Enviar email com link para definir senha (não bloqueia criação do login)
    if (!password) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        // O redirect_to deve ser simples, o Supabase adicionará token_hash automaticamente
        // Quando o usuário chegar em /auth/confirm, ele será redirecionado para /medico/definir-senha
        const redirectUrl = `${appUrl}/auth/confirm?type=recovery&next=/medico/definir-senha`

        // Usar API REST do Supabase para enviar email de recuperação
        // IMPORTANTE: O redirect_to DEVE estar na lista de URLs permitidas no Supabase
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (supabaseUrl && serviceRoleKey) {
          const response = await fetch(`${supabaseUrl}/auth/v1/recover`, {
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

          if (!response.ok) {
            const errorText = await response.text()
            console.error('Erro ao enviar email via Supabase API:', errorText)
            console.error('redirect_to usado:', redirectUrl)
          } else {
            console.log('Email de convite enviado para:', email, 'com redirect_to:', redirectUrl)
          }
        }
      } catch (emailError) {
        // Se falhar ao enviar email, não bloquear criação do login
        console.error('Erro ao enviar email de convite (não crítico):', emailError)
      }
    }

    return NextResponse.json({
      success: true,
      doctor: updatedDoctor,
      message: password 
        ? 'Login criado com sucesso com senha definida.' 
        : 'Login criado com sucesso. Um email foi enviado para o médico definir sua senha.',
      emailSent: !password, // Indica se o email foi enviado
    })
  } catch (error: any) {
    console.error('Erro ao criar login para médico:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar login para médico' },
      { status: 500 }
    )
  }
}

