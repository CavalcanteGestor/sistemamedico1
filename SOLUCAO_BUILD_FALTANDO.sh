#!/bin/bash

# Solução para erro: "Could not find a production build in the '.next' directory"
# O PM2 está tentando iniciar sem build completo

set -e

echo "🛑 Parando PM2 que está em loop..."
cd /var/www/sistema-medico

# Parar TODOS os processos PM2 relacionados
pm2 delete sistema-medico 2>/dev/null || true
pm2 kill 2>/dev/null || true
sleep 3

# Verificar se ainda há processos Node rodando na porta 3000
echo "🔍 Verificando processos na porta 3000..."
PORT_PID=$(lsof -ti:3000 2>/dev/null || true)
if [ ! -z "$PORT_PID" ]; then
    echo "⚠️  Matando processo na porta 3000 (PID: $PORT_PID)"
    kill -9 $PORT_PID 2>/dev/null || true
    sleep 2
fi

echo "✅ PM2 parado completamente"
echo ""

# Verificar se .env.local existe
if [ ! -f .env.local ]; then
    echo "❌ ERRO: Arquivo .env.local não encontrado!"
    exit 1
fi

# Limpar qualquer build parcial
echo "🧹 Limpando builds parciais..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo

echo ""
echo "🔨 Iniciando build de produção..."
echo "   ⏳ Isso pode levar 3-10 minutos. NÃO INTERROMPA!"
echo "   ⏳ Aguarde até ver '✓ Compiled successfully'"
echo ""

# Fazer build
npm run build

# Verificar se build foi criado
if [ ! -d ".next" ] || [ ! -f ".next/BUILD_ID" ]; then
    echo ""
    echo "❌ ERRO: Build não foi criado corretamente!"
    echo "📋 Tentando build alternativo com webpack..."
    
    rm -rf .next
    npm run build:webpack
    
    if [ ! -d ".next" ] || [ ! -f ".next/BUILD_ID" ]; then
        echo "❌ Build falhou mesmo com webpack!"
        exit 1
    fi
fi

echo ""
echo "✅ Build concluído com sucesso!"
echo ""

# Reiniciar PM2
echo "🚀 Iniciando PM2..."
pm2 start ecosystem.config.js

# Aguardar
sleep 5

# Verificar status
echo ""
echo "📊 Status do PM2:"
pm2 status

# Mostrar logs
echo ""
echo "📋 Últimos logs (aguarde 10 segundos)..."
sleep 10
pm2 logs sistema-medico --lines 20 --nostream

echo ""
echo "✅ Processo concluído!"
echo ""
echo "Se o status estiver 'online' (verde), está funcionando! 🎉"

