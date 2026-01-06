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

# Garantir que script de migração tenha permissão de execução
if [ -f "scripts/execute-migrations-safe.sh" ]; then
    chmod +x scripts/execute-migrations-safe.sh
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
        echo -e "  ${BLUE}SUPABASE_ACCESS_TOKEN${NC}          - Token de acesso (opcional, para migrações automáticas)"
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

# 10. Executar migrações do banco de dados automaticamente
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📊 MIGRAÇÕES DO BANCO DE DADOS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Carregar variáveis do .env.local
export $(grep -v '^#' .env.local | grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_ACCESS_TOKEN)=' | xargs)

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

MIGRATIONS_DIR="${PROJECT_DIR}/supabase/migrations"

if [ -d "$MIGRATIONS_DIR" ]; then
    MIGRATION_COUNT=$(ls -1 ${MIGRATIONS_DIR}/*.sql 2>/dev/null | wc -l)
    
    if [ $MIGRATION_COUNT -gt 0 ]; then
        echo -e "${GREEN}✅ Encontradas ${MIGRATION_COUNT} migrações${NC}"
        echo ""
        echo -e "${YELLOW}⚠️  ATENÇÃO: As migrações serão executadas no projeto: ${PROJECT_REF}${NC}"
        echo ""
        read -p "Deseja executar as migrações automaticamente agora? (S/n): " EXECUTE_MIGRATIONS
        
        if [[ ! "$EXECUTE_MIGRATIONS" =~ ^[Nn]$ ]]; then
            echo ""
            echo -e "${BLUE}📦 Instalando Supabase CLI...${NC}"
            
            # Instalar Supabase CLI se não existir
            if ! command -v supabase &> /dev/null; then
                ARCH=$(uname -m)
                if [ "$ARCH" = "x86_64" ]; then
                    ARCH="amd64"
                elif [ "$ARCH" = "aarch64" ]; then
                    ARCH="arm64"
                else
                    echo -e "${YELLOW}⚠️  Arquitetura não suportada: ${ARCH}${NC}"
                    EXECUTE_MIGRATIONS="n"
                fi
                
                if [[ ! "$EXECUTE_MIGRATIONS" =~ ^[Nn]$ ]]; then
                    SUPABASE_CLI_VERSION="1.200.0"
                    echo -e "${BLUE}   Baixando Supabase CLI v${SUPABASE_CLI_VERSION}...${NC}"
                    
                    if wget -qO- https://github.com/supabase/cli/releases/download/v${SUPABASE_CLI_VERSION}/supabase_${SUPABASE_CLI_VERSION}_linux_${ARCH}.tar.gz 2>/dev/null | tar -xz 2>/dev/null; then
                        mv supabase /usr/local/bin/ 2>/dev/null || cp supabase /usr/local/bin/ 2>/dev/null || true
                        chmod +x /usr/local/bin/supabase
                        rm -f supabase
                        echo -e "${GREEN}✅ Supabase CLI instalado${NC}"
                    else
                        echo -e "${YELLOW}⚠️  Erro ao instalar Supabase CLI${NC}"
                        EXECUTE_MIGRATIONS="n"
                    fi
                fi
            else
                echo -e "${GREEN}✅ Supabase CLI já instalado${NC}"
            fi
            
            if [[ ! "$EXECUTE_MIGRATIONS" =~ ^[Nn]$ ]] && command -v supabase &> /dev/null; then
                # Verificar se precisa de access token
                if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
                    echo ""
                    echo -e "${YELLOW}⚠️  SUPABASE_ACCESS_TOKEN não encontrado${NC}"
                    echo -e "${YELLOW}   Para execução automática, você precisa criar um token:${NC}"
                    echo -e "${YELLOW}   1. Acesse: https://supabase.com/dashboard/account/tokens${NC}"
                    echo -e "${YELLOW}   2. Crie um novo token${NC}"
                    echo -e "${YELLOW}   3. Adicione ao .env.local: SUPABASE_ACCESS_TOKEN=seu_token${NC}"
                    echo ""
                    echo -e "${YELLOW}   Por enquanto, execute as migrações manualmente${NC}"
                    EXECUTE_MIGRATIONS="n"
                fi
                
                if [[ ! "$EXECUTE_MIGRATIONS" =~ ^[Nn]$ ]] && [ -n "$SUPABASE_ACCESS_TOKEN" ]; then
                    echo ""
                    echo -e "${BLUE}🔐 Autenticando no Supabase...${NC}"
                    echo "$SUPABASE_ACCESS_TOKEN" | supabase login --token - > /dev/null 2>&1
                    
                    if [ $? -eq 0 ]; then
                        echo -e "${GREEN}✅ Autenticação realizada${NC}"
                        
                        # Vincular projeto
                        echo -e "${BLUE}🔗 Vinculando projeto ${PROJECT_REF}...${NC}"
                        cd ${PROJECT_DIR}
                        supabase link --project-ref ${PROJECT_REF} > /dev/null 2>&1
                        
                        if [ $? -eq 0 ]; then
                            echo -e "${GREEN}✅ Projeto vinculado${NC}"
                            
                            # Executar migrações
                            echo -e "${BLUE}📄 Executando ${MIGRATION_COUNT} migrações...${NC}"
                            echo ""
                            
                            if supabase db push > /dev/null 2>&1; then
                                echo -e "${GREEN}✅ Migrações executadas com sucesso!${NC}"
                            else
                                echo -e "${YELLOW}⚠️  Erro ao executar migrações via CLI${NC}"
                                echo -e "${YELLOW}   Execute manualmente no Dashboard${NC}"
                                EXECUTE_MIGRATIONS="n"
                            fi
                        else
                            echo -e "${YELLOW}⚠️  Erro ao vincular projeto${NC}"
                            echo -e "${YELLOW}   Execute as migrações manualmente${NC}"
                            EXECUTE_MIGRATIONS="n"
                        fi
                    else
                        echo -e "${YELLOW}⚠️  Erro na autenticação${NC}"
                        echo -e "${YELLOW}   Verifique o SUPABASE_ACCESS_TOKEN${NC}"
                        EXECUTE_MIGRATIONS="n"
                    fi
                fi
            fi
        fi
        
        # Se não executou automaticamente, mostrar instruções
        if [[ "$EXECUTE_MIGRATIONS" =~ ^[Nn]$ ]] || [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
            echo ""
            echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
            echo -e "${BLUE}📋 EXECUTAR MIGRAÇÕES MANUALMENTE${NC}"
            echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
            echo ""
            echo -e "${YELLOW}1. Acesse: https://supabase.com/dashboard/project/${PROJECT_REF}${NC}"
            echo -e "${YELLOW}2. Vá em SQL Editor > New Query${NC}"
            echo -e "${YELLOW}3. Execute as migrações em ordem numérica:${NC}"
            ls -1 ${MIGRATIONS_DIR}/*.sql | sort | head -10 | while read file; do
                echo -e "   ${GREEN}✓${NC} $(basename "$file")"
            done
            if [ $MIGRATION_COUNT -gt 10 ]; then
                echo -e "   ${YELLOW}... e mais $(($MIGRATION_COUNT - 10)) migrações${NC}"
            fi
            echo ""
            echo -e "${YELLOW}⚠️  IMPORTANTE: Execute na ordem numérica (001, 002, 003...)!${NC}"
            echo ""
            read -p "Pressione ENTER para continuar..."
        fi
    else
        echo -e "${YELLOW}⚠️  Nenhuma migração encontrada${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Diretório de migrações não encontrado${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# 11. Instalar dependências do projeto
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

# 13. Configurar PM2
echo -e "${BLUE}⚙️  Configurando PM2...${NC}"
pm2 delete ${PM2_NAME} 2>/dev/null || true
cd ${PROJECT_DIR}
pm2 start npm --name ${PM2_NAME} -- start
pm2 save

# 14. Obter certificado SSL (se não existir)
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

# 15. Configurar Nginx com SSL
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

# 16. Verificar status
echo -e "${BLUE}🔍 Verificando status...${NC}"
pm2 status ${PM2_NAME}
systemctl status nginx --no-pager | head -5

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Instalação concluída com sucesso!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}🌐 Acesse: https://${DOMAIN}${NC}"
echo ""
echo -e "${YELLOW}⚠️  LEMBRE-SE:${NC}"
echo -e "${YELLOW}   - Verifique se todas as migrações foram executadas${NC}"
echo -e "${YELLOW}   - Configure outras variáveis no .env.local se necessário${NC}"
echo ""
echo -e "${BLUE}💡 Comandos úteis:${NC}"
echo -e "  ${YELLOW}Ver logs:${NC} pm2 logs ${PM2_NAME}"
echo -e "  ${YELLOW}Reiniciar:${NC} pm2 restart ${PM2_NAME}"
echo -e "  ${YELLOW}Atualizar:${NC} cd ${PROJECT_DIR} && git pull && npm ci && npm run build && pm2 restart ${PM2_NAME}"
echo ""
