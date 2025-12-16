-- Migration 029: Adicionar 'desenvolvedor' ao enum user_role
-- IMPORTANTE: Esta migration deve ser executada ANTES de usar 'desenvolvedor' em políticas RLS
-- O PostgreSQL exige que novos valores de enum sejam commitados antes de serem usados

-- Adicionar 'desenvolvedor' ao enum user_role
DO $$ 
BEGIN
  -- Verificar se 'desenvolvedor' já existe no enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'desenvolvedor' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    -- Adicionar o novo valor ao enum
    -- IMPORTANTE: Este valor precisa ser commitado (fim da transação) antes de ser usado
    ALTER TYPE user_role ADD VALUE 'desenvolvedor';
  END IF;
END $$;

-- Comentário explicativo
COMMENT ON TYPE user_role IS 'Tipos de usuário do sistema: admin, medico, enfermeiro, recepcionista, paciente, desenvolvedor';

