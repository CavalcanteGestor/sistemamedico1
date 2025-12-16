-- Migration 011: Suporte completo para gravação e resumo com IA
-- Adiciona campos para gravação e resumo de consultas

-- Adicionar campos na tabela de sessões para gravação
ALTER TABLE telemedicine_sessions
ADD COLUMN IF NOT EXISTS recording_url TEXT,
ADD COLUMN IF NOT EXISTS recording_file_path TEXT,
ADD COLUMN IF NOT EXISTS recording_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS recording_ended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ai_summary TEXT,
ADD COLUMN IF NOT EXISTS ai_summary_generated_at TIMESTAMPTZ;

-- Índice para busca de gravações
CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_recording ON telemedicine_sessions(recording_enabled) WHERE recording_enabled = true;

-- Índice para busca de resumos gerados
CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_ai_summary ON telemedicine_sessions(ai_summary_generated_at) WHERE ai_summary IS NOT NULL;

