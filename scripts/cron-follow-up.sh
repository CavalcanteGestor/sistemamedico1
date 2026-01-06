#!/bin/bash

# Script para processar follow-ups agendados via cron job
# Este script deve ser executado periodicamente (ex: a cada 1 minuto)

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configurações - Detectar automaticamente o diretório do projeto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Verificar se o diretório existe
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}Erro: Diretório do projeto não encontrado: $PROJECT_DIR${NC}"
    exit 1
fi

# Carregar variáveis de ambiente do .env.local
if [ -f "$PROJECT_DIR/.env.local" ]; then
    # Carregar apenas variáveis necessárias (evitar conflitos)
    export $(grep -v '^#' "$PROJECT_DIR/.env.local" | grep -E '^(NEXT_PUBLIC_APP_URL|CRON_SECRET_KEY)=' | xargs)
else
    echo -e "${YELLOW}Aviso: Arquivo .env.local não encontrado${NC}"
fi

# Configurar URLs e secrets
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
CRON_SECRET="${CRON_SECRET_KEY}"

# Se CRON_SECRET_KEY não estiver definido, usar autenticação via cookie
# (requer que o script seja executado com permissões adequadas)
if [ -z "$CRON_SECRET_KEY" ]; then
    echo -e "${YELLOW}Aviso: CRON_SECRET_KEY não configurado. Usando método alternativo.${NC}"
    echo -e "${YELLOW}Configure CRON_SECRET_KEY no .env.local para melhor segurança.${NC}"
fi

# Fazer requisição para processar follow-ups
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    ${CRON_SECRET_KEY:+-H "Authorization: Bearer $CRON_SECRET_KEY"} \
    "$APP_URL/api/follow-up/process-scheduled" \
    --max-time 30)

# Separar body e status code
HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

# Verificar resultado
if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    # Extrair dados do resultado
    SENT=$(echo "$HTTP_BODY" | grep -o '"sent":[0-9]*' | grep -o '[0-9]*' | head -1)
    FAILED=$(echo "$HTTP_BODY" | grep -o '"failed":[0-9]*' | grep -o '[0-9]*' | head -1)
    
    if [ -n "$SENT" ] && [ "$SENT" -gt 0 ]; then
        echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] Follow-ups processados: $SENT enviados${NC}"
    fi
    
    if [ -n "$FAILED" ] && [ "$FAILED" -gt 0 ]; then
        echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] Erro: $FAILED follow-ups falharam${NC}"
    fi
else
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] Erro HTTP $HTTP_CODE ao processar follow-ups${NC}"
    echo "$HTTP_BODY"
    exit 1
fi

exit 0

