-- Limpa todas as tabelas do módulo RH Figurinos e reinicia a sequência de código FIG-######.
-- Executar no SQL Editor do Supabase (role com permissão nas tabelas, ex. postgres).

BEGIN;

-- Remove peças e, em cascata, empréstimos, histórico de status e N:N operadoras.
TRUNCATE TABLE public.rh_figurino_pecas CASCADE;

-- Próximo cadastro volta a usar FIG-000001 (enquanto não colidir com regra da RPC).
ALTER SEQUENCE public.rh_figurino_code_seq RESTART WITH 1;

COMMIT;
