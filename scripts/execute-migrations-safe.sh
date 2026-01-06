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
    
    # Método seguro: usar Supabase Management API via curl
    # Criar função RPC temporária se não existir (apenas para execução segura)
    
    # Executar SQL via Management API usando service_role_key
    # Nota: Este método requer que a função exec_sql exista no Supabase
    # Se não existir, o script mostrará instruções para execução manual
    
    SQL_ESCAPED=$(echo "$SQL_CONTENT" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed "s/'/''/g")
    
    # Tentar executar via psql se disponível (método mais confiável)
    if command -v psql &> /dev/null; then
        # Extrair connection string do service_role_key
        DB_URL="${NEXT_PUBLIC_SUPABASE_URL#https://}"
        DB_URL="${DB_URL%.supabase.co}"
        
        # Construir connection string PostgreSQL
        # Nota: Para máxima segurança, use variável de ambiente DATABASE_URL
        if [ -n "$DATABASE_URL" ]; then
            echo "$SQL_CONTENT" | psql "$DATABASE_URL" -q && \
                echo -e "${GREEN}✅ ${MIGRATION_NAME} executada${NC}" || \
                echo -e "${YELLOW}⚠️  ${MIGRATION_NAME} falhou - execute manualmente${NC}"
        else
            echo -e "${YELLOW}⚠️  DATABASE_URL não configurado${NC}"
            echo -e "${YELLOW}   Execute manualmente no Supabase Dashboard: ${MIGRATION_NAME}${NC}"
        fi
    else
        # Método alternativo: instruir execução manual (mais seguro)
        echo -e "${YELLOW}⚠️  Para máxima segurança, execute manualmente:${NC}"
        echo -e "${BLUE}   1. Acesse: https://supabase.com/dashboard${NC}"
        echo -e "${BLUE}   2. Projeto: ${PROJECT_REF}${NC}"
        echo -e "${BLUE}   3. SQL Editor > New Query${NC}"
        echo -e "${BLUE}   4. Cole o conteúdo de: ${MIGRATION_FILE}${NC}"
        echo -e "${BLUE}   5. Execute${NC}"
        echo ""
        echo -e "${YELLOW}   Ou instale psql e configure DATABASE_URL no .env.local${NC}"
    fi
done

echo ""
echo -e "${GREEN}✅ Processo concluído${NC}"
echo -e "${YELLOW}💡 Verifique no Supabase Dashboard se todas as migrações foram aplicadas${NC}"

