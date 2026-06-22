-- Limpa todas as tabelas do módulo RH Figurinos e reinicia contadores por categoria.
-- Executar no SQL Editor do Supabase (role com permissão nas tabelas, ex. postgres).

BEGIN;

-- Remove peças e, em cascata, empréstimos, histórico de status e N:N operadoras/estúdios.
TRUNCATE TABLE public.rh_figurino_pecas CASCADE;

-- Próximo cadastro por categoria volta a PREFIX-000001 (ex.: CAM-000001, VES-000001).
TRUNCATE TABLE public.rh_figurino_category_code_counters;

COMMIT;
