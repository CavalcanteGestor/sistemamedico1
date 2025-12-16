-- Migration 008: Dados de Exemplo (Seed Data)
-- Popula o banco com dados de exemplo para demonstração

-- IMPORTANTE: Este seed cria dados de exemplo sem usuários reais
-- Para uso em produção, você precisaria criar usuários via Supabase Auth primeiro

-- Limpar dados existentes (opcional - descomente se necessário)
-- TRUNCATE TABLE notifications, financial_transactions, exam_results, prescription_items, 
--   prescriptions, evolutions, physical_exams, anamnesis, medical_record_documents, 
--   medical_record_photos, medical_records, appointments, exams, documents, waitlist,
--   patients, doctors, procedures, insurance_plans, specialties CASCADE;

-- 1. Especialidades (se não existirem)
INSERT INTO specialties (name, description)
VALUES
  ('Cardiologia', 'Especialidade médica que trata do coração e sistema circulatório'),
  ('Dermatologia', 'Especialidade médica que trata da pele, cabelos e unhas'),
  ('Endocrinologia', 'Especialidade médica que trata do sistema endócrino'),
  ('Ginecologia', 'Especialidade médica que trata da saúde da mulher'),
  ('Neurologia', 'Especialidade médica que trata do sistema nervoso'),
  ('Ortopedia', 'Especialidade médica que trata do sistema musculoesquelético'),
  ('Pediatria', 'Especialidade médica que trata de crianças e adolescentes'),
  ('Psiquiatria', 'Especialidade médica que trata da saúde mental'),
  ('Clínica Geral', 'Atenção primária à saúde')
ON CONFLICT (name) DO NOTHING;

-- 2. Configurações da Clínica
INSERT INTO clinic_settings (id, clinic_name, clinic_address, clinic_phone, clinic_email, working_hours)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Clínica Saúde Total',
  'Rua das Flores, 123 - Centro - São Paulo/SP - CEP: 01234-567',
  '(11) 3456-7890',
  'contato@clinicasaudetotal.com.br',
  '{
    "monday": {"open": "08:00", "close": "18:00"},
    "tuesday": {"open": "08:00", "close": "18:00"},
    "wednesday": {"open": "08:00", "close": "18:00"},
    "thursday": {"open": "08:00", "close": "18:00"},
    "friday": {"open": "08:00", "close": "18:00"},
    "saturday": {"open": "08:00", "close": "12:00"},
    "sunday": null
  }'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  clinic_name = EXCLUDED.clinic_name,
  clinic_address = EXCLUDED.clinic_address,
  clinic_phone = EXCLUDED.clinic_phone,
  clinic_email = EXCLUDED.clinic_email;

-- 3. Planos de Saúde
INSERT INTO insurance_plans (name, description)
VALUES
  ('Unimed', 'Plano de saúde Unimed'),
  ('SulAmérica', 'Plano de saúde SulAmérica'),
  ('Amil', 'Plano de saúde Amil'),
  ('Bradesco Saúde', 'Plano de saúde Bradesco'),
  ('Particular', 'Consulta particular'),
  ('SUS', 'Sistema Único de Saúde')
ON CONFLICT (name) DO NOTHING;

-- 4. Procedimentos
INSERT INTO procedures (name, description, price)
VALUES
  ('Consulta Médica Geral', 'Consulta médica de atenção primária', 150.00),
  ('Consulta Cardiológica', 'Consulta com cardiologista', 250.00),
  ('Consulta Dermatológica', 'Consulta com dermatologista', 200.00),
  ('Consulta Neurológica', 'Consulta com neurologista', 280.00),
  ('Consulta de Ginecologia', 'Consulta ginecológica', 220.00),
  ('Consulta Pediátrica', 'Consulta com pediatra', 180.00),
  ('Exame de Sangue', 'Hemograma completo', 80.00),
  ('Eletrocardiograma', 'ECG', 120.00),
  ('Ultrassonografia', 'Ultrassonografia geral', 150.00),
  ('Radiografia', 'Raio-X', 100.00)
ON CONFLICT DO NOTHING;

-- NOTA: Para criar médicos e pacientes com user_id, você precisaria ter usuários criados no auth.users
-- Vou criar médicos e pacientes SEM user_id para demonstração
-- Em produção, você criaria os usuários primeiro via Supabase Auth

-- 5. Médicos (sem user_id - apenas para visualização)
DO $$
DECLARE
  card_id UUID;
  derm_id UUID;
  neuro_id UUID;
  ginec_id UUID;
  ped_id UUID;
BEGIN
  -- Buscar IDs das especialidades
  SELECT id INTO card_id FROM specialties WHERE name = 'Cardiologia';
  SELECT id INTO derm_id FROM specialties WHERE name = 'Dermatologia';
  SELECT id INTO neuro_id FROM specialties WHERE name = 'Neurologia';
  SELECT id INTO ginec_id FROM specialties WHERE name = 'Ginecologia';
  SELECT id INTO ped_id FROM specialties WHERE name = 'Pediatria';

  INSERT INTO doctors (name, crm, specialty_id, phone, email, active)
  VALUES
    ('Dr. João Silva Santos', 'CRM 123456', card_id, '(11) 98765-4321', 'joao.santos@clinicasaudetotal.com.br', TRUE),
    ('Dra. Maria Oliveira Costa', 'CRM 234567', derm_id, '(11) 97654-3210', 'maria.costa@clinicasaudetotal.com.br', TRUE),
    ('Dr. Carlos Eduardo Pereira', 'CRM 345678', neuro_id, '(11) 96543-2109', 'carlos.pereira@clinicasaudetotal.com.br', TRUE),
    ('Dra. Ana Paula Ferreira', 'CRM 456789', ginec_id, '(11) 95432-1098', 'ana.ferreira@clinicasaudetotal.com.br', TRUE),
    ('Dra. Juliana Rodrigues', 'CRM 567890', ped_id, '(11) 94321-0987', 'juliana.rodrigues@clinicasaudetotal.com.br', TRUE),
    ('Dr. Roberto Alves', 'CRM 678901', card_id, '(11) 93210-9876', 'roberto.alves@clinicasaudetotal.com.br', TRUE)
  ON CONFLICT (crm) DO NOTHING;
END $$;

-- 6. Pacientes (sem user_id - apenas para visualização)
INSERT INTO patients (name, cpf, birth_date, phone, email, address, city, state, zip_code, emergency_contact, emergency_phone, allergies, chronic_conditions, portal_access_enabled)
VALUES
  ('Maria da Silva', '12345678901', '1985-03-15', '(11) 99999-1111', 'maria.silva@email.com', 'Av. Paulista, 1000', 'São Paulo', 'SP', '01310-100', 'João da Silva', '(11) 99999-1112', ARRAY['Penicilina'], ARRAY['Hipertensão'], TRUE),
  ('João Pedro Santos', '23456789012', '1990-07-22', '(11) 98888-2222', 'joao.santos@email.com', 'Rua Augusta, 500', 'São Paulo', 'SP', '01305-000', 'Maria Santos', '(11) 98888-2223', ARRAY[]::TEXT[], ARRAY[]::TEXT[], TRUE),
  ('Ana Carolina Lima', '34567890123', '1992-11-08', '(11) 97777-3333', 'ana.lima@email.com', 'Rua Consolação, 200', 'São Paulo', 'SP', '01302-000', 'Carlos Lima', '(11) 97777-3334', ARRAY['Dipirona'], ARRAY['Diabetes'], TRUE),
  ('Pedro Henrique Oliveira', '45678901234', '1988-05-30', '(11) 96666-4444', 'pedro.oliveira@email.com', 'Av. Faria Lima, 1500', 'São Paulo', 'SP', '01452-000', 'Fernanda Oliveira', '(11) 96666-4445', ARRAY[]::TEXT[], ARRAY['Asma'], TRUE),
  ('Fernanda Costa', '56789012345', '1995-09-12', '(11) 95555-5555', 'fernanda.costa@email.com', 'Rua Haddock Lobo, 800', 'São Paulo', 'SP', '01414-000', 'Ricardo Costa', '(11) 95555-5556', ARRAY[]::TEXT[], ARRAY[]::TEXT[], TRUE),
  ('Lucas Martins', '67890123456', '1993-12-25', '(11) 94444-6666', 'lucas.martins@email.com', 'Av. Rebouças, 2000', 'São Paulo', 'SP', '05402-000', 'Patricia Martins', '(11) 94444-6667', ARRAY[]::TEXT[], ARRAY[]::TEXT[], TRUE)
ON CONFLICT (cpf) DO NOTHING;

-- 7. Agendamentos
DO $$
DECLARE
  doctor_ids UUID[];
  patient_ids UUID[];
  apt_date DATE;
  apt_time TIME;
  doc_idx INT;
  pat_idx INT;
BEGIN
  -- Buscar IDs de médicos e pacientes
  SELECT ARRAY_AGG(id) INTO doctor_ids FROM doctors LIMIT 5;
  SELECT ARRAY_AGG(id) INTO patient_ids FROM patients;

  -- Criar agendamentos para os últimos 30 dias e próximos 30 dias
  FOR i IN 1..20 LOOP
    apt_date := CURRENT_DATE + (i - 10); -- -10 a +10 dias
    apt_time := '09:00'::TIME + ((i % 8) * INTERVAL '1 hour'); -- 9h a 16h
    
    doc_idx := (i % array_length(doctor_ids, 1)) + 1;
    pat_idx := (i % array_length(patient_ids, 1)) + 1;
    
    INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, notes, consultation_type)
    VALUES (
      patient_ids[pat_idx],
      doctor_ids[doc_idx],
      apt_date,
      apt_time,
      (CASE 
        WHEN apt_date < CURRENT_DATE THEN 'completed'
        WHEN apt_date = CURRENT_DATE THEN 'confirmed'
        ELSE 'scheduled'
      END)::appointment_status,
      CASE WHEN i % 3 = 0 THEN 'Paciente retorna para acompanhamento' ELSE NULL END,
      CASE (i % 3)
        WHEN 0 THEN 'telemedicina'
        WHEN 1 THEN 'presencial'
        ELSE 'hibrida'
      END
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- 8. Prontuários e dados relacionados
DO $$
DECLARE
  completed_appts UUID[];
  doc_ids UUID[];
  pat_ids UUID[];
  mr_id UUID;
  anam_id UUID;
  phys_id UUID;
  appt RECORD;
  doctor_id UUID;
  patient_id UUID;
BEGIN
  -- Buscar agendamentos completados
  SELECT ARRAY_AGG(id) INTO completed_appts 
  FROM appointments 
  WHERE status = 'completed' 
  LIMIT 5;
  
  SELECT ARRAY_AGG(id) INTO doc_ids FROM doctors LIMIT 3;
  SELECT ARRAY_AGG(id) INTO pat_ids FROM patients LIMIT 3;

  -- Criar prontuários para consultas completadas
  FOR i IN 1..array_length(completed_appts, 1) LOOP
    SELECT a.id, a.doctor_id, a.patient_id 
    INTO appt
    FROM appointments a 
    WHERE a.id = completed_appts[i];
    
    -- Criar prontuário
    INSERT INTO medical_records (patient_id, doctor_id, appointment_id)
    VALUES (appt.patient_id, appt.doctor_id, appt.id)
    RETURNING id INTO mr_id;
    
    -- Criar anamnese
    INSERT INTO anamnesis (
      medical_record_id,
      chief_complaint,
      history_of_present_illness,
      past_medical_history,
      family_history,
      social_history,
      medications,
      allergies,
      review_of_systems,
      lifestyle,
      occupational_history
    )
    VALUES (
      mr_id,
      'Dor de cabeça frequente',
      'Paciente relata cefaleia há aproximadamente 2 semanas, iniciada de forma gradual. A dor é pulsátil, de intensidade moderada a forte, localizada na região temporal bilateral. Piora com esforço físico e melhora parcialmente com repouso.',
      'Hipertensão arterial sistêmica em tratamento há 3 anos. Sem outras intercorrências prévias.',
      'Mãe com diabetes tipo 2. Pai com hipertensão arterial.',
      'Não tabagista, etilismo social (1-2 doses/semana). Pratica atividade física regular (3x/semana).',
      ARRAY['Losartana 50mg - 1 comprimido ao dia', 'Hidroclorotiazida 25mg - 1 comprimido ao dia'],
      ARRAY['Penicilina'],
      '{"cardiaco": false, "respiratorio": false, "gastrointestinal": false, "urinario": false, "neurologico": true, "musculoesqueletico": false, "dermatologico": false}'::jsonb,
      'Sono regular (7-8h/dia), dieta balanceada, prática de exercícios físicos regularmente.',
      'Profissional autônomo na área de tecnologia, trabalha em home office.'
    )
    RETURNING id INTO anam_id;
    
    -- Criar exame físico
    INSERT INTO physical_exams (
      medical_record_id,
      general_appearance,
      vital_signs,
      cardiovascular,
      respiratory,
      abdominal,
      neurological,
      musculoskeletal,
      skin,
      head_and_neck,
      lymph_nodes,
      extremities,
      additional_notes
    )
    VALUES (
      mr_id,
      'Paciente em bom estado geral, eupneico, hidratado, corado, anictérico, afebril.',
      '{
        "blood_pressure_systolic": 130,
        "blood_pressure_diastolic": 85,
        "heart_rate": 72,
        "respiratory_rate": 16,
        "temperature": 36.5,
        "oxygen_saturation": 98,
        "blood_glucose": 95,
        "weight": 75.5,
        "height": 170,
        "bmi": 26.1
      }'::jsonb,
      'Ritmo cardíaco regular, 2 tempos, bulhas normofonéticas, sem sopros.',
      'MVA presente bilateralmente, sem ruídos adventícios.',
      'Abdome globoso, flácido, indolor à palpação, sem visceromegalias.',
      'Glasgow 15/15, pares cranianos íntegros, força muscular preservada, reflexos normais, sem sinais de irritação meníngea.',
      'Amplitude de movimento preservada, sem deformidades aparentes.',
      'Tegumento íntegro, sem lesões cutâneas aparentes.',
      'Sem alterações ao exame.',
      'Linfonodos não palpáveis.',
      'Pulsos periféricos presentes e simétricos, sem edemas.',
      'Exame físico sem outras alterações significativas.'
    )
    RETURNING id INTO phys_id;
    
    -- Criar evolução
    INSERT INTO evolutions (medical_record_id, doctor_id, evolution_date, notes)
    VALUES (
      mr_id,
      appt.doctor_id,
      (SELECT appointment_date FROM appointments WHERE id = appt.id),
      'Paciente em acompanhamento para cefaleia. Mantido tratamento atual. Orientado sobre medidas não farmacológicas. Retorno em 30 dias ou em caso de piora dos sintomas.'
    );
  END LOOP;
END $$;

-- 9. Prescrições
DO $$
DECLARE
  completed_appts UUID[];
  appt RECORD;
  presc_id UUID;
BEGIN
  SELECT ARRAY_AGG(id) INTO completed_appts 
  FROM appointments 
  WHERE status = 'completed' 
  LIMIT 3;

  FOR i IN 1..array_length(completed_appts, 1) LOOP
    SELECT a.id, a.doctor_id, a.patient_id, a.appointment_date
    INTO appt
    FROM appointments a 
    WHERE a.id = completed_appts[i];
    
    INSERT INTO prescriptions (
      patient_id,
      doctor_id,
      prescription_date,
      notes,
      signed
    )
    VALUES (
      appt.patient_id,
      appt.doctor_id,
      appt.appointment_date,
      'Tomar após as refeições. Em caso de dúvidas, procurar o médico.',
      TRUE
    )
    RETURNING id INTO presc_id;
    
    -- Adicionar itens à prescrição
    INSERT INTO prescription_items (
      prescription_id,
      medication_name,
      dosage,
      frequency,
      duration,
      instructions
    )
    VALUES
      (presc_id, 'Paracetamol 750mg', '1 comprimido', 'De 8/8 horas', '5 dias', 'Em caso de dor ou febre'),
      (presc_id, 'Dorflex', '1 comprimido', 'De 6/6 horas se necessário', '3 dias', 'Para alívio de tensão muscular');
  END LOOP;
END $$;

-- 10. Exames
DO $$
DECLARE
  pat_ids UUID[];
  doc_ids UUID[];
  pat_idx INT;
  doc_idx INT;
BEGIN
  SELECT ARRAY_AGG(id) INTO pat_ids FROM patients LIMIT 4;
  SELECT ARRAY_AGG(id) INTO doc_ids FROM doctors LIMIT 3;

  FOR i IN 1..6 LOOP
    pat_idx := (i % array_length(pat_ids, 1)) + 1;
    doc_idx := (i % array_length(doc_ids, 1)) + 1;
    
    INSERT INTO exams (
      patient_id,
      doctor_id,
      exam_type,
      requested_date,
      exam_date,
      status,
      notes
    )
    VALUES (
      pat_ids[pat_idx],
      doc_ids[doc_idx],
      CASE (i % 4)
        WHEN 0 THEN 'Hemograma Completo'
        WHEN 1 THEN 'Eletrocardiograma'
        WHEN 2 THEN 'Glicemia de Jejum'
        ELSE 'Colesterol Total'
      END,
      CURRENT_DATE - (i * 2),
      CASE 
        WHEN i % 2 = 0 THEN CURRENT_DATE - (i * 2) + 3
        ELSE NULL
      END,
      CASE 
        WHEN i % 2 = 0 THEN 'completed'
        ELSE 'requested'
      END,
      CASE 
        WHEN i % 2 = 0 THEN 'Exame realizado, aguardando resultados do laboratório.'
        ELSE 'Exame solicitado, aguardando agendamento.'
      END
    );
  END LOOP;
END $$;

-- 11. Transações Financeiras
DO $$
DECLARE
  completed_appts UUID[];
  pat_ids UUID[];
  proc_ids UUID[];
  ins_ids UUID[];
  appt RECORD;
  i INT;
BEGIN
  SELECT ARRAY_AGG(id) INTO completed_appts 
  FROM appointments 
  WHERE status = 'completed' 
  LIMIT 5;
  
  SELECT ARRAY_AGG(id) INTO pat_ids FROM patients LIMIT 3;
  SELECT ARRAY_AGG(id) INTO proc_ids FROM procedures WHERE name LIKE '%Consulta%' LIMIT 3;
  SELECT ARRAY_AGG(id) INTO ins_ids FROM insurance_plans LIMIT 4;

  i := 1;
  FOR appt IN SELECT * FROM appointments WHERE status = 'completed' LIMIT 5 LOOP
    INSERT INTO financial_transactions (
      patient_id,
      appointment_id,
      procedure_id,
      transaction_type,
      amount,
      payment_method,
      description,
      due_date,
      paid_date,
      installments,
      installment_number,
      insurance_plan_id
    )
    VALUES (
      appt.patient_id,
      appt.id,
      proc_ids[(i % array_length(proc_ids, 1)) + 1],
      'income'::transaction_type,
      CASE (i % 3)
        WHEN 0 THEN 150.00
        WHEN 1 THEN 200.00
        ELSE 250.00
      END,
      (CASE (i % 4)
        WHEN 0 THEN 'dinheiro'
        WHEN 1 THEN 'cartao'
        WHEN 2 THEN 'pix'
        ELSE 'convenio'
      END)::payment_method,
      'Consulta médica realizada em ' || appt.appointment_date::TEXT,
      appt.appointment_date,
      appt.appointment_date,
      1,
      1,
      CASE WHEN i % 2 = 0 THEN ins_ids[(i % array_length(ins_ids, 1)) + 1] ELSE NULL END
    );
    
    i := i + 1;
  END LOOP;
END $$;

-- 12. Notificações de exemplo
-- Nota: Sem user_id, estas notificações não aparecerão para usuários específicos
-- mas podem ser visualizadas no sistema

-- Concluído!
SELECT 'Seed data criado com sucesso! Verifique as tabelas.' as status;

