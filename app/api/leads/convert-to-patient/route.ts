import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar permissão
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'medico', 'recepcionista'].includes(profile.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const { leadId, cpf, birthDate, email } = body

    if (!leadId || !cpf || !birthDate || !email) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: leadId, cpf, birthDate, email' },
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

    // Buscar lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    }

    // Verificar se CPF já existe
    const { data: existingPatientByCpf } = await supabase
      .from('patients')
      .select('id')
      .eq('cpf', cpf)
      .maybeSingle()

    if (existingPatientByCpf) {
      return NextResponse.json(
        { error: 'CPF já cadastrado como paciente' },
        { status: 400 }
      )
    }

    // Verificar se email já existe
    const { data: existingPatientByEmail } = await supabase
      .from('patients')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    if (existingPatientByEmail) {
      return NextResponse.json(
        { error: 'Email já cadastrado como paciente' },
        { status: 400 }
      )
    }

    // Criar paciente
    const { data: newPatient, error: patientError } = await supabase
      .from('patients')
      .insert({
        name: lead.nome,
        cpf: cpf,
        birth_date: birthDate,
        phone: lead.telefone?.replace('@s.whatsapp.net', ''),
        email: email.trim().toLowerCase(),
        address: lead.endereco || '',
      })
      .select()
      .single()

    if (patientError) {
      console.error('Erro ao criar paciente:', patientError)
      return NextResponse.json(
        { error: 'Erro ao criar paciente: ' + patientError.message },
        { status: 500 }
      )
    }

    // Atualizar lead (marcar como convertido)
    await supabase
      .from('leads')
      .update({
        status: 'convertido',
        etapa: 'realizado',
      })
      .eq('id', leadId)

    // Registrar na tabela de convertidos
    await supabase
      .from('convertidos')
      .insert({
        nome: lead.nome,
        telefone: lead.telefone,
        produto_servico_convertido: 'Paciente',
        data_compra: new Date().toISOString(),
      })

    return NextResponse.json({
      success: true,
      patientId: newPatient.id,
    })
  } catch (error: any) {
    console.error('Erro ao converter lead em paciente:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao converter lead' },
      { status: 500 }
    )
  }
}


