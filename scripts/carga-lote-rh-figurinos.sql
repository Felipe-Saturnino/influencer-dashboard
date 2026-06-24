-- Carga em lote — RH Figurinos
-- Executar no SQL Editor do Supabase (role postgres / service_role).
--
-- Pré-requisito: migrações aplicadas até 20260619170000_rh_figurino_lote_todos_estudios.sql
-- (códigos PREFIX-######; gênero/cor; lote com p_atende_todos_estudios).
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

DROP FUNCTION IF EXISTS public.rh_figurino_criar_pecas_lote(text[], text, text, date, integer, text, text, text, text);

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
  p_atende_todos_estudios   boolean DEFAULT false
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
  v_genero text;
  v_cor    text;
BEGIN
  v_genero := trim(coalesce(p_genero, 'Unisex'));
  v_cor := trim(coalesce(p_cor, 'Único'));

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

  IF coalesce(p_atende_todos_estudios, false) THEN
    IF NOT EXISTS (SELECT 1 FROM public.estudios_spin e WHERE e.ativo = true) THEN
      RAISE EXCEPTION 'rh_figurino_validation: nenhum estúdio ativo para Todos Estúdios' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    IF p_estudio_slugs IS NULL OR cardinality(p_estudio_slugs) = 0 THEN
      RAISE EXCEPTION
        'rh_figurino_validation: informe ao menos um estúdio (array vazio). Confira slugs: SELECT slug, nome FROM estudios_spin WHERE ativo;'
        USING ERRCODE = 'P0001';
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
      coalesce(nullif(trim(p_actor), ''), 'carga-lote'),
      CASE
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

COMMENT ON FUNCTION public.rh_figurino_criar_pecas_lote(text[], text, text, date, integer, text, text, text, text, boolean) IS
  'Carga em lote de peças de figurino (SQL Editor / postgres). p_atende_todos_estudios=true dispensa slugs.';
-- Somente postgres/service_role — não expor à app autenticada.
REVOKE ALL ON FUNCTION public.rh_figurino_criar_pecas_lote(text[], text, text, date, integer, text, text, text, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_figurino_criar_pecas_lote(text[], text, text, date, integer, text, text, text, text, boolean) FROM authenticated;
REVOKE ALL ON FUNCTION public.rh_figurino_criar_pecas_lote(text[], text, text, date, integer, text, text, text, text, boolean) FROM anon;

-- ─── 3) Exemplo — Camisa P, Estúdio Blaze + Estúdio CDA, 22 peças ───────────
-- Opção A (recomendada): slugs explícitos — copie do SELECT do passo 1.
--
-- BEGIN;
-- SELECT *
-- FROM public.rh_figurino_criar_pecas_lote(
--   p_estudio_slugs   := ARRAY['blaze', 'cda'],
--   p_category        := 'Camisa',
--   p_size            := 'P',
--   p_purchase_date   := DATE '2026-01-01',
--   p_quantidade      := 22,
--   p_actor           := 'carga-lote',
--   p_description     := NULL
-- );
-- COMMIT;
--
-- Opção B: resolver slugs pelo nome (`estudios_spin.nome` = Blaze, CDA)

-- BEGIN;
-- SELECT *
-- FROM public.rh_figurino_criar_pecas_lote(
--   p_estudio_slugs := (
--     SELECT coalesce(array_agg(e.slug ORDER BY e.nome), ARRAY[]::text[])
--     FROM public.estudios_spin e
--     WHERE e.ativo = true
--       AND e.slug IN ('blaze', 'cda')
--   ),
--   p_category      := 'Camisa',
--   p_size          := 'P',
--   p_purchase_date := DATE '2026-01-01',
--   p_quantidade    := 22,
--   p_actor         := 'carga-lote',
--   p_description   := NULL
-- );
-- COMMIT;

-- Legado Camisa Blaze+CDA (99 peças, Masculino Branco): scripts/carga-legado-figurinos-camisa-blaze-cda-2026.sql
-- Legado Camisa Todos Estúdios (59 peças, Masculino Preto): scripts/carga-legado-figurinos-camisa-todos-estudios-preto-2026.sql
-- Legado Camisa CDA (98 peças, Masculino Cinza): scripts/carga-legado-figurinos-camisa-cda-cinza-2026.sql
-- Legado Camisa Sports Club (54 peças, Masculino Único): scripts/carga-legado-figurinos-camisa-sports-clube-unico-2026.sql
-- Legado Calça Sports Club (56 peças, Masculino Único): scripts/carga-legado-figurinos-calca-sports-clube-unico-2026.sql

-- ─── 4) Outros lotes — copie e altere só os parâmetros ───────────────────────
--
-- SELECT * FROM public.rh_figurino_criar_pecas_lote(
--   p_estudio_slugs := ARRAY['blaze'],
--   p_category      := 'Vestido',
--   p_size          := 'M',
--   p_purchase_date := DATE '2026-01-01',
--   p_quantidade    := 10
-- );
--
-- Prefixos por categoria: Camisa→CAM, Calça→CAL, Colete→COL, Vestido→VES,
-- Gravata→GRA, Acessório→ACE.