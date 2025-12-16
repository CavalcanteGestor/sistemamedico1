-- Migration 024: Inserir dados de leads, kanban_columns e agendamentos
-- Esta migração insere os dados dos arquivos SQL fornecidos pelo usuário

-- ============================================
-- 1. Ajustar tabela agendamentos (adicionar campos faltantes)
-- ============================================
DO $$ 
BEGIN
  -- Adicionar campos que podem estar faltando na tabela agendamentos
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'lead_id') THEN
    ALTER TABLE agendamentos ADD COLUMN lead_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'paciente_email') THEN
    ALTER TABLE agendamentos ADD COLUMN paciente_email TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'data_agendamento') THEN
    ALTER TABLE agendamentos ADD COLUMN data_agendamento DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'tipo_consulta') THEN
    ALTER TABLE agendamentos ADD COLUMN tipo_consulta TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'profissional_id') THEN
    ALTER TABLE agendamentos ADD COLUMN profissional_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'valor') THEN
    ALTER TABLE agendamentos ADD COLUMN valor DECIMAL(10, 2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'forma_pagamento') THEN
    ALTER TABLE agendamentos ADD COLUMN forma_pagamento TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'criado_em') THEN
    ALTER TABLE agendamentos ADD COLUMN criado_em TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================
-- 2. Criar tabela kanban_columns se não existir
-- ============================================
CREATE TABLE IF NOT EXISTS kanban_columns (
  id UUID PRIMARY KEY,
  kanban_type TEXT NOT NULL,
  column_key TEXT NOT NULL,
  column_label TEXT NOT NULL,
  column_color TEXT,
  column_order INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status_value TEXT,
  UNIQUE(kanban_type, column_key)
);

-- Índices para kanban_columns
CREATE INDEX IF NOT EXISTS idx_kanban_columns_type ON kanban_columns(kanban_type);
CREATE INDEX IF NOT EXISTS idx_kanban_columns_order ON kanban_columns(kanban_type, column_order);

-- ============================================
-- 3. Inserir dados de kanban_columns
-- ============================================
INSERT INTO "public"."kanban_columns" (
  "id", "kanban_type", "column_key", "column_label", "column_color", 
  "column_order", "is_active", "created_at", "updated_at", "status_value"
) VALUES 
  ('5a537f9c-0d66-4fca-9265-1b996d502b74', 'leads', 'primeiro_contato', 'Primeiro Contato', '#3B82F6', 1, true, '2025-08-14 17:56:26.937793+00', '2025-09-09 19:24:55.145516+00', 'primeiro_contato'),
  ('7d134564-3010-46ae-a80b-fd009abce903', 'leads', 'followup', 'Follow-up', '#F59E0B', 7, true, '2025-09-09 19:24:55.145516+00', '2025-09-09 19:59:28.521518+00', 'followup'),
  ('85867c7e-8baf-45bd-91ad-0b1401cd52c3', 'leads', 'interesse', 'Interesse', '#8B5CF6', 2, true, '2025-08-14 17:56:26.937793+00', '2025-09-09 19:59:06.083725+00', 'interesse'),
  ('869f09d7-bbf6-4e6f-a271-a593f088bb8a', 'leads', 'agendado', 'Agendado', '#F59E0B', 3, true, '2025-08-14 17:56:26.937793+00', '2025-09-09 19:59:07.402666+00', 'agendado'),
  ('9643bb04-c44d-4145-881e-b20fbeb72a75', 'leads', 'realizado', 'Realizado', '#6B7280', 6, true, '2025-09-09 19:57:49.151484+00', '2025-09-09 19:59:26.336561+00', 'realizado'),
  ('d7eed650-a80d-4688-b9f4-45d4bb0716d9', 'leads', 'confirmou_presenca', 'Confirmou Presença', '#10B981', 4, true, '2025-08-14 17:56:26.937793+00', '2025-09-09 19:59:19.623797+00', 'confirmou_presenca'),
  ('edd86c29-0627-48d9-8aba-8658b710377d', 'leads', 'compareceu', 'Compareceu', '#EF4444', 5, true, '2025-08-14 17:56:26.937793+00', '2025-09-09 19:59:23.320515+00', 'compareceu')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- NOTA: Os dados de leads e agendamentos são muito grandes para inserir diretamente aqui.
-- Use os arquivos SQL fornecidos manualmente ou via ferramenta de importação.
-- ============================================
-- Para inserir os dados de leads: execute o arquivo leads_rows (4).sql
-- Para inserir os dados de agendamentos: execute o arquivo agendamentos_rows.sql
--
-- Exemplo usando psql:
-- \i leads_rows\ \(4\).sql
-- \i agendamentos_rows.sql
--
-- Ou via Supabase Dashboard:
-- 1. Vá para o Editor SQL
-- 2. Cole o conteúdo do arquivo
-- 3. Execute
-- ============================================

-- Comentário na tabela
COMMENT ON TABLE kanban_columns IS 'Colunas configuradas para o sistema Kanban de leads';

