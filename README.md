# Sistema Médico - Gestão Completa para Clínicas

Sistema completo de gestão médica com integração de IA para atendimento automatizado via WhatsApp, follow-ups inteligentes, agendamentos, prontuários e muito mais.

## 🚀 Tecnologias

- **Next.js 16** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Supabase** - Banco de dados PostgreSQL + Auth + Storage
- **OpenAI** - Geração de mensagens e análise de contexto
- **Evolution API** - Integração WhatsApp
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes UI

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta Supabase
- Conta OpenAI (para funcionalidades de IA)
- Evolution API configurada

## ⚙️ Instalação

1. **Clone o repositório**
```bash
git clone <repository-url>
cd SistemaMédico
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure variáveis de ambiente**
```bash
cp env.local.example .env.local
```

Edite `.env.local` com suas credenciais. Veja `env.local.example` para todas as variáveis necessárias.

4. **Execute as migrações do banco**
   
   **📖 Guia Completo:** Veja `GUIA_REPLICACAO_BANCO.md` para instruções detalhadas
   
   **Opção A - Via Dashboard (Recomendado):**
   - Acesse o Supabase Dashboard > SQL Editor
   - Execute as migrações em ordem (pasta `supabase/migrations/`)
   - Execute todos os arquivos numerados de 001 até 030
   
   **Opção B - Via CLI:**
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

5. **Execute o projeto**
```bash
npm run dev
```

Acesse: `http://localhost:3000`

## 🏗️ Build para Produção

```bash
npm run build
npm start
```

## 📁 Estrutura do Projeto

```
├── app/                    # App Router do Next.js
│   ├── api/               # API Routes
│   ├── dashboard/         # Páginas do dashboard
│   └── portal/            # Portal do paciente
├── components/            # Componentes React
├── lib/                   # Bibliotecas e utilitários
│   ├── services/         # Serviços de negócio
│   ├── supabase/         # Clientes Supabase
│   └── validations/      # Schemas Zod
├── supabase/
│   └── migrations/       # Migrações SQL
└── types/                # Tipos TypeScript
```

## 🔐 Segurança

- ✅ Row Level Security (RLS) habilitado em todas as tabelas
- ✅ Service Role Key apenas no servidor
- ✅ Validação de permissões em todas as rotas
- ✅ Headers de segurança configurados
- ✅ Validação de inputs com Zod

## 🤖 Funcionalidades de IA

- **Follow-ups Inteligentes**: Geração automática de mensagens personalizadas
- **Análise de Respostas**: Classificação automática de respostas dos leads
- **Automações**: Follow-ups automáticos baseados em eventos
- **Previsões**: Análise preditiva de taxa de resposta

## 📞 Configuração de Automações

Configure cron jobs para executar as automações e processar follow-ups agendados:

```bash
# Automações de follow-up (diariamente às 09:00 UTC)
POST /api/follow-up/automations/run

# Processar follow-ups agendados e recorrentes (a cada 5 minutos recomendado)
POST /api/follow-up/process-scheduled
Authorization: Bearer SEU_CRON_SECRET_KEY
```

**Configuração do Cron Secret:**
Adicione no seu `.env`:
```
CRON_SECRET_KEY=seu_secret_key_aqui
```

**Exemplo de cron job (Vercel Cron):**
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

## ⚠️ IMPORTANTE

- Nunca commite credenciais no repositório
- Use variáveis de ambiente no servidor
- `SUPABASE_SERVICE_ROLE_KEY` deve estar apenas no servidor
- Veja `CHECKLIST_PRODUCAO.md` antes de fazer deploy

---

**Versão**: 1.0.0  
**Status**: Pronto para produção ✅
