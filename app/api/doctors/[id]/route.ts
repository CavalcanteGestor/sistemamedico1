import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API Route para excluir um médico específico
 * Apenas admin pode executar
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se é admin ou desenvolvedor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'desenvolvedor') {
      return NextResponse.json(
        { error: 'Apenas administradores e desenvolvedores podem excluir médicos' },
        { status: 403 }
      )
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'ID do médico é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar dados do médico
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('id, user_id, name')
      .eq('id', id)
      .single()

    if (doctorError || !doctor) {
      return NextResponse.json(
        { error: 'Médico não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se há agendamentos futuros
    const { data: futureAppointments } = await supabase
      .from('appointments')
      .select('id, appointment_date')
      .eq('doctor_id', id)
      .gte('appointment_date', new Date().toISOString())
      .limit(1)

    if (futureAppointments && futureAppointments.length > 0) {
      return NextResponse.json(
        { 
          error: 'Não é possível excluir médico com agendamentos futuros. Cancele ou transfira os agendamentos primeiro.',
          hasFutureAppointments: true,
        },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Se o médico tiver user_id, excluir usuário e profile
    if (doctor.user_id) {
      try {
        // Excluir profile primeiro
        await adminClient
          .from('profiles')
          .delete()
          .eq('id', doctor.user_id)

        // Excluir usuário do auth
        await adminClient.auth.admin.deleteUser(doctor.user_id)
      } catch (userError) {
        console.error('Erro ao excluir usuário do médico:', userError)
        // Continuar mesmo se falhar, pois o médico pode não ter login válido
      }
    }

    // Excluir o médico
    const { error: deleteError } = await supabase
      .from('doctors')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: 'Médico excluído com sucesso',
    })
  } catch (error: any) {
    console.error('Erro ao excluir médico:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao excluir médico' },
      { status: 500 }
    )
  }
}

