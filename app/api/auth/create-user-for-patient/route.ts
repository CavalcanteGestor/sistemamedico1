import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimiters } from '@/lib/middleware/rate-limit'
import { randomBytes } from 'crypto'
import { logger } from '@/lib/logger'

// Senha padrão para novos pacientes
const DEFAULT_PATIENT_PASSWORD = 'paciente123'

/**
 * Gera um username baseado no nome do paciente
 */
function generateUsername(name: string, patientId?: string): string {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .substring(0, 20)
  
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

    const body = await request.json()
    const { patientId, email, name } = body

    if (!patientId || !email || !name) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Verificar se o paciente existe
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, email, name, user_id')
      .eq('id', patientId)
      .single()

    if (patientError || !patient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }

    // Se já tem user_id, retornar sucesso
    if (patient.user_id) {
      return NextResponse.json({
        success: true,
        userId: patient.user_id,
        message: 'Paciente já possui conta de usuário',
      })
    }

    // Verificar se o email já está em uso
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const emailExists = existingUsers?.users?.some(u => u.email === email)

    if (emailExists) {
      // Se o email existe, tentar vincular ao paciente
      const existingUser = existingUsers.users.find(u => u.email === email)
      if (existingUser) {
        await supabase
          .from('patients')
          .update({ user_id: existingUser.id })
          .eq('id', patientId)

        // Criar perfil se não existir (usando admin client para ignorar RLS)
        await adminClient.from('profiles').upsert({
          id: existingUser.id,
          email,
          name,
          role: 'paciente',
        })

        return NextResponse.json({
          success: true,
          userId: existingUser.id,
          message: 'Usuário existente vinculado ao paciente',
        })
      }
    }

    // Gerar username
    const username = generateUsername(name, patientId)

    // Criar usuário no Supabase Auth
    const { data: newUser, error: userError } = await adminClient.auth.admin.createUser({
      email,
      password: DEFAULT_PATIENT_PASSWORD,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'paciente',
        username,
        must_change_password: true,
      },
    })

    if (userError || !newUser.user) {
      logger.error('Erro ao criar usuário para paciente', userError)
      return NextResponse.json(
        { error: userError?.message || 'Erro ao criar usuário' },
        { status: 500 }
      )
    }

    // Atualizar paciente com user_id
    const { error: updateError } = await supabase
      .from('patients')
      .update({ user_id: newUser.user.id })
      .eq('id', patientId)

    if (updateError) {
      logger.error('Erro ao vincular usuário ao paciente', updateError)
      // Tentar limpar
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json(
        { error: 'Erro ao vincular usuário ao paciente' },
        { status: 500 }
      )
    }

    // Criar perfil (usando admin client para ignorar RLS)
    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: newUser.user.id,
      email,
      name,
      role: 'paciente',
    })

    if (profileError && !profileError.message.includes('duplicate')) {
      logger.error('Erro ao criar perfil para paciente', profileError)
    }

    return NextResponse.json({
      success: true,
      userId: newUser.user.id,
      message: 'Usuário criado com sucesso',
    })
  } catch (error: any) {
    logger.error('Erro ao criar usuário para paciente', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar usuário' },
      { status: 500 }
    )
  }
}

