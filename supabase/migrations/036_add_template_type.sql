-- Migration 036: Adicionar suporte para templates de IA
-- Adiciona campo para diferenciar templates fixos de templates de IA (prompts)

-- Adicionar coluna tipo_template na tabela follow_up_templates
ALTER TABLE follow_up_templates 
ADD COLUMN IF NOT EXISTS tipo_template TEXT DEFAULT 'fixo' CHECK (tipo_template IN ('fixo', 'ia'));

-- Comentário na coluna
COMMENT ON COLUMN follow_up_templates.tipo_template IS 'Tipo de template: fixo (mensagem pronta) ou ia (prompt para IA)';

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_follow_up_templates_tipo_template ON follow_up_templates(tipo_template);

-- Atualizar templates existentes para serem do tipo 'fixo'
UPDATE follow_up_templates SET tipo_template = 'fixo' WHERE tipo_template IS NULL;

