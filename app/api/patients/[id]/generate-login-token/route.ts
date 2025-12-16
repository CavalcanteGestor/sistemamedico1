import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

/**
 * Gera um token único e seguro para login do paciente
 */
function generateLoginToken(): string {
  return randomBytes(32).toString('hex')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const patientId = id

    // Verificar autenticação
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se é admin ou recepcionista
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'recepcionista') {
      return NextResponse.json(
        { error: 'Apenas administradores e recepcionistas podem gerar links de login' },
        { status: 403 }
      )
    }

    // Gerar novo token
    const loginToken = generateLoginToken()
    const tokenExpiresAt = new Date()
    tokenExpiresAt.setFullYear(tokenExpiresAt.getFullYear() + 1) // Token válido por 1 ano

    // Atualizar paciente com novo token
    const { error: updateError } = await supabase
      .from('patients')
      .update({
        login_token: loginToken,
        login_token_expires_at: tokenExpiresAt.toISOString(),
      })
      .eq('id', patientId)

    if (updateError) {
      console.error('Erro ao gerar token:', updateError)
      return NextResponse.json(
        { error: 'Erro ao gerar link de login' },
        { status: 500 }
      )
    }

    // Gerar URL do link de login
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const loginLink = `${appUrl}/login-paciente/${loginToken}`

    return NextResponse.json({
      success: true,
      loginLink,
      loginToken,
    })
  } catch (error: any) {
    console.error('Erro ao gerar token:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar link de login' },
      { status: 500 }
    )
  }
}

