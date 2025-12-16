# 🚀 Instalação Simples - Sistema Médico

**VPS Hostinger - Ubuntu 24.04 LTS**  
**IP:** 31.97.242.100  
**Usuário SSH:** root

## ✅ Recursos da VPS
- ✅ 4 CPU cores
- ✅ 16 GB RAM (excelente para múltiplos sistemas!)
- ✅ 200 GB disco
- ✅ Ubuntu 24.04 LTS

**Sim, você pode rodar vários sistemas aqui sem problemas!**

---

## 📋 Passo a Passo Completo

### 1. Conectar na VPS

```bash
ssh root@31.97.242.100
```

### 2. Criar Diretório do Sistema

```bash
# Criar diretório
mkdir -p /var/www/sistema-medico

# Entrar no diretório
cd /var/www/sistema-medico
```

### 3. Fazer Upload do Código

**Opção A: Via File Manager (Hostinger)**
1. Acesse o File Manager no painel Hostinger
2. Navegue até `/var/www/`
3. Crie pasta `sistema-medico`
4. Faça upload do código (compacte em ZIP primeiro, excluindo `node_modules` e `.next`)
5. Extraia o ZIP

**Opção B: Via Git (se tiver repositório)**
```bash
cd /var/www/sistema-medico
git clone seu-repositorio.git .
```

**Opção C: Via SCP (do seu Windows)**
```powershell
# No PowerShell do Windows
scp -r C:\Users\caval\OneDrive\Desktop\SistemaMédico\* root@31.97.242.100:/var/www/sistema-medico/
```

### 4. Instalar Node.js (se não tiver)

```bash
# Verificar se já tem Node.js
node --version

# Se não tiver, instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verificar instalação
node --version  # Deve mostrar v18.x ou superior
npm --version
```

### 5. Instalar Dependências

```bash
cd /var/www/sistema-medico
npm install
```

**Aguarde a instalação terminar (pode levar alguns minutos)**

### 6. Configurar Variáveis de Ambiente

```bash
cd /var/www/sistema-medico

# Copiar arquivo de exemplo
cp env.local.example .env.local

# Editar arquivo
nano .env.local
```

**Cole e configure estas variáveis:**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui

# URL da aplicação (use o domínio que você vai configurar)
NEXT_PUBLIC_APP_URL=https://sistema-medico.seu-dominio.com

# OpenAI
OPENAI_API_KEY=sua_chave_openai
OPENAI_MODEL=gpt-4o-mini

# Evolution API (WhatsApp)
NEXT_PUBLIC_EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua_api_key
EVOLUTION_INSTANCE_NAME=default

# Cron Secret (gerar com: openssl rand -base64 32)
CRON_SECRET_KEY=$(openssl rand -base64 32)

# Supabase Management API (opcional)
SUPABASE_ACCESS_TOKEN=sua_chave_access_token_aqui
NEXT_PUBLIC_SUPABASE_PROJECT_REF=seu_project_ref
```

**Salvar:** `Ctrl + X`, depois `Y`, depois `Enter`

### 7. Fazer Build do Projeto

```bash
cd /var/www/sistema-medico
npm run build
```

**Aguarde a conclusão (pode levar 2-5 minutos)**

### 8. Instalar PM2

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Verificar instalação
pm2 --version
```

### 9. Iniciar Sistema com PM2

```bash
cd /var/www/sistema-medico

# Iniciar usando o arquivo de configuração
pm2 start ecosystem.config.js

# OU iniciar manualmente
pm2 start node_modules/next/dist/bin/next --name sistema-medico -- start

# Salvar configuração
pm2 save

# Configurar para iniciar no boot
pm2 startup
# Execute o comando que aparecer (algo como: env PATH=...)
```

### 10. Verificar se Está Rodando

```bash
# Ver processos
pm2 list

# Ver logs
pm2 logs sistema-medico

# Ver status
pm2 status sistema-medico
```

**Deve aparecer:**
```
┌─────┬──────────────────┬─────────┬─────────┬──────────┐
│ id  │ name             │ status  │ restart │ uptime   │
├─────┼──────────────────┼─────────┼─────────┼──────────┤
│ 0   │ sistema-medico   │ online  │ 0       │ 10s      │
└─────┴──────────────────┴─────────┴─────────┴──────────┘
```

### 11. Testar Aplicação

```bash
# Testar se está respondendo
curl http://localhost:3000

# Se retornar HTML, está funcionando!
```

### 12. Configurar Nginx

```bash
# Criar arquivo de configuração
nano /etc/nginx/sites-available/sistema-medico
```

**Cole este conteúdo (ajuste o domínio):**
```nginx
server {
    listen 80;
    server_name sistema-medico.seu-dominio.com www.sistema-medico.seu-dominio.com;

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
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    client_max_body_size 50M;
}
```

**Salvar:** `Ctrl + X`, `Y`, `Enter`

**Ativar configuração:**
```bash
# Criar link simbólico
ln -s /etc/nginx/sites-available/sistema-medico /etc/nginx/sites-enabled/

# Testar configuração
nginx -t

# Se OK, recarregar Nginx
systemctl reload nginx
```

### 13. Configurar SSL (HTTPS)

```bash
# Instalar Certbot
apt install -y certbot python3-certbot-nginx

# Obter certificado SSL (substitua pelo seu domínio)
certbot --nginx -d sistema-medico.seu-dominio.com -d www.sistema-medico.seu-dominio.com

# Seguir as instruções do Certbot
```

### 14. Configurar Cron Job

```bash
# Editar crontab
crontab -e

# Adicionar esta linha (processar follow-ups a cada 5 minutos)
# Substitua SEU_CRON_SECRET_KEY pelo valor do CRON_SECRET_KEY do .env.local
*/5 * * * * curl -X POST http://localhost:3000/api/follow-up/process-scheduled -H "Authorization: Bearer SEU_CRON_SECRET_KEY" > /dev/null 2>&1

# Salvar: Ctrl + X, Y, Enter
```

---

## ✅ Verificação Final

```bash
# 1. Verificar PM2
pm2 list

# 2. Verificar Nginx
systemctl status nginx

# 3. Verificar portas
netstat -tulpn | grep 3000

# 4. Testar aplicação
curl http://localhost:3000
```

---

## 🔄 Comandos Úteis

### Reiniciar Sistema
```bash
pm2 restart sistema-medico
```

### Ver Logs
```bash
pm2 logs sistema-medico
```

### Parar Sistema
```bash
pm2 stop sistema-medico
```

### Iniciar Sistema
```bash
pm2 start sistema-medico
```

### Atualizar Código
```bash
cd /var/www/sistema-medico
# Se usar Git:
git pull
npm install
npm run build
pm2 restart sistema-medico
```

---

## ⚠️ Importante

- ✅ **Não mexe no n8n** - O sistema roda na porta 3000, n8n na 5678
- ✅ **Recursos suficientes** - 16GB RAM suporta vários sistemas
- ✅ **Isolado** - Cada sistema em seu próprio diretório
- ✅ **PM2 gerencia tudo** - Pode ver todos os processos com `pm2 list`

---

## 🚨 Problemas Comuns

### Erro: "Port 3000 already in use"
```bash
# Ver o que está usando
netstat -tulpn | grep 3000
# Matar processo se necessário
kill -9 <PID>
```

### Erro: "Permission denied"
```bash
chown -R root:root /var/www/sistema-medico
chmod -R 755 /var/www/sistema-medico
```

### Sistema não inicia
```bash
# Ver logs detalhados
pm2 logs sistema-medico --lines 100

# Verificar variáveis de ambiente
pm2 env sistema-medico
```

---

## 📞 Próximo Passo

Após instalação, configure o domínio seguindo o arquivo: **CONFIGURAR_DOMINIO.md**

