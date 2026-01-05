-- Migration 038: Tabelas para Mensagens Rápidas com Tópicos
-- Permite criar tópicos e mensagens rápidas personalizadas

-- IMPORTANTE: Se você quiser usar 'desenvolvedor' nas políticas RLS abaixo,
-- execute PRIMEIRO a migration 029_add_desenvolvedor_role.sql
-- O PostgreSQL não permite usar um novo valor de enum na mesma transação em que é criado

-- ============================================
-- 1. Tabela de Tópicos de Mensagens Rápidas
-- ============================================
CREATE TABLE IF NOT EXISTS quick_message_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Nome do ícone (lucide-react)
  color TEXT DEFAULT 'blue', -- Cor do badge/tópico
  order_index INTEGER DEFAULT 0, -- Ordem de exibição
  active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. Tabela de Mensagens Rápidas
-- ============================================
CREATE TABLE IF NOT EXISTS quick_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID REFERENCES quick_message_topics(id) ON DELETE CASCADE,
  label TEXT NOT NULL, -- Nome/label da mensagem
  message TEXT NOT NULL, -- Texto da mensagem
  icon TEXT, -- Nome do ícone (lucide-react)
  order_index INTEGER DEFAULT 0, -- Ordem de exibição dentro do tópico
  active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_quick_message_topics_active ON quick_message_topics(active);
CREATE INDEX IF NOT EXISTS idx_quick_message_topics_order ON quick_message_topics(order_index);
CREATE INDEX IF NOT EXISTS idx_quick_messages_topic_id ON quick_messages(topic_id);
CREATE INDEX IF NOT EXISTS idx_quick_messages_active ON quick_messages(active);
CREATE INDEX IF NOT EXISTS idx_quick_messages_order ON quick_messages(order_index);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_quick_message_topics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger se já existir antes de criar
DROP TRIGGER IF EXISTS update_quick_message_topics_updated_at ON quick_message_topics;

CREATE TRIGGER update_quick_message_topics_updated_at
  BEFORE UPDATE ON quick_message_topics
  FOR EACH ROW
  EXECUTE FUNCTION update_quick_message_topics_updated_at();

CREATE OR REPLACE FUNCTION update_quick_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger se já existir antes de criar
DROP TRIGGER IF EXISTS update_quick_messages_updated_at ON quick_messages;

CREATE TRIGGER update_quick_messages_updated_at
  BEFORE UPDATE ON quick_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_quick_messages_updated_at();

-- RLS
ALTER TABLE quick_message_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_messages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tópicos
-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Staff can view quick message topics" ON quick_message_topics;
DROP POLICY IF EXISTS "Staff can manage quick message topics" ON quick_message_topics;

CREATE POLICY "Staff can view quick message topics"
  ON quick_message_topics
  FOR SELECT
  USING (
    -- Se 'desenvolvedor' foi adicionado ao enum (migration 029), inclua aqui: 'desenvolvedor'
    get_user_role(auth.uid()) IN ('admin', 'recepcionista', 'medico')
  );

CREATE POLICY "Staff can manage quick message topics"
  ON quick_message_topics
  FOR ALL
  USING (
    -- Se 'desenvolvedor' foi adicionado ao enum (migration 029), inclua aqui: 'desenvolvedor'
    get_user_role(auth.uid()) IN ('admin', 'recepcionista')
  );

-- Políticas RLS para mensagens
-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Staff can view quick messages" ON quick_messages;
DROP POLICY IF EXISTS "Staff can manage quick messages" ON quick_messages;

CREATE POLICY "Staff can view quick messages"
  ON quick_messages
  FOR SELECT
  USING (
    -- Se 'desenvolvedor' foi adicionado ao enum (migration 029), inclua aqui: 'desenvolvedor'
    get_user_role(auth.uid()) IN ('admin', 'recepcionista', 'medico')
  );

CREATE POLICY "Staff can manage quick messages"
  ON quick_messages
  FOR ALL
  USING (
    -- Se 'desenvolvedor' foi adicionado ao enum (migration 029), inclua aqui: 'desenvolvedor'
    get_user_role(auth.uid()) IN ('admin', 'recepcionista')
  );

-- Dados iniciais (tópicos padrão)
INSERT INTO quick_message_topics (name, description, icon, color, order_index) VALUES
  ('Agendamentos', 'Mensagens relacionadas a agendamentos e consultas', 'Calendar', 'blue', 1),
  ('Resultados', 'Mensagens sobre resultados de exames e laudos', 'FileText', 'green', 2),
  ('Bem-vindo', 'Mensagens de boas-vindas e apresentação', 'MessageSquare', 'purple', 3),
  ('Atendimento', 'Mensagens gerais de atendimento', 'MessageSquare', 'orange', 4)
ON CONFLICT DO NOTHING;

-- Mensagens rápidas padrão
DO $$
DECLARE
  topic_agendamentos_id UUID;
  topic_resultados_id UUID;
  topic_bemvindo_id UUID;
  topic_atendimento_id UUID;
BEGIN
  -- Buscar IDs dos tópicos
  SELECT id INTO topic_agendamentos_id FROM quick_message_topics WHERE name = 'Agendamentos' LIMIT 1;
  SELECT id INTO topic_resultados_id FROM quick_message_topics WHERE name = 'Resultados' LIMIT 1;
  SELECT id INTO topic_bemvindo_id FROM quick_message_topics WHERE name = 'Bem-vindo' LIMIT 1;
  SELECT id INTO topic_atendimento_id FROM quick_message_topics WHERE name = 'Atendimento' LIMIT 1;

  -- Mensagens de Agendamentos
  IF topic_agendamentos_id IS NOT NULL THEN
    INSERT INTO quick_messages (topic_id, label, message, icon, order_index) VALUES
      (topic_agendamentos_id, 'Confirmar Agendamento', 'Olá! Confirmando seu agendamento conosco. Estamos à disposição para esclarecer qualquer dúvida.', 'CheckCircle2', 1),
      (topic_agendamentos_id, 'Lembrete de Consulta', 'Olá! Lembramos que você tem uma consulta agendada conosco. Caso precise reagendar, entre em contato.', 'Clock', 2),
      (topic_agendamentos_id, 'Reagendamento', 'Olá! Gostaria de reagendar sua consulta? Podemos verificar as disponibilidades.', 'Calendar', 3)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Mensagens de Resultados
  IF topic_resultados_id IS NOT NULL THEN
    INSERT INTO quick_messages (topic_id, label, message, icon, order_index) VALUES
      (topic_resultados_id, 'Resultado de Exame', 'Olá! Seu resultado de exame está disponível. Gostaria que enviássemos por aqui ou prefere retirar na clínica?', 'FileText', 1),
      (topic_resultados_id, 'Laudo Disponível', 'Olá! O laudo do seu exame está disponível. Podemos enviar por aqui ou você pode retirar na clínica.', 'FileText', 2)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Mensagens de Bem-vindo
  IF topic_bemvindo_id IS NOT NULL THEN
    INSERT INTO quick_messages (topic_id, label, message, icon, order_index) VALUES
      (topic_bemvindo_id, 'Bem-vindo', 'Olá! Bem-vindo à nossa clínica. Como podemos ajudá-lo hoje?', 'MessageSquare', 1),
      (topic_bemvindo_id, 'Apresentação', 'Olá! Somos da clínica. Estamos aqui para ajudar você. Como podemos ser úteis?', 'MessageSquare', 2)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Mensagens de Atendimento
  IF topic_atendimento_id IS NOT NULL THEN
    INSERT INTO quick_messages (topic_id, label, message, icon, order_index) VALUES
      (topic_atendimento_id, 'Horário de Funcionamento', 'Olá! Nosso horário de funcionamento é de segunda a sexta, das 8h às 18h, e sábados das 8h às 12h.', 'Clock', 1),
      (topic_atendimento_id, 'Localização', 'Olá! Nossa clínica está localizada em [endereço]. Precisa de mais informações sobre como chegar?', 'MapPin', 2)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Comentários
COMMENT ON TABLE quick_message_topics IS 'Tópicos para organizar mensagens rápidas';
COMMENT ON TABLE quick_messages IS 'Mensagens rápidas organizadas por tópicos';

