# Sistema Médico

Sistema completo de gestão médica com prontuário eletrônico, agendamentos, telemedicina e mais.

## 🚀 Deploy Rápido

```bash
chmod +x deploy.sh
./deploy.sh NOME_PROJETO URL_HOSTINGER
```

**Exemplo:**
```bash
./deploy.sh sistema-medico mercuri.ialumi.cloud
```

O script faz tudo automaticamente:
- ✅ Build do projeto
- ✅ Envio para VPS
- ✅ Instalação de dependências
- ✅ Configuração PM2
- ✅ Configuração Nginx
- ✅ SSL/HTTPS

## 📋 Pré-requisitos

1. Arquivo `.env.local` configurado
2. Acesso SSH ao servidor VPS
3. Certificado SSL (Let's Encrypt) configurado no servidor

## 🔧 Variáveis de Ambiente

Configure em `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- E outras variáveis necessárias

## 📦 Scripts Disponíveis

- `npm run dev` - Desenvolvimento
- `npm run build` - Build de produção
- `npm run start` - Iniciar servidor
- `./deploy.sh` - Deploy completo para VPS
