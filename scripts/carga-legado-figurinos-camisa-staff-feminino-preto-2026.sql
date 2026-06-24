-- Legado Figurinos — Camisa Feminino Preto Staff (self-contained)
-- Executar no SQL Editor do Supabase (role postgres) — arquivo INTEIRO de uma vez.
--
-- Pré-requisitos Supabase:
--   • 20260619140000_rh_figurino_codigo_por_categoria.sql
--   • 20260619160000_rh_figurino_genero_cor.sql
--   • 20260619180000_rh_figurino_atende_staff.sql
--   • 20260923130000_rh_figurino_staff_com_estudios.sql (opcional se rodar este arquivo inteiro)
--
-- Total: 40 peças (2 P + 4 M + 3 G + 2×38 + 2×40 + 6×42 + 9×44 + 4×46 + 8×48)
-- Escopo: Staff only (atende_staff = true, sem estúdio N:N)
-- Gênero: Feminino | Cor: Preto | Entrada: 01/01/2026
-- Códigos: prefixo CAM-*

-- ─── Função de lote ───────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.rh_figurino_criar_pecas_lote(text[], text, text, date, integer, text, text, text, text);
DROP FUNCTION IF EXISTS public.rh_figurino_criar_pecas_lote(text[], text, text, date, integer, text, text, text, text, boolean);
DROP FUNCTION IF EXISTS public.rh_figurino_criar_pecas_lote(text[], text, text, date, integer, text, text, text, text, boolean, boolean);

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
  v_tem_slugs boolean;
BEGIN
  v_genero := trim(coalesce(p_genero, 'Unisex'));
  v_cor := trim(coalesce(p_cor, 'Único'));
  v_tem_slugs := p_estudio_slugs IS NOT NULL AND cardinality(p_estudio_slugs) > 0;

  IF coalesce(p_atende_staff, false) AND coalesce(p_atende_todos_estudios, false) THEN
    RAISE EXCEPTION 'rh_figurino_validation: Staff e Todos Estúdios são mutuamente exclusivos' USING ERRCODE = 'P0001';
  END IF;

  IF coalesce(p_atende_todos_estudios, false) AND v_tem_slugs THEN
    RAISE EXCEPTION 'rh_figurino_validation: Todos Estúdios não aceita slugs de estúdio' USING ERRCODE = 'P0001';
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

  IF NOT coalesce(p_atende_todos_estudios, false)
     AND NOT coalesce(p_atende_staff, false)
     AND NOT v_tem_slugs THEN
    RAISE EXCEPTION 'rh_figurino_validation: informe Staff, Todos Estúdios ou ao menos um estúdio' USING ERRCODE = 'P0001';
  END IF;

  IF coalesce(p_atende_todos_estudios, false) THEN
    IF NOT EXISTS (SELECT 1 FROM public.estudios_spin e WHERE e.ativo = true) THEN
      RAISE EXCEPTION 'rh_figurino_validation: nenhum estúdio ativo para Todos Estúdios' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF v_tem_slugs THEN
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

    IF coalesce(p_atende_todos_estudios, false) THEN
      INSERT INTO public.rh_figurino_peca_operadoras (peca_id, operadora_slug)
      SELECT DISTINCT v_row.id, eo.operadora_slug
      FROM public.estudios_spin e
      INNER JOIN public.estudios_spin_operadoras eo ON eo.estudio_slug = e.slug
      WHERE e.ativo = true
      ON CONFLICT DO NOTHING;
    ELSIF v_tem_slugs THEN
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
        WHEN coalesce(p_atende_staff, false) AND v_tem_slugs THEN 'Cadastro em lote — staff + estúdios'
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

-- ─── Carga legado Camisa Feminino Preto — Staff ──────────────────────────────

DO $carga$
DECLARE
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
      'Função _rh_figurino_next_category_code não encontrada. Aplique 20260619140000_rh_figurino_codigo_por_categoria.sql.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rh_figurino_pecas'
      AND column_name = 'atende_staff'
  ) THEN
    RAISE EXCEPTION
      'Coluna atende_staff não encontrada. Aplique 20260619180000_rh_figurino_atende_staff.sql.';
  END IF;

  RAISE NOTICE 'Camisa | Staff | Feminino | Preto | Data: 2026-01-01';

  FOR v_row IN
    SELECT tamanho::text AS tamanho, quantidade::integer AS quantidade
    FROM (VALUES
      ('P',  2),
      ('M',  4),
      ('G',  3),
      ('38', 2),
      ('40', 2),
      ('42', 6),
      ('44', 9),
      ('46', 4),
      ('48', 8)
    ) AS lotes(tamanho, quantidade)
    ORDER BY array_position(
      ARRAY['P','M','G','GG','XG','PP','38','40','42','44','46','48','50','52','Único']::text[],
      tamanho
    )
  LOOP
    SELECT count(*) INTO v_n
    FROM public.rh_figurino_criar_pecas_lote(
      p_estudio_slugs           := ARRAY[]::text[],
      p_category                := 'Camisa'::text,
      p_size                    := v_row.tamanho,
      p_purchase_date           := DATE '2026-01-01',
      p_quantidade              := v_row.quantidade,
      p_actor                   := 'carga-legado'::text,
      p_description             := ('Legado — Camisa ' || v_row.tamanho || ' Feminino Preto — Staff')::text,
      p_genero                  := 'Feminino'::text,
      p_cor                     := 'Preto'::text,
      p_atende_todos_estudios   := false,
      p_atende_staff            := true
    );

    IF v_n <> v_row.quantidade THEN
      RAISE EXCEPTION 'Esperado % peça(s) Camisa %, cadastradas %', v_row.quantidade, v_row.tamanho, v_n;
    END IF;

    v_total := v_total + v_row.quantidade;
    RAISE NOTICE 'Camisa % Feminino Preto (Staff): % peça(s).', v_row.tamanho, v_row.quantidade;
  END LOOP;

  RAISE NOTICE 'Carga concluída — % peça(s) Camisa Staff Feminino Preto (CAM-*).', v_total;
END;
$carga$;

-- ─── Conferência ─────────────────────────────────────────────────────────────
-- SELECT p.size, count(*) AS qtd, min(p.code) AS primeiro, max(p.code) AS ultimo
-- FROM public.rh_figurino_pecas p
-- WHERE p.category = 'Camisa'
--   AND p.cor = 'Preto'
--   AND p.genero = 'Feminino'
--   AND p.atende_staff = true
-- GROUP BY p.size
-- ORDER BY array_position(
--   ARRAY['P','M','G','38','40','42','44','46','48']::text[], p.size
-- );
