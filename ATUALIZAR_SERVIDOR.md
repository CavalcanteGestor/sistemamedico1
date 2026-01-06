# 🔄 Como Atualizar o Servidor VPS

## ⚠️ Erro: Conflito de Arquivos Locais

Se você receber este erro ao fazer `git pull`:

```
error: Your local changes to the following files would be overwritten by merge:
        CORRIGIR_HEADERS_GRANDES_NGINX.sh
        scripts/atualizar-sistema-vps.sh
```

## ✅ Solução Rápida

Esses arquivos foram removidos do repositório. Você pode descartar as mudanças locais:

### Opção 1: Descartar Mudanças Locais (Recomendado)

```bash
cd /var/www/sistema-medico

# Descartar mudanças nos arquivos específicos
git checkout -- CORRIGIR_HEADERS_GRANDES_NGINX.sh
git checkout -- scripts/atualizar-sistema-vps.sh

# Ou descartar TODAS as mudanças locais (cuidado!)
git reset --hard HEAD

# Agora fazer o pull
git pull origin main
```

### Opção 2: Fazer Stash (Se quiser salvar as mudanças)

```bash
cd /var/www/sistema-medico

# Salvar mudanças temporariamente
git stash

# Fazer o pull
git pull origin main

# Se quiser recuperar as mudanças depois:
# git stash pop
```

### Opção 3: Remover Arquivos Manualmente

```bash
cd /var/www/sistema-medico

# Remover os arquivos que estão causando conflito
rm -f CORRIGIR_HEADERS_GRANDES_NGINX.sh
rm -f scripts/atualizar-sistema-vps.sh

# Fazer o pull
git pull origin main
```

---

## 🔄 Processo Completo de Atualização

Após resolver o conflito, atualize o sistema:

```bash
cd /var/www/sistema-medico

# 1. Resolver conflitos (usar uma das opções acima)

# 2. Atualizar código
git pull origin main

# 3. Instalar novas dependências (se houver)
npm ci

# 4. Fazer build
npm run build

# 5. Reiniciar aplicação
pm2 restart sistema-medico

# 6. Verificar logs
pm2 logs sistema-medico --lines 50
```

---

## 📝 Nota Importante

Os arquivos `CORRIGIR_HEADERS_GRANDES_NGINX.sh` e `scripts/atualizar-sistema-vps.sh` foram removidos porque:

- `CORRIGIR_HEADERS_GRANDES_NGINX.sh` - A correção já está integrada no `install.sh`
- `scripts/atualizar-sistema-vps.sh` - Substituído pelo processo de atualização manual acima

Você pode descartar essas mudanças locais com segurança.

