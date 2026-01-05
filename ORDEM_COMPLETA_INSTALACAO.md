# 🚀 Ordem Completa de Instalação - Sistema Médico

## 📋 Guia Master: Do Zero ao Sistema Funcionando

Este guia mostra **exatamente** a ordem de todos os passos, desde criar o banco até ter o sistema rodando em produção.

---

## 🎯 Visão Geral

**Ordem lógica:**
1. ✅ Criar projeto Supabase
2. ✅ Executar migrações do banco
3. ✅ Configurar Supabase (Storage, URLs)
4. ✅ Configurar domínio na Hostinger
5. ✅ Instalar sistema na VPS
6. ✅ Configurar variáveis de ambiente
7. ✅ Testar tudo

**Tempo total estimado:** 1-2 horas

---

## 📝 PASSO 1: Criar Projeto Supabase

### 1.1. Criar Projeto

1. Acesse: https://supabase.com/dashboard
2. Clique em **"New Project"**
3. Preencha:
   - **Name:** Nome da clínica
   - **Database Password:** Senha forte (anote em local seguro!)
   - **Region:** Escolha a região mais próxima
4. Clique em **"Create new project"**
5. ⏳ Aguarde 2-3 minutos

### 1.2. Obter Credenciais

1. Vá em **Settings** → **API**
2. Anote (você vai precisar depois):
   - ✅ **Project URL** (ex: `https://xxxxx.supabase.co`)
   - ✅ **anon public** key
   - ✅ **service_role** key (⚠️ MANTENHA SECRETO!)

**📝 Anote essas informações em um arquivo seguro!**

---

## 📝 PASSO 2: Executar Migrações do Banco

### 2.1. Acessar SQL Editor

1. No Supabase Dashboard, vá em **SQL Editor**
2. Clique em **"New Query"**

### 2.2. Executar Migrações (NA ORDEM)

**⚠️ IMPORTANTE:** Execute **UMA POR VEZ**, aguarde sucesso antes de passar para a próxima!

#### Grupo 1: Base (OBRIGATÓRIO)

```
✅ 001_initial_schema.sql
   └─ Cria todas as tabelas, tipos, índices e triggers
   └─ Tempo: 2-3 minutos
   └─ ⚠️ Se der erro, verifique se o projeto está ativo

✅ 002_rls_policies.sql
   └─ Configura Row Level Security e políticas
   └─ Tempo: 1-2 minutos
   └─ ⚠️ CRÍTICO: Sem isso, o sistema não funcionará
```

#### Grupo 2: Funcionalidades Médicas

```
✅ 003_medical_record_attachments.sql
✅ 004_create_storage_bucket.sql
✅ 005_enhance_anamnesis_physical_exam.sql
✅ 006_enhance_notifications.sql
```

#### Grupo 3: Telemedicina

```
✅ 007_telemedicine_tables.sql
✅ 008_seed_data.sql (opcional - dados iniciais)
✅ 009_fix_telemedicine_rls.sql
✅ 010_telemedicine_enhancements.sql
✅ 011_telemedicine_recording.sql
✅ 012_add_cancellation_to_telemedicine.sql
```

#### Grupo 4: Autenticação e Acesso

```
✅ 013_add_patient_login_token.sql
✅ 014_allow_patient_login_by_token.sql
✅ 015_fix_patient_login_token_policy.sql
✅ 016_fix_profiles_rls_for_api.sql
```

#### Grupo 5: Funcionalidades Adicionais

```
✅ 017_case_studies.sql
✅ 018_clinic_rooms.sql
✅ 019_clinic_logo_bucket.sql
✅ 020_prescription_templates.sql
✅ 021_certificate_templates.sql
```

#### Grupo 6: WhatsApp e IA

```
✅ 022_ia_whatsapp_tables.sql
✅ 023_whatsapp_media_bucket.sql
✅ 024_insert_leads_kanban_agendamentos_data.sql
✅ 025_documentar_campos_agendamentos_ia.sql
```

#### Grupo 7: Follow-ups e Orçamentos

```
✅ 026_follow_up_and_orcamentos_tables.sql (PRIMEIRO)
✅ 026_telemedicine_transcriptions.sql (SEGUNDO)
✅ 027_add_followup_scheduling_fields.sql (PRIMEIRO)
✅ 027_add_template_type.sql (SEGUNDO)
✅ 027_fix_telemedicine_recording.sql (TERCEIRO)
✅ 027_quick_message_templates.sql (QUARTO)
```

#### Grupo 8: Finalização

```
✅ 028_add_doctor_whatsapp_phone.sql
✅ 029_add_desenvolvedor_role.sql
✅ 029_update_policies_with_desenvolvedor.sql
✅ 030_create_desenvolvedor_user.sql (opcional)
✅ 031_add_appointment_created_by_tracking.sql
```

### 2.3. Como Executar Cada Migration

Para cada arquivo:

1. Abra o arquivo SQL (ex: `001_initial_schema.sql`)
2. Copie TODO o conteúdo (Ctrl+A, Ctrl+C)
3. Cole no SQL Editor do Supabase
4. Clique em **"Run"** ou pressione **Ctrl+Enter**
5. Aguarde:
   - ✅ **Sucesso:** "Success. No rows returned"
   - ❌ **Erro:** Leia a mensagem e corrija
6. Se deu certo, passe para a próxima

**⏱️ Tempo total:** 15-30 minutos

### 2.4. Verificar Migrações

Execute este SQL para verificar:

```sql
-- Verificar tabelas
SELECT COUNT(*) as total_tabelas
FROM information_schema.tables
WHERE table_schema = 'public';
-- Deve retornar 30+ tabelas

-- Verificar RLS
SELECT COUNT(*) as tabelas_com_rls
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;
-- Deve retornar todas as tabelas principais
```

---

## 📝 PASSO 3: Configurar Supabase

### 3.1. Criar Storage Buckets

1. Vá em **Storage** no menu lateral
2. Crie os buckets (se não foram criados automaticamente):

| Nome | Público | Descrição |
|------|---------|-----------|
| `medical-attachments` | ❌ Não | Anexos médicos |
| `clinic-logo` | ✅ Sim | Logo da clínica |
| `whatsapp-media` | ❌ Não | Mídias WhatsApp |

**Para cada bucket:**
- Clique em **"New bucket"**
- Digite o nome
- Marque/desmarque **"Public bucket"**
- Clique em **"Create bucket"**

### 3.2. Configurar URLs de Redirecionamento

1. Vá em **Authentication** → **URL Configuration**
2. Configure:

**Site URL:**
```
https://seu-dominio.com
```

**Redirect URLs:**
```
https://seu-dominio.com/**
https://seu-dominio.com/auth/confirm
http://localhost:3000/** (para desenvolvimento)
```

3. Clique em **"Save"**

**⚠️ IMPORTANTE:** Se ainda não tem domínio, configure depois, mas é necessário para autenticação funcionar!

---

## 📝 PASSO 4: Configurar Domínio na Hostinger

**⚠️ IMPORTANTE:** Faça isso ANTES de instalar na VPS, para o DNS propagar enquanto você instala.

### 4.1. Obter IP do Servidor VPS

No servidor VPS, execute:
```bash
curl ifconfig.me
```

**Anote o IP!**

### 4.2. Configurar DNS na Hostinger

1. Acesse: https://www.hostinger.com.br
2. Faça login
3. Vá em **"Domínios"** → Seu domínio → **"DNS / Nameservers"**
4. Adicione registro **A**:

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| **A** | `sistema` | `SEU_IP_VPS` | 3600 |

(Se quiser usar o domínio principal, deixe "Nome" vazio ou use `@`)

5. Clique em **"Salvar"**
6. ⏳ Aguarde 1-2 horas para propagação DNS

**💡 Dica:** Enquanto aguarda, continue com a instalação na VPS.

---

## 📝 PASSO 5: Instalar Sistema na VPS

### 5.1. Conectar na VPS

```bash
ssh usuario@seu-servidor
```

### 5.2. Executar Script de Deploy Automático

```bash
# Ir para diretório
cd /var/www

# Clonar repositório
git clone https://github.com/CavalcanteGestor/sistemamedico1.git sistema-medico

# Entrar no diretório
cd sistema-medico

# Dar permissão ao script
chmod +x DEPLOY_AUTOMATICO.sh

# Executar script
./DEPLOY_AUTOMATICO.sh
```

### 5.3. Responder Perguntas do Script

O script vai perguntar:

1. **Nome do projeto:** `sistema-medico` (ou outro nome)
2. **Domínio completo:** `sistema.seudominio.com` (o mesmo que configurou na Hostinger)
3. **Email para SSL:** Seu email (para certificado SSL)
4. **Diretório do projeto:** `/var/www/sistema-medico` (padrão)
5. **Repositório Git:** Já vem preenchido

**O script vai:**
- ✅ Instalar Node.js, Nginx, PM2, Certbot
- ✅ Clonar/atualizar repositório
- ✅ Instalar dependências
- ✅ Fazer build
- ✅ Configurar PM2
- ✅ Configurar Nginx
- ✅ Tentar obter certificado SSL (pode falhar se DNS não propagou ainda)

**⏱️ Tempo:** 10-15 minutos

---

## 📝 PASSO 6: Configurar Variáveis de Ambiente

### 6.1. Editar Arquivo .env.local

```bash
nano /var/www/sistema-medico/.env.local
```

### 6.2. Configurar Variáveis

Configure todas as variáveis necessárias:

```env
# ============================================
# SUPABASE - CONFIGURE COM AS CREDENCIAIS DO PASSO 1
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui
NEXT_PUBLIC_SUPABASE_PROJECT_REF=xxxxx

# ============================================
# URL DA APLICAÇÃO
# ============================================
NEXT_PUBLIC_APP_URL=https://sistema.seudominio.com

# ============================================
# EVOLUTION API - WhatsApp (se usar)
# ============================================
NEXT_PUBLIC_EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua_api_key_aqui
EVOLUTION_INSTANCE_NAME=default

# ============================================
# OPENAI - Para IA (se usar)
# ============================================
OPENAI_API_KEY=sua_chave_openai_aqui
OPENAI_MODEL=gpt-4o-mini

# ============================================
# CRON SECRET KEY - Para automações
# ============================================
CRON_SECRET_KEY=gerar_chave_forte_aqui
```

**Para gerar CRON_SECRET_KEY:**
```bash
openssl rand -base64 32
```

### 6.3. Salvar e Sair

- Pressione **Ctrl+X**
- Digite **Y** para salvar
- Pressione **Enter**

---

## 📝 PASSO 7: Reiniciar Aplicação

```bash
cd /var/www/sistema-medico

# Reiniciar PM2
pm2 restart sistema-medico

# Ver status
pm2 status

# Ver logs
pm2 logs sistema-medico --lines 50
```

---

## 📝 PASSO 8: Configurar SSL (Se Ainda Não Funcionou)

Se o DNS já propagou e o SSL não foi configurado automaticamente:

```bash
sudo certbot --nginx -d sistema.seudominio.com
```

Siga as instruções na tela.

---

## 📝 PASSO 9: Verificar Tudo

### 9.1. Verificar DNS Propagou

```bash
nslookup sistema.seudominio.com
# Deve mostrar o IP do seu servidor
```

### 9.2. Verificar Aplicação

```bash
# Ver status PM2
pm2 status

# Ver logs
pm2 logs sistema-medico

# Testar localmente
curl http://localhost:3000
```

### 9.3. Testar no Navegador

1. Acesse: `https://sistema.seudominio.com`
2. Deve carregar a página de login
3. Tente fazer login (se já tiver usuário criado)

---

## 📝 PASSO 10: Criar Primeiro Usuário Admin

### 10.1. Via Supabase Dashboard

1. Acesse Supabase Dashboard
2. Vá em **Authentication** → **Users**
3. Clique em **"Add user"** → **"Create new user"**
4. Preencha:
   - **Email:** admin@clinica.com
   - **Password:** Senha forte
   - **Auto Confirm User:** ✅ Marque
5. Clique em **"Create user"**

### 10.2. Atualizar Role para Admin

No SQL Editor, execute:

```sql
-- Atualizar role do usuário para admin
UPDATE profiles
SET role = 'admin'
WHERE id = 'ID_DO_USUARIO_CRIADO';
```

**Para encontrar o ID:**
```sql
SELECT id, email, role
FROM profiles
WHERE email = 'admin@clinica.com';
```

### 10.3. Fazer Login

1. Acesse: `https://sistema.seudominio.com/login`
2. Faça login com o email e senha criados
3. Deve redirecionar para o dashboard admin

---

## ✅ Checklist Final

Antes de considerar tudo pronto:

### Banco de Dados
- [ ] Projeto Supabase criado
- [ ] Todas as migrações executadas (001-031)
- [ ] Storage buckets criados
- [ ] URLs de redirecionamento configuradas

### Servidor VPS
- [ ] Sistema instalado e rodando
- [ ] PM2 configurado e funcionando
- [ ] Nginx configurado
- [ ] SSL/HTTPS funcionando
- [ ] Variáveis de ambiente configuradas

### DNS e Domínio
- [ ] DNS configurado na Hostinger
- [ ] DNS propagado (verificado com nslookup)
- [ ] Domínio acessível via HTTPS

### Funcionalidades
- [ ] Login funcionando
- [ ] Primeiro usuário admin criado
- [ ] Dashboard acessível
- [ ] Criação de médico testada
- [ ] Criação de paciente testada

---

## 🆘 Troubleshooting

### Problema: DNS não propagou

**Solução:**
- Aguarde mais tempo (pode levar até 48h)
- Verifique se o registro A está correto na Hostinger
- Limpe cache DNS: `ipconfig /flushdns` (Windows)

### Problema: SSL não funciona

**Solução:**
```bash
# Verificar se domínio aponta corretamente
nslookup sistema.seudominio.com

# Obter certificado manualmente
sudo certbot --nginx -d sistema.seudominio.com
```

### Problema: Aplicação não inicia

**Solução:**
```bash
# Ver logs
pm2 logs sistema-medico --err

# Verificar variáveis de ambiente
pm2 env sistema-medico

# Reinstalar dependências
cd /var/www/sistema-medico
npm install
npm run build
pm2 restart sistema-medico
```

### Problema: Erro nas migrações

**Solução:**
- Verifique se executou na ordem correta
- Leia a mensagem de erro específica
- Veja `supabase/ORDEM_EXECUCAO_MIGRATIONS.md` para detalhes

---

## 📊 Tempo Total Estimado

| Etapa | Tempo |
|-------|-------|
| Criar Supabase | 5 min |
| Executar migrações | 20-30 min |
| Configurar Supabase | 5 min |
| Configurar DNS | 2 min (propagação: 1-2h) |
| Instalar na VPS | 15-20 min |
| Configurar variáveis | 5 min |
| Configurar SSL | 5 min |
| Testar | 10 min |
| **TOTAL** | **1-2 horas** |

---

## 📚 Documentação Relacionada

- **Ordem de migrações:** `supabase/ORDEM_EXECUCAO_MIGRATIONS.md`
- **Guia novo Supabase:** `GUIA_NOVO_SUPABASE_CLINICA.md`
- **Instruções Hostinger:** `INSTRUCOES_HOSTINGER.md`
- **Guia rápido deploy:** `GUIA_RAPIDO_DEPLOY.md`
- **Checklist produção:** `CHECKLIST_PRODUCAO.md`

---

## 🎯 Resumo Rápido (Para Referência)

```
1. Criar projeto Supabase → Anotar credenciais
2. Executar migrações 001-031 (na ordem)
3. Criar Storage buckets
4. Configurar URLs de redirecionamento
5. Configurar DNS na Hostinger
6. Executar DEPLOY_AUTOMATICO.sh na VPS
7. Configurar .env.local
8. Reiniciar aplicação
9. Configurar SSL (se necessário)
10. Criar primeiro usuário admin
11. Testar tudo
```

---

**Pronto!** Siga esta ordem e seu sistema estará funcionando! 🚀

**Última atualização:** 2025-01-05

