import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

/**
 * API Route para atualizar o template de email do Supabase com a logo da clínica
 * Esta rota atualiza o template "Reset Password" no Supabase com a URL da logo
 * 
 * GET: Atualiza template (sem autenticação, apenas para execução manual)
 * POST: Atualiza template (requer autenticação)
 */
export async function GET(request: NextRequest) {
  // GET requer autenticação em produção
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

  return await updateEmailTemplate()
}

export async function POST(request: NextRequest) {
  // POST requer autenticação
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

  return await updateEmailTemplate()
}

async function updateEmailTemplate() {
  try {
    const supabase = await createClient()
    
    // Buscar URL da logo das configurações
    const { data: settings } = await supabase
      .from('clinic_settings')
      .select('clinic_logo_url, clinic_name')
      .single()

    const logoUrl = settings?.clinic_logo_url || ''
    const clinicName = settings?.clinic_name || 'Lumi'

    // Buscar template base do arquivo local
    // Tentar ler do sistema de arquivos (apenas em server-side)
    let templateHtml = ''
    try {
      // Tentar ler do workspace root
      const templatePath = join(process.cwd(), 'TEMPLATE_EMAIL_RECUPERACAO_SENHA_SIMPLIFICADO.html')
      templateHtml = await readFile(templatePath, 'utf-8')
    } catch (error) {
      // Se não conseguir ler do arquivo, usar template padrão
      templateHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinir Senha - ${clinicName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .email-container {
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .email-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px 20px;
      text-align: center;
    }
    .logo {
      max-width: 150px;
      height: auto;
      margin-bottom: 15px;
    }
    .email-header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .email-body {
      padding: 40px 30px;
    }
    .email-body h2 {
      color: #333;
      margin-top: 0;
      font-size: 20px;
      font-weight: 600;
    }
    .email-body p {
      color: #666;
      margin: 15px 0;
      font-size: 16px;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);
    }
    .email-footer {
      background-color: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      border-top: 1px solid #e9ecef;
    }
    .email-footer p {
      color: #666;
      font-size: 14px;
      margin: 5px 0;
    }
    .warning-box {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .warning-box p {
      color: #856404;
      margin: 0;
      font-size: 14px;
    }
    .link-fallback {
      margin-top: 20px;
      padding: 15px;
      background-color: #f8f9fa;
      border-radius: 4px;
      word-break: break-all;
    }
    .link-fallback p {
      color: #666;
      font-size: 12px;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      ${logoUrl ? `<img src="${logoUrl}" alt="Logo ${clinicName}" class="logo" />` : ''}
      <h1>${clinicName}</h1>
    </div>
    
    <div class="email-body">
      <h2>Redefinir sua senha</h2>
      
      <p>Olá,</p>
      
      <p>Recebemos uma solicitação para redefinir a senha da sua conta. Se você não fez esta solicitação, pode ignorar este email com segurança.</p>
      
      <p>Para redefinir sua senha, clique no botão abaixo:</p>
      
      <div class="button-container">
        <a href="{{ .ConfirmationURL }}" class="button">Redefinir Senha</a>
      </div>
      
      <div class="warning-box">
        <p><strong>⚠️ Importante:</strong> Este link expira em 1 hora por motivos de segurança.</p>
      </div>
      
      <p>Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
      
      <div class="link-fallback">
        <p>{{ .ConfirmationURL }}</p>
      </div>
      
      <p>Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanecerá inalterada.</p>
    </div>
    
    <div class="email-footer">
      <p><strong>${clinicName}</strong></p>
      <p>Este é um email automático, por favor não responda.</p>
      <p style="font-size: 12px; color: #999;">© 2025 ${clinicName}. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>`
    }

    // Se houver logo, adicionar ao template (se o template foi lido do arquivo)
    if (logoUrl && templateHtml.includes('<!-- Para adicionar logo')) {
      // Substituir o comentário da logo pela tag img real
      templateHtml = templateHtml.replace(
        /<!-- Para adicionar logo, substitua a linha abaixo pela URL da sua logo -->\s*<!-- <img src="https:\/\/sua-url-da-logo\.com\/logo\.png" alt="Logo" class="logo" \/> -->/,
        `<img src="${logoUrl}" alt="Logo ${clinicName}" class="logo" />`
      )
    } else if (logoUrl && !templateHtml.includes(logoUrl)) {
      // Se o template já não tem a logo, adicionar antes do <h1>
      templateHtml = templateHtml.replace(
        /<div class="email-header">\s*<h1>/,
        `<div class="email-header">\n      <img src="${logoUrl}" alt="Logo ${clinicName}" class="logo" />\n      <h1>`
      )
    }

    // Atualizar nome da clínica no template (se necessário)
    if (!templateHtml.includes(clinicName) || templateHtml.includes('Lumi')) {
      templateHtml = templateHtml.replace(/Lumi/g, clinicName)
    }

    // Salvar template atualizado no arquivo local (versão simplificada)
    try {
      const simplifiedTemplatePath = join(process.cwd(), 'TEMPLATE_EMAIL_RECUPERACAO_SENHA_SIMPLIFICADO.html')
      // Criar versão simplificada com estilos inline
      let simplifiedHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinir Senha - ${clinicName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); overflow: hidden;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
      ${logoUrl ? `<img src="${logoUrl}" alt="Logo ${clinicName}" style="max-width: 150px; height: auto; margin-bottom: 15px;" />` : ''}
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">${clinicName}</h1>
    </div>
    <div style="padding: 40px 30px;">
      <h2 style="color: #333; margin-top: 0; font-size: 20px; font-weight: 600;">Redefinir sua senha</h2>
      <p style="color: #666; margin: 15px 0; font-size: 16px;">Olá,</p>
      <p style="color: #666; margin: 15px 0; font-size: 16px;">Recebemos uma solicitação para redefinir a senha da sua conta. Se você não fez esta solicitação, pode ignorar este email com segurança.</p>
      <p style="color: #666; margin: 15px 0; font-size: 16px;">Para redefinir sua senha, clique no botão abaixo:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">Redefinir Senha</a>
      </div>
      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="color: #856404; margin: 0; font-size: 14px;"><strong>⚠️ Importante:</strong> Este link expira em 1 hora por motivos de segurança.</p>
      </div>
      <p style="color: #666; margin: 15px 0; font-size: 16px;">Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
      <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 4px; word-break: break-all;">
        <p style="color: #666; font-size: 12px; margin: 0;">{{ .ConfirmationURL }}</p>
      </div>
      <p style="color: #666; margin: 15px 0; font-size: 16px;">Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanecerá inalterada.</p>
    </div>
    <div style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
      <p style="color: #666; font-size: 14px; margin: 5px 0;"><strong>${clinicName}</strong></p>
      <p style="color: #666; font-size: 14px; margin: 5px 0;">Este é um email automático, por favor não responda.</p>
      <p style="font-size: 12px; color: #999; margin: 5px 0;">© 2025 ${clinicName}. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>`
      await writeFile(simplifiedTemplatePath, simplifiedHtml, 'utf-8')
    } catch (fileError) {
      // Erro ao salvar arquivo local (não crítico)
      // Continuar mesmo se não conseguir salvar localmente
    }

    // Usar Management API do Supabase para atualizar o template
    // Nota: Isso requer SUPABASE_ACCESS_TOKEN configurado nas variáveis de ambiente
    const supabaseAccessToken = process.env.SUPABASE_ACCESS_TOKEN
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    // Extrair project_ref da URL (ex: https://yuypxyvvfnnichiwkepm.supabase.co)
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF || supabaseUrl.split('//')[1]?.split('.')[0] || 'yuypxyvvfnnichiwkepm'

    if (!supabaseAccessToken || !projectRef) {
      return NextResponse.json({
        success: false,
        message: 'Configuração do Supabase Management API não encontrada. O template foi gerado, mas não foi atualizado automaticamente.',
        template: templateHtml,
        manualUpdate: true,
      })
    }

    // Atualizar template via Management API
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${supabaseAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mailer_subjects_recovery: `Redefinir sua senha - ${clinicName}`,
        mailer_templates_recovery_content: templateHtml,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({
        success: false,
        message: 'Erro ao atualizar template via Management API',
        error: errorText,
        template: templateHtml,
        manualUpdate: true,
      }, { status: 500 })
    }

    const result = {
      success: true,
      message: 'Template de email atualizado com sucesso!',
      logoUrl,
      clinicName,
      templateUpdated: true,
      fileUpdated: true,
    }

    return NextResponse.json(result)
  } catch (error: any) {
    // Erro já tratado no catch acima
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro ao atualizar template de email',
      },
      { status: 500 }
    )
  }
}

