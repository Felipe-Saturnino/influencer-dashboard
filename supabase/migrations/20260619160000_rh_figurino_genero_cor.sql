-- Figurinos: gênero e cor obrigatórios no cadastro de peças.

BEGIN;

ALTER TABLE public.rh_figurino_pecas
  ADD COLUMN IF NOT EXISTS genero text,
  ADD COLUMN IF NOT EXISTS cor text;

UPDATE public.rh_figurino_pecas
SET
  genero = coalesce(genero, 'Unisex'),
  cor = coalesce(cor, 'Único')
WHERE genero IS NULL OR cor IS NULL;

ALTER TABLE public.rh_figurino_pecas
  ALTER COLUMN genero SET DEFAULT 'Unisex',
  ALTER COLUMN genero SET NOT NULL,
  ALTER COLUMN cor SET DEFAULT 'Único',
  ALTER COLUMN cor SET NOT NULL;

ALTER TABLE public.rh_figurino_pecas
  DROP CONSTRAINT IF EXISTS rh_figurino_pecas_genero_check,
  DROP CONSTRAINT IF EXISTS rh_figurino_pecas_cor_check;

ALTER TABLE public.rh_figurino_pecas
  ADD CONSTRAINT rh_figurino_pecas_genero_check
    CHECK (genero IN ('Masculino', 'Feminino', 'Unisex')),
  ADD CONSTRAINT rh_figurino_pecas_cor_check
    CHECK (cor IN ('Branco', 'Preto', 'Cinza', 'Único'));

COMMENT ON COLUMN public.rh_figurino_pecas.genero IS
  'Gênero da peça: Masculino, Feminino ou Unisex.';
COMMENT ON COLUMN public.rh_figurino_pecas.cor IS
  'Cor da peça: Branco, Preto, Cinza ou Único.';

DROP FUNCTION IF EXISTS public.rh_figurino_criar_peca(text[], text, text, date, text, text, boolean);

CREATE OR REPLACE FUNCTION public.rh_figurino_criar_peca(
  p_estudio_slugs text[],
  p_category text,
  p_size text,
  p_genero text,
  p_cor text,
  p_purchase_date date,
  p_description text,
  p_actor text,
  p_atende_todos_estudios boolean DEFAULT false
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
  v_genero text;
  v_cor    text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'rh_figurino_not_authenticated' USING ERRCODE = 'P0001';
  END IF;

  v_genero := trim(coalesce(p_genero, ''));
  v_cor := trim(coalesce(p_cor, ''));

  IF trim(coalesce(p_category, '')) = '' OR trim(coalesce(p_size, '')) = '' THEN
    RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
  END IF;
  IF v_genero NOT IN ('Masculino', 'Feminino', 'Unisex') THEN
    RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
  END IF;
  IF v_cor NOT IN ('Branco', 'Preto', 'Cinza', 'Único') THEN
    RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
  END IF;
  IF p_purchase_date IS NULL THEN
    RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
  END IF;

  IF coalesce(p_atende_todos_estudios, false) THEN
    IF NOT public._rh_figurino_auth_can_criar_peca() THEN
      RAISE EXCEPTION 'rh_figurino_forbidden' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    IF p_estudio_slugs IS NULL OR cardinality(p_estudio_slugs) = 0 THEN
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
  END IF;

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
    code, barcode, name, category, size, genero, cor, description,
    purchase_date, status, condition, atende_todos_estudios
  ) VALUES (
    v_code, v_bar, v_code, trim(p_category), trim(p_size), v_genero, v_cor,
    nullif(trim(coalesce(p_description, '')), ''),
    p_purchase_date, 'available', 'good', coalesce(p_atende_todos_estudios, false)
  )
  RETURNING * INTO v_row;

  IF coalesce(p_atende_todos_estudios, false) THEN
    INSERT INTO public.rh_figurino_peca_operadoras (peca_id, operadora_slug)
    SELECT DISTINCT v_row.id, eo.operadora_slug
    FROM public.estudios_spin e
    INNER JOIN public.estudios_spin_operadoras eo ON eo.estudio_slug = e.slug
    WHERE e.ativo = true
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.rh_figurino_peca_estudios (peca_id, estudio_slug)
    SELECT DISTINCT v_row.id, trim(both from s.slug)
    FROM unnest(p_estudio_slugs) AS s(slug)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.rh_figurino_peca_operadoras (peca_id, operadora_slug)
    SELECT DISTINCT v_row.id, eo.operadora_slug
    FROM unnest(p_estudio_slugs) AS s(slug)
    INNER JOIN public.estudios_spin_operadoras eo ON eo.estudio_slug = trim(both from s.slug)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.rh_figurino_status_history (item_id, previous_status, new_status, changed_by, notes)
  VALUES (
    v_row.id, NULL, 'available',
    coalesce(nullif(trim(p_actor), ''), 'sistema'),
    CASE WHEN coalesce(p_atende_todos_estudios, false) THEN 'Cadastro — todos os estúdios' ELSE 'Cadastro' END
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_figurino_criar_peca(text[], text, text, text, text, date, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_figurino_criar_peca(text[], text, text, text, text, date, text, text, boolean) TO authenticated;

COMMENT ON FUNCTION public.rh_figurino_criar_peca(text[], text, text, text, text, date, text, text, boolean) IS
  'Cadastra peça de figurino com gênero e cor; p_atende_todos_estudios=true dispensa slugs.';

-- Lote (SQL Editor): defaults Unisex / Único para cargas legadas sem informar gênero/cor.
DROP FUNCTION IF EXISTS public.rh_figurino_criar_pecas_lote(text[], text, text, date, integer, text, text);

CREATE OR REPLACE FUNCTION public.rh_figurino_criar_pecas_lote(
  p_estudio_slugs   text[],
  p_category        text,
  p_size            text,
  p_purchase_date   date,
  p_quantidade      integer,
  p_actor           text DEFAULT 'carga-lote',
  p_description     text DEFAULT NULL,
  p_genero          text DEFAULT 'Unisex',
  p_cor             text DEFAULT 'Único'
)
RETURNS TABLE (
  peca_id   uuid,
  code      text,
  barcode   text,
  category  text,
  size      text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_i      integer;
  v_code   text;
  v_bar    text;
  v_tries  integer;
  v_row    public.rh_figurino_pecas%ROWTYPE;
  v_slug   text;
  v_genero text;
  v_cor    text;
BEGIN
  v_genero := trim(coalesce(p_genero, 'Unisex'));
  v_cor := trim(coalesce(p_cor, 'Único'));

  IF p_estudio_slugs IS NULL OR cardinality(p_estudio_slugs) = 0 THEN
    RAISE EXCEPTION 'rh_figurino_validation: informe ao menos um estúdio (array vazio).' USING ERRCODE = 'P0001';
  END IF;
  IF trim(coalesce(p_category, '')) = '' OR trim(coalesce(p_size, '')) = '' THEN
    RAISE EXCEPTION 'rh_figurino_validation: categoria e tamanho são obrigatórios' USING ERRCODE = 'P0001';
  END IF;
  IF v_genero NOT IN ('Masculino', 'Feminino', 'Unisex') THEN
    RAISE EXCEPTION 'rh_figurino_validation: gênero inválido' USING ERRCODE = 'P0001';
  END IF;
  IF v_cor NOT IN ('Branco', 'Preto', 'Cinza', 'Único') THEN
    RAISE EXCEPTION 'rh_figurino_validation: cor inválida' USING ERRCODE = 'P0001';
  END IF;
  IF p_purchase_date IS NULL THEN
    RAISE EXCEPTION 'rh_figurino_validation: data de entrada é obrigatória' USING ERRCODE = 'P0001';
  END IF;
  IF p_quantidade IS NULL OR p_quantidade < 1 THEN
    RAISE EXCEPTION 'rh_figurino_validation: quantidade deve ser >= 1' USING ERRCODE = 'P0001';
  END IF;

  FOREACH v_slug IN ARRAY p_estudio_slugs
  LOOP
    v_slug := trim(v_slug);
    IF v_slug = '' THEN
      RAISE EXCEPTION 'rh_figurino_validation: slug de estúdio vazio' USING ERRCODE = 'P0001';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.estudios_spin e
      WHERE e.slug = v_slug AND e.ativo = true
    ) THEN
      RAISE EXCEPTION 'rh_figurino_validation: estúdio inexistente ou inativo: %', v_slug USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  FOR v_i IN 1 .. p_quantidade
  LOOP
    v_code := public._rh_figurino_next_category_code(p_category, true);

    v_tries := 0;
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
      code, barcode, name, category, size, genero, cor, description,
      purchase_date, status, condition, atende_todos_estudios
    ) VALUES (
      v_code, v_bar, v_code, trim(p_category), trim(p_size), v_genero, v_cor,
      nullif(trim(coalesce(p_description, '')), ''),
      p_purchase_date, 'available', 'good', false
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
    VALUES (
      v_row.id, NULL, 'available',
      coalesce(nullif(trim(p_actor), ''), 'carga-lote'),
      'Cadastro em lote'
    );

    peca_id  := v_row.id;
    code     := v_row.code;
    barcode  := v_row.barcode;
    category := v_row.category;
    size     := v_row.size;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_figurino_criar_pecas_lote(text[], text, text, date, integer, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_figurino_criar_pecas_lote(text[], text, text, date, integer, text, text, text, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.rh_figurino_criar_pecas_lote(text[], text, text, date, integer, text, text, text, text) FROM anon;

COMMIT;
