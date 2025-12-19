import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const tipoFollowUp = searchParams.get('tipoFollowUp') || undefined
    const tipoTemplate = searchParams.get('tipoTemplate') || undefined // 'fixo' ou 'ia'

    let query = supabase
      .from('follow_up_templates')
      .select('*')
      .eq('ativa', true)
      .order('nome')

    if (tipoFollowUp) {
      query = query.eq('tipo_follow_up', tipoFollowUp)
    }

    if (tipoTemplate) {
      query = query.eq('tipo_template', tipoTemplate)
    }

    const { data: templates, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data: templates || [] })
  } catch (error: any) {
    console.error('Erro ao buscar templates:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar templates' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar permissão - apenas admin pode criar templates
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas administradores podem criar templates' }, { status: 403 })
    }

    const body = await request.json()
    const { nome, descricao, conteudo, tipo_follow_up, tipo_template = 'fixo', variaveis_disponiveis = [] } = body

    if (!nome || !conteudo || !tipo_follow_up) {
      return NextResponse.json(
        { error: 'Nome, conteúdo e tipo de follow-up são obrigatórios' },
        { status: 400 }
      )
    }

    const adminClient = await createAdminClient()
    const { data: template, error } = await adminClient
      .from('follow_up_templates')
      .insert({
        nome,
        descricao,
        conteudo,
        tipo_follow_up,
        tipo_template: tipo_template || 'fixo',
        variaveis_disponiveis: Array.isArray(variaveis_disponiveis) ? variaveis_disponiveis : [],
        ativa: true,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data: template })
  } catch (error: any) {
    console.error('Erro ao criar template:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar template' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar permissão - apenas admin pode editar templates
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas administradores podem editar templates' }, { status: 403 })
    }

    const body = await request.json()
    const { id, nome, descricao, conteudo, tipo_follow_up, tipo_template, variaveis_disponiveis, ativa } = body

    if (!id) {
      return NextResponse.json({ error: 'ID do template é obrigatório' }, { status: 400 })
    }

    const adminClient = await createAdminClient()
    const updateData: any = {
      atualizado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (nome !== undefined) updateData.nome = nome
    if (descricao !== undefined) updateData.descricao = descricao
    if (conteudo !== undefined) updateData.conteudo = conteudo
    if (tipo_follow_up !== undefined) updateData.tipo_follow_up = tipo_follow_up
    if (tipo_template !== undefined) updateData.tipo_template = tipo_template
    if (variaveis_disponiveis !== undefined) updateData.variaveis_disponiveis = Array.isArray(variaveis_disponiveis) ? variaveis_disponiveis : []
    if (ativa !== undefined) updateData.ativa = ativa

    const { data: template, error } = await adminClient
      .from('follow_up_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data: template })
  } catch (error: any) {
    console.error('Erro ao atualizar template:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar template' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar permissão - apenas admin pode deletar templates
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas administradores podem deletar templates' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID do template é obrigatório' }, { status: 400 })
    }

    const adminClient = await createAdminClient()
    const { error } = await adminClient
      .from('follow_up_templates')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, message: 'Template deletado com sucesso' })
  } catch (error: any) {
    console.error('Erro ao deletar template:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar template' },
      { status: 500 }
    )
  }
}
