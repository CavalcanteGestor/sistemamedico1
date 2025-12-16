import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runAllAutomations } from '@/lib/services/follow-up-automations'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar permissão - apenas admin pode executar manualmente
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Executar automações
    await runAllAutomations()

    return NextResponse.json({
      success: true,
      message: 'Automações executadas com sucesso',
    })
  } catch (error: any) {
    console.error('Erro ao executar automações:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao executar automações' },
      { status: 500 }
    )
  }
}

