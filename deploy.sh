#!/bin/bash

# Script de Deploy Automatizado para VPS
# Execute: chmod +x deploy.sh && ./deploy.sh

set -e  # Parar em caso de erro

echo "🚀 Iniciando deploy do Sistema Médico..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: package.json não encontrado. Execute este script na raiz do projeto.${NC}"
    exit 1
fi

# Verificar se .env.local existe
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  Aviso: .env.local não encontrado. Criando a partir do exemplo...${NC}"
    if [ -f "env.local.example" ]; then
        cp env.local.example .env.local
        echo -e "${YELLOW}⚠️  Por favor, edite .env.local com suas credenciais antes de continuar.${NC}"
        exit 1
    else
        echo -e "${RED}❌ Erro: env.local.example não encontrado.${NC}"
        exit 1
    fi
fi

# Instalar dependências
echo -e "${GREEN}📦 Instalando dependências...${NC}"
npm install --production=false

# Build do projeto
echo -e "${GREEN}🔨 Fazendo build do projeto...${NC}"
npm run build

# Verificar se PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PM2 não encontrado. Instalando...${NC}"
    sudo npm install -g pm2
fi

# Criar diretório de logs se não existir
mkdir -p logs

# Parar aplicação se já estiver rodando
echo -e "${GREEN}🛑 Parando aplicação anterior (se existir)...${NC}"
pm2 stop sistema-medico 2>/dev/null || true
pm2 delete sistema-medico 2>/dev/null || true

# Iniciar aplicação com PM2
echo -e "${GREEN}▶️  Iniciando aplicação com PM2...${NC}"
pm2 start ecosystem.config.js

# Salvar configuração do PM2
pm2 save

echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo -e "${GREEN}📊 Status:${NC}"
pm2 status

echo -e "\n${YELLOW}📝 Próximos passos:${NC}"
echo "1. Configure o Nginx como proxy reverso (veja GUIA_DEPLOY_VPS.md)"
echo "2. Configure SSL com Certbot"
echo "3. Configure cron jobs para automações"
echo "4. Verifique os logs: pm2 logs sistema-medico"

