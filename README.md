# Sistema Médico

Sistema completo de gestão médica com prontuário eletrônico, agendamentos, telemedicina e mais.

## 🚀 Instalação no Servidor VPS - SUPER SIMPLES!

### Processo Completo (2 passos apenas):

**1. Enviar script para o servidor:**
```bash
scp install.sh root@SEU_SERVIDOR:/root/
```

**2. Conectar e executar (o script faz TUDO):**
```bash
ssh root@SEU_SERVIDOR
bash install.sh NOME_PROJETO DOMINIO
```

**Exemplo:**
```bash
bash install.sh sistema-medico mercuri.ialumi.cloud
```

### ✅ O script faz automaticamente:

- ✅ Cria a pasta `/var/www/NOME_PROJETO`
- ✅ Clona o repositório Git automaticamente
- ✅ Instala Node.js, PM2, Nginx, Certbot
- ✅ Configura `.env.local`
- ✅ Executa migrações do banco (se configurado)
- ✅ Instala dependências
- ✅ Faz build
- ✅ Configura PM2
- ✅ Obtém certificado SSL
- ✅ Configura Nginx
- ✅ Inicia tudo

**Você só precisa fornecer:**
- Nome do projeto (ex: `sistema-medico`)
- Domínio (ex: `mercuri.ialumi.cloud`)
- Configurar `.env.local` quando o script pausar

**O script já sabe:**
- ✅ Repositório Git: `https://github.com/CavalcanteGestor/sistemamedico1.git`
- ✅ Você escolhe o **nome do projeto** (ex: sistema-medico, clinica-x, etc)
- ✅ Você fornece o **domínio** (ex: mercuri.ialumi.cloud)

### O que o script faz automaticamente:

1. ✅ Atualiza o sistema
2. ✅ Instala Node.js 20.x
3. ✅ Instala PM2
4. ✅ Instala Nginx
5. ✅ Instala Certbot (Let's Encrypt)
6. ✅ Clona o repositório Git
7. ✅ Configura variáveis de ambiente
8. ✅ Instala dependências
9. ✅ Faz build do projeto
10. ✅ Configura PM2
11. ✅ Obtém certificado SSL automaticamente
12. ✅ Configura Nginx com HTTPS
13. ✅ Inicia todos os serviços

### ⚠️ Importante

- O script precisa ser executado como **root** (`sudo bash install.sh`)
- Você escolhe o **nome do projeto** (será usado para diretório e PM2)
- Você fornece o **domínio** (ex: `mercuri.ialumi.cloud`)
- O script criará `.env.local` a partir de `.env.local.example`
- **Configure as variáveis do projeto Supabase** em `.env.local` quando solicitado:
  - `NEXT_PUBLIC_SUPABASE_URL` - URL do seu projeto Supabase
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Chave anon do Supabase
  - `SUPABASE_SERVICE_ROLE_KEY` - Chave service_role do Supabase
  - `SUPABASE_ACCESS_TOKEN` - Token de acesso do Supabase (para execução automática de migrações)
    - Crie em: https://supabase.com/dashboard/account/tokens
- O domínio deve apontar para o IP do servidor antes de executar
- O script pausa para você configurar o `.env.local` e depois continua

### 📋 Variáveis de Ambiente Necessárias

Configure em `.env.local` no servidor:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- E outras variáveis necessárias

### 🔄 Atualizar Sistema

Para atualizar após mudanças no código:

```bash
cd /var/www/NOME_DO_SEU_PROJETO
git pull origin main
npm ci
npm run build
pm2 restart NOME_DO_SEU_PROJETO
```

**Exemplo:**
```bash
cd /var/www/sistema-medico
git pull origin main
npm ci
npm run build
pm2 restart sistema-medico
```

### 📦 Comandos Úteis

```bash
# Ver logs
pm2 logs NOME_PROJETO

# Reiniciar aplicação
pm2 restart NOME_PROJETO

# Status
pm2 status

# Ver logs do Nginx
tail -f /var/log/nginx/error.log
```
