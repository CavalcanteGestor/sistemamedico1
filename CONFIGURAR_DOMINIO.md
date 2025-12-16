# 🌐 Como Configurar Domínio/Subdomínio

Este guia explica como configurar domínios para acessar o sistema na sua VPS.

## 📋 Opções Disponíveis

### Opção 1: Subdomínio (Recomendado)
**Exemplo:**
- `n8n.seu-dominio.com` → n8n (já configurado)
- `sistema.seu-dominio.com` → Sistema Médico (novo)

### Opção 2: Domínio Diferente
**Exemplo:**
- `n8n.com.br` → n8n (já configurado)
- `sistema-medico.com.br` → Sistema Médico (novo)

### Opção 3: Caminho no Mesmo Domínio
**Exemplo:**
- `seu-dominio.com/n8n` → n8n
- `seu-dominio.com` → Sistema Médico

---

## 🎯 Opção 1: Subdomínio (Mais Fácil)

### Passo 1: Configurar DNS no Registrador

**No painel do seu registrador de domínio (ex: Registro.br, GoDaddy, etc):**

1. Acesse o gerenciamento de DNS
2. Adicione um registro do tipo **A**:

```
Tipo: A
Nome: sistema (ou o nome que você quiser)
Valor: 31.97.242.100
TTL: 3600 (ou padrão)
```

**Resultado:** `sistema.seu-dominio.com` apontará para sua VPS

**Se quiser com www também:**
```
Tipo: A
Nome: www.sistema
Valor: 31.97.242.100
TTL: 3600
```

### Passo 2: Aguardar Propagação DNS

```bash
# Verificar se DNS está propagado (pode levar até 48h, geralmente 1-2h)
nslookup sistema.seu-dominio.com
# ou
dig sistema.seu-dominio.com
```

**Quando retornar o IP `31.97.242.100`, está pronto!**

### Passo 3: Configurar Nginx na VPS

```bash
# Editar arquivo de configuração
nano /etc/nginx/sites-available/sistema-medico
```

**Cole este conteúdo (ajuste o domínio):**
```nginx
server {
    listen 80;
    server_name sistema.seu-dominio.com www.sistema.seu-dominio.com;

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

**Ativar:**
```bash
ln -s /etc/nginx/sites-available/sistema-medico /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Passo 4: Configurar SSL (HTTPS)

```bash
# Obter certificado SSL
certbot --nginx -d sistema.seu-dominio.com -d www.sistema.seu-dominio.com

# Seguir as instruções
# Escolha: 2 (Redirect HTTP to HTTPS)
```

**Pronto!** Agora acesse: `https://sistema.seu-dominio.com`

### Passo 5: Atualizar Variável de Ambiente

```bash
# Editar .env.local
nano /var/www/sistema-medico/.env.local

# Atualizar esta linha:
NEXT_PUBLIC_APP_URL=https://sistema.seu-dominio.com

# Reiniciar sistema
pm2 restart sistema-medico
```

---

## 🎯 Opção 2: Domínio Diferente

### Passo 1: Configurar DNS

**No registrador do novo domínio:**

```
Tipo: A
Nome: @ (ou deixe em branco)
Valor: 31.97.242.100
TTL: 3600
```

**Para www:**
```
Tipo: A
Nome: www
Valor: 31.97.242.100
TTL: 3600
```

### Passo 2: Aguardar Propagação

```bash
# Verificar
nslookup sistema-medico.com.br
dig sistema-medico.com.br
```

### Passo 3: Configurar Nginx

```bash
nano /etc/nginx/sites-available/sistema-medico
```

**Conteúdo:**
```nginx
server {
    listen 80;
    server_name sistema-medico.com.br www.sistema-medico.com.br;

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

**Ativar:**
```bash
ln -s /etc/nginx/sites-available/sistema-medico /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Passo 4: SSL

```bash
certbot --nginx -d sistema-medico.com.br -d www.sistema-medico.com.br
```

### Passo 5: Atualizar .env.local

```bash
nano /var/www/sistema-medico/.env.local
# Atualizar:
NEXT_PUBLIC_APP_URL=https://sistema-medico.com.br
pm2 restart sistema-medico
```

---

## 🎯 Opção 3: Caminho no Mesmo Domínio

**Se você quer usar o mesmo domínio do n8n:**

**Exemplo:**
- `seu-dominio.com/n8n` → n8n
- `seu-dominio.com` → Sistema Médico

### Configurar Nginx

```bash
nano /etc/nginx/sites-available/sistema-medico
```

**Conteúdo:**
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

    # n8n (subcaminho - se já estiver configurado, mantenha)
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

**⚠️ ATENÇÃO:** Se o n8n já está configurado, você pode precisar ajustar a configuração existente ao invés de criar nova.

---

## 📝 Resumo das Configurações

### Estrutura de Arquivos Nginx

```
/etc/nginx/sites-available/
├── n8n                    # Configuração do n8n (já existe)
└── sistema-medico         # Configuração do Sistema Médico (nova)

/etc/nginx/sites-enabled/
├── n8n -> ../sites-available/n8n
└── sistema-medico -> ../sites-available/sistema-medico
```

### Verificar Configurações Ativas

```bash
# Ver todos os sites configurados
ls -la /etc/nginx/sites-enabled/

# Ver configuração completa
nginx -T | grep server_name

# Testar configuração
nginx -t
```

---

## ✅ Checklist

- [ ] DNS configurado no registrador
- [ ] DNS propagado (verificado com `nslookup` ou `dig`)
- [ ] Arquivo Nginx criado em `/etc/nginx/sites-available/sistema-medico`
- [ ] Link simbólico criado em `/etc/nginx/sites-enabled/`
- [ ] Nginx testado (`nginx -t`)
- [ ] Nginx recarregado (`systemctl reload nginx`)
- [ ] SSL configurado com Certbot
- [ ] `.env.local` atualizado com a URL correta
- [ ] Sistema reiniciado (`pm2 restart sistema-medico`)
- [ ] Acesso testado no navegador

---

## 🔍 Verificar Funcionamento

```bash
# 1. Verificar DNS
nslookup sistema.seu-dominio.com

# 2. Verificar Nginx
systemctl status nginx
nginx -t

# 3. Verificar SSL
certbot certificates

# 4. Testar acesso
curl -I https://sistema.seu-dominio.com

# 5. Ver logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 🚨 Troubleshooting

### DNS não resolve
- Aguarde propagação (pode levar até 48h)
- Verifique se o registro A está correto
- Use `dig` ou `nslookup` para verificar

### Erro 502 Bad Gateway
```bash
# Verificar se sistema está rodando
pm2 list
netstat -tulpn | grep 3000

# Ver logs do Nginx
tail -f /var/log/nginx/error.log
```

### Certificado SSL não funciona
```bash
# Verificar certificados
certbot certificates

# Renovar manualmente
certbot renew

# Ver logs
tail -f /var/log/letsencrypt/letsencrypt.log
```

### Nginx retorna erro
```bash
# Testar configuração
nginx -t

# Ver configuração completa
nginx -T

# Ver logs de erro
tail -f /var/log/nginx/error.log
```

---

## 📞 Exemplo Prático Completo

**Cenário:** Você tem o domínio `meusistema.com.br` e quer:
- `n8n.meusistema.com.br` → n8n
- `sistema.meusistema.com.br` → Sistema Médico

**1. DNS:**
```
Tipo: A | Nome: n8n | Valor: 31.97.242.100
Tipo: A | Nome: sistema | Valor: 31.97.242.100
```

**2. Nginx:**
- `/etc/nginx/sites-available/n8n` → porta 5678
- `/etc/nginx/sites-available/sistema-medico` → porta 3000

**3. SSL:**
```bash
certbot --nginx -d n8n.meusistema.com.br
certbot --nginx -d sistema.meusistema.com.br
```

**Pronto!** Ambos funcionando com HTTPS.

---

## 💡 Dica Final

**Recomendação:** Use **subdomínios** (Opção 1) porque:
- ✅ Mais fácil de configurar
- ✅ Não precisa de domínio adicional
- ✅ Organizado e profissional
- ✅ SSL simples de configurar


