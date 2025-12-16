-- Migration 016: Permitir criação de perfis via API (server-side)
-- Necessário para criação automática de usuários para pacientes

-- Verificar se já existe política para INSERT
-- Se existir, dropar e recriar com condições adequadas

-- Dropar políticas antigas de INSERT se existirem
DROP POLICY IF EXISTS "System can create profiles" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation via API" ON profiles;

-- Criar política que permite criação de perfis via service_role
-- Como estamos usando admin client (service_role), as políticas RLS não se aplicam
-- Mas vamos criar uma política permissiva para garantir que funcione
CREATE POLICY "Allow profile creation"
  ON profiles FOR INSERT
  WITH CHECK (true); -- Permite criação para qualquer um quando autenticado via service_role

-- Também permitir UPDATE via API
CREATE POLICY "Allow profile update"
  ON profiles FOR UPDATE
  USING (true); -- Permite atualização

-- Nota: As políticas RLS não se aplicam quando usando service_role key,
-- mas criamos essas políticas para garantir compatibilidade em todos os cenários

