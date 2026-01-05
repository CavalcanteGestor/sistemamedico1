#!/bin/bash

# Script de Atualização Rápida para VPS/VPN
# Execute: chmod +x update.sh && ./update.sh

set -e  # Parar em caso de erro

echo "🔄 Iniciando atualização do Sistema Médico..."

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

# Atualizar código (se usar Git)
if [ -d ".git" ]; then
    echo -e "${GREEN}📥 Atualizando código do repositório...${NC}"
    git pull || echo -e "${YELLOW}⚠️  Aviso: git pull falhou ou não há mudanças.${NC}"
else
    echo -e "${YELLOW}⚠️  Git não detectado. Certifique-se de que os arquivos foram atualizados manualmente.${NC}"
fi

# Instalar dependências
echo -e "${GREEN}📦 Instalando/atualizando dependências...${NC}"
npm install --production=false

# Limpar arquivos problemáticos que podem causar erros no build
echo -e "${GREEN}🧹 Limpando arquivos problemáticos...${NC}"
rm -f sites-enabled sites-available 2>/dev/null || true
rm -rf .next 2>/dev/null || true

# Fazer backup do build anterior (opcional)
if [ -d ".next" ]; then
    echo -e "${GREEN}💾 Fazendo backup do build anterior...${NC}"
    rm -rf .next.backup 2>/dev/null || true
    cp -r .next .next.backup 2>/dev/null || true
fi

# Build do projeto
echo -e "${GREEN}🔨 Fazendo build do projeto...${NC}"
npm run build

# Verificar se o build foi bem-sucedido
if [ ! -d ".next" ]; then
    echo -e "${RED}❌ Erro: Build falhou! .next não foi criado.${NC}"
    exit 1
fi

# Verificar se PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ Erro: PM2 não encontrado. Instale com: sudo npm install -g pm2${NC}"
    exit 1
fi

# Reiniciar aplicação com PM2
echo -e "${GREEN}🔄 Reiniciando aplicação...${NC}"
pm2 restart sistema-medico || pm2 start ecosystem.config.js

# Salvar configuração do PM2
pm2 save

echo -e "\n${GREEN}✅ Atualização concluída com sucesso!${NC}"
echo -e "${GREEN}📊 Status da aplicação:${NC}"
pm2 status

echo -e "\n${YELLOW}📝 Para ver os logs:${NC}"
echo "pm2 logs sistema-medico"

echo -e "\n${YELLOW}📝 Para monitorar em tempo real:${NC}"
echo "pm2 monit"

