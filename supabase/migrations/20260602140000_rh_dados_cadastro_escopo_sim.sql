-- Dados de Cadastro: escopo «Sim» (todos os prestadores) vs «Próprios» (e-mail de login).
-- Ver/Editar «Sim» em rh_dados_cadastro — sem depender de rh_funcionarios.
-- Trigger preserva campos de contratação/trabalho em qualquer edição via Dados de Cadastro.

BEGIN;

CREATE OR REPLACE FUNCTION public._rh_dados_cadastro_perm_val(p_need text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_role text;
  v_col text;
  v_val text;
BEGIN
  IF uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT p.role::text INTO v_role FROM public.profiles p WHERE p.id = uid;
  IF v_role IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_role = 'admin' THEN
    RETURN 'sim';
  END IF;

  IF p_need = 'view' THEN
    v_col := 'can_view';
  ELSIF p_need = 'edit' THEN
    v_col := 'can_editar';
  ELSE
    RETURN NULL;
  END IF;

  IF v_role = 'gestor' THEN
    IF NOT public._gestor_page_perm('rh_dados_cadastro', p_need) THEN
      RETURN NULL;
    END IF;
    SELECT
      CASE WHEN v_col = 'can_view' THEN rp.can_view::text ELSE rp.can_editar::text END
    INTO v_val
    FROM public.role_permissions rp
    WHERE rp.role = 'gestor' AND rp.page_key = 'rh_dados_cadastro'
    LIMIT 1;
    RETURN v_val;
  END IF;

  IF v_role = 'prestador' THEN
    IF NOT public._prestador_page_perm('rh_dados_cadastro', p_need) THEN
      RETURN NULL;
    END IF;
    SELECT
      CASE WHEN v_col = 'can_view' THEN rp.can_view::text ELSE rp.can_editar::text END
    INTO v_val
    FROM public.role_permissions rp
    WHERE rp.role = 'prestador' AND rp.page_key = 'rh_dados_cadastro'
    LIMIT 1;
    RETURN v_val;
  END IF;

  SELECT
    CASE WHEN v_col = 'can_view' THEN rp.can_view::text ELSE rp.can_editar::text END
  INTO v_val
  FROM public.profiles p
  INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
  WHERE p.id = uid AND rp.page_key = 'rh_dados_cadastro'
  LIMIT 1;

  RETURN v_val;
END;
$$;

REVOKE ALL ON FUNCTION public._rh_dados_cadastro_perm_val(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_dados_cadastro_perm_val(text) TO authenticated;

COMMENT ON FUNCTION public._rh_dados_cadastro_perm_val(text) IS
  'Valor efetivo can_view/can_editar em rh_dados_cadastro: sim | proprios | nao | null. Admin => sim.';

-- ─── rh_funcionarios: SELECT / UPDATE ─────────────────────────────────────────

DROP POLICY IF EXISTS rh_funcionarios_select_self_cadastro ON public.rh_funcionarios;
CREATE POLICY rh_funcionarios_select_self_cadastro
  ON public.rh_funcionarios FOR SELECT TO authenticated
  USING (
    public._rh_dados_cadastro_perm('view')
    AND public._rh_dados_cadastro_perm_val('view') = 'proprios'
    AND public._rh_funcionario_eh_self_cadastro(rh_funcionarios.email, rh_funcionarios.email_spin)
  );

DROP POLICY IF EXISTS rh_funcionarios_select_dados_cadastro_todos ON public.rh_funcionarios;
CREATE POLICY rh_funcionarios_select_dados_cadastro_todos
  ON public.rh_funcionarios FOR SELECT TO authenticated
  USING (public._rh_dados_cadastro_perm_val('view') = 'sim');

DROP POLICY IF EXISTS rh_funcionarios_update_self_cadastro ON public.rh_funcionarios;
CREATE POLICY rh_funcionarios_update_self_cadastro
  ON public.rh_funcionarios FOR UPDATE TO authenticated
  USING (
    public._rh_dados_cadastro_perm('edit')
    AND public._rh_dados_cadastro_perm_val('edit') = 'proprios'
    AND public._rh_funcionario_eh_self_cadastro(rh_funcionarios.email, rh_funcionarios.email_spin)
  )
  WITH CHECK (
    public._rh_dados_cadastro_perm('edit')
    AND public._rh_dados_cadastro_perm_val('edit') = 'proprios'
    AND public._rh_funcionario_eh_self_cadastro(rh_funcionarios.email, rh_funcionarios.email_spin)
  );

DROP POLICY IF EXISTS rh_funcionarios_update_dados_cadastro_todos ON public.rh_funcionarios;
CREATE POLICY rh_funcionarios_update_dados_cadastro_todos
  ON public.rh_funcionarios FOR UPDATE TO authenticated
  USING (public._rh_dados_cadastro_perm_val('edit') = 'sim')
  WITH CHECK (public._rh_dados_cadastro_perm_val('edit') = 'sim');

-- ─── rh_funcionario_historico ───────────────────────────────────────────────

DROP POLICY IF EXISTS rh_funcionario_historico_select_self_cadastro ON public.rh_funcionario_historico;
CREATE POLICY rh_funcionario_historico_select_self_cadastro
  ON public.rh_funcionario_historico FOR SELECT TO authenticated
  USING (
    public._rh_dados_cadastro_perm('view')
    AND public._rh_dados_cadastro_perm_val('view') = 'proprios'
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      WHERE f.id = rh_funcionario_historico.rh_funcionario_id
        AND public._rh_funcionario_eh_self_cadastro(f.email, f.email_spin)
    )
  );

DROP POLICY IF EXISTS rh_funcionario_historico_select_dados_cadastro_todos ON public.rh_funcionario_historico;
CREATE POLICY rh_funcionario_historico_select_dados_cadastro_todos
  ON public.rh_funcionario_historico FOR SELECT TO authenticated
  USING (
    public._rh_dados_cadastro_perm_val('view') = 'sim'
    AND EXISTS (
      SELECT 1 FROM public.rh_funcionarios f WHERE f.id = rh_funcionario_historico.rh_funcionario_id
    )
  );

-- ─── rh_funcionario_self_media ────────────────────────────────────────────────

DROP POLICY IF EXISTS rh_funcionario_self_media_select ON public.rh_funcionario_self_media;
CREATE POLICY rh_funcionario_self_media_select
  ON public.rh_funcionario_self_media FOR SELECT TO authenticated
  USING (
    public._rh_dados_cadastro_perm('view')
    AND public._rh_dados_cadastro_perm_val('view') = 'proprios'
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      WHERE f.id = rh_funcionario_self_media.rh_funcionario_id
        AND public._rh_funcionario_eh_self_cadastro(f.email, f.email_spin)
    )
  );

DROP POLICY IF EXISTS rh_funcionario_self_media_select_dados_cadastro_todos ON public.rh_funcionario_self_media;
CREATE POLICY rh_funcionario_self_media_select_dados_cadastro_todos
  ON public.rh_funcionario_self_media FOR SELECT TO authenticated
  USING (
    public._rh_dados_cadastro_perm_val('view') = 'sim'
    AND EXISTS (
      SELECT 1 FROM public.rh_funcionarios f WHERE f.id = rh_funcionario_self_media.rh_funcionario_id
    )
  );

DROP POLICY IF EXISTS rh_funcionario_self_media_insert ON public.rh_funcionario_self_media;
CREATE POLICY rh_funcionario_self_media_insert
  ON public.rh_funcionario_self_media FOR INSERT TO authenticated
  WITH CHECK (
    public._rh_dados_cadastro_perm('edit')
    AND public._rh_dados_cadastro_perm_val('edit') = 'proprios'
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      WHERE f.id = rh_funcionario_self_media.rh_funcionario_id
        AND public._rh_funcionario_eh_self_cadastro(f.email, f.email_spin)
    )
  );

DROP POLICY IF EXISTS rh_funcionario_self_media_insert_dados_cadastro_todos ON public.rh_funcionario_self_media;
CREATE POLICY rh_funcionario_self_media_insert_dados_cadastro_todos
  ON public.rh_funcionario_self_media FOR INSERT TO authenticated
  WITH CHECK (
    public._rh_dados_cadastro_perm_val('edit') = 'sim'
    AND EXISTS (
      SELECT 1 FROM public.rh_funcionarios f WHERE f.id = rh_funcionario_self_media.rh_funcionario_id
    )
  );

DROP POLICY IF EXISTS rh_funcionario_self_media_delete ON public.rh_funcionario_self_media;
CREATE POLICY rh_funcionario_self_media_delete
  ON public.rh_funcionario_self_media FOR DELETE TO authenticated
  USING (
    public._rh_dados_cadastro_perm('edit')
    AND public._rh_dados_cadastro_perm_val('edit') = 'proprios'
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      WHERE f.id = rh_funcionario_self_media.rh_funcionario_id
        AND public._rh_funcionario_eh_self_cadastro(f.email, f.email_spin)
    )
  );

DROP POLICY IF EXISTS rh_funcionario_self_media_delete_dados_cadastro_todos ON public.rh_funcionario_self_media;
CREATE POLICY rh_funcionario_self_media_delete_dados_cadastro_todos
  ON public.rh_funcionario_self_media FOR DELETE TO authenticated
  USING (
    public._rh_dados_cadastro_perm_val('edit') = 'sim'
    AND EXISTS (
      SELECT 1 FROM public.rh_funcionarios f WHERE f.id = rh_funcionario_self_media.rh_funcionario_id
    )
  );

-- ─── storage rh-prestador-self-media ─────────────────────────────────────────

DROP POLICY IF EXISTS rh_self_media_storage_select ON storage.objects;
CREATE POLICY rh_self_media_storage_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'rh-prestador-self-media'
    AND public._rh_dados_cadastro_perm('view')
    AND public._rh_dados_cadastro_perm_val('view') = 'proprios'
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      WHERE f.id::text = split_part(name, '/', 1)
        AND public._rh_funcionario_eh_self_cadastro(f.email, f.email_spin)
    )
  );

DROP POLICY IF EXISTS rh_self_media_storage_select_dados_cadastro_todos ON storage.objects;
CREATE POLICY rh_self_media_storage_select_dados_cadastro_todos
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'rh-prestador-self-media'
    AND public._rh_dados_cadastro_perm_val('view') = 'sim'
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      WHERE f.id::text = split_part(name, '/', 1)
    )
  );

DROP POLICY IF EXISTS rh_self_media_storage_insert ON storage.objects;
CREATE POLICY rh_self_media_storage_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'rh-prestador-self-media'
    AND public._rh_dados_cadastro_perm('edit')
    AND public._rh_dados_cadastro_perm_val('edit') = 'proprios'
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      WHERE f.id::text = split_part(name, '/', 1)
        AND public._rh_funcionario_eh_self_cadastro(f.email, f.email_spin)
    )
  );

DROP POLICY IF EXISTS rh_self_media_storage_insert_dados_cadastro_todos ON storage.objects;
CREATE POLICY rh_self_media_storage_insert_dados_cadastro_todos
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'rh-prestador-self-media'
    AND public._rh_dados_cadastro_perm_val('edit') = 'sim'
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      WHERE f.id::text = split_part(name, '/', 1)
    )
  );

DROP POLICY IF EXISTS rh_self_media_storage_update ON storage.objects;
CREATE POLICY rh_self_media_storage_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'rh-prestador-self-media'
    AND public._rh_dados_cadastro_perm('edit')
    AND public._rh_dados_cadastro_perm_val('edit') = 'proprios'
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      WHERE f.id::text = split_part(name, '/', 1)
        AND public._rh_funcionario_eh_self_cadastro(f.email, f.email_spin)
    )
  );

DROP POLICY IF EXISTS rh_self_media_storage_update_dados_cadastro_todos ON storage.objects;
CREATE POLICY rh_self_media_storage_update_dados_cadastro_todos
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'rh-prestador-self-media'
    AND public._rh_dados_cadastro_perm_val('edit') = 'sim'
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      WHERE f.id::text = split_part(name, '/', 1)
    )
  );

DROP POLICY IF EXISTS rh_self_media_storage_delete ON storage.objects;
CREATE POLICY rh_self_media_storage_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'rh-prestador-self-media'
    AND public._rh_dados_cadastro_perm('edit')
    AND public._rh_dados_cadastro_perm_val('edit') = 'proprios'
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      WHERE f.id::text = split_part(name, '/', 1)
        AND public._rh_funcionario_eh_self_cadastro(f.email, f.email_spin)
    )
  );

DROP POLICY IF EXISTS rh_self_media_storage_delete_dados_cadastro_todos ON storage.objects;
CREATE POLICY rh_self_media_storage_delete_dados_cadastro_todos
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'rh-prestador-self-media'
    AND public._rh_dados_cadastro_perm_val('edit') = 'sim'
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      WHERE f.id::text = split_part(name, '/', 1)
    )
  );

-- ─── Trigger: preservar contratação em edições Dados de Cadastro ─────────────

CREATE OR REPLACE FUNCTION public.rh_funcionarios_preserva_contratacao_self_sem_perm_grupo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF public._rh_funcionario_perm('edit') THEN
    RETURN NEW;
  END IF;

  IF NOT public._rh_dados_cadastro_perm('edit') THEN
    RETURN NEW;
  END IF;

  NEW.status := OLD.status;
  NEW.setor := OLD.setor;
  NEW.org_diretoria_id := OLD.org_diretoria_id;
  NEW.org_gerencia_id := OLD.org_gerencia_id;
  NEW.org_time_id := OLD.org_time_id;
  NEW.cargo := OLD.cargo;
  NEW.nivel := OLD.nivel;
  NEW.salario := OLD.salario;
  NEW.data_inicio := OLD.data_inicio;
  NEW.data_funcao := OLD.data_funcao;
  NEW.data_desligamento := OLD.data_desligamento;
  NEW.escala := OLD.escala;
  NEW.tipo_contrato := OLD.tipo_contrato;
  NEW.observacao_rh := OLD.observacao_rh;
  NEW.staff_nickname := OLD.staff_nickname;
  NEW.staff_operadora_slug := OLD.staff_operadora_slug;
  NEW.staff_barcode := OLD.staff_barcode;
  NEW.staff_id_operacional := OLD.staff_id_operacional;
  NEW.staff_skills := OLD.staff_skills;
  NEW.staff_horario_turno := OLD.staff_horario_turno;
  NEW.staff_turno := OLD.staff_turno;
  NEW.staff_live_no_estudio := OLD.staff_live_no_estudio;
  NEW.staff_fim_treinamento := OLD.staff_fim_treinamento;
  NEW.area_atuacao := OLD.area_atuacao;
  NEW.remuneracao_hora_centavos := OLD.remuneracao_hora_centavos;
  NEW.email_spin := OLD.email_spin;

  IF NOT public._rh_funcionario_eh_self_cadastro(OLD.email, OLD.email_spin) THEN
    NEW.cadastro_revisado_em := OLD.cadastro_revisado_em;
    NEW.cadastro_revisao_tipo := OLD.cadastro_revisao_tipo;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.rh_funcionarios_preserva_contratacao_self_sem_perm_grupo() IS
  'Bloqueia alteração de contratação/trabalho via Dados de Cadastro (sem edit em rh_funcionarios). Revisão periódica só pelo próprio prestador.';

COMMIT;
