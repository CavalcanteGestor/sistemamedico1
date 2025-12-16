-- Criar bucket para arquivos médicos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-records',
  'medical-records',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir upload de arquivos médicos
CREATE POLICY "Médicos podem fazer upload de arquivos médicos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'medical-records' AND
  get_user_role(auth.uid()) IN ('admin', 'medico')
);

-- Política para permitir leitura de arquivos médicos
CREATE POLICY "Usuários autorizados podem ler arquivos médicos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'medical-records' AND (
    get_user_role(auth.uid()) IN ('admin', 'medico', 'enfermeiro') OR
    -- Pacientes podem ver seus próprios arquivos
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM medical_records 
      WHERE patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    )
  )
);

-- Política para permitir exclusão de arquivos médicos
CREATE POLICY "Médicos podem excluir arquivos médicos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'medical-records' AND
  get_user_role(auth.uid()) IN ('admin', 'medico')
);

