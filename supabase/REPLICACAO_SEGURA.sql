-- ============================================
-- SCRIPT DE REPLICAÇÃO SEGURA DO BANCO
-- Execute este script para verificar o estado atual
-- ============================================

-- Verificar extensões necessárias
DO $$
BEGIN
    -- Verificar UUID extension
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        RAISE NOTICE 'Extensão uuid-ossp criada';
    ELSE
        RAISE NOTICE 'Extensão uuid-ossp já existe';
    END IF;
END $$;

-- Verificar se tabelas principais já existem
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('profiles', 'patients', 'doctors', 'appointments');
    
    IF table_count > 0 THEN
        RAISE NOTICE 'ATENÇÃO: Algumas tabelas já existem!';
        RAISE NOTICE 'Tabelas encontradas: %', table_count;
        RAISE NOTICE 'Recomendação: Verifique se as migrations já foram executadas.';
    ELSE
        RAISE NOTICE 'Banco limpo - Pronto para executar migrations';
    END IF;
END $$;

-- Listar tabelas existentes
SELECT 
    table_name,
    'Já existe' as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Verificar se RLS está habilitado nas tabelas principais
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN 'RLS Habilitado ✅'
        ELSE 'RLS Desabilitado ⚠️'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'patients', 'doctors', 'appointments')
ORDER BY tablename;

-- Verificar triggers importantes
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN ('handle_new_user', 'update_updated_at_column')
ORDER BY event_object_table, trigger_name;

-- ============================================
-- PRÓXIMOS PASSOS:
-- ============================================
-- 1. Se nenhuma tabela existe: Execute as migrations na ordem
-- 2. Se algumas tabelas existem: Verifique quais migrations já foram executadas
-- 3. Se todas as tabelas existem: Banco já está configurado
-- ============================================

