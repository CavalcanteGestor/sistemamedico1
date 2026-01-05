# 🔧 Solução: n8n Consumindo CPU Excessivamente

## 🔴 Problema Identificado

**CPU em 94.9% - CRÍTICO!**

**Causa:** Processos `@n8n/task-runner` estão consumindo CPU excessivamente:
- PID 14416: **255.0% CPU** (mais de 2 cores!)
- PID 14402: **110.0% CPU** (mais de 1 core!)

Esses são processos filhos do n8n que executam tarefas. Quando ficam em loop ou processam algo muito pesado, consomem toda a CPU.

## ✅ Solução Imediata

### Opção 1: Usar Script Automático (Recomendado)

```bash
# Baixar script de correção
cd /var/www
git clone https://github.com/CavalcanteGestor/sistemamedico1.git temp-fix
cp temp-fix/scripts/corrigir-n8n-cpu.sh /root/
chmod +x /root/corrigir-n8n-cpu.sh

# Executar correção
/root/corrigir-n8n-cpu.sh
```

### Opção 2: Correção Manual

```bash
# 1. Matar processos task-runner problemáticos
ps aux | grep "@n8n/task-runner" | grep -v grep | awk '{if($3>50) print $2}' | xargs kill -9

# 2. Reiniciar n8n
pm2 restart n8n
# ou se não estiver no PM2:
pkill -f "n8n start"
n8n start &

# 3. Verificar CPU após 10 segundos
sleep 10
top -bn1 | grep "Cpu(s)"
```

## 🔍 Verificar o que Causou

### 1. Verificar Workflows do n8n

Acesse o n8n e verifique:
- Workflows que estão executando constantemente
- Workflows em loop
- Workflows processando muitos dados

### 2. Verificar Logs do n8n

```bash
# Se estiver no PM2
pm2 logs n8n --lines 50

# Ou verificar logs do sistema
journalctl -u n8n -n 50
```

## 🛡️ Prevenir Problemas Futuros

### 1. Configurar Limites no PM2

Crie/edite `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'n8n',
      script: 'n8n',
      max_memory_restart: '1G', // Reiniciar se passar de 1GB
      env: {
        NODE_ENV: 'production',
        N8N_PORT: 5678,
        N8N_CONCURRENCY: 5, // Reduzir de 10 para 5
      },
    },
  ],
}
```

Depois:
```bash
pm2 delete n8n
pm2 start ecosystem.config.js
pm2 save
```

### 2. Reduzir Concorrência do n8n

O n8n está rodando com `--concurrency=10`, o que pode ser muito. Reduza para 5:

```bash
# Editar comando do n8n para usar menos workers
# Ou configurar variável de ambiente
export N8N_CONCURRENCY=5
```

### 3. Monitorar Regularmente

Execute o script de análise periodicamente:

```bash
# Adicionar ao crontab (crontab -e)
*/15 * * * * /root/analise-cpu-simples.sh >> /var/log/cpu-monitor.log 2>&1
```

## 📊 Status Atual do Sistema

**Bom:**
- ✅ Sistema Lumi (Next.js): **11.7% CPU** - Normal
- ✅ Memória: **16.7%** - Excelente
- ✅ PM2 gerenciando sistema-medico corretamente

**Problema:**
- 🔴 n8n task-runner: **255% + 110% CPU** - CRÍTICO
- 🔴 n8n start: **17.2% CPU** - Alto mas aceitável

## 🎯 Próximos Passos

1. **Agora:** Execute o script de correção
2. **Depois:** Verifique workflows do n8n
3. **Em seguida:** Configure limites no PM2
4. **Continuamente:** Monitore CPU regularmente

## 💡 Dica

Se o problema persistir após reiniciar, pode ser um workflow específico do n8n que está em loop. Nesse caso:
1. Acesse o n8n
2. Desative todos os workflows
3. Reative um por vez para identificar o problemático

