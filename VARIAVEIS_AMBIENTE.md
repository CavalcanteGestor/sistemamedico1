# 🔐 Variáveis de Ambiente - Guia Completo

## 📋 Resumo Rápido

**Para Desenvolvimento Local:**
- Use `.env.local` ✅

**Para Produção (VPS):**
- Use `.env.local` ✅ (ou `.env.production` se preferir)
- **NUNCA** commite no Git!

## 🔍 Diferença entre .env.local e .env.production

### `.env.local`
- ✅ **Usado em TODOS os ambientes** (desenvolvimento E produção)
- ✅ **Prioridade mais alta** - sobrescreve outros arquivos
- ✅ **Recomendado para VPS** também
- ✅ **Nunca é commitado** no Git (está no .gitignore)

### `.env.production`
- ⚠️ **Usado apenas quando `NODE_ENV=production`**
- ⚠️ **Menor prioridade** que `.env.local`
- ⚠️ **Opcional** - pode usar `.env.local` em produção também

## 🎯 Qual Usar?

### Desenvolvimento Local
```bash
# Criar a partir do exemplo
cp env.local.example .env.local

# Editar com suas credenciais
nano .env.local
```

### Produção (VPS)
```bash
# Opção 1: Usar .env.local (RECOMENDADO)
cp env.production.example .env.local
nano .env.local

# Opção 2: Usar .env.production (se preferir)
cp env.production.example .env.production
nano .env.production
```

**Recomendação:** Use `.env.local` em ambos os casos! É mais simples e funciona perfeitamente.

## 📝 Como Next.js Carrega Variáveis

Next.js carrega variáveis nesta ordem (maior prioridade primeiro):

1. `.env.local` ← **SEMPRE carregado, maior prioridade**
2. `.env.production` (se `NODE_ENV=production`)
3. `.env.development` (se `NODE_ENV=development`)
4. `.env` ← Menor prioridade

## ✅ Configuração Recomendada

### No Seu Computador (Desenvolvimento)
```bash
.env.local  # Com credenciais de desenvolvimento/teste
```

### Na VPS (Produção)
```bash
.env.local  # Com credenciais de produção
```

**Por que usar .env.local em produção?**
- ✅ Mais simples (um arquivo só)
- ✅ Sempre carregado (não depende de NODE_ENV)
- ✅ Já está no .gitignore
- ✅ Funciona perfeitamente

## 🔒 Segurança

### ⚠️ IMPORTANTE: Nunca Commite!

Estes arquivos estão no `.gitignore`:
- `.env.local` ✅
- `.env.production` ✅
- `.env.development` ✅
- `.env` ✅

**Nunca faça:**
```bash
git add .env.local  # ❌ ERRADO!
git commit -m "add env"  # ❌ ERRADO!
```

### ✅ Correto

```bash
# No servidor, criar manualmente
cp env.production.example .env.local
nano .env.local  # Editar com credenciais reais
```

## 📋 Estrutura dos Arquivos

### `env.local.example`
- Template para desenvolvimento
- Exemplo com valores placeholder
- **Pode ser commitado** (é só exemplo)

### `env.production.example`
- Template para produção
- Exemplo com valores placeholder
- **Pode ser commitado** (é só exemplo)

### `.env.local` (criado por você)
- Credenciais reais
- **NUNCA commitar**
- Usado em desenvolvimento E produção

## 🚀 Exemplo de Uso

### Desenvolvimento
```bash
# 1. Copiar exemplo
cp env.local.example .env.local

# 2. Editar com credenciais de teste
nano .env.local

# 3. Rodar
npm run dev
```

### Produção (VPS)
```bash
# 1. Conectar ao VPS
ssh root@seu-servidor.com

# 2. Ir para o projeto
cd /var/www/sistema-medico

# 3. Copiar exemplo
cp env.production.example .env.local

# 4. Editar com credenciais de produção
nano .env.local

# 5. Build e start
npm run build
pm2 start ecosystem.config.js
```

## 🔍 Verificar Variáveis Carregadas

### Em Desenvolvimento
```bash
# Ver variáveis (sem mostrar valores)
npm run dev
# As variáveis NEXT_PUBLIC_* estarão disponíveis no browser
```

### Em Produção
```bash
# Verificar se arquivo existe
ls -la .env.local

# Ver variáveis (cuidado: não mostrar em logs públicos!)
cat .env.local | grep -v "KEY\|SECRET\|PASSWORD"  # Mostrar apenas não-sensíveis
```

## ⚠️ Troubleshooting

### Problema: Variáveis não estão sendo carregadas

**Solução:**
1. Verificar se arquivo existe: `ls -la .env.local`
2. Verificar se está no diretório raiz do projeto
3. Reiniciar o servidor: `pm2 restart sistema-medico`
4. Verificar sintaxe do arquivo (sem espaços em `KEY=value`)

### Problema: Variáveis aparecem como `undefined`

**Solução:**
1. Variáveis `NEXT_PUBLIC_*` estão disponíveis no client
2. Outras variáveis só no server-side
3. Verificar se está usando `process.env.NEXT_PUBLIC_*` no client

## 📝 Checklist

- [ ] `.env.local` criado a partir do exemplo
- [ ] Todas as variáveis preenchidas
- [ ] Arquivo **NÃO** está no Git (verificar com `git status`)
- [ ] Variáveis `NEXT_PUBLIC_*` para client-side
- [ ] Variáveis sem `NEXT_PUBLIC_` apenas server-side
- [ ] Backup do `.env.local` feito antes de mudanças

## ✅ Resumo Final

**Use `.env.local` para TUDO!**
- ✅ Desenvolvimento: `.env.local`
- ✅ Produção: `.env.local`
- ✅ Simples e funciona perfeitamente
- ✅ Já está no .gitignore

**Não precisa de `.env.production`** a menos que você tenha uma razão específica para separar.

