-- ============================================
-- SCRIPT DE REPLICAÇÃO COMPLETA DO BANCO
-- Execute este script no SQL Editor do Supabase
-- ============================================
-- 
-- INSTRUÇÕES:
-- 1. Copie TODO o conteúdo deste arquivo
-- 2. Cole no SQL Editor do Supabase Dashboard
-- 3. Execute (Run ou Ctrl+Enter)
-- 4. Aguarde a conclusão
--
-- NOTA: Este script combina todas as migrations em ordem
-- ============================================

-- Verificar se já existe alguma estrutura
DO $$
BEGIN
    RAISE NOTICE 'Iniciando replicação do banco de dados...';
    RAISE NOTICE 'Execute as migrations individuais na ordem correta.';
    RAISE NOTICE 'Este arquivo serve apenas como referência.';
END $$;

-- ============================================
-- IMPORTANTE: Execute as migrations na ordem:
-- ============================================
-- 1. 001_initial_schema.sql
-- 2. 002_rls_policies.sql
-- 3. 003_medical_record_attachments.sql
-- 4. 004_create_storage_bucket.sql
-- 5. 005_enhance_anamnesis_physical_exam.sql
-- 6. 006_enhance_notifications.sql
-- 7. 007_telemedicine_tables.sql
-- 8. 008_seed_data.sql
-- 9. 009_fix_telemedicine_rls.sql
-- 10. 010_telemedicine_enhancements.sql
-- 11. 011_telemedicine_recording.sql
-- 12. 012_add_cancellation_to_telemedicine.sql
-- 13. 013_add_patient_login_token.sql
-- 14. 014_allow_patient_login_by_token.sql
-- 15. 015_fix_patient_login_token_policy.sql
-- 16. 016_fix_profiles_rls_for_api.sql
-- 17. 017_case_studies.sql
-- 18. 018_clinic_rooms.sql
-- 19. 019_clinic_logo_bucket.sql
-- 20. 020_prescription_templates.sql
-- 21. 021_certificate_templates.sql
-- 22. 022_ia_whatsapp_tables.sql
-- 23. 023_whatsapp_media_bucket.sql
-- 24. 024_insert_leads_kanban_agendamentos_data.sql
-- 25. 025_documentar_campos_agendamentos_ia.sql
-- 26. 026_follow_up_and_orcamentos_tables.sql
-- 27. 026_telemedicine_transcriptions.sql
-- 28. 027_add_followup_scheduling_fields.sql
-- 29. 027_fix_telemedicine_recording.sql
-- 30. 027_quick_message_templates.sql
-- 31. 028_add_doctor_whatsapp_phone.sql
-- 32. 030_create_desenvolvedor_user.sql
-- ============================================

-- Este arquivo não contém o código SQL completo
-- Use os arquivos individuais na pasta supabase/migrations/

