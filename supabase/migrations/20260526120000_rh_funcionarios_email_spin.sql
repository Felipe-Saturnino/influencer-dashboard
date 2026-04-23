-- E-mail corporativo Spin (opcional) + vínculo Dados de Cadastro / RLS por e-mail de login OU email_spin.

BEGIN;

ALTER TABLE public.rh_funcionarios
  ADD COLUMN IF NOT EXISTS email_spin text;

COMMENT ON COLUMN public.rh_funcionarios.email_spin IS
  'E-mail corporativo Spin (opcional). Quando preenchido, o login do perfil pode coincidir com este e-mail para acessar o próprio cadastro em Dados de Cadastro, em alternativa ao e-mail pessoal (email).';

DROP POLICY IF EXISTS rh_funcionarios_select_self_cadastro ON public.rh_funcionarios;

CREATE POLICY rh_funcionarios_select_self_cadastro
  ON public.rh_funcionarios FOR SELECT TO authenticated
  USING (
    public._rh_dados_cadastro_perm('view')
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          lower(trim(coalesce(p.email, ''))) = lower(trim(coalesce(rh_funcionarios.email, '')))
          OR (
            trim(coalesce(rh_funcionarios.email_spin, '')) <> ''
            AND lower(trim(coalesce(p.email, ''))) = lower(trim(coalesce(rh_funcionarios.email_spin, '')))
          )
        )
    )
  );

DROP POLICY IF EXISTS rh_funcionarios_update_self_cadastro ON public.rh_funcionarios;

CREATE POLICY rh_funcionarios_update_self_cadastro
  ON public.rh_funcionarios FOR UPDATE TO authenticated
  USING (
    public._rh_dados_cadastro_perm('edit')
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          lower(trim(coalesce(p.email, ''))) = lower(trim(coalesce(rh_funcionarios.email, '')))
          OR (
            trim(coalesce(rh_funcionarios.email_spin, '')) <> ''
            AND lower(trim(coalesce(p.email, ''))) = lower(trim(coalesce(rh_funcionarios.email_spin, '')))
          )
        )
    )
  )
  WITH CHECK (
    public._rh_dados_cadastro_perm('edit')
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          lower(trim(coalesce(p.email, ''))) = lower(trim(coalesce(rh_funcionarios.email, '')))
          OR (
            trim(coalesce(rh_funcionarios.email_spin, '')) <> ''
            AND lower(trim(coalesce(p.email, ''))) = lower(trim(coalesce(rh_funcionarios.email_spin, '')))
          )
        )
    )
  );

DROP POLICY IF EXISTS rh_funcionario_historico_select_self_cadastro ON public.rh_funcionario_historico;

CREATE POLICY rh_funcionario_historico_select_self_cadastro
  ON public.rh_funcionario_historico FOR SELECT TO authenticated
  USING (
    public._rh_dados_cadastro_perm('view')
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      INNER JOIN public.profiles p ON p.id = auth.uid()
        AND (
          lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(p.email, '')))
          OR (
            trim(coalesce(f.email_spin, '')) <> ''
            AND lower(trim(coalesce(f.email_spin, ''))) = lower(trim(coalesce(p.email, '')))
          )
        )
      WHERE f.id = rh_funcionario_historico.rh_funcionario_id
    )
  );

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

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        lower(trim(coalesce(p.email, ''))) = lower(trim(coalesce(OLD.email, '')))
        OR (
          trim(coalesce(OLD.email_spin, '')) <> ''
          AND lower(trim(coalesce(p.email, ''))) = lower(trim(coalesce(OLD.email_spin, '')))
        )
      )
  ) THEN
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
  NEW.email_spin := OLD.email_spin;
  NEW.observacao_rh := OLD.observacao_rh;
  NEW.staff_nickname := OLD.staff_nickname;
  NEW.staff_operadora_slug := OLD.staff_operadora_slug;
  NEW.staff_barcode := OLD.staff_barcode;
  NEW.staff_id_operacional := OLD.staff_id_operacional;
  NEW.staff_skills := OLD.staff_skills;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS rh_funcionario_self_media_select ON public.rh_funcionario_self_media;

CREATE POLICY rh_funcionario_self_media_select
  ON public.rh_funcionario_self_media FOR SELECT TO authenticated
  USING (
    public._rh_dados_cadastro_perm('view')
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      INNER JOIN public.profiles p ON p.id = auth.uid()
        AND (
          lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(p.email, '')))
          OR (
            trim(coalesce(f.email_spin, '')) <> ''
            AND lower(trim(coalesce(f.email_spin, ''))) = lower(trim(coalesce(p.email, '')))
          )
        )
      WHERE f.id = rh_funcionario_self_media.rh_funcionario_id
    )
  );

DROP POLICY IF EXISTS rh_funcionario_self_media_insert ON public.rh_funcionario_self_media;

CREATE POLICY rh_funcionario_self_media_insert
  ON public.rh_funcionario_self_media FOR INSERT TO authenticated
  WITH CHECK (
    public._rh_dados_cadastro_perm('edit')
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      INNER JOIN public.profiles p ON p.id = auth.uid()
        AND (
          lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(p.email, '')))
          OR (
            trim(coalesce(f.email_spin, '')) <> ''
            AND lower(trim(coalesce(f.email_spin, ''))) = lower(trim(coalesce(p.email, '')))
          )
        )
      WHERE f.id = rh_funcionario_self_media.rh_funcionario_id
    )
  );

DROP POLICY IF EXISTS rh_funcionario_self_media_delete ON public.rh_funcionario_self_media;

CREATE POLICY rh_funcionario_self_media_delete
  ON public.rh_funcionario_self_media FOR DELETE TO authenticated
  USING (
    public._rh_dados_cadastro_perm('edit')
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      INNER JOIN public.profiles p ON p.id = auth.uid()
        AND (
          lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(p.email, '')))
          OR (
            trim(coalesce(f.email_spin, '')) <> ''
            AND lower(trim(coalesce(f.email_spin, ''))) = lower(trim(coalesce(p.email, '')))
          )
        )
      WHERE f.id = rh_funcionario_self_media.rh_funcionario_id
    )
  );

DROP POLICY IF EXISTS rh_self_media_storage_select ON storage.objects;
CREATE POLICY rh_self_media_storage_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'rh-prestador-self-media'
    AND public._rh_dados_cadastro_perm('view')
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      INNER JOIN public.profiles p ON p.id = auth.uid()
        AND (
          lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(p.email, '')))
          OR (
            trim(coalesce(f.email_spin, '')) <> ''
            AND lower(trim(coalesce(f.email_spin, ''))) = lower(trim(coalesce(p.email, '')))
          )
        )
      WHERE f.id::text = split_part(name, '/', 1)
    )
  );

DROP POLICY IF EXISTS rh_self_media_storage_insert ON storage.objects;
CREATE POLICY rh_self_media_storage_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'rh-prestador-self-media'
    AND public._rh_dados_cadastro_perm('edit')
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      INNER JOIN public.profiles p ON p.id = auth.uid()
        AND (
          lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(p.email, '')))
          OR (
            trim(coalesce(f.email_spin, '')) <> ''
            AND lower(trim(coalesce(f.email_spin, ''))) = lower(trim(coalesce(p.email, '')))
          )
        )
      WHERE f.id::text = split_part(name, '/', 1)
    )
  );

DROP POLICY IF EXISTS rh_self_media_storage_update ON storage.objects;
CREATE POLICY rh_self_media_storage_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'rh-prestador-self-media'
    AND public._rh_dados_cadastro_perm('edit')
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      INNER JOIN public.profiles p ON p.id = auth.uid()
        AND (
          lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(p.email, '')))
          OR (
            trim(coalesce(f.email_spin, '')) <> ''
            AND lower(trim(coalesce(f.email_spin, ''))) = lower(trim(coalesce(p.email, '')))
          )
        )
      WHERE f.id::text = split_part(name, '/', 1)
    )
  );

DROP POLICY IF EXISTS rh_self_media_storage_delete ON storage.objects;
CREATE POLICY rh_self_media_storage_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'rh-prestador-self-media'
    AND public._rh_dados_cadastro_perm('edit')
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      INNER JOIN public.profiles p ON p.id = auth.uid()
        AND (
          lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(p.email, '')))
          OR (
            trim(coalesce(f.email_spin, '')) <> ''
            AND lower(trim(coalesce(f.email_spin, ''))) = lower(trim(coalesce(p.email, '')))
          )
        )
      WHERE f.id::text = split_part(name, '/', 1)
    )
  );

COMMIT;
