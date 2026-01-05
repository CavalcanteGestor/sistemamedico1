#!/bin/bash

# Script para Corrigir Problema de CPU do n8n
# Resolve processos task-runner que estão consumindo CPU excessivamente

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     🔧 CORREÇÃO DE CPU - n8n Task Runner                       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# 1. Identificar processos problemáticos
echo "1️⃣  Identificando processos @n8n/task-runner problemáticos..."
echo ""

TASK_RUNNER_PIDS=$(ps aux | grep "@n8n/task-runner" | grep -v grep | awk '{print $2}')

if [ -z "$TASK_RUNNER_PIDS" ]; then
    echo "   ✅ Nenhum processo task-runner encontrado"
else
    echo "   ⚠️  Processos task-runner encontrados:"
    ps aux | grep "@n8n/task-runner" | grep -v grep | awk '{printf "   PID: %-8s CPU: %6.1f%% MEM: %6.1f%%\n", $2, $3, $4}'
    echo ""
    
    # 2. Matar processos problemáticos
    echo "2️⃣  Encerrando processos problemáticos..."
    for PID in $TASK_RUNNER_PIDS; do
        CPU_USAGE=$(ps -p $PID -o %cpu --no-headers | tr -d ' ')
        if (( $(echo "$CPU_USAGE > 50" | bc -l) )); then
            echo "   🔴 Matando PID $PID (CPU: ${CPU_USAGE}%)"
            kill -9 $PID 2>/dev/null
        fi
    done
    echo "   ✅ Processos encerrados"
    echo ""
fi

# 3. Verificar se n8n está no PM2
echo "3️⃣  Verificando status do n8n..."
echo ""

if pm2 list | grep -q "n8n"; then
    echo "   ✅ n8n está gerenciado pelo PM2"
    echo "   🔄 Reiniciando n8n..."
    pm2 restart n8n
    echo "   ✅ n8n reiniciado"
else
    echo "   ⚠️  n8n NÃO está no PM2"
    echo "   🔍 Procurando processo n8n..."
    
    N8N_PID=$(ps aux | grep "n8n start" | grep -v grep | awk '{print $2}' | head -1)
    
    if [ -n "$N8N_PID" ]; then
        echo "   📦 Processo n8n encontrado (PID: $N8N_PID)"
        echo "   🔄 Reiniciando n8n..."
        kill $N8N_PID
        sleep 2
        # Tentar reiniciar (ajuste o caminho se necessário)
        nohup n8n start > /dev/null 2>&1 &
        echo "   ✅ n8n reiniciado"
    else
        echo "   ⚠️  Processo n8n não encontrado"
    fi
fi

echo ""

# 4. Aguardar estabilização
echo "4️⃣  Aguardando estabilização (5 segundos)..."
sleep 5
echo ""

# 5. Verificar CPU após correção
echo "5️⃣  Verificando CPU após correção..."
echo ""

CPU_IDLE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/")
CPU_USAGE=$(echo "100 - $CPU_IDLE" | bc -l | awk '{printf "%.1f", $1}')

if (( $(echo "$CPU_USAGE < 50" | bc -l) )); then
    echo "   🟢 CPU: ${CPU_USAGE}% - PROBLEMA RESOLVIDO!"
elif (( $(echo "$CPU_USAGE < 70" | bc -l) )); then
    echo "   🟡 CPU: ${CPU_USAGE}% - Melhorou, mas ainda alto"
else
    echo "   🔴 CPU: ${CPU_USAGE}% - Ainda alto, pode precisar de mais ações"
fi

echo ""

# 6. Verificar processos task-runner restantes
echo "6️⃣  Verificando processos task-runner restantes..."
echo ""

TASK_RUNNER_COUNT=$(ps aux | grep "@n8n/task-runner" | grep -v grep | wc -l)

if [ "$TASK_RUNNER_COUNT" -eq 0 ]; then
    echo "   ✅ Nenhum processo task-runner ativo"
else
    echo "   ⚠️  Ainda há $TASK_RUNNER_COUNT processo(s) task-runner"
    ps aux | grep "@n8n/task-runner" | grep -v grep | awk '{printf "   PID: %-8s CPU: %6.1f%%\n", $2, $3}'
fi

echo ""

# 7. Recomendações
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  📋 RECOMENDAÇÕES                                              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

if (( $(echo "$CPU_USAGE > 70" | bc -l) )); then
    echo "   ⚠️  CPU ainda está alta. Ações adicionais:"
    echo ""
    echo "   1. Verificar workflows do n8n em loop:"
    echo "      - Acesse o n8n: http://seu-ip:5678"
    echo "      - Verifique workflows ativos"
    echo "      - Desative workflows problemáticos"
    echo ""
    echo "   2. Limitar recursos do n8n no PM2:"
    echo "      pm2 restart n8n --max-memory-restart 1G"
    echo ""
    echo "   3. Reduzir concorrência do n8n:"
    echo "      - Edite variável N8N_CONCURRENCY=5 (ao invés de 10)"
    echo ""
else
    echo "   ✅ CPU normalizada!"
    echo ""
    echo "   Para prevenir problemas futuros:"
    echo ""
    echo "   1. Configure limites no PM2 para n8n"
    echo "   2. Monitore workflows do n8n regularmente"
    echo "   3. Use o script de análise: /root/analise-cpu-simples.sh"
    echo ""
fi

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ✅ Correção concluída                                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

