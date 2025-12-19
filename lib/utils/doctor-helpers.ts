/**
 * Helpers para trabalhar com dados de médicos
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Obtém o doctor_id do médico logado
 * Retorna null se não for médico ou não tiver registro na tabela doctors
 */
export async function getCurrentDoctorId(): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null

    // Verificar se é médico
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    // Se for admin ou desenvolvedor, retorna null para ver tudo
    if (profile?.role === 'admin' || profile?.role === 'desenvolvedor') {
      return null
    }

    // Se não for médico, retorna null
    if (profile?.role !== 'medico') {
      return null
    }

    // Buscar doctor_id
    const { data: doctor } = await supabase
      .from('doctors')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    return doctor?.id || null
  } catch (error) {
    console.error('Erro ao obter doctor_id:', error)
    return null
  }
}

/**
 * Verifica se o usuário atual é médico
 */
export async function isCurrentUserDoctor(): Promise<boolean> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return false

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    return profile?.role === 'medico'
  } catch (error) {
    return false
  }
}

/**
 * Busca médicos que têm login válido (user_id e role=medico no profiles)
 * Esta função garante que apenas médicos com login ativo sejam retornados
 */
export async function getAvailableDoctors(
  supabase: SupabaseClient,
  options?: {
    active?: boolean
    includeInactive?: boolean
  }
): Promise<any[]> {
  try {
    // Buscar médicos que têm user_id e estão ativos (se especificado)
    let query = supabase
      .from('doctors')
      .select(`
        id,
        name,
        crm,
        email,
        phone,
        active,
        user_id,
        specialties:specialty_id (
          id,
          name
        )
      `)
      .not('user_id', 'is', null) // Apenas médicos com user_id (tem login)

    // Filtrar por ativo se especificado e não incluir inativos
    if (options?.active === true || (options?.active !== false && !options?.includeInactive)) {
      query = query.eq('active', true)
    }

    const { data: doctors, error } = await query.order('name')

    if (error) {
      console.error('Erro ao buscar médicos disponíveis:', error)
      return []
    }

    if (!doctors || doctors.length === 0) {
      return []
    }

    // Verificar quais médicos têm role=medico no profiles
    const doctorUserIds = doctors.map(d => d.user_id).filter(Boolean) as string[]
    
    if (doctorUserIds.length === 0) {
      return []
    }

    // Buscar profiles dos médicos para verificar role
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, role')
      .in('id', doctorUserIds)
      .eq('role', 'medico')

    if (profilesError) {
      console.error('Erro ao verificar profiles dos médicos:', profilesError)
      return []
    }

    // Criar Set com IDs de médicos válidos
    const validDoctorUserIds = new Set(profiles?.map(p => p.id) || [])

    // Filtrar apenas médicos que têm role=medico no profiles
    return doctors.filter(doctor => 
      doctor.user_id && validDoctorUserIds.has(doctor.user_id)
    )
  } catch (error) {
    console.error('Erro ao buscar médicos disponíveis:', error)
    return []
  }
}

