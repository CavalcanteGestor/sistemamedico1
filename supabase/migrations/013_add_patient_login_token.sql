-- Migration 013: Adicionar token de login único para pacientes

-- Adicionar coluna para token de login único
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS login_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS login_token_expires_at TIMESTAMPTZ;

-- Criar índice para buscas rápidas por token
CREATE INDEX IF NOT EXISTS idx_patients_login_token ON patients(login_token)
WHERE login_token IS NOT NULL;

