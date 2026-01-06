#!/bin/bash

# Script para diagnosticar e corrigir erro 502 Bad Gateway

echo "🔍 Diagnosticando erro 502 Bad Gateway..."
echo ""

cd /var/www/sistema-medico || exit 1

# 1. Verificar status do PM2
echo "1️⃣ Verificando status do PM2..."
pm2 status
echo ""

# 2. Testar se aplicação responde localmente
echo "2️⃣ Testando se aplicação responde na porta 3000..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Aplicação está respondendo em http://localhost:3000"
    curl -I http://localhost:3000 | head -5
else
    echo "❌ Aplicação NÃO está respondendo em http://localhost:3000"
    echo "📋 Verificando logs do PM2..."
    pm2 logs sistema-medico --lines 30 --nostream
fi
echo ""

# 3. Verificar processos na porta 3000
echo "3️⃣ Verificando processos na porta 3000..."
lsof -i :3000 || echo "⚠️  Nenhum processo encontrado na porta 3000"
echo ""

# 4. Verificar configuração do Nginx
echo "4️⃣ Verificando configuração do Nginx..."
if [ -f /etc/nginx/sites-available/sistema-medico ]; then
    echo "✅ Arquivo de configuração encontrado: /etc/nginx/sites-available/sistema-medico"
    echo "📋 Verificando se está habilitado..."
    if [ -L /etc/nginx/sites-enabled/sistema-medico ]; then
        echo "✅ Configuração está habilitada"
    else
        echo "⚠️  Configuração NÃO está habilitada!"
        echo "   Execute: sudo ln -s /etc/nginx/sites-available/sistema-medico /etc/nginx/sites-enabled/"
    fi
elif [ -f /etc/nginx/sites-available/default ]; then
    echo "⚠️  Usando configuração default do Nginx"
    echo "📋 Verificando proxy_pass..."
    if grep -q "proxy_pass.*localhost:3000" /etc/nginx/sites-available/default; then
        echo "✅ proxy_pass configurado corretamente"
    else
        echo "❌ proxy_pass NÃO configurado!"
    fi
else
    echo "❌ Nenhuma configuração do Nginx encontrada!"
fi
echo ""

# 5. Testar configuração do Nginx
echo "5️⃣ Testando configuração do Nginx..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "✅ Configuração do Nginx está OK"
else
    echo "❌ Erro na configuração do Nginx:"
    sudo nginx -t
fi
echo ""

# 6. Verificar logs do Nginx
echo "6️⃣ Últimos erros do Nginx..."
sudo tail -n 20 /var/log/nginx/error.log | grep -i "502\|error\|failed" || echo "   Nenhum erro recente encontrado"
echo ""

# 7. Verificar se Nginx está rodando
echo "7️⃣ Verificando status do Nginx..."
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx está rodando"
else
    echo "❌ Nginx NÃO está rodando!"
    echo "   Execute: sudo systemctl start nginx"
fi
echo ""

# 8. Resumo e recomendações
echo "═══════════════════════════════════════"
echo "📊 Resumo e Recomendações"
echo "═══════════════════════════════════════"
echo ""

# Verificar se aplicação responde
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Aplicação está OK"
    echo ""
    echo "🔧 Próximos passos:"
    echo "   1. Verifique se Nginx está configurado corretamente"
    echo "   2. Recarregue o Nginx: sudo systemctl reload nginx"
    echo "   3. Teste novamente no navegador"
else
    echo "❌ Aplicação NÃO está respondendo"
    echo ""
    echo "🔧 Próximos passos:"
    echo "   1. Verifique logs: pm2 logs sistema-medico"
    echo "   2. Reinicie o PM2: pm2 restart sistema-medico"
    echo "   3. Aguarde alguns segundos e teste: curl http://localhost:3000"
fi
echo ""

