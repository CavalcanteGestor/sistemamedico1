import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Atualizar um lead
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar permissão - apenas admin e recepcionista podem editar
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'recepcionista', 'desenvolvedor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    // Campos que podem ser atualizados
    const updateData: Record<string, any> = {}
    const allowedFields = ['nome', 'telefone', 'email', 'etapa', 'interesse', 'origem', 'observacoes', 'status', 'contexto', 'mensagem']

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    })

    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar lead:', error)
      return NextResponse.json(
        { error: 'Erro ao atualizar lead: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Erro ao atualizar lead:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar lead' },
      { status: 500 }
    )
  }
}

/**
 * Verificar se lead já é paciente
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { id } = await params

    // Buscar lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('telefone, email, nome, status')
      .eq('id', id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    }

    // Verificar se já é paciente - buscar por telefone ou email
    let patient = null
    const phoneClean = lead.telefone?.replace('@s.whatsapp.net', '').trim()
    
    if (phoneClean) {
      const { data: patientByPhone } = await supabase
        .from('patients')
        .select('id, name, cpf, phone, email')
        .eq('phone', phoneClean)
        .maybeSingle()
      
      if (patientByPhone) {
        patient = patientByPhone
      }
    }

    // Se não encontrou por telefone e tem email, tentar por email
    if (!patient && lead.email) {
      const { data: patientByEmail } = await supabase
        .from('patients')
        .select('id, name, cpf, phone, email')
        .eq('email', lead.email.trim())
        .maybeSingle()
      
      if (patientByEmail) {
        patient = patientByEmail
      }
    }

    return NextResponse.json({
      success: true,
      isPatient: !!patient,
      patient: patient || null,
      leadStatus: lead.status,
    })
  } catch (error: any) {
    console.error('Erro ao verificar lead:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao verificar lead' },
      { status: 500 }
    )
  }
}

