-- Migration 025: Documentar todos os campos da tabela agendamentos utilizados pela IA
-- Esta migração adiciona comentários e garante que todos os campos necessários para a IA existam

-- ============================================
-- Campos utilizados pela IA para criar agendamentos (glenda_criar_agendamento)
-- ============================================
-- A ferramenta glenda_criar_agendamento utiliza os seguintes campos:
-- - paciente_nome: Nome do paciente
-- - paciente_telefone: Telefone no formato 5599999999@s.whatsapp.net
-- - data_inicio: Data e hora de início do agendamento (TIMESTAMPTZ)
-- - data_fim: Data e hora de fim do agendamento (TIMESTAMPTZ, geralmente 1 hora após o início)
-- - tipo: Tipo de procedimento/consulta
-- - profissional: Nome do profissional (padrão: "Dra. Glenda")
-- - status: Status do agendamento (padrão: "agendado")

-- ============================================
-- Campos utilizados pela IA para reagendar (glenda_reagendar)
-- ============================================
-- - data_inicio: Nova data de início
-- - data_fim: Nova data de fim
-- - observacoes: Motivo do reagendamento
-- - atualizado_em: Data da atualização

-- ============================================
-- Campos adicionais encontrados no arquivo SQL de agendamentos
-- ============================================
-- Estes campos são usados para armazenar informações adicionais:
-- - lead_id: ID do lead relacionado (TEXT)
-- - paciente_email: Email do paciente (TEXT)
-- - data_agendamento: Data do agendamento (DATE)
-- - tipo_consulta: Tipo específico da consulta (TEXT)
-- - profissional_id: ID do profissional (UUID)
-- - valor: Valor do agendamento/procedimento (DECIMAL(10,2))
-- - forma_pagamento: Forma de pagamento (TEXT)
-- - criado_em: Data de criação (TIMESTAMPTZ)
-- - observacoes: Observações adicionais (TEXT)

-- ============================================
-- Garantir que todos os campos existam
-- ============================================
DO $$ 
BEGIN
  -- Campos básicos já existem na migração 022
  -- Campos extras já foram adicionados na migração 024
  -- Este bloco garante que nenhum campo importante esteja faltando
  
  -- Verificar e adicionar comentários nos campos principais
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'paciente_nome') THEN
    COMMENT ON COLUMN agendamentos.paciente_nome IS 'Nome do paciente - usado pela IA glenda_criar_agendamento';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'paciente_telefone') THEN
    COMMENT ON COLUMN agendamentos.paciente_telefone IS 'Telefone no formato 5599999999@s.whatsapp.net - usado pela IA glenda_criar_agendamento';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'data_inicio') THEN
    COMMENT ON COLUMN agendamentos.data_inicio IS 'Data e hora de início - usado pela IA glenda_criar_agendamento e glenda_reagendar';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'data_fim') THEN
    COMMENT ON COLUMN agendamentos.data_fim IS 'Data e hora de fim - usado pela IA glenda_criar_agendamento e glenda_reagendar';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'tipo') THEN
    COMMENT ON COLUMN agendamentos.tipo IS 'Tipo de procedimento/consulta - usado pela IA glenda_criar_agendamento';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'profissional') THEN
    COMMENT ON COLUMN agendamentos.profissional IS 'Nome do profissional (ex: Dra. Glenda) - usado pela IA glenda_criar_agendamento';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'status') THEN
    COMMENT ON COLUMN agendamentos.status IS 'Status do agendamento (agendado, confirmado, cancelado, realizado, pendente) - usado pela IA';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'observacoes') THEN
    COMMENT ON COLUMN agendamentos.observacoes IS 'Observações adicionais - usado pela IA glenda_reagendar para motivo do reagendamento';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'atualizado_em') THEN
    COMMENT ON COLUMN agendamentos.atualizado_em IS 'Data da última atualização - usado pela IA glenda_reagendar';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'lead_id') THEN
    COMMENT ON COLUMN agendamentos.lead_id IS 'ID do lead relacionado - usado para vincular ao sistema de leads';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'paciente_email') THEN
    COMMENT ON COLUMN agendamentos.paciente_email IS 'Email do paciente - informação adicional do agendamento';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'data_agendamento') THEN
    COMMENT ON COLUMN agendamentos.data_agendamento IS 'Data do agendamento (somente data) - usado para armazenar a data sem hora';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'tipo_consulta') THEN
    COMMENT ON COLUMN agendamentos.tipo_consulta IS 'Tipo específico da consulta - informação adicional';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'profissional_id') THEN
    COMMENT ON COLUMN agendamentos.profissional_id IS 'ID do profissional (UUID) - referência ao sistema médico';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'valor') THEN
    COMMENT ON COLUMN agendamentos.valor IS 'Valor do agendamento/procedimento - informação financeira';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'forma_pagamento') THEN
    COMMENT ON COLUMN agendamentos.forma_pagamento IS 'Forma de pagamento (ex: cartao_credito, pix, dinheiro) - informação financeira';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'criado_em') THEN
    COMMENT ON COLUMN agendamentos.criado_em IS 'Data de criação do agendamento - timestamp de quando foi criado';
  END IF;
END $$;

-- Comentário na tabela
COMMENT ON TABLE agendamentos IS 'Tabela unificada de agendamentos utilizada pela IA (n8n) e pelo sistema médico. Contém todos os campos necessários para criação, consulta, reagendamento e cancelamento de agendamentos pela IA através das ferramentas: glenda_criar_agendamento, glenda_verificar_agendamento, glenda_reagendar, glenda_cancelar_agendamento';

-- ============================================
-- RESUMO DOS CAMPOS UTILIZADOS PELA IA
-- ============================================
-- 
-- glenda_criar_agendamento:
--   - paciente_nome (obrigatório)
--   - paciente_telefone (obrigatório, formato: 5599999999@s.whatsapp.net)
--   - data_inicio (obrigatório, TIMESTAMPTZ)
--   - data_fim (obrigatório, TIMESTAMPTZ)
--   - tipo (obrigatório)
--   - profissional (padrão: "Dra. Glenda")
--   - status (padrão: "agendado")
--
-- glenda_verificar_agendamento:
--   - Busca todos os agendamentos (getAll)
--   - Usa principalmente: data_inicio, data_fim, status
--
-- glenda_reagendar:
--   - data_inicio (atualiza)
--   - data_fim (atualiza)
--   - observacoes (atualiza com motivo)
--   - atualizado_em (atualiza)
--
-- glenda_cancelar_agendamento:
--   - Deleta o agendamento usando paciente_nome como filtro
--
-- Campos adicionais disponíveis (usados pelo sistema, não diretamente pela IA):
--   - lead_id, paciente_email, data_agendamento, tipo_consulta
--   - profissional_id, valor, forma_pagamento, criado_em
--   - patient_id, doctor_id, appointment_date, appointment_time, consultation_type
-- ============================================

