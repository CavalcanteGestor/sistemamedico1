# 🏥 Sistema Médico - Gestão Completa para Clínicas

Sistema completo de gestão médica com integração de IA, atendimento automatizado via WhatsApp, telemedicina, follow-ups inteligentes, agendamentos, prontuários e muito mais.

## ✨ Funcionalidades Principais

- 📅 **Agendamento de Consultas** - Sistema completo de agendamento com múltiplos médicos
- 👨‍⚕️ **Gestão de Médicos e Pacientes** - Cadastro completo com controle de permissões
- 📋 **Prontuários Eletrônicos** - Prontuário digital completo com histórico
- 💊 **Prescrições Médicas** - Sistema de prescrições com templates personalizáveis
- 🔬 **Exames e Resultados** - Gestão de exames e compartilhamento com pacientes
- 🎥 **Telemedicina** - Consultas por vídeo com WebRTC, transcrição e resumos IA
- 📱 **Portal do Paciente** - Acesso seguro para pacientes visualizarem seus dados
- 💬 **WhatsApp Integration** - Atendimento automatizado via Evolution API
- 🤖 **IA para Follow-ups** - Geração automática de mensagens personalizadas
- 📊 **Relatórios e Analytics** - Dashboards e relatórios completos
- 💰 **Gestão Financeira** - Controle financeiro básico
- 📝 **Atestados e Documentos** - Geração automática de atestados
- 🔔 **Sistema de Notificações** - Notificações em tempo real

## 🚀 Tecnologias

- **Next.js 16** - Framework React com App Router e Server Components
- **TypeScript** - Tipagem estática para maior segurança
- **Supabase** - PostgreSQL, Autenticação, Storage e Realtime
- **OpenAI** - Geração de mensagens e análise de contexto
- **Evolution API** - Integração WhatsApp
- **Tailwind CSS** - Estilização moderna e responsiva
- **shadcn/ui** - Componentes UI acessíveis e personalizáveis
- **WebRTC** - Telemedicina peer-to-peer

## 📋 Pré-requisitos

- **Node.js** 18 ou superior
- **npm** ou **yarn**
- Conta **Supabase** (gratuita)
- Conta **OpenAI** (para funcionalidades de IA)
- **Evolution API** configurada (para WhatsApp)
- Servidor/domínio para produção (VPS recomendado)

## ⚙️ Instalação Rápida

### 1. Clone o Repositório

```bash
git clone <repository-url>
cd SistemaMédico
```

### 2. Instale as Dependências

```bash
npm install
```

### 3. Configure as Variáveis de Ambiente

Copie o arquivo de exemplo:

```bash
cp env.local.example .env.local
```

Edite `.env.local` com suas credenciais:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui
NEXT_PUBLIC_SUPABASE_PROJECT_REF=seu_project_ref_aqui

# URL da Aplicação
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Evolution API (WhatsApp)
NEXT_PUBLIC_EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua_api_key_aqui
EVOLUTION_INSTANCE_NAME=default

# OpenAI
OPENAI_API_KEY=sua_chave_openai_aqui
OPENAI_MODEL=gpt-4o-mini

# Supabase Management API (para templates de email)
SUPABASE_ACCESS_TOKEN=sua_chave_access_token_aqui

# Cron Secret (gerar com: openssl rand -base64 32)
CRON_SECRET_KEY=sua_chave_secreta_forte_aqui
```

### 4. Configure o Banco de Dados

**📖 Instruções Detalhadas**: Veja `INSTALACAO.md` - Passo 5

**Resumo:**
1. Acesse seu projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **SQL Editor**
3. Execute as migrações em ordem da pasta `supabase/migrations/`:
   - Execute `001_initial_schema.sql` primeiro
   - Continue na ordem numérica até `031_add_appointment_created_by_tracking.sql`
   - ⚠️ **Importante**: Execute todas as migrações na ordem correta

### 5. Configure URLs de Redirecionamento no Supabase

1. Acesse **Authentication > URL Configuration**
2. Adicione nas **Redirect URLs**:
   - `http://localhost:3000/**` (desenvolvimento)
   - `https://seu-dominio.com/**` (produção)
   - `http://localhost:3000/auth/confirm`
   - `https://seu-dominio.com/auth/confirm`
3. Configure **Site URL**:
   - Desenvolvimento: `http://localhost:3000`
   - Produção: `https://seu-dominio.com`

### 6. Execute o Projeto

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

Acesse: `http://localhost:3000`

## 🔐 Primeiro Acesso

1. O sistema cria automaticamente um usuário admin no seed (migration 008)
2. Verifique as credenciais padrão na migration `008_seed_data.sql`
3. **Importante**: Altere a senha padrão no primeiro acesso
4. Ou crie um novo usuário admin via dashboard

## 📚 Estrutura do Projeto

```
SistemaMédico/
├── app/                      # App Router Next.js
│   ├── api/                 # API Routes
│   │   ├── admin/           # Rotas administrativas
│   │   ├── appointments/    # Agendamentos
│   │   ├── doctors/         # Médicos
│   │   ├── patients/        # Pacientes
│   │   ├── telemedicine/    # Telemedicina
│   │   ├── whatsapp/        # WhatsApp
│   │   └── follow-up/       # Follow-ups
│   ├── dashboard/           # Dashboard principal
│   │   ├── [role]/          # Dashboards por função
│   │   ├── medicos/         # Gestão de médicos
│   │   ├── pacientes/       # Gestão de pacientes
│   │   ├── agendamentos/    # Agendamentos
│   │   ├── telemedicina/    # Telemedicina
│   │   └── ...
│   ├── portal/              # Portal do paciente
│   └── telemedicina/        # Acesso direto telemedicina
├── components/              # Componentes React
│   ├── ui/                  # Componentes shadcn/ui
│   ├── telemedicine/        # Componentes telemedicina
│   └── ...
├── lib/                     # Bibliotecas e utilitários
│   ├── services/            # Serviços de negócio
│   ├── supabase/            # Clientes Supabase
│   └── validations/         # Schemas Zod
├── supabase/
│   └── migrations/          # Migrações SQL
└── types/                   # Tipos TypeScript
```

## 🔒 Segurança

- ✅ **Row Level Security (RLS)** habilitado em todas as tabelas
- ✅ **Service Role Key** apenas no servidor (nunca no client-side)
- ✅ Validação de permissões em todas as rotas API
- ✅ Headers de segurança configurados
- ✅ Validação de inputs com Zod
- ✅ Proteção CSRF e XSS
- ✅ Autenticação via Supabase Auth

## 🤖 Funcionalidades de IA

### Follow-ups Inteligentes
- Geração automática de mensagens personalizadas baseadas no contexto
- Análise de respostas dos leads
- Previsão de taxa de resposta
- Automações baseadas em eventos

### Telemedicina
- Transcrição automática de consultas
- Resumos gerados por IA
- Consentimento para uso de IA

## 📞 Configuração de Automações (Cron Jobs)

Para que os follow-ups agendados e automações funcionem, configure cron jobs:

### Vercel Cron (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/follow-up/automations/run",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/follow-up/process-scheduled",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Linux Cron (VPS)

```bash
# Adicione ao crontab (crontab -e)
0 2 * * * curl -X POST https://seu-dominio.com/api/follow-up/automations/run -H "Authorization: Bearer SEU_CRON_SECRET_KEY"
*/5 * * * * curl -X POST https://seu-dominio.com/api/follow-up/process-scheduled -H "Authorization: Bearer SEU_CRON_SECRET_KEY"
```

## 🚀 Deploy para Produção

### Checklist Pré-Deploy

- [ ] Todas as variáveis de ambiente configuradas
- [ ] Migrações do banco executadas
- [ ] URLs de redirecionamento configuradas no Supabase
- [ ] Templates de email atualizados (opcional)
- [ ] Evolution API configurada e testada
- [ ] OpenAI API configurada
- [ ] Cron jobs configurados
- [ ] Build de produção testado localmente

### Build e Deploy

```bash
# Build de produção
npm run build

# Testar build localmente
npm start

# Deploy (depende da plataforma)
# Vercel: vercel deploy --prod
# VPS: npm run build && pm2 start npm --name "sistema-medico" -- start
```

## 📖 Documentação Adicional

- **INSTALACAO.md** - Guia completo de instalação passo a passo
- **CHECKLIST_PRODUCAO.md** - Checklist para deploy em produção
- **supabase/migrations/** - Todas as migrações do banco de dados

## 🆘 Troubleshooting

### Problema: Links de email expirados
- Verifique se as URLs estão configuradas corretamente no Supabase (Authentication > URL Configuration)
- Verifique `NEXT_PUBLIC_APP_URL` no `.env.local`

### Problema: Erro ao criar agendamento
- Verifique se todas as migrações foram executadas na ordem correta
- Verifique RLS policies no Supabase Dashboard

### Problema: WhatsApp não envia mensagens
- Verifique `NEXT_PUBLIC_EVOLUTION_API_URL` e `EVOLUTION_API_KEY` no `.env.local`
- Verifique se a instância da Evolution API está ativa
- Veja logs do servidor para mais detalhes

## ⚠️ Importante

- **Nunca** commite credenciais no repositório
- Use variáveis de ambiente no servidor
- `SUPABASE_SERVICE_ROLE_KEY` deve estar **apenas no servidor**
- Mantenha backups regulares do banco de dados
- Teste em ambiente de staging antes de produção

## 📝 Licença

Este projeto é privado e proprietário.

## 🆘 Suporte

Para problemas ou dúvidas, consulte a documentação ou entre em contato com o desenvolvedor.

---

**Versão**: 1.0.0  
**Status**: ✅ Pronto para Produção  
**Última Atualização**: 2025
