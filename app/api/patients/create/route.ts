import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomBytes } from 'crypto'
import { rateLimiters } from '@/lib/middleware/rate-limit'
import { logAudit, extractRequestInfo } from '@/lib/services/audit-service'

// Senha padrão para novos pacientes
const DEFAULT_PATIENT_PASSWORD = 'paciente123'

/**
 * Gera um token único e seguro para login do paciente
 */
function generateLoginToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Gera um username baseado no nome do paciente
 */
function generateUsername(name: string, patientId?: string): string {
  // Remove acentos e espaços, converte para minúsculas
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .substring(0, 20) // Limita a 20 caracteres
  
  // Adiciona últimos 4 dígitos do ID se fornecido para garantir unicidade
  if (patientId) {
    const idSuffix = patientId.substring(patientId.length - 4)
    return `${normalized}${idSuffix}`
  }
  
  return normalized
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting para criação de recursos
    const rateLimitResponse = await rateLimiters.create(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Verificar autenticação do usuário atual (que está criando o paciente)
    const supabase = await createClient()
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se é admin ou recepcionista
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'recepcionista') {
      return NextResponse.json(
        { error: 'Apenas administradores e recepcionistas podem criar pacientes' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, cpf, birth_date, phone, email, address, city, state, zip_code, emergency_contact, emergency_phone, allergies, chronic_conditions } = body

    // Validar campos obrigatórios
    if (!name || !cpf || !birth_date || !phone || !email) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: nome, CPF, data de nascimento, telefone e email' },
        { status: 400 }
      )
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      )
    }

    // Usar admin client para criar usuário
    const adminClient = createAdminClient()

    // Normalizar email antes de verificar
    const normalizedEmail = email.trim().toLowerCase()

    // Verificar se o email já está em uso
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const emailExists = existingUsers?.users?.some(u => u.email === normalizedEmail)

    if (emailExists) {
      return NextResponse.json(
        { error: 'Este email já está cadastrado no sistema' },
        { status: 400 }
      )
    }

    // Verificar se CPF já existe
    const { data: existingPatient } = await supabase
      .from('patients')
      .select('id')
      .eq('cpf', cpf)
      .single()

    if (existingPatient) {
      return NextResponse.json(
        { error: 'CPF já cadastrado no sistema' },
        { status: 400 }
      )
    }

    // Gerar token único de login
    const loginToken = generateLoginToken()
    const tokenExpiresAt = new Date()
    tokenExpiresAt.setFullYear(tokenExpiresAt.getFullYear() + 1) // Token válido por 1 ano

    // Criar paciente primeiro para obter o ID
    const { data: newPatient, error: patientError } = await supabase
      .from('patients')
      .insert({
        name,
        cpf,
        birth_date,
        phone,
        email: normalizedEmail,
        address,
        city,
        state,
        zip_code,
        emergency_contact,
        emergency_phone,
        allergies: allergies || [],
        chronic_conditions: chronic_conditions || [],
        portal_access_enabled: true,
        login_token: loginToken,
        login_token_expires_at: tokenExpiresAt.toISOString(),
      })
      .select()
      .single()

    if (patientError) {
      console.error('Erro ao criar paciente:', patientError)
      return NextResponse.json(
        { error: patientError.message || 'Erro ao criar paciente' },
        { status: 500 }
      )
    }

    // Gerar username baseado no nome e ID do paciente
    const username = generateUsername(name, newPatient.id)

    // Criar usuário no Supabase Auth (usando admin API)
    const { data: newUser, error: userError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: DEFAULT_PATIENT_PASSWORD,
      email_confirm: true, // Confirma email automaticamente
      user_metadata: {
        name,
        role: 'paciente',
        username,
        must_change_password: true, // Marca que precisa alterar senha
      },
    })

    if (userError || !newUser.user) {
      console.error('Erro ao criar usuário:', userError)
      // Se falhar ao criar usuário, deleta o paciente criado
      await supabase.from('patients').delete().eq('id', newPatient.id)
      return NextResponse.json(
        { error: userError?.message || 'Erro ao criar usuário' },
        { status: 500 }
      )
    }

    // Atualizar paciente com user_id
    const { error: updatePatientError } = await supabase
      .from('patients')
      .update({ user_id: newUser.user.id })
      .eq('id', newPatient.id)

    if (updatePatientError) {
      console.error('Erro ao vincular usuário ao paciente:', updatePatientError)
      // Se falhar, tenta limpar
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      await supabase.from('patients').delete().eq('id', newPatient.id)
      return NextResponse.json(
        { error: 'Erro ao vincular usuário ao paciente' },
        { status: 500 }
      )
    }

    // Criar perfil na tabela profiles (usando admin client para ignorar RLS)
    const { error: profileError } = await adminClient.from('profiles').insert({
      id: newUser.user.id,
      email: normalizedEmail,
      name,
      role: 'paciente',
    })

    if (profileError && !profileError.message.includes('duplicate')) {
      console.error('Erro ao criar perfil:', profileError)
      // Limpar se falhar
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      await supabase.from('patients').delete().eq('id', newPatient.id)
      return NextResponse.json(
        { error: 'Erro ao criar perfil do usuário' },
        { status: 500 }
      )
    }

    // Gerar URL do link de login
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const loginLink = `${appUrl}/login-paciente/${loginToken}`

    // Registrar auditoria
    const requestInfo = extractRequestInfo(request)
    await logAudit({
      user_id: currentUser.id,
      action: 'create',
      table_name: 'patients',
      record_id: newPatient.id,
      new_values: {
        name,
        cpf,
        email: normalizedEmail,
        phone,
      },
      ...requestInfo,
    })

    return NextResponse.json({
      success: true,
      patient: { ...newPatient, user_id: newUser.user.id },
      loginCredentials: {
        email: normalizedEmail,
        username,
        password: DEFAULT_PATIENT_PASSWORD,
        mustChangePassword: true,
      },
      loginLink, // Link único para o paciente
      loginToken, // Token para exibir na interface
    })
  } catch (error: any) {
    console.error('Erro ao criar paciente:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar paciente' },
      { status: 500 }
    )
  }
}

