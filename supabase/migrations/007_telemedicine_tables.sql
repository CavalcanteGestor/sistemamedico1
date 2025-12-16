-- Migration 007: Tabelas de Telemedicina
-- Cria estrutura para consultas de telemedicina

-- Tabela de sessões de telemedicina
CREATE TABLE IF NOT EXISTS telemedicine_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE UNIQUE,
  room_id TEXT UNIQUE NOT NULL,
  room_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'ended', 'cancelled')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  recording_url TEXT,
  recording_duration INTEGER, -- em segundos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de participantes da telemedicina
CREATE TABLE IF NOT EXISTS telemedicine_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES telemedicine_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('doctor', 'patient', 'observer')),
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  video_enabled BOOLEAN DEFAULT TRUE,
  audio_enabled BOOLEAN DEFAULT TRUE,
  screen_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar campo de tipo de consulta na tabela de agendamentos
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS consultation_type TEXT DEFAULT 'presencial' CHECK (consultation_type IN ('presencial', 'telemedicina', 'hibrida'));

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_appointment_id ON telemedicine_sessions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_status ON telemedicine_sessions(status);
CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_room_id ON telemedicine_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_telemedicine_participants_session_id ON telemedicine_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_telemedicine_participants_user_id ON telemedicine_participants(user_id);

-- Habilitar RLS
ALTER TABLE telemedicine_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemedicine_participants ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para telemedicine_sessions
CREATE POLICY "Users can view their own telemedicine sessions"
  ON telemedicine_sessions FOR SELECT
  USING (
    appointment_id IN (
      SELECT id FROM appointments 
      WHERE patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
      OR doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
      OR get_user_role(auth.uid()) IN ('admin', 'medico')
    )
  );

CREATE POLICY "Doctors can create telemedicine sessions"
  ON telemedicine_sessions FOR INSERT
  WITH CHECK (
    appointment_id IN (
      SELECT id FROM appointments 
      WHERE doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
    )
    OR get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Participants can update active sessions"
  ON telemedicine_sessions FOR UPDATE
  USING (
    appointment_id IN (
      SELECT id FROM appointments 
      WHERE patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
      OR doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
    )
    OR get_user_role(auth.uid()) IN ('admin', 'medico')
  );

-- Políticas RLS para telemedicine_participants
CREATE POLICY "Participants can view session participants"
  ON telemedicine_participants FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM telemedicine_sessions
      WHERE appointment_id IN (
        SELECT id FROM appointments 
        WHERE patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
        OR doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
      )
    )
    OR get_user_role(auth.uid()) IN ('admin', 'medico')
  );

CREATE POLICY "Users can join sessions as participants"
  ON telemedicine_participants FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND session_id IN (
      SELECT id FROM telemedicine_sessions
      WHERE appointment_id IN (
        SELECT id FROM appointments 
        WHERE patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
        OR doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can update their own participation"
  ON telemedicine_participants FOR UPDATE
  USING (user_id = auth.uid());

