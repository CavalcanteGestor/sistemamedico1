#!/bin/bash

# Script de Instalação Completa no Servidor VPS
# Execute este script NO SERVIDOR VPS
# Uso: bash install.sh NOME_PROJETO DOMINIO
# Exemplo: bash install.sh sistema-medico mercuri.ialumi.cloud

set -e

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Por favor, execute como root: sudo bash install.sh${NC}"
    exit 1
fi

# Repositório Git padrão
GITHUB_REPO="https://github.com/CavalcanteGestor/sistemamedico1.git"

# Verificar argumentos
if [ -z "$1" ] || [ -z "$2" ]; then
    echo -e "${RED}❌ Erro: Argumentos faltando${NC}"
    echo -e "${YELLOW}Uso: bash install.sh NOME_PROJETO DOMINIO${NC}"
    echo -e "${YELLOW}Exemplo: bash install.sh sistema-medico mercuri.ialumi.cloud${NC}"
    exit 1
fi

PROJECT_NAME="$1"
DOMAIN="$2"
PROJECT_DIR="/var/www/${PROJECT_NAME}"
PM2_NAME="${PROJECT_NAME}"

echo -e "${BLUE}🚀 Iniciando instalação de ${PROJECT_NAME} para ${DOMAIN}${NC}"

# 1. Atualizar sistema
echo -e "${BLUE}📦 Atualizando sistema...${NC}"
apt-get update -qq
apt-get upgrade -y -qq

# 2. Instalar Node.js 20.x
echo -e "${BLUE}📦 Instalando Node.js...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo -e "${GREEN}✅ Node.js já instalado: $(node --version)${NC}"
fi

# 3. Instalar PM2 globalmente
echo -e "${BLUE}📦 Instalando PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    pm2 startup systemd -u root --hp /root
else
    echo -e "${GREEN}✅ PM2 já instalado${NC}"
fi

# 4. Instalar Nginx
echo -e "${BLUE}📦 Instalando Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
    systemctl enable nginx
else
    echo -e "${GREEN}✅ Nginx já instalado${NC}"
fi

# 5. Instalar Certbot (Let's Encrypt)
echo -e "${BLUE}📦 Instalando Certbot...${NC}"
if ! command -v certbot &> /dev/null; then
    apt-get install -y certbot python3-certbot-nginx
else
    echo -e "${GREEN}✅ Certbot já instalado${NC}"
fi

# 6. Instalar Git
echo -e "${BLUE}📦 Instalando Git...${NC}"
if ! command -v git &> /dev/null; then
    apt-get install -y git
else
    echo -e "${GREEN}✅ Git já instalado${NC}"
fi

# 7. Criar diretório do projeto
echo -e "${BLUE}📁 Criando diretório do projeto...${NC}"
mkdir -p ${PROJECT_DIR}
cd ${PROJECT_DIR}

# 8. Clonar repositório (se não existir)
if [ ! -d ".git" ]; then
    echo -e "${BLUE}📥 Clonando repositório...${NC}"
    git clone ${GITHUB_REPO} .
else
    echo -e "${BLUE}📥 Atualizando repositório...${NC}"
    git pull origin main
fi

# 9. Criar .env.local se não existir
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env.local não encontrado${NC}"
    if [ -f ".env.local.example" ]; then
        echo -e "${BLUE}📝 Copiando .env.local.example...${NC}"
        cp .env.local.example .env.local
        
        # Atualizar NEXT_PUBLIC_APP_URL automaticamente
        sed -i "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://${DOMAIN}|g" .env.local
        
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
        echo -e "${BLUE}📋 CONFIGURAÇÃO DO PROJETO SUPABASE${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
        echo ""
        echo -e "${YELLOW}Configure as variáveis do seu projeto Supabase em:${NC}"
        echo -e "${GREEN}${PROJECT_DIR}/.env.local${NC}"
        echo ""
        echo -e "${YELLOW}Variáveis necessárias do Supabase:${NC}"
        echo -e "  ${BLUE}NEXT_PUBLIC_SUPABASE_URL${NC}      - URL do seu projeto Supabase"
        echo -e "  ${BLUE}NEXT_PUBLIC_SUPABASE_ANON_KEY${NC}  - Chave anon do Supabase"
        echo -e "  ${BLUE}SUPABASE_SERVICE_ROLE_KEY${NC}      - Chave service_role do Supabase"
        echo ""
        echo -e "${GREEN}✅ NEXT_PUBLIC_APP_URL já configurado como: https://${DOMAIN}${NC}"
        echo ""
        echo -e "${YELLOW}Para editar:${NC}"
        echo -e "  ${BLUE}nano ${PROJECT_DIR}/.env.local${NC}"
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
        echo ""
        read -p "Pressione ENTER após configurar o .env.local para continuar..."
    else
        echo -e "${RED}❌ Arquivo .env.local.example não encontrado${NC}"
        exit 1
    fi
fi

# 10. Executar migrações do banco de dados (opcional e seguro)
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📊 MIGRAÇÕES DO BANCO DE DADOS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}O script pode executar as migrações automaticamente de forma segura.${NC}"
echo ""
read -p "Deseja executar as migrações agora? (s/N): " EXECUTE_MIGRATIONS

if [[ "$EXECUTE_MIGRATIONS" =~ ^[Ss]$ ]]; then
    echo ""
    echo -e "${BLUE}📦 Instalando Supabase CLI...${NC}"
    
    # Instalar Supabase CLI se não existir
    if ! command -v supabase &> /dev/null; then
        # Baixar e instalar Supabase CLI
        ARCH=$(uname -m)
        if [ "$ARCH" = "x86_64" ]; then
            ARCH="amd64"
        elif [ "$ARCH" = "aarch64" ]; then
            ARCH="arm64"
        fi
        
        SUPABASE_CLI_VERSION="1.200.0"
        wget -qO- https://github.com/supabase/cli/releases/download/v${SUPABASE_CLI_VERSION}/supabase_${SUPABASE_CLI_VERSION}_linux_${ARCH}.tar.gz | tar -xz
        mv supabase /usr/local/bin/
        chmod +x /usr/local/bin/supabase
        echo -e "${GREEN}✅ Supabase CLI instalado${NC}"
    else
        echo -e "${GREEN}✅ Supabase CLI já instalado${NC}"
    fi
    
    # Verificar se .env.local existe e tem as variáveis necessárias
    if [ ! -f ".env.local" ]; then
        echo -e "${RED}❌ Arquivo .env.local não encontrado${NC}"
        echo -e "${YELLOW}Configure o .env.local primeiro${NC}"
        exit 1
    fi
    
    # Carregar variáveis do .env.local de forma segura
    export $(grep -v '^#' .env.local | grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY)=' | xargs)
    
    if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        echo -e "${RED}❌ Variáveis do Supabase não encontradas no .env.local${NC}"
        echo -e "${YELLOW}Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY${NC}"
        exit 1
    fi
    
    # Extrair project ref da URL
    PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -n 's|https://\([^.]*\)\.supabase\.co|\1|p')
    
    if [ -z "$PROJECT_REF" ]; then
        echo -e "${RED}❌ Não foi possível extrair o project ref da URL do Supabase${NC}"
        exit 1
    fi
    
    echo ""
    echo -e "${YELLOW}⚠️  ATENÇÃO: As migrações serão executadas no projeto: ${PROJECT_REF}${NC}"
    echo -e "${YELLOW}   Certifique-se de que este é o projeto correto!${NC}"
    echo ""
    read -p "Confirma a execução das migrações? (s/N): " CONFIRM_MIGRATIONS
    
    if [[ "$CONFIRM_MIGRATIONS" =~ ^[Ss]$ ]]; then
        echo ""
        echo -e "${BLUE}🔄 Executando migrações...${NC}"
        
        # Criar arquivo temporário de configuração do Supabase
        SUPABASE_CONFIG_DIR="${PROJECT_DIR}/.supabase"
        mkdir -p ${SUPABASE_CONFIG_DIR}
        
        # Criar config.toml básico
        cat > ${SUPABASE_CONFIG_DIR}/config.toml << EOF
project_id = "${PROJECT_REF}"
EOF
        
        # Executar migrações uma por uma na ordem
        MIGRATIONS_DIR="${PROJECT_DIR}/supabase/migrations"
        if [ -d "$MIGRATIONS_DIR" ]; then
            # Listar migrações em ordem
            MIGRATION_FILES=$(ls -1 ${MIGRATIONS_DIR}/*.sql | sort)
            
            for MIGRATION_FILE in $MIGRATION_FILES; do
                MIGRATION_NAME=$(basename "$MIGRATION_FILE")
                echo -e "${BLUE}📄 Executando: ${MIGRATION_NAME}...${NC}"
                
                # Executar migração via script seguro
                # Usar o script dedicado que tem melhor tratamento de erros
                if [ -f "${PROJECT_DIR}/scripts/execute-migrations-safe.sh" ]; then
                    bash "${PROJECT_DIR}/scripts/execute-migrations-safe.sh" "${PROJECT_DIR}" "${MIGRATION_FILE}"
                else
                    # Método alternativo: executar SQL diretamente
                    # Nota: Para máxima segurança, recomenda-se executar manualmente
                    echo -e "${YELLOW}⚠️  Script de migração não encontrado${NC}"
                    echo -e "${YELLOW}   Execute manualmente no Supabase Dashboard: ${MIGRATION_NAME}${NC}"
                    echo -e "${YELLOW}   Arquivo: ${MIGRATION_FILE}${NC}"
                fi
            done
            
            echo ""
            echo -e "${GREEN}✅ Migrações executadas${NC}"
            echo -e "${YELLOW}💡 Verifique no Supabase Dashboard se todas foram aplicadas corretamente${NC}"
        else
            echo -e "${RED}❌ Diretório de migrações não encontrado: ${MIGRATIONS_DIR}${NC}"
        fi
    else
        echo -e "${YELLOW}Migrações canceladas. Execute manualmente depois.${NC}"
    fi
else
    echo ""
    echo -e "${YELLOW}Migrações serão executadas manualmente depois.${NC}"
    echo -e "${YELLOW}As migrações estão em: ${PROJECT_DIR}/supabase/migrations/${NC}"
    echo -e "${YELLOW}Execute no Supabase Dashboard > SQL Editor${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# 11. Instalar dependências
echo -e "${BLUE}📦 Instalando dependências do projeto...${NC}"
npm ci --production=false

# 12. Build do projeto
echo -e "${BLUE}🔨 Fazendo build do projeto...${NC}"
npm run build

if [ ! -d ".next" ]; then
    echo -e "${RED}❌ Erro: Build falhou${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build concluído${NC}"

# 12. Configurar PM2
echo -e "${BLUE}⚙️  Configurando PM2...${NC}"
pm2 delete ${PM2_NAME} 2>/dev/null || true
cd ${PROJECT_DIR}
pm2 start npm --name ${PM2_NAME} -- start
pm2 save

# 13. Obter certificado SSL (se não existir)
echo -e "${BLUE}🔐 Verificando certificado SSL...${NC}"
if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo -e "${YELLOW}⚠️  Certificado SSL não encontrado${NC}"
    echo -e "${BLUE}📝 Configurando Nginx temporariamente para obter certificado...${NC}"
    
    # Criar configuração temporária do Nginx
    cat > /etc/nginx/sites-available/${PROJECT_NAME} << EOF
server {
    listen 80;
    server_name ${DOMAIN};

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
    
    ln -sf /etc/nginx/sites-available/${PROJECT_NAME} /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
    nginx -t
    systemctl reload nginx
    
    echo -e "${BLUE}🔐 Obtendo certificado SSL...${NC}"
    certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} --redirect
    
    echo -e "${GREEN}✅ Certificado SSL obtido${NC}"
else
    echo -e "${GREEN}✅ Certificado SSL já existe${NC}"
fi

# 14. Configurar Nginx com SSL
echo -e "${BLUE}🌐 Configurando Nginx...${NC}"
cat > /etc/nginx/sites-available/${PROJECT_NAME} << EOF
server {
    listen 80;
    server_name ${DOMAIN};
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
EOF

# Habilitar site
ln -sf /etc/nginx/sites-available/${PROJECT_NAME} /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

# Testar configuração Nginx
nginx -t

# Recarregar Nginx
systemctl reload nginx

# 15. Verificar status
echo -e "${BLUE}🔍 Verificando status...${NC}"
pm2 status ${PM2_NAME}
systemctl status nginx --no-pager | head -5

echo -e "${GREEN}✅ Instalação concluída com sucesso!${NC}"
echo -e "${GREEN}🌐 Acesse: https://${DOMAIN}${NC}"
echo -e "${YELLOW}💡 Para ver logs: pm2 logs ${PM2_NAME}${NC}"
echo -e "${YELLOW}💡 Para reiniciar: pm2 restart ${PM2_NAME}${NC}"
echo -e "${YELLOW}💡 Para atualizar: cd ${PROJECT_DIR} && git pull && npm ci && npm run build && pm2 restart ${PM2_NAME}${NC}"

