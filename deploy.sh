#!/bin/bash

# Script de Deploy Completo para VPS
# Uso: ./deploy.sh NOME_PROJETO URL_HOSTINGER
# Exemplo: ./deploy.sh sistema-medico mercuri.ialumi.cloud

set -e

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar argumentos
if [ -z "$1" ] || [ -z "$2" ]; then
    echo -e "${RED}❌ Erro: Argumentos faltando${NC}"
    echo -e "${YELLOW}Uso: ./deploy.sh NOME_PROJETO URL_HOSTINGER${NC}"
    echo -e "${YELLOW}Exemplo: ./deploy.sh sistema-medico mercuri.ialumi.cloud${NC}"
    exit 1
fi

PROJECT_NAME="$1"
DOMAIN="$2"
PROJECT_DIR="/var/www/${PROJECT_NAME}"
PM2_NAME="${PROJECT_NAME}"

echo -e "${BLUE}🚀 Iniciando deploy de ${PROJECT_NAME} para ${DOMAIN}${NC}"

# 1. Verificar se está no diretório do projeto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: Execute este script no diretório raiz do projeto${NC}"
    exit 1
fi

# 2. Verificar se .env.local existe
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env.local não encontrado${NC}"
    echo -e "${YELLOW}   Criando .env.local a partir de .env.local.example...${NC}"
    if [ -f ".env.local.example" ]; then
        cp .env.local.example .env.local
        echo -e "${YELLOW}   ⚠️  Configure as variáveis em .env.local antes de continuar${NC}"
        exit 1
    else
        echo -e "${RED}❌ Arquivo .env.local.example não encontrado${NC}"
        exit 1
    fi
fi

# 3. Instalar dependências
echo -e "${BLUE}📦 Instalando dependências...${NC}"
npm ci --production=false

# 4. Build do projeto
echo -e "${BLUE}🔨 Fazendo build do projeto...${NC}"
npm run build

if [ ! -d ".next" ]; then
    echo -e "${RED}❌ Erro: Build falhou${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build concluído${NC}"

# 5. Criar diretório no servidor (se não existir)
echo -e "${BLUE}📁 Preparando diretório no servidor...${NC}"
ssh root@${DOMAIN} "mkdir -p ${PROJECT_DIR}"

# 6. Sincronizar arquivos (excluindo node_modules e .next)
echo -e "${BLUE}📤 Enviando arquivos para o servidor...${NC}"
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    --exclude '.env.local' \
    --exclude '*.md' \
    --exclude '*.sh' \
    --exclude '__tests__' \
    --exclude '*.test.ts' \
    --exclude '*.test.tsx' \
    --exclude 'jest.config.js' \
    --exclude 'jest.setup.js' \
    ./ root@${DOMAIN}:${PROJECT_DIR}/

# 7. Enviar .env.local separadamente (se existir)
if [ -f ".env.local" ]; then
    echo -e "${BLUE}🔐 Enviando variáveis de ambiente...${NC}"
    scp .env.local root@${DOMAIN}:${PROJECT_DIR}/.env.local
fi

# 8. Instalar dependências no servidor
echo -e "${BLUE}📦 Instalando dependências no servidor...${NC}"
ssh root@${DOMAIN} "cd ${PROJECT_DIR} && npm ci --production"

# 9. Build no servidor
echo -e "${BLUE}🔨 Fazendo build no servidor...${NC}"
ssh root@${DOMAIN} "cd ${PROJECT_DIR} && npm run build"

# 10. Configurar PM2
echo -e "${BLUE}⚙️  Configurando PM2...${NC}"
ssh root@${DOMAIN} "cd ${PROJECT_DIR} && pm2 delete ${PM2_NAME} 2>/dev/null || true"
ssh root@${DOMAIN} "cd ${PROJECT_DIR} && pm2 start npm --name ${PM2_NAME} -- start"
ssh root@${DOMAIN} "pm2 save"

# 11. Configurar Nginx
echo -e "${BLUE}🌐 Configurando Nginx...${NC}"
NGINX_CONFIG="/etc/nginx/sites-available/${PROJECT_NAME}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${PROJECT_NAME}"

ssh root@${DOMAIN} "cat > ${NGINX_CONFIG} << 'EOF'
server {
    listen 80;
    server_name ${DOMAIN};

    # Redirecionar HTTP para HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    # Headers grandes
    proxy_buffer_size 16k;
    proxy_buffers 8 16k;
    proxy_busy_buffers_size 32k;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF"

# Habilitar site
ssh root@${DOMAIN} "ln -sf ${NGINX_CONFIG} ${NGINX_ENABLED}"

# Testar configuração Nginx
ssh root@${DOMAIN} "nginx -t"

# Recarregar Nginx
ssh root@${DOMAIN} "systemctl reload nginx"

# 12. Verificar status
echo -e "${BLUE}🔍 Verificando status...${NC}"
ssh root@${DOMAIN} "pm2 status ${PM2_NAME}"
ssh root@${DOMAIN} "systemctl status nginx --no-pager | head -5"

echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo -e "${GREEN}🌐 Acesse: https://${DOMAIN}${NC}"
echo -e "${YELLOW}💡 Para ver logs: ssh root@${DOMAIN} 'pm2 logs ${PM2_NAME}'${NC}"

