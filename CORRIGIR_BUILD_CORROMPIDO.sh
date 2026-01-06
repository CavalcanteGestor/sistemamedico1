#!/bin/bash

# Script para corrigir build corrompido do Next.js
# Erro: Expected clientReferenceManifest to be defined

echo "🔧 Iniciando correção do build corrompido..."
echo ""

# Ir para o diretório do projeto
cd /var/www/sistema-medico || exit 1

# 1. Parar o processo PM2
echo "1️⃣ Parando processo PM2..."
pm2 delete sistema-medico 2>/dev/null || true
sleep 2

# 2. Limpar build corrompido
echo "2️⃣ Limpando build corrompido..."
rm -rf .next
rm -rf .next/cache
rm -rf node_modules/.cache
rm -rf .turbo

# 3. Limpar cache do npm
echo "3️⃣ Limpando cache do npm..."
npm cache clean --force

# 4. Verificar se .env.local existe
echo "4️⃣ Verificando variáveis de ambiente..."
if [ ! -f .env.local ]; then
    echo "⚠️  AVISO: Arquivo .env.local não encontrado!"
    echo "⚠️  Criando a partir do exemplo..."
    if [ -f env.local.example ]; then
        cp env.local.example .env.local
        echo "⚠️  CONFIGURE O ARQUIVO .env.local ANTES DE CONTINUAR!"
        echo "⚠️  Execute: nano .env.local"
        exit 1
    else
        echo "❌ Arquivo env.local.example não encontrado!"
        exit 1
    fi
fi

# 5. Verificar Node.js
echo "5️⃣ Verificando Node.js..."
node_version=$(node -v)
echo "   Node.js: $node_version"

# 6. Reinstalar dependências (se necessário)
echo "6️⃣ Verificando dependências..."
if [ ! -d "node_modules" ] || [ ! -f "node_modules/next/package.json" ]; then
    echo "   Reinstalando dependências..."
    npm install
else
    echo "   Dependências OK"
fi

# 7. Fazer build limpo
echo "7️⃣ Fazendo build limpo (isso pode levar alguns minutos)..."
NODE_ENV=production npm run build

# Verificar se build foi bem-sucedido
if [ ! -d ".next" ]; then
    echo "❌ Build falhou! Verifique os erros acima."
    exit 1
fi

# Verificar se os arquivos críticos existem
if [ ! -f ".next/BUILD_ID" ]; then
    echo "❌ Build incompleto! Arquivo BUILD_ID não encontrado."
    exit 1
fi

echo "✅ Build concluído com sucesso!"

# 8. Iniciar com PM2
echo "8️⃣ Iniciando com PM2..."
pm2 start ecosystem.config.js

# Aguardar alguns segundos
sleep 5

# 9. Verificar status
echo "9️⃣ Verificando status..."
pm2 status

# 10. Mostrar logs
echo ""
echo "📋 Últimos logs (aguarde 10 segundos para ver se há erros)..."
sleep 10
pm2 logs sistema-medico --lines 30 --nostream

echo ""
echo "✅ Processo concluído!"
echo ""
echo "Para monitorar em tempo real:"
echo "  pm2 logs sistema-medico"
echo ""
echo "Para verificar status:"
echo "  pm2 status"
echo ""

