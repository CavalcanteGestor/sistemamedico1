import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * API route para buscar o perfil do paciente autenticado
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

    // Buscar paciente pelo user_id
    const { data, error } = await supabase
      .from('patients')
      .select('id, name, email, cpf, birth_date, phone, address, city, state, zip_code, emergency_contact, emergency_phone, user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Erro ao buscar paciente:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })

      // Se não encontrou, retornar 404
      if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
        return NextResponse.json(
          { error: 'Paciente não encontrado' },
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
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Erro na API de perfil:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}

