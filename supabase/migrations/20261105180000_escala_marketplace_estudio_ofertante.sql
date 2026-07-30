-- Marketplace: coluna de local passa a ser o Estúdio do prestador ofertante
-- (Gestão de Staff → staff_estudio_slugs / staff_estudio_slug), com fallback
-- legado pela operadora do cadastro. `operadora_*` continua no payload só como
-- fallback de registos antigos sem estúdio.

BEGIN;

CREATE OR REPLACE FUNCTION public._escala_marketplace_estudio_label(p_f public.rh_funcionarios)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH slugs AS (
    SELECT COALESCE(
      NULLIF(p_f.staff_estudio_slugs, '{}'::text[]),
      CASE
        WHEN NULLIF(btrim(COALESCE(p_f.staff_estudio_slug, '')), '') IS NOT NULL
          THEN ARRAY[btrim(p_f.staff_estudio_slug)]
        ELSE (
          SELECT ARRAY[eo.estudio_slug]
          FROM public.estudios_spin_operadoras eo
          JOIN public.estudios_spin e ON e.slug = eo.estudio_slug
          WHERE eo.operadora_slug = NULLIF(btrim(COALESCE(p_f.staff_operadora_slug, '')), '')
          ORDER BY (e.tipo = 'dedicado') DESC, e.slug
          LIMIT 1
        )
      END
    ) AS arr
  )
  SELECT CASE
    WHEN arr IS NULL OR cardinality(arr) = 0 THEN ''
    WHEN 'todos' = ANY (arr) THEN 'Todos Estúdios'
    ELSE COALESCE(
      (
        SELECT string_agg(COALESCE(e.nome, s.slug), ' · ' ORDER BY s.ord)
        FROM unnest(arr) WITH ORDINALITY AS s(slug, ord)
        LEFT JOIN public.estudios_spin e ON e.slug = s.slug
      ),
      ''
    )
  END
  FROM slugs;
$$;

COMMENT ON FUNCTION public._escala_marketplace_estudio_label(public.rh_funcionarios) IS
  'Marketplace: rótulo de estúdio do prestador (Todos Estúdios quando o cadastro atende todos; fallback pela operadora legada).';

DROP FUNCTION IF EXISTS public.escala_marketplace_ofertas_listar(date);

CREATE FUNCTION public.escala_marketplace_ofertas_listar(p_ref_mes date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := CASE WHEN p_ref_mes IS NULL THEN NULL ELSE date_trunc('month', p_ref_mes)::date END;
  v_escopo text := public._escala_marketplace_escopo_view();
  v_fid uuid;
  v_time uuid;
  v_out jsonb;
BEGIN
  IF v_escopo = 'nao' THEN
    RETURN '[]'::jsonb;
  END IF;

  v_fid := public._rh_funcionario_login_id();
  IF v_fid IS NOT NULL THEN
    SELECT f.org_time_id INTO v_time FROM public.rh_funcionarios f WHERE f.id = v_fid;
  END IF;

  SELECT COALESCE(jsonb_agg(linha ORDER BY criado_em DESC), '[]'::jsonb)
  INTO v_out
  FROM (
    SELECT
      o.criado_em,
      jsonb_build_object(
        'id', o.id,
        'tipo', o.tipo,
        'status', o.status,
        'dia_iso', o.dia_iso,
        'valor_celula_origem', o.valor_celula_origem,
        'turno_label', o.turno_label,
        'dia_iso_interesse', o.dia_iso_interesse,
        'valor_celula_interesse', o.valor_celula_interesse,
        'criado_em', o.criado_em,
        'atualizado_em', o.atualizado_em,
        'aceito_em', o.aceito_em,
        'observacao', o.observacao,
        'ofertante_funcionario_id', o.ofertante_funcionario_id,
        'ofertante_nome', fo.nome,
        'estudio_nome', NULLIF(public._escala_marketplace_estudio_label(fo), ''),
        'operadora_slug', btrim(COALESCE(fo.staff_operadora_slug, '')),
        'operadora_nome', op.nome,
        'org_time_id', o.org_time_id,
        'time_nome', t.nome,
        'interessado_funcionario_id', o.interessado_funcionario_id,
        'interessado_nome', fi.nome,
        'sou_ofertante', (v_fid IS NOT NULL AND o.ofertante_funcionario_id = v_fid),
        'sou_interessado', (v_fid IS NOT NULL AND o.interessado_funcionario_id = v_fid),
        'mesmo_time', (v_time IS NOT NULL AND o.org_time_id = v_time)
      ) AS linha
    FROM public.escala_marketplace_oferta o
    LEFT JOIN public.rh_funcionarios fo ON fo.id = o.ofertante_funcionario_id
    LEFT JOIN public.rh_funcionarios fi ON fi.id = o.interessado_funcionario_id
    LEFT JOIN public.rh_org_times t ON t.id = o.org_time_id
    LEFT JOIN public.operadoras op ON op.slug = btrim(fo.staff_operadora_slug)
    WHERE (v_ref IS NULL OR date_trunc('month', o.dia_iso)::date = v_ref)
      AND (
        v_escopo = 'sim'
        OR (v_time IS NOT NULL AND o.org_time_id = v_time)
        OR (v_fid IS NOT NULL AND o.ofertante_funcionario_id = v_fid)
      )
  ) sub;

  RETURN COALESCE(v_out, '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.escala_marketplace_ofertas_listar(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_marketplace_ofertas_listar(date) TO authenticated;

COMMENT ON FUNCTION public.escala_marketplace_ofertas_listar(date) IS
  'Marketplace: ofertas do mês (ou todas quando p_ref_mes é NULL) em jsonb, com estúdio do ofertante. Ver = Sim devolve todos os times; Ver = Próprios só o time do prestador.';

COMMIT;
