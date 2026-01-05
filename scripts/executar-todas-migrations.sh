#!/bin/bash

# Script para Executar TODAS as Migrations de Uma Vez
# Usa a CLI do Supabase para aplicar todas as migrations automaticamente

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     🚀 EXECUTAR TODAS AS MIGRATIONS - Supabase                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar se está no diretório correto
if [ ! -d "supabase/migrations" ]; then
    echo -e "${RED}❌ Erro: Diretório supabase/migrations não encontrado${NC}"
    echo "   Execute este script na raiz do projeto"
    exit 1
fi

echo -e "${BLUE}📋 Métodos Disponíveis para Executar Migrations:${NC}"
echo ""
echo "1️⃣  Método Manual (Atual) - SQL Editor do Supabase"
echo "   - Copiar e colar cada migration no SQL Editor"
echo "   - Mais controle, mas mais lento"
echo ""
echo "2️⃣  Método CLI do Supabase (RECOMENDADO - Mais Rápido)"
echo "   - Usa a CLI oficial do Supabase"
echo "   - Aplica todas as migrations automaticamente"
echo "   - Muito mais rápido!"
echo ""
echo "3️⃣  Método Script SQL Consolidado"
echo "   - Gera um arquivo SQL com todas as migrations"
echo "   - Executa tudo de uma vez no SQL Editor"
echo ""

read -p "Escolha o método (1/2/3): " -n 1 -r
echo
echo ""

case $REPLY in
    1)
        echo -e "${YELLOW}📝 Método Manual:${NC}"
        echo ""
        echo "1. Acesse: https://supabase.com/dashboard"
        echo "2. Selecione seu projeto"
        echo "3. Vá em SQL Editor > New Query"
        echo "4. Execute as migrations na ordem (001 até 032)"
        echo "5. Veja: supabase/ORDEM_EXECUCAO_MIGRATIONS.md"
        echo ""
        exit 0
        ;;
    2)
        echo -e "${GREEN}🚀 Método CLI do Supabase (Recomendado)${NC}"
        echo ""
        
        # Verificar se Supabase CLI está instalado
        if ! command -v supabase &> /dev/null; then
            echo -e "${YELLOW}⚠️  Supabase CLI não está instalado${NC}"
            echo ""
            echo "Instalando Supabase CLI..."
            echo ""
            echo "Opção 1 - npm (Recomendado):"
            echo "  npm install -g supabase"
            echo ""
            echo "Opção 2 - Homebrew (macOS):"
            echo "  brew install supabase/tap/supabase"
            echo ""
            echo "Opção 3 - Scoop (Windows):"
            echo "  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git"
            echo "  scoop install supabase"
            echo ""
            read -p "Deseja instalar agora? (s/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Ss]$ ]]; then
                npm install -g supabase
            else
                echo "Instale manualmente e execute este script novamente"
                exit 1
            fi
        fi
        
        echo -e "${GREEN}✅ Supabase CLI encontrado${NC}"
        echo ""
        
        # Verificar se está linkado ao projeto
        if [ ! -f ".supabase/config.toml" ]; then
            echo -e "${YELLOW}⚠️  Projeto não está linkado ao Supabase${NC}"
            echo ""
            echo "Para linkar:"
            echo "1. Acesse: https://supabase.com/dashboard"
            echo "2. Vá em Settings > API"
            echo "3. Copie o 'Reference ID' do projeto"
            echo "4. Execute: supabase link --project-ref SEU_PROJECT_REF"
            echo ""
            read -p "Deseja linkar agora? (s/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Ss]$ ]]; then
                read -p "Cole o Project Reference ID: " PROJECT_REF
                supabase link --project-ref "$PROJECT_REF"
            else
                echo "Linke manualmente e execute este script novamente"
                exit 1
            fi
        fi
        
        echo ""
        echo -e "${BLUE}📦 Aplicando todas as migrations...${NC}"
        echo ""
        
        # Aplicar todas as migrations
        if supabase db push; then
            echo ""
            echo -e "${GREEN}✅ Todas as migrations foram aplicadas com sucesso!${NC}"
        else
            echo ""
            echo -e "${RED}❌ Erro ao aplicar migrations${NC}"
            echo "   Verifique os erros acima"
            exit 1
        fi
        ;;
    3)
        echo -e "${BLUE}📄 Método Script SQL Consolidado${NC}"
        echo ""
        echo "Gerando arquivo SQL consolidado..."
        echo ""
        
        OUTPUT_FILE="supabase/MIGRATIONS_CONSOLIDADAS.sql"
        
        # Limpar arquivo anterior
        > "$OUTPUT_FILE"
        
        # Adicionar header
        cat >> "$OUTPUT_FILE" << 'EOF'
-- ============================================
-- MIGRATIONS CONSOLIDADAS - Sistema Lumi
-- ============================================
-- Este arquivo contém TODAS as migrations em ordem
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================

EOF
        
        # Contar migrations
        MIGRATION_COUNT=0
        
        # Processar migrations em ordem
        for migration in supabase/migrations/*.sql; do
            if [ -f "$migration" ]; then
                MIGRATION_NAME=$(basename "$migration")
                echo "   📄 Adicionando: $MIGRATION_NAME"
                
                # Adicionar comentário com nome da migration
                echo "" >> "$OUTPUT_FILE"
                echo "-- ============================================" >> "$OUTPUT_FILE"
                echo "-- Migration: $MIGRATION_NAME" >> "$OUTPUT_FILE"
                echo "-- ============================================" >> "$OUTPUT_FILE"
                echo "" >> "$OUTPUT_FILE"
                
                # Adicionar conteúdo da migration
                cat "$migration" >> "$OUTPUT_FILE"
                
                echo "" >> "$OUTPUT_FILE"
                ((MIGRATION_COUNT++))
            fi
        done
        
        echo ""
        echo -e "${GREEN}✅ Arquivo consolidado criado: $OUTPUT_FILE${NC}"
        echo -e "${GREEN}   Total de migrations: $MIGRATION_COUNT${NC}"
        echo ""
        echo "📝 Próximos passos:"
        echo "   1. Acesse: https://supabase.com/dashboard"
        echo "   2. Selecione seu projeto"
        echo "   3. Vá em SQL Editor > New Query"
        echo "   4. Abra o arquivo: $OUTPUT_FILE"
        echo "   5. Copie TODO o conteúdo"
        echo "   6. Cole no SQL Editor"
        echo "   7. Execute (Run ou Ctrl+Enter)"
        echo ""
        echo -e "${YELLOW}⚠️  ATENÇÃO:${NC}"
        echo "   - Este método executa TODAS as migrations de uma vez"
        echo "   - Verifique se não há conflitos"
        echo "   - Faça backup do banco antes!"
        echo ""
        ;;
    *)
        echo -e "${RED}❌ Opção inválida${NC}"
        exit 1
        ;;
esac

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ✅ Processo concluído                                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

