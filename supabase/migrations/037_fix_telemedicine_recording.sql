-- Migration 037: Corrigir gravação de telemedicina
-- Adiciona campos faltantes e atualiza bucket para suportar vídeos

-- Adicionar campos faltantes de gravação (se não existirem)
ALTER TABLE telemedicine_sessions
ADD COLUMN IF NOT EXISTS recording_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS recording_ended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS recording_file_path TEXT;

-- Atualizar bucket medical-records para aceitar vídeos e aumentar limite
DO $$
BEGIN
  -- Tentar atualizar o bucket se existir
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'medical-records') THEN
    UPDATE storage.buckets
    SET 
      file_size_limit = 104857600, -- 100MB para gravações de vídeo
      allowed_mime_types = ARRAY[
        'image/jpeg', 
        'image/png', 
        'image/gif', 
        'image/webp', 
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'video/webm',
        'video/webm;codecs=vp8',
        'video/webm;codecs=vp9',
        'video/mp4',
        'audio/webm',
        'audio/ogg'
      ]
    WHERE id = 'medical-records';
  ELSE
    -- Criar bucket se não existir
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'medical-records',
      'medical-records',
      true,
      104857600, -- 100MB
      ARRAY[
        'image/jpeg', 
        'image/png', 
        'image/gif', 
        'image/webp', 
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'video/webm',
        'video/webm;codecs=vp8',
        'video/webm;codecs=vp9',
        'video/mp4',
        'audio/webm',
        'audio/ogg'
      ]
    );
  END IF;
END $$;

