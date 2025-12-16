# 🌐 Guia: 2 Domínios na Mesma VPS

Este guia explica como configurar 2 domínios diferentes na mesma VPS, cada um apontando para um serviço diferente.

## ✅ Configuração Recomendada

**Domínio 1**: `n8n.seu-dominio.com` → n8n (porta 5678)  
**Domínio 2**: `sistema.seu-dominio.com` → Sistema Médico (porta 3000)

**OU**

**Domínio 1**: `n8n.com.br` → n8n (porta 5678)  
**Domínio 2**: `sistema-medico.com.br` → Sistema Médico (porta 3000)

## 📋 Pré-requisitos

- ✅ 2 domínios apontando para o mesmo IP da VPS
- ✅ Acesso SSH à VPS
- ✅ Nginx instalado
- ✅ Ambos os serviços rodando (n8n e Sistema Médico)

## 🔧 Passo a Passo

### 1. Configurar DNS dos Domínios

Nos registradores de domínio, configure os registros DNS:

**Para ambos os domínios:**
```
Tipo: A
Nome: @ (ou deixe em branco)
Valor: IP_DA_SUA_VPS
TTL: 3600 (ou padrão)
```

**Para subdomínios (se usar):**
```
Tipo: A
Nome: n8n (ou sistema)
Valor: IP_DA_SUA_VPS
TTL: 3600
```

**Verificar se os domínios estão apontando corretamente:**
```bash
# Verificar DNS do domínio 1
nslookup n8n.seu-dominio.com
# ou
dig n8n.seu-dominio.com

# Verificar DNS do domínio 2
nslookup sistema.seu-dominio.com
# ou
dig sistema.seu-dominio.com
```

### 2. Criar Configurações Nginx para Cada Domínio

#### Configuração para n8n (Domínio 1)

```bash
sudo nano /etc/nginx/sites-available/n8n
```

**Conteúdo:**
```nginx
server {
    listen 80;
    server_name n8n.seu-dominio.com www.n8n.seu-dominio.com;
    # OU se for domínio completo:
    # server_name n8n.com.br www.n8n.com.br;

    # Redirecionar HTTP para HTTPS (descomente após configurar SSL)
    # return 301 https://$server_name$request_uri;

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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Limite de tamanho de upload
    client_max_body_size 50M;
}
```

#### Configuração para Sistema Médico (Domínio 2)

```bash
sudo nano /etc/nginx/sites-available/sistema-medico
```

**Conteúdo:**
```nginx
server {
    listen 80;
    server_name sistema.seu-dominio.com www.sistema.seu-dominio.com;
    # OU se for domínio completo:
    # server_name sistema-medico.com.br www.sistema-medico.com.br;

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

### 3. Ativar Configurações

```bash
# Ativar configuração do n8n
sudo ln -s /etc/nginx/sites-available/n8n /etc/nginx/sites-enabled/

# Ativar configuração do Sistema Médico
sudo ln -s /etc/nginx/sites-available/sistema-medico /etc/nginx/sites-enabled/

# Testar configuração do Nginx
sudo nginx -t

# Se tudo estiver OK, recarregar Nginx
sudo systemctl reload nginx
```

### 4. Configurar SSL (HTTPS) para Ambos os Domínios

```bash
# Instalar Certbot (se ainda não tiver)
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado SSL para n8n (Domínio 1)
sudo certbot --nginx -d n8n.seu-dominio.com -d www.n8n.seu-dominio.com

# Obter certificado SSL para Sistema Médico (Domínio 2)
sudo certbot --nginx -d sistema.seu-dominio.com -d www.sistema.seu-dominio.com
```

**OU se forem domínios completamente diferentes:**

```bash
# Certificado para n8n.com.br
sudo certbot --nginx -d n8n.com.br -d www.n8n.com.br

# Certificado para sistema-medico.com.br
sudo certbot --nginx -d sistema-medico.com.br -d www.sistema-medico.com.br
```

### 5. Verificar Configurações Finais

Após configurar SSL, o Certbot atualiza automaticamente os arquivos de configuração. Verifique:

```bash
# Ver configurações ativas
ls -la /etc/nginx/sites-enabled/

# Ver conteúdo das configurações (deve ter blocos HTTP e HTTPS)
sudo cat /etc/nginx/sites-enabled/n8n
sudo cat /etc/nginx/sites-enabled/sistema-medico

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

### 6. Verificar Funcionamento

```bash
# Testar n8n
curl -I http://n8n.seu-dominio.com
# ou
curl -I https://n8n.seu-dominio.com

# Testar Sistema Médico
curl -I http://sistema.seu-dominio.com
# ou
curl -I https://sistema.seu-dominio.com

# Ver logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 📝 Exemplo Completo: 2 Domínios Diferentes

Se você tiver 2 domínios completamente diferentes:

**Domínio 1**: `n8n.com.br` → n8n  
**Domínio 2**: `sistema-medico.com.br` → Sistema Médico

**Configuração Nginx para n8n.com.br:**
```nginx
server {
    listen 80;
    server_name n8n.com.br www.n8n.com.br;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name n8n.com.br www.n8n.com.br;

    ssl_certificate /etc/letsencrypt/live/n8n.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/n8n.com.br/privkey.pem;

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

    client_max_body_size 50M;
}
```

**Configuração Nginx para sistema-medico.com.br:**
```nginx
server {
    listen 80;
    server_name sistema-medico.com.br www.sistema-medico.com.br;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sistema-medico.com.br www.sistema-medico.com.br;

    ssl_certificate /etc/letsencrypt/live/sistema-medico.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sistema-medico.com.br/privkey.pem;

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

    client_max_body_size 50M;
}
```

## 🔍 Verificar Status

```bash
# Ver todos os sites configurados
sudo nginx -T | grep server_name

# Ver status do Nginx
sudo systemctl status nginx

# Ver processos PM2
pm2 list

# Verificar portas
sudo netstat -tulpn | grep -E '3000|5678|80|443'
```

## ⚠️ Importante

### 1. Variáveis de Ambiente

No `.env.local` do Sistema Médico, configure:
```env
NEXT_PUBLIC_APP_URL=https://sistema.seu-dominio.com
# OU
NEXT_PUBLIC_APP_URL=https://sistema-medico.com.br
```

### 2. Configuração do n8n

No n8n, configure a URL base:
```env
N8N_BASE_URL=https://n8n.seu-dominio.com
# OU
N8N_BASE_URL=https://n8n.com.br
```

### 3. Renovação Automática de SSL

O Certbot configura automaticamente a renovação. Verifique:
```bash
# Testar renovação
sudo certbot renew --dry-run

# Ver certificados configurados
sudo certbot certificates
```

## ✅ Checklist Final

- [ ] DNS dos 2 domínios apontando para o IP da VPS
- [ ] Configurações Nginx criadas para ambos os domínios
- [ ] Configurações ativadas (symlinks criados)
- [ ] SSL configurado para ambos os domínios
- [ ] Nginx testado e recarregado
- [ ] Ambos os serviços acessíveis via HTTPS
- [ ] Variáveis de ambiente configuradas corretamente
- [ ] Renovação automática de SSL funcionando

## 🚨 Troubleshooting

### Domínio não resolve
```bash
# Verificar DNS
dig seu-dominio.com
nslookup seu-dominio.com

# Aguardar propagação DNS (pode levar até 48h)
```

### Certificado SSL não funciona
```bash
# Verificar certificados
sudo certbot certificates

# Renovar manualmente
sudo certbot renew

# Ver logs do Certbot
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

### Nginx retorna 502 Bad Gateway
```bash
# Verificar se os serviços estão rodando
pm2 list
sudo netstat -tulpn | grep -E '3000|5678'

# Ver logs do Nginx
sudo tail -f /var/log/nginx/error.log
```

## 📚 Recursos Adicionais

- [Documentação Nginx](https://nginx.org/en/docs/)
- [Documentação Certbot](https://certbot.eff.org/)
- [Guia DNS](https://www.cloudflare.com/learning/dns/what-is-dns/)


