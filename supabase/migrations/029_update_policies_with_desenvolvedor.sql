-- Migration 029b: Atualizar políticas RLS para incluir 'desenvolvedor'
-- Execute esta migration APÓS a 029_add_desenvolvedor_role.sql
-- Esta migration atualiza as políticas RLS para incluir 'desenvolvedor'

-- ============================================
-- Atualizar políticas de quick_message_topics
-- ============================================
DROP POLICY IF EXISTS "Staff can view quick message topics" ON quick_message_topics;
DROP POLICY IF EXISTS "Staff can manage quick message topics" ON quick_message_topics;

CREATE POLICY "Staff can view quick message topics"
  ON quick_message_topics
  FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('admin', 'recepcionista', 'medico', 'desenvolvedor')
  );

CREATE POLICY "Staff can manage quick message topics"
  ON quick_message_topics
  FOR ALL
  USING (
    get_user_role(auth.uid()) IN ('admin', 'recepcionista', 'desenvolvedor')
  );

-- ============================================
-- Atualizar políticas de quick_messages
-- ============================================
DROP POLICY IF EXISTS "Staff can view quick messages" ON quick_messages;
DROP POLICY IF EXISTS "Staff can manage quick messages" ON quick_messages;

CREATE POLICY "Staff can view quick messages"
  ON quick_messages
  FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('admin', 'recepcionista', 'medico', 'desenvolvedor')
  );

CREATE POLICY "Staff can manage quick messages"
  ON quick_messages
  FOR ALL
  USING (
    get_user_role(auth.uid()) IN ('admin', 'recepcionista', 'desenvolvedor')
  );

