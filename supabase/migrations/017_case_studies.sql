-- Case Studies (Estudos de Caso) tables
-- Permite que médicos compartilhem e discutam casos clínicos

-- Case Studies table (tabela principal)
CREATE TABLE case_studies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  clinical_case TEXT NOT NULL, -- Descrição detalhada do caso clínico
  diagnosis TEXT,
  treatment TEXT,
  outcome TEXT,
  specialty_id UUID REFERENCES specialties(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN DEFAULT FALSE, -- Se o caso é anônimo
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Case Study Comments table (comentários dos médicos)
CREATE TABLE case_study_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_study_id UUID REFERENCES case_studies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  comment_text TEXT NOT NULL,
  parent_comment_id UUID REFERENCES case_study_comments(id) ON DELETE CASCADE, -- Para comentários aninhados/respostas
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Case Study Files table (arquivos anexados aos estudos de caso)
CREATE TABLE case_study_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_study_id UUID REFERENCES case_studies(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_case_studies_created_by ON case_studies(created_by);
CREATE INDEX idx_case_studies_doctor_id ON case_studies(doctor_id);
CREATE INDEX idx_case_studies_specialty_id ON case_studies(specialty_id);
CREATE INDEX idx_case_studies_status ON case_studies(status);
CREATE INDEX idx_case_studies_created_at ON case_studies(created_at DESC);

CREATE INDEX idx_case_study_comments_case_study_id ON case_study_comments(case_study_id);
CREATE INDEX idx_case_study_comments_user_id ON case_study_comments(user_id);
CREATE INDEX idx_case_study_comments_parent_comment_id ON case_study_comments(parent_comment_id);
CREATE INDEX idx_case_study_comments_created_at ON case_study_comments(created_at DESC);

CREATE INDEX idx_case_study_files_case_study_id ON case_study_files(case_study_id);
CREATE INDEX idx_case_study_files_uploaded_by ON case_study_files(uploaded_by);

-- Add updated_at trigger for case_studies
CREATE TRIGGER update_case_studies_updated_at BEFORE UPDATE ON case_studies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for case_study_comments
CREATE TRIGGER update_case_study_comments_updated_at BEFORE UPDATE ON case_study_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_study_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_study_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for case_studies
-- Médicos podem visualizar todos os estudos de caso publicados
CREATE POLICY "Doctors can view published case studies"
  ON case_studies FOR SELECT
  USING (
    status = 'published' 
    OR created_by = auth.uid()
    OR get_user_role(auth.uid()) = 'admin'
  );

-- Médicos podem criar estudos de caso
CREATE POLICY "Doctors can create case studies"
  ON case_studies FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) IN ('admin', 'medico')
  );

-- Criador pode editar seus próprios estudos
CREATE POLICY "Authors can update their own case studies"
  ON case_studies FOR UPDATE
  USING (
    created_by = auth.uid()
    OR get_user_role(auth.uid()) = 'admin'
  );

-- Criador ou admin pode deletar
CREATE POLICY "Authors and admins can delete case studies"
  ON case_studies FOR DELETE
  USING (
    created_by = auth.uid()
    OR get_user_role(auth.uid()) = 'admin'
  );

-- RLS Policies for case_study_comments
-- Médicos podem visualizar comentários de estudos publicados
CREATE POLICY "Doctors can view comments on published case studies"
  ON case_study_comments FOR SELECT
  USING (
    case_study_id IN (
      SELECT id FROM case_studies 
      WHERE status = 'published' 
      OR created_by = auth.uid()
      OR get_user_role(auth.uid()) = 'admin'
    )
  );

-- Médicos podem criar comentários
CREATE POLICY "Doctors can create comments"
  ON case_study_comments FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) IN ('admin', 'medico')
    AND case_study_id IN (
      SELECT id FROM case_studies 
      WHERE status = 'published'
      OR created_by = auth.uid()
      OR get_user_role(auth.uid()) = 'admin'
    )
  );

-- Autores podem editar seus próprios comentários
CREATE POLICY "Authors can update their own comments"
  ON case_study_comments FOR UPDATE
  USING (
    user_id = auth.uid()
    OR get_user_role(auth.uid()) = 'admin'
  );

-- Autores podem deletar seus próprios comentários
CREATE POLICY "Authors can delete their own comments"
  ON case_study_comments FOR DELETE
  USING (
    user_id = auth.uid()
    OR get_user_role(auth.uid()) = 'admin'
  );

-- RLS Policies for case_study_files
-- Médicos podem visualizar arquivos de estudos publicados
CREATE POLICY "Doctors can view files on published case studies"
  ON case_study_files FOR SELECT
  USING (
    case_study_id IN (
      SELECT id FROM case_studies 
      WHERE status = 'published' 
      OR created_by = auth.uid()
      OR get_user_role(auth.uid()) = 'admin'
    )
  );

-- Médicos podem fazer upload de arquivos
CREATE POLICY "Doctors can upload files"
  ON case_study_files FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) IN ('admin', 'medico')
    AND case_study_id IN (
      SELECT id FROM case_studies 
      WHERE created_by = auth.uid()
      OR get_user_role(auth.uid()) = 'admin'
    )
  );

-- Autores ou admin podem deletar arquivos
CREATE POLICY "Authors and admins can delete files"
  ON case_study_files FOR DELETE
  USING (
    uploaded_by = auth.uid()
    OR case_study_id IN (
      SELECT id FROM case_studies WHERE created_by = auth.uid()
    )
    OR get_user_role(auth.uid()) = 'admin'
  );

