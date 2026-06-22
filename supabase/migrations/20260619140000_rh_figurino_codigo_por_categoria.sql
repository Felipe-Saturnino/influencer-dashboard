-- Figurinos: código por prefixo de categoria (ex.: CAM-000001, VES-000001).
-- Reinicia inventário de testes e contadores por categoria.

BEGIN;

-- Limpa peças de teste e dependências (empréstimos, histórico, N:N).
TRUNCATE TABLE public.rh_figurino_pecas CASCADE;

CREATE TABLE IF NOT EXISTS public.rh_figurino_category_code_counters (
  prefix     text PRIMARY KEY CHECK (char_length(prefix) = 3),
  last_value bigint NOT NULL DEFAULT 0 CHECK (last_value >= 0)
);

COMMENT ON TABLE public.rh_figurino_category_code_counters IS
  'Contador sequencial por prefixo de categoria (3 letras) para códigos de peças de figurino.';

CREATE OR REPLACE FUNCTION public._rh_figurino_category_code_prefix(p_category text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT upper(substring(
    translate(
      lower(trim(coalesce(p_category, ''))),
      'àáâãäåèéêëìíîïòóôõöùúûüçñ',
      'aaaaaaeeeeiiiiooooouuuucn'
    )
    from 1 for 3
  ));
$$;

REVOKE ALL ON FUNCTION public._rh_figurino_category_code_prefix(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_figurino_category_code_prefix(text) TO authenticated;

CREATE OR REPLACE FUNCTION public._rh_figurino_format_category_code(p_prefix text, p_num bigint)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(p_prefix) || '-' || lpad(greatest(p_num, 1)::text, 6, '0');
$$;

CREATE OR REPLACE FUNCTION public._rh_figurino_next_category_code(p_category text, p_consume boolean DEFAULT true)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_next   bigint;
BEGIN
  v_prefix := public._rh_figurino_category_code_prefix(p_category);
  IF v_prefix IS NULL OR char_length(v_prefix) < 3 THEN
    RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.rh_figurino_category_code_counters (prefix, last_value)
  VALUES (v_prefix, 0)
  ON CONFLICT (prefix) DO NOTHING;

  IF p_consume THEN
    UPDATE public.rh_figurino_category_code_counters
    SET last_value = last_value + 1
    WHERE prefix = v_prefix
    RETURNING last_value INTO v_next;
  ELSE
    SELECT c.last_value + 1
    INTO v_next
    FROM public.rh_figurino_category_code_counters c
    WHERE c.prefix = v_prefix;

    IF v_next IS NULL THEN
      v_next := 1;
    END IF;
  END IF;

  RETURN public._rh_figurino_format_category_code(v_prefix, v_next);
END;
$$;

REVOKE ALL ON FUNCTION public._rh_figurino_next_category_code(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_figurino_next_category_code(text, boolean) TO authenticated;

DROP FUNCTION IF EXISTS public.rh_figurino_preview_proximo_code();

CREATE OR REPLACE FUNCTION public.rh_figurino_preview_proximo_code(p_category text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF trim(coalesce(p_category, '')) = '' THEN
    RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
  END IF;
  RETURN public._rh_figurino_next_category_code(p_category, false);
END;
$$;

REVOKE ALL ON FUNCTION public.rh_figurino_preview_proximo_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_figurino_preview_proximo_code(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_figurino_criar_peca(
  p_estudio_slugs text[],
  p_category text,
  p_size text,
  p_purchase_date date,
  p_description text,
  p_actor text
)
RETURNS public.rh_figurino_pecas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code   text;
  v_bar    text;
  v_tries  int := 0;
  v_row    public.rh_figurino_pecas%ROWTYPE;
  v_slug   text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'rh_figurino_not_authenticated' USING ERRCODE = 'P0001';
  END IF;
  IF p_estudio_slugs IS NULL OR cardinality(p_estudio_slugs) = 0 THEN
    RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
  END IF;
  IF trim(coalesce(p_category, '')) = '' OR trim(coalesce(p_size, '')) = '' THEN
    RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
  END IF;
  IF p_purchase_date IS NULL THEN
    RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
  END IF;

  FOREACH v_slug IN ARRAY p_estudio_slugs
  LOOP
    v_slug := trim(v_slug);
    IF v_slug = '' THEN
      RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
    END IF;
    IF NOT public._rh_figurino_auth_can_estudio_slug(v_slug, 'create') THEN
      RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  v_code := public._rh_figurino_next_category_code(p_category, true);

  LOOP
    v_bar := lpad((floor(random() * 1e12)::bigint)::text, 12, '0');
    v_tries := v_tries + 1;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.rh_figurino_pecas p WHERE p.barcode = v_bar);
    EXIT WHEN v_tries >= 25;
  END LOOP;
  IF EXISTS (SELECT 1 FROM public.rh_figurino_pecas p WHERE p.barcode = v_bar) THEN
    RAISE EXCEPTION 'rh_figurino_barcode_collision' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.rh_figurino_pecas (
    code, barcode, name, category, size, description,
    purchase_date, status, condition
  ) VALUES (
    v_code, v_bar, v_code, trim(p_category), trim(p_size),
    nullif(trim(coalesce(p_description, '')), ''),
    p_purchase_date, 'available', 'good'
  )
  RETURNING * INTO v_row;

  INSERT INTO public.rh_figurino_peca_estudios (peca_id, estudio_slug)
  SELECT DISTINCT v_row.id, trim(both from s.slug)
  FROM unnest(p_estudio_slugs) AS s(slug)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.rh_figurino_peca_operadoras (peca_id, operadora_slug)
  SELECT DISTINCT v_row.id, eo.operadora_slug
  FROM unnest(p_estudio_slugs) AS s(slug)
  INNER JOIN public.estudios_spin_operadoras eo ON eo.estudio_slug = trim(both from s.slug)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
  VALUES (v_row.id, NULL, 'available', coalesce(nullif(trim(p_actor), ''), 'sistema'), 'Cadastro');

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_figurino_criar_peca(text[], text, text, date, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_figurino_criar_peca(text[], text, text, date, text, text) TO authenticated;

COMMENT ON FUNCTION public.rh_figurino_criar_peca(text[], text, text, date, text, text) IS
  'Cadastra peça de figurino; código PREFIX-###### com prefixo das 3 primeiras letras da categoria.';

COMMENT ON FUNCTION public.rh_figurino_preview_proximo_code(text) IS
  'Pré-visualiza o próximo código da categoria sem consumir o contador.';

-- Sequência legada FIG-###### (substituída por contadores por categoria).
DROP SEQUENCE IF EXISTS public.rh_figurino_code_seq;

COMMENT ON TABLE public.rh_figurino_pecas IS
  'RH — peças de figurino; códigos PREFIX-###### por categoria e barcode únicos.';

COMMIT;
