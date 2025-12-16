-- Migration 010: Melhorias para Telemedicina Robusta
-- Adiciona funcionalidades avançadas de telemedicina

-- Tabela de mensagens do chat durante consulta
CREATE TABLE IF NOT EXISTS telemedicine_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES telemedicine_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'link')),
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de anotações durante consulta
CREATE TABLE IF NOT EXISTS telemedicine_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES telemedicine_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de arquivos compartilhados durante consulta
CREATE TABLE IF NOT EXISTS telemedicine_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES telemedicine_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER, -- em bytes
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de feedback pós-consulta
CREATE TABLE IF NOT EXISTS telemedicine_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES telemedicine_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  technical_quality INTEGER CHECK (technical_quality >= 1 AND technical_quality <= 5),
  audio_quality INTEGER CHECK (audio_quality >= 1 AND audio_quality <= 5),
  video_quality INTEGER CHECK (video_quality >= 1 AND video_quality <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar campos extras na tabela de sessões
ALTER TABLE telemedicine_sessions
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS connection_quality JSONB, -- {latency, bandwidth, video_quality, audio_quality}
ADD COLUMN IF NOT EXISTS lobby_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS recording_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recording_permission_given BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_telemedicine_messages_session_id ON telemedicine_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_telemedicine_messages_created_at ON telemedicine_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_telemedicine_notes_session_id ON telemedicine_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_telemedicine_files_session_id ON telemedicine_files(session_id);
CREATE INDEX IF NOT EXISTS idx_telemedicine_feedback_session_id ON telemedicine_feedback(session_id);

-- Habilitar RLS
ALTER TABLE telemedicine_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemedicine_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemedicine_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemedicine_feedback ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para telemedicine_messages
CREATE POLICY "Participants can view messages from their sessions"
  ON telemedicine_messages FOR SELECT
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

CREATE POLICY "Participants can send messages in their sessions"
  ON telemedicine_messages FOR INSERT
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

-- Políticas RLS para telemedicine_notes
CREATE POLICY "Doctors can manage notes from their sessions"
  ON telemedicine_notes FOR ALL
  USING (
    user_id = auth.uid()
    AND session_id IN (
      SELECT id FROM telemedicine_sessions
      WHERE appointment_id IN (
        SELECT id FROM appointments 
        WHERE doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
      )
    )
    OR get_user_role(auth.uid()) = 'admin'
  );

-- Políticas RLS para telemedicine_files
CREATE POLICY "Participants can view files from their sessions"
  ON telemedicine_files FOR SELECT
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

CREATE POLICY "Participants can upload files to their sessions"
  ON telemedicine_files FOR INSERT
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

-- Políticas RLS para telemedicine_feedback
CREATE POLICY "Participants can view feedback from their sessions"
  ON telemedicine_feedback FOR SELECT
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

CREATE POLICY "Patients can submit feedback for their sessions"
  ON telemedicine_feedback FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND session_id IN (
      SELECT id FROM telemedicine_sessions
      WHERE appointment_id IN (
        SELECT id FROM appointments 
        WHERE patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
      )
    )
  );

