-- Histórico da Escala (Estúdio/Escritório): listar em jsonb.
-- RETURNS TABLE estourava o limite PostgREST (~1000 linhas) em meses com muitas alterações.

BEGIN;

DROP FUNCTION IF EXISTS public.rh_gestao_escala_historico_listar(date, text);

CREATE FUNCTION public.rh_gestao_escala_historico_listar(p_ref_mes date, p_area_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_area text := lower(btrim(p_area_key));
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._prestador_page_perm('rh_gestao_escala', 'view')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND p.role IS DISTINCT FROM 'prestador'
        AND rp.page_key = 'rh_gestao_escala'
        AND rp.can_view IN ('sim', 'proprios')
    )
  ) THEN
    RETURN '[]'::jsonb;
  END IF;

  IF v_area IS NULL OR v_area = '' THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN coalesce(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', x.id,
          'acao', x.acao,
          'realizada_em', x.realizada_em,
          'realizada_por_nome', x.realizada_por_nome,
          'detalhes', x.detalhes
        )
        ORDER BY x.realizada_em DESC
      )
      FROM (
        SELECT
          h.id,
          h.acao,
          h.realizada_em,
          coalesce(nullif(btrim(pr.name), ''), nullif(btrim(pr.email), ''), 'Usuário') AS realizada_por_nome,
          h.detalhes
        FROM public.rh_gestao_escala_historico h
        INNER JOIN public.profiles pr ON pr.id = h.realizada_por
        WHERE h.ref_mes = v_ref
          AND h.area_key = v_area
      ) x
    ),
    '[]'::jsonb
  );
END;
$$;

COMMENT ON FUNCTION public.rh_gestao_escala_historico_listar(date, text) IS
  'Histórico de ações da escala (Estúdio/Escritório) em jsonb — evita truncar ~1000 linhas do PostgREST.';

REVOKE ALL ON FUNCTION public.rh_gestao_escala_historico_listar(date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_gestao_escala_historico_listar(date, text) TO authenticated;

COMMIT;
