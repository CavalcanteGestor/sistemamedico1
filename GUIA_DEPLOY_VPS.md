# 🚀 Guia Completo: Deploy do Sistema Médico para VPS

Este guia explica passo a passo como fazer deploy do Sistema Médico em uma VPS (servidor virtual privado).

## 📋 Pré-requisitos

- VPS com Ubuntu 20.04+ ou Debian 11+
- Acesso SSH à VPS
- Domínio apontando para o IP da VPS (opcional, mas recomendado)
- Projeto Supabase configurado e migrations executadas
- Credenciais do Supabase (URL, keys)

## 🎯 Opções de Deploy

### Opção 1: Deploy Manual (Recomendado para iniciantes)
- Controle total sobre o processo
- Fácil de debugar
- Ideal para servidores pequenos/médios

### Opção 2: Deploy com Docker
- Isolamento completo
- Fácil de replicar
- Ideal para produção

### Opção 3: Deploy com PM2
- Gerenciamento de processos
- Auto-restart
- Monitoramento

## ⚡ Deploy Rápido (Script Automatizado)

Se você já tem a VPS configurada com Node.js e PM2, pode usar o script automatizado:

```bash
# Na VPS, dentro do diretório do projeto
chmod +x deploy.sh
./deploy.sh
```

O script irá:
- ✅ Verificar dependências
- ✅ Instalar pacotes npm
- ✅ Fazer build do projeto
- ✅ Configurar PM2
- ✅ Iniciar a aplicação

**Depois disso, você ainda precisa:**
- Configurar Nginx (passo 4)
- Configurar SSL (passo 5)
- Configurar cron jobs (passo 7)

---

## 📝 Passo a Passo - Deploy Manual Completo

### 1. Preparar a VPS

#### 1.1 Conectar via SSH
```bash
ssh usuario@seu-ip-vps
```

#### 1.2 Atualizar o sistema
```bash
sudo apt update && sudo apt upgrade -y
```

#### 1.3 Instalar Node.js 18+
```bash
# Instalar Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalação
node --version  # Deve mostrar v18.x ou superior
npm --version
```

#### 1.4 Instalar Git
```bash
sudo apt install -y git
```

#### 1.5 Instalar Nginx (para proxy reverso)
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

#### 1.6 Instalar PM2 (gerenciador de processos)
```bash
sudo npm install -g pm2
```

### 2. Preparar o Projeto

#### 2.1 Clonar o repositório
```bash
cd /var/www
sudo git clone <seu-repositorio-url> SistemaMedico
sudo chown -R $USER:$USER SistemaMedico
cd SistemaMedico
```

**OU** se você já tem o código localmente:

```bash
# No seu computador local, compactar o projeto
tar -czf SistemaMedico.tar.gz SistemaMedico --exclude='node_modules' --exclude='.next'

# Enviar para VPS
scp SistemaMedico.tar.gz usuario@seu-ip-vps:/tmp/

# Na VPS, descompactar
cd /var/www
sudo tar -xzf /tmp/SistemaMedico.tar.gz
sudo chown -R $USER:$USER SistemaMedico
cd SistemaMedico
```

#### 2.2 Instalar dependências
```bash
npm install
```

#### 2.3 Configurar variáveis de ambiente
```bash
# Copiar arquivo de exemplo
cp env.local.example .env.local

# Editar com suas credenciais
nano .env.local
```

**Configure todas as variáveis (veja `env.local.example` para referência):**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui

# URL da aplicação (IMPORTANTE: use HTTPS em produção)
NEXT_PUBLIC_APP_URL=https://seu-dominio.com

# OpenAI (para IA - resumos e mensagens)
OPENAI_API_KEY=sua_chave_openai
OPENAI_MODEL=gpt-4o-mini  # ou gpt-4o

# Evolution API (WhatsApp)
NEXT_PUBLIC_EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua_api_key
EVOLUTION_INSTANCE_NAME=default

# Cron Secret (gerar com: openssl rand -base64 32)
CRON_SECRET_KEY=sua_chave_secreta_forte_aqui

# Supabase Management API (opcional)
SUPABASE_ACCESS_TOKEN=sua_chave_access_token_aqui
NEXT_PUBLIC_SUPABASE_PROJECT_REF=seu_project_ref
```

**⚠️ IMPORTANTE:** 
- Nunca commite o arquivo `.env.local` no Git
- Use HTTPS na URL da aplicação em produção
- Gere uma chave forte para `CRON_SECRET_KEY`

#### 2.4 Build do projeto
```bash
npm run build
```

### 3. Configurar PM2

#### 3.1 Criar arquivo de configuração PM2
```bash
nano ecosystem.config.js
```

**Conteúdo:**
```javascript
module.exports = {
  apps: [{
    name: 'sistema-medico',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/SistemaMedico',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/sistema-medico-error.log',
    out_file: '/var/log/pm2/sistema-medico-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}
```

#### 3.2 Criar diretório de logs
```bash
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2
```

#### 3.3 Iniciar aplicação com PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Seguir instruções para iniciar no boot
```

### 4. Configurar Nginx (Proxy Reverso)

#### 4.1 Criar configuração do Nginx

**Opção A - Copiar do exemplo:**
```bash
# Se você tem o arquivo nginx-example.conf no projeto
sudo cp /var/www/SistemaMedico/nginx-example.conf /etc/nginx/sites-available/sistema-medico
sudo nano /etc/nginx/sites-available/sistema-medico  # Editar server_name
```

**Opção B - Criar manualmente:**
```bash
sudo nano /etc/nginx/sites-available/sistema-medico
```

**Conteúdo:**
```nginx
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;

    # Redirecionar HTTP para HTTPS (descomente após configurar SSL)
    # return 301 https://$server_name$request_uri;

    # Se ainda não tiver SSL, use esta configuração:
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Descomente após configurar SSL:
# server {
#     listen 443 ssl http2;
#     server_name seu-dominio.com www.seu-dominio.com;
# 
#     ssl_certificate /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;
# 
#     location / {
#         proxy_pass http://localhost:3000;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
#         proxy_cache_bypass $http_upgrade;
#     }
# }
```

#### 4.2 Habilitar site
```bash
sudo ln -s /etc/nginx/sites-available/sistema-medico /etc/nginx/sites-enabled/
sudo nginx -t  # Testar configuração
sudo systemctl reload nginx
```

### 5. Configurar SSL/HTTPS (Certbot)

#### 5.1 Instalar Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

#### 5.2 Obter certificado SSL
```bash
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

Siga as instruções e o Certbot configurará automaticamente o SSL.

### 6. Configurar Firewall

#### 6.1 Configurar UFW
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 7. Configurar Cron Jobs (Automações)

#### 7.1 Gerar CRON_SECRET_KEY
```bash
# Gerar uma chave secreta forte
openssl rand -base64 32

# Adicionar ao .env.local
nano /var/www/SistemaMedico/.env.local
# Adicione: CRON_SECRET_KEY=sua_chave_gerada_aqui
```

#### 7.2 Criar script de cron
```bash
nano /var/www/SistemaMedico/cron-jobs.sh
```

**Conteúdo:**
```bash
#!/bin/bash

# Carregar variáveis de ambiente
source /var/www/SistemaMedico/.env.local

# Processar follow-ups agendados e recorrentes (a cada 5 minutos)
curl -X POST https://seu-dominio.com/api/follow-up/process-scheduled \
  -H "Authorization: Bearer $CRON_SECRET_KEY" \
  -H "Content-Type: application/json" \
  --silent --output /dev/null
```

#### 7.3 Tornar executável
```bash
chmod +x /var/www/SistemaMedico/cron-jobs.sh
```

#### 7.4 Configurar crontab
```bash
crontab -e
```

**Adicionar:**
```cron
# Processar follow-ups agendados e recorrentes (a cada 5 minutos)
*/5 * * * * /var/www/SistemaMedico/cron-jobs.sh

# Log de erros (opcional)
*/5 * * * * /var/www/SistemaMedico/cron-jobs.sh >> /var/log/cron-followups.log 2>&1
```

**Nota:** Ajuste o horário conforme seu fuso horário. O exemplo acima executa a cada 5 minutos.

### 8. Verificar e Monitorar

#### 8.1 Verificar status do PM2
```bash
pm2 status
pm2 logs sistema-medico
```

#### 8.2 Verificar logs do Nginx
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

#### 8.3 Verificar se aplicação está rodando
```bash
curl http://localhost:3000
```

## 🔧 Comandos Úteis

### Gerenciar aplicação
```bash
pm2 restart sistema-medico    # Reiniciar
pm2 stop sistema-medico       # Parar
pm2 start sistema-medico      # Iniciar
pm2 logs sistema-medico       # Ver logs
pm2 monit                     # Monitorar em tempo real
```

### Atualizar aplicação
```bash
cd /var/www/SistemaMedico
git pull                      # Ou fazer upload dos arquivos novos
npm install                   # Instalar novas dependências
npm run build                 # Rebuild
pm2 restart sistema-medico    # Reiniciar aplicação
```

### Verificar recursos
```bash
pm2 status                    # Status dos processos
htop                          # Uso de CPU/RAM
df -h                         # Espaço em disco
free -h                       # Memória disponível
```

## ⚠️ Troubleshooting

### Aplicação não inicia
```bash
# Verificar logs
pm2 logs sistema-medico --lines 100

# Verificar variáveis de ambiente
pm2 env 0

# Verificar se porta está em uso
sudo netstat -tulpn | grep 3000
```

### Erro 502 Bad Gateway
- Verificar se aplicação está rodando: `pm2 status`
- Verificar logs do Nginx: `sudo tail -f /var/log/nginx/error.log`
- Verificar configuração do Nginx: `sudo nginx -t`

### Erro de permissões
```bash
sudo chown -R $USER:$USER /var/www/SistemaMedico
```

## 📊 Monitoramento Recomendado

### Instalar ferramentas de monitoramento
```bash
# PM2 Monitoring (opcional)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## ✅ Checklist Final

- [ ] Node.js instalado e funcionando
- [ ] Projeto clonado/uploadado
- [ ] Variáveis de ambiente configuradas
- [ ] Build executado com sucesso
- [ ] PM2 configurado e rodando
- [ ] Nginx configurado como proxy reverso
- [ ] SSL/HTTPS configurado
- [ ] Firewall configurado
- [ ] Cron jobs configurados
- [ ] Aplicação acessível via domínio
- [ ] Logs sendo gerados corretamente

---

**Pronto!** Seu sistema está no ar! 🎉

Se precisar de ajuda com algum passo específico ou tiver dúvidas sobre sua VPS, me avise!

