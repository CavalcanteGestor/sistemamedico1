# 🏥 Guia Completo: Criar Novo Banco Supabase para Nova Clínica

## 📋 Resumo

**Sim, é basicamente executar as migrações**, mas há alguns passos adicionais importantes para configurar tudo corretamente.

---

## 🚀 Passo a Passo Completo

### 1️⃣ Criar Novo Projeto no Supabase

1. Acesse: https://supabase.com/dashboard
2. Clique em **"New Project"**
3. Preencha:
   - **Name:** Nome da clínica (ex: "Clínica São Paulo")
   - **Database Password:** Crie uma senha forte (anote em local seguro!)
   - **Region:** Escolha a região mais próxima
   - **Pricing Plan:** Escolha o plano adequado
4. Clique em **"Create new project"**
5. Aguarde 2-3 minutos para o projeto ser criado

---

### 2️⃣ Obter Credenciais

Após o projeto ser criado:

1. Vá em **Settings** → **API**
2. Anote:
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **anon public** key
   - **service_role** key (⚠️ MANTENHA SECRETO!)

---

### 3️⃣ Executar Migrações

#### Método Recomendado: Via Dashboard (Mais Seguro)

1. Acesse **SQL Editor** no menu lateral
2. Clique em **"New Query"**
3. Execute as migrações **NA ORDEM** (uma por vez):

**📖 Ordem completa:** Veja `supabase/ORDEM_EXECUCAO_MIGRATIONS.md`

**Ordem resumida:**
```
✅ 001_initial_schema.sql (OBRIGATÓRIO - Base de tudo)
✅ 002_rls_policies.sql (OBRIGATÓRIO - Segurança)
✅ 003_medical_record_attachments.sql
✅ 004_create_storage_bucket.sql
✅ 005_enhance_anamnesis_physical_exam.sql
✅ 006_enhance_notifications.sql
✅ 007_telemedicine_tables.sql
✅ 008_seed_data.sql (opcional - dados iniciais)
✅ 009_fix_telemedicine_rls.sql
✅ 010_telemedicine_enhancements.sql
✅ 011_telemedicine_recording.sql
✅ 012_add_cancellation_to_telemedicine.sql
✅ 013_add_patient_login_token.sql
✅ 014_allow_patient_login_by_token.sql
✅ 015_fix_patient_login_token_policy.sql
✅ 016_fix_profiles_rls_for_api.sql
✅ 017_case_studies.sql
✅ 018_clinic_rooms.sql
✅ 019_clinic_logo_bucket.sql
✅ 020_prescription_templates.sql
✅ 021_certificate_templates.sql
✅ 022_ia_whatsapp_tables.sql
✅ 023_whatsapp_media_bucket.sql
✅ 024_insert_leads_kanban_agendamentos_data.sql
✅ 025_documentar_campos_agendamentos_ia.sql
✅ 026_follow_up_and_orcamentos_tables.sql
✅ 026_telemedicine_transcriptions.sql
✅ 027_add_followup_scheduling_fields.sql
✅ 027_add_template_type.sql
✅ 027_fix_telemedicine_recording.sql
✅ 027_quick_message_templates.sql
✅ 028_add_doctor_whatsapp_phone.sql
✅ 029_add_desenvolvedor_role.sql
✅ 029_update_policies_with_desenvolvedor.sql
✅ 030_create_desenvolvedor_user.sql (opcional)
✅ 031_add_appointment_created_by_tracking.sql
```

**Como executar cada uma:**
1. Abra o arquivo SQL (ex: `001_initial_schema.sql`)
2. Copie TODO o conteúdo (Ctrl+A, Ctrl+C)
3. Cole no SQL Editor do Supabase
4. Clique em **"Run"** ou pressione **Ctrl+Enter**
5. Aguarde confirmação de sucesso
6. Passe para a próxima

**⏱️ Tempo estimado:** 15-30 minutos

---

### 4️⃣ Configurar Storage Buckets

Após executar as migrações, configure os buckets de Storage:

1. Vá em **Storage** no menu lateral
2. Crie os seguintes buckets (se não foram criados automaticamente):

| Nome do Bucket | Público | Descrição |
|----------------|---------|-----------|
| `medical-attachments` | ❌ Não | Anexos médicos (prontuários, exames) |
| `clinic-logo` | ✅ Sim | Logo da clínica |
| `whatsapp-media` | ❌ Não | Mídias do WhatsApp |

**Para cada bucket:**
1. Clique em **"New bucket"**
2. Digite o nome
3. Marque/desmarque **"Public bucket"** conforme a tabela
4. Clique em **"Create bucket"**

**Configurar políticas RLS nos buckets:**
- Os buckets devem ter políticas RLS configuradas (geralmente já configuradas pelas migrações)
- Se necessário, vá em **Storage** → **Policies** e verifique

---

### 5️⃣ Configurar URLs de Redirecionamento

**IMPORTANTE:** Configure as URLs para autenticação funcionar:

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

---

### 6️⃣ Verificar Configuração

Execute este SQL no SQL Editor para verificar:

```sql
-- Verificar tabelas principais
SELECT COUNT(*) as total_tabelas
FROM information_schema.tables
WHERE table_schema = 'public';
-- Deve retornar 30+ tabelas

-- Verificar RLS habilitado
SELECT COUNT(*) as tabelas_com_rls
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;
-- Deve retornar todas as tabelas principais

-- Verificar triggers importantes
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN ('handle_new_user', 'update_updated_at_column');
-- Deve retornar os triggers
```

---

### 7️⃣ Configurar Variáveis de Ambiente

No servidor VPS, configure o `.env.local`:

```bash
nano /var/www/sistema-medico/.env.local
```

Configure:
```env
# Supabase - NOVO PROJETO
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui
NEXT_PUBLIC_SUPABASE_PROJECT_REF=xxxxx

# URL da aplicação
NEXT_PUBLIC_APP_URL=https://seu-dominio.com

# Outras variáveis (Evolution API, OpenAI, etc.)
# ... (configure conforme necessário)
```

---

### 8️⃣ Reiniciar Aplicação

Após configurar tudo:

```bash
cd /var/www/sistema-medico
pm2 restart sistema-medico
```

---

## ✅ Checklist Final

Antes de considerar tudo pronto:

- [ ] Projeto Supabase criado
- [ ] Todas as migrações executadas (001 até 031)
- [ ] Storage buckets criados (medical-attachments, clinic-logo, whatsapp-media)
- [ ] URLs de redirecionamento configuradas
- [ ] Variáveis de ambiente configuradas no servidor
- [ ] Aplicação reiniciada
- [ ] Teste de login funcionando
- [ ] Teste de criação de médico funcionando
- [ ] Teste de criação de paciente funcionando

---

## 🎯 Resumo Rápido

**Para criar banco para nova clínica:**

1. ✅ Criar projeto no Supabase
2. ✅ Executar migrações (001 até 031) na ordem
3. ✅ Configurar Storage buckets
4. ✅ Configurar URLs de redirecionamento
5. ✅ Atualizar variáveis de ambiente
6. ✅ Reiniciar aplicação

**Tempo total:** ~30-45 minutos

---

## 🆘 Problemas Comuns

### Erro: "relation already exists"
**Solução:** A tabela já existe. Pode pular essa migration ou remover a tabela antes.

### Erro: "permission denied"
**Solução:** Use o SQL Editor (não o Query Editor limitado).

### Storage buckets não aparecem
**Solução:** Crie manualmente em Storage → New bucket.

### Autenticação não funciona
**Solução:** Verifique se as URLs de redirecionamento estão configuradas corretamente.

---

## 📚 Documentação Relacionada

- **Ordem de migrações:** `supabase/ORDEM_EXECUCAO_MIGRATIONS.md`
- **Verificação:** `supabase/VERIFICACAO_MIGRATIONS.md`
- **Verificação:** Use o Supabase Dashboard para verificar o estado do banco

---

**Pronto!** Seu banco está configurado para a nova clínica! 🎉

