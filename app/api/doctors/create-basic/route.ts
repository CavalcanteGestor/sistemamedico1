import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API Route para criar médico básico (sem login)
 * Usado pelo desenvolvedor para criar médico rapidamente
 * Admin pode completar informações depois
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se é desenvolvedor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'desenvolvedor') {
      return NextResponse.json(
        { error: 'Apenas desenvolvedores podem criar médicos básicos' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, crm, email } = body

    // Validações mínimas
    if (!name || !crm || !email) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, crm, email' },
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

    // Criar médico sem user_id (sem login ainda)
    const { data: newDoctor, error: doctorError } = await supabase
      .from('doctors')
      .insert({
        name,
        crm,
        email,
        phone: null,
        specialty_id: null,
        whatsapp_phone: null,
        active: true,
        user_id: null, // Sem login ainda
      })
      .select()
      .single()

    if (doctorError) {
      throw doctorError
    }

    return NextResponse.json({
      success: true,
      doctor: newDoctor,
      message: 'Médico básico criado com sucesso. Admin pode completar informações e criar login depois.',
    })
  } catch (error: any) {
    console.error('Erro ao criar médico básico:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar médico básico' },
      { status: 500 }
    )
  }
}

