# 📦 Guia de Instalação - Sistema Médico

Guia passo a passo para instalar e configurar o Sistema Médico.

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter:

- ✅ Node.js 18 ou superior instalado
- ✅ npm ou yarn instalado
- ✅ Conta no Supabase (gratuita)
- ✅ Conta na OpenAI (para funcionalidades de IA)
- ✅ Evolution API configurada (para WhatsApp)
- ✅ Git instalado

## 🚀 Instalação Passo a Passo

### Passo 1: Clonar o Repositório

```bash
git clone <repository-url>
cd SistemaMédico
```

### Passo 2: Instalar Dependências

```bash
npm install
```

Aguarde a instalação de todas as dependências. Isso pode levar alguns minutos.

### Passo 3: Configurar Supabase

#### 3.1. Criar Projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Crie uma conta (se não tiver)
3. Clique em "New Project"
4. Preencha os dados do projeto:
   - **Name**: Nome do seu projeto
   - **Database Password**: Escolha uma senha forte (salve em local seguro!)
   - **Region**: Escolha a região mais próxima
5. Aguarde a criação do projeto (2-3 minutos)

#### 3.2. Obter Credenciais

1. No dashboard do Supabase, vá em **Settings > API**
2. Copie:
   - **Project URL** (NEXT_PUBLIC_SUPABASE_URL)
   - **anon public** key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - **service_role** key (SUPABASE_SERVICE_ROLE_KEY) ⚠️ Mantenha secreto!

3. Anote o **Project Ref** da URL:
   - Se a URL for `https://abc123xyz.supabase.co`
   - O Project Ref é `abc123xyz`

### Passo 4: Configurar Variáveis de Ambiente

1. Copie o arquivo de exemplo:
```bash
cp env.local.example .env.local
```

2. Abra `.env.local` e preencha:

```env
# ============================================
# SUPABASE
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui
NEXT_PUBLIC_SUPABASE_PROJECT_REF=seu_project_ref_aqui

# ============================================
# URL DA APLICAÇÃO
# ============================================
# Desenvolvimento:
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Produção (após deploy):
# NEXT_PUBLIC_APP_URL=https://seu-dominio.com

# ============================================
# EVOLUTION API (WhatsApp)
# ============================================
NEXT_PUBLIC_EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua_api_key_aqui
EVOLUTION_INSTANCE_NAME=default

# ============================================
# OPENAI (IA)
# ============================================
OPENAI_API_KEY=sua_chave_openai_aqui
OPENAI_MODEL=gpt-4o-mini

# ============================================
# SUPABASE MANAGEMENT API
# ============================================
# Obtenha em: https://supabase.com/dashboard/account/tokens
SUPABASE_ACCESS_TOKEN=sua_chave_access_token_aqui

# ============================================
# CRON SECRET KEY
# ============================================
# Gere uma chave forte:
# openssl rand -base64 32
CRON_SECRET_KEY=sua_chave_secreta_forte_aqui
```

### Passo 5: Executar Migrações do Banco

⚠️ **IMPORTANTE**: Execute as migrações na ordem correta!

#### Opção A: Via Dashboard (Recomendado para Iniciantes)

1. No Supabase Dashboard, vá em **SQL Editor**
2. Abra o arquivo `supabase/migrations/001_initial_schema.sql`
3. Copie TODO o conteúdo
4. Cole no SQL Editor
5. Clique em **Run** (ou pressione Ctrl+Enter)
6. Repita para TODOS os arquivos na ordem:
   - `001_initial_schema.sql`
   - `002_rls_policies.sql`
   - `003_medical_record_attachments.sql`
   - ... até `031_add_appointment_created_by_tracking.sql`

#### Opção B: Via CLI (Avançado)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Fazer login
supabase login

# Linkar projeto
supabase link --project-ref SEU_PROJECT_REF

# Enviar migrações
supabase db push
```

### Passo 6: Configurar URLs de Redirecionamento

1. No Supabase Dashboard, vá em **Authentication > URL Configuration**
2. Em **Redirect URLs**, adicione:
   ```
   http://localhost:3000/**
   http://localhost:3000/auth/confirm
   ```
3. Em **Site URL**, configure:
   ```
   http://localhost:3000
   ```
4. Clique em **Save**

### Passo 7: Configurar Evolution API (WhatsApp)

1. Tenha uma instância da Evolution API rodando
2. Obtenha a URL e API Key
3. Configure no `.env.local` (já feito no Passo 4)

### Passo 8: Testar a Instalação

```bash
# Executar em modo desenvolvimento
npm run dev
```

Acesse: `http://localhost:3000`

Se tudo estiver correto, você verá a tela de login.

### Passo 9: Criar Primeiro Usuário Admin

#### Opção A: Usar Seed Data

A migration `008_seed_data.sql` cria um usuário padrão. Verifique as credenciais no arquivo.

⚠️ **IMPORTANTE**: Altere a senha padrão no primeiro acesso!

#### Opção B: Criar Manualmente

1. Acesse o Supabase Dashboard > Authentication > Users
2. Clique em "Add User"
3. Preencha email e senha
4. Crie um perfil na tabela `profiles` com `role = 'admin'`

## ✅ Verificação da Instalação

Verifique se tudo está funcionando:

- [ ] Aplicação inicia sem erros
- [ ] Consegue fazer login
- [ ] Dashboard carrega corretamente
- [ ] Consegue criar um médico
- [ ] Consegue criar um paciente
- [ ] WhatsApp está conectado (se configurado)
- [ ] Telemedicina funciona (teste criando uma sessão)

## 🐛 Problemas Comuns

### Erro: "Invalid API key"
- Verifique se as chaves do Supabase estão corretas
- Verifique se não há espaços extras

### Erro: "Could not find table"
- Execute todas as migrações na ordem correta
- Verifique se não pulou nenhuma migration

### Erro: "Link expirado" ao criar médico
- Verifique URLs de redirecionamento no Supabase
- Verifique `NEXT_PUBLIC_APP_URL` no `.env.local`

### Erro: Build falha
- Verifique se todas as dependências foram instaladas: `npm install`
- Limpe cache: `rm -rf .next node_modules && npm install`

## 🚀 Próximos Passos

Após instalação bem-sucedida:

1. **Configure templates de email** (opcional):
   - Veja `GUIA_TEMPLATE_EMAIL_MEDICO.md`

2. **Configure cron jobs** para automações:
   - Veja seção no README.md principal

3. **Faça deploy para produção**:
   - Veja guias de deploy na documentação

4. **Personalize o sistema**:
   - Configure logo e nome da clínica
   - Ajuste configurações no dashboard

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs no console do navegador
2. Verifique os logs do servidor
3. Consulte a documentação
4. Verifique issues conhecidos

---

**Última Atualização**: 2025  
**Versão**: 1.0.0

