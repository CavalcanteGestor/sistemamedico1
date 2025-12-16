-- Migration 020: Templates de Prescrições
-- Permite criar templates reutilizáveis de prescrições

CREATE TABLE IF NOT EXISTS prescription_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  specialty_id UUID REFERENCES specialties(id) ON DELETE SET NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de itens da prescrição
  notes TEXT,
  is_public BOOLEAN DEFAULT FALSE, -- Templates públicos podem ser usados por todos
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_prescription_templates_doctor_id ON prescription_templates(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescription_templates_specialty_id ON prescription_templates(specialty_id);
CREATE INDEX IF NOT EXISTS idx_prescription_templates_created_by ON prescription_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_prescription_templates_is_public ON prescription_templates(is_public);

-- Trigger para updated_at
CREATE TRIGGER update_prescription_templates_updated_at
  BEFORE UPDATE ON prescription_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE prescription_templates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Médicos podem ver templates públicos e próprios"
  ON prescription_templates FOR SELECT
  USING (
    is_public = true OR
    created_by = auth.uid() OR
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()) OR
    get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Médicos podem criar templates"
  ON prescription_templates FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) IN ('medico', 'admin')
  );

CREATE POLICY "Médicos podem atualizar seus próprios templates"
  ON prescription_templates FOR UPDATE
  USING (
    created_by = auth.uid() OR
    get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Médicos podem excluir seus próprios templates"
  ON prescription_templates FOR DELETE
  USING (
    created_by = auth.uid() OR
    get_user_role(auth.uid()) = 'admin'
  );

COMMENT ON TABLE prescription_templates IS 'Templates reutilizáveis de prescrições médicas';
COMMENT ON COLUMN prescription_templates.items IS 'Array JSON com os itens da prescrição (medicamentos, dosagem, frequência, etc)';
COMMENT ON COLUMN prescription_templates.is_public IS 'Se true, o template pode ser usado por todos os médicos';

