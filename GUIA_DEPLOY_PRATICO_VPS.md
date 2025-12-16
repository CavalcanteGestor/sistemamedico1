# 🚀 Guia Prático: Deploy do Sistema Médico na VPS

Este guia mostra exatamente onde e como colocar o sistema na sua VPS.

## 📁 Onde Colocar o Sistema

### Opção Recomendada: `/var/www/`

**Por quê?**
- ✅ Padrão para aplicações web
- ✅ Permissões adequadas
- ✅ Fácil de gerenciar com Nginx
- ✅ Organizado e profissional

### Estrutura Recomendada:

```
/var/www/
├── sistema-medico/          # Seu sistema médico
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── package.json
│   └── .env.local
└── n8n/                      # Seu n8n (se já estiver aqui)
```

## 🔧 Passo a Passo Completo

### 1. Preparar Diretório

**Via Terminal SSH:**
```bash
# Conectar na VPS
ssh usuario@seu-ip-vps

# Criar diretório
sudo mkdir -p /var/www/sistema-medico

# Dar permissões ao seu usuário
sudo chown -R $USER:$USER /var/www/sistema-medico

# Entrar no diretório
cd /var/www/sistema-medico
```

**Via File Manager (Interface Web):**
1. Navegue até `/var/www/`
2. Crie uma pasta chamada `sistema-medico`
3. Ajuste as permissões (se necessário)

### 2. Fazer Upload do Código

#### Opção A: Via Git (Recomendado)

```bash
cd /var/www/sistema-medico

# Se você tem o código em um repositório Git
git clone https://seu-repositorio.git .

# OU se já tem um repositório local, fazer push e depois clone
```

#### Opção B: Via SCP (do seu computador Windows)

**No PowerShell do Windows:**
```powershell
# Compactar o projeto (excluindo node_modules e .next)
# No diretório do projeto local:
Compress-Archive -Path app,components,lib,public,scripts,stores,types,*.json,*.js,*.ts,*.config.*,.env.local.example -DestinationPath sistema-medico.zip -Force

# Enviar para VPS
scp sistema-medico.zip usuario@seu-ip-vps:/tmp/

# Na VPS, descompactar
ssh usuario@seu-ip-vps
cd /var/www/sistema-medico
unzip /tmp/sistema-medico.zip -d .
```

#### Opção C: Via File Manager (Interface Web)

1. **Compactar o projeto no Windows:**
   - Selecione todas as pastas e arquivos do projeto
   - Exclua: `node_modules`, `.next`, `.git`
   - Compacte em ZIP

2. **Fazer upload via File Manager:**
   - Acesse `/var/www/sistema-medico/` no File Manager
   - Faça upload do arquivo ZIP
   - Extraia o arquivo ZIP
   - Delete o arquivo ZIP após extrair

### 3. Instalar Dependências

```bash
cd /var/www/sistema-medico

# Instalar Node.js (se ainda não tiver)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar versão
node --version  # Deve ser v18.x ou superior
npm --version

# Instalar dependências do projeto
npm install
```

### 4. Configurar Variáveis de Ambiente

```bash
cd /var/www/sistema-medico

# Copiar arquivo de exemplo
cp env.local.example .env.local

# Editar com suas credenciais
nano .env.local
# OU usar o File Manager para editar
```

**Conteúdo do `.env.local`:**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui

# URL da aplicação (use o domínio que você vai usar)
NEXT_PUBLIC_APP_URL=https://sistema-medico.seu-dominio.com

# OpenAI
OPENAI_API_KEY=sua_chave_openai
OPENAI_MODEL=gpt-4o-mini

# Evolution API (WhatsApp)
NEXT_PUBLIC_EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua_api_key
EVOLUTION_INSTANCE_NAME=default

# Cron Secret (gerar com: openssl rand -base64 32)
CRON_SECRET_KEY=sua_chave_secreta_forte_aqui

# Supabase Management API (opcional)
SUPABASE_ACCESS_TOKEN=sua_chave_access_token_aqui
NEXT_PUBLIC_SUPABASE_PROJECT_REF=seu_project_ref
```

### 5. Fazer Build do Projeto

```bash
cd /var/www/sistema-medico

# Build de produção
npm run build
```

**Isso pode levar alguns minutos. Aguarde a conclusão.**

### 6. Instalar e Configurar PM2

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Iniciar aplicação com PM2
cd /var/www/sistema-medico
pm2 start ecosystem.config.js

# OU iniciar manualmente
pm2 start node_modules/next/dist/bin/next --name sistema-medico -- start

# Salvar configuração do PM2
pm2 save

# Configurar PM2 para iniciar no boot
pm2 startup
# Execute o comando que aparecer (algo como: sudo env PATH=...)
```

**Verificar se está rodando:**
```bash
pm2 list
pm2 logs sistema-medico
```

### 7. Configurar Nginx

```bash
# Criar arquivo de configuração
sudo nano /etc/nginx/sites-available/sistema-medico
```

**Conteúdo:**
```nginx
server {
    listen 80;
    server_name sistema-medico.seu-dominio.com www.sistema-medico.seu-dominio.com;

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

**Ativar configuração:**
```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/sistema-medico /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Se OK, recarregar Nginx
sudo systemctl reload nginx
```

### 8. Configurar SSL (HTTPS)

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d sistema-medico.seu-dominio.com -d www.sistema-medico.seu-dominio.com

# Seguir as instruções do Certbot
```

### 9. Configurar Cron Job

```bash
# Editar crontab
crontab -e

# Adicionar linha (processar follow-ups a cada 5 minutos)
*/5 * * * * curl -X POST http://localhost:3000/api/follow-up/process-scheduled -H "Authorization: Bearer SEU_CRON_SECRET_KEY" > /dev/null 2>&1

# Substitua SEU_CRON_SECRET_KEY pelo valor do CRON_SECRET_KEY do .env.local
```

### 10. Verificar Funcionamento

```bash
# Verificar processos
pm2 list

# Verificar portas
sudo netstat -tulpn | grep 3000

# Testar aplicação
curl http://localhost:3000

# Ver logs
pm2 logs sistema-medico
```

## 📂 Organização Recomendada da VPS

```
/
├── var/
│   └── www/                    # Aplicações web
│       ├── sistema-medico/     # ✅ Seu sistema médico aqui
│       └── n8n/                # Seu n8n (se estiver aqui)
│
├── opt/                        # Software adicional (opcional)
│
├── home/
│   └── usuario/                # Arquivos do usuário
│       ├── scripts/            # Scripts pessoais
│       └── backups/            # Backups
│
├── etc/
│   └── nginx/
│       └── sites-available/    # Configurações Nginx
│
└── root/                       # Diretório root (evite usar)
```

## 🔍 Comandos Úteis

### Verificar Status
```bash
# Status do PM2
pm2 status
pm2 monit

# Status do Nginx
sudo systemctl status nginx

# Ver processos rodando
ps aux | grep node

# Ver uso de recursos
htop
# ou
top
```

### Logs
```bash
# Logs do Sistema Médico
pm2 logs sistema-medico

# Logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Reiniciar Serviços
```bash
# Reiniciar Sistema Médico
pm2 restart sistema-medico

# Reiniciar Nginx
sudo systemctl restart nginx

# Reiniciar tudo
pm2 restart all
```

## ⚠️ Dicas Importantes

### 1. Permissões
```bash
# Se tiver problemas de permissão
sudo chown -R $USER:$USER /var/www/sistema-medico
sudo chmod -R 755 /var/www/sistema-medico
```

### 2. Firewall
```bash
# Permitir portas necessárias
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw enable
```

### 3. Backup
```bash
# Criar backup do código
cd /var/www
tar -czf sistema-medico-backup-$(date +%Y%m%d).tar.gz sistema-medico/

# Mover para pasta de backups
mv sistema-medico-backup-*.tar.gz ~/backups/
```

### 4. Atualizar Sistema
```bash
# Quando precisar atualizar o código
cd /var/www/sistema-medico

# Se usar Git
git pull origin main

# Reinstalar dependências (se necessário)
npm install

# Rebuild
npm run build

# Reiniciar
pm2 restart sistema-medico
```

## ✅ Checklist Final

- [ ] Diretório `/var/www/sistema-medico/` criado
- [ ] Código enviado/extraído no diretório
- [ ] Node.js 18+ instalado
- [ ] Dependências instaladas (`npm install`)
- [ ] Arquivo `.env.local` configurado
- [ ] Build realizado (`npm run build`)
- [ ] PM2 instalado e configurado
- [ ] Aplicação rodando via PM2
- [ ] Nginx configurado
- [ ] SSL configurado (HTTPS)
- [ ] Cron job configurado
- [ ] Domínio apontando para VPS
- [ ] Teste de acesso funcionando

## 🚨 Troubleshooting

### Erro: "Permission denied"
```bash
sudo chown -R $USER:$USER /var/www/sistema-medico
```

### Erro: "Port 3000 already in use"
```bash
# Ver o que está usando a porta
sudo lsof -i :3000

# Matar processo se necessário
sudo kill -9 <PID>
```

### Erro: "Cannot find module"
```bash
# Reinstalar dependências
cd /var/www/sistema-medico
rm -rf node_modules package-lock.json
npm install
```

### Aplicação não inicia
```bash
# Ver logs detalhados
pm2 logs sistema-medico --lines 100

# Verificar variáveis de ambiente
pm2 env sistema-medico
```

## 📞 Próximos Passos

1. ✅ Sistema instalado e rodando
2. ⏭️ Configurar domínio e DNS
3. ⏭️ Configurar SSL/HTTPS
4. ⏭️ Testar todas as funcionalidades
5. ⏭️ Configurar backups automáticos


