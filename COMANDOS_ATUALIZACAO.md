# 📥 Comandos para Atualizar e Build do Projeto

## 🔄 Atualizar Projeto do GitHub

### 1. Atualizar do GitHub (Pull)

```bash
# Atualizar o código do repositório remoto
git pull origin main
```

**Ou se quiser forçar atualização completa:**

```bash
# Buscar todas as atualizações
git fetch origin

# Atualizar branch local
git pull origin main
```

---

## 📦 Instalar/Atualizar Dependências

Após atualizar do GitHub, pode ser necessário atualizar as dependências:

```bash
# Instalar/atualizar todas as dependências
npm install
```

---

## 🔨 Fazer Build do Projeto

### Build de Produção

```bash
# Build completo de produção
npm run build
```

### Verificar antes do Build

O projeto já tem verificações automáticas antes do build:

```bash
# Verificar estrutura e dependências
npm run check

# Verificar segurança
npm run check:security

# Build (já executa check e check:security automaticamente)
npm run build
```

---

## 🚀 Sequência Completa de Atualização

```bash
# 1. Atualizar do GitHub
git pull origin main

# 2. Instalar/atualizar dependências (se necessário)
npm install

# 3. Fazer build
npm run build

# 4. (Opcional) Testar localmente
npm start
```

---

## 📝 Comandos Úteis Adicionais

### Verificar Status do Git

```bash
# Ver status das alterações
git status

# Ver últimas alterações
git log --oneline -10
```

### Verificar Dependências

```bash
# Ver dependências desatualizadas
npm outdated

# Atualizar dependências (cuidado - pode quebrar)
npm update
```

### Limpar e Reinstalar

```bash
# Limpar node_modules e reinstalar (se houver problemas)
rm -rf node_modules package-lock.json
npm install
```

**No Windows (PowerShell):**
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

---

## ⚠️ Problemas Comuns

### Conflito de Merge

Se houver conflitos ao fazer `git pull`:

```bash
# Ver conflitos
git status

# Resolver conflitos manualmente nos arquivos indicados
# Depois:
git add .
git commit -m "Resolve merge conflicts"
```

### Build Falha

Se o build falhar:

```bash
# 1. Limpar cache do Next.js
rm -rf .next

# 2. Reinstalar dependências
npm install

# 3. Tentar build novamente
npm run build
```

**No Windows:**
```powershell
Remove-Item -Recurse -Force .next
npm install
npm run build
```

---

## 🎯 Resumo Rápido

**Atualizar e Build:**
```bash
git pull origin main && npm install && npm run build
```

**Apenas Build:**
```bash
npm run build
```

---

**Última atualização:** 2025-01-XX

