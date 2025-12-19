-- Migration 031: Adiciona campos de rastreamento de quem criou o agendamento
-- Permite identificar se o agendamento foi criado por admin, secretária ou IA

-- Adicionar campos de rastreamento
DO $$
BEGIN
  -- Campo para armazenar o ID do usuário que criou (se for admin ou secretária)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'created_by_user_id') THEN
    ALTER TABLE appointments ADD COLUMN created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN appointments.created_by_user_id IS 'ID do usuário que criou o agendamento (admin ou secretária). NULL se criado pela IA.';
  END IF;

  -- Campo para armazenar o role de quem criou
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'created_by_role') THEN
    ALTER TABLE appointments ADD COLUMN created_by_role TEXT;
    
    COMMENT ON COLUMN appointments.created_by_role IS 'Role de quem criou: admin, recepcionista, ou null (IA)';
  END IF;

  -- Campo para armazenar o nome de quem criou
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'created_by_name') THEN
    ALTER TABLE appointments ADD COLUMN created_by_name TEXT;
    
    COMMENT ON COLUMN appointments.created_by_name IS 'Nome de quem criou o agendamento. Para admin/secretária vem do profile. Para IA, pode ser "Assistente Virtual" ou similar.';
  END IF;

  -- Campo para identificar o tipo de criação (admin, secretaria, ia)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'created_by_type') THEN
    ALTER TABLE appointments ADD COLUMN created_by_type TEXT DEFAULT 'secretaria';
    
    COMMENT ON COLUMN appointments.created_by_type IS 'Tipo de quem criou: admin, secretaria, ou ia';
  END IF;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_appointments_created_by_user_id ON appointments(created_by_user_id) WHERE created_by_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_created_by_type ON appointments(created_by_type);

