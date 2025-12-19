#!/bin/bash

# Script para configurar Cron Jobs no VPS
# Execute: chmod +x setup-cron-jobs.sh && ./setup-cron-jobs.sh

set -e

echo "🔧 Configurando Cron Jobs para Sistema Médico..."

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar se .env.local existe
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ Erro: .env.local não encontrado.${NC}"
    echo "Configure as variáveis de ambiente primeiro."
    exit 1
fi

# Ler variáveis do .env.local
source .env.local

# Verificar se CRON_SECRET_KEY está configurada
if [ -z "$CRON_SECRET_KEY" ]; then
    echo -e "${RED}❌ Erro: CRON_SECRET_KEY não configurada no .env.local${NC}"
    exit 1
fi

# Verificar se NEXT_PUBLIC_APP_URL está configurada
if [ -z "$NEXT_PUBLIC_APP_URL" ]; then
    echo -e "${RED}❌ Erro: NEXT_PUBLIC_APP_URL não configurada no .env.local${NC}"
    exit 1
fi

# Extrair domínio da URL
DOMAIN=$(echo $NEXT_PUBLIC_APP_URL | sed -e 's|^[^/]*//||' -e 's|/.*$||')
echo -e "${GREEN}📋 Domínio detectado: $DOMAIN${NC}"

# Criar arquivo temporário com os cron jobs
CRON_FILE=$(mktemp)

# Adicionar cron jobs
cat > $CRON_FILE << EOF
# Cron Jobs para Sistema Médico
# Gerado automaticamente em $(date)

# Executar automações diariamente às 2h da manhã
0 2 * * * curl -X POST https://$DOMAIN/api/follow-up/automations/run -H "Authorization: Bearer $CRON_SECRET_KEY" -H "Content-Type: application/json" > /dev/null 2>&1

# Processar follow-ups agendados a cada 5 minutos
*/5 * * * * curl -X POST https://$DOMAIN/api/follow-up/process-scheduled -H "Authorization: Bearer $CRON_SECRET_KEY" -H "Content-Type: application/json" > /dev/null 2>&1
EOF

# Verificar se já existem cron jobs do sistema médico
if crontab -l 2>/dev/null | grep -q "Sistema Médico"; then
    echo -e "${YELLOW}⚠️  Cron jobs já existem. Removendo antigos...${NC}"
    crontab -l 2>/dev/null | grep -v "Sistema Médico" | grep -v "follow-up" | crontab -
fi

# Adicionar novos cron jobs
crontab -l 2>/dev/null | cat - $CRON_FILE | crontab -

# Limpar arquivo temporário
rm $CRON_FILE

echo -e "${GREEN}✅ Cron jobs configurados com sucesso!${NC}"
echo ""
echo -e "${GREEN}📋 Cron jobs ativos:${NC}"
crontab -l | grep -A 2 "Sistema Médico"

echo ""
echo -e "${YELLOW}📝 Notas:${NC}"
echo "- Automações executam diariamente às 2h da manhã"
echo "- Follow-ups agendados são processados a cada 5 minutos"
echo "- Para ver logs: tail -f /var/log/syslog | grep CRON"
echo "- Para editar: crontab -e"
echo "- Para listar: crontab -l"

