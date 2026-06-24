-- Legado Figurinos — Camisa Masculino Único Sports Club (self-contained)
-- Executar no SQL Editor do Supabase (role postgres) — arquivo INTEIRO de uma vez.
--
-- Pré-requisito Supabase: migrações aplicadas
--   • 20260619140000_rh_figurino_codigo_por_categoria.sql
--   • 20260619150000_rh_figurino_atende_todos_estudios.sql
--   • 20260619160000_rh_figurino_genero_cor.sql
--
-- Total: 54 peças (13 P + 17 M + 15 G + 9 GG)
-- Estúdio: slug sports_clube (Sports Club — network)
-- Gênero: Masculino | Cor: Único | Entrada: 01/01/2026
--
-- Conferir slug antes de rodar:
--   SELECT slug, nome, tipo, ativo FROM public.estudios_spin WHERE nome ILIKE '%sports%';

-- ─── Função de lote (criada aqui se ainda não existir no banco) ───────────────

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
        'rh_figurino_validation: informe ao menos um estúdio (array vazio).'
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

REVOKE ALL ON FUNCTION public.rh_figurino_criar_pecas_lote(text[], text, text, date, integer, text, text, text, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_figurino_criar_pecas_lote(text[], text, text, date, integer, text, text, text, text, boolean) FROM authenticated;
REVOKE ALL ON FUNCTION public.rh_figurino_criar_pecas_lote(text[], text, text, date, integer, text, text, text, text, boolean) FROM anon;

-- ─── Carga legado Camisa Masculino Único (Sports Club) ───────────────────────

DO $carga$
DECLARE
  v_est   text[] := ARRAY['sports_clube']::text[];
  v_row   record;
  v_total integer := 0;
  v_n     bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = '_rh_figurino_next_category_code'
  ) THEN
    RAISE EXCEPTION
      'Função _rh_figurino_next_category_code não encontrada. Aplique a migração 20260619140000_rh_figurino_codigo_por_categoria.sql.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rh_figurino_pecas'
      AND column_name = 'genero'
  ) THEN
    RAISE EXCEPTION
      'Coluna genero não encontrada. Aplique a migração 20260619160000_rh_figurino_genero_cor.sql.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.estudios_spin WHERE slug = 'sports_clube' AND ativo = true
  ) THEN
    RAISE EXCEPTION
      'Estúdio sports_clube não encontrado ou inativo. SELECT slug, nome FROM estudios_spin WHERE ativo;';
  END IF;

  RAISE NOTICE 'Estúdio: sports_clube (Sports Club) | Gênero: Masculino | Cor: Único | Data: 2026-01-01';

  FOR v_row IN
    SELECT tamanho::text AS tamanho, quantidade::integer AS quantidade
    FROM (VALUES
      ('P',  13),
      ('M',  17),
      ('G',  15),
      ('GG', 9)
    ) AS lotes(tamanho, quantidade)
    ORDER BY array_position(ARRAY['P', 'M', 'G', 'GG'], tamanho)
  LOOP
    SELECT count(*) INTO v_n
    FROM public.rh_figurino_criar_pecas_lote(
      p_estudio_slugs   := v_est,
      p_category        := 'Camisa'::text,
      p_size            := v_row.tamanho,
      p_purchase_date   := DATE '2026-01-01',
      p_quantidade      := v_row.quantidade,
      p_actor           := 'carga-legado'::text,
      p_description     := ('Legado — Camisa ' || v_row.tamanho || ' Masculino Único — Sports Club')::text,
      p_genero          := 'Masculino'::text,
      p_cor             := 'Único'::text
    );

    IF v_n <> v_row.quantidade THEN
      RAISE EXCEPTION 'Esperado % peça(s) Camisa %, cadastradas %', v_row.quantidade, v_row.tamanho, v_n;
    END IF;

    v_total := v_total + v_row.quantidade;
    RAISE NOTICE 'Camisa % Masculino Único (Sports Club): % peça(s).', v_row.tamanho, v_row.quantidade;
  END LOOP;

  RAISE NOTICE 'Carga concluída — % peça(s) Sports Club.', v_total;
END;
$carga$;

-- ─── Conferência ─────────────────────────────────────────────────────────────
-- SELECT p.size, p.genero, p.cor, count(*) AS qtd
-- FROM public.rh_figurino_pecas p
-- INNER JOIN public.rh_figurino_peca_estudios je ON je.peca_id = p.id AND je.estudio_slug = 'sports_clube'
-- WHERE p.category = 'Camisa' AND p.cor = 'Único' AND p.genero = 'Masculino'
-- GROUP BY p.size, p.genero, p.cor
-- ORDER BY array_position(ARRAY['P','M','G','GG'], p.size);
