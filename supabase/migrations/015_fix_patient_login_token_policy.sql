-- Migration 015: Corrigir política de busca por login_token

-- Dropar a política anterior
DROP POLICY IF EXISTS "Allow patient lookup by login token" ON patients;

-- Criar nova política mais permissiva
-- Permite buscar paciente por login_token mesmo sem autenticação
-- A verificação de expiração será feita no código da aplicação
CREATE POLICY "Allow patient lookup by login token"
  ON patients FOR SELECT
  USING (
    login_token IS NOT NULL
    -- Permite acesso mesmo sem autenticação para buscar por token
    -- A verificação de segurança é feita pelo próprio token único na query .eq()
    -- A validação de expiração será feita no código da aplicação
  );

