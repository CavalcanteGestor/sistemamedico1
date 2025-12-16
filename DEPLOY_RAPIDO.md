# ⚡ Deploy Rápido - Checklist

## 📋 Antes de Começar

- [ ] VPS com Ubuntu/Debian configurada
- [ ] Acesso SSH funcionando
- [ ] Domínio apontando para IP da VPS (opcional)
- [ ] Credenciais do Supabase prontas
- [ ] Banco de dados replicado e migrations executadas

## 🚀 Passos Rápidos

### 1. Conectar na VPS
```bash
ssh usuario@seu-ip-vps
```

### 2. Instalar Dependências
```bash
# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs git nginx

# PM2
sudo npm install -g pm2
```

### 3. Upload do Projeto

**Opção A - Git:**
```bash
cd /var/www
sudo git clone <seu-repositorio> SistemaMedico
sudo chown -R $USER:$USER SistemaMedico
cd SistemaMedico
```

**Opção B - Upload Manual:**
```bash
# No seu computador
tar -czf SistemaMedico.tar.gz SistemaMedico --exclude='node_modules' --exclude='.next'
scp SistemaMedico.tar.gz usuario@vps:/tmp/

# Na VPS
cd /var/www
sudo tar -xzf /tmp/SistemaMedico.tar.gz
sudo chown -R $USER:$USER SistemaMedico
cd SistemaMedico
```

### 4. Configurar Ambiente
```bash
cp env.local.example .env.local
nano .env.local  # Preencher todas as variáveis
```

### 5. Build e Iniciar
```bash
npm install
npm run build

# Usar script automatizado OU manual:
./deploy.sh  # OU
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6. Configurar Nginx
```bash
sudo cp nginx-example.conf /etc/nginx/sites-available/sistema-medico
sudo nano /etc/nginx/sites-available/sistema-medico  # Editar server_name
sudo ln -s /etc/nginx/sites-available/sistema-medico /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. SSL (Opcional mas Recomendado)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

### 8. Cron Jobs
```bash
# Gerar secret key
openssl rand -base64 32  # Adicionar ao .env.local como CRON_SECRET_KEY

# Criar script
nano cron-jobs.sh  # Ver GUIA_DEPLOY_VPS.md seção 7

# Configurar crontab
crontab -e
# Adicionar: */5 * * * * /var/www/SistemaMedico/cron-jobs.sh
```

### 9. Firewall
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## ✅ Verificar

```bash
# Status PM2
pm2 status

# Logs
pm2 logs sistema-medico

# Testar aplicação
curl http://localhost:3000

# Testar via navegador
# http://seu-dominio.com ou http://seu-ip-vps
```

## 🔧 Comandos Úteis

```bash
pm2 restart sistema-medico  # Reiniciar
pm2 logs sistema-medico     # Ver logs
pm2 monit                   # Monitorar
sudo nginx -t               # Testar Nginx
sudo systemctl reload nginx # Recarregar Nginx
```

## 📚 Documentação Completa

Veja `GUIA_DEPLOY_VPS.md` para instruções detalhadas e troubleshooting.

