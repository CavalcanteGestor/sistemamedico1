# 🖥️ Guia: Rodar Múltiplos Sistemas na Mesma VPS

## 📊 Análise da Sua VPS

**Especificações Atuais:**
- **Plano:** KVM 4
- **CPU:** 4 vCPU cores
- **RAM:** 16 GB
- **Disco:** 200 GB NVMe
- **Bandwidth:** 16 TB

**Status Atual (Preocupante!):**
- ⚠️ **CPU Usage: 99%** - Isso está causando travamentos!
- ✅ **Memory Usage: 14%** - RAM está ok
- ✅ **Disk Usage: 23 GB / 200 GB** - Espaço em disco ok

## ⚠️ Problema Identificado

O **n8n está travado** porque a **CPU está em 99%**. Isso indica que:
1. O sistema está sobrecarregado
2. Pode haver processos consumindo muitos recursos
3. Precisa otimizar antes de adicionar mais sistemas

## ✅ É Possível Rodar Múltiplos Sistemas?

**SIM**, mas com algumas considerações:

### Recursos Necessários por Sistema

**Sistema Lumi (Next.js):**
- CPU: ~0.5-1 core (em uso normal)
- RAM: ~500MB-1GB (em uso normal)
- Disco: ~2-5 GB (código + node_modules)

**n8n:**
- CPU: ~0.5-1 core (depende dos workflows)
- RAM: ~500MB-1GB
- Disco: ~1-2 GB

**Total Estimado:**
- CPU: 1-2 cores (uso normal)
- RAM: 1-2 GB (uso normal)
- Disco: 3-7 GB

**Sua VPS tem:**
- CPU: 4 cores ✅ (suficiente)
- RAM: 16 GB ✅ (mais que suficiente)
- Disco: 200 GB ✅ (mais que suficiente)

## 🔧 Solução: Otimizar e Gerenciar Recursos

### 1. Diagnosticar o Problema Atual

```bash
# Conectar ao VPS
ssh root@31.97.242.100

# Ver processos consumindo CPU
top
# ou
htop  # (se instalado)

# Ver processos do Node.js
ps aux | grep node

# Ver uso de memória
free -h

# Ver processos do PM2
pm2 list
pm2 monit
```

### 2. Otimizar n8n

```bash
# Verificar status do n8n
pm2 status

# Ver logs do n8n
pm2 logs n8n --lines 50

# Reiniciar n8n
pm2 restart n8n

# Se necessário, limitar recursos do n8n
pm2 restart n8n --max-memory-restart 1G
```

### 3. Configurar PM2 para Múltiplos Sistemas

Crie um arquivo `ecosystem.config.js` atualizado:

```javascript
module.exports = {
  apps: [
    {
      name: 'lumi-sistema-medico',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/sistema-medico',
      instances: 1, // Apenas 1 instância para economizar recursos
      exec_mode: 'fork',
      max_memory_restart: '1G', // Reiniciar se passar de 1GB
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/lumi-error.log',
      out_file: '/var/log/pm2/lumi-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
    },
    {
      name: 'n8n',
      script: 'n8n',
      cwd: '/root/.n8n', // ou onde o n8n está instalado
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1G', // Limitar memória do n8n
      env: {
        NODE_ENV: 'production',
        N8N_PORT: 5678,
        N8N_HOST: '0.0.0.0',
      },
      error_file: '/var/log/pm2/n8n-error.log',
      out_file: '/var/log/pm2/n8n-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
}
```

### 4. Configurar Nginx para Múltiplos Sistemas

```nginx
# /etc/nginx/sites-available/lumi
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com www.seu-dominio.com;

    ssl_certificate /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# /etc/nginx/sites-available/n8n
server {
    listen 80;
    server_name n8n.seu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name n8n.seu-dominio.com;

    ssl_certificate /etc/letsencrypt/live/n8n.seu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/n8n.seu-dominio.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. Limitar Recursos com systemd (Alternativa)

Se preferir usar systemd ao invés de PM2:

```bash
# Criar service para Lumi
sudo nano /etc/systemd/system/lumi.service
```

```ini
[Unit]
Description=Lumi Sistema Médico
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/sistema-medico
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Limitar recursos
MemoryLimit=1G
CPUQuota=50%  # Máximo 50% de 1 core

[Install]
WantedBy=multi-user.target
```

## 🚨 Ações Imediatas para Resolver o Travamento

### 1. Reiniciar n8n

```bash
# Conectar ao VPS
ssh root@31.97.242.100

# Ver processos
pm2 list

# Reiniciar n8n
pm2 restart n8n

# Se não estiver no PM2, verificar se está rodando
ps aux | grep n8n

# Se estiver rodando diretamente, matar e reiniciar
pkill -f n8n
cd /caminho/do/n8n
n8n start
```

### 2. Verificar o que está consumindo CPU

```bash
# Ver top 10 processos consumindo CPU
ps aux --sort=-%cpu | head -11

# Ver processos do Node.js
ps aux | grep node

# Ver uso de recursos em tempo real
htop  # ou instalar: apt install htop
```

### 3. Limpar Processos Órfãos

```bash
# Ver processos zumbi
ps aux | grep defunct

# Limpar logs antigos (pode ajudar)
pm2 flush

# Limpar cache do npm (se necessário)
npm cache clean --force
```

## 📈 Monitoramento Contínuo

### Script de Monitoramento

Crie `/root/monitor-resources.sh`:

```bash
#!/bin/bash

echo "=== Monitoramento de Recursos ==="
echo "Data: $(date)"
echo ""
echo "=== CPU ==="
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print "CPU Usage: " 100 - $1"%"}'
echo ""
echo "=== Memória ==="
free -h
echo ""
echo "=== Disco ==="
df -h
echo ""
echo "=== Processos PM2 ==="
pm2 list
echo ""
echo "=== Top 5 Processos por CPU ==="
ps aux --sort=-%cpu | head -6
```

Tornar executável:
```bash
chmod +x /root/monitor-resources.sh
```

Executar periodicamente:
```bash
# Adicionar ao crontab (crontab -e)
*/5 * * * * /root/monitor-resources.sh >> /var/log/resource-monitor.log 2>&1
```

## ✅ Checklist para Adicionar Novo Sistema

- [ ] Verificar uso atual de recursos (CPU < 70%, RAM < 50%)
- [ ] Otimizar sistemas existentes
- [ ] Configurar PM2 com limites de recursos
- [ ] Configurar Nginx com subdomínios diferentes
- [ ] Configurar SSL para cada subdomínio
- [ ] Testar cada sistema individualmente
- [ ] Monitorar recursos após adicionar novo sistema
- [ ] Configurar alertas de uso de recursos

## 🎯 Recomendações

### Para Múltiplos Sistemas na Mesma VPS:

1. **Use PM2** para gerenciar todos os processos Node.js
2. **Configure limites de memória** para cada aplicação
3. **Use subdomínios diferentes** para cada sistema
4. **Monitore recursos regularmente**
5. **Configure alertas** quando CPU > 80% ou RAM > 80%

### Se CPU Continuar Alta:

1. **Verificar workflows do n8n** - podem estar em loop
2. **Otimizar queries do banco** - queries lentas consomem CPU
3. **Considerar upgrade** se realmente necessário
4. **Usar cache** (Redis) para reduzir carga
5. **Otimizar build do Next.js** - usar modo estático quando possível

## 🔄 Próximos Passos

1. **Agora:** Reiniciar n8n e verificar o que está consumindo CPU
2. **Depois:** Otimizar configurações do PM2
3. **Em seguida:** Adicionar o sistema Lumi com limites de recursos
4. **Continuamente:** Monitorar uso de recursos

## 📝 Comandos Úteis

```bash
# Ver todos os processos PM2
pm2 list

# Ver uso de recursos em tempo real
pm2 monit

# Reiniciar todos os processos
pm2 restart all

# Parar todos os processos
pm2 stop all

# Ver logs de todos
pm2 logs

# Salvar configuração atual do PM2
pm2 save

# Configurar PM2 para iniciar no boot
pm2 startup
pm2 save
```

