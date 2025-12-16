-- Migration 006: Melhorias em Notificações
-- Adiciona campos para tipos de notificação e agendamento

-- Adicionar campos na tabela de notificações
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS notification_type TEXT DEFAULT 'in-app',
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- Criar tabela de preferências de notificação
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  push_enabled BOOLEAN DEFAULT TRUE,
  appointment_reminders BOOLEAN DEFAULT TRUE,
  exam_results BOOLEAN DEFAULT TRUE,
  prescription_reminders BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índice para busca por user_id
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Habilitar RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para notification_preferences
CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Comentários
COMMENT ON COLUMN notifications.notification_type IS 'Tipo de notificação: in-app, email, sms, push';
COMMENT ON COLUMN notifications.scheduled_at IS 'Data/hora agendada para envio da notificação';
COMMENT ON COLUMN notifications.sent_at IS 'Data/hora em que a notificação foi enviada';

