-- Migration 040: Criar tabela de logs do sistema
-- Tabela para armazenar logs de debug, info, warn e error do sistema

CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  context JSONB,
  route TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_code TEXT,
  stack_trace TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_system_logs_route ON system_logs(route) WHERE route IS NOT NULL;

-- RLS Policies
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Apenas desenvolvedores podem ver logs
CREATE POLICY "Desenvolvedores podem ver logs do sistema"
  ON system_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'desenvolvedor'
    )
  );

-- Sistema pode criar logs (sem autenticação necessária para inserção)
CREATE POLICY "Sistema pode criar logs"
  ON system_logs FOR INSERT
  WITH CHECK (true);

-- Comentários
COMMENT ON TABLE system_logs IS 'Logs do sistema para debug e monitoramento';
COMMENT ON COLUMN system_logs.level IS 'Nível do log: debug, info, warn, error';
COMMENT ON COLUMN system_logs.message IS 'Mensagem do log';
COMMENT ON COLUMN system_logs.context IS 'Contexto adicional em JSON';
COMMENT ON COLUMN system_logs.route IS 'Rota da API ou página onde ocorreu';
COMMENT ON COLUMN system_logs.user_id IS 'ID do usuário relacionado (se aplicável)';
COMMENT ON COLUMN system_logs.error_code IS 'Código do erro (se aplicável)';
COMMENT ON COLUMN system_logs.stack_trace IS 'Stack trace do erro (se aplicável)';

