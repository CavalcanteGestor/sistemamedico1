import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // Buscar role para redirecionar corretamente
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = profile?.role || 'paciente'

    if (role === 'paciente') {
      redirect('/portal/dashboard')
    } else if (role === 'medico') {
      redirect('/dashboard/medico')
    } else if (role === 'admin') {
      redirect('/dashboard/admin')
    } else if (role === 'recepcionista') {
      redirect('/dashboard/recepcionista')
    } else if (role === 'desenvolvedor') {
      redirect('/dashboard/desenvolvedor')
    } else {
      redirect('/dashboard')
    }
  } else {
    redirect('/login')
  }
}
