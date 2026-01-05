# 🚀 Guia Rápido: Executar Migrations do Supabase

## 🎯 Objetivo

Executar todas as migrations do banco de dados de forma rápida e eficiente.

## 📊 Situação Atual

**Método Manual (Atual):**
- ❌ Executar cada migration individualmente no SQL Editor
- ❌ Copiar e colar 32+ arquivos
- ❌ Muito demorado e propenso a erros

## ✅ Métodos Disponíveis (Do Mais Rápido ao Mais Lento)

### 1️⃣ Método CLI do Supabase (MAIS RÁPIDO ⚡)

**Vantagens:**
- ✅ Aplica todas as migrations automaticamente
- ✅ Muito mais rápido
- ✅ Verifica ordem automaticamente
- ✅ Melhor para desenvolvimento contínuo

**Como usar:**

```bash
# 1. Instalar Supabase CLI
npm install -g supabase

# 2. Linkar ao projeto
supabase link --project-ref SEU_PROJECT_REF
# (Project Ref está na URL do Supabase: https://SEU_PROJECT_REF.supabase.co)

# 3. Aplicar todas as migrations
supabase db push
```

**Pronto!** Todas as migrations são aplicadas automaticamente.

### 2️⃣ Método Script SQL Consolidado

**Vantagens:**
- ✅ Um único arquivo SQL
- ✅ Executa tudo de uma vez
- ✅ Não precisa instalar nada
- ✅ Funciona direto no SQL Editor

**Como usar:**

```bash
# Executar script que gera arquivo consolidado
./scripts/executar-todas-migrations.sh
# Escolher opção 3

# Depois:
# 1. Acesse Supabase Dashboard > SQL Editor
# 2. Abra o arquivo: supabase/MIGRATIONS_CONSOLIDADAS.sql
# 3. Copie TODO o conteúdo
# 4. Cole no SQL Editor
# 5. Execute (Run)
```

### 3️⃣ Método Manual (Atual)

**Quando usar:**
- ⚠️ Apenas se os outros métodos não funcionarem
- ⚠️ Quando precisa de controle total sobre cada migration

**Como usar:**
- Veja: `supabase/ORDEM_EXECUCAO_MIGRATIONS.md`

## 🎯 Recomendação

**Use o Método 1 (CLI do Supabase)** - É o mais rápido e profissional!

## 📋 Comparação

| Método | Tempo | Facilidade | Recomendado |
|--------|-------|------------|-------------|
| CLI Supabase | ⚡ 1 minuto | ⭐⭐⭐⭐⭐ | ✅ SIM |
| SQL Consolidado | 🟡 5 minutos | ⭐⭐⭐⭐ | ✅ SIM |
| Manual | 🔴 30+ minutos | ⭐⭐ | ❌ Não |

## 🚀 Setup Rápido (CLI)

### Passo 1: Instalar CLI

```bash
npm install -g supabase
```

### Passo 2: Linkar Projeto

```bash
# Obter Project Ref da URL do Supabase
# Se sua URL é: https://abc123xyz.supabase.co
# O Project Ref é: abc123xyz

supabase link --project-ref abc123xyz
```

### Passo 3: Aplicar Migrations

```bash
# Aplicar todas as migrations
supabase db push

# Ou aplicar migrations específicas
supabase migration up
```

## 🔍 Verificar Status

```bash
# Ver migrations aplicadas
supabase migration list

# Ver diferenças entre local e remoto
supabase db diff
```

## ⚠️ Importante

### Backup Antes!

Sempre faça backup antes de aplicar migrations:

```sql
-- No SQL Editor do Supabase
-- Exportar schema (opcional, mas recomendado)
```

### Ordem das Migrations

As migrations são aplicadas em ordem alfabética. Os nomes já estão numerados (001_, 002_, etc.) para garantir ordem correta.

## 🆘 Troubleshooting

### Erro: "Migration already applied"

```bash
# Resetar estado local (CUIDADO!)
supabase migration repair
```

### Erro: "Project not linked"

```bash
# Linkar novamente
supabase link --project-ref SEU_PROJECT_REF
```

### Erro: "Migration conflict"

```bash
# Ver diferenças
supabase db diff

# Resolver manualmente se necessário
```

## 📝 Resumo

**Para Nova Clínica:**
1. ✅ Instalar Supabase CLI: `npm install -g supabase`
2. ✅ Linkar projeto: `supabase link --project-ref SEU_REF`
3. ✅ Aplicar migrations: `supabase db push`
4. ✅ Pronto! Banco configurado em minutos

**Muito mais rápido que o método manual!** ⚡

