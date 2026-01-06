-- Migration 041: Criar bucket de storage para backups
-- Bucket para armazenar backups do banco de dados

-- Criar bucket de backups (se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'backups',
  'backups',
  false, -- Privado
  104857600, -- 100MB limite por arquivo
  ARRAY['application/json', 'application/sql', 'application/x-sql', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Política RLS: Apenas admin e desenvolvedor podem acessar backups
CREATE POLICY "Admins podem ver backups"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'backups' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'desenvolvedor')
    )
  );

-- Política RLS: Sistema pode criar backups (via service role)
CREATE POLICY "Sistema pode criar backups"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'backups');

-- Política RLS: Admins podem deletar backups antigos
CREATE POLICY "Admins podem deletar backups"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'backups' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'desenvolvedor')
    )
  );

COMMENT ON POLICY "Admins podem ver backups" ON storage.objects IS 'Permite que admins e desenvolvedores visualizem backups';
COMMENT ON POLICY "Sistema pode criar backups" ON storage.objects IS 'Permite que o sistema crie backups automaticamente';
COMMENT ON POLICY "Admins podem deletar backups" ON storage.objects IS 'Permite que admins deletem backups antigos';

