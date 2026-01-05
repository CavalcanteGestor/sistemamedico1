# 🚀 Configuração Completa para Produção - Sistema Lumi

Este guia detalha todas as configurações necessárias para colocar o sistema Lumi em produção de forma segura.

## 📋 Checklist Pré-Deploy

### 1. Variáveis de Ambiente

Crie o arquivo `.env.production` no servidor com todas as variáveis:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui
NEXT_PUBLIC_SUPABASE_PROJECT_REF=seu_project_ref_aqui

# URL da Aplicação (IMPORTANTE: use HTTPS!)
NEXT_PUBLIC_APP_URL=https://seu-dominio.com

# Evolution API (WhatsApp)
NEXT_PUBLIC_EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua_api_key_aqui
EVOLUTION_INSTANCE_NAME=default

# OpenAI
OPENAI_API_KEY=sua_chave_openai_aqui
OPENAI_MODEL=gpt-4o-mini

# Supabase Management API (opcional)
SUPABASE_ACCESS_TOKEN=sua_chave_access_token_aqui

# Cron Secret (gerar com: openssl rand -base64 32)
CRON_SECRET_KEY=sua_chave_secreta_forte_aqui

# Sentry (Monitoramento) - Opcional mas recomendado
NEXT_PUBLIC_SENTRY_DSN=sua_dsn_do_sentry_aqui
SENTRY_DSN=sua_dsn_do_sentry_aqui
SENTRY_AUTH_TOKEN=sua_auth_token_aqui
SENTRY_ORG=sua_org_aqui
SENTRY_PROJECT=sua_project_aqui
SENTRY_ENVIRONMENT=production

# Ambiente
NODE_ENV=production
```

### 2. Segurança do Servidor

#### Firewall (UFW)
```bash
# Permitir apenas portas necessárias
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (redireciona para HTTPS)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

#### Atualizar Sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 3. Configuração Nginx

Certifique-se de que o Nginx está configurado com HTTPS:

```nginx
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
    
    # Configurações SSL modernas
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Headers de segurança adicionais
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

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
```

### 4. SSL/HTTPS (Certbot)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obter certificado
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com

# Renovação automática (já configurado por padrão)
sudo certbot renew --dry-run
```

### 5. PM2 Configuration

O arquivo `ecosystem.config.js` já está configurado. Verifique:

```bash
# Iniciar aplicação
pm2 start ecosystem.config.js

# Verificar status
pm2 status

# Ver logs
pm2 logs sistema-medico

# Configurar para iniciar no boot
pm2 startup
pm2 save
```

### 6. Banco de Dados

#### Executar Migrations
```bash
# No Supabase Dashboard > SQL Editor
# Execute todas as migrations na ordem (001 até 031)
```

#### Verificar RLS
```sql
-- Verificar se RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false;
```

### 7. Storage Buckets

Criar buckets no Supabase:
- `medical-attachments`
- `clinic-logo`
- `whatsapp-media`

### 8. URLs de Redirecionamento no Supabase

No Supabase Dashboard > Authentication > URL Configuration:

- **Site URL**: `https://seu-dominio.com`
- **Redirect URLs**:
  - `https://seu-dominio.com/**`
  - `https://seu-dominio.com/auth/confirm`

## 🔒 Proteções Implementadas

### Rate Limiting
- ✅ Login: 5 tentativas / 15 minutos
- ✅ APIs gerais: 100 requisições / minuto
- ✅ Criação: 10 requisições / minuto
- ✅ WhatsApp: 20 mensagens / minuto
- ✅ Upload: 5 uploads / minuto

### Headers de Segurança
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ Content-Security-Policy: Configurado
- ✅ Strict-Transport-Security: HSTS
- ✅ X-XSS-Protection: Ativado

### Validação de Arquivos
- ✅ Tipos MIME permitidos
- ✅ Tamanho máximo: 20MB (médico), 10MB (imagens)
- ✅ Sanitização de nomes de arquivo
- ✅ Validação de extensões

### Autenticação
- ✅ JWT tokens gerenciados pelo Supabase
- ✅ Verificação de roles em todas as APIs
- ✅ Middleware de proteção de rotas
- ✅ RLS no banco de dados

## 📊 Monitoramento

### Sentry
- ✅ Configurado para produção
- ✅ Source maps ocultos
- ✅ Tracking de erros e performance

### Logs
```bash
# Logs da aplicação
pm2 logs sistema-medico

# Logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Logs do sistema
sudo journalctl -u nginx -f
```

## 🔄 Manutenção

### Atualizações
```bash
# Atualizar código
cd /var/www/sistema-medico
git pull origin main
npm install
npm run build
pm2 restart sistema-medico
```

### Backups
- Configure backups automáticos do Supabase
- Backup do código: Git
- Backup de arquivos: Supabase Storage

### Renovação de Certificados SSL
```bash
# Verificar expiração
sudo certbot certificates

# Renovar manualmente (se necessário)
sudo certbot renew
```

## ⚠️ Verificações Pós-Deploy

Execute o script de verificação:

```bash
npm run check:security
```

Verifique:
- [ ] HTTPS funcionando
- [ ] Certificado SSL válido
- [ ] Headers de segurança presentes
- [ ] Rate limiting funcionando
- [ ] Autenticação funcionando
- [ ] RLS ativo no banco
- [ ] Logs sem erros críticos
- [ ] Monitoramento (Sentry) ativo

## 🆘 Troubleshooting

### Erro 502 Bad Gateway
```bash
# Verificar se aplicação está rodando
pm2 status

# Reiniciar aplicação
pm2 restart sistema-medico

# Verificar logs
pm2 logs sistema-medico --err
```

### Erro de SSL
```bash
# Verificar certificado
sudo certbot certificates

# Renovar certificado
sudo certbot renew
```

### Problemas de Performance
```bash
# Verificar uso de recursos
pm2 monit

# Verificar logs de erro
pm2 logs sistema-medico --err --lines 100
```

## 📝 Notas Importantes

1. **NUNCA** exponha a `SUPABASE_SERVICE_ROLE_KEY` no client-side
2. **SEMPRE** use HTTPS em produção
3. **MANTENHA** backups regulares do banco de dados
4. **MONITORE** logs regularmente
5. **ATUALIZE** dependências regularmente
6. **TESTE** em staging antes de produção

## ✅ Status Final

Após seguir este guia, seu sistema estará:
- ✅ Seguro e protegido
- ✅ Otimizado para produção
- ✅ Monitorado e com logs
- ✅ Pronto para escalar

