-- Migration 035: Adiciona campos de agendamento e recorrência para follow-ups

-- Adicionar campos de agendamento e recorrência
DO $$
BEGIN
  -- Data/hora agendada para envio
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'follow_ups' AND column_name = 'agendado_para') THEN
    ALTER TABLE follow_ups ADD COLUMN agendado_para TIMESTAMPTZ;
  END IF;

  -- Se é recorrente
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'follow_ups' AND column_name = 'recorrente') THEN
    ALTER TABLE follow_ups ADD COLUMN recorrente BOOLEAN DEFAULT FALSE;
  END IF;

  -- Tipo de recorrência (diario, semanal, mensal)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'follow_ups' AND column_name = 'tipo_recorrencia') THEN
    ALTER TABLE follow_ups ADD COLUMN tipo_recorrencia TEXT CHECK (tipo_recorrencia IN ('diario', 'semanal', 'mensal') OR tipo_recorrencia IS NULL);
  END IF;

  -- Intervalo de recorrência (ex: a cada 2 dias, a cada 3 semanas)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'follow_ups' AND column_name = 'intervalo_recorrencia') THEN
    ALTER TABLE follow_ups ADD COLUMN intervalo_recorrencia INTEGER DEFAULT 1;
  END IF;

  -- Data de término da recorrência (opcional)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'follow_ups' AND column_name = 'data_fim_recorrencia') THEN
    ALTER TABLE follow_ups ADD COLUMN data_fim_recorrencia TIMESTAMPTZ;
  END IF;

  -- Próxima execução (para follow-ups recorrentes)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'follow_ups' AND column_name = 'proxima_execucao') THEN
    ALTER TABLE follow_ups ADD COLUMN proxima_execucao TIMESTAMPTZ;
  END IF;

  -- Usar contexto do lead na mensagem
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'follow_ups' AND column_name = 'usar_contexto') THEN
    ALTER TABLE follow_ups ADD COLUMN usar_contexto BOOLEAN DEFAULT TRUE;
  END IF;

  -- Prompt personalizado para IA (se tipo_mensagem = 'ia')
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'follow_ups' AND column_name = 'prompt_personalizado') THEN
    ALTER TABLE follow_ups ADD COLUMN prompt_personalizado TEXT;
  END IF;
END $$;

-- Índices para agendamento
CREATE INDEX IF NOT EXISTS idx_follow_ups_agendado_para ON follow_ups(agendado_para) WHERE agendado_para IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_follow_ups_recorrente ON follow_ups(recorrente) WHERE recorrente = TRUE;
CREATE INDEX IF NOT EXISTS idx_follow_ups_proxima_execucao ON follow_ups(proxima_execucao) WHERE proxima_execucao IS NOT NULL;

