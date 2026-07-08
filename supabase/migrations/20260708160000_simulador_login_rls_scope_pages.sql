-- Simulador de Login: quem tem Ver em simulador_login precisa ler matrizes de escopo
-- (operadora_pages, gestor_tipo_pages, prestador_tipo_pages) para montar o menu do perfil simulado.

BEGIN;

CREATE OR REPLACE FUNCTION public._pode_usar_simulador_login()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'admin'
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND rp.page_key = 'simulador_login'
          AND rp.can_view IN ('sim', 'proprios')
      )
    );
$$;

REVOKE ALL ON FUNCTION public._pode_usar_simulador_login() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._pode_usar_simulador_login() TO authenticated;

COMMENT ON FUNCTION public._pode_usar_simulador_login() IS
  'Admin ou perfil com Ver em simulador_login (Gestão de Usuários). Usado em RLS de leitura das matrizes de escopo na simulação.';

CREATE POLICY "Simulador de Login leitura operadora_pages"
  ON public.operadora_pages
  FOR SELECT
  USING (public._pode_usar_simulador_login());

CREATE POLICY "Simulador de Login leitura gestor_tipo_pages"
  ON public.gestor_tipo_pages
  FOR SELECT
  USING (public._pode_usar_simulador_login());

CREATE POLICY "Simulador de Login leitura prestador_tipo_pages"
  ON public.prestador_tipo_pages
  FOR SELECT
  USING (public._pode_usar_simulador_login());

COMMIT;
