#!/bin/bash

# Script de Diagnóstico da VPS
# Use este script para identificar problemas de performance

echo "=========================================="
echo "🔍 DIAGNÓSTICO DA VPS - Sistema Lumi"
echo "=========================================="
echo "Data/Hora: $(date)"
echo ""

echo "=== 📊 USO DE CPU ==="
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print "  " 100 - $1"% em uso"}'
echo ""

echo "=== 💾 USO DE MEMÓRIA ==="
free -h | grep -E "Mem|Swap"
echo ""

echo "=== 💿 USO DE DISCO ==="
df -h | grep -E "Filesystem|/dev/"
echo ""

echo "=== 🔥 TOP 10 PROCESSOS POR CPU ==="
ps aux --sort=-%cpu | head -11 | awk '{printf "%-8s %-8s %6s %6s %s\n", $1, $2, $3"%", $4"%", $11}'
echo ""

echo "=== 🔥 TOP 10 PROCESSOS POR MEMÓRIA ==="
ps aux --sort=-%mem | head -11 | awk '{printf "%-8s %-8s %6s %6s %s\n", $1, $2, $3"%", $4"%", $11}'
echo ""

echo "=== 📦 PROCESSOS PM2 ==="
if command -v pm2 &> /dev/null; then
    pm2 list
    echo ""
    echo "Status detalhado:"
    pm2 jlist | jq -r '.[] | "\(.name): CPU=\(.monit.cpu)%, RAM=\(.monit.memory/1024/1024)MB, Status=\(.pm2_env.status)"' 2>/dev/null || echo "  (jq não instalado, use: pm2 list)"
else
    echo "  PM2 não está instalado"
fi
echo ""

echo "=== 🌐 PORTAS EM USO ==="
netstat -tulpn | grep LISTEN | awk '{print $4, $7}' | head -10
echo ""

echo "=== 🔄 PROCESSOS NODE.JS ==="
ps aux | grep node | grep -v grep | awk '{printf "%-8s %6s %6s %s\n", $2, $3"%", $4"%", $11}'
echo ""

echo "=== ⚠️  ALERTAS ==="
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')

if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
    echo "  ⚠️  CPU está em ${CPU_USAGE}% - ALTA UTILIZAÇÃO!"
fi

if (( $(echo "$MEM_USAGE > 80" | bc -l) )); then
    echo "  ⚠️  Memória está em ${MEM_USAGE}% - ALTA UTILIZAÇÃO!"
fi

if (( $(echo "$CPU_USAGE < 80" | bc -l) )) && (( $(echo "$MEM_USAGE < 80" | bc -l) )); then
    echo "  ✅ Recursos dentro do normal"
fi
echo ""

echo "=== 📋 RECOMENDAÇÕES ==="
if (( $(echo "$CPU_USAGE > 90" | bc -l) )); then
    echo "  🔴 CRÍTICO: CPU acima de 90%"
    echo "     - Verificar processos consumindo CPU"
    echo "     - Reiniciar serviços se necessário"
    echo "     - Considerar otimizar workflows do n8n"
fi

if (( $(echo "$CPU_USAGE > 70" | bc -l) )) && (( $(echo "$CPU_USAGE <= 90" | bc -l) )); then
    echo "  🟡 ATENÇÃO: CPU acima de 70%"
    echo "     - Monitorar processos"
    echo "     - Considerar otimizações"
fi

if (( $(echo "$CPU_USAGE <= 70" | bc -l) )); then
    echo "  ✅ CPU em níveis aceitáveis"
    echo "     - Pode adicionar novos sistemas com segurança"
fi
echo ""

echo "=========================================="
echo "✅ Diagnóstico concluído"
echo "=========================================="

