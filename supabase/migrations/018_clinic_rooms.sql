-- Migration 018: Tabela de Salas da Clínica
-- Permite gerenciar salas físicas da clínica e associá-las aos agendamentos

-- Tabela de salas da clínica
CREATE TABLE IF NOT EXISTS clinic_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  capacity INTEGER,
  equipment TEXT[], -- Lista de equipamentos disponíveis na sala
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar campo room_id na tabela de agendamentos
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES clinic_rooms(id) ON DELETE SET NULL;

-- Criar índice para melhorar performance nas consultas
CREATE INDEX IF NOT EXISTS idx_appointments_room_id ON appointments(room_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time_room ON appointments(appointment_date, appointment_time, room_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_clinic_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_clinic_rooms_updated_at
  BEFORE UPDATE ON clinic_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_clinic_rooms_updated_at();

-- Habilitar RLS
ALTER TABLE clinic_rooms ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para clinic_rooms
-- Médicos e admins podem ver todas as salas ativas
CREATE POLICY "Doctors can view active rooms"
  ON clinic_rooms
  FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('admin', 'medico')
    AND active = TRUE
  );

-- Admins podem gerenciar todas as salas
CREATE POLICY "Admins can manage all rooms"
  ON clinic_rooms
  FOR ALL
  USING (
    get_user_role(auth.uid()) = 'admin'
  );

-- Inserir algumas salas padrão
INSERT INTO clinic_rooms (name, description, capacity, equipment) VALUES
  ('Sala 1', 'Sala de consulta padrão', 2, ARRAY['Mesa', 'Cadeiras', 'Computador']),
  ('Sala 2', 'Sala de consulta padrão', 2, ARRAY['Mesa', 'Cadeiras', 'Computador']),
  ('Sala de Exames', 'Sala equipada para exames físicos', 3, ARRAY['Maca', 'Equipamentos de exame', 'Computador']),
  ('Sala de Telemedicina', 'Sala equipada para consultas online', 2, ARRAY['Webcam', 'Microfone', 'Computador', 'Monitor'])
ON CONFLICT (name) DO NOTHING;

