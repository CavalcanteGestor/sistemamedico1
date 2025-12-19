# 🚀 Guia de Deploy para VPS - Sistema Médico

Guia completo para fazer deploy do Sistema Médico em um servidor VPS.

## 📋 Pré-requisitos

- VPS com Ubuntu 20.04+ ou Debian 11+
- Node.js 18+ instalado
- Nginx instalado
- Domínio apontando para o IP do VPS
- Acesso SSH ao servidor

## 🔧 Passo 1: Preparar o Servidor

### 1.1. Atualizar o sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2. Instalar Node.js (se não tiver)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### 1.3. Instalar Nginx

```bash
sudo apt install -y nginx
```

### 1.4. Instalar PM2 (gerenciador de processos)

```bash
sudo npm install -g pm2
```

## 📦 Passo 2: Fazer Upload do Projeto

### 2.1. No seu computador local

```bash
# Compactar o projeto (excluindo node_modules)
tar --exclude='node_modules' --exclude='.next' -czf sistema-medico.tar.gz .

# Ou usar git
git clone <seu-repositorio>
```

### 2.2. No servidor VPS

```bash
# Criar diretório para o projeto
sudo mkdir -p /var/www/sistema-medico
sudo chown $USER:$USER /var/www/sistema-medico

# Fazer upload via SCP (do seu computador)
scp sistema-medico.tar.gz usuario@seu-servidor:/var/www/sistema-medico/

# Ou clonar via git
cd /var/www/sistema-medico
git clone <seu-repositorio> .
```

## ⚙️ Passo 3: Configurar Variáveis de Ambiente

```bash
cd /var/www/sistema-medico

# Copiar arquivo de exemplo
cp env.local.example .env.local

# Editar com suas credenciais
nano .env.local
```

**Importante**: Configure todas as variáveis, especialmente:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (use o domínio de produção: `https://seu-dominio.com`)
- `CRON_SECRET_KEY` (já configurada)

## 🔨 Passo 4: Instalar Dependências e Build

```bash
cd /var/www/sistema-medico

# Instalar dependências
npm install --production=false

# Fazer build
npm run build
```

## 🚀 Passo 5: Iniciar com PM2

```bash
# Iniciar aplicação
pm2 start ecosystem.config.js

# Salvar configuração
pm2 save

# Configurar para iniciar no boot
pm2 startup
# Execute o comando que aparecer na tela
```

## 🌐 Passo 6: Configurar Nginx

### 6.1. Copiar configuração

```bash
sudo cp nginx-example.conf /etc/nginx/sites-available/sistema-medico
```

### 6.2. Editar configuração

```bash
sudo nano /etc/nginx/sites-available/sistema-medico
```

**Altere**:
- `server_name seu-dominio.com` → seu domínio real
- Ajuste outros parâmetros se necessário

### 6.3. Ativar site

```bash
sudo ln -s /etc/nginx/sites-available/sistema-medico /etc/nginx/sites-enabled/
sudo nginx -t  # Testar configuração
sudo systemctl reload nginx
```

## 🔒 Passo 7: Configurar SSL (HTTPS)

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com

# Renovação automática (já configurada)
sudo certbot renew --dry-run
```

## ⏰ Passo 8: Configurar Cron Jobs

```bash
cd /var/www/sistema-medico

# Dar permissão de execução
chmod +x setup-cron-jobs.sh

# Executar script
./setup-cron-jobs.sh
```

Isso configurará automaticamente:
- Automações diárias (2h da manhã)
- Processamento de follow-ups a cada 5 minutos

## ✅ Passo 9: Verificar Tudo

### 9.1. Verificar aplicação

```bash
pm2 status
pm2 logs sistema-medico
```

### 9.2. Verificar Nginx

```bash
sudo systemctl status nginx
```

### 9.3. Verificar cron jobs

```bash
crontab -l
```

### 9.4. Testar no navegador

Acesse: `https://seu-dominio.com`

## 🔄 Comandos Úteis

### Atualizar aplicação

```bash
cd /var/www/sistema-medico
git pull  # ou fazer upload dos arquivos
npm install
npm run build
pm2 restart sistema-medico
```

### Ver logs

```bash
# Logs da aplicação
pm2 logs sistema-medico

# Logs do Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Logs dos cron jobs
tail -f /var/log/syslog | grep CRON
```

### Reiniciar serviços

```bash
pm2 restart sistema-medico
sudo systemctl restart nginx
```

## 🐛 Troubleshooting

### Aplicação não inicia

```bash
# Verificar erros
pm2 logs sistema-medico --err

# Verificar variáveis de ambiente
pm2 env sistema-medico
```

### Nginx retorna 502 Bad Gateway

- Verifique se a aplicação está rodando: `pm2 status`
- Verifique a porta no `ecosystem.config.js`
- Verifique os logs: `sudo tail -f /var/log/nginx/error.log`

### Cron jobs não executam

- Verifique se estão configurados: `crontab -l`
- Teste manualmente: `curl -X POST https://seu-dominio.com/api/follow-up/process-scheduled -H "Authorization: Bearer SUA_CHAVE"`
- Verifique logs: `tail -f /var/log/syslog | grep CRON`

## 📊 Monitoramento

### PM2 Monitoring

```bash
pm2 monit
```

### Verificar uso de recursos

```bash
pm2 status
htop
```

## 🔐 Segurança

- ✅ Firewall configurado (UFW)
- ✅ SSL/HTTPS ativado
- ✅ Service Role Key apenas no servidor
- ✅ Variáveis de ambiente protegidas
- ✅ Nginx com headers de segurança

## 📝 Checklist Final

- [ ] Build executado sem erros
- [ ] PM2 rodando a aplicação
- [ ] Nginx configurado e funcionando
- [ ] SSL/HTTPS configurado
- [ ] Cron jobs configurados
- [ ] Variáveis de ambiente configuradas
- [ ] Domínio apontando corretamente
- [ ] Aplicação acessível via HTTPS
- [ ] Logs sendo gerados corretamente

---

**Pronto!** Seu sistema está em produção! 🎉

