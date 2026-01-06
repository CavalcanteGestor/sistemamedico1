# Sistema Médico

Sistema completo de gestão médica com prontuário eletrônico, agendamentos, telemedicina e mais.

## 🚀 Deploy Rápido para VPS

### Uso Simples

```bash
chmod +x deploy.sh
./deploy.sh NOME_PROJETO URL_HOSTINGER
```

**Exemplo:**
```bash
./deploy.sh sistema-medico mercuri.ialumi.cloud
```

### O que o script faz automaticamente:

1. ✅ Verifica pré-requisitos
2. ✅ Instala dependências localmente
3. ✅ Faz build do projeto
4. ✅ Envia arquivos para VPS via rsync
5. ✅ Instala dependências no servidor
6. ✅ Faz build no servidor
7. ✅ Configura PM2
8. ✅ Configura Nginx com SSL
9. ✅ Recarrega serviços

### 📋 Pré-requisitos

1. **Arquivo `.env.local`** configurado com todas as variáveis
2. **Acesso SSH** ao servidor VPS (chave SSH configurada)
3. **Certificado SSL** já instalado no servidor (Let's Encrypt)
4. **Node.js e npm** instalados no servidor
5. **PM2** instalado no servidor (`npm install -g pm2`)
6. **Nginx** instalado e configurado no servidor

### 🔧 Variáveis de Ambiente Necessárias

Configure em `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- E outras variáveis necessárias

### 📦 Scripts Disponíveis

- `npm run dev` - Desenvolvimento
- `npm run build` - Build de produção
- `npm run start` - Iniciar servidor
- `./deploy.sh NOME URL` - Deploy completo para VPS

### ⚠️ Importante

- O script assume que você tem acesso SSH sem senha (chave SSH configurada)
- O certificado SSL deve estar em `/etc/letsencrypt/live/DOMINIO/`
- O script cria/atualiza a configuração Nginx automaticamente
