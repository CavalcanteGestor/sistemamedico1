# 🔄 Guia: Atualizar Sistema na VPS

## 🎯 Objetivo

Atualizar o sistema Lumi na VPS para a versão mais recente do GitHub.

## 🚀 Método 1: Script Automatizado (Recomendado)

### Passo 1: Conectar ao VPS

```bash
ssh root@31.97.242.100
```

### Passo 2: Ir para o diretório do projeto

```bash
cd /var/www/sistema-medico
# ou onde você instalou o sistema
```

### Passo 3: Baixar o script de atualização

```bash
# Se já tem o repositório
git pull origin main
chmod +x scripts/atualizar-sistema-vps.sh

# Ou baixar diretamente
cd /var/www
git clone https://github.com/CavalcanteGestor/sistemamedico1.git temp-update
cp temp-update/scripts/atualizar-sistema-vps.sh /root/
chmod +x /root/atualizar-sistema-vps.sh
```

### Passo 4: Executar o script

```bash
# Se estiver no diretório do projeto
./scripts/atualizar-sistema-vps.sh

# Ou se copiou para /root
cd /var/www/sistema-medico
/root/atualizar-sistema-vps.sh
```

O script vai:
1. ✅ Verificar status atual
2. ✅ Fazer backup do .env.local (opcional)
3. ✅ Atualizar código do Git
4. ✅ Instalar/atualizar dependências
5. ✅ Verificar variáveis de ambiente
6. ✅ Fazer build
7. ✅ Reiniciar com PM2
8. ✅ Verificar se está funcionando

## 📋 Método 2: Atualização Manual

### Passo 1: Conectar ao VPS

```bash
ssh root@31.97.242.100
```

### Passo 2: Ir para o diretório do projeto

```bash
cd /var/www/sistema-medico
```

### Passo 3: Fazer backup (Recomendado)

```bash
# Backup do .env.local
cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)

# Backup do código atual (opcional)
cd ..
tar -czf sistema-medico-backup-$(date +%Y%m%d_%H%M%S).tar.gz sistema-medico/
cd sistema-medico
```

### Passo 4: Atualizar código do Git

```bash
# Verificar mudanças locais
git status

# Se houver mudanças locais que você não precisa:
git reset --hard HEAD
git clean -fd

# Atualizar do GitHub
git fetch origin
git pull origin main
```

### Passo 5: Instalar/Atualizar dependências

```bash
npm install
```

### Passo 6: Verificar .env.local

```bash
# Verificar se existe
ls -la .env.local

# Se não existir, criar a partir do exemplo
cp env.local.example .env.local
nano .env.local  # Editar com suas credenciais
```

### Passo 7: Fazer Build

```bash
npm run build
```

### Passo 8: Reiniciar com PM2

```bash
# Verificar processos atuais
pm2 list

# Reiniciar o sistema
pm2 restart sistema-medico
# ou
pm2 restart all

# Verificar status
pm2 status

# Ver logs
pm2 logs sistema-medico --lines 20
```

## ⚠️ Troubleshooting

### Erro: "git: command not found"

```bash
apt update
apt install git -y
```

### Erro: "npm: command not found"

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

### Erro no build

```bash
# Limpar cache
rm -rf .next
rm -rf node_modules
npm install
npm run build
```

### Sistema não inicia após atualização

```bash
# Ver logs detalhados
pm2 logs sistema-medico --err

# Verificar variáveis de ambiente
cat .env.local

# Reiniciar do zero
pm2 delete sistema-medico
pm2 start ecosystem.config.js
```

### Conflitos no Git

```bash
# Descartar mudanças locais e forçar atualização
git reset --hard HEAD
git clean -fd
git pull origin main
```

## ✅ Verificação Pós-Atualização

### 1. Verificar se está rodando

```bash
pm2 list
```

Deve mostrar `sistema-medico` com status `online`.

### 2. Verificar logs

```bash
pm2 logs sistema-medico --lines 50
```

Não deve ter erros críticos.

### 3. Testar acesso

Acesse o sistema no navegador:
- `https://seu-dominio.com`
- Verifique se carrega normalmente
- Teste login

### 4. Verificar funcionalidades principais

- Login funciona?
- Dashboard carrega?
- APIs respondem?

## 🔄 Atualizações Futuras

Para atualizações futuras, use o script automatizado:

```bash
cd /var/www/sistema-medico
./scripts/atualizar-sistema-vps.sh
```

Ou crie um alias:

```bash
echo 'alias atualizar-lumi="cd /var/www/sistema-medico && ./scripts/atualizar-sistema-vps.sh"' >> ~/.bashrc
source ~/.bashrc

# Depois é só usar:
atualizar-lumi
```

## 📝 Checklist de Atualização

- [ ] Backup do .env.local feito
- [ ] Código atualizado do Git
- [ ] Dependências instaladas
- [ ] Build concluído sem erros
- [ ] PM2 reiniciado
- [ ] Sistema acessível
- [ ] Funcionalidades testadas
- [ ] Logs sem erros críticos

## 🆘 Precisa de Ajuda?

Se algo der errado:

1. **Verifique os logs**: `pm2 logs sistema-medico`
2. **Restaure o backup**: `cp .env.local.backup.* .env.local`
3. **Execute o script de diagnóstico**: `/root/analise-cpu-simples.sh`
4. **Me envie os erros** para análise

