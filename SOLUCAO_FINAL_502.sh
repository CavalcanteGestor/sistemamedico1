#!/bin/bash

# Solução final para 502 Bad Gateway
# A aplicação está rodando, só precisa recarregar o Nginx

echo "✅ Aplicação está rodando! Recarregando Nginx..."
echo ""

# 1. Verificar se build existe
cd /var/www/sistema-medico
if [ -f .next/BUILD_ID ]; then
    echo "✅ Build encontrado"
else
    echo "❌ Build não encontrado! Execute: npm run build"
    exit 1
fi

# 2. Verificar se aplicação está respondendo
echo "🔍 Testando aplicação..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Aplicação está respondendo em http://localhost:3000"
else
    echo "❌ Aplicação não está respondendo"
    echo "📋 Verificando logs..."
    pm2 logs sistema-medico --lines 20 --nostream
    exit 1
fi

# 3. Verificar configuração do Nginx
echo ""
echo "🔍 Verificando configuração do Nginx..."
if sudo nginx -t; then
    echo "✅ Configuração do Nginx está OK"
else
    echo "❌ Erro na configuração do Nginx!"
    exit 1
fi

# 4. Recarregar Nginx
echo ""
echo "🔄 Recarregando Nginx..."
sudo systemctl reload nginx

# Aguardar alguns segundos
sleep 3

# 5. Verificar status
echo ""
echo "📊 Status final:"
pm2 status
echo ""
echo "✅ Nginx recarregado!"
echo ""
echo "🌐 Teste no navegador: http://mercuri.ialumi.cloud"
echo ""

