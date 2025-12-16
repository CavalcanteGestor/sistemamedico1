-- Migration 022: Tabelas para IA e WhatsApp
-- Cria tabelas necessárias para integração com IA do n8n e sistema WhatsApp

-- ============================================
-- 1. Tabela de Agendamentos Unificada (IA + Sistema Médico)
-- ============================================
-- Esta tabela combina os campos necessários para a IA e o sistema médico
CREATE TABLE IF NOT EXISTS agendamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Campos da IA (n8n)
  paciente_nome TEXT,
  paciente_telefone TEXT, -- Formato: 5599999999@s.whatsapp.net
  data_inicio TIMESTAMPTZ,
  data_fim TIMESTAMPTZ,
  tipo TEXT, -- Tipo de procedimento/consulta
  profissional TEXT, -- Nome do profissional
  status TEXT DEFAULT 'agendado', -- agendado, confirmado, cancelado, etc.
  observacoes TEXT,
  atualizado_em TIMESTAMPTZ,
  
  -- Campos do Sistema Médico (integração)
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  appointment_date DATE,
  appointment_time TIME,
  consultation_type TEXT DEFAULT 'presencial', -- presencial, telemedicina, hibrida
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_paciente_telefone ON agendamentos(paciente_telefone);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_inicio ON agendamentos(data_inicio);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_patient_id ON agendamentos(patient_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_doctor_id ON agendamentos(doctor_id);

-- ============================================
-- 2. Tabela de Interesses
-- ============================================
CREATE TABLE IF NOT EXISTS interesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interesse TEXT NOT NULL, -- Procedimento de interesse
  nome TEXT NOT NULL, -- Nome do lead
  numero TEXT NOT NULL, -- Formato: 5599999999@s.whatsapp.net
  data_ultima_msg TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_interesses_numero ON interesses(numero);
CREATE INDEX IF NOT EXISTS idx_interesses_data_ultima_msg ON interesses(data_ultima_msg);

-- ============================================
-- 3. Tabela de Convertidos
-- ============================================
CREATE TABLE IF NOT EXISTS convertidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL, -- Formato: 5599999999@s.whatsapp.net
  produto_servico_convertido TEXT,
  valor_compra DECIMAL(10, 2),
  data_compra TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_convertidos_telefone ON convertidos(telefone);
CREATE INDEX IF NOT EXISTS idx_convertidos_data_compra ON convertidos(data_compra);

-- ============================================
-- 4. Tabela de Mensagens WhatsApp (Histórico)
-- ============================================
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telefone TEXT NOT NULL, -- Número do contato (formato: 5599999999@s.whatsapp.net)
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('sent', 'received')),
  remetente TEXT, -- Quem enviou (número ou nome)
  destinatario TEXT, -- Quem recebeu
  message_id TEXT, -- ID da mensagem na Evolution API
  timestamp TIMESTAMPTZ,
  media_url TEXT, -- URL de mídia se houver
  media_type TEXT, -- image, video, audio, document
  read BOOLEAN DEFAULT FALSE, -- Se foi lida
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_telefone ON whatsapp_messages(telefone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_message_id ON whatsapp_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_read ON whatsapp_messages(read);

-- ============================================
-- 5. Tabela de Atendimento Humano (Controle IA)
-- ============================================
CREATE TABLE IF NOT EXISTS atendimento_humano (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telefone TEXT NOT NULL UNIQUE, -- Número do contato (formato: 5599999999@s.whatsapp.net)
  ativo BOOLEAN DEFAULT TRUE, -- Se atendimento humano está ativo
  responsavel_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Quem está atendendo
  data_ativacao TIMESTAMPTZ DEFAULT NOW(),
  data_desativacao TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_atendimento_humano_telefone ON atendimento_humano(telefone);
CREATE INDEX IF NOT EXISTS idx_atendimento_humano_ativo ON atendimento_humano(ativo);
CREATE INDEX IF NOT EXISTS idx_atendimento_humano_responsavel_id ON atendimento_humano(responsavel_id);

-- ============================================
-- Funções e Triggers
-- ============================================

-- Função para atualizar updated_at automaticamente nas tabelas
CREATE OR REPLACE FUNCTION update_agendamentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger se já existir antes de criar
DROP TRIGGER IF EXISTS update_agendamentos_updated_at ON agendamentos;

CREATE TRIGGER update_agendamentos_updated_at
  BEFORE UPDATE ON agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_agendamentos_updated_at();

CREATE OR REPLACE FUNCTION update_atendimento_humano_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger se já existir antes de criar
DROP TRIGGER IF EXISTS update_atendimento_humano_updated_at ON atendimento_humano;

CREATE TRIGGER update_atendimento_humano_updated_at
  BEFORE UPDATE ON atendimento_humano
  FOR EACH ROW
  EXECUTE FUNCTION update_atendimento_humano_updated_at();

-- ============================================
-- Habilitar RLS em todas as tabelas
-- ============================================
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE interesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE convertidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE atendimento_humano ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Políticas RLS para agendamentos
-- ============================================
-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Staff can view all appointments" ON agendamentos;
DROP POLICY IF EXISTS "Staff can insert appointments" ON agendamentos;
DROP POLICY IF EXISTS "Staff can update appointments" ON agendamentos;
DROP POLICY IF EXISTS "Admins can delete appointments" ON agendamentos;

-- Admins, médicos e recepcionistas podem ver todos os agendamentos
CREATE POLICY "Staff can view all appointments"
  ON agendamentos
  FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('admin', 'medico', 'recepcionista')
  );

-- Admins e recepcionistas podem inserir agendamentos
CREATE POLICY "Staff can insert appointments"
  ON agendamentos
  FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) IN ('admin', 'recepcionista')
  );

-- Admins e recepcionistas podem atualizar agendamentos
CREATE POLICY "Staff can update appointments"
  ON agendamentos
  FOR UPDATE
  USING (
    get_user_role(auth.uid()) IN ('admin', 'recepcionista')
  );

-- Admins podem deletar agendamentos
CREATE POLICY "Admins can delete appointments"
  ON agendamentos
  FOR DELETE
  USING (
    get_user_role(auth.uid()) = 'admin'
  );

-- ============================================
-- Políticas RLS para interesses
-- ============================================
-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Staff can view interests" ON interesses;
DROP POLICY IF EXISTS "System can insert interests" ON interesses;
DROP POLICY IF EXISTS "Staff can update interests" ON interesses;

CREATE POLICY "Staff can view interests"
  ON interesses
  FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('admin', 'medico', 'recepcionista')
  );

CREATE POLICY "System can insert interests"
  ON interesses
  FOR INSERT
  WITH CHECK (true); -- Permite inserção pela IA (service_role)

CREATE POLICY "Staff can update interests"
  ON interesses
  FOR UPDATE
  USING (
    get_user_role(auth.uid()) IN ('admin', 'recepcionista')
  );

-- ============================================
-- Políticas RLS para convertidos
-- ============================================
-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Staff can view converted" ON convertidos;
DROP POLICY IF EXISTS "System can insert converted" ON convertidos;
DROP POLICY IF EXISTS "Staff can update converted" ON convertidos;

CREATE POLICY "Staff can view converted"
  ON convertidos
  FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('admin', 'medico', 'recepcionista')
  );

CREATE POLICY "System can insert converted"
  ON convertidos
  FOR INSERT
  WITH CHECK (true); -- Permite inserção pela IA

CREATE POLICY "Staff can update converted"
  ON convertidos
  FOR UPDATE
  USING (
    get_user_role(auth.uid()) IN ('admin', 'recepcionista')
  );

-- ============================================
-- Políticas RLS para whatsapp_messages
-- ============================================
-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Staff can view messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Staff can insert messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "System can insert messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Staff can update messages" ON whatsapp_messages;

CREATE POLICY "Staff can view messages"
  ON whatsapp_messages
  FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('admin', 'medico', 'recepcionista')
  );

CREATE POLICY "Staff can insert messages"
  ON whatsapp_messages
  FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) IN ('admin', 'medico', 'recepcionista')
  );

CREATE POLICY "System can insert messages"
  ON whatsapp_messages
  FOR INSERT
  WITH CHECK (true); -- Permite inserção via webhook (service_role)

CREATE POLICY "Staff can update messages"
  ON whatsapp_messages
  FOR UPDATE
  USING (
    get_user_role(auth.uid()) IN ('admin', 'recepcionista')
  );

-- ============================================
-- Políticas RLS para atendimento_humano
-- ============================================
-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Staff can view human support" ON atendimento_humano;
DROP POLICY IF EXISTS "Staff can manage human support" ON atendimento_humano;

CREATE POLICY "Staff can view human support"
  ON atendimento_humano
  FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('admin', 'medico', 'recepcionista')
  );

CREATE POLICY "Staff can manage human support"
  ON atendimento_humano
  FOR ALL
  USING (
    get_user_role(auth.uid()) IN ('admin', 'recepcionista')
  );

-- ============================================
-- Comentários nas tabelas (documentação)
-- ============================================
COMMENT ON TABLE agendamentos IS 'Tabela unificada de agendamentos para IA e sistema médico';
COMMENT ON TABLE interesses IS 'Interesses manifestados pelos leads em procedimentos';
COMMENT ON TABLE convertidos IS 'Leads que se tornaram clientes/agendaram';
COMMENT ON TABLE whatsapp_messages IS 'Histórico completo de mensagens WhatsApp';
COMMENT ON TABLE atendimento_humano IS 'Controle de quando atendimento humano está ativo (IA não responde)';

-- ============================================
-- RLS para tabela leads (se já existir)
-- ============================================
-- A tabela leads já existe e não pode ser alterada, apenas adicionar RLS
DO $$ 
BEGIN
  -- Habilitar RLS se a tabela existir
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leads') THEN
    ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

    -- Remover políticas antigas se existirem
    DROP POLICY IF EXISTS "Staff can view leads" ON leads;
    DROP POLICY IF EXISTS "Staff can update leads" ON leads;
    DROP POLICY IF EXISTS "System can insert leads" ON leads;

    -- Políticas RLS para leads
    CREATE POLICY "Staff can view leads"
      ON leads
      FOR SELECT
      USING (
        get_user_role(auth.uid()) IN ('admin', 'medico', 'recepcionista')
      );

    CREATE POLICY "Staff can update leads"
      ON leads
      FOR UPDATE
      USING (
        get_user_role(auth.uid()) IN ('admin', 'recepcionista')
      );

    CREATE POLICY "System can insert leads"
      ON leads
      FOR INSERT
      WITH CHECK (true); -- Permite inserção pela IA (service_role)
  END IF;
END $$;

