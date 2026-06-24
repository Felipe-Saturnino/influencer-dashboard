-- Figurinos: peças de uso da equipe Staff (sem vínculo a estúdio).

BEGIN;

ALTER TABLE public.rh_figurino_pecas
  ADD COLUMN IF NOT EXISTS atende_staff boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.rh_figurino_pecas.atende_staff IS
  'Quando true, peça do acervo Staff (equipe que atende todos os estúdios) — sem N:N estúdio/operadora.';

ALTER TABLE public.rh_figurino_pecas
  DROP CONSTRAINT IF EXISTS rh_figurino_pecas_escopo_estudio_exclusivo;

ALTER TABLE public.rh_figurino_pecas
  ADD CONSTRAINT rh_figurino_pecas_escopo_estudio_exclusivo
  CHECK (NOT (atende_staff AND atende_todos_estudios));

DROP FUNCTION IF EXISTS public.rh_figurino_criar_peca(text[], text, text, text, text, date, text, text, boolean);

CREATE OR REPLACE FUNCTION public.rh_figurino_criar_peca(
  p_estudio_slugs text[],
  p_category text,
  p_size text,
  p_genero text,
  p_cor text,
  p_purchase_date date,
  p_description text,
  p_actor text,
  p_atende_todos_estudios boolean DEFAULT false,
  p_atende_staff boolean DEFAULT false
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

  IF coalesce(p_atende_staff, false) AND coalesce(p_atende_todos_estudios, false) THEN
    RAISE EXCEPTION 'rh_figurino_validation' USING ERRCODE = 'P0001';
  END IF;

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

  IF coalesce(p_atende_staff, false) OR coalesce(p_atende_todos_estudios, false) THEN
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
    purchase_date, status, condition, atende_todos_estudios, atende_staff
  ) VALUES (
    v_code, v_bar, v_code, trim(p_category), trim(p_size), v_genero, v_cor,
    nullif(trim(coalesce(p_description, '')), ''),
    p_purchase_date, 'available', 'good',
    coalesce(p_atende_todos_estudios, false),
    coalesce(p_atende_staff, false)
  )
  RETURNING * INTO v_row;

  IF coalesce(p_atende_staff, false) THEN
    NULL;
  ELSIF coalesce(p_atende_todos_estudios, false) THEN
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
    CASE
      WHEN coalesce(p_atende_staff, false) THEN 'Cadastro — staff'
      WHEN coalesce(p_atende_todos_estudios, false) THEN 'Cadastro — todos os estúdios'
      ELSE 'Cadastro'
    END
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_figurino_criar_peca(text[], text, text, text, text, date, text, text, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_figurino_criar_peca(text[], text, text, text, text, date, text, text, boolean, boolean) TO authenticated;

COMMENT ON FUNCTION public.rh_figurino_criar_peca(text[], text, text, text, text, date, text, text, boolean, boolean) IS
  'Cadastra peça; p_atende_staff ou p_atende_todos_estudios dispensa slugs (Staff sem vínculo N:N).';

-- Lote: parâmetro p_atende_staff
DROP FUNCTION IF EXISTS public.rh_figurino_criar_pecas_lote(text[], text, text, date, integer, text, text, text, text, boolean);

CREATE OR REPLACE FUNCTION public.rh_figurino_criar_pecas_lote(
  p_estudio_slugs           text[],
  p_category                text,
  p_size                    text,
  p_purchase_date           date,
  p_quantidade              integer,
  p_actor                   text DEFAULT 'carga-lote',
  p_description             text DEFAULT NULL,
  p_genero                  text DEFAULT 'Unisex',
  p_cor                     text DEFAULT 'Único',
  p_atende_todos_estudios   boolean DEFAULT false,
  p_atende_staff            boolean DEFAULT false
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

  IF coalesce(p_atende_staff, false) AND coalesce(p_atende_todos_estudios, false) THEN
    RAISE EXCEPTION 'rh_figurino_validation: Staff e Todos Estúdios são mutuamente exclusivos' USING ERRCODE = 'P0001';
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

  IF coalesce(p_atende_staff, false) OR coalesce(p_atende_todos_estudios, false) THEN
    IF coalesce(p_atende_staff, false) THEN
      NULL;
    ELSIF NOT EXISTS (SELECT 1 FROM public.estudios_spin e WHERE e.ativo = true) THEN
      RAISE EXCEPTION 'rh_figurino_validation: nenhum estúdio ativo para Todos Estúdios' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    IF p_estudio_slugs IS NULL OR cardinality(p_estudio_slugs) = 0 THEN
      RAISE EXCEPTION 'rh_figurino_validation: informe ao menos um estúdio (array vazio).' USING ERRCODE = 'P0001';
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
  END IF;

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
      purchase_date, status, condition, atende_todos_estudios, atende_staff
    ) VALUES (
      v_code, v_bar, v_code, trim(p_category), trim(p_size), v_genero, v_cor,
      nullif(trim(coalesce(p_description, '')), ''),
      p_purchase_date, 'available', 'good',
      coalesce(p_atende_todos_estudios, false),
      coalesce(p_atende_staff, false)
    )
    RETURNING * INTO v_row;

    IF coalesce(p_atende_staff, false) THEN
      NULL;
    ELSIF coalesce(p_atende_todos_estudios, false) THEN
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
      coalesce(nullif(trim(p_actor), ''), 'carga-lote'),
      CASE
        WHEN coalesce(p_atende_staff, false) THEN 'Cadastro em lote — staff'
        WHEN coalesce(p_atende_todos_estudios, false) THEN 'Cadastro em lote — todos os estúdios'
        ELSE 'Cadastro em lote'
      END
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

REVOKE ALL ON FUNCTION public.rh_figurino_criar_pecas_lote(text[], text, text, date, integer, text, text, text, text, boolean, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_figurino_criar_pecas_lote(text[], text, text, date, integer, text, text, text, text, boolean, boolean) FROM authenticated;
REVOKE ALL ON FUNCTION public.rh_figurino_criar_pecas_lote(text[], text, text, date, integer, text, text, text, text, boolean, boolean) FROM anon;

COMMIT;
