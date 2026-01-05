# 📋 Instruções para Corrigir o Build na VPS

## 🚨 Problema
Erro: `ENOTDIR: not a directory, stat '/var/www/sistema-medico/sites-enabled'`

## ✅ Solução Passo a Passo

### Opção 1: Solução Rápida (Recomendada)

Execute estes comandos na VPS:

```bash
# 1. Ir para o diretório do projeto
cd /var/www/sistema-medico

# 2. Remover o arquivo problemático
rm -f sites-enabled

# 3. Limpar cache do Next.js
rm -rf .next

# 4. Atualizar código do GitHub
git pull origin main

# 5. Fazer build
npm run build

# 6. Reiniciar aplicação
pm2 restart sistema-medico
```

### Opção 2: Usando o Script Atualizado (Mais Fácil)

O script `update.sh` foi atualizado e agora limpa automaticamente os arquivos problemáticos:

```bash
# 1. Ir para o diretório do projeto
cd /var/www/sistema-medico

# 2. Atualizar código do GitHub
git pull origin main

# 3. Dar permissão de execução (se necessário)
chmod +x update.sh

# 4. Executar script de atualização
./update.sh
```

O script vai:
- ✅ Atualizar código do GitHub
- ✅ Instalar dependências
- ✅ Limpar arquivos problemáticos automaticamente
- ✅ Fazer build
- ✅ Reiniciar aplicação com PM2

## 🔍 Verificação

Após executar, verifique se funcionou:

```bash
# Ver status do PM2
pm2 status

# Ver logs
pm2 logs sistema-medico --lines 50

# Testar se aplicação está respondendo
curl http://localhost:3000
```

## ⚠️ Se Ainda Der Erro

Se o erro persistir, execute:

```bash
cd /var/www/sistema-medico

# Verificar o que existe no diretório
ls -la | grep sites

# Remover qualquer arquivo relacionado
rm -f sites-enabled sites-available

# Limpar tudo e reinstalar
rm -rf .next node_modules
npm install
npm run build
pm2 restart sistema-medico
```

## 📝 Comandos Completos (Copiar e Colar)

### Solução Rápida:
```bash
cd /var/www/sistema-medico && rm -f sites-enabled && rm -rf .next && git pull origin main && npm run build && pm2 restart sistema-medico
```

### Usando Script:
```bash
cd /var/www/sistema-medico && git pull origin main && chmod +x update.sh && ./update.sh
```

## ✅ Após Corrigir

O build deve funcionar normalmente e a aplicação deve estar rodando.

Verifique:
- ✅ Build concluído sem erros
- ✅ PM2 rodando: `pm2 status`
- ✅ Aplicação acessível: `curl http://localhost:3000`

---

**Última atualização**: Correções aplicadas no GitHub ✅

