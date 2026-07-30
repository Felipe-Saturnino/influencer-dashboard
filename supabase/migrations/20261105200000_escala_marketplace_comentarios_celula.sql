-- Escala Estúdio: snapshot dos detalhes de Compra, Venda e Troca por célula.

BEGIN;

CREATE TABLE IF NOT EXISTS public.escala_marketplace_celula_comentario (
  oferta_id uuid NOT NULL REFERENCES public.escala_marketplace_oferta (id) ON DELETE CASCADE,
  funcionario_id uuid NOT NULL REFERENCES public.rh_funcionarios (id) ON DELETE CASCADE,
  dia_iso date NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('compra', 'venda', 'troca')),
  contraparte_nome text NOT NULL,
  turno_trabalhar text,
  estudio_trabalhar text,
  valor_esperado text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (oferta_id, funcionario_id, dia_iso)
);

CREATE INDEX IF NOT EXISTS escala_marketplace_comentario_func_dia_idx
  ON public.escala_marketplace_celula_comentario (funcionario_id, dia_iso);

ALTER TABLE public.escala_marketplace_celula_comentario ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.escala_marketplace_celula_comentario FROM PUBLIC;
REVOKE ALL ON TABLE public.escala_marketplace_celula_comentario FROM authenticated;

CREATE OR REPLACE FUNCTION public._escala_marketplace_comentarios_registrar(p_oferta_id uuid)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_oferta public.escala_marketplace_oferta%ROWTYPE;
  v_ofertante public.rh_funcionarios%ROWTYPE;
  v_interessado public.rh_funcionarios%ROWTYPE;
  v_nome_ofertante text;
  v_nome_interessado text;
  v_estudio_ofertante text;
  v_estudio_interessado text;
  v_turno_origem text;
  v_turno_interesse text;
BEGIN
  SELECT * INTO v_oferta
  FROM public.escala_marketplace_oferta o
  WHERE o.id = p_oferta_id AND o.status = 'aceita';

  IF NOT FOUND OR v_oferta.interessado_funcionario_id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_ofertante
  FROM public.rh_funcionarios f
  WHERE f.id = v_oferta.ofertante_funcionario_id;
  SELECT * INTO v_interessado
  FROM public.rh_funcionarios f
  WHERE f.id = v_oferta.interessado_funcionario_id;

  v_nome_ofertante := COALESCE(NULLIF(btrim(v_ofertante.nome), ''), 'Prestador');
  v_nome_interessado := COALESCE(NULLIF(btrim(v_interessado.nome), ''), 'Prestador');
  v_estudio_ofertante := COALESCE(
    NULLIF(public._escala_marketplace_estudio_label(v_ofertante), ''),
    '—'
  );
  v_estudio_interessado := COALESCE(
    NULLIF(public._escala_marketplace_estudio_label(v_interessado), ''),
    '—'
  );
  v_turno_origem := COALESCE(
    public._escala_marketplace_turno_label_grade(v_oferta.turno_label),
    public._escala_marketplace_turno_label_grade(v_oferta.valor_celula_origem),
    '—'
  );
  v_turno_interesse := COALESCE(
    public._escala_marketplace_turno_label_grade(v_oferta.valor_celula_interesse),
    '—'
  );

  DELETE FROM public.escala_marketplace_celula_comentario c
  WHERE c.oferta_id = p_oferta_id;

  IF v_oferta.tipo = 'venda_turno' THEN
    INSERT INTO public.escala_marketplace_celula_comentario (
      oferta_id, funcionario_id, dia_iso, tipo, contraparte_nome,
      turno_trabalhar, estudio_trabalhar, valor_esperado
    )
    VALUES
      (
        v_oferta.id, v_oferta.ofertante_funcionario_id, v_oferta.dia_iso,
        'venda', v_nome_interessado, NULL, NULL, 'Venda'
      ),
      (
        v_oferta.id, v_oferta.interessado_funcionario_id, v_oferta.dia_iso,
        'compra', v_nome_ofertante, v_turno_origem, v_estudio_ofertante,
        'Compra - ' || v_turno_origem
      );

  ELSIF v_oferta.tipo = 'venda_folga' THEN
    INSERT INTO public.escala_marketplace_celula_comentario (
      oferta_id, funcionario_id, dia_iso, tipo, contraparte_nome,
      turno_trabalhar, estudio_trabalhar, valor_esperado
    )
    VALUES
      (
        v_oferta.id, v_oferta.interessado_funcionario_id, v_oferta.dia_iso,
        'venda', v_nome_ofertante, NULL, NULL, 'Venda'
      ),
      (
        v_oferta.id, v_oferta.ofertante_funcionario_id, v_oferta.dia_iso,
        'compra', v_nome_interessado, v_turno_origem, v_estudio_interessado,
        'Compra - ' || v_turno_origem
      );

  ELSIF v_oferta.tipo = 'oferta_troca' AND v_oferta.dia_iso_interesse IS NOT NULL THEN
    INSERT INTO public.escala_marketplace_celula_comentario (
      oferta_id, funcionario_id, dia_iso, tipo, contraparte_nome,
      turno_trabalhar, estudio_trabalhar, valor_esperado
    )
    VALUES
      (
        v_oferta.id, v_oferta.ofertante_funcionario_id, v_oferta.dia_iso,
        'troca', v_nome_interessado, v_turno_interesse, v_estudio_interessado,
        CASE WHEN EXISTS (
          SELECT 1 FROM public.rh_gestao_escala_grade g
          WHERE g.funcionario_id = v_oferta.ofertante_funcionario_id
            AND g.dia_iso = v_oferta.dia_iso
            AND g.area_key = public._escala_marketplace_area_key(v_oferta.org_time_id)
            AND btrim(g.valor) = 'Troca'
        ) THEN 'Troca' ELSE 'Venda' END
      ),
      (
        v_oferta.id, v_oferta.ofertante_funcionario_id, v_oferta.dia_iso_interesse,
        'troca', v_nome_interessado, v_turno_interesse, v_estudio_interessado,
        CASE WHEN EXISTS (
          SELECT 1 FROM public.rh_gestao_escala_grade g
          WHERE g.funcionario_id = v_oferta.ofertante_funcionario_id
            AND g.dia_iso = v_oferta.dia_iso_interesse
            AND g.area_key = public._escala_marketplace_area_key(v_oferta.org_time_id)
            AND btrim(g.valor) = 'Troca'
        ) THEN 'Troca' ELSE 'Compra - ' || v_turno_interesse END
      ),
      (
        v_oferta.id, v_oferta.interessado_funcionario_id, v_oferta.dia_iso,
        'troca', v_nome_ofertante, v_turno_origem, v_estudio_ofertante,
        CASE WHEN EXISTS (
          SELECT 1 FROM public.rh_gestao_escala_grade g
          WHERE g.funcionario_id = v_oferta.interessado_funcionario_id
            AND g.dia_iso = v_oferta.dia_iso
            AND g.area_key = public._escala_marketplace_area_key(v_oferta.org_time_id)
            AND btrim(g.valor) = 'Troca'
        ) THEN 'Troca' ELSE 'Compra - ' || v_turno_origem END
      ),
      (
        v_oferta.id, v_oferta.interessado_funcionario_id, v_oferta.dia_iso_interesse,
        'troca', v_nome_ofertante, v_turno_origem, v_estudio_ofertante,
        CASE WHEN EXISTS (
          SELECT 1 FROM public.rh_gestao_escala_grade g
          WHERE g.funcionario_id = v_oferta.interessado_funcionario_id
            AND g.dia_iso = v_oferta.dia_iso_interesse
            AND g.area_key = public._escala_marketplace_area_key(v_oferta.org_time_id)
            AND btrim(g.valor) = 'Troca'
        ) THEN 'Troca' ELSE 'Venda' END
      );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._escala_marketplace_comentarios_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'aceita' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public._escala_marketplace_comentarios_registrar(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS escala_marketplace_comentarios_aceite_trg
  ON public.escala_marketplace_oferta;
CREATE TRIGGER escala_marketplace_comentarios_aceite_trg
AFTER UPDATE OF status ON public.escala_marketplace_oferta
FOR EACH ROW
EXECUTE FUNCTION public._escala_marketplace_comentarios_trigger();

-- Backfill das negociações aceitas antes desta migração.
SELECT public._escala_marketplace_comentarios_registrar(o.id)
FROM public.escala_marketplace_oferta o
WHERE o.status = 'aceita';

CREATE OR REPLACE FUNCTION public.rh_gestao_escala_marketplace_comentarios(
  p_ref_mes date,
  p_area_key text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_area text := lower(btrim(COALESCE(p_area_key, '')));
  v_out jsonb;
BEGIN
  IF auth.uid() IS NULL OR v_area = '' THEN
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

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'funcionario_id', c.funcionario_id,
        'dia_iso', c.dia_iso,
        'tipo', c.tipo,
        'contraparte_nome', c.contraparte_nome,
        'turno_trabalhar', c.turno_trabalhar,
        'estudio_trabalhar', c.estudio_trabalhar
      )
      ORDER BY c.dia_iso, c.funcionario_id
    ),
    '[]'::jsonb
  )
  INTO v_out
  FROM public.escala_marketplace_celula_comentario c
  INNER JOIN public.escala_marketplace_oferta o ON o.id = c.oferta_id
  INNER JOIN public.rh_gestao_escala_grade g
    ON g.funcionario_id = c.funcionario_id
   AND g.dia_iso = c.dia_iso
   AND g.ref_mes = v_ref
   AND g.area_key = v_area
   AND btrim(g.valor) = btrim(c.valor_esperado)
  WHERE date_trunc('month', c.dia_iso)::date = v_ref
    AND public._escala_marketplace_area_key(o.org_time_id) = v_area
    AND o.status = 'aceita';

  RETURN COALESCE(v_out, '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.rh_gestao_escala_marketplace_comentarios(date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_gestao_escala_marketplace_comentarios(date, text) TO authenticated;

COMMENT ON TABLE public.escala_marketplace_celula_comentario IS
  'Snapshot dos comentários exibidos nas células alteradas pelo Marketplace.';
COMMENT ON FUNCTION public.rh_gestao_escala_marketplace_comentarios(date, text) IS
  'Comentários de Compra, Venda e Troca do Marketplace para a Escala Estúdio.';

COMMIT;
