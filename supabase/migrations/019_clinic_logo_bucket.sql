-- Criar bucket para logos da clínica
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clinic-assets',
  'clinic-assets',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir upload de logos (apenas admins)
CREATE POLICY "Admins podem fazer upload de logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'clinic-assets' AND
  get_user_role(auth.uid()) = 'admin'
);

-- Política para permitir leitura pública de logos
CREATE POLICY "Logos são públicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'clinic-assets');

-- Política para permitir atualização de logos (apenas admins)
CREATE POLICY "Admins podem atualizar logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'clinic-assets' AND
  get_user_role(auth.uid()) = 'admin'
);

-- Política para permitir exclusão de logos (apenas admins)
CREATE POLICY "Admins podem excluir logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'clinic-assets' AND
  get_user_role(auth.uid()) = 'admin'
);

