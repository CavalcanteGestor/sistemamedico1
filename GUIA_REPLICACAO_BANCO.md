# 📋 Guia Completo: Como Replicar o Banco de Dados

Este guia explica passo a passo como replicar o banco de dados do Sistema Médico em um novo projeto Supabase.

## 🎯 Pré-requisitos

1. Conta no Supabase (https://supabase.com)
2. Novo projeto Supabase criado
3. Acesso ao SQL Editor do Supabase Dashboard

## 🎯 Método Recomendado: Via Dashboard (Mais Seguro)

**Por quê este método?**
- ✅ Você vê cada erro em tempo real
- ✅ Pode corrigir problemas imediatamente
- ✅ Não depende de configurações de CLI
- ✅ Mais controle sobre o processo
- ✅ Menor chance de erros

**Veja o guia detalhado:** `supabase/ORDEM_EXECUCAO_MIGRATIONS.md`

## 📝 Passo a Passo

### 1. Criar Novo Projeto no Supabase

1. Acesse https://supabase.com/dashboard
2. Clique em "New Project"
3. Preencha:
   - **Name**: Nome do seu projeto
   - **Database Password**: Senha forte (anote bem!)
   - **Region**: Escolha a região mais próxima
4. Clique em "Create new project"
5. Aguarde a criação (pode levar alguns minutos)

### 2. Obter Credenciais do Projeto

1. No Dashboard do Supabase, vá em **Settings** > **API**
2. Anote as seguintes informações:
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **anon/public key** (chave pública)
   - **service_role key** (chave privada - NUNCA exponha no frontend!)

### 3. Aplicar Migrations (Estrutura do Banco)

As migrations estão na pasta `supabase/migrations/` e devem ser executadas **na ordem numérica**.

#### Opção A: Via Supabase Dashboard (Recomendado para iniciantes)

1. No Dashboard do Supabase, vá em **SQL Editor**
2. Para cada arquivo na pasta `supabase/migrations/`, na ordem:
   - Abra o arquivo SQL
   - Copie todo o conteúdo
   - Cole no SQL Editor
   - Clique em **Run** (ou pressione Ctrl+Enter)
   - Aguarde a confirmação de sucesso

**Ordem de execução:**
```
001_initial_schema.sql
002_rls_policies.sql
003_medical_record_attachments.sql
004_create_storage_bucket.sql
005_enhance_anamnesis_physical_exam.sql
006_enhance_notifications.sql
007_telemedicine_tables.sql
008_seed_data.sql
009_fix_telemedicine_rls.sql
010_telemedicine_enhancements.sql
011_telemedicine_recording.sql
012_add_cancellation_to_telemedicine.sql
013_add_patient_login_token.sql
014_allow_patient_login_by_token.sql
015_fix_patient_login_token_policy.sql
016_fix_profiles_rls_for_api.sql
017_case_studies.sql
018_clinic_rooms.sql
019_clinic_logo_bucket.sql
020_prescription_templates.sql
021_certificate_templates.sql
022_ia_whatsapp_tables.sql
023_whatsapp_media_bucket.sql
024_insert_leads_kanban_agendamentos_data.sql
025_documentar_campos_agendamentos_ia.sql
026_follow_up_and_orcamentos_tables.sql
026_telemedicine_transcriptions.sql
027_add_followup_scheduling_fields.sql
027_fix_telemedicine_recording.sql
027_quick_message_templates.sql
028_add_doctor_whatsapp_phone.sql
030_create_desenvolvedor_user.sql
```

⚠️ **ATENÇÃO**: Se houver erro em alguma migration, verifique:
- Se a migration anterior foi executada com sucesso
- Se há dependências entre migrations
- Se há conflitos de nomes (tabelas, funções, etc.)

#### Opção B: Via Supabase CLI (Recomendado para desenvolvedores)

1. **Instalar Supabase CLI:**
```bash
npm install -g supabase
# ou
brew install supabase/tap/supabase
```

2. **Login no Supabase:**
```bash
supabase login
```

3. **Linkar ao projeto:**
```bash
supabase link --project-ref SEU_PROJECT_REF
```
   - O `PROJECT_REF` está na URL do projeto: `https://PROJECT_REF.supabase.co`

4. **Aplicar todas as migrations:**
```bash
supabase db push
```

### 4. Configurar Storage Buckets

O sistema precisa de buckets de storage para armazenar arquivos. Configure manualmente:

1. No Dashboard do Supabase, vá em **Storage**
2. Crie os seguintes buckets (se não foram criados pelas migrations):

   - **medical-documents** (público: false)
   - **exam-results** (público: false)
   - **whatsapp-media** (público: false)
   - **clinic-logo** (público: true)

3. Para cada bucket, configure as políticas RLS conforme necessário

### 5. Configurar Variáveis de Ambiente

1. Copie o arquivo `.env.local.example` para `.env.local`
2. Preencha com as credenciais do seu novo projeto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui

# Outras configurações
NEXT_PUBLIC_APP_URL=http://localhost:3000
OPENAI_API_KEY=sua_chave_openai
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua_api_key
```

### 6. Verificar Configuração

Execute estas queries no SQL Editor para verificar se tudo foi criado:

```sql
-- Verificar tabelas principais
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verificar se RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Verificar triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

### 7. Criar Usuário Administrador Inicial

Após aplicar as migrations, você precisa criar um usuário administrador:

1. No Dashboard do Supabase, vá em **Authentication** > **Users**
2. Clique em **Add user** > **Create new user**
3. Preencha:
   - **Email**: seu email
   - **Password**: senha forte
   - **Auto Confirm User**: ✅ (marcado)
4. Clique em **Create user**

5. No **SQL Editor**, execute:

```sql
-- Atualizar o perfil do usuário para admin
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'seu-email@exemplo.com';
```

### 8. Testar a Conexão

1. Inicie o projeto:
```bash
npm install
npm run dev
```

2. Acesse `http://localhost:3000/login`
3. Faça login com o usuário admin criado
4. Verifique se consegue acessar o dashboard

## 🔄 Replicar Dados Existentes (Opcional)

Se você quer copiar dados de um banco existente para o novo:

### Opção 1: Export/Import via Supabase Dashboard

1. No projeto **origem**, vá em **Database** > **Backups**
2. Crie um backup
3. No projeto **destino**, restaure o backup

### Opção 2: Export/Import via SQL

1. No projeto **origem**, use o SQL Editor para exportar dados:
```sql
-- Exemplo: exportar pacientes
COPY (SELECT * FROM patients) TO STDOUT WITH CSV HEADER;
```

2. No projeto **destino**, importe:
```sql
COPY patients FROM STDIN WITH CSV HEADER;
-- Cole os dados aqui
```

### Opção 3: Usar Supabase CLI

```bash
# Exportar do projeto origem
supabase db dump -f backup.sql

# Importar no projeto destino
supabase db reset
psql -h db.SEU_PROJECT_REF.supabase.co -U postgres -d postgres -f backup.sql
```

## ⚠️ Problemas Comuns

### Erro: "relation already exists"
- Significa que a tabela já existe. Pule essa migration ou remova a tabela antes.

### Erro: "permission denied"
- Verifique se está usando a service_role key ou se tem permissões adequadas.

### Erro: "function does not exist"
- Verifique se executou todas as migrations na ordem correta.

### RLS bloqueando acesso
- Verifique se as políticas RLS foram criadas corretamente (migration 002).

## 📚 Recursos Adicionais

- [Documentação Supabase](https://supabase.com/docs)
- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

## ✅ Checklist Final

- [ ] Todas as migrations foram executadas
- [ ] Storage buckets foram criados
- [ ] Variáveis de ambiente configuradas
- [ ] Usuário admin criado
- [ ] Login funcionando
- [ ] Dashboard acessível
- [ ] RLS habilitado em todas as tabelas

---

**Pronto!** Seu banco de dados está replicado e pronto para uso! 🎉

