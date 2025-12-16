-- Migration 028: Adiciona campo de telefone WhatsApp para médicos
-- Permite que médicos recebam notificações de agendamentos via WhatsApp

-- Adicionar campo whatsapp_phone na tabela doctors
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'doctors' AND column_name = 'whatsapp_phone') THEN
    ALTER TABLE doctors ADD COLUMN whatsapp_phone TEXT;
    
    -- Comentário explicativo
    COMMENT ON COLUMN doctors.whatsapp_phone IS 'Telefone WhatsApp do médico no formato 5599999999@s.whatsapp.net. Usado para enviar notificações de agendamentos.';
  END IF;
END $$;

-- Criar índice para busca
CREATE INDEX IF NOT EXISTS idx_doctors_whatsapp_phone ON doctors(whatsapp_phone) WHERE whatsapp_phone IS NOT NULL;

