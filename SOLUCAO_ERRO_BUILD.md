# 🔧 Solução: Erro ENOTDIR no Build

## ❌ Erro Encontrado

```
Error: ENOTDIR: not a directory, stat '/var/www/sistema-medico/sites-enabled'
```

## 🔍 Causa

O Next.js está tentando acessar um arquivo ou link simbólico chamado `sites-enabled` dentro do diretório do projeto, mas ele não é um diretório válido. Isso não deveria existir no projeto.

## ✅ Solução

Execute estes comandos na VPS para remover o arquivo problemático:

```bash
cd /var/www/sistema-medico

# Verificar o que existe
ls -la | grep sites-enabled

# Se for um arquivo ou link simbólico, remover:
rm -f sites-enabled

# OU se for um diretório vazio que não deveria estar lá:
rm -rf sites-enabled

# Limpar cache do Next.js
rm -rf .next

# Tentar build novamente
npm run build
```

## 🔍 Verificação Completa

Se o problema persistir, verifique:

```bash
# 1. Verificar se há arquivos estranhos no diretório
cd /var/www/sistema-medico
ls -la

# 2. Verificar se há links simbólicos quebrados
find . -type l -exec ls -la {} \;

# 3. Verificar permissões
ls -la | head -20

# 4. Limpar completamente e tentar novamente
rm -rf .next node_modules
npm install
npm run build
```

## 🚨 Possíveis Causas

1. **Link simbólico quebrado**: Alguém pode ter criado um link simbólico para `/etc/nginx/sites-enabled` que está quebrado
2. **Arquivo com nome errado**: Pode haver um arquivo chamado `sites-enabled` que não deveria estar lá
3. **Diretório vazio problemático**: Um diretório vazio pode estar causando problemas

## 📝 Comandos Rápidos (Copiar e Colar)

```bash
cd /var/www/sistema-medico && rm -f sites-enabled && rm -rf .next && npm run build
```

## ✅ Após Corrigir

Após remover o arquivo problemático, o build deve funcionar normalmente.

Se ainda houver problemas, verifique:
- Permissões do diretório: `chown -R $USER:$USER /var/www/sistema-medico`
- Espaço em disco: `df -h`
- Logs detalhados: `npm run build 2>&1 | tee build.log`

