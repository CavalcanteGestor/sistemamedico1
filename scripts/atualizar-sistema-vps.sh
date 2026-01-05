#!/bin/bash

# Script de Atualização do Sistema Lumi na VPS
# Atualiza código, dependências e reinicia o sistema

set -e  # Parar em caso de erro

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     🔄 ATUALIZAÇÃO DO SISTEMA LUMI                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: Execute este script no diretório do projeto${NC}"
    echo "   Exemplo: cd /var/www/sistema-medico"
    exit 1
fi

PROJECT_DIR=$(pwd)
echo -e "${GREEN}✅ Diretório do projeto: $PROJECT_DIR${NC}"
echo ""

# 1. Verificar status atual
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ 1️⃣  Verificando Status Atual                                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Verificar se PM2 está rodando
if command -v pm2 &> /dev/null; then
    echo "📦 Status PM2:"
    pm2 list
    echo ""
else
    echo -e "${YELLOW}⚠️  PM2 não encontrado${NC}"
    echo ""
fi

# Verificar branch atual
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "🌿 Branch atual: $CURRENT_BRANCH"
echo ""

# 2. Fazer backup (opcional mas recomendado)
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ 2️⃣  Backup (Opcional)                                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

read -p "Deseja fazer backup do .env.local? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    if [ -f ".env.local" ]; then
        cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
        echo -e "${GREEN}✅ Backup do .env.local criado${NC}"
    else
        echo -e "${YELLOW}⚠️  Arquivo .env.local não encontrado${NC}"
    fi
fi
echo ""

# 3. Atualizar código do Git
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ 3️⃣  Atualizando Código do Git                                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Verificar se há mudanças locais
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Há mudanças locais não commitadas${NC}"
    git status --short
    echo ""
    read -p "Deseja descartar mudanças locais? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        git reset --hard HEAD
        git clean -fd
        echo -e "${GREEN}✅ Mudanças locais descartadas${NC}"
    else
        echo -e "${YELLOW}⚠️  Mantendo mudanças locais. Pode causar conflitos.${NC}"
    fi
    echo ""
fi

# Fazer pull
echo "📥 Fazendo pull do repositório..."
git fetch origin

# Verificar se há atualizações
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    echo -e "${GREEN}✅ Sistema já está na versão mais recente${NC}"
    echo ""
    read -p "Deseja continuar mesmo assim? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "Atualização cancelada."
        exit 0
    fi
else
    echo -e "${GREEN}📦 Atualizações disponíveis!${NC}"
    echo "   Local:  $LOCAL"
    echo "   Remote: $REMOTE"
    echo ""
fi

git pull origin main
echo -e "${GREEN}✅ Código atualizado${NC}"
echo ""

# 4. Instalar/Atualizar dependências
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ 4️⃣  Instalando/Atualizando Dependências                       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "📦 Executando npm install..."
npm install
echo -e "${GREEN}✅ Dependências instaladas${NC}"
echo ""

# 5. Verificar variáveis de ambiente
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ 5️⃣  Verificando Variáveis de Ambiente                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ Arquivo .env.local não encontrado!${NC}"
    echo ""
    if [ -f ".env.local.backup"* ]; then
        echo "Backups encontrados:"
        ls -la .env.local.backup* 2>/dev/null | head -5
        echo ""
        read -p "Deseja restaurar um backup? (s/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            LATEST_BACKUP=$(ls -t .env.local.backup* | head -1)
            cp "$LATEST_BACKUP" .env.local
            echo -e "${GREEN}✅ Backup restaurado${NC}"
        fi
    fi
    
    if [ ! -f ".env.local" ]; then
        echo -e "${YELLOW}⚠️  Você precisa configurar o .env.local antes de continuar${NC}"
        echo "   Copie do exemplo: cp env.local.example .env.local"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Arquivo .env.local encontrado${NC}"
echo ""

# 6. Fazer build
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ 6️⃣  Fazendo Build do Sistema                                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "🔨 Executando npm run build..."
echo "   (Isso pode levar alguns minutos...)"
echo ""

if npm run build; then
    echo -e "${GREEN}✅ Build concluído com sucesso${NC}"
else
    echo -e "${RED}❌ Erro no build! Verifique os erros acima.${NC}"
    exit 1
fi
echo ""

# 7. Reiniciar com PM2
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ 7️⃣  Reiniciando Sistema com PM2                              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

if command -v pm2 &> /dev/null; then
    # Verificar se o processo já está rodando
    if pm2 list | grep -q "sistema-medico\|lumi"; then
        APP_NAME=$(pm2 list | grep -E "sistema-medico|lumi" | awk '{print $4}' | head -1)
        echo "🔄 Reiniciando $APP_NAME..."
        pm2 restart "$APP_NAME"
        echo -e "${GREEN}✅ Sistema reiniciado${NC}"
    else
        echo "🚀 Iniciando sistema com PM2..."
        if [ -f "ecosystem.config.js" ]; then
            pm2 start ecosystem.config.js
        else
            pm2 start npm --name "sistema-medico" -- start
        fi
        pm2 save
        echo -e "${GREEN}✅ Sistema iniciado${NC}"
    fi
    
    echo ""
    echo "📊 Status atual:"
    pm2 list
    echo ""
    
    # Mostrar logs recentes
    echo "📋 Últimas linhas do log:"
    pm2 logs --lines 10 --nostream
    echo ""
else
    echo -e "${YELLOW}⚠️  PM2 não encontrado. Inicie manualmente com: npm start${NC}"
fi

# 8. Verificar se está funcionando
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ 8️⃣  Verificando Sistema                                       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

sleep 3

if command -v pm2 &> /dev/null; then
    APP_NAME=$(pm2 list | grep -E "sistema-medico|lumi" | awk '{print $4}' | head -1)
    STATUS=$(pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME\") | .pm2_env.status" 2>/dev/null || echo "unknown")
    
    if [ "$STATUS" = "online" ]; then
        echo -e "${GREEN}✅ Sistema está ONLINE${NC}"
    else
        echo -e "${RED}❌ Sistema está $STATUS${NC}"
        echo "   Verifique os logs: pm2 logs $APP_NAME"
    fi
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ✅ Atualização Concluída!                                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📝 Próximos passos:"
echo "   1. Verificar se o sistema está acessível"
echo "   2. Testar funcionalidades principais"
echo "   3. Verificar logs: pm2 logs"
echo ""

