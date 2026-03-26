-- Permite scope_type = 'gestor_tipo' em user_scopes.
-- CHECK legado com apenas influencer | operadora | agencia_par faz o INSERT falhar sem erro visível nas Edge Functions.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'user_scopes'
      AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%scope_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.user_scopes DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.user_scopes
  ADD CONSTRAINT user_scopes_scope_type_check
  CHECK (scope_type IN ('influencer', 'operadora', 'agencia_par', 'gestor_tipo'));

COMMENT ON CONSTRAINT user_scopes_scope_type_check ON public.user_scopes IS
  'Inclui gestor_tipo (tipos Operações, Marketing, Afiliados, Geral).';
