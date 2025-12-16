import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getLeadFullContext,
  analyzeLeadSentiment,
  generateAdvancedAIMessage,
} from '@/lib/services/follow-up-ai-service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar permissão
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'medico', 'recepcionista'].includes(profile.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const { leadId, tipoFollowUp, promptPersonalizado, usarContexto = true } = body

    if (!leadId || !tipoFollowUp) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: leadId, tipoFollowUp' },
        { status: 400 }
      )
    }

    // Buscar contexto completo
    const leadContext = await getLeadFullContext(leadId)
    if (!leadContext) {
      return NextResponse.json(
        { error: 'Lead não encontrado' },
        { status: 404 }
      )
    }

    // Analisar sentimento
    const sentimentAnalysis = usarContexto
      ? await analyzeLeadSentiment(leadContext)
      : undefined

    // Gerar mensagem avançada
    const mensagem = await generateAdvancedAIMessage({
      leadContext,
      tipoFollowUp,
      promptPersonalizado,
      sentimentAnalysis,
    })

    return NextResponse.json({
      success: true,
      mensagem,
      sentimentAnalysis,
      leadContext: {
        interesses: leadContext.interesses,
        objeções: leadContext.objeções,
        diasSemResposta: leadContext.diasSemResposta,
      },
    })
  } catch (error: any) {
    console.error('Erro ao gerar mensagem avançada:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar mensagem avançada' },
      { status: 500 }
    )
  }
}

