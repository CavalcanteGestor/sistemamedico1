# 📋 Ordem de Execução das Migrations - GUIA SEGURO

## ✅ Método Recomendado: Via Dashboard (Mais Seguro)

Este método permite ver cada erro em tempo real e corrigir problemas imediatamente.

## 📝 Passo a Passo Detalhado

### 1. Preparação
1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto (ou crie um novo)
3. Vá em **SQL Editor** (menu lateral)
4. Clique em **New Query**

### 2. Executar Script de Verificação (Opcional mas Recomendado)
Antes de começar, verifique o estado atual do banco no Supabase Dashboard.

### 3. Executar Migrations na Ordem

Execute **UM ARQUIVO POR VEZ** na ordem abaixo. **Aguarde a confirmação de sucesso antes de passar para o próximo.**

#### Grupo 1: Estrutura Base (OBRIGATÓRIO)
```
✅ 001_initial_schema.sql
   └─ Cria todas as tabelas principais, tipos, índices e triggers
   └─ Tempo estimado: 2-3 minutos
   └─ ⚠️ Se der erro, verifique se o projeto está ativo

✅ 002_rls_policies.sql
   └─ Configura Row Level Security e políticas de acesso
   └─ Tempo estimado: 1-2 minutos
   └─ ⚠️ CRÍTICO: Sem isso, o sistema não funcionará corretamente
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
✅ 008_seed_data.sql (dados iniciais - opcional)
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

#### Grupo 7: Follow-ups e Orçamentos (⚠️ ATENÇÃO: Múltiplos arquivos 026 e 027)
```
✅ 026_follow_up_and_orcamentos_tables.sql (executar PRIMEIRO)
✅ 026_telemedicine_transcriptions.sql (executar DEPOIS)
✅ 027_add_followup_scheduling_fields.sql (executar PRIMEIRO)
✅ 027_fix_telemedicine_recording.sql (executar SEGUNDO)
✅ 027_quick_message_templates.sql (executar TERCEIRO)
```

#### Grupo 8: Finalização
```
✅ 028_add_doctor_whatsapp_phone.sql
✅ 030_create_desenvolvedor_user.sql (opcional - cria usuário de teste)
```

## 🔍 Como Executar Cada Migration

### Método Passo a Passo:

1. **Abra o arquivo SQL** (ex: `001_initial_schema.sql`)
2. **Copie TODO o conteúdo** (Ctrl+A, Ctrl+C)
3. **Cole no SQL Editor** do Supabase (Ctrl+V)
4. **Clique em "Run"** ou pressione **Ctrl+Enter**
5. **Aguarde a confirmação:**
   - ✅ Sucesso: Verá "Success. No rows returned" ou mensagem de sucesso
   - ❌ Erro: Verá mensagem de erro em vermelho
6. **Se der erro:**
   - Leia a mensagem de erro cuidadosamente
   - Verifique se a migration anterior foi executada
   - Veja a seção "Problemas Comuns" abaixo
7. **Se deu certo:** Passe para o próximo arquivo

## ⚠️ Problemas Comuns e Soluções

### Erro: "relation already exists"
**Causa:** A tabela/função já existe  
**Solução:** 
- Se você já executou essa migration antes, pode pular
- Ou remova a tabela manualmente antes de executar novamente

### Erro: "permission denied"
**Causa:** Falta de permissões  
**Solução:** 
- Verifique se está usando o SQL Editor (tem permissões completas)
- Não use o Query Editor limitado

### Erro: "function does not exist"
**Causa:** Migration anterior não foi executada  
**Solução:** 
- Execute as migrations na ordem
- Verifique se a migration anterior foi executada com sucesso

### Erro: "type already exists"
**Causa:** Tipo enum já foi criado  
**Solução:** 
- Pode ignorar se o tipo já existe
- Ou remova o tipo antes: `DROP TYPE nome_do_tipo CASCADE;`

### Erro: "column already exists"
**Causa:** Coluna já existe na tabela  
**Solução:** 
- Verifique se a migration já foi executada parcialmente
- Pode pular essa migration se tudo já existe

## ✅ Checklist de Verificação

Após executar todas as migrations, execute este SQL para verificar:

```sql
-- Verificar tabelas principais
SELECT COUNT(*) as total_tabelas
FROM information_schema.tables
WHERE table_schema = 'public';

-- Deve retornar aproximadamente 30+ tabelas

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
```

## 🎯 Tempo Total Estimado

- **Migrations básicas (001-002):** 5 minutos
- **Todas as migrations:** 15-20 minutos
- **Com verificação e correção de erros:** 30-45 minutos

## 💡 Dicas Importantes

1. **Não tenha pressa:** Execute uma migration por vez
2. **Leia os erros:** A maioria dos erros tem solução simples
3. **Faça backup:** Se possível, faça backup antes de começar
4. **Anote problemas:** Se encontrar erros, anote para referência futura
5. **Verifique ao final:** Execute o checklist de verificação

## 🚀 Alternativa Rápida (Avançado)

Se você tem experiência com Supabase CLI e quer fazer tudo de uma vez:

```bash
# Instalar CLI
npm install -g supabase

# Login
supabase login

# Linkar projeto
supabase link --project-ref SEU_PROJECT_REF

# Aplicar todas as migrations
supabase db push
```

**⚠️ ATENÇÃO:** Este método aplica todas as migrations de uma vez. Se houver erro, pode ser mais difícil identificar qual migration falhou.

---

## 📞 Precisa de Ajuda?

Se encontrar problemas:
1. Verifique a mensagem de erro específica
2. Consulte a seção "Problemas Comuns" acima
3. Verifique se todas as migrations anteriores foram executadas
4. Execute o script `REPLICACAO_SEGURA.sql` para diagnóstico

