# 📘 Guia Completo de Instalação

## 🎯 Visão Geral

Este guia explica como instalar o Sistema Médico em um servidor VPS usando o script automatizado `install.sh`.

---

## 📋 Pré-requisitos

Antes de começar, você precisa ter:

1. ✅ **Servidor VPS** com acesso root
2. ✅ **Domínio** apontando para o IP do servidor (DNS configurado)
3. ✅ **Conta Supabase** com projeto criado
4. ✅ **Credenciais do Supabase**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ACCESS_TOKEN` (opcional, para migrações automáticas)

---

## 🚀 Instalação Rápida (Termius)

### Método Recomendado: Baixar do GitHub

1. **Conecte ao servidor no Termius**

2. **Execute os comandos:**

```bash
cd /root
wget https://raw.githubusercontent.com/CavalcanteGestor/sistemamedico1/main/install.sh
chmod +x install.sh
bash install.sh NOME_PROJETO DOMINIO
```

**Exemplo:**
```bash
cd /root
wget https://raw.githubusercontent.com/CavalcanteGestor/sistemamedico1/main/install.sh
chmod +x install.sh
bash install.sh sistema-medico mercuri.ialumi.cloud
```

---

## 📝 Passo a Passo Detalhado

### 1️⃣ Preparação

**No Termius, conecte ao servidor:**

```bash
ssh root@SEU_SERVIDOR_IP
```

**Baixe o script:**

```bash
cd /root
wget https://raw.githubusercontent.com/CavalcanteGestor/sistemamedico1/main/install.sh
chmod +x install.sh
```

---

### 2️⃣ Executar o Script

**Execute o script com 2 parâmetros:**

```bash
bash install.sh NOME_PROJETO DOMINIO
```

**Parâmetros:**
- `NOME_PROJETO`: Nome do projeto (ex: `sistema-medico`)
- `DOMINIO`: Domínio completo (ex: `mercuri.ialumi.cloud`)

**Exemplo completo:**
```bash
bash install.sh sistema-medico mercuri.ialumi.cloud
```

---

### 3️⃣ O que o Script Faz Automaticamente

O script executa automaticamente:

1. ✅ **Atualiza o sistema** (apt-get update/upgrade)
2. ✅ **Instala Node.js 20.x**
3. ✅ **Instala PM2** (gerenciador de processos)
4. ✅ **Instala Nginx** (servidor web)
5. ✅ **Instala Certbot** (SSL automático)
6. ✅ **Instala Git**
7. ✅ **Cria diretório** `/var/www/NOME_PROJETO`
8. ✅ **Clona repositório** do GitHub
9. ✅ **Cria `.env.local`** a partir do exemplo
10. ✅ **Configura `NEXT_PUBLIC_APP_URL`** automaticamente
11. ✅ **Pausa para você configurar** variáveis do Supabase
12. ✅ **Instala dependências** npm
13. ✅ **Executa migrações** do banco (se tiver token)
14. ✅ **Faz build** do projeto
15. ✅ **Configura PM2** para rodar em produção
16. ✅ **Obtém certificado SSL** automaticamente
17. ✅ **Configura Nginx** com HTTPS
18. ✅ **Inicia todos os serviços**

---

### 4️⃣ Configurar Variáveis de Ambiente

**Quando o script pausar, você verá:**

```
⚠️  Configure as variáveis do Supabase no arquivo .env.local
```

**Edite o arquivo:**

```bash
nano /var/www/NOME_PROJETO/.env.local
```

**Configure estas variáveis (obrigatórias):**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role

# Token para migrações automáticas (opcional)
SUPABASE_ACCESS_TOKEN=seu-token-de-acesso
```

**Salvar:**
- Pressione `Ctrl + X`
- Pressione `Y` (confirmar)
- Pressione `ENTER`

**Voltar ao script:**

```bash
# Pressione ENTER para continuar
```

---

### 5️⃣ Migrações do Banco de Dados

#### Opção A: Automática (Recomendado)

Se você configurou `SUPABASE_ACCESS_TOKEN`, o script executa as migrações automaticamente.

#### Opção B: Manual

Se não tiver o token, execute manualmente:

**Via Supabase Dashboard:**
1. Acesse: https://supabase.com/dashboard
2. Vá em **SQL Editor**
3. Execute cada arquivo de `supabase/migrations/` na ordem numérica

**Via Supabase CLI:**
```bash
cd /var/www/NOME_PROJETO
npx supabase db push
```

---

### 6️⃣ Verificar Instalação

**Após o script terminar, verifique:**

```bash
# Status do PM2
pm2 status

# Status do Nginx
systemctl status nginx

# Logs da aplicação
pm2 logs NOME_PROJETO

# Testar acesso
curl -I https://SEU_DOMINIO
```

---

## 🔧 Comandos Úteis Após Instalação

### Ver Logs

```bash
# Logs em tempo real
pm2 logs NOME_PROJETO

# Últimas 100 linhas
pm2 logs NOME_PROJETO --lines 100

# Logs do Nginx
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### Reiniciar Aplicação

```bash
pm2 restart NOME_PROJETO
```

### Parar/Iniciar Aplicação

```bash
pm2 stop NOME_PROJETO
pm2 start NOME_PROJETO
```

### Atualizar Sistema

```bash
cd /var/www/NOME_PROJETO
git pull origin main
npm ci
npm run build
pm2 restart NOME_PROJETO
```

### Verificar Certificado SSL

```bash
certbot certificates
```

### Renovar Certificado SSL

```bash
certbot renew
```

---

## ⚠️ Troubleshooting

### Erro: "upstream sent too big header"

**Solução:** O script já configura isso automaticamente. Se ainda ocorrer:

```bash
sudo nano /etc/nginx/sites-available/NOME_PROJETO
```

Adicione dentro do bloco `server`:

```nginx
proxy_buffer_size 16k;
proxy_buffers 8 16k;
proxy_busy_buffers_size 32k;
```

Recarregue:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Erro: "Connection refused" no Nginx

**Verifique se a aplicação está rodando:**

```bash
pm2 status
curl http://localhost:3000
```

### Erro: Certificado SSL não funciona

**Verifique DNS:**

```bash
dig SEU_DOMINIO
```

O domínio deve apontar para o IP do servidor.

### Erro: Migrações falharam

**Execute manualmente:**

```bash
cd /var/www/NOME_PROJETO
npx supabase db push
```

Ou via Dashboard do Supabase.

---

## 🔒 Segurança

### Firewall (UFW)

```bash
# Permitir SSH
ufw allow 22/tcp

# Permitir HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Ativar firewall
ufw enable
```

### Atualizar Sistema Regularmente

```bash
apt-get update && apt-get upgrade -y
```

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs: `pm2 logs NOME_PROJETO`
2. Verifique o Nginx: `tail -f /var/log/nginx/error.log`
3. Verifique se todos os serviços estão rodando: `pm2 status`

---

## ✅ Checklist Final

Após a instalação, verifique:

- [ ] Aplicação rodando (`pm2 status`)
- [ ] Nginx ativo (`systemctl status nginx`)
- [ ] SSL funcionando (`https://SEU_DOMINIO`)
- [ ] Migrações executadas
- [ ] Login funcionando
- [ ] Logs sem erros críticos

---

## 🎉 Pronto!

Seu sistema está instalado e rodando em:

**🌐 https://SEU_DOMINIO**

---

**Última atualização:** Janeiro 2026

