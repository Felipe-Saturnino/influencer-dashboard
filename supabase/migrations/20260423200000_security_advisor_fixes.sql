-- Correções alinhadas ao Supabase Security Advisor (lints 0010, 0011, 0008).
-- Correr no SQL Editor após backup / em janela de manutenção se preferirem.

-- ── 0010_security_definer_view: view deve respeitar RLS/permissões de quem consulta (PG15+)
ALTER VIEW public.v_influencer_metricas_mensal SET (security_invoker = true);

-- ── 0011_function_search_path_mutable
ALTER FUNCTION public.set_atualizado_em() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.trg_set_atualizado_em() SET search_path = public;
ALTER FUNCTION public.dealers_updated_at() SET search_path = public;
ALTER FUNCTION public.live_resultados_updated_at() SET search_path = public;
ALTER FUNCTION public.scout_updated_at() SET search_path = public;
ALTER FUNCTION public.lives_updated_at() SET search_path = public;
ALTER FUNCTION public.get_metricas_financeiro(integer, integer, uuid, boolean, text) SET search_path = public;

-- ── 0008_rls_enabled_no_policy: políticas explícitas de negação (cliente nunca acede à tabela diretamente;
-- service_role e dono de funções SECURITY DEFINER continuam a funcionar como hoje).
DROP POLICY IF EXISTS "utm_metricas_diarias_negar_cliente_anon" ON public.utm_metricas_diarias;
DROP POLICY IF EXISTS "utm_metricas_diarias_negar_cliente_authenticated" ON public.utm_metricas_diarias;

CREATE POLICY "utm_metricas_diarias_negar_cliente_anon"
  ON public.utm_metricas_diarias
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "utm_metricas_diarias_negar_cliente_authenticated"
  ON public.utm_metricas_diarias
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
