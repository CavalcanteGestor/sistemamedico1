#!/bin/bash

# Script para fazer build completo do Next.js
# Aguarda o build terminar completamente antes de iniciar PM2

set -e  # Parar em caso de erro

echo "🔨 Iniciando build completo do sistema..."
echo ""

cd /var/www/sistema-medico || exit 1

# Verificar se .env.local existe
if [ ! -f .env.local ]; then
    echo "❌ ERRO: Arquivo .env.local não encontrado!"
    echo "⚠️  Crie o arquivo .env.local antes de continuar"
    exit 1
fi

# Parar PM2 se estiver rodando
echo "1️⃣ Parando processos PM2..."
pm2 delete sistema-medico 2>/dev/null || true
sleep 2

# Limpar builds anteriores
echo "2️⃣ Limpando builds anteriores..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo

# Fazer build (pode demorar 3-10 minutos)
echo "3️⃣ Fazendo build de produção..."
echo "   ⏳ Isso pode levar alguns minutos. Aguarde..."
echo "   ⏳ NÃO INTERROMPA O PROCESSO (Ctrl+C)!"
echo ""

# Tentar build normal primeiro
if npm run build; then
    echo ""
    echo "✅ Build concluído com sucesso!"
else
    echo ""
    echo "⚠️  Build normal falhou, tentando com webpack..."
    echo "   (Isso pode ser mais lento, mas mais estável)"
    
    # Limpar novamente
    rm -rf .next
    
    # Tentar build com webpack (mais estável, mas mais lento)
    if npm run build:webpack; then
        echo ""
        echo "✅ Build com webpack concluído com sucesso!"
    else
        echo ""
        echo "❌ Build falhou mesmo com webpack!"
        echo "📋 Verifique os erros acima"
        exit 1
    fi
fi

# Verificar se build foi criado
if [ ! -d ".next" ]; then
    echo "❌ ERRO: Pasta .next não foi criada!"
    exit 1
fi

if [ ! -f ".next/BUILD_ID" ]; then
    echo "❌ ERRO: Build incompleto! BUILD_ID não encontrado."
    exit 1
fi

echo ""
echo "4️⃣ Iniciando aplicação com PM2..."
pm2 start ecosystem.config.js

# Aguardar alguns segundos
sleep 5

# Verificar status
echo ""
echo "5️⃣ Verificando status..."
pm2 status

# Mostrar logs iniciais
echo ""
echo "6️⃣ Últimos logs (aguarde 10 segundos para ver se há erros)..."
sleep 10
pm2 logs sistema-medico --lines 30 --nostream

echo ""
echo "✅ Processo concluído!"
echo ""
echo "📊 Para monitorar:"
echo "   pm2 logs sistema-medico"
echo ""
echo "📊 Para ver status:"
echo "   pm2 status"
echo ""

