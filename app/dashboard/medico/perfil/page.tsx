'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getCurrentDoctorId } from '@/lib/utils/doctor-helpers'

/**
 * Página que redireciona o médico para sua página de edição de perfil
 */
export default function MedicoPerfilPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const redirectToProfile = async () => {
      try {
        const doctorId = await getCurrentDoctorId()
        
        if (doctorId) {
          router.push(`/dashboard/medicos/${doctorId}`)
        } else {
          // Se não encontrou o médico, redireciona para o dashboard
          router.push('/dashboard/medico')
        }
      } catch (error) {
        console.error('Erro ao buscar ID do médico:', error)
        router.push('/dashboard/medico')
      }
    }

    redirectToProfile()
  }, [router])

  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-muted-foreground">Redirecionando...</div>
    </div>
  )
}

