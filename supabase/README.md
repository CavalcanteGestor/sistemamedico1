# Supabase Migrations

Este diretório contém as migrações do banco de dados para o Sistema Médico.

## Como aplicar as migrações

### Opção 1: Via Supabase Dashboard

1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Execute os arquivos SQL na ordem:
   - `001_initial_schema.sql`
   - `002_rls_policies.sql`

### Opção 2: Via Supabase CLI

```bash
# Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# Login no Supabase
supabase login

# Linkar ao projeto
supabase link --project-ref YOUR_PROJECT_REF

# Aplicar migrações
supabase db push
```

### Opção 3: Via SQL direto

Copie e cole o conteúdo de cada arquivo SQL no SQL Editor do Supabase Dashboard.

## Estrutura

- `001_initial_schema.sql`: Cria todas as tabelas, tipos, índices e triggers
- `002_rls_policies.sql`: Configura Row Level Security (RLS) e políticas de acesso

## Variáveis de Ambiente Necessárias

Após aplicar as migrações, configure as seguintes variáveis no arquivo `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Notas Importantes

1. As políticas RLS garantem que os dados sejam acessíveis apenas por usuários autorizados
2. O trigger `handle_new_user` cria automaticamente um perfil quando um usuário se registra
3. Todos os timestamps são atualizados automaticamente via triggers
4. Certifique-se de ter configurado o Storage do Supabase para upload de arquivos (documentos, exames, etc.)

