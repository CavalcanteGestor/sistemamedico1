#!/bin/bash

# Script para Limpar Projeto - Remover Arquivos Desnecessários
# Use com cuidado! Faça backup antes.

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     🧹 LIMPEZA DO PROJETO LUMI                                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: Execute este script no diretório do projeto${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  ATENÇÃO: Este script vai remover arquivos!${NC}"
echo ""
read -p "Deseja continuar? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "Limpeza cancelada."
    exit 0
fi

echo ""
echo "🧹 Iniciando limpeza..."
echo ""

# 1. Remover documentação duplicada/desnecessária
echo "1️⃣  Removendo documentação duplicada..."
FILES_TO_REMOVE=(
    # Análises antigas (manter apenas as essenciais)
    "ANALISE_TELEMEDICINA.md"
    "ANALISE_COMPLETA_SISTEMA.md"
    "MELHORIAS_IMPLEMENTADAS.md"
    "GUIA_MELHORIAS.md"
    "FLUXO_LOGIN_PACIENTE.md"
    
    # Guias muito específicos que podem ser consolidados
    "SOLUCAO_ERRO_BUILD.md"
    "LIMPEZA_PRODUCAO.md"
    "INSTRUCOES_VPS.md"  # Pode ser consolidado com GUIA_RAPIDO_DEPLOY
    "COMANDOS_RAPIDOS_VPS.md"  # Pode ser consolidado
    "COMO_USAR_ANALISE_CPU.md"  # Pode ser consolidado
    
    # Scripts antigos/duplicados
    "deploy.sh"  # Substituído por DEPLOY_AUTOMATICO.sh
    "update.sh"  # Substituído por scripts/atualizar-sistema-vps.sh
    "setup-cron-jobs.sh"  # Pode ser integrado em outro script
    
    # Templates de email duplicados
    "TEMPLATE_EMAIL_RECUPERACAO_SENHA.html"  # Manter apenas o simplificado
)

for file in "${FILES_TO_REMOVE[@]}"; do
    if [ -f "$file" ]; then
        echo "   🗑️  Removendo: $file"
        rm -f "$file"
    fi
done
echo -e "${GREEN}✅ Documentação limpa${NC}"
echo ""

# 2. Remover scripts de desenvolvimento
echo "2️⃣  Removendo scripts de desenvolvimento..."
DEV_SCRIPTS=(
    "scripts/replace-console-logs.js"  # Script de migração, não é mais necessário
)

for script in "${DEV_SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        echo "   🗑️  Removendo: $script"
        rm -f "$script"
    fi
done
echo -e "${GREEN}✅ Scripts limpos${NC}"
echo ""

# 3. Remover arquivos de teste (manter estrutura mas limpar conteúdo desnecessário)
echo "3️⃣  Verificando arquivos de teste..."
if [ -d "__tests__" ]; then
    echo "   ℹ️  Mantendo estrutura de testes (pode ser útil)"
fi
echo ""

# 4. Remover arquivos temporários
echo "4️⃣  Removendo arquivos temporários..."
find . -name "*.tmp" -type f -delete 2>/dev/null || true
find . -name "*.temp" -type f -delete 2>/dev/null || true
find . -name "*.log" -type f -not -path "./node_modules/*" -delete 2>/dev/null || true
find . -name ".DS_Store" -type f -delete 2>/dev/null || true
find . -name "Thumbs.db" -type f -delete 2>/dev/null || true
echo -e "${GREEN}✅ Arquivos temporários removidos${NC}"
echo ""

# 5. Limpar node_modules se solicitado (opcional)
read -p "Deseja limpar node_modules? (será necessário npm install depois) (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    if [ -d "node_modules" ]; then
        echo "   🗑️  Removendo node_modules..."
        rm -rf node_modules
        echo -e "${GREEN}✅ node_modules removido${NC}"
    fi
fi
echo ""

# 6. Limpar .next se existir
if [ -d ".next" ]; then
    read -p "Deseja limpar .next? (será necessário npm run build depois) (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo "   🗑️  Removendo .next..."
        rm -rf .next
        echo -e "${GREEN}✅ .next removido${NC}"
    fi
fi
echo ""

# 7. Verificar arquivos grandes
echo "5️⃣  Verificando arquivos grandes..."
echo ""
find . -type f -size +1M -not -path "./node_modules/*" -not -path "./.next/*" -not -path "./.git/*" | head -10
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ✅ Limpeza Concluída!                                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📝 Arquivos removidos:"
echo "   - Documentação duplicada"
echo "   - Scripts antigos"
echo "   - Arquivos temporários"
echo ""
echo "💡 Próximos passos:"
echo "   1. Se removeu node_modules: npm install"
echo "   2. Se removeu .next: npm run build"
echo "   3. Commit das mudanças: git add -A && git commit -m 'chore: limpeza do projeto'"
echo ""

