import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * API route para tentar vincular um usuário a um paciente automaticamente
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log('Tentando vincular paciente para user:', user.id, user.email)

    // Tentar buscar por email usando admin client
    if (!user.email) {
      return NextResponse.json(
        { error: 'Usuário não tem email configurado' },
        { status: 400 }
      )
    }

    const { data: patient, error: searchError } = await adminClient
      .from('patients')
      .select('id, email, user_id, name')
      .eq('email', user.email)
      .maybeSingle()

    if (searchError) {
      console.error('Erro ao buscar paciente:', searchError)
      return NextResponse.json(
        { error: 'Erro ao buscar paciente' },
        { status: 500 }
      )
    }

    if (!patient) {
      return NextResponse.json(
        { 
          error: 'Paciente não encontrado',
          message: `Não foi encontrado nenhum paciente com o email ${user.email}. Entre em contato com a clínica para criar seu registro.`
        },
        { status: 404 }
      )
    }

    // Se já tem user_id e é o mesmo, retornar sucesso
    if (patient.user_id === user.id) {
      return NextResponse.json({
        success: true,
        message: 'Paciente já está vinculado',
        patientId: patient.id,
      })
    }

    // Se tem user_id diferente, retornar erro
    if (patient.user_id && patient.user_id !== user.id) {
      return NextResponse.json(
        { 
          error: 'Paciente já vinculado',
          message: 'Este paciente já está vinculado a outra conta de usuário.'
        },
        { status: 403 }
      )
    }

    // Se não tem user_id, vincular agora
    console.log('Vinculando user_id ao paciente:', patient.id)
    const { data: updatedPatient, error: updateError } = await adminClient
      .from('patients')
      .update({ user_id: user.id })
      .eq('id', patient.id)
      .select('id')
      .single()

    if (updateError || !updatedPatient) {
      console.error('Erro ao vincular user_id:', updateError)
      return NextResponse.json(
        { error: 'Erro ao vincular paciente' },
        { status: 500 }
      )
    }

    console.log('Paciente vinculado com sucesso!')

    return NextResponse.json({
      success: true,
      message: 'Paciente vinculado com sucesso',
      patientId: updatedPatient.id,
    })
  } catch (error: any) {
    console.error('Erro na API de vincular paciente:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}

