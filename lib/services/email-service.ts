/**
 * Serviço para envio de emails personalizados
 */

interface SendInviteEmailParams {
  email: string
  doctorName: string
  confirmationUrl: string
  clinicName?: string
}

/**
 * Envia email de convite para médico usando template personalizado
 * Nota: Este é um placeholder. Para implementação completa, você precisaria:
 * - Configurar um serviço de email (Resend, SendGrid, AWS SES, etc)
 * - Ou usar o Supabase com template customizado via API
 */
export async function sendDoctorInviteEmail(params: SendInviteEmailParams): Promise<void> {
  const clinicName = params.clinicName || 'Lumi'
  
  // Template HTML personalizado
  const html = `
<!DOCTYPE html>
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
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">${clinicName}</h1>
    </div>
    
    <!-- Corpo do email -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #333; margin-top: 0; font-size: 20px; font-weight: 600;">👨‍⚕️ Você foi convidado!</h2>
      
      <p style="color: #666; margin: 15px 0; font-size: 16px; line-height: 1.6;">Olá <strong>${params.doctorName}</strong>,</p>
      
      <p style="color: #666; margin: 15px 0; font-size: 16px; line-height: 1.6;">
        Você foi cadastrado como médico no nosso sistema de gestão médica. Estamos felizes em tê-lo(a) na equipe!
      </p>
      
      <p style="color: #666; margin: 15px 0; font-size: 16px; line-height: 1.6;">
        Para começar a usar o sistema, você precisa definir uma senha de acesso. Clique no botão abaixo para configurar sua senha:
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${params.confirmationUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
          🔐 Definir Minha Senha
        </a>
      </div>
      
      <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="color: #1565c0; margin: 0; font-size: 14px;">
          <strong>ℹ️ Informações importantes:</strong>
        </p>
        <ul style="color: #1565c0; margin: 10px 0 0 0; padding-left: 20px; font-size: 14px;">
          <li>Este link é único e seguro</li>
          <li>O link expira em <strong>24 horas</strong> por motivos de segurança</li>
          <li>Você poderá definir sua própria senha</li>
          <li>Seu email de acesso: <strong>${params.email}</strong></li>
        </ul>
      </div>
      
      <p style="color: #666; margin: 15px 0; font-size: 16px; line-height: 1.6;">
        Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
      </p>
      
      <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 4px; word-break: break-all;">
        <p style="color: #666; font-size: 12px; margin: 0;">${params.confirmationUrl}</p>
      </div>
      
      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="color: #856404; margin: 0; font-size: 14px;">
          <strong>⚠️ Não solicitou este cadastro?</strong> Se você não esperava este convite, pode ignorar este email com segurança.
        </p>
      </div>
      
      <p style="color: #666; margin: 25px 0 15px 0; font-size: 16px; line-height: 1.6;">
        Caso tenha dúvidas ou precise de ajuda, entre em contato com a administração do sistema.
      </p>
      
      <p style="color: #666; margin: 15px 0; font-size: 16px; line-height: 1.6;">
        Bem-vindo(a) ao sistema!<br>
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
</html>
  `

  // Versão texto simples para clientes de email que não suportam HTML
  const text = `
👨‍⚕️ Você foi convidado!

Olá ${params.doctorName},

Você foi cadastrado como médico no nosso sistema de gestão médica. Estamos felizes em tê-lo(a) na equipe!

Para começar a usar o sistema, você precisa definir uma senha de acesso. Acesse o link abaixo:

${params.confirmationUrl}

Informações importantes:
- Este link é único e seguro
- O link expira em 24 horas por motivos de segurança
- Você poderá definir sua própria senha
- Seu email de acesso: ${params.email}

⚠️ Não solicitou este cadastro? Se você não esperava este convite, pode ignorar este email com segurança.

Caso tenha dúvidas ou precise de ajuda, entre em contato com a administração do sistema.

Bem-vindo(a) ao sistema!
Equipe ${clinicName}

---
${clinicName} - Sistema de Gestão Médica
Este é um email automático, por favor não responda.
© 2025 ${clinicName}. Todos os direitos reservados.
  `

  // Para implementação real, você precisaria de um serviço de email
  // Por enquanto, vamos usar o Supabase via generateLink que já funciona
  // Este template será usado quando configurarmos um serviço de email dedicado
  
  return Promise.resolve()
}

/**
 * Obtém nome da clínica das configurações
 */
export async function getClinicName(): Promise<string> {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    const { data: settings } = await supabase
      .from('clinic_settings')
      .select('clinic_name')
      .maybeSingle()
    
    return settings?.clinic_name || 'Lumi'
  } catch (error) {
    console.error('Erro ao buscar nome da clínica:', error)
    return 'Lumi'
  }
}

