-- Portal da Academy — código de manual por categoria (ex.: Jogos → JOG-000001)

BEGIN;

CREATE TABLE IF NOT EXISTS public.academy_portal_manual_code_counters (
  prefix     text PRIMARY KEY CHECK (char_length(prefix) = 3),
  last_value bigint NOT NULL DEFAULT 0 CHECK (last_value >= 0)
);

COMMENT ON TABLE public.academy_portal_manual_code_counters IS
  'Contador sequencial por prefixo de categoria (3 letras) para códigos de manuais do Portal da Academy.';

CREATE OR REPLACE FUNCTION public._academy_portal_manual_code_prefix(p_categoria text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT upper(substring(
    translate(
      lower(trim(coalesce(p_categoria, ''))),
      'àáâãäåèéêëìíîïòóôõöùúûüçñ',
      'aaaaaaeeeeiiiiooooouuuucn'
    )
    from 1 for 3
  ));
$$;

REVOKE ALL ON FUNCTION public._academy_portal_manual_code_prefix(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._academy_portal_manual_code_prefix(text) TO authenticated;

CREATE OR REPLACE FUNCTION public._academy_portal_manual_format_code(p_prefix text, p_num bigint)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(p_prefix) || '-' || lpad(greatest(p_num, 1)::text, 6, '0');
$$;

CREATE OR REPLACE FUNCTION public._academy_portal_manual_next_code(p_categoria text, p_consume boolean DEFAULT true)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_next   bigint;
BEGIN
  IF p_consume AND NOT public._academy_portal_perm('edit') THEN
    RAISE EXCEPTION 'academy_portal_forbidden' USING ERRCODE = '42501';
  END IF;
  IF NOT p_consume AND NOT public._academy_portal_perm('view') THEN
    RAISE EXCEPTION 'academy_portal_forbidden' USING ERRCODE = '42501';
  END IF;

  v_prefix := public._academy_portal_manual_code_prefix(p_categoria);
  IF v_prefix IS NULL OR char_length(v_prefix) < 3 THEN
    RAISE EXCEPTION 'academy_portal_manual_codigo_categoria_invalida' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.academy_portal_manual_code_counters (prefix, last_value)
  VALUES (v_prefix, 0)
  ON CONFLICT (prefix) DO NOTHING;

  IF p_consume THEN
    UPDATE public.academy_portal_manual_code_counters
    SET last_value = last_value + 1
    WHERE prefix = v_prefix
    RETURNING last_value INTO v_next;
  ELSE
    SELECT c.last_value + 1
    INTO v_next
    FROM public.academy_portal_manual_code_counters c
    WHERE c.prefix = v_prefix;

    IF v_next IS NULL THEN
      v_next := 1;
    END IF;
  END IF;

  RETURN public._academy_portal_manual_format_code(v_prefix, v_next);
END;
$$;

REVOKE ALL ON FUNCTION public._academy_portal_manual_next_code(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._academy_portal_manual_next_code(text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.academy_portal_manual_preview_proximo_codigo(p_categoria text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF trim(coalesce(p_categoria, '')) = '' THEN
    RAISE EXCEPTION 'academy_portal_manual_codigo_categoria_vazia' USING ERRCODE = 'P0001';
  END IF;
  RETURN public._academy_portal_manual_next_code(p_categoria, false);
END;
$$;

REVOKE ALL ON FUNCTION public.academy_portal_manual_preview_proximo_codigo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.academy_portal_manual_preview_proximo_codigo(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.academy_portal_manual_reservar_codigo(p_categoria text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF trim(coalesce(p_categoria, '')) = '' THEN
    RAISE EXCEPTION 'academy_portal_manual_codigo_categoria_vazia' USING ERRCODE = 'P0001';
  END IF;
  RETURN public._academy_portal_manual_next_code(p_categoria, true);
END;
$$;

REVOKE ALL ON FUNCTION public.academy_portal_manual_reservar_codigo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.academy_portal_manual_reservar_codigo(text) TO authenticated;

-- Sincroniza contadores com códigos já existentes (legado ou cadastro manual).
INSERT INTO public.academy_portal_manual_code_counters (prefix, last_value)
SELECT
  upper(split_part(m.codigo, '-', 1)) AS prefix,
  max(
    nullif(
      regexp_replace(split_part(m.codigo, '-', 2), '\D', '', 'g'),
      ''
    )::bigint
  ) AS last_value
FROM public.academy_portal_manual m
WHERE m.codigo IS NOT NULL
  AND trim(m.codigo) <> ''
  AND m.codigo ~ '^[A-Za-z]{3}-[0-9]+$'
  AND char_length(upper(split_part(m.codigo, '-', 1))) = 3
GROUP BY upper(split_part(m.codigo, '-', 1))
ON CONFLICT (prefix) DO UPDATE
SET last_value = GREATEST(
  public.academy_portal_manual_code_counters.last_value,
  EXCLUDED.last_value
);

COMMENT ON FUNCTION public.academy_portal_manual_preview_proximo_codigo(text) IS
  'Pré-visualiza o próximo código de manual para a categoria (ex.: Jogos → JOG-000001).';
COMMENT ON FUNCTION public.academy_portal_manual_reservar_codigo(text) IS
  'Reserva e consome o próximo código sequencial de manual para a categoria.';

COMMIT;
