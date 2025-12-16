-- Migration 009: Correção de políticas RLS para telemedicine_sessions
-- Permite que admins e médicos criem sessões de telemedicina

-- Remover política antiga
DROP POLICY IF EXISTS "Doctors can create telemedicine sessions" ON telemedicine_sessions;

-- Criar nova política mais permissiva para admins e médicos
CREATE POLICY "Admins and doctors can create telemedicine sessions"
  ON telemedicine_sessions FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) IN ('admin', 'medico')
    OR appointment_id IN (
      SELECT id FROM appointments 
      WHERE doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
    )
  );

-- Adicionar política para permitir que médicos atualizem qualquer sessão relacionada a seus agendamentos
DROP POLICY IF EXISTS "Participants can update active sessions" ON telemedicine_sessions;

CREATE POLICY "Participants can update active sessions"
  ON telemedicine_sessions FOR UPDATE
  USING (
    get_user_role(auth.uid()) IN ('admin', 'medico')
    OR appointment_id IN (
      SELECT id FROM appointments 
      WHERE patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
      OR doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
    )
  );

