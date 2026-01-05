# 🌐 Instruções Completas: Configurar Domínio na Hostinger

## 📋 Passo a Passo Completo

### 1️⃣ Obter o IP do Servidor VPS

Primeiro, você precisa do IP público do seu servidor VPS:

```bash
# No servidor VPS, execute:
curl ifconfig.me
# ou
hostname -I
```

**Anote este IP!** Você vai precisar dele na Hostinger.

---

### 2️⃣ Configurar DNS na Hostinger

#### Acesse o Painel da Hostinger:

1. Acesse: https://www.hostinger.com.br
2. Faça login na sua conta
3. Vá em **"Domínios"** ou **"Gerenciar Domínios"**
4. Clique no domínio que você quer usar

#### Configurar Registros DNS:

1. Vá em **"DNS / Nameservers"** ou **"Gerenciar DNS"**
2. Você verá uma lista de registros DNS

#### Adicionar/Editar Registros:

**Opção A: Subdomínio (Recomendado)**
- Exemplo: `sistema.seudominio.com`

Adicione/Edite estes registros:

| Tipo | Nome/Host | Valor | TTL |
|------|-----------|-------|-----|
| **A** | `sistema` | `SEU_IP_VPS` | 3600 |
| **A** | `www.sistema` | `SEU_IP_VPS` | 3600 (opcional) |

**Opção B: Domínio Principal**
- Exemplo: `seudominio.com`

Adicione/Edite estes registros:

| Tipo | Nome/Host | Valor | TTL |
|------|-----------|-------|-----|
| **A** | `@` | `SEU_IP_VPS` | 3600 |
| **A** | `www` | `SEU_IP_VPS` | 3600 |

**Exemplo Prático:**

Se seu IP é `123.456.789.012` e você quer usar `sistema.seudominio.com`:

```
Tipo: A
Nome: sistema
Valor: 123.456.789.012
TTL: 3600 (ou padrão)
```

#### Salvar Alterações:

1. Clique em **"Salvar"** ou **"Adicionar Registro"**
2. Aguarde a propagação DNS (pode levar de 5 minutos a 48 horas, geralmente 1-2 horas)

---

### 3️⃣ Verificar Propagação DNS

Você pode verificar se o DNS já propagou usando:

**Opção 1: Comando no terminal**
```bash
# Verificar se o domínio aponta para o IP correto
nslookup sistema.seudominio.com
# ou
dig sistema.seudominio.com
```

**Opção 2: Site online**
- Acesse: https://www.whatsmydns.net
- Digite seu domínio
- Verifique se aparece o IP do seu servidor

**Opção 3: Ping**
```bash
ping sistema.seudominio.com
# Deve mostrar o IP do seu servidor
```

---

### 4️⃣ Configurar no Servidor VPS

Após o DNS propagar, execute o script de deploy:

```bash
chmod +x DEPLOY_AUTOMATICO.sh
./DEPLOY_AUTOMATICO.sh
```

Quando perguntar o domínio, use o mesmo que configurou na Hostinger.

---

### 5️⃣ Configurar SSL (HTTPS)

O script já configura SSL automaticamente, mas se precisar fazer manualmente:

```bash
sudo certbot --nginx -d sistema.seudominio.com
```

Siga as instruções na tela.

---

## 🔍 Troubleshooting

### Problema: Domínio não resolve

**Solução:**
1. Verifique se o registro DNS está correto na Hostinger
2. Aguarde mais tempo para propagação (pode levar até 48h)
3. Limpe o cache DNS do seu computador:
   ```bash
   # Windows
   ipconfig /flushdns
   
   # Linux/Mac
   sudo systemd-resolve --flush-caches
   ```

### Problema: Certificado SSL não funciona

**Solução:**
1. Verifique se o domínio está apontando corretamente:
   ```bash
   nslookup sistema.seudominio.com
   ```
2. Verifique se as portas 80 e 443 estão abertas:
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```
3. Tente obter certificado novamente:
   ```bash
   sudo certbot --nginx -d sistema.seudominio.com --force-renewal
   ```

### Problema: Site não carrega

**Solução:**
1. Verifique se o PM2 está rodando:
   ```bash
   pm2 status
   ```
2. Verifique os logs:
   ```bash
   pm2 logs sistema-medico
   ```
3. Verifique se o Nginx está rodando:
   ```bash
   sudo systemctl status nginx
   ```
4. Verifique se a aplicação está respondendo:
   ```bash
   curl http://localhost:3000
   ```

---

## 📝 Checklist Final

Antes de considerar tudo pronto, verifique:

- [ ] DNS configurado na Hostinger
- [ ] DNS propagado (verificado com nslookup)
- [ ] Script de deploy executado com sucesso
- [ ] SSL configurado e funcionando
- [ ] Site acessível via HTTPS
- [ ] PM2 rodando a aplicação
- [ ] Nginx configurado corretamente
- [ ] Variáveis de ambiente configuradas
- [ ] Cron jobs configurados

---

## 🎯 Exemplo Completo

**Cenário:** Você quer usar `sistema.seudominio.com.br`

1. **Na Hostinger:**
   - Tipo: A
   - Nome: `sistema`
   - Valor: `123.456.789.012` (IP do seu VPS)
   - TTL: 3600

2. **Aguardar propagação** (1-2 horas)

3. **No VPS, executar:**
   ```bash
   ./DEPLOY_AUTOMATICO.sh
   ```
   - Quando perguntar o domínio: `sistema.seudominio.com.br`

4. **Verificar:**
   ```bash
   # Verificar DNS
   nslookup sistema.seudominio.com.br
   
   # Verificar aplicação
   pm2 status
   
   # Acessar no navegador
   https://sistema.seudominio.com.br
   ```

---

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs: `pm2 logs sistema-medico`
2. Verifique o Nginx: `sudo nginx -t`
3. Verifique o firewall: `sudo ufw status`
4. Verifique o DNS: `nslookup seu-dominio.com`

---

**Última atualização**: 2025-01-05

