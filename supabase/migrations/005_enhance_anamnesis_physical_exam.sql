-- Migration 005: Melhorias em Anamnese e Exame Físico
-- Adiciona campos para revisão por sistemas e melhora estrutura de sinais vitais

-- Adicionar campo de revisão por sistemas na anamnese (JSONB para flexibilidade)
ALTER TABLE anamnesis 
ADD COLUMN IF NOT EXISTS review_of_systems JSONB DEFAULT '{}';

-- Adicionar campo de hábitos e estilo de vida
ALTER TABLE anamnesis
ADD COLUMN IF NOT EXISTS lifestyle TEXT;

-- Adicionar campo de histórico ocupacional
ALTER TABLE anamnesis
ADD COLUMN IF NOT EXISTS occupational_history TEXT;

-- Melhorar estrutura de sinais vitais no exame físico (já é JSONB, mas vamos garantir campos padrão)
-- Os sinais vitais serão estruturados como JSONB com campos:
-- {
--   "blood_pressure_systolic": 120,
--   "blood_pressure_diastolic": 80,
--   "heart_rate": 72,
--   "respiratory_rate": 16,
--   "temperature": 36.5,
--   "oxygen_saturation": 98,
--   "blood_glucose": 90,
--   "weight": 70.5,
--   "height": 170,
--   "bmi": 24.3
-- }

-- Adicionar campos adicionais ao exame físico
ALTER TABLE physical_exams
ADD COLUMN IF NOT EXISTS head_and_neck TEXT,
ADD COLUMN IF NOT EXISTS lymph_nodes TEXT,
ADD COLUMN IF NOT EXISTS extremities TEXT;

-- Adicionar campo para observações gerais adicionais
ALTER TABLE physical_exams
ADD COLUMN IF NOT EXISTS additional_notes TEXT;

-- Comentários nas colunas para documentação
COMMENT ON COLUMN anamnesis.review_of_systems IS 'Revisão por sistemas em formato JSONB com campos para cada sistema corporal';
COMMENT ON COLUMN physical_exams.vital_signs IS 'Sinais vitais em formato JSONB: blood_pressure_systolic, blood_pressure_diastolic, heart_rate, respiratory_rate, temperature, oxygen_saturation, blood_glucose, weight, height, bmi';

