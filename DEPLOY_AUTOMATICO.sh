#!/bin/bash

# 🚀 Script de Deploy Automático Completo - Sistema Médico
# Execute: chmod +x DEPLOY_AUTOMATICO.sh && ./DEPLOY_AUTOMATICO.sh

set -e  # Parar em caso de erro

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🚀 Deploy Automático - Sistema Médico                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Função para fazer perguntas
ask_question() {
    local question=$1
    local var_name=$2
    local default_value=$3
    
    if [ -n "$default_value" ]; then
        read -p "$(echo -e ${YELLOW}$question${NC} [${GREEN}$default_value${NC}]: )" input
        eval "$var_name=\${input:-$default_value}"
    else
        read -p "$(echo -e ${YELLOW}$question${NC}: )" input
        eval "$var_name=\$input"
    fi
}

# Coletar informações
echo -e "${GREEN}📋 Vamos coletar algumas informações:${NC}"
echo ""

ask_question "Nome do projeto (sem espaços)" "PROJECT_NAME" "sistema-medico"
ask_question "Domínio completo (ex: sistema.seudominio.com)" "DOMAIN" ""
ask_question "Email para certificado SSL" "SSL_EMAIL" ""
ask_question "Diretório do projeto" "PROJECT_DIR" "/var/www/$PROJECT_NAME"
ask_question "URL do repositório Git" "GIT_REPO" "https://github.com/CavalcanteGestor/sistemamedico1.git"

echo ""
echo -e "${GREEN}✅ Informações coletadas:${NC}"
echo -e "   Projeto: ${BLUE}$PROJECT_NAME${NC}"
echo -e "   Domínio: ${BLUE}$DOMAIN${NC}"
echo -e "   Email SSL: ${BLUE}$SSL_EMAIL${NC}"
echo -e "   Diretório: ${BLUE}$PROJECT_DIR${NC}"
echo -e "   Repositório: ${BLUE}$GIT_REPO${NC}"
echo ""

read -p "$(echo -e ${YELLOW}Continuar? (s/n): ${NC})" confirm
if [[ ! $confirm =~ ^[Ss]$ ]]; then
    echo -e "${RED}❌ Deploy cancelado.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🚀 Iniciando deploy...${NC}"
echo ""

# 1. Atualizar sistema
echo -e "${GREEN}1️⃣ Atualizando sistema...${NC}"
sudo apt update && sudo apt upgrade -y

# 2. Instalar dependências
echo -e "${GREEN}2️⃣ Instalando dependências...${NC}"

# Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}   Instalando Node.js...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo -e "${GREEN}   ✅ Node.js já instalado${NC}"
fi

# Nginx
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}   Instalando Nginx...${NC}"
    sudo apt install -y nginx
else
    echo -e "${GREEN}   ✅ Nginx já instalado${NC}"
fi

# PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}   Instalando PM2...${NC}"
    sudo npm install -g pm2
else
    echo -e "${GREEN}   ✅ PM2 já instalado${NC}"
fi

# Certbot
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}   Instalando Certbot...${NC}"
    sudo apt install -y certbot python3-certbot-nginx
else
    echo -e "${GREEN}   ✅ Certbot já instalado${NC}"
fi

# Git
if ! command -v git &> /dev/null; then
    echo -e "${YELLOW}   Instalando Git...${NC}"
    sudo apt install -y git
else
    echo -e "${GREEN}   ✅ Git já instalado${NC}"
fi

# 3. Criar diretório do projeto
echo -e "${GREEN}3️⃣ Criando diretório do projeto...${NC}"
sudo mkdir -p "$PROJECT_DIR"
sudo chown -R $USER:$USER "$PROJECT_DIR"

# 4. Clonar/Atualizar repositório
echo -e "${GREEN}4️⃣ Clonando/Atualizando repositório...${NC}"
cd "$PROJECT_DIR"

if [ -d ".git" ]; then
    echo -e "${YELLOW}   Repositório já existe, atualizando...${NC}"
    git pull origin main || git pull origin master
else
    echo -e "${YELLOW}   Clonando repositório...${NC}"
    git clone "$GIT_REPO" .
fi

# 5. Instalar dependências do projeto
echo -e "${GREEN}5️⃣ Instalando dependências do projeto...${NC}"
npm install --production=false

# 6. Configurar variáveis de ambiente
echo -e "${GREEN}6️⃣ Configurando variáveis de ambiente...${NC}"
if [ ! -f ".env.local" ]; then
    if [ -f "env.local.example" ]; then
        cp env.local.example .env.local
        echo -e "${YELLOW}   ⚠️  Arquivo .env.local criado. Configure as variáveis!${NC}"
        echo -e "${YELLOW}   Execute: nano $PROJECT_DIR/.env.local${NC}"
    else
        echo -e "${RED}   ❌ env.local.example não encontrado!${NC}"
    fi
else
    echo -e "${GREEN}   ✅ .env.local já existe${NC}"
fi

# Atualizar NEXT_PUBLIC_APP_URL se necessário
if [ -f ".env.local" ]; then
    sed -i "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://$DOMAIN|g" .env.local
    echo -e "${GREEN}   ✅ NEXT_PUBLIC_APP_URL atualizado para https://$DOMAIN${NC}"
fi

# 7. Limpar arquivos problemáticos
echo -e "${GREEN}7️⃣ Limpando arquivos problemáticos...${NC}"
rm -f sites-enabled sites-available 2>/dev/null || true
rm -rf .next 2>/dev/null || true

# 8. Fazer build
echo -e "${GREEN}8️⃣ Fazendo build do projeto...${NC}"
npm run build

# 9. Configurar PM2
echo -e "${GREEN}9️⃣ Configurando PM2...${NC}"
pm2 stop "$PROJECT_NAME" 2>/dev/null || true
pm2 delete "$PROJECT_NAME" 2>/dev/null || true
pm2 start ecosystem.config.js --name "$PROJECT_NAME"
pm2 save

# Configurar PM2 para iniciar no boot
echo -e "${YELLOW}   Configurando PM2 para iniciar no boot...${NC}"
pm2 startup | grep -v PM2 | bash || true

# 10. Configurar Nginx
echo -e "${GREEN}🔟 Configurando Nginx...${NC}"

NGINX_CONFIG="/etc/nginx/sites-available/$PROJECT_NAME"

# Criar configuração do Nginx
sudo tee "$NGINX_CONFIG" > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Redirecionar para HTTPS (será configurado pelo Certbot)
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
EOF

# Ativar site
sudo ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

# Testar configuração do Nginx
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx

# 11. Configurar SSL
echo -e "${GREEN}1️⃣1️⃣ Configurando SSL...${NC}"
if [ -n "$SSL_EMAIL" ]; then
    echo -e "${YELLOW}   Obtendo certificado SSL...${NC}"
    sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$SSL_EMAIL" --redirect || {
        echo -e "${YELLOW}   ⚠️  Certbot falhou. Configure manualmente depois.${NC}"
        echo -e "${YELLOW}   Execute: sudo certbot --nginx -d $DOMAIN${NC}"
    }
else
    echo -e "${YELLOW}   ⚠️  Email não fornecido. Configure SSL manualmente:${NC}"
    echo -e "${YELLOW}   Execute: sudo certbot --nginx -d $DOMAIN${NC}"
fi

# 12. Configurar cron jobs
echo -e "${GREEN}1️⃣2️⃣ Configurando cron jobs...${NC}"
if [ -f "setup-cron-jobs.sh" ]; then
    chmod +x setup-cron-jobs.sh
    ./setup-cron-jobs.sh || echo -e "${YELLOW}   ⚠️  Erro ao configurar cron jobs${NC}"
else
    echo -e "${YELLOW}   ⚠️  setup-cron-jobs.sh não encontrado${NC}"
fi

# 13. Verificar firewall
echo -e "${GREEN}1️⃣3️⃣ Configurando firewall...${NC}"
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable || true

# Resumo final
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Deploy Concluído!                                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Status:${NC}"
pm2 status "$PROJECT_NAME"
echo ""
echo -e "${BLUE}🌐 Acesse:${NC}"
echo -e "   ${GREEN}https://$DOMAIN${NC}"
echo ""
echo -e "${BLUE}📝 Próximos passos:${NC}"
echo -e "   1. Configure as variáveis de ambiente: ${YELLOW}nano $PROJECT_DIR/.env.local${NC}"
echo -e "   2. Verifique os logs: ${YELLOW}pm2 logs $PROJECT_NAME${NC}"
echo -e "   3. Configure o domínio na Hostinger (veja INSTRUCOES_HOSTINGER.md)"
echo ""
echo -e "${GREEN}✅ Tudo pronto!${NC}"

