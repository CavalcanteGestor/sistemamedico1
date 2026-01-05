import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

/**
 * API Route para atualizar o template de email de convite de médico no Supabase
 * GET: Atualiza template (requer autenticação)
 * POST: Atualiza template (requer autenticação)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Verificar se é admin ou desenvolvedor
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'desenvolvedor')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  return await updateDoctorInviteTemplate()
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Verificar se é admin ou desenvolvedor
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'desenvolvedor')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  return await updateDoctorInviteTemplate()
}

async function updateDoctorInviteTemplate() {
  try {
    const supabase = await createClient()
    
    // Buscar URL da logo e nome da clínica das configurações
    const { data: settings } = await supabase
      .from('clinic_settings')
      .select('clinic_logo_url, clinic_name')
      .maybeSingle()

    const logoUrl = settings?.clinic_logo_url || ''
    const clinicName = settings?.clinic_name || 'Lumi'

    // Ler template do arquivo
    let templateHtml = ''
    try {
      const templatePath = join(process.cwd(), 'TEMPLATE_EMAIL_CONVITE_MEDICO.html')
      templateHtml = await readFile(templatePath, 'utf-8')
      
      // Substituir variáveis no template
      templateHtml = templateHtml.replace(/\{\{ \.ClinicName \}\}/g, clinicName)
      
      // Adicionar logo se existir
      if (logoUrl) {
        templateHtml = templateHtml.replace(
          /<div style="background: linear-gradient/g,
          `<img src="${logoUrl}" alt="${clinicName}" style="max-width: 150px; margin-bottom: 10px;" /><div style="background: linear-gradient`
        )
      }
    } catch (fileError) {
      // Se não conseguir ler do arquivo, usar template inline
      templateHtml = generateInlineTemplate(clinicName, logoUrl)
    }

    // Obter tokens do Supabase
    const supabaseAccessToken = process.env.SUPABASE_ACCESS_TOKEN
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF || supabaseUrl.split('//')[1]?.split('.')[0] || 'yuypxyvvfnnichiwkepm'

    if (!supabaseAccessToken || !projectRef) {
      return NextResponse.json({
        success: false,
        message: 'Configuração do Supabase Management API não encontrada. O template foi gerado, mas não foi atualizado automaticamente.',
        template: templateHtml,
        manualUpdate: true,
        instructions: 'Você pode copiar o template acima e configurá-lo manualmente no painel do Supabase em Authentication > Email Templates > Invite.',
      })
    }

    // O Supabase usa o template de "recovery" para reset de senha
    // Como estamos usando recovery para convites de médicos, vamos atualizar esse template
    // O template terá um texto genérico que funciona tanto para recuperação quanto para convites
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${supabaseAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Atualizar template de recovery (usado para convites de médicos)
        // Nota: O redirect será definido no código ao gerar o link
        mailer_subjects_recovery: `Bem-vindo ao ${clinicName} - Defina sua senha`,
        mailer_templates_recovery_content: templateHtml,
        // Se disponível, também atualizar invite
        mailer_subjects_invite: `Bem-vindo ao ${clinicName} - Defina sua senha`,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Erro ao atualizar template via Supabase API:', errorText)
      
      return NextResponse.json({
        success: false,
        message: 'Erro ao atualizar template automaticamente. O template foi gerado, mas não foi atualizado no Supabase.',
        template: templateHtml,
        manualUpdate: true,
        error: errorText,
        instructions: 'Você pode copiar o template acima e configurá-lo manualmente no painel do Supabase em Authentication > Email Templates.',
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Template de email de convite atualizado com sucesso no Supabase!',
      template: templateHtml,
    })
  } catch (error: any) {
    console.error('Erro ao atualizar template de email:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Erro ao atualizar template de email',
        template: generateInlineTemplate('Sistema Médico', ''),
      },
      { status: 500 }
    )
  }
}

function generateInlineTemplate(clinicName: string, logoUrl: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite - Sistema Médico</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header com gradiente -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
      ${logoUrl ? `<img src="${logoUrl}" alt="${clinicName}" style="max-width: 150px; margin-bottom: 10px;" />` : ''}
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">${clinicName}</h1>
    </div>
    
    <!-- Corpo do email -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #333; margin-top: 0; font-size: 20px; font-weight: 600;">🔐 Definir sua senha</h2>
      
      <p style="color: #666; margin: 15px 0; font-size: 16px; line-height: 1.6;">Olá,</p>
      
      <p style="color: #666; margin: 15px 0; font-size: 16px; line-height: 1.6;">
        Você precisa definir uma senha de acesso para sua conta no sistema de gestão médica.
      </p>
      
      <p style="color: #666; margin: 15px 0; font-size: 16px; line-height: 1.6;">
        Clique no botão abaixo para configurar sua senha e começar a usar o sistema:
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
          🔐 Definir Minha Senha
        </a>
      </div>
      
      <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="color: #1565c0; margin: 0; font-size: 14px;">
          <strong>ℹ️ Informações importantes:</strong>
        </p>
        <ul style="color: #1565c0; margin: 10px 0 0 0; padding-left: 20px; font-size: 14px;">
          <li>Este link é único e seguro</li>
          <li>O link expira em <strong>1 hora</strong> por motivos de segurança</li>
          <li>Você poderá definir sua própria senha</li>
          <li>Se não solicitou este email, pode ignorá-lo com segurança</li>
        </ul>
      </div>
      
      <p style="color: #666; margin: 15px 0; font-size: 16px; line-height: 1.6;">
        Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
      </p>
      
      <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 4px; word-break: break-all;">
        <p style="color: #666; font-size: 12px; margin: 0;">{{ .ConfirmationURL }}</p>
      </div>
      
      <p style="color: #666; margin: 15px 0; font-size: 16px; line-height: 1.6;">
        Se você não solicitou a definição de senha, ignore este email. Sua conta permanecerá inalterada.
      </p>
      
      <p style="color: #666; margin: 25px 0 15px 0; font-size: 16px; line-height: 1.6;">
        Caso tenha dúvidas ou precise de ajuda, entre em contato com a administração do sistema.
      </p>
      
      <p style="color: #666; margin: 15px 0; font-size: 16px; line-height: 1.6;">
        Atenciosamente,<br>
        <strong>Equipe ${clinicName}</strong>
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
      <p style="color: #666; font-size: 14px; margin: 5px 0;"><strong>${clinicName}</strong></p>
      <p style="color: #666; font-size: 14px; margin: 5px 0;">Sistema de Gestão Médica</p>
      <p style="color: #999; font-size: 12px; margin: 5px 0;">Este é um email automático, por favor não responda.</p>
      <p style="font-size: 12px; color: #999; margin: 5px 0;">© 2025 ${clinicName}. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>`
}

