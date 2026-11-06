-- Skin opt-in do perfil influencer: uma operadora cuja identidade visual
-- entra no login. Não altera menu, Home nem o escopo de dados (scope_type operadora).

ALTER TABLE public.user_scopes DROP CONSTRAINT IF EXISTS user_scopes_scope_type_check;
ALTER TABLE public.user_scopes
  ADD CONSTRAINT user_scopes_scope_type_check
  CHECK (scope_type IN (
    'influencer',
    'operadora',
    'agencia_par',
    'prestador_tipo',
    'brand_operadora'
  ));

COMMENT ON CONSTRAINT user_scopes_scope_type_check ON public.user_scopes IS
  'Escopos: influencer, operadora, agencia_par, prestador_tipo, brand_operadora (skin visual do influencer).';
