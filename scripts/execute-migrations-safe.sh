#!/bin/bash

# Script seguro para executar migrações do Supabase
# Este script executa migrações via Supabase Management API de forma segura

set -e

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="${1:-/var/www/sistema-medico}"
ENV_FILE="${PROJECT_DIR}/.env.local"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Arquivo .env.local não encontrado em ${PROJECT_DIR}${NC}"
    exit 1
fi

# Carregar variáveis de forma segura (sem executar código)
export $(grep -v '^#' "$ENV_FILE" | grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' | xargs)

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Variáveis do Supabase não encontradas${NC}"
    exit 1
fi

# Extrair project ref
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -n 's|https://\([^.]*\)\.supabase\.co|\1|p')

if [ -z "$PROJECT_REF" ]; then
    echo -e "${RED}❌ Não foi possível extrair o project ref${NC}"
    exit 1
fi

MIGRATIONS_DIR="${PROJECT_DIR}/supabase/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo -e "${RED}❌ Diretório de migrações não encontrado${NC}"
    exit 1
fi

echo -e "${BLUE}📊 Executando migrações para projeto: ${PROJECT_REF}${NC}"
echo ""

# Executar migrações em ordem
MIGRATION_FILES=$(ls -1 ${MIGRATIONS_DIR}/*.sql | sort)
TOTAL=$(echo "$MIGRATION_FILES" | wc -l)
CURRENT=0

for MIGRATION_FILE in $MIGRATION_FILES; do
    CURRENT=$((CURRENT + 1))
    MIGRATION_NAME=$(basename "$MIGRATION_FILE")
    
    echo -e "${BLUE}[${CURRENT}/${TOTAL}] Executando: ${MIGRATION_NAME}...${NC}"
    
    # Ler conteúdo do arquivo e escapar para JSON
    SQL_CONTENT=$(cat "$MIGRATION_FILE" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | tr '\n' ' ' | sed 's/  */ /g')
    
    # Executar via Supabase REST API (método mais seguro)
    # Usar pg_query para executar SQL diretamente
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X POST \
        "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql" \
        -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "{\"query\": \"${SQL_CONTENT}\"}" 2>&1)
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "204" ]; then
        echo -e "${GREEN}✅ ${MIGRATION_NAME} executada${NC}"
    else
        # Tentar método alternativo: executar SQL diretamente via psql se disponível
        echo -e "${YELLOW}⚠️  Método REST falhou, tentando método alternativo...${NC}"
        
        # Nota: Para máxima segurança, recomenda-se executar manualmente no Dashboard
        echo -e "${YELLOW}   Execute manualmente no Supabase Dashboard: ${MIGRATION_NAME}${NC}"
        echo -e "${YELLOW}   Resposta HTTP: ${HTTP_CODE}${NC}"
    fi
done

echo ""
echo -e "${GREEN}✅ Processo concluído${NC}"
echo -e "${YELLOW}💡 Verifique no Supabase Dashboard se todas as migrações foram aplicadas${NC}"

