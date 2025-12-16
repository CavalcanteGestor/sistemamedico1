import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * API route para buscar apenas o ID do paciente autenticado
 * Usa server-side para evitar problemas de headers/406
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Buscar apenas o ID do paciente pelo user_id
    let data, error
    const result = await supabase
      .from('patients')
      .select('id, email, user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    data = result.data
    error = result.error

    console.log('Resultado busca por user_id:', { 
      found: !!data, 
      error: error?.code,
      userId: user.id,
      userEmail: user.email 
    })

    // Se não encontrou pelo user_id, tentar buscar por email como fallback
    if (!data) {
      console.log('Paciente não encontrado por user_id, tentando buscar por email:', user.email)
      
      if (user.email) {
        // Tentar buscar por email usando admin client para garantir que funciona
        const adminClient = createAdminClient()
        const emailResult = await adminClient
          .from('patients')
          .select('id, email, user_id, name')
          .eq('email', user.email)
          .maybeSingle()
        
        console.log('Resultado busca por email:', { 
          found: !!emailResult.data, 
          error: emailResult.error?.code,
          hasUserId: !!emailResult.data?.user_id
        })
        
        if (emailResult.data && !emailResult.error) {
          // Se encontrou pelo email mas não tem user_id vinculado, vincular agora
          if (!emailResult.data.user_id) {
            console.log('Vinculando user_id ao paciente encontrado por email:', emailResult.data.id)
            const updateResult = await adminClient
              .from('patients')
              .update({ user_id: user.id })
              .eq('id', emailResult.data.id)
              .select('id')
              .single()
            
            if (updateResult.data) {
              console.log('User_id vinculado com sucesso!')
              data = updateResult.data
              error = null
            } else {
              console.error('Erro ao vincular user_id:', updateResult.error)
              error = updateResult.error
            }
          } else if (emailResult.data.user_id === user.id) {
            // Tem user_id e é igual - usar esse
            console.log('Encontrado paciente com user_id correto via email')
            data = { id: emailResult.data.id }
            error = null
          } else {
            // Já tem user_id mas é diferente - retornar erro
            console.error('Paciente já vinculado a outro usuário:', emailResult.data.user_id)
            return NextResponse.json(
              { 
                error: 'Paciente vinculado a outra conta',
                message: 'Este paciente já está vinculado a outra conta de usuário.',
              },
              { status: 403 }
            )
          }
        } else {
          console.error('Erro ao buscar por email:', emailResult.error)
          error = emailResult.error
        }
      }
    }

    if (error) {
      console.error('Erro ao buscar paciente ID:', {
        code: error.code,
        message: error.message,
      })

      // Se não encontrou, retornar 404
      if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
        return NextResponse.json(
          { 
            error: 'Paciente não encontrado',
            message: 'Seu usuário não está vinculado a nenhum paciente. Entre em contato com a clínica.',
            userId: user.id,
            userEmail: user.email,
          },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: error.message || 'Erro ao buscar paciente' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { 
          error: 'Paciente não encontrado',
          message: 'Seu usuário não está vinculado a nenhum paciente. Entre em contato com a clínica.',
          userId: user.id,
          userEmail: user.email,
        },
        { status: 404 }
      )
    }

    return NextResponse.json({ patientId: data.id })
  } catch (error: any) {
    console.error('Erro na API de paciente ID:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}

