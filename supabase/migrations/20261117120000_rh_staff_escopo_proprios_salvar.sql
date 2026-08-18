-- Gestão de Staff: Próprios = só o time do login; SM/SL/Shuffler = Todos Estúdios no servidor;
-- salvamento atómico (histórico + lock de updated_at) e UUID TOS.

BEGIN;

-- ─── Valor da permissão (sim | proprios | nao) — não altera _rh_funcionario_perm ─

CREATE OR REPLACE FUNCTION public._rh_staff_permissao_valor(p_need text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_valor text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 'nao';
  END IF;

  SELECT p.role::text
  INTO v_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF v_role = 'admin' THEN
    RETURN 'sim';
  END IF;

  IF v_role = 'prestador'
    AND NOT public._prestador_page_perm('rh_staff', p_need)
  THEN
    RETURN 'nao';
  END IF;

  IF v_role = 'gestor'
    AND NOT public._gestor_page_perm('rh_staff', p_need)
  THEN
    RETURN 'nao';
  END IF;

  SELECT CASE p_need
    WHEN 'view' THEN rp.can_view::text
    WHEN 'create' THEN rp.can_criar::text
    WHEN 'edit' THEN rp.can_editar::text
    WHEN 'delete' THEN rp.can_excluir::text
    ELSE 'nao'
  END
  INTO v_valor
  FROM public.role_permissions rp
  WHERE rp.role::text = v_role
    AND rp.page_key = 'rh_staff'
  LIMIT 1;

  RETURN coalesce(v_valor, 'nao');
END;
$$;

REVOKE ALL ON FUNCTION public._rh_staff_permissao_valor(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_staff_permissao_valor(text) TO authenticated;

COMMENT ON FUNCTION public._rh_staff_permissao_valor(text) IS
  'Gestão de Staff: devolve sim/proprios/nao da matriz. Distinto de _rh_staff_perm (boolean).';

-- ─── Times visíveis na Gestão de Staff (Próprios = org_time do login) ─

CREATE OR REPLACE FUNCTION public.rh_staff_times_visiveis()
RETURNS TABLE (
  id uuid,
  nome text,
  gerencia_id uuid,
  gerencia_nome text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.nome, t.gerencia_id, g.nome AS gerencia_nome
  FROM public.rh_org_times t
  INNER JOIN public.rh_org_gerencias g ON g.id = t.gerencia_id AND g.status = 'ativo'
  WHERE t.status = 'ativo'
    AND (
      (lower(btrim(g.nome)) LIKE '%game floor%')
      OR (
        lower(btrim(g.nome)) LIKE '%operation%'
        AND lower(btrim(g.nome)) LIKE '%management%'
      )
    )
    AND lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) <> 'contador de cartas'
    AND public._rh_staff_perm('view')
    AND (
      public._rh_staff_permissao_valor('view') = 'sim'
      OR (
        public._rh_staff_permissao_valor('view') = 'proprios'
        AND t.id = (
          SELECT f.org_time_id
          FROM public.rh_funcionarios f
          WHERE f.id = public._rh_funcionario_login_id()
        )
      )
    )
  ORDER BY g.nome, t.nome;
$$;

REVOKE ALL ON FUNCTION public.rh_staff_times_visiveis() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_staff_times_visiveis() TO authenticated;

COMMENT ON FUNCTION public.rh_staff_times_visiveis() IS
  'Times Game Floor / Operation Management visíveis em Gestão de Staff. can_view=proprios restringe ao time do login.';

-- ─── SM / SL / Shuffler: Estúdio = Todos Estúdios ─

CREATE OR REPLACE FUNCTION public._rh_staff_time_forca_todos_estudios(p_nome text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(regexp_replace(btrim(coalesce(p_nome, '')), '\s+', ' ', 'g'))
    ~ '^(service manager|shift leader|shuffler)( |$)';
$$;

REVOKE ALL ON FUNCTION public._rh_staff_time_forca_todos_estudios(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_staff_time_forca_todos_estudios(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_funcionarios_staff_estudio_forcar_todos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_nome text;
BEGIN
  IF NEW.org_time_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT t.nome INTO v_nome
  FROM public.rh_org_times t
  WHERE t.id = NEW.org_time_id;

  IF public._rh_staff_time_forca_todos_estudios(v_nome) THEN
    NEW.staff_estudio_slugs := ARRAY['todos']::text[];
    NEW.staff_estudio_slug := NULL;
    NEW.staff_operadora_slug := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rh_funcionarios_staff_estudio_forcar_todos ON public.rh_funcionarios;
CREATE TRIGGER trg_rh_funcionarios_staff_estudio_forcar_todos
  BEFORE INSERT OR UPDATE OF org_time_id, staff_estudio_slugs, staff_estudio_slug, staff_operadora_slug
  ON public.rh_funcionarios
  FOR EACH ROW
  EXECUTE FUNCTION public.rh_funcionarios_staff_estudio_forcar_todos();

UPDATE public.rh_funcionarios f
SET
  staff_estudio_slugs = ARRAY['todos']::text[],
  staff_estudio_slug = NULL,
  staff_operadora_slug = NULL
FROM public.rh_org_times t
WHERE f.org_time_id = t.id
  AND public._rh_staff_time_forca_todos_estudios(t.nome)
  AND (
    f.staff_estudio_slugs IS DISTINCT FROM ARRAY['todos']::text[]
    OR f.staff_estudio_slug IS NOT NULL
    OR f.staff_operadora_slug IS NOT NULL
  );

-- ─── Salvamento atómico da Gestão de Staff ─

CREATE OR REPLACE FUNCTION public.rh_staff_salvar(
  p_id uuid,
  p_expected_updated_at timestamptz,
  p_patch jsonb,
  p_historico jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_perm text;
  v_old public.rh_funcionarios%ROWTYPE;
  v_nome_time text;
  v_meu_time uuid;
  v_tos text;
  v_out jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'sem_permissao');
  END IF;

  v_perm := public._rh_staff_permissao_valor('edit');
  IF v_perm NOT IN ('sim', 'proprios') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'sem_permissao');
  END IF;

  SELECT * INTO v_old
  FROM public.rh_funcionarios
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'nao_encontrado');
  END IF;

  IF v_old.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RETURN jsonb_build_object('ok', false, 'code', 'conflito');
  END IF;

  IF v_perm = 'proprios' THEN
    SELECT f.org_time_id INTO v_meu_time
    FROM public.rh_funcionarios f
    WHERE f.id = public._rh_funcionario_login_id();

    IF v_meu_time IS NULL OR v_old.org_time_id IS DISTINCT FROM v_meu_time THEN
      RETURN jsonb_build_object('ok', false, 'code', 'fora_escopo');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.rh_staff_times_visiveis() tv WHERE tv.id = v_old.org_time_id
    ) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'fora_escopo');
    END IF;
  END IF;

  SELECT t.nome INTO v_nome_time
  FROM public.rh_org_times t
  WHERE t.id = v_old.org_time_id;

  IF p_patch ? 'staff_nickname' THEN
    v_old.staff_nickname := NULLIF(btrim(p_patch->>'staff_nickname'), '');
  END IF;
  IF p_patch ? 'staff_turno' THEN
    v_old.staff_turno := NULLIF(btrim(p_patch->>'staff_turno'), '');
  END IF;
  IF p_patch ? 'staff_horario_turno' THEN
    v_old.staff_horario_turno := NULLIF(btrim(p_patch->>'staff_horario_turno'), '');
  END IF;
  IF p_patch ? 'staff_estudio_slugs' THEN
    IF p_patch->'staff_estudio_slugs' IS NULL OR jsonb_typeof(p_patch->'staff_estudio_slugs') = 'null' THEN
      v_old.staff_estudio_slugs := NULL;
    ELSE
      SELECT ARRAY(SELECT jsonb_array_elements_text(p_patch->'staff_estudio_slugs'))
      INTO v_old.staff_estudio_slugs;
    END IF;
  END IF;
  IF p_patch ? 'staff_estudio_slug' THEN
    v_old.staff_estudio_slug := NULLIF(btrim(p_patch->>'staff_estudio_slug'), '');
  END IF;
  IF p_patch ? 'staff_operadora_slug' THEN
    v_old.staff_operadora_slug := NULLIF(btrim(p_patch->>'staff_operadora_slug'), '');
  END IF;
  IF p_patch ? 'staff_barcode' THEN
    v_old.staff_barcode := NULLIF(btrim(p_patch->>'staff_barcode'), '');
  END IF;
  IF p_patch ? 'staff_id_operacional' THEN
    v_old.staff_id_operacional := NULLIF(btrim(p_patch->>'staff_id_operacional'), '');
  END IF;
  IF p_patch ? 'staff_skills' THEN
    v_old.staff_skills := p_patch->'staff_skills';
  END IF;
  IF p_patch ? 'staff_live_no_estudio' THEN
    v_old.staff_live_no_estudio := NULLIF(btrim(p_patch->>'staff_live_no_estudio'), '')::date;
  END IF;
  IF p_patch ? 'staff_dealer_genero' THEN
    v_old.staff_dealer_genero := NULLIF(btrim(p_patch->>'staff_dealer_genero'), '');
  END IF;
  IF p_patch ? 'staff_dealer_bio' THEN
    v_old.staff_dealer_bio := NULLIF(btrim(p_patch->>'staff_dealer_bio'), '');
  END IF;
  IF p_patch ? 'staff_dealer_fotos' THEN
    v_old.staff_dealer_fotos := p_patch->'staff_dealer_fotos';
  END IF;

  IF public._rh_staff_time_forca_todos_estudios(v_nome_time) THEN
    v_old.staff_estudio_slugs := ARRAY['todos']::text[];
    v_old.staff_estudio_slug := NULL;
    v_old.staff_operadora_slug := NULL;
  END IF;

  IF public._rh_staff_time_forca_todos_estudios(v_nome_time)
    AND lower(regexp_replace(btrim(coalesce(v_nome_time, '')), '\s+', ' ', 'g')) ~ '^service manager( |$)'
    AND p_patch ? 'staff_id_tos'
  THEN
    v_tos := NULLIF(btrim(p_patch->>'staff_id_tos'), '');
    IF v_tos IS NOT NULL
      AND v_tos !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN
      RETURN jsonb_build_object('ok', false, 'code', 'id_tos_invalido');
    END IF;
    v_old.staff_id_tos := v_tos;
  END IF;

  UPDATE public.rh_funcionarios f SET
    staff_nickname = v_old.staff_nickname,
    staff_turno = v_old.staff_turno,
    staff_horario_turno = v_old.staff_horario_turno,
    staff_estudio_slugs = v_old.staff_estudio_slugs,
    staff_estudio_slug = v_old.staff_estudio_slug,
    staff_operadora_slug = v_old.staff_operadora_slug,
    staff_barcode = v_old.staff_barcode,
    staff_id_operacional = v_old.staff_id_operacional,
    staff_id_tos = v_old.staff_id_tos,
    staff_skills = v_old.staff_skills,
    staff_live_no_estudio = v_old.staff_live_no_estudio,
    staff_dealer_genero = v_old.staff_dealer_genero,
    staff_dealer_bio = v_old.staff_dealer_bio,
    staff_dealer_fotos = v_old.staff_dealer_fotos,
    updated_at = now(),
    updated_by = auth.uid()
  WHERE f.id = p_id;

  IF p_historico IS NOT NULL
    AND jsonb_typeof(p_historico->'alteracoes') = 'array'
    AND jsonb_array_length(p_historico->'alteracoes') > 0
  THEN
    INSERT INTO public.rh_funcionario_historico (
      rh_funcionario_id,
      tipo,
      detalhes,
      anexos
    ) VALUES (
      p_id,
      'staff_gestao_edicao',
      jsonb_build_object(
        'alteracoes', p_historico->'alteracoes',
        'usuario_label', coalesce(p_historico->>'usuario_label', '—')
      ),
      '[]'::jsonb
    );
  END IF;

  SELECT to_jsonb(x) INTO v_out
  FROM (
    SELECT
      id, status, nome, telefone, email,
      emerg_nome, emerg_parentesco, emerg_telefone, data_inicio,
      org_time_id, cargo, escala,
      staff_nickname, staff_estudio_slug, staff_estudio_slugs, staff_operadora_slug,
      staff_barcode, staff_id_operacional, staff_id_tos, staff_turno, staff_horario_turno,
      staff_skills, staff_live_no_estudio, staff_fim_treinamento,
      staff_dealer_genero, staff_dealer_bio, staff_dealer_fotos,
      updated_at
    FROM public.rh_funcionarios
    WHERE id = p_id
  ) x;

  RETURN jsonb_build_object('ok', true, 'row', v_out);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'code', 'id_tos_duplicado');
  WHEN invalid_datetime_format THEN
    RETURN jsonb_build_object('ok', false, 'code', 'erro');
END;
$$;

REVOKE ALL ON FUNCTION public.rh_staff_salvar(uuid, timestamptz, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_staff_salvar(uuid, timestamptz, jsonb, jsonb) TO authenticated;

COMMENT ON FUNCTION public.rh_staff_salvar(uuid, timestamptz, jsonb, jsonb) IS
  'Gestão de Staff: atualiza campos operacionais com lock de updated_at, escopo Próprios e histórico na mesma transação.';

COMMIT;
