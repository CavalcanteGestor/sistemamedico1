import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar perfil do usuário para verificar role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Verificar se é médico para filtrar apenas seus estudos de caso
    let doctorId: string | null = null
    if (profile?.role === 'medico') {
      const { data: doctor } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      doctorId = doctor?.id || null
    }

    // Buscar parâmetros de filtro
    const searchParams = request.nextUrl.searchParams
    const statusFilter = searchParams.get('status') || 'all'
    const specialtyFilter = searchParams.get('specialty') || 'all'

    let query = supabase
      .from('case_studies')
      .select(`
        *,
        doctor:doctor_id (
          id,
          name,
          crm
        ),
        specialty:specialty_id (
          id,
          name
        ),
        comments:case_study_comments (
          id
        ),
        files:case_study_files (
          id
        )
      `)
      .order('created_at', { ascending: false })

    // Se for médico, filtrar apenas seus estudos de caso
    if (doctorId) {
      query = query.eq('doctor_id', doctorId)
    }

    // Filtro de status
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    } else {
      // Mostrar apenas publicados para usuários comuns, ou todos para admins
      if (profile?.role !== 'admin' && profile?.role !== 'desenvolvedor') {
        query = query.eq('status', 'published')
      }
    }

    // Filtro de especialidade
    if (specialtyFilter !== 'all') {
      query = query.eq('specialty_id', specialtyFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar estudos de caso:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      return NextResponse.json(
        { 
          error: 'Erro ao buscar estudos de caso',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      )
    }

    // Buscar perfis dos criadores separadamente para evitar problemas de RLS
    const caseStudiesWithProfiles = await Promise.all(
      (data || []).map(async (study) => {
        if (study.created_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, name, email')
            .eq('id', study.created_by)
            .single()
          
          return {
            ...study,
            created_by_profile: profile || null,
          }
        }
        return study
      })
    )

    return NextResponse.json({ caseStudies: caseStudiesWithProfiles || [] })
  } catch (error: any) {
    console.error('Erro ao processar requisição:', error)
    return NextResponse.json(
      { 
        error: 'Erro ao processar requisição',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

