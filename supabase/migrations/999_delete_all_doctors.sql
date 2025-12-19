-- Migration 999: Script para excluir todos os médicos
-- ATENÇÃO: Este script exclui TODOS os médicos do sistema
-- Use apenas se quiser começar do zero

-- Primeiro, vamos remover as foreign keys temporariamente ou excluir registros relacionados

-- 1. Excluir agendamentos relacionados (opcional - descomente se quiser excluir agendamentos também)
-- DELETE FROM appointments WHERE doctor_id IS NOT NULL;

-- 2. Excluir prontuários relacionados (opcional)
-- DELETE FROM medical_records WHERE doctor_id IS NOT NULL;

-- 3. Excluir prescrições relacionadas (opcional)
-- DELETE FROM prescriptions WHERE doctor_id IS NOT NULL;

-- 4. Excluir sessões de telemedicina relacionadas (através de appointments)
-- DELETE FROM telemedicine_sessions WHERE appointment_id IN (SELECT id FROM appointments WHERE doctor_id IS NOT NULL);
-- DELETE FROM appointments WHERE doctor_id IS NOT NULL;

-- 5. Buscar todos os user_id dos médicos antes de excluir
DO $$
DECLARE
    doctor_user_ids UUID[];
BEGIN
    -- Coletar todos os user_id dos médicos
    SELECT ARRAY_AGG(user_id) INTO doctor_user_ids
    FROM doctors
    WHERE user_id IS NOT NULL;
    
    -- Se houver médicos com user_id, excluir os usuários e profiles primeiro
    IF doctor_user_ids IS NOT NULL AND array_length(doctor_user_ids, 1) > 0 THEN
        -- Excluir profiles
        DELETE FROM profiles WHERE id = ANY(doctor_user_ids);
        
        -- Excluir usuários (isso vai cascatear para profiles também, mas é mais seguro fazer explicitamente)
        -- Nota: Para excluir usuários do auth.users, você precisa usar a API do Supabase Admin
        -- ou fazer manualmente no painel do Supabase
        RAISE NOTICE 'Médicos com login encontrados. Você precisa excluir os usuários manualmente no painel do Supabase em Authentication > Users';
    END IF;
END $$;

-- 6. Excluir todos os médicos
DELETE FROM doctors;

-- Resetar a sequência (se houver)
-- ALTER SEQUENCE doctors_id_seq RESTART WITH 1; -- Se estiver usando serial, não é necessário com UUID

RAISE NOTICE 'Todos os médicos foram excluídos!';


