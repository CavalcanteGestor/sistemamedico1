/**
 * Helpers para trabalhar com dados de médicos
 */

import { createClient } from '@/lib/supabase/client'

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

