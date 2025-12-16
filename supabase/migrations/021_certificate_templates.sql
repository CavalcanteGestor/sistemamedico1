-- Migration 021: Templates de Atestados
-- Permite criar templates reutilizáveis de atestados médicos

CREATE TABLE IF NOT EXISTS certificate_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  specialty_id UUID REFERENCES specialties(id) ON DELETE SET NULL,
  certificate_type TEXT NOT NULL DEFAULT 'atestado', -- atestado, declaracao, etc
  content TEXT NOT NULL, -- Conteúdo do template com placeholders {{paciente}}, {{data}}, etc
  days_duration INTEGER, -- Duração padrão em dias (se aplicável)
  is_public BOOLEAN DEFAULT FALSE, -- Templates públicos podem ser usados por todos
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_certificate_templates_doctor_id ON certificate_templates(doctor_id);
CREATE INDEX IF NOT EXISTS idx_certificate_templates_specialty_id ON certificate_templates(specialty_id);
CREATE INDEX IF NOT EXISTS idx_certificate_templates_created_by ON certificate_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_certificate_templates_is_public ON certificate_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_certificate_templates_type ON certificate_templates(certificate_type);

-- Trigger para updated_at
CREATE TRIGGER update_certificate_templates_updated_at
  BEFORE UPDATE ON certificate_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Médicos podem ver templates públicos e próprios"
  ON certificate_templates FOR SELECT
  USING (
    is_public = true OR
    created_by = auth.uid() OR
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()) OR
    get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Médicos podem criar templates"
  ON certificate_templates FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) IN ('medico', 'admin')
  );

CREATE POLICY "Médicos podem atualizar seus próprios templates"
  ON certificate_templates FOR UPDATE
  USING (
    created_by = auth.uid() OR
    get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Médicos podem excluir seus próprios templates"
  ON certificate_templates FOR DELETE
  USING (
    created_by = auth.uid() OR
    get_user_role(auth.uid()) = 'admin'
  );

COMMENT ON TABLE certificate_templates IS 'Templates reutilizáveis de atestados médicos';
COMMENT ON COLUMN certificate_templates.content IS 'Conteúdo do template com placeholders como {{paciente}}, {{data}}, {{dias}}, etc';
COMMENT ON COLUMN certificate_templates.is_public IS 'Se true, o template pode ser usado por todos os médicos';

