# ✅ Checklist de Produção - Sistema Médico

Use este checklist antes de fazer deploy para produção.

## 🔐 Variáveis de Ambiente

- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurada
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurada
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada (apenas no servidor)
- [ ] `NEXT_PUBLIC_APP_URL` apontando para domínio de produção
- [ ] `NEXT_PUBLIC_SUPABASE_PROJECT_REF` configurado
- [ ] `NEXT_PUBLIC_EVOLUTION_API_URL` configurada
- [ ] `EVOLUTION_API_KEY` configurada
- [ ] `EVOLUTION_INSTANCE_NAME` configurado
- [ ] `OPENAI_API_KEY` configurada
- [ ] `OPENAI_MODEL` configurado (opcional)
- [ ] `SUPABASE_ACCESS_TOKEN` configurado (opcional, para templates)
- [ ] `CRON_SECRET_KEY` configurado (para automações)

## 🗄️ Banco de Dados

- [ ] Todas as migrações executadas (001 até 031)
- [ ] Row Level Security (RLS) habilitado em todas as tabelas
- [ ] Políticas RLS verificadas e funcionando
- [ ] Storage buckets criados:
  - [ ] `medical-attachments`
  - [ ] `clinic-logo`
  - [ ] `whatsapp-media`
- [ ] Backup do banco configurado

## 🔗 URLs e Redirecionamentos

- [ ] URLs de redirecionamento configuradas no Supabase:
  - [ ] `https://seu-dominio.com/**`
  - [ ] `https://seu-dominio.com/auth/confirm`
- [ ] Site URL configurado no Supabase
- [ ] Email templates configurados (opcional)

## 🔒 Segurança

- [ ] Service Role Key NUNCA exposta no client-side
- [ ] Variáveis de ambiente protegidas no servidor
- [ ] HTTPS configurado
- [ ] Headers de segurança configurados
- [ ] CORS configurado corretamente
- [ ] Rate limiting configurado (recomendado)

## 📧 Email e Notificações

- [ ] Templates de email atualizados (opcional)
- [ ] Sistema de notificações testado
- [ ] Email de convite para médicos funcionando
- [ ] Email de recuperação de senha funcionando

## 📱 WhatsApp Integration

- [ ] Evolution API configurada e funcionando
- [ ] Instância ativa e conectada
- [ ] Webhook configurado (se necessário)
- [ ] Envio de mensagens testado
- [ ] Recebimento de mensagens testado

## 🤖 IA e Automações

- [ ] OpenAI API configurada
- [ ] Follow-ups com IA testados
- [ ] Cron jobs configurados:
  - [ ] `/api/follow-up/automations/run` (diário)
  - [ ] `/api/follow-up/process-scheduled` (a cada 5 min)
- [ ] Automações testadas

## 🎥 Telemedicina

- [ ] Telemedicina testada
- [ ] Criação de sessões funcionando
- [ ] Acesso via link testado
- [ ] Verificação de primeiro acesso funcionando
- [ ] Notificações de telemedicina funcionando

## 🧪 Testes

- [ ] Login funcionando
- [ ] Criação de médico testada
- [ ] Criação de paciente testada
- [ ] Criação de agendamento testada
- [ ] Telemedicina testada
- [ ] WhatsApp testado (se configurado)
- [ ] Follow-ups testados
- [ ] Portal do paciente testado

## 🚀 Deploy

- [ ] Build de produção executado sem erros: `npm run build`
- [ ] Build testado localmente: `npm start`
- [ ] Domínio configurado
- [ ] SSL/HTTPS configurado
- [ ] Servidor configurado (se VPS)
- [ ] PM2 ou similar configurado (se necessário)

## 📊 Monitoramento

- [ ] Logs configurados
- [ ] Monitoramento de erros configurado (opcional)
- [ ] Backup automático configurado
- [ ] Alerta de downtime configurado (opcional)

## 📚 Documentação

- [ ] README.md atualizado
- [ ] Credenciais documentadas (em local seguro)
- [ ] Processo de deploy documentado
- [ ] Troubleshooting documentado

## ✅ Finalização

- [ ] Primeiro usuário admin criado
- [ ] Senha padrão alterada
- [ ] Dados de teste removidos (se houver)
- [ ] Sistema testado em produção
- [ ] Equipe treinada (se aplicável)

---

**Data do Deploy**: _________  
**Responsável**: _________  
**Status**: ☐ Preparado | ☐ Em Progresso | ☐ Concluído

