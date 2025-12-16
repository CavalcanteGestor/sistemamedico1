# 🚀 Guia: Deploy Sistema Médico na VPS com n8n

Este guia explica como configurar o Sistema Médico na mesma VPS onde já está rodando o n8n.

## ✅ Compatibilidade

**Não há problema em rodar ambos na mesma VPS!** Eles usam portas diferentes e podem coexistir perfeitamente.

### Portas Padrão:
- **n8n**: Porta `5678` (ou outra configurada)
- **Sistema Médico**: Porta `3000`
- **Nginx**: Porta `80` (HTTP) e `443` (HTTPS)

## 📋 Pré-requisitos

- ✅ VPS com n8n já instalado e funcionando
- ✅ Node.js 18+ instalado (necessário para ambos)
- ✅ Nginx instalado (para proxy reverso)
- ✅ PM2 instalado (para gerenciar processos)

## 🔧 Passo a Passo

### 1. Verificar Recursos da VPS

```bash
# Verificar uso de memória
free -h

# Verificar uso de CPU
top

# Verificar processos PM2
pm2 list
```

**Recomendações de recursos:**
- **Mínimo**: 2GB RAM, 2 vCPU
- **Recomendado**: 4GB RAM, 4 vCPU
- **Ideal**: 8GB RAM, 4+ vCPU

### 2. Verificar Portas em Uso

```bash
# Verificar portas ocupadas
sudo netstat -tulpn | grep LISTEN
# ou
sudo ss -tulpn | grep LISTEN
```

**Verificar se as portas estão livres:**
- Porta `3000` (Sistema Médico)
- Porta `5678` (n8n - já deve estar em uso)

### 3. Preparar Diretório do Sistema Médico

```bash
# Criar diretório para o sistema médico
sudo mkdir -p /var/www/sistema-medico
sudo chown -R $USER:$USER /var/www/sistema-medico
cd /var/www/sistema-medico

# Clonar repositório (ou fazer upload do código)
git clone <seu-repositorio> .
# OU fazer upload via SCP/SFTP
```

### 4. Instalar Dependências

```bash
cd /var/www/sistema-medico
npm install
```

### 5. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp env.local.example .env.local

# Editar com suas credenciais
nano .env.local
```

**Configure todas as variáveis necessárias:**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui

# URL da aplicação (IMPORTANTE: use HTTPS em produção)
NEXT_PUBLIC_APP_URL=https://sistema-medico.seu-dominio.com

# OpenAI (para IA - resumos e mensagens)
OPENAI_API_KEY=sua_chave_openai
OPENAI_MODEL=gpt-4o-mini

# Evolution API (WhatsApp)
NEXT_PUBLIC_EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua_api_key
EVOLUTION_INSTANCE_NAME=default

# Cron Secret (gerar com: openssl rand -base64 32)
CRON_SECRET_KEY=sua_chave_secreta_forte_aqui

# Supabase Management API (opcional)
SUPABASE_ACCESS_TOKEN=sua_chave_access_token_aqui
NEXT_PUBLIC_SUPABASE_PROJECT_REF=seu_project_ref
```

### 6. Build do Projeto

```bash
cd /var/www/sistema-medico
npm run build
```

### 7. Configurar PM2

```bash
cd /var/www/sistema-medico

# Iniciar com PM2 usando o arquivo de configuração
pm2 start ecosystem.config.js

# OU iniciar manualmente
pm2 start node_modules/next/dist/bin/next --name sistema-medico -- start

# Salvar configuração do PM2
pm2 save

# Configurar PM2 para iniciar no boot
pm2 startup
```

**Verificar processos:**
```bash
pm2 list
# Deve mostrar:
# - n8n (se estiver rodando via PM2)
# - sistema-medico
```

### 8. Configurar Nginx para Múltiplos Serviços

O Nginx precisa ser configurado para rotear requisições para ambos os serviços baseado no domínio ou subdomínio.

#### Opção A: Subdomínios (Recomendado)

**n8n**: `n8n.seu-dominio.com` → Porta 5678  
**Sistema Médico**: `sistema.seu-dominio.com` → Porta 3000

**Criar configuração para Sistema Médico:**
```bash
sudo nano /etc/nginx/sites-available/sistema-medico
```

**Conteúdo:**
```nginx
server {
    listen 80;
    server_name sistema.seu-dominio.com www.sistema.seu-dominio.com;

    # Redirecionar HTTP para HTTPS (descomente após configurar SSL)
    # return 301 https://$server_name$request_uri;

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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Limite de tamanho de upload
    client_max_body_size 50M;
}
```

**Ativar configuração:**
```bash
sudo ln -s /etc/nginx/sites-available/sistema-medico /etc/nginx/sites-enabled/
sudo nginx -t  # Testar configuração
sudo systemctl reload nginx
```

#### Opção B: Caminhos (Paths)

**n8n**: `seu-dominio.com/n8n` → Porta 5678  
**Sistema Médico**: `seu-dominio.com` → Porta 3000

**Configuração Nginx:**
```nginx
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;

    # Sistema Médico (rota principal)
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

    # n8n (subcaminho)
    location /n8n/ {
        proxy_pass http://localhost:5678/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 50M;
}
```

### 9. Configurar SSL (HTTPS) com Certbot

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado para Sistema Médico
sudo certbot --nginx -d sistema.seu-dominio.com -d www.sistema.seu-dominio.com

# Renovação automática (já configurada pelo Certbot)
sudo certbot renew --dry-run
```

### 10. Configurar Cron Jobs

```bash
# Editar crontab
crontab -e

# Adicionar linha para processar follow-ups agendados (a cada 5 minutos)
*/5 * * * * curl -X POST http://localhost:3000/api/follow-up/process-scheduled -H "Authorization: Bearer SEU_CRON_SECRET_KEY" > /dev/null 2>&1

# OU usar wget
*/5 * * * * wget -q -O - --post-data="" --header="Authorization: Bearer SEU_CRON_SECRET_KEY" http://localhost:3000/api/follow-up/process-scheduled > /dev/null 2>&1
```

**Substitua `SEU_CRON_SECRET_KEY` pelo valor de `CRON_SECRET_KEY` do `.env.local`**

### 11. Verificar Funcionamento

```bash
# Verificar processos PM2
pm2 list
pm2 logs sistema-medico

# Verificar Nginx
sudo systemctl status nginx
sudo nginx -t

# Verificar portas
sudo netstat -tulpn | grep -E '3000|5678'

# Testar aplicação
curl http://localhost:3000
```

## 🔍 Monitoramento

### Verificar Uso de Recursos

```bash
# Ver processos PM2
pm2 monit

# Ver uso de memória e CPU
pm2 list
pm2 info sistema-medico
pm2 info n8n
```

### Logs

```bash
# Logs do Sistema Médico
pm2 logs sistema-medico

# Logs do n8n (se estiver via PM2)
pm2 logs n8n

# Logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## ⚠️ Considerações Importantes

### 1. Recursos do Servidor
- **n8n** pode consumir bastante memória, especialmente com workflows complexos
- **Sistema Médico** também precisa de memória para o Next.js
- Monitore o uso de recursos regularmente

### 2. Variáveis de Ambiente
- Mantenha `.env.local` do Sistema Médico separado das configurações do n8n
- Não compartilhe variáveis sensíveis entre os serviços

### 3. Backup
- Faça backup regular de ambos os sistemas
- Backup do banco de dados Supabase (Sistema Médico)
- Backup das configurações do n8n

### 4. Segurança
- Use HTTPS para ambos os serviços
- Mantenha Node.js e dependências atualizadas
- Configure firewall adequadamente

## 🚨 Troubleshooting

### Porta 3000 já em uso
```bash
# Verificar o que está usando a porta
sudo lsof -i :3000

# Matar processo se necessário
sudo kill -9 <PID>

# OU mudar porta no ecosystem.config.js
```

### Conflito de memória
```bash
# Limitar memória do Sistema Médico no PM2
pm2 restart sistema-medico --max-memory-restart 512M

# Verificar uso
pm2 list
```

### Nginx não roteia corretamente
```bash
# Testar configuração
sudo nginx -t

# Recarregar configuração
sudo systemctl reload nginx

# Ver logs de erro
sudo tail -f /var/log/nginx/error.log
```

## ✅ Checklist Final

- [ ] Sistema Médico rodando na porta 3000
- [ ] n8n rodando na porta 5678 (ou configurada)
- [ ] Nginx configurado e roteando corretamente
- [ ] SSL/HTTPS configurado
- [ ] PM2 gerenciando ambos os processos
- [ ] Cron jobs configurados
- [ ] Variáveis de ambiente configuradas
- [ ] Logs funcionando
- [ ] Monitoramento ativo

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs: `pm2 logs sistema-medico`
2. Verifique o status do Nginx: `sudo systemctl status nginx`
3. Verifique recursos: `pm2 monit`
4. Teste localmente: `curl http://localhost:3000`


