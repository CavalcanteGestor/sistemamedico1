-- Migration 033: Seed Completo - 6 Meses de Operação
-- Popula o banco com dados realistas simulando 6 meses de operação da clínica
-- ATENÇÃO: Este script cria dados extensos. Execute apenas em ambiente de desenvolvimento/demonstração.

-- ============================================
-- 1. CONFIGURAÇÃO DA CLÍNICA
-- ============================================
INSERT INTO clinic_settings (id, clinic_name, clinic_address, clinic_phone, clinic_email, working_hours)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Lumi - Clínica Médica',
  'Rua das Flores, 123 - Centro - São Paulo/SP - CEP: 01234-567',
  '(11) 3456-7890',
  'contato@lumi.com.br',
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

-- ============================================
-- 2. ESPECIALIDADES
-- ============================================
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
  ('Clínica Geral', 'Atenção primária à saúde'),
  ('Oftalmologia', 'Especialidade médica que trata dos olhos'),
  ('Otorrinolaringologia', 'Especialidade médica que trata de ouvido, nariz e garganta'),
  ('Urologia', 'Especialidade médica que trata do sistema urinário')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 3. PLANOS DE SAÚDE
-- ============================================
INSERT INTO insurance_plans (name, description)
VALUES
  ('Unimed', 'Plano de saúde Unimed'),
  ('SulAmérica', 'Plano de saúde SulAmérica'),
  ('Amil', 'Plano de saúde Amil'),
  ('Bradesco Saúde', 'Plano de saúde Bradesco'),
  ('NotreDame Intermédica', 'Plano de saúde NotreDame'),
  ('Particular', 'Consulta particular'),
  ('SUS', 'Sistema Único de Saúde')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 4. PROCEDIMENTOS
-- ============================================
INSERT INTO procedures (name, description, price)
VALUES
  ('Consulta Médica Geral', 'Consulta médica de atenção primária', 150.00),
  ('Consulta Cardiológica', 'Consulta com cardiologista', 250.00),
  ('Consulta Dermatológica', 'Consulta com dermatologista', 200.00),
  ('Consulta Neurológica', 'Consulta com neurologista', 280.00),
  ('Consulta de Ginecologia', 'Consulta ginecológica', 220.00),
  ('Consulta Pediátrica', 'Consulta com pediatra', 180.00),
  ('Consulta de Ortopedia', 'Consulta ortopédica', 230.00),
  ('Consulta de Oftalmologia', 'Consulta oftalmológica', 200.00),
  ('Exame de Sangue', 'Hemograma completo', 80.00),
  ('Eletrocardiograma', 'ECG', 120.00),
  ('Ultrassonografia', 'Ultrassonografia geral', 150.00),
  ('Radiografia', 'Raio-X', 100.00),
  ('Telemedicina', 'Consulta por telemedicina', 180.00)
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. MÉDICOS (12 médicos)
-- ============================================
DO $$
DECLARE
  spec_ids RECORD;
  doctor_names TEXT[] := ARRAY[
    'Dr. João Silva Santos',
    'Dra. Maria Oliveira Costa',
    'Dr. Carlos Eduardo Pereira',
    'Dra. Ana Paula Ferreira',
    'Dra. Juliana Rodrigues',
    'Dr. Roberto Alves',
    'Dr. Fernando Lima',
    'Dra. Patricia Souza',
    'Dr. Ricardo Mendes',
    'Dra. Camila Alves',
    'Dr. Bruno Costa',
    'Dra. Larissa Martins'
  ];
  crm_numbers TEXT[] := ARRAY[
    'CRM 123456',
    'CRM 234567',
    'CRM 345678',
    'CRM 456789',
    'CRM 567890',
    'CRM 678901',
    'CRM 789012',
    'CRM 890123',
    'CRM 901234',
    'CRM 012345',
    'CRM 135792',
    'CRM 246813'
  ];
  specialties_names TEXT[] := ARRAY[
    'Cardiologia',
    'Dermatologia',
    'Neurologia',
    'Ginecologia',
    'Pediatria',
    'Cardiologia',
    'Ortopedia',
    'Clínica Geral',
    'Endocrinologia',
    'Psiquiatria',
    'Oftalmologia',
    'Otorrinolaringologia'
  ];
  i INT;
  spec_id UUID;
BEGIN
  FOR i IN 1..array_length(doctor_names, 1) LOOP
    SELECT id INTO spec_id FROM specialties WHERE name = specialties_names[i];
    
    INSERT INTO doctors (name, crm, specialty_id, phone, email, active, whatsapp_phone)
    VALUES (
      doctor_names[i],
      crm_numbers[i],
      spec_id,
      '(11) 9' || LPAD((8000 + i)::TEXT, 4, '0') || '-' || LPAD((1000 + i)::TEXT, 4, '0'),
      LOWER(REPLACE(doctor_names[i], ' ', '.')) || '@lumi.com.br',
      TRUE,
      '55119' || LPAD((8000 + i)::TEXT, 4, '0') || LPAD((1000 + i)::TEXT, 4, '0')
    )
    ON CONFLICT (crm) DO NOTHING;
  END LOOP;
END $$;

-- ============================================
-- 6. PACIENTES (50 pacientes)
-- ============================================
DO $$
DECLARE
  patient_names TEXT[] := ARRAY[
    'Maria da Silva', 'João Pedro Santos', 'Ana Carolina Lima', 'Pedro Henrique Oliveira',
    'Fernanda Costa', 'Lucas Martins', 'Juliana Alves', 'Rafael Souza',
    'Camila Rodrigues', 'Bruno Ferreira', 'Patricia Lima', 'Ricardo Mendes',
    'Larissa Costa', 'Gabriel Santos', 'Mariana Oliveira', 'Thiago Pereira',
    'Beatriz Almeida', 'Felipe Rocha', 'Isabela Gomes', 'Gustavo Barbosa',
    'Carolina Dias', 'Rodrigo Nunes', 'Amanda Silva', 'Leonardo Costa',
    'Renata Ferreira', 'Diego Alves', 'Vanessa Lima', 'André Santos',
    'Tatiana Oliveira', 'Marcelo Souza', 'Priscila Martins', 'Fábio Rodrigues',
    'Daniela Alves', 'Eduardo Costa', 'Luciana Silva', 'Marcos Pereira',
    'Simone Lima', 'Paulo Santos', 'Cristina Almeida', 'Roberto Gomes',
    'Sandra Costa', 'Antonio Ferreira', 'Adriana Lima', 'Carlos Mendes',
    'Monica Souza', 'Jose Silva', 'Eliane Alves', 'Francisco Costa',
    'Regina Santos', 'Mario Oliveira'
  ];
  i INT;
  birth_dates DATE[];
  phones TEXT[];
  emails TEXT[];
  cpfs TEXT[];
BEGIN
  -- Gerar dados variados
  FOR i IN 1..array_length(patient_names, 1) LOOP
    birth_dates[i] := CURRENT_DATE - INTERVAL '1 year' * (20 + (i % 50));
    phones[i] := '(11) 9' || LPAD((1000 + i)::TEXT, 4, '0') || '-' || LPAD((5000 + i)::TEXT, 4, '0');
    emails[i] := LOWER(REPLACE(patient_names[i], ' ', '.')) || '@email.com';
    cpfs[i] := LPAD((10000000000 + i)::TEXT, 11, '0');
  END LOOP;

  FOR i IN 1..array_length(patient_names, 1) LOOP
    INSERT INTO patients (
      name, cpf, birth_date, phone, email, 
      address, city, state, zip_code,
      emergency_contact, emergency_phone,
      allergies, chronic_conditions, portal_access_enabled
    )
    VALUES (
      patient_names[i],
      cpfs[i],
      birth_dates[i],
      phones[i],
      emails[i],
      'Rua Exemplo ' || i || ', ' || (100 + i),
      'São Paulo',
      'SP',
      LPAD((10000 + i)::TEXT, 5, '0') || '-000',
      'Contato de Emergência ' || i,
      '(11) 9' || LPAD((2000 + i)::TEXT, 4, '0') || '-' || LPAD((6000 + i)::TEXT, 4, '0'),
      CASE WHEN i % 5 = 0 THEN ARRAY['Penicilina'] ELSE ARRAY[]::TEXT[] END,
      CASE 
        WHEN i % 7 = 0 THEN ARRAY['Hipertensão']
        WHEN i % 7 = 1 THEN ARRAY['Diabetes']
        WHEN i % 7 = 2 THEN ARRAY['Asma']
        ELSE ARRAY[]::TEXT[]
      END,
      TRUE
    )
    ON CONFLICT (cpf) DO NOTHING;
  END LOOP;
END $$;

-- ============================================
-- 7. AGENDAMENTOS (6 meses - ~500 agendamentos)
-- ============================================
DO $$
DECLARE
  doctor_ids UUID[];
  patient_ids UUID[];
  start_date DATE := CURRENT_DATE - INTERVAL '6 months';
  end_date DATE := CURRENT_DATE + INTERVAL '1 month';
  current_date_var DATE;
  apt_time TIME;
  doc_idx INT;
  pat_idx INT;
  status_var TEXT;
  consultation_types TEXT[] := ARRAY['presencial', 'telemedicina', 'hibrida'];
  apt_count INT := 0;
  total_apts INT := 500;
BEGIN
  SELECT ARRAY_AGG(id) INTO doctor_ids FROM doctors;
  SELECT ARRAY_AGG(id) INTO patient_ids FROM patients;
  
  current_date_var := start_date;
  
  WHILE current_date_var <= end_date AND apt_count < total_apts LOOP
    -- Pular domingos
    IF EXTRACT(DOW FROM current_date_var) != 0 THEN
      -- Criar 2-8 agendamentos por dia útil
      FOR i IN 1..(2 + (apt_count % 7)) LOOP
        IF apt_count >= total_apts THEN EXIT; END IF;
        
        apt_time := '08:00'::TIME + ((i * 60)::INTERVAL);
        IF apt_time > '18:00'::TIME THEN
          apt_time := '08:00'::TIME + (((i - 1) * 60)::INTERVAL);
        END IF;
        
        doc_idx := (apt_count % array_length(doctor_ids, 1)) + 1;
        pat_idx := (apt_count % array_length(patient_ids, 1)) + 1;
        
        IF current_date_var < CURRENT_DATE THEN
          status_var := CASE (apt_count % 5)
            WHEN 0 THEN 'completed'
            WHEN 1 THEN 'completed'
            WHEN 2 THEN 'completed'
            WHEN 3 THEN 'cancelled'
            ELSE 'no_show'
          END;
        ELSIF current_date_var = CURRENT_DATE THEN
          status_var := CASE (apt_count % 3)
            WHEN 0 THEN 'confirmed'
            WHEN 1 THEN 'scheduled'
            ELSE 'confirmed'
          END;
        ELSE
          status_var := 'scheduled';
        END IF;
        
        INSERT INTO appointments (
          patient_id, doctor_id, appointment_date, appointment_time,
          status, consultation_type, notes
        )
        VALUES (
          patient_ids[pat_idx],
          doctor_ids[doc_idx],
          current_date_var,
          apt_time,
          status_var::appointment_status,
          consultation_types[(apt_count % 3) + 1],
          CASE WHEN apt_count % 10 = 0 THEN 'Paciente retorna para acompanhamento' ELSE NULL END
        );
        
        apt_count := apt_count + 1;
      END LOOP;
    END IF;
    
    current_date_var := current_date_var + INTERVAL '1 day';
  END LOOP;
END $$;

-- ============================================
-- 8. PRONTUÁRIOS E DADOS RELACIONADOS (para consultas completadas)
-- ============================================
DO $$
DECLARE
  completed_appts UUID[];
  appt RECORD;
  mr_id UUID;
  anam_id UUID;
  phys_id UUID;
  evo_id UUID;
  i INT := 0;
BEGIN
  SELECT ARRAY_AGG(id) INTO completed_appts 
  FROM appointments 
  WHERE status = 'completed' 
  ORDER BY appointment_date DESC
  LIMIT 150;
  
  FOR appt IN 
    SELECT a.*, d.id as doctor_id, p.id as patient_id
    FROM appointments a
    JOIN doctors d ON a.doctor_id = d.id
    JOIN patients p ON a.patient_id = p.id
    WHERE a.status = 'completed'
    ORDER BY a.appointment_date DESC
    LIMIT 150
  LOOP
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
      allergies
    )
    VALUES (
      mr_id,
      CASE (i % 5)
        WHEN 0 THEN 'Dor de cabeça frequente'
        WHEN 1 THEN 'Dor abdominal'
        WHEN 2 THEN 'Tosse persistente'
        WHEN 3 THEN 'Dor nas costas'
        ELSE 'Fadiga e cansaço'
      END,
      'Paciente relata sintomas há aproximadamente ' || (2 + (i % 4)) || ' semanas. Sintomas iniciados de forma gradual.',
      CASE WHEN i % 3 = 0 THEN 'Hipertensão arterial sistêmica em tratamento.' ELSE 'Sem intercorrências prévias.' END,
      'Histórico familiar sem alterações significativas.',
      'Não tabagista, etilismo social. Pratica atividade física regularmente.',
      ARRAY['Losartana 50mg - 1 comprimido ao dia'],
      ARRAY['Penicilina']
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
      neurological
    )
    VALUES (
      mr_id,
      'Paciente em bom estado geral, eupneico, hidratado, corado.',
      jsonb_build_object(
        'blood_pressure_systolic', 120 + (i % 20),
        'blood_pressure_diastolic', 70 + (i % 15),
        'heart_rate', 70 + (i % 20),
        'respiratory_rate', 16,
        'temperature', 36.5 + ((i % 5) * 0.1),
        'weight', 65 + (i % 30),
        'height', 160 + (i % 20)
      ),
      'Ritmo cardíaco regular, bulhas normofonéticas.',
      'MVA presente bilateralmente, sem ruídos adventícios.',
      'Abdome flácido, indolor à palpação.',
      'Exame neurológico sem alterações.'
    )
    RETURNING id INTO phys_id;
    
    -- Criar evolução
    INSERT INTO evolutions (medical_record_id, doctor_id, evolution_date, notes)
    VALUES (
      mr_id,
      appt.doctor_id,
      appt.appointment_date,
      'Paciente em acompanhamento. Mantido tratamento atual. Orientado sobre medidas não farmacológicas. Retorno em 30 dias.'
    );
    
    i := i + 1;
  END LOOP;
END $$;

-- ============================================
-- 9. PRESCRIÇÕES (100 prescrições)
-- ============================================
DO $$
DECLARE
  completed_appts UUID[];
  appt RECORD;
  presc_id UUID;
  medications TEXT[][] := ARRAY[
    ARRAY['Paracetamol 750mg', '1 comprimido', 'De 8/8 horas', '5 dias'],
    ARRAY['Ibuprofeno 400mg', '1 comprimido', 'De 6/6 horas', '7 dias'],
    ARRAY['Amoxicilina 500mg', '1 cápsula', 'De 8/8 horas', '10 dias'],
    ARRAY['Dipirona 500mg', '1 comprimido', 'De 6/6 horas se necessário', '3 dias'],
    ARRAY['Losartana 50mg', '1 comprimido', '1x ao dia', 'Uso contínuo']
  ];
  i INT := 0;
BEGIN
  FOR appt IN 
    SELECT a.*, d.id as doctor_id, p.id as patient_id
    FROM appointments a
    JOIN doctors d ON a.doctor_id = d.id
    JOIN patients p ON a.patient_id = p.id
    WHERE a.status = 'completed'
    ORDER BY a.appointment_date DESC
    LIMIT 100
  LOOP
    INSERT INTO prescriptions (
      patient_id, doctor_id, prescription_date, notes, signed
    )
    VALUES (
      appt.patient_id,
      appt.doctor_id,
      appt.appointment_date,
      'Tomar após as refeições. Em caso de dúvidas, procurar o médico.',
      TRUE
    )
    RETURNING id INTO presc_id;
    
    -- Adicionar 1-3 itens à prescrição
    FOR j IN 1..(1 + (i % 3)) LOOP
      INSERT INTO prescription_items (
        prescription_id, medication_name, dosage, frequency, duration, instructions
      )
      VALUES (
        presc_id,
        medications[(i + j) % array_length(medications, 1) + 1][1],
        medications[(i + j) % array_length(medications, 1) + 1][2],
        medications[(i + j) % array_length(medications, 1) + 1][3],
        medications[(i + j) % array_length(medications, 1) + 1][4],
        'Seguir orientações médicas'
      );
    END LOOP;
    
    i := i + 1;
  END LOOP;
END $$;

-- ============================================
-- 10. EXAMES (200 exames)
-- ============================================
DO $$
DECLARE
  pat_ids UUID[];
  doc_ids UUID[];
  exam_types TEXT[] := ARRAY[
    'Hemograma Completo',
    'Glicemia de Jejum',
    'Colesterol Total',
    'Eletrocardiograma',
    'Ultrassonografia Abdominal',
    'Radiografia de Tórax',
    'TSH e T4 Livre',
    'Creatinina',
    'Ácido Úrico',
    'Vitamina D'
  ];
  i INT;
  pat_idx INT;
  doc_idx INT;
  exam_date DATE;
BEGIN
  SELECT ARRAY_AGG(id) INTO pat_ids FROM patients;
  SELECT ARRAY_AGG(id) INTO doc_ids FROM doctors;
  
  FOR i IN 1..200 LOOP
    pat_idx := (i % array_length(pat_ids, 1)) + 1;
    doc_idx := (i % array_length(doc_ids, 1)) + 1;
    exam_date := CURRENT_DATE - INTERVAL '1 day' * (i % 180);
    
    INSERT INTO exams (
      patient_id, doctor_id, exam_type, requested_date,
      exam_date, status, notes
    )
    VALUES (
      pat_ids[pat_idx],
      doc_ids[doc_idx],
      exam_types[(i % array_length(exam_types, 1)) + 1],
      exam_date - INTERVAL '3 days',
      CASE WHEN i % 2 = 0 THEN exam_date ELSE NULL END,
      CASE 
        WHEN i % 2 = 0 THEN 'completed'
        WHEN i % 3 = 0 THEN 'in_progress'
        ELSE 'requested'
      END,
      CASE 
        WHEN i % 2 = 0 THEN 'Exame realizado, resultados normais.'
        ELSE 'Exame solicitado, aguardando agendamento.'
      END
    );
  END LOOP;
END $$;

-- ============================================
-- 11. TRANSAÇÕES FINANCEIRAS (300 transações)
-- ============================================
DO $$
DECLARE
  completed_appts UUID[];
  proc_ids UUID[];
  ins_ids UUID[];
  appt RECORD;
  payment_methods TEXT[] := ARRAY['dinheiro', 'cartao', 'pix', 'convenio'];
  i INT := 0;
BEGIN
  SELECT ARRAY_AGG(id) INTO completed_appts 
  FROM appointments 
  WHERE status = 'completed'
  ORDER BY appointment_date DESC
  LIMIT 300;
  
  SELECT ARRAY_AGG(id) INTO proc_ids FROM procedures WHERE name LIKE '%Consulta%';
  SELECT ARRAY_AGG(id) INTO ins_ids FROM insurance_plans;
  
  FOR appt IN 
    SELECT * FROM appointments 
    WHERE status = 'completed'
    ORDER BY appointment_date DESC
    LIMIT 300
  LOOP
    INSERT INTO financial_transactions (
      patient_id, appointment_id, procedure_id,
      transaction_type, amount, payment_method,
      description, due_date, paid_date,
      installments, installment_number, insurance_plan_id
    )
    VALUES (
      appt.patient_id,
      appt.id,
      proc_ids[(i % array_length(proc_ids, 1)) + 1],
      'income'::transaction_type,
      CASE (i % 4)
        WHEN 0 THEN 150.00
        WHEN 1 THEN 200.00
        WHEN 2 THEN 250.00
        ELSE 180.00
      END,
      payment_methods[(i % array_length(payment_methods, 1)) + 1]::payment_method,
      'Consulta médica realizada em ' || appt.appointment_date::TEXT,
      appt.appointment_date,
      appt.appointment_date,
      1,
      1,
      CASE WHEN i % 3 = 0 THEN ins_ids[(i % array_length(ins_ids, 1)) + 1] ELSE NULL END
    );
    
    i := i + 1;
  END LOOP;
END $$;

-- ============================================
-- 12. SESSÕES DE TELEMEDICINA (50 sessões)
-- ============================================
DO $$
DECLARE
  telemed_appts UUID[];
  appt RECORD;
  session_id UUID;
  room_id TEXT;
  i INT := 0;
BEGIN
  SELECT ARRAY_AGG(id) INTO telemed_appts
  FROM appointments
  WHERE consultation_type IN ('telemedicina', 'hibrida')
    AND status = 'completed'
  LIMIT 50;
  
  FOR appt IN
    SELECT * FROM appointments
    WHERE consultation_type IN ('telemedicina', 'hibrida')
      AND status = 'completed'
    LIMIT 50
  LOOP
    room_id := 'room-' || appt.id::TEXT;
    
    INSERT INTO telemedicine_sessions (
      appointment_id, room_id, room_url, status,
      started_at, ended_at, recording_duration
    )
    VALUES (
      appt.id,
      room_id,
      'https://lumi.com/telemedicina/' || appt.id::TEXT,
      CASE 
        WHEN appt.appointment_date < CURRENT_DATE - INTERVAL '1 day' THEN 'ended'
        ELSE 'active'
      END,
      appt.appointment_date + appt.appointment_time,
      appt.appointment_date + appt.appointment_time + INTERVAL '30 minutes',
      (20 + (i % 40)) * 60 -- Duração entre 20-60 minutos
    )
    RETURNING id INTO session_id;
    
    i := i + 1;
  END LOOP;
END $$;

-- ============================================
-- 13. LEADS (100 leads)
-- ============================================
DO $$
DECLARE
  lead_names TEXT[] := ARRAY[
    'Ana Silva', 'Carlos Santos', 'Maria Oliveira', 'João Costa',
    'Patricia Lima', 'Roberto Souza', 'Juliana Alves', 'Fernando Pereira',
    'Camila Rodrigues', 'Ricardo Mendes', 'Larissa Ferreira', 'Bruno Gomes',
    'Amanda Martins', 'Thiago Barbosa', 'Beatriz Dias', 'Felipe Nunes',
    'Isabela Rocha', 'Gustavo Almeida', 'Carolina Silva', 'Rodrigo Costa'
  ];
  telefones TEXT[];
  i INT;
  etapas TEXT[] := ARRAY['contato_inicial', 'interesse', 'orcamento', 'agendamento', 'convertido'];
  status_lead TEXT[] := ARRAY['novo', 'em_atendimento', 'agendado', 'convertido', 'perdido'];
BEGIN
  FOR i IN 1..100 LOOP
    telefones[i] := '55119' || LPAD((9000 + i)::TEXT, 4, '0') || LPAD((7000 + i)::TEXT, 4, '0');
    
    INSERT INTO leads (
      nome, telefone, email, etapa, status,
      origem, observacoes, created_at
    )
    VALUES (
      lead_names[(i % array_length(lead_names, 1)) + 1] || ' ' || i,
      telefones[i],
      'lead' || i || '@email.com',
      etapas[(i % array_length(etapas, 1)) + 1],
      status_lead[(i % array_length(status_lead, 1)) + 1],
      CASE (i % 4)
        WHEN 0 THEN 'whatsapp'
        WHEN 1 THEN 'site'
        WHEN 2 THEN 'indicacao'
        ELSE 'telefone'
      END,
      'Lead criado automaticamente para demonstração',
      CURRENT_DATE - INTERVAL '1 day' * (i % 180)
    )
    ON CONFLICT (telefone) DO NOTHING;
  END LOOP;
END $$;

-- ============================================
-- 14. FOLLOW-UPS (150 follow-ups)
-- ============================================
DO $$
DECLARE
  lead_telefones TEXT[];
  template_ids UUID[];
  tipos TEXT[] := ARRAY['reativacao', 'promocao', 'lembrete_consulta', 'orcamento', 'pos_consulta'];
  i INT;
BEGIN
  SELECT ARRAY_AGG(telefone) INTO lead_telefones FROM leads LIMIT 50;
  SELECT ARRAY_AGG(id) INTO template_ids FROM follow_up_templates LIMIT 5;
  
  FOR i IN 1..150 LOOP
    INSERT INTO follow_ups (
      lead_telefone, lead_nome, tipo_follow_up,
      tipo_mensagem, mensagem, template_id,
      status, enviado_em, criado_em
    )
    VALUES (
      lead_telefones[(i % array_length(lead_telefones, 1)) + 1],
      'Lead ' || i,
      tipos[(i % array_length(tipos, 1)) + 1],
      CASE (i % 3)
        WHEN 0 THEN 'fixo'
        WHEN 1 THEN 'ia'
        ELSE 'customizado'
      END,
      'Mensagem de follow-up automática para demonstração do sistema.',
      template_ids[(i % array_length(template_ids, 1)) + 1],
      CASE (i % 4)
        WHEN 0 THEN 'enviado'
        WHEN 1 THEN 'enviado'
        WHEN 2 THEN 'pendente'
        ELSE 'cancelado'
      END,
      CASE WHEN i % 3 != 2 THEN CURRENT_DATE - INTERVAL '1 day' * (i % 30) ELSE NULL END,
      CURRENT_DATE - INTERVAL '1 day' * (i % 60)
    );
  END LOOP;
END $$;

-- ============================================
-- 15. ORÇAMENTOS (80 orçamentos)
-- ============================================
DO $$
DECLARE
  lead_telefones TEXT[];
  procedimentos_exemplo JSONB;
  i INT;
BEGIN
  SELECT ARRAY_AGG(telefone) INTO lead_telefones FROM leads LIMIT 40;
  
  procedimentos_exemplo := '[
    {"nome": "Consulta Cardiológica", "descricao": "Consulta com cardiologista", "valor": 250.00},
    {"nome": "Eletrocardiograma", "descricao": "Exame de ECG", "valor": 120.00}
  ]'::jsonb;
  
  FOR i IN 1..80 LOOP
    INSERT INTO orcamentos (
      lead_telefone, lead_nome, procedimentos,
      valores, valor_total, validade_ate,
      status, enviado_em, criado_em
    )
    VALUES (
      lead_telefones[(i % array_length(lead_telefones, 1)) + 1],
      'Lead ' || i,
      procedimentos_exemplo,
      jsonb_build_object(
        'subtotal', 370.00,
        'desconto', CASE WHEN i % 2 = 0 THEN 50.00 ELSE 0 END,
        'total', CASE WHEN i % 2 = 0 THEN 320.00 ELSE 370.00 END
      ),
      CASE WHEN i % 2 = 0 THEN 320.00 ELSE 370.00 END,
      CURRENT_DATE + INTERVAL '15 days',
      CASE (i % 5)
        WHEN 0 THEN 'aceito'
        WHEN 1 THEN 'enviado'
        WHEN 2 THEN 'pendente'
        WHEN 3 THEN 'recusado'
        ELSE 'expirado'
      END,
      CASE WHEN i % 3 != 2 THEN CURRENT_DATE - INTERVAL '1 day' * (i % 45) ELSE NULL END,
      CURRENT_DATE - INTERVAL '1 day' * (i % 90)
    );
  END LOOP;
END $$;

-- ============================================
-- 16. NOTIFICAÇÕES (200 notificações)
-- ============================================
-- Nota: Notificações precisam de user_id, então serão criadas apenas como exemplo
-- Em produção, você criaria notificações para usuários reais

-- ============================================
-- RESUMO FINAL
-- ============================================
DO $$
DECLARE
  total_doctors INT;
  total_patients INT;
  total_appointments INT;
  total_prescriptions INT;
  total_exams INT;
  total_transactions INT;
  total_leads INT;
  total_followups INT;
BEGIN
  SELECT COUNT(*) INTO total_doctors FROM doctors;
  SELECT COUNT(*) INTO total_patients FROM patients;
  SELECT COUNT(*) INTO total_appointments FROM appointments;
  SELECT COUNT(*) INTO total_prescriptions FROM prescriptions;
  SELECT COUNT(*) INTO total_exams FROM exams;
  SELECT COUNT(*) INTO total_transactions FROM financial_transactions;
  SELECT COUNT(*) INTO total_leads FROM leads;
  SELECT COUNT(*) INTO total_followups FROM follow_ups;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SEED COMPLETO - 6 MESES DE OPERAÇÃO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Médicos: %', total_doctors;
  RAISE NOTICE 'Pacientes: %', total_patients;
  RAISE NOTICE 'Agendamentos: %', total_appointments;
  RAISE NOTICE 'Prescrições: %', total_prescriptions;
  RAISE NOTICE 'Exames: %', total_exams;
  RAISE NOTICE 'Transações Financeiras: %', total_transactions;
  RAISE NOTICE 'Leads: %', total_leads;
  RAISE NOTICE 'Follow-ups: %', total_followups;
  RAISE NOTICE '========================================';
END $$;

SELECT 'Seed completo de 6 meses criado com sucesso! ✅' as status;

