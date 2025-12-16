-- Migration 026: Tabela para transcrições de telemedicina
-- Armazena transcrições da conversa durante a consulta

CREATE TABLE IF NOT EXISTS telemedicine_transcriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES telemedicine_sessions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  timestamp DECIMAL(10, 2) NOT NULL, -- timestamp em segundos
  speaker TEXT DEFAULT 'unknown' CHECK (speaker IN ('doctor', 'patient', 'unknown')),
  included BOOLEAN DEFAULT TRUE, -- se deve ser incluído no resumo
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_telemedicine_transcriptions_session_id ON telemedicine_transcriptions(session_id);
CREATE INDEX IF NOT EXISTS idx_telemedicine_transcriptions_timestamp ON telemedicine_transcriptions(timestamp);
CREATE INDEX IF NOT EXISTS idx_telemedicine_transcriptions_included ON telemedicine_transcriptions(included) WHERE included = true;

-- Habilitar RLS
ALTER TABLE telemedicine_transcriptions ENABLE ROW LEVEL SECURITY;

-- Política RLS: médicos podem ver transcrições de suas sessões
CREATE POLICY "Doctors can view transcriptions from their sessions"
  ON telemedicine_transcriptions FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM telemedicine_sessions
      WHERE appointment_id IN (
        SELECT id FROM appointments
        WHERE doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
      )
    )
    OR get_user_role(auth.uid()) IN ('admin', 'medico')
  );

-- Política RLS: médicos podem inserir/atualizar transcrições
CREATE POLICY "Doctors can manage transcriptions"
  ON telemedicine_transcriptions FOR ALL
  USING (
    session_id IN (
      SELECT id FROM telemedicine_sessions
      WHERE appointment_id IN (
        SELECT id FROM appointments
        WHERE doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
      )
    )
    OR get_user_role(auth.uid()) IN ('admin', 'medico')
  );

