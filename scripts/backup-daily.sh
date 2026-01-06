#!/bin/bash

# Script de backup diário do banco de dados
# Deve ser executado via cron job diariamente
# Exemplo de cron: 0 2 * * * /caminho/para/scripts/backup-daily.sh

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 Iniciando backup diário do sistema...${NC}"

# URL da aplicação (ajustar conforme necessário)
APP_URL="${NEXT_PUBLIC_APP_URL:-https://mercuri.ialumi.cloud}"
CRON_SECRET="${CRON_SECRET_KEY}"

if [ -z "$CRON_SECRET" ]; then
    echo -e "${RED}❌ Erro: CRON_SECRET_KEY não configurada${NC}"
    exit 1
fi

# Fazer requisição para criar backup
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "${APP_URL}/api/admin/backup" \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Backup criado com sucesso!${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}❌ Erro ao criar backup (HTTP $HTTP_CODE)${NC}"
    echo "$BODY"
    exit 1
fi

echo -e "${GREEN}✅ Backup diário concluído${NC}"

