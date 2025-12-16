-- Criar bucket para mídia do WhatsApp
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'whatsapp-media',
  'whatsapp-media',
  true,
  104857600, -- 100MB para suportar vídeos e áudios
  ARRAY[
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'audio/mpeg',
    'audio/ogg',
    'audio/webm',
    'audio/wav',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir upload de mídia WhatsApp (admin, medico, recepcionista)
CREATE POLICY "Staff pode fazer upload de mídia WhatsApp"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'whatsapp-media' AND
  get_user_role(auth.uid()) IN ('admin', 'medico', 'recepcionista')
);

-- Política para permitir leitura pública de mídia WhatsApp
CREATE POLICY "Mídia WhatsApp é pública"
ON storage.objects FOR SELECT
USING (bucket_id = 'whatsapp-media');

-- Política para permitir exclusão de mídia WhatsApp (admin, medico, recepcionista)
CREATE POLICY "Staff pode excluir mídia WhatsApp"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'whatsapp-media' AND
  get_user_role(auth.uid()) IN ('admin', 'medico', 'recepcionista')
);

