-- Relatório de Estúdio: SOS/Sinais numéricos, Payout; Roletas (incl. Sports Club).

BEGIN;

-- SOS / Sinais → inteiro (valores não numéricos viram 0)
ALTER TABLE public.escala_relatorio_estudio
  ALTER COLUMN sos TYPE integer
  USING (
    CASE
      WHEN trim(sos) ~ '^[0-9]+$' THEN trim(sos)::integer
      ELSE 0
    END
  );

ALTER TABLE public.escala_relatorio_estudio
  ALTER COLUMN sinais TYPE integer
  USING (
    CASE
      WHEN trim(sinais) ~ '^[0-9]+$' THEN trim(sinais)::integer
      ELSE 0
    END
  );

ALTER TABLE public.escala_relatorio_estudio
  ADD COLUMN IF NOT EXISTS payout integer NOT NULL DEFAULT 0
  CHECK (payout >= 0);

ALTER TABLE public.escala_relatorio_estudio
  ALTER COLUMN sos SET DEFAULT 0,
  ALTER COLUMN sinais SET DEFAULT 0;

ALTER TABLE public.escala_relatorio_estudio
  DROP CONSTRAINT IF EXISTS escala_relatorio_estudio_sos_nao_negativo;
ALTER TABLE public.escala_relatorio_estudio
  ADD CONSTRAINT escala_relatorio_estudio_sos_nao_negativo CHECK (sos >= 0);

ALTER TABLE public.escala_relatorio_estudio
  DROP CONSTRAINT IF EXISTS escala_relatorio_estudio_sinais_nao_negativo;
ALTER TABLE public.escala_relatorio_estudio
  ADD CONSTRAINT escala_relatorio_estudio_sinais_nao_negativo CHECK (sinais >= 0);

COMMENT ON COLUMN public.escala_relatorio_estudio.sos IS 'Quantidade de SOS no turno.';
COMMENT ON COLUMN public.escala_relatorio_estudio.sinais IS 'Quantidade de sinais no turno.';
COMMENT ON COLUMN public.escala_relatorio_estudio.payout IS 'Payout numérico do turno.';

-- Roletas: match case-insensitive / nome da mesa; não exigir estúdio ativo
-- (evita omitir Roleta do Sports Club por slug/tipo/ativo).
CREATE OR REPLACE FUNCTION public.escala_relatorio_turno_opcoes_manutencao()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estudios jsonb;
  v_roletas jsonb;
BEGIN
  IF NOT public._escala_relatorio_turno_perm('view')
     AND NOT public._escala_relatorio_turno_perm('create') THEN
    RAISE EXCEPTION 'sem permissão';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('slug', e.slug, 'nome', e.nome) ORDER BY e.nome
  ), '[]'::jsonb)
  INTO v_estudios
  FROM public.estudios_spin e
  WHERE e.ativo IS TRUE;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'key', m.id::text,
      'label',
        COALESCE(NULLIF(trim(es.nome), ''), NULLIF(trim(m.estudio_slug), ''), 'Estúdio')
        || ' - Roleta '
        || COALESCE(
          NULLIF(trim(m.numero_mesa), ''),
          NULLIF(trim(m.nome_mesa), ''),
          '?'
        )
    )
    ORDER BY COALESCE(es.nome, m.estudio_slug), m.numero_mesa NULLS LAST, m.nome_mesa
  ), '[]'::jsonb)
  INTO v_roletas
  FROM public.mesas_spin_cadastro m
  LEFT JOIN public.estudios_spin es ON es.slug = m.estudio_slug
  WHERE
    lower(trim(COALESCE(m.tipo_jogo, ''))) LIKE '%roleta%'
    OR lower(trim(COALESCE(m.tipo_jogo, ''))) LIKE '%roulette%'
    OR lower(trim(COALESCE(m.nome_mesa, ''))) LIKE '%roleta%'
    OR lower(trim(COALESCE(m.nome_mesa, ''))) LIKE '%roulette%';

  RETURN jsonb_build_object('estudios', v_estudios, 'roletas', v_roletas);
END;
$$;

COMMENT ON FUNCTION public.escala_relatorio_turno_opcoes_manutencao() IS
  'Opções de checklist: estúdios ativos + mesas Roleta (incl. Sports Club; match flexível em tipo_jogo/nome).';

COMMIT;
