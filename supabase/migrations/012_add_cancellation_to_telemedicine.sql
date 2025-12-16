-- Migration 012: Adicionar campo de motivo de cancelamento para sessões de telemedicina

-- Adicionar coluna para motivo de cancelamento
ALTER TABLE telemedicine_sessions
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Criar índice para consultas por status cancelado
CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_cancelled ON telemedicine_sessions(status, cancelled_at)
WHERE status = 'cancelled';

