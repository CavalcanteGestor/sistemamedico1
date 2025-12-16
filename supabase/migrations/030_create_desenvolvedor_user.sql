-- Migration 030: Script para criar usuário desenvolvedor
-- Execute este script APÓS criar o usuário no Supabase Auth Dashboard

-- IMPORTANTE: 
-- 1. Primeiro, crie o usuário no Supabase Dashboard > Authentication > Users > Add User
-- 2. Copie o User ID gerado
-- 3. Substitua USER_ID_AQUI pelo ID real
-- 4. Execute este SQL

-- Criar perfil de desenvolvedor
INSERT INTO profiles (id, email, name, role)
VALUES (
  'USER_ID_AQUI',  -- ⚠️ SUBSTITUA PELO USER_ID DO USUÁRIO CRIADO NO SUPABASE AUTH
  'dev@clinica.com',  -- ⚠️ ALTERE PARA O EMAIL DESEJADO
  'Desenvolvedor Sistema',  -- ⚠️ ALTERE PARA O NOME DESEJADO
  'desenvolvedor'
)
ON CONFLICT (id) DO UPDATE 
SET 
  role = 'desenvolvedor',
  name = 'Desenvolvedor Sistema',
  email = 'dev@clinica.com';

-- Verificar se foi criado corretamente
SELECT id, email, name, role, created_at 
FROM profiles 
WHERE role = 'desenvolvedor';

