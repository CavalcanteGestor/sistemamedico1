#!/bin/bash

# Script para corrigir erro "upstream sent too big header" no Nginx
# Este erro ocorre quando o Next.js envia headers muito grandes (cookies, sessões, etc)

echo "🔧 Corrigindo erro de headers grandes no Nginx..."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Encontrar arquivo de configuração do Nginx para mercuri.ialumi.cloud
echo "🔍 Procurando configuração do Nginx para mercuri.ialumi.cloud..."

NGINX_CONFIG=""
if [ -f "/etc/nginx/sites-available/mercuri.ialumi.cloud" ]; then
    NGINX_CONFIG="/etc/nginx/sites-available/mercuri.ialumi.cloud"
elif [ -f "/etc/nginx/sites-available/sistema-medico" ]; then
    NGINX_CONFIG="/etc/nginx/sites-available/sistema-medico"
else
    # Tentar encontrar qualquer arquivo que contenha mercuri.ialumi.cloud
    NGINX_CONFIG=$(sudo grep -r "mercuri.ialumi.cloud" /etc/nginx/sites-available/ 2>/dev/null | head -1 | cut -d: -f1)
fi

if [ -z "$NGINX_CONFIG" ]; then
    echo -e "${RED}❌ Arquivo de configuração não encontrado!${NC}"
    echo "📋 Arquivos disponíveis em /etc/nginx/sites-available/:"
    sudo ls -la /etc/nginx/sites-available/
    exit 1
fi

echo -e "${GREEN}✅ Arquivo encontrado: $NGINX_CONFIG${NC}"
echo ""

# 2. Fazer backup da configuração atual
BACKUP_FILE="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
echo "💾 Criando backup: $BACKUP_FILE"
sudo cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup criado${NC}"
echo ""

# 3. Verificar se as configurações já existem
if sudo grep -q "proxy_buffer_size" "$NGINX_CONFIG"; then
    echo -e "${YELLOW}⚠️  Configurações de proxy_buffer já existem. Atualizando...${NC}"
    # Remover linhas antigas
    sudo sed -i '/proxy_buffer_size/d' "$NGINX_CONFIG"
    sudo sed -i '/proxy_buffers/d' "$NGINX_CONFIG"
    sudo sed -i '/proxy_busy_buffers_size/d' "$NGINX_CONFIG"
fi

# 4. Adicionar configurações de buffer aumentadas
echo "📝 Adicionando configurações de buffer aumentadas..."

# Encontrar o bloco location / e adicionar as configurações
if sudo grep -q "location /" "$NGINX_CONFIG"; then
    # Adicionar após proxy_pass ou proxy_set_header
    sudo sed -i '/proxy_set_header X-Forwarded-Proto/a\
    # Buffers aumentados para headers grandes do Next.js\
    proxy_buffer_size 16k;\
    proxy_buffers 8 16k;\
    proxy_busy_buffers_size 32k;\
    fastcgi_buffers 16 16k;\
    fastcgi_buffer_size 32k;\
' "$NGINX_CONFIG"
else
    echo -e "${RED}❌ Bloco 'location /' não encontrado!${NC}"
    exit 1
fi

# Também adicionar no nível do server se não existir
if ! sudo grep -q "proxy_buffer_size" "$NGINX_CONFIG" | grep -v "^[[:space:]]*#"; then
    # Adicionar após server_name
    sudo sed -i '/server_name/a\
    # Buffers aumentados para headers grandes\
    proxy_buffer_size 16k;\
    proxy_buffers 8 16k;\
    proxy_busy_buffers_size 32k;\
' "$NGINX_CONFIG"
fi

echo -e "${GREEN}✅ Configurações adicionadas${NC}"
echo ""

# 5. Verificar sintaxe do Nginx
echo "🔍 Verificando sintaxe do Nginx..."
if sudo nginx -t; then
    echo -e "${GREEN}✅ Sintaxe OK${NC}"
else
    echo -e "${RED}❌ Erro na sintaxe! Restaurando backup...${NC}"
    sudo cp "$BACKUP_FILE" "$NGINX_CONFIG"
    exit 1
fi
echo ""

# 6. Recarregar Nginx
echo "🔄 Recarregando Nginx..."
if sudo systemctl reload nginx; then
    echo -e "${GREEN}✅ Nginx recarregado com sucesso!${NC}"
else
    echo -e "${RED}❌ Erro ao recarregar Nginx!${NC}"
    sudo systemctl status nginx
    exit 1
fi
echo ""

# 7. Aguardar alguns segundos
sleep 3

# 8. Testar se a aplicação está respondendo
echo "🧪 Testando aplicação..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|301\|302\|307"; then
    echo -e "${GREEN}✅ Aplicação está respondendo localmente${NC}"
else
    echo -e "${YELLOW}⚠️  Aplicação pode não estar respondendo localmente${NC}"
fi

# 9. Verificar logs recentes
echo ""
echo "📋 Últimas linhas do log de erro do Nginx:"
sudo tail -n 5 /var/log/nginx/error.log

echo ""
echo -e "${GREEN}✅ Correção aplicada!${NC}"
echo ""
echo "📊 Configurações aplicadas:"
echo "   - proxy_buffer_size: 16k"
echo "   - proxy_buffers: 8 16k"
echo "   - proxy_busy_buffers_size: 32k"
echo ""
echo "🌐 Teste no navegador: https://mercuri.ialumi.cloud"
echo ""
echo "💡 Se o problema persistir, você pode aumentar ainda mais:"
echo "   - proxy_buffer_size 32k;"
echo "   - proxy_buffers 16 32k;"
echo "   - proxy_busy_buffers_size 64k;"
echo ""

