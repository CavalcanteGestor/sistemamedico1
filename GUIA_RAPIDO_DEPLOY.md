# 🚀 Guia Rápido: Deploy Automático Completo

## ⚡ Uso Rápido

### 1️⃣ Preparar o Domínio na Hostinger

**ANTES de executar o script**, configure o DNS na Hostinger:

1. Acesse: https://www.hostinger.com.br
2. Vá em **"Domínios"** → Seu domínio → **"DNS / Nameservers"**
3. Adicione registro **A**:
   - **Nome:** `sistema` (ou deixe vazio para domínio principal)
   - **Valor:** `SEU_IP_VPS` (obtenha com: `curl ifconfig.me` no servidor)
   - **TTL:** 3600
4. Salve e aguarde 1-2 horas para propagação

📖 **Instruções detalhadas:** Veja `INSTRUCOES_HOSTINGER.md`

---

### 2️⃣ Executar o Script

No servidor VPS, execute:

```bash
# Baixar o script (se ainda não tiver)
cd /var/www
git clone https://github.com/CavalcanteGestor/sistemamedico1.git sistema-medico
cd sistema-medico

# Dar permissão
chmod +x DEPLOY_AUTOMATICO.sh

# Executar
./DEPLOY_AUTOMATICO.sh
```

O script vai perguntar:
- ✅ Nome do projeto (padrão: `sistema-medico`)
- ✅ Domínio completo (ex: `sistema.seudominio.com`)
- ✅ Email para SSL
- ✅ Diretório do projeto
- ✅ URL do repositório Git

---

### 3️⃣ Configurar Variáveis de Ambiente

Após o deploy, configure as variáveis:

```bash
nano /var/www/sistema-medico/.env.local
```

**Variáveis obrigatórias:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (já configurado automaticamente)

---

### 4️⃣ Pronto! 🎉

Acesse: `https://seu-dominio.com`

---

## 📋 O Que o Script Faz Automaticamente

✅ Instala Node.js, Nginx, PM2, Certbot  
✅ Clona/Atualiza o repositório Git  
✅ Instala dependências do projeto  
✅ Configura variáveis de ambiente  
✅ Faz build do projeto  
✅ Configura PM2 para rodar a aplicação  
✅ Configura Nginx como proxy reverso  
✅ Obtém certificado SSL (HTTPS)  
✅ Configura firewall (UFW)  
✅ Configura cron jobs  
✅ Configura PM2 para iniciar no boot  

---

## 🔧 Comandos Úteis

```bash
# Ver status da aplicação
pm2 status

# Ver logs
pm2 logs sistema-medico

# Reiniciar aplicação
pm2 restart sistema-medico

# Ver logs do Nginx
sudo tail -f /var/log/nginx/error.log

# Verificar SSL
sudo certbot certificates

# Renovar SSL (automático, mas pode forçar)
sudo certbot renew --force-renewal
```

---

## 🆘 Problemas Comuns

### Script falha no meio do caminho

**Solução:** Execute novamente. O script é idempotente (pode rodar várias vezes).

### SSL não funciona

**Solução:**
```bash
# Verificar se domínio aponta corretamente
nslookup seu-dominio.com

# Obter certificado manualmente
sudo certbot --nginx -d seu-dominio.com
```

### Aplicação não inicia

**Solução:**
```bash
# Ver logs
pm2 logs sistema-medico --err

# Verificar variáveis de ambiente
pm2 env sistema-medico

# Reinstalar dependências
cd /var/www/sistema-medico
npm install
npm run build
pm2 restart sistema-medico
```

---

## 📚 Documentação Completa

- **Instruções Hostinger:** `INSTRUCOES_HOSTINGER.md`
- **Instruções VPS:** `INSTRUCOES_VPS.md`
- **Checklist Produção:** `CHECKLIST_PRODUCAO.md`

---

**Pronto para usar!** 🚀

