import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimiters } from '@/lib/middleware/rate-limit'
import { logger } from '@/lib/logger'
import { logAudit, extractRequestInfo } from '@/lib/services/audit-service'

/**
 * API Route para criar médico com login próprio
 * Garante que o médico tenha user_id e role=medico no profiles
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
        { error: 'Apenas administradores, recepcionistas e desenvolvedores podem criar médicos' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, crm, specialty_id, phone, email, whatsapp_phone, active = true, password } = body

    // Validações básicas
    if (!name || !crm || !specialty_id || !phone || !email) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, crm, specialty_id, phone, email' },
        { status: 400 }
      )
    }

    // Verificar se CRM já existe
    const { data: existingDoctor } = await supabase
      .from('doctors')
      .select('id')
      .eq('crm', crm)
      .maybeSingle()

    if (existingDoctor) {
      return NextResponse.json(
        { error: 'CRM já cadastrado no sistema' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Verificar se o email já está em uso
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const emailExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase())

    if (emailExists) {
      // Se o email existe, buscar o user_id e verificar se já é médico
      const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
      if (existingUser) {
        const { data: existingProfile } = await adminClient
          .from('profiles')
          .select('role')
          .eq('id', existingUser.id)
          .maybeSingle()

        if (existingProfile?.role === 'medico') {
          // Verificar se já existe médico com esse user_id
          const { data: doctorWithUserId } = await supabase
            .from('doctors')
            .select('id')
            .eq('user_id', existingUser.id)
            .maybeSingle()

          if (doctorWithUserId) {
            return NextResponse.json(
              { error: 'Este email já está cadastrado como médico no sistema' },
              { status: 400 }
            )
          }

          // Usar o usuário existente (já é médico)
          // Criar registro na tabela doctors
          const { data: newDoctor, error: doctorError } = await supabase
            .from('doctors')
            .insert({
              user_id: existingUser.id,
              name,
              crm,
              specialty_id,
              phone,
              email,
              whatsapp_phone: whatsapp_phone || null,
              active,
            })
            .select()
            .single()

          if (doctorError) throw doctorError

          return NextResponse.json({
            success: true,
            doctor: newDoctor,
            message: 'Médico cadastrado com sucesso (usando login existente)',
          })
        }
      }

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

    // Criar registro na tabela doctors
    const { data: newDoctor, error: doctorError } = await supabase
      .from('doctors')
      .insert({
        user_id: newUser.user.id,
        name,
        crm,
        specialty_id,
        phone,
        email,
        whatsapp_phone: formattedWhatsappPhone || null,
        active,
      })
      .select()
      .single()

    if (doctorError) {
      // Limpar usuário e perfil criados em caso de erro
      await adminClient.from('profiles').delete().eq('id', newUser.user.id)
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      throw doctorError
    }

    // Enviar email com link para definir senha (não bloqueia criação do médico)
    if (!password) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        // O redirect_to deve ser simples, o Supabase adicionará token_hash automaticamente
        // Quando o usuário chegar em /auth/confirm, ele será redirecionado para /medico/definir-senha
        const redirectUrl = `${appUrl}/auth/confirm?type=recovery&next=/medico/definir-senha`

        // Usar generateLink do Admin API para ter controle total sobre o link
        const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
          type: 'recovery',
          email: email,
          options: {
            redirectTo: redirectUrl,
          },
        })

        if (linkError) {
          logger.error('Erro ao gerar link de recuperação', linkError)
          // Tentar método alternativo usando API REST
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
              logger.error('Erro ao enviar email via Supabase API', undefined, { errorText })
              // Não bloquear criação do médico se email falhar
            }
          }
        } else if (linkData?.properties?.action_link) {
          // O generateLink não envia email automaticamente, precisamos usar o link gerado
          // Mas para enviar o email, ainda precisamos usar a API de recover
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

          if (supabaseUrl && serviceRoleKey) {
            // Extrair o token do link gerado para construir a URL correta
            const actionLink = new URL(linkData.properties.action_link)
            const token = actionLink.searchParams.get('token')
            
            if (token) {
              // Construir URL correta com token_hash (supabase usa token_hash na verificação)
              const verifyUrl = `${supabaseUrl}/auth/v1/verify?token=${token}&type=recovery&redirect_to=${encodeURIComponent(redirectUrl)}`
              
              // Usar a API de recover para enviar o email, mas com redirect_to correto
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
                logger.error('Erro ao enviar email via Supabase API', undefined, { errorText })
              } else {
                logger.info('Email de convite enviado', { email, redirectUrl })
              }
            }
          }
        }
      } catch (emailError) {
        // Se falhar ao enviar email, não bloquear criação do médico
        logger.warn('Erro ao enviar email de convite (não crítico)', { error: emailError })
      }
    }

    // Registrar auditoria
    const requestInfo = extractRequestInfo(request)
    await logAudit({
      user_id: user.id,
      action: 'create',
      table_name: 'doctors',
      record_id: newDoctor.id,
      new_values: {
        name,
        crm,
        email,
        specialty_id,
      },
      ...requestInfo,
    })

    return NextResponse.json({
      success: true,
      doctor: newDoctor,
      message: password 
        ? 'Médico cadastrado com sucesso com senha definida.' 
        : 'Médico cadastrado com sucesso. Um email foi enviado para o médico definir sua senha.',
      emailSent: !password, // Indica se o email foi enviado
    })
  } catch (error: any) {
    logger.error('Erro ao criar médico', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar médico' },
      { status: 500 }
    )
  }
}

