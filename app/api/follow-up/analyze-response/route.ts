import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { classifyLeadResponse, extractLeadInformation } from '@/lib/services/follow-up-ai-service'
import { createAdminClient } from '@/lib/supabase/admin'

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
    const { message, leadId, leadTelefone, followUpId } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Campo "message" é obrigatório' },
        { status: 400 }
      )
    }

    // Classificar resposta
    const classification = await classifyLeadResponse(message)
    
    // Extrair informações
    const informacoes = await extractLeadInformation(message)

    // Se tiver leadId, atualizar lead com base na classificação
    if (leadId || leadTelefone) {
      const adminSupabase = await createAdminClient()
      const updates: Record<string, any> = {}

      // Atualizar etapa baseado na classificação
      if (classification.tipo === 'positivo') {
        updates.etapa = 'interesse'
        updates.status = 'em_andamento'
      } else if (classification.tipo === 'negativo') {
        updates.status = 'perdido'
      } else if (classification.tipo === 'objeção' && classification.tipoObjeção) {
        // Adicionar objeção ao contexto
        const { data: lead } = await adminSupabase
          .from('leads')
          .select('contexto')
          .eq(leadId ? 'id' : 'telefone', leadId || leadTelefone)
          .single()

        if (lead) {
          updates.contexto = `${lead.contexto || ''}\nObjeção identificada: ${classification.tipoObjeção}`
        }
      }

      // Atualizar com informações extraídas
      if (informacoes.procedimento) {
        updates.interesse = informacoes.procedimento
      }

      if (Object.keys(updates).length > 0) {
        if (leadId) {
          await adminSupabase
            .from('leads')
            .update(updates)
            .eq('id', leadId)
        } else if (leadTelefone) {
          await adminSupabase
            .from('leads')
            .update(updates)
            .eq('telefone', leadTelefone)
        }
      }
    }

    // Se tiver followUpId, atualizar follow-up
    if (followUpId) {
      const adminSupabase = await createAdminClient()
      await adminSupabase
        .from('follow_ups')
        .update({
          resposta_recebida: true,
          resposta_em: new Date().toISOString(),
          metadata: {
            classificacao: classification,
            informacoes_extraidas: informacoes,
          },
        })
        .eq('id', followUpId)
    }

    return NextResponse.json({
      success: true,
      classification,
      informacoes,
    })
  } catch (error: any) {
    console.error('Erro ao analisar resposta:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao analisar resposta' },
      { status: 500 }
    )
  }
}

