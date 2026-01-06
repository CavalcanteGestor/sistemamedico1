# Sistema Médico

Sistema completo de gestão médica com prontuário eletrônico, agendamentos, telemedicina e mais.

## 🚀 Instalação no Servidor VPS

### Passo 1: Enviar script para o servidor

```bash
scp install.sh root@SEU_SERVIDOR:/root/
```

### Passo 2: Conectar ao servidor e executar

```bash
ssh root@SEU_SERVIDOR
bash install.sh NOME_PROJETO URL_HOSTINGER GITHUB_REPO_URL
```

**Exemplo:**
```bash
bash install.sh sistema-medico mercuri.ialumi.cloud https://github.com/usuario/repo.git
```

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
- Você precisa ter o arquivo `.env.local.example` no repositório
- O script criará `.env.local` a partir do exemplo
- **Configure as variáveis** em `.env.local` antes de continuar
- O domínio deve apontar para o IP do servidor

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
cd /var/www/NOME_PROJETO
git pull origin main
npm ci
npm run build
pm2 restart NOME_PROJETO
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
