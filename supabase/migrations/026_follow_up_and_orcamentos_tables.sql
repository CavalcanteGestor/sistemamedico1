-- Migration 026: Tabelas de Follow-up e Orçamentos
-- Sistema completo de follow-up e orçamentos para leads

-- ============================================
-- 1. Tabela de Templates de Follow-up (criar primeiro por causa da FK)
-- ============================================
CREATE TABLE IF NOT EXISTS follow_up_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  descricao TEXT,
  conteudo TEXT NOT NULL, -- Template da mensagem com variáveis: {{nome}}, {{procedimento}}, etc.
  tipo_follow_up TEXT NOT NULL, -- reativacao, promocao, lembrete_consulta, orcamento, pos_consulta, confirmacao, reagendamento, oferta
  variaveis_disponiveis JSONB DEFAULT '[]', -- Array de variáveis disponíveis: ["nome", "procedimento", "data", "horario"]
  ativa BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_follow_up_templates_tipo ON follow_up_templates(tipo_follow_up);
CREATE INDEX IF NOT EXISTS idx_follow_up_templates_ativa ON follow_up_templates(ativa);

-- ============================================
-- 2. Tabela de Follow-ups (criar depois dos templates)
-- ============================================
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id TEXT, -- ID do lead (TEXT porque leads usa TEXT)
  lead_telefone TEXT NOT NULL, -- Telefone do lead (formato: 5599999999@s.whatsapp.net)
  lead_nome TEXT,
  tipo_follow_up TEXT NOT NULL, -- reativacao, promocao, lembrete_consulta, orcamento, pos_consulta, confirmacao, reagendamento, oferta
  tipo_mensagem TEXT NOT NULL CHECK (tipo_mensagem IN ('fixo', 'ia', 'customizado')), -- fixo (template), ia (gerado), customizado (manual)
  mensagem TEXT NOT NULL, -- Mensagem que foi enviada
  template_id UUID REFERENCES follow_up_templates(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'cancelado', 'falhou')),
  enviado_em TIMESTAMPTZ,
  resposta_recebida BOOLEAN DEFAULT FALSE,
  resposta_em TIMESTAMPTZ,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  observacoes TEXT,
  metadata JSONB DEFAULT '{}', -- Dados adicionais: procedimento, agendamento_id, orcamento_id, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_follow_ups_lead_telefone ON follow_ups(lead_telefone);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_tipo_follow_up ON follow_ups(tipo_follow_up);
CREATE INDEX IF NOT EXISTS idx_follow_ups_criado_por ON follow_ups(criado_por);
CREATE INDEX IF NOT EXISTS idx_follow_ups_enviado_em ON follow_ups(enviado_em);
CREATE INDEX IF NOT EXISTS idx_follow_ups_lead_id ON follow_ups(lead_id);

-- ============================================
-- 3. Tabela de Orçamentos
-- ============================================
CREATE TABLE IF NOT EXISTS orcamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id TEXT, -- ID do lead (TEXT)
  lead_telefone TEXT NOT NULL,
  lead_nome TEXT,
  procedimentos JSONB NOT NULL DEFAULT '[]', -- Array de procedimentos: [{"nome": "Botox", "descricao": "...", "valor": 1500}]
  valores JSONB DEFAULT '{}', -- Detalhamento de valores: {"subtotal": 2000, "desconto": 200, "total": 1800}
  valor_total DECIMAL(10, 2) NOT NULL,
  validade_ate DATE, -- Data de validade do orçamento
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'aceito', 'recusado', 'expirado')),
  enviado_em TIMESTAMPTZ,
  respondido_em TIMESTAMPTZ,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_orcamentos_lead_telefone ON orcamentos(lead_telefone);
CREATE INDEX IF NOT EXISTS idx_orcamentos_status ON orcamentos(status);
CREATE INDEX IF NOT EXISTS idx_orcamentos_validade_ate ON orcamentos(validade_ate);
CREATE INDEX IF NOT EXISTS idx_orcamentos_lead_id ON orcamentos(lead_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_criado_por ON orcamentos(criado_por);

-- ============================================
-- Triggers para atualizar updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_follow_ups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_follow_ups_updated_at
  BEFORE UPDATE ON follow_ups
  FOR EACH ROW
  EXECUTE FUNCTION update_follow_ups_updated_at();

CREATE OR REPLACE FUNCTION update_follow_up_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_follow_up_templates_updated_at
  BEFORE UPDATE ON follow_up_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_follow_up_templates_updated_at();

CREATE OR REPLACE FUNCTION update_orcamentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orcamentos_updated_at
  BEFORE UPDATE ON orcamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_orcamentos_updated_at();

-- ============================================
-- Habilitar RLS
-- ============================================
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Políticas RLS para follow_ups
-- ============================================
CREATE POLICY "Staff can view all follow_ups"
  ON follow_ups
  FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('admin', 'medico', 'recepcionista')
  );

CREATE POLICY "Staff can insert follow_ups"
  ON follow_ups
  FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) IN ('admin', 'medico', 'recepcionista')
  );

CREATE POLICY "Staff can update follow_ups"
  ON follow_ups
  FOR UPDATE
  USING (
    get_user_role(auth.uid()) IN ('admin', 'recepcionista')
  );

CREATE POLICY "Admins can delete follow_ups"
  ON follow_ups
  FOR DELETE
  USING (
    get_user_role(auth.uid()) = 'admin'
  );

-- ============================================
-- Políticas RLS para follow_up_templates
-- ============================================
CREATE POLICY "Staff can view templates"
  ON follow_up_templates
  FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('admin', 'medico', 'recepcionista')
  );

CREATE POLICY "Admins can manage templates"
  ON follow_up_templates
  FOR ALL
  USING (
    get_user_role(auth.uid()) = 'admin'
  );

-- ============================================
-- Políticas RLS para orcamentos
-- ============================================
CREATE POLICY "Staff can view orcamentos"
  ON orcamentos
  FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('admin', 'medico', 'recepcionista')
  );

CREATE POLICY "Staff can insert orcamentos"
  ON orcamentos
  FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) IN ('admin', 'medico', 'recepcionista')
  );

CREATE POLICY "Staff can update orcamentos"
  ON orcamentos
  FOR UPDATE
  USING (
    get_user_role(auth.uid()) IN ('admin', 'recepcionista')
  );

CREATE POLICY "Admins can delete orcamentos"
  ON orcamentos
  FOR DELETE
  USING (
    get_user_role(auth.uid()) = 'admin'
  );

-- ============================================
-- Inserir templates padrão
-- ============================================
INSERT INTO follow_up_templates (nome, descricao, conteudo, tipo_follow_up, variaveis_disponiveis) VALUES
  (
    'Reativação - Lead Inativo',
    'Mensagem para reativar lead que parou de responder',
    'Oi {{nome}}, tudo bem? 😊 Notei que você estava interessado(a) em {{procedimento}} e não conseguimos finalizar seu atendimento. Ainda posso te ajudar? A Dra. Glenda tem alguns horários disponíveis essa semana!',
    'reativacao',
    '["nome", "procedimento"]'::jsonb
  ),
  (
    'Promoção - Procedimento Específico',
    'Oferta promocional para procedimento específico',
    'Oi {{nome}}! 🌟 Temos uma condição especial para {{procedimento}} válida até {{data_validade}}. Você que demonstrou interesse, não pode perder! Quer saber mais?',
    'promocao',
    '["nome", "procedimento", "data_validade"]'::jsonb
  ),
  (
    'Lembrete de Consulta',
    'Lembrar sobre consulta agendada',
    'Oi {{nome}}! 📅 Lembrando que sua consulta com a Dra. Glenda está agendada para amanhã, {{data}} às {{horario}}. Nos vemos lá! Endereço: R. João Machado Gomes Júnior, 282 - Vila Santa Lina, Limeira - SP',
    'lembrete_consulta',
    '["nome", "data", "horario"]'::jsonb
  ),
  (
    'Orçamento Não Respondido',
    'Follow-up para orçamento sem resposta',
    'Oi {{nome}}, tudo bem? 😊 Enviei o orçamento de {{procedimento}} há alguns dias e gostaria de saber se ficou alguma dúvida. Estou aqui para te ajudar!',
    'orcamento',
    '["nome", "procedimento"]'::jsonb
  ),
  (
    'Pós-Consulta',
    'Verificar como está após procedimento',
    'Oi {{nome}}! Como você está se sentindo após o procedimento de {{procedimento}}? Qualquer coisa, estamos aqui! 💙',
    'pos_consulta',
    '["nome", "procedimento"]'::jsonb
  ),
  (
    'Confirmação de Presença',
    'Confirmar comparecimento à consulta',
    'Oi {{nome}}! Sua consulta com a Dra. Glenda está agendada para {{data}} às {{horario}}. Pode confirmar sua presença?',
    'confirmacao',
    '["nome", "data", "horario"]'::jsonb
  ),
  (
    'Reagendamento',
    'Oferecer reagendar consulta cancelada',
    'Oi {{nome}}, vi que não foi possível comparecer à sua consulta. Sem problemas! Gostaria de reagendar? Tenho alguns horários disponíveis essa semana.',
    'reagendamento',
    '["nome"]'::jsonb
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- Comentários nas tabelas
-- ============================================
COMMENT ON TABLE follow_ups IS 'Histórico de follow-ups enviados para leads';
COMMENT ON TABLE follow_up_templates IS 'Templates de mensagens para follow-up';
COMMENT ON TABLE orcamentos IS 'Orçamentos enviados para leads';

COMMENT ON COLUMN follow_ups.tipo_follow_up IS 'Tipo: reativacao, promocao, lembrete_consulta, orcamento, pos_consulta, confirmacao, reagendamento, oferta';
COMMENT ON COLUMN follow_ups.tipo_mensagem IS 'Tipo: fixo (template), ia (gerado por IA), customizado (escrito manualmente)';
COMMENT ON COLUMN follow_ups.metadata IS 'Dados adicionais em JSON: procedimento, agendamento_id, orcamento_id, etc.';
COMMENT ON COLUMN orcamentos.procedimentos IS 'Array JSON de procedimentos com nome, descrição e valor';
COMMENT ON COLUMN orcamentos.valores IS 'Detalhamento de valores: subtotal, desconto, total';

