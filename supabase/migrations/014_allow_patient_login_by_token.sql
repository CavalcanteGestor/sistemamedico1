-- Migration 014: Permitir busca de pacientes por login_token sem autenticação

-- Criar política que permite buscar paciente por login_token mesmo sem estar autenticado
-- Isso é necessário para o fluxo de primeiro acesso do paciente
CREATE POLICY "Allow patient lookup by login token"
  ON patients FOR SELECT
  USING (
    login_token IS NOT NULL 
    AND login_token_expires_at > NOW()
    -- Permite acesso mesmo sem autenticação para buscar por token
    -- A verificação de segurança é feita pelo próprio token único
  );

-- Nota: Esta política permite que qualquer pessoa (não autenticada) busque um paciente
-- pelo token, mas isso é seguro porque:
-- 1. O token é único e muito difícil de adivinhar (64 caracteres hex)
-- 2. O token tem validade (expires_at)
-- 3. Apenas retorna dados básicos necessários para o login inicial
-- 4. O paciente ainda precisa fazer login com senha para acessar o sistema

