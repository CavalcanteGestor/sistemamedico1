-- Migration 032: Índices para Performance
-- Adiciona índices em tabelas frequentemente consultadas para melhorar performance

-- Índices para appointments (consultas frequentes por médico e data)
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date 
  ON appointments(doctor_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_appointments_status 
  ON appointments(status);

CREATE INDEX IF NOT EXISTS idx_appointments_patient 
  ON appointments(patient_id);

CREATE INDEX IF NOT EXISTS idx_appointments_date_range 
  ON appointments(appointment_date) 
  WHERE appointment_date >= CURRENT_DATE;

-- Índices para patients (busca por email e CPF)
CREATE INDEX IF NOT EXISTS idx_patients_email 
  ON patients(email) 
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patients_cpf 
  ON patients(cpf) 
  WHERE cpf IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patients_user_id 
  ON patients(user_id) 
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patients_login_token 
  ON patients(login_token) 
  WHERE login_token IS NOT NULL;

-- Índices para follow_ups (processamento agendado)
CREATE INDEX IF NOT EXISTS idx_follow_ups_next_execution 
  ON follow_ups(proxima_execucao) 
  WHERE status = 'pendente' AND proxima_execucao IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_follow_ups_lead 
  ON follow_ups(lead_id);

CREATE INDEX IF NOT EXISTS idx_follow_ups_status 
  ON follow_ups(status);

-- Índices para telemedicine_sessions
CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_appointment 
  ON telemedicine_sessions(appointment_id);

CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_status 
  ON telemedicine_sessions(status);

CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_created 
  ON telemedicine_sessions(created_at DESC);

-- Índices para leads
CREATE INDEX IF NOT EXISTS idx_leads_status 
  ON leads(status);

CREATE INDEX IF NOT EXISTS idx_leads_phone 
  ON leads(phone) 
  WHERE phone IS NOT NULL;

-- Índices para profiles (busca por role)
CREATE INDEX IF NOT EXISTS idx_profiles_role 
  ON profiles(role);

CREATE INDEX IF NOT EXISTS idx_profiles_email 
  ON profiles(email);

-- Índices para medical_records
CREATE INDEX IF NOT EXISTS idx_medical_records_patient 
  ON medical_records(patient_id);

CREATE INDEX IF NOT EXISTS idx_medical_records_appointment 
  ON medical_records(appointment_id) 
  WHERE appointment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_medical_records_created 
  ON medical_records(created_at DESC);

-- Índices para prescriptions
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient 
  ON prescriptions(patient_id);

CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor 
  ON prescriptions(doctor_id);

CREATE INDEX IF NOT EXISTS idx_prescriptions_created 
  ON prescriptions(created_at DESC);

-- Índices para notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user 
  ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_read 
  ON notifications(user_id, read) 
  WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_created 
  ON notifications(created_at DESC);

-- Índices para whatsapp_messages
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone 
  ON whatsapp_messages(phone);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created 
  ON whatsapp_messages(created_at DESC);

-- Comentários explicativos
COMMENT ON INDEX idx_appointments_doctor_date IS 'Acelera busca de agendamentos por médico e data';
COMMENT ON INDEX idx_follow_ups_next_execution IS 'Acelera processamento de follow-ups agendados';
COMMENT ON INDEX idx_patients_login_token IS 'Acelera busca de pacientes por token de login';

