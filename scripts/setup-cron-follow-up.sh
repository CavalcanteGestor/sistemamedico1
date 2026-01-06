#!/bin/bash

# Script para configurar cron job de follow-ups automaticamente
# Este script adiciona o cron job ao crontab do usuário

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_DIR="/var/www/sistema-medico"
CRON_SCRIPT="$PROJECT_DIR/scripts/cron-follow-up.sh"

echo -e "${YELLOW}Configurando cron job para processar follow-ups...${NC}"

# Verificar se o script existe
if [ ! -f "$CRON_SCRIPT" ]; then
    echo "Erro: Script não encontrado: $CRON_SCRIPT"
    exit 1
fi

# Tornar script executável
chmod +x "$CRON_SCRIPT"

# Verificar se já existe no crontab
CRON_JOB="* * * * * $CRON_SCRIPT >> /var/log/follow-up-cron.log 2>&1"

if crontab -l 2>/dev/null | grep -q "$CRON_SCRIPT"; then
    echo -e "${YELLOW}Cron job já está configurado.${NC}"
    echo "Para remover, execute: crontab -e"
else
    # Adicionar ao crontab
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo -e "${GREEN}✅ Cron job configurado com sucesso!${NC}"
    echo ""
    echo "O cron job executará a cada 1 minuto."
    echo "Logs serão salvos em: /var/log/follow-up-cron.log"
    echo ""
    echo "Para verificar: crontab -l"
    echo "Para editar: crontab -e"
    echo "Para ver logs: tail -f /var/log/follow-up-cron.log"
fi

