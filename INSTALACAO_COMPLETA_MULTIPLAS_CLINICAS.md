# 🏥 Instalação Completa - Múltiplas Clínicas no Mesmo VPS

## 📋 Visão Geral

Este guia cobre a instalação completa do sistema Lumi para **múltiplas clínicas no mesmo VPS**, usando a CLI do Supabase para migrations.

## 🎯 Pré-requisitos

- ✅ VPS com Ubuntu 20.04+ (ou similar)
- ✅ Acesso root ou sudo
- ✅ Node.js 18+ instalado
- ✅ Git instalado
- ✅ Conta Supabase (uma por clínica)
- ✅ Domínio configurado (um por clínica)

## 📦 Parte 1: Preparação do VPS

### 1.1 Atualizar Sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Instalar Dependências Base

```bash
# Node.js 18+ (se não tiver)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# PM2 (gerenciador de processos)
sudo npm install -g pm2

# Nginx (servidor web)
sudo apt install -y nginx

# Certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx

# Git
sudo apt install -y git

# Supabase CLI
npm install -g supabase
```

### 1.3 Verificar Instalações

```bash
node --version    # Deve ser 18+
npm --version
pm2 --version
nginx -v
supabase --version
```

## 📦 Parte 2: Configurar Primeira Clínica

### 2.1 Criar Projeto no Supabase

1. Acesse: https://supabase.com/dashboard
2. Clique em **New Project**
3. Preencha:
   - **Name**: `clinica-1` (ou nome da clínica)
   - **Database Password**: (anote esta senha!)
   - **Region**: Escolha a mais próxima
4. Aguarde criação (2-3 minutos)

### 2.2 Obter Credenciais do Supabase

No Dashboard do Supabase:

1. Vá em **Settings > API**
2. Anote:
   - **Project URL**: `https://abc123xyz.supabase.co`
   - **Project Reference**: `abc123xyz` (parte antes de `.supabase.co`)
   - **anon/public key**: `eyJhbGc...`
   - **service_role key**: `eyJhbGc...` (⚠️ SECRETO!)

3. Vá em **Settings > Database**
   - Anote a **Database Password** (se não tiver anotado)

### 2.3 Clonar Repositório no VPS

```bash
# Ir para diretório de aplicações
cd /var/www

# Clonar repositório
sudo git clone https://github.com/CavalcanteGestor/sistemamedico1.git clinica-1

# Dar permissões
sudo chown -R $USER:$USER /var/www/clinica-1
cd /var/www/clinica-1
```

### 2.4 Instalar Dependências

```bash
npm install
```

### 2.5 Configurar Variáveis de Ambiente

```bash
# Copiar exemplo
cp env.production.example .env.local

# Editar com credenciais reais
nano .env.local
```

**Conteúdo do `.env.local`:**

```env
# ============================================
# SUPABASE - Clínica 1
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://abc123xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...sua_chave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...sua_chave_service_role_aqui
NEXT_PUBLIC_SUPABASE_PROJECT_REF=abc123xyz

# ============================================
# URL DA APLICAÇÃO
# ============================================
NEXT_PUBLIC_APP_URL=https://clinica1.seudominio.com

# ============================================
# EVOLUTION API (WhatsApp)
# ============================================
NEXT_PUBLIC_EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua_api_key_aqui
EVOLUTION_INSTANCE_NAME=clinica-1

# ============================================
# OPENAI (IA)
# ============================================
OPENAI_API_KEY=sua_chave_openai_aqui
OPENAI_MODEL=gpt-4o-mini

# ============================================
# SUPABASE MANAGEMENT API
# ============================================
SUPABASE_ACCESS_TOKEN=sua_chave_access_token_aqui

# ============================================
# CRON SECRET KEY
# ============================================
CRON_SECRET_KEY=$(openssl rand -base64 32)

# ============================================
# SENTRY (Opcional)
# ============================================
# NEXT_PUBLIC_SENTRY_DSN=sua_dsn_sentry
# SENTRY_DSN=sua_dsn_sentry
# SENTRY_AUTH_TOKEN=seu_token
# SENTRY_ORG=sua_org
# SENTRY_PROJECT=seu_projeto
# SENTRY_ENVIRONMENT=production

# ============================================
# WEB PUSH (Opcional)
# ============================================
# WEB_PUSH_VAPID_PUBLIC_KEY=sua_chave_publica
# WEB_PUSH_VAPID_PRIVATE_KEY=sua_chave_privada
# WEB_PUSH_VAPID_SUBJECT=mailto:seu-email@exemplo.com
```

**Salvar:** `Ctrl+O`, `Enter`, `Ctrl+X`

### 2.6 Linkar Projeto Supabase via CLI

```bash
# Fazer login no Supabase CLI
supabase login

# Linkar ao projeto
cd /var/www/clinica-1
supabase link --project-ref SEU_PROJECT_REF
# Substitua SEU_PROJECT_REF pelo Project Reference do Supabase
# Exemplo: se a URL é https://abc123xyz.supabase.co, o Project Ref é "abc123xyz"

# Confirmar quando pedir
```

### 2.7 Aplicar Migrations do Banco

```bash
# Aplicar TODAS as migrations automaticamente
supabase db push

# Aguardar conclusão (1-2 minutos)
# ✅ Todas as 37 migrations serão aplicadas automaticamente!
```

### 2.8 Configurar URLs de Redirecionamento no Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione o projeto da clínica
3. Vá em **Authentication > URL Configuration**
4. Em **Redirect URLs**, adicione:
   ```
   https://clinica1.seudominio.com/**
   https://clinica1.seudominio.com/auth/confirm
   ```
5. Em **Site URL**, configure:
   ```
   https://clinica1.seudominio.com
   ```
6. Clique em **Save**

### 2.9 Build do Projeto

```bash
cd /var/www/clinica-1

# Build de produção
npm run build

# Verificar se build foi bem-sucedido
ls -la .next
```

### 2.10 Configurar PM2

```bash
cd /var/www/clinica-1

# Criar arquivo de configuração PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'clinica-1',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/clinica-1',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,  // Porta única para esta clínica
    },
    error_file: './logs/clinica-1-error.log',
    out_file: './logs/clinica-1-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    wait_ready: true,
    listen_timeout: 10000,
  }],
};
EOF

# Criar diretório de logs
mkdir -p logs

# Iniciar aplicação
pm2 start ecosystem.config.js

# Salvar configuração PM2
pm2 save

# Configurar PM2 para iniciar no boot
pm2 startup
# (Execute o comando que aparecer)
```

### 2.11 Configurar Nginx

```bash
# Criar configuração Nginx
sudo nano /etc/nginx/sites-available/clinica-1
```

**Conteúdo:**

```nginx
server {
    listen 80;
    server_name clinica1.seudominio.com;

    # Redirecionar para HTTPS (será configurado depois)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name clinica1.seudominio.com;

    # Certificados SSL (serão gerados pelo Certbot)
    ssl_certificate /etc/letsencrypt/live/clinica1.seudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/clinica1.seudominio.com/privkey.pem;

    # Configurações SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Headers de segurança
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy para aplicação Next.js
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Cache para arquivos estáticos
    location /_next/static {
        proxy_pass http://localhost:3001;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

**Salvar e ativar:**

```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/clinica-1 /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

### 2.12 Configurar SSL (Certbot)

```bash
# Obter certificado SSL
sudo certbot --nginx -d clinica1.seudominio.com

# Seguir instruções:
# - Email: seu-email@exemplo.com
# - Aceitar termos: Y
# - Compartilhar email: N (ou Y)
# - Redirecionar HTTP para HTTPS: 2

# Verificar renovação automática
sudo certbot renew --dry-run
```

### 2.13 Verificar Instalação

```bash
# Verificar PM2
pm2 status

# Verificar logs
pm2 logs clinica-1 --lines 50

# Verificar Nginx
sudo systemctl status nginx

# Testar aplicação
curl http://localhost:3001
```

## 📦 Parte 3: Adicionar Segunda Clínica (e Subsequentes)

### 3.1 Criar Novo Projeto no Supabase

1. Acesse: https://supabase.com/dashboard
2. Clique em **New Project**
3. Preencha:
   - **Name**: `clinica-2`
   - **Database Password**: (anote!)
   - **Region**: Mesma região da primeira
4. Aguarde criação

### 3.2 Obter Credenciais

(Seguir mesmo processo da Parte 2.2)

### 3.3 Clonar Repositório (Nova Instância)

```bash
# Clonar para nova clínica
cd /var/www
sudo git clone https://github.com/CavalcanteGestor/sistemamedico1.git clinica-2

# Dar permissões
sudo chown -R $USER:$USER /var/www/clinica-2
cd /var/www/clinica-2
```

### 3.4 Instalar Dependências

```bash
npm install
```

### 3.5 Configurar Variáveis de Ambiente

```bash
cp env.production.example .env.local
nano .env.local
```

**Conteúdo (ajustar para clínica-2):**

```env
# ============================================
# SUPABASE - Clínica 2
# ============================================
# Obtenha estas credenciais do projeto Supabase da clínica 2
# Cada clínica deve ter seu próprio projeto Supabase!
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_REF_CLINICA_2.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...chave_anon_da_clinica_2
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...service_role_da_clinica_2
NEXT_PUBLIC_SUPABASE_PROJECT_REF=SEU_PROJECT_REF_CLINICA_2

# URL
NEXT_PUBLIC_APP_URL=https://clinica2.seudominio.com

# Evolution API (pode ser a mesma instância ou diferente)
NEXT_PUBLIC_EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua_api_key_aqui
EVOLUTION_INSTANCE_NAME=clinica-2

# ... (resto igual, mas ajustar URLs e credenciais)
```

### 3.6 Linkar e Aplicar Migrations

```bash
# Linkar projeto (usar Project Ref da clínica 2)
supabase link --project-ref SEU_PROJECT_REF_CLINICA_2

# Aplicar migrations
supabase db push
```

### 3.7 Configurar URLs no Supabase

(Seguir Parte 2.8, mas com URL da clínica-2)

### 3.8 Build e PM2

```bash
# Build
npm run build

# Configurar PM2 (porta diferente!)
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'clinica-2',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/clinica-2',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3002,  // Porta diferente!
    },
    error_file: './logs/clinica-2-error.log',
    out_file: './logs/clinica-2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    wait_ready: true,
    listen_timeout: 10000,
  }],
};
EOF

# Iniciar
pm2 start ecosystem.config.js
pm2 save
```

### 3.9 Configurar Nginx (Segunda Clínica)

```bash
sudo nano /etc/nginx/sites-available/clinica-2
```

**Conteúdo (ajustar para clínica-2):**

```nginx
server {
    listen 80;
    server_name clinica2.seudominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name clinica2.seudominio.com;

    ssl_certificate /etc/letsencrypt/live/clinica2.seudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/clinica2.seudominio.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:3002;  # Porta diferente!
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /_next/static {
        proxy_pass http://localhost:3002;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

**Ativar:**

```bash
sudo ln -s /etc/nginx/sites-available/clinica-2 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3.10 SSL para Segunda Clínica

```bash
sudo certbot --nginx -d clinica2.seudominio.com
```

## 📋 Parte 4: Gerenciamento de Múltiplas Clínicas

### 4.1 Ver Status de Todas as Clínicas

```bash
pm2 status
```

### 4.2 Reiniciar Clínica Específica

```bash
pm2 restart clinica-1
pm2 restart clinica-2
```

### 4.3 Ver Logs de Clínica Específica

```bash
pm2 logs clinica-1 --lines 100
pm2 logs clinica-2 --lines 100
```

### 4.4 Atualizar Clínica Específica

```bash
# Ir para diretório da clínica
cd /var/www/clinica-1

# Atualizar código
git pull origin main

# Instalar dependências (se houver novas)
npm install

# Rebuild
npm run build

# Reiniciar
pm2 restart clinica-1
```

### 4.5 Aplicar Novas Migrations

```bash
# Ir para diretório da clínica
cd /var/www/clinica-1

# Aplicar novas migrations
supabase db push
```

## 🔧 Parte 5: Configuração Avançada (Opcional)

### 5.1 Configuração PM2 Unificada

Para gerenciar todas as clínicas em um único arquivo:

```bash
cd /var/www
nano ecosystem.all.config.js
```

**Conteúdo:**

```javascript
module.exports = {
  apps: [
    {
      name: 'clinica-1',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/var/www/clinica-1',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/www/clinica-1/logs/error.log',
      out_file: '/var/www/clinica-1/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
    {
      name: 'clinica-2',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/var/www/clinica-2',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      error_file: '/var/www/clinica-2/logs/error.log',
      out_file: '/var/www/clinica-2/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
    // Adicionar mais clínicas aqui...
  ],
};
```

**Usar:**

```bash
pm2 start ecosystem.all.config.js
pm2 save
```

### 5.2 Script de Atualização para Todas as Clínicas

```bash
cd /var/www
nano atualizar-todas-clinicas.sh
```

**Conteúdo:**

```bash
#!/bin/bash

# Script para atualizar todas as clínicas

CLINICAS=("clinica-1" "clinica-2" "clinica-3")  # Adicionar mais conforme necessário

for clinica in "${CLINICAS[@]}"; do
    echo "🔄 Atualizando $clinica..."
    cd "/var/www/$clinica"
    git pull origin main
    npm install
    npm run build
    pm2 restart "$clinica"
    echo "✅ $clinica atualizada!"
    echo ""
done

echo "✅ Todas as clínicas foram atualizadas!"
pm2 status
```

**Dar permissão:**

```bash
chmod +x atualizar-todas-clinicas.sh
```

## ✅ Checklist Final

Para cada clínica, verificar:

- [ ] Projeto criado no Supabase
- [ ] Credenciais configuradas no `.env.local`
- [ ] Projeto linkado via CLI (`supabase link`)
- [ ] Migrations aplicadas (`supabase db push`)
- [ ] URLs configuradas no Supabase Dashboard
- [ ] Build executado com sucesso
- [ ] PM2 configurado e rodando
- [ ] Nginx configurado
- [ ] SSL configurado (Certbot)
- [ ] Aplicação acessível via HTTPS
- [ ] Login funcionando

## 🆘 Troubleshooting

### Erro: "Port already in use"

```bash
# Verificar portas em uso
sudo netstat -tulpn | grep :3001

# Parar processo na porta
sudo kill -9 PID_DO_PROCESSO
```

### Erro: "Migration already applied"

```bash
# Verificar status das migrations
cd /var/www/clinica-1
supabase migration list
```

### Erro: "Cannot link project"

```bash
# Fazer login novamente
supabase login

# Tentar linkar novamente
supabase link --project-ref SEU_PROJECT_REF
```

### Reiniciar Tudo

```bash
# Reiniciar todas as clínicas
pm2 restart all

# Reiniciar Nginx
sudo systemctl restart nginx
```

## 📝 Resumo dos Comandos Essenciais

```bash
# Instalar dependências VPS
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs nginx certbot python3-certbot-nginx git
sudo npm install -g pm2 supabase

# Para cada clínica:
cd /var/www
sudo git clone https://github.com/CavalcanteGestor/sistemamedico1.git clinica-X
sudo chown -R $USER:$USER /var/www/clinica-X
cd clinica-X
cd clinica-X
npm install
cp env.production.example .env.local
nano .env.local  # Configurar credenciais
supabase login
supabase link --project-ref PROJECT_REF
supabase db push  # Aplicar migrations
npm run build
pm2 start ecosystem.config.js
pm2 save

# Configurar Nginx e SSL
sudo nano /etc/nginx/sites-available/clinica-X
sudo ln -s /etc/nginx/sites-available/clinica-X /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d clinicaX.seudominio.com
```

## 🎯 Pronto!

Agora você tem um guia completo e unificado para instalar múltiplas clínicas no mesmo VPS!

