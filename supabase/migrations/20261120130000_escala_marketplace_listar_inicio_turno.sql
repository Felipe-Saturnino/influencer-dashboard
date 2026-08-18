-- Marketplace: listagem jsonb passa a devolver o início congelado do turno
-- (`inicio_turno_at`) e, em troca aceita, o início do turno de interesse.
-- A Home no Simulador recorta por essa RPC (RLS bloqueia a tabela) e precisa
-- do mesmo corte de `home_marketplace_alertas` — não o fim do dia civil.

BEGIN;

CREATE OR REPLACE FUNCTION public._escala_marketplace_ofertas_listar_sem_expiracao_2h(p_ref_mes date DEFAULT NULL)
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
  v_grupo text;
  v_out jsonb;
BEGIN
  IF v_escopo = 'nao' THEN
    RETURN '[]'::jsonb;
  END IF;

  v_fid := public._rh_funcionario_login_id();
  IF v_fid IS NOT NULL THEN
    SELECT f.org_time_id INTO v_time FROM public.rh_funcionarios f WHERE f.id = v_fid;
    v_grupo := public._escala_marketplace_grupo_key(public._escala_marketplace_area_key(v_time));
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
        'inicio_turno_at', o.inicio_turno_at,
        'inicio_turno_interesse_at', CASE
          WHEN o.status = 'aceita'
           AND o.tipo = 'oferta_troca'
           AND o.dia_iso_interesse IS NOT NULL THEN
            public._escala_marketplace_inicio_turno(
              o.interessado_funcionario_id,
              o.dia_iso_interesse,
              COALESCE(
                public._escala_marketplace_turno_label_grade(o.valor_celula_interesse),
                o.turno_label
              )
            )
          ELSE NULL
        END,
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
        'mesmo_time', (
          COALESCE(v_grupo, '') <> ''
          AND public._escala_marketplace_grupo_key(public._escala_marketplace_area_key(o.org_time_id)) = v_grupo
        )
      ) AS linha
    FROM public.escala_marketplace_oferta o
    LEFT JOIN public.rh_funcionarios fo ON fo.id = o.ofertante_funcionario_id
    LEFT JOIN public.rh_funcionarios fi ON fi.id = o.interessado_funcionario_id
    LEFT JOIN public.rh_org_times t ON t.id = o.org_time_id
    LEFT JOIN public.operadoras op ON op.slug = btrim(fo.staff_operadora_slug)
    WHERE (v_ref IS NULL OR date_trunc('month', o.dia_iso)::date = v_ref)
      AND (
        v_escopo = 'sim'
        OR (
          COALESCE(v_grupo, '') <> ''
          AND public._escala_marketplace_grupo_key(public._escala_marketplace_area_key(o.org_time_id)) = v_grupo
        )
        OR (v_fid IS NOT NULL AND o.ofertante_funcionario_id = v_fid)
      )
  ) sub;

  RETURN COALESCE(v_out, '[]'::jsonb);
END;
$$;

COMMENT ON FUNCTION public._escala_marketplace_ofertas_listar_sem_expiracao_2h(date) IS
  'Marketplace: listagem jsonb. Inclui inicio_turno_at (congelado) e, em troca aceita, inicio_turno_interesse_at. Ver = Próprios devolve o grupo de negociação (Liderança = SL + SM).';

COMMIT;
