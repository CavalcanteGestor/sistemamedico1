#!/bin/bash

# Script para corrigir erro "upstream sent too big header" no Nginx

echo "🔧 Corrigindo configuração do Nginx para headers grandes..."
echo ""

# Encontrar arquivo de configuração do Nginx
NGINX_CONFIG=""

if [ -f /etc/nginx/sites-available/sistema-medico ]; then
    NGINX_CONFIG="/etc/nginx/sites-available/sistema-medico"
    echo "✅ Encontrado: $NGINX_CONFIG"
elif [ -f /etc/nginx/sites-available/default ]; then
    NGINX_CONFIG="/etc/nginx/sites-available/default"
    echo "✅ Encontrado: $NGINX_CONFIG"
else
    echo "❌ Nenhum arquivo de configuração encontrado!"
    echo "   Procurando em /etc/nginx/sites-available/..."
    ls -la /etc/nginx/sites-available/
    exit 1
fi

# Fazer backup
BACKUP_FILE="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
echo "📋 Fazendo backup: $BACKUP_FILE"
sudo cp "$NGINX_CONFIG" "$BACKUP_FILE"

echo ""
echo "🔍 Verificando configuração atual..."
echo ""

# Verificar se já tem as configurações
if grep -q "proxy_buffer_size" "$NGINX_CONFIG"; then
    echo "⚠️  Configuração de buffers já existe. Atualizando..."
else
    echo "➕ Adicionando configurações de buffers..."
fi

# Criar arquivo temporário com as correções
TEMP_FILE=$(mktemp)

# Ler arquivo atual e adicionar/modificar configurações
sudo sed -E '
# Substituir localhost por 127.0.0.1 (forçar IPv4)
s|proxy_pass http://localhost:3000|proxy_pass http://127.0.0.1:3000|g
s|proxy_pass http://\[::1\]:3000|proxy_pass http://127.0.0.1:3000|g

# Adicionar configurações de buffer após proxy_pass (se não existirem)
/^[[:space:]]*proxy_pass/ {
    a\
        # Buffers para headers grandes (corrige erro "upstream sent too big header")\
        proxy_buffer_size 16k;\
        proxy_buffers 8 16k;\
        proxy_busy_buffers_size 32k;\
        large_client_header_buffers 4 32k;
}
' "$NGINX_CONFIG" > "$TEMP_FILE"

# Verificar se precisa adicionar manualmente (se sed não funcionou bem)
if ! grep -q "proxy_buffer_size" "$TEMP_FILE"; then
    echo "⚠️  Adicionando configurações manualmente..."
    
    # Ler arquivo e adicionar após proxy_pass
    sudo awk '
    {
        print
        if (/proxy_pass.*3000/ && !added) {
            print "        # Buffers para headers grandes (corrige erro \"upstream sent too big header\")"
            print "        proxy_buffer_size 16k;"
            print "        proxy_buffers 8 16k;"
            print "        proxy_busy_buffers_size 32k;"
            print "        large_client_header_buffers 4 32k;"
            added = 1
        }
    }
    ' "$NGINX_CONFIG" > "$TEMP_FILE"
fi

# Substituir localhost por 127.0.0.1
sudo sed -i 's|http://localhost:3000|http://127.0.0.1:3000|g' "$TEMP_FILE"
sudo sed -i 's|http://\[::1\]:3000|http://127.0.0.1:3000|g' "$TEMP_FILE"

# Aplicar mudanças
echo "📝 Aplicando mudanças..."
sudo cp "$TEMP_FILE" "$NGINX_CONFIG"
rm "$TEMP_FILE"

echo ""
echo "✅ Configuração atualizada!"
echo ""
echo "📋 Mudanças aplicadas:"
echo "   - proxy_buffer_size aumentado para 16k"
echo "   - proxy_buffers configurado (8 x 16k)"
echo "   - proxy_busy_buffers_size aumentado para 32k"
echo "   - large_client_header_buffers aumentado (4 x 32k)"
echo "   - proxy_pass alterado para usar 127.0.0.1 (IPv4)"
echo ""

# Testar configuração
echo "🔍 Testando configuração do Nginx..."
if sudo nginx -t; then
    echo ""
    echo "✅ Configuração válida!"
    echo ""
    echo "🔄 Recarregando Nginx..."
    sudo systemctl reload nginx
    echo ""
    echo "✅ Nginx recarregado com sucesso!"
    echo ""
    echo "🌐 Teste no navegador agora!"
    echo ""
else
    echo ""
    echo "❌ Erro na configuração!"
    echo "📋 Restaurando backup..."
    sudo cp "$BACKUP_FILE" "$NGINX_CONFIG"
    echo "✅ Backup restaurado"
    exit 1
fi

