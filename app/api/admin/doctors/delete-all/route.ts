import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API Route para excluir TODOS os médicos
 * ATENÇÃO: Esta operação é irreversível!
 * Apenas desenvolvedor pode executar
 */
export async function DELETE(request: NextRequest) {
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
        { error: 'Apenas desenvolvedores podem executar esta ação' },
        { status: 403 }
      )
    }

    // Buscar todos os médicos
    const { data: allDoctors, error: fetchError } = await supabase
      .from('doctors')
      .select('id, user_id')

    if (fetchError) {
      throw fetchError
    }

    const adminClient = createAdminClient()

    // Excluir usuários dos médicos que têm login
    const userIds = allDoctors?.filter(d => d.user_id).map(d => d.user_id) || []
    
    if (userIds.length > 0) {
      // Excluir profiles primeiro
      await adminClient
        .from('profiles')
        .delete()
        .in('id', userIds)

      // Excluir usuários do auth
      for (const userId of userIds) {
        try {
          await adminClient.auth.admin.deleteUser(userId)
        } catch (err) {
          console.error(`Erro ao excluir usuário ${userId}:`, err)
        }
      }
    }

    // Excluir todos os médicos
    // Nota: Agendamentos e outros registros relacionados precisam ser tratados
    // Por enquanto, vamos apenas excluir médicos que não têm agendamentos
    // ou o desenvolvedor precisa excluir agendamentos primeiro manualmente

    // Verificar se há agendamentos
    const { data: appointments } = await supabase
      .from('appointments')
      .select('doctor_id')
      .not('doctor_id', 'is', null)
      .limit(1)

    if (appointments && appointments.length > 0) {
      return NextResponse.json(
        { 
          error: 'Não é possível excluir médicos que têm agendamentos. Exclua os agendamentos primeiro ou use o script SQL diretamente no banco.',
          hasAppointments: true
        },
        { status: 400 }
      )
    }

    // Excluir todos os médicos
    const { error: deleteError } = await supabase
      .from('doctors')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Excluir todos (usando condição que sempre é verdadeira)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: `Todos os médicos foram excluídos! ${userIds.length} usuários também foram removidos.`,
      deletedCount: allDoctors?.length || 0,
      deletedUsers: userIds.length,
    })
  } catch (error: any) {
    console.error('Erro ao excluir todos os médicos:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao excluir médicos' },
      { status: 500 }
    )
  }
}


