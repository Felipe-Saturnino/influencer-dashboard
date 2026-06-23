-- Carga em lote — RH Figurinos
-- Executar no SQL Editor do Supabase (role postgres / service_role).
--
-- Pré-requisito: migração 20260619140000_rh_figurino_codigo_por_categoria.sql aplicada
-- (códigos PREFIX-###### por categoria, ex.: CAM-000001).
--
-- IMPORTANTE: informe sempre ESTÚDIOS (`estudios_spin.slug`), não operadoras.
-- Uma operadora (ex.: Blaze) pode ter vários estúdios — o vínculo N:N operadora
-- é derivado automaticamente de `estudios_spin_operadoras` a partir dos estúdios escolhidos.
--
-- ─── 1) Conferir slugs dos estúdios antes de cadastrar ───────────────────────
-- SELECT e.slug AS estudio_slug, e.nome AS estudio_nome, e.tipo,
--        array_agg(eo.operadora_slug ORDER BY eo.operadora_slug) AS operadoras_vinculadas
-- FROM public.estudios_spin e
-- LEFT JOIN public.estudios_spin_operadoras eo ON eo.estudio_slug = e.slug
-- WHERE e.ativo = true
-- GROUP BY e.slug, e.nome, e.tipo
-- ORDER BY e.nome;
-- ─── 2) Função de lote (idempotente — pode rodar CREATE OR REPLACE várias vezes) ─

CREATE OR REPLACE FUNCTION public.rh_figurino_criar_pecas_lote(
  p_estudio_slugs   text[],
  p_category        text,
  p_size            text,
  p_purchase_date   date,
  p_quantidade      int,
  p_actor           text DEFAULT 'carga-lote',
  p_description     text DEFAULT NULL
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
  v_i      int;
  v_code   text;
  v_bar    text;
  v_tries  int;
  v_row    public.rh_figurino_pecas%ROWTYPE;
  v_slug   text;
BEGIN
  IF p_estudio_slugs IS NULL OR cardinality(p_estudio_slugs) = 0 THEN
    RAISE EXCEPTION 'rh_figurino_validation: informe ao menos um estúdio' USING ERRCODE = 'P0001';
  END IF;
  IF trim(coalesce(p_category, '')) = '' OR trim(coalesce(p_size, '')) = '' THEN
    RAISE EXCEPTION 'rh_figurino_validation: categoria e tamanho são obrigatórios' USING ERRCODE = 'P0001';
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

COMMENT ON FUNCTION public.rh_figurino_criar_pecas_lote(text[], text, text, date, int, text, text) IS
  'Carga em lote de peças de figurino (SQL Editor / postgres). p_estudio_slugs = slugs de estudios_spin; operadoras legadas sincronizadas via N:N do estúdio.';
-- Somente postgres/service_role — não expor à app autenticada.
REVOKE ALL ON FUNCTION public.rh_figurino_criar_pecas_lote(text[], text, text, date, int, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_figurino_criar_pecas_lote(text[], text, text, date, int, text, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.rh_figurino_criar_pecas_lote(text[], text, text, date, int, text, text) FROM anon;

-- ─── 3) Exemplo — Camisa P, Estúdio Blaze + Estúdio CDA, 22 peças ───────────
-- Opção A (recomendada): slugs explícitos — copie do SELECT do passo 1.
--
-- BEGIN;
-- SELECT *
-- FROM public.rh_figurino_criar_pecas_lote(
--   p_estudio_slugs   := ARRAY['estudio_blaze', 'estudio_cda'],  -- ajuste aos slugs reais
--   p_category        := 'Camisa',
--   p_size            := 'P',
--   p_purchase_date   := DATE '2026-01-01',
--   p_quantidade      := 22,
--   p_actor           := 'carga-lote',
--   p_description     := NULL
-- );
-- COMMIT;
--
-- Opção B: resolver slugs pelo nome cadastrado em Gestão de Estúdios
-- (nomes devem coincidir exatamente com `estudios_spin.nome`).

BEGIN;

SELECT *
FROM public.rh_figurino_criar_pecas_lote(
  p_estudio_slugs := (
    SELECT coalesce(array_agg(e.slug ORDER BY e.nome), ARRAY[]::text[])
    FROM public.estudios_spin e
    WHERE e.ativo = true
      AND e.nome IN ('Estúdio Blaze', 'Estúdio CDA')  -- ajuste se o nome no cadastro for outro
  ),
  p_category      := 'Camisa',
  p_size          := 'P',
  p_purchase_date := DATE '2026-01-01',
  p_quantidade    := 22,
  p_actor         := 'carga-lote',
  p_description   := NULL
);

COMMIT;

-- ─── 4) Outros lotes — copie e altere só os parâmetros ───────────────────────
--
-- SELECT * FROM public.rh_figurino_criar_pecas_lote(
--   p_estudio_slugs := ARRAY['estudio_blaze'],  -- um estúdio só
--   p_category      := 'Vestido',
--   p_size          := 'M',
--   p_purchase_date := DATE '2026-01-01',
--   p_quantidade    := 10
-- );
--
-- Prefixos por categoria: Camisa→CAM, Calça→CAL, Colete→COL, Vestido→VES,
-- Gravata→GRA, Acessório→ACE.