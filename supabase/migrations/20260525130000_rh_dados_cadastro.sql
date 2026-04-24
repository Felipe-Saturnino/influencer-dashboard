-- RH — Página "Dados de Cadastro": permissões, RLS por e-mail do perfil, trigger de campos
-- imutáveis para quem não tem edição em rh_funcionarios, mídia própria (documentos/fotos) e bucket.

BEGIN;

CREATE OR REPLACE FUNCTION public._rh_dados_cadastro_perm(p_need text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND rp.page_key = 'rh_dados_cadastro'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._rh_dados_cadastro_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_dados_cadastro_perm(text) TO authenticated;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT role, 'rh_dados_cadastro', can_view, can_criar, can_editar, can_excluir
FROM public.role_permissions
WHERE page_key = 'rh_funcionarios'
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view    = EXCLUDED.can_view,
  can_criar   = EXCLUDED.can_criar,
  can_editar  = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
VALUES ('recursos_humanos', 'rh_dados_cadastro')
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

CREATE POLICY rh_funcionarios_select_self_cadastro
  ON public.rh_funcionarios FOR SELECT TO authenticated
  USING (
    public._rh_dados_cadastro_perm('view')
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND lower(trim(coalesce(p.email, ''))) = lower(trim(coalesce(rh_funcionarios.email, '')))
    )
  );

CREATE POLICY rh_funcionarios_update_self_cadastro
  ON public.rh_funcionarios FOR UPDATE TO authenticated
  USING (
    public._rh_dados_cadastro_perm('edit')
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND lower(trim(coalesce(p.email, ''))) = lower(trim(coalesce(rh_funcionarios.email, '')))
    )
  )
  WITH CHECK (
    public._rh_dados_cadastro_perm('edit')
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND lower(trim(coalesce(p.email, ''))) = lower(trim(coalesce(rh_funcionarios.email, '')))
    )
  );

CREATE POLICY rh_funcionario_historico_select_self_cadastro
  ON public.rh_funcionario_historico FOR SELECT TO authenticated
  USING (
    public._rh_dados_cadastro_perm('view')
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      INNER JOIN public.profiles p ON p.id = auth.uid()
        AND lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(p.email, '')))
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
      AND lower(trim(coalesce(p.email, ''))) = lower(trim(coalesce(OLD.email, '')))
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
  NEW.observacao_rh := OLD.observacao_rh;
  NEW.staff_nickname := OLD.staff_nickname;
  NEW.staff_operadora_slug := OLD.staff_operadora_slug;
  NEW.staff_barcode := OLD.staff_barcode;
  NEW.staff_id_operacional := OLD.staff_id_operacional;
  NEW.staff_skills := OLD.staff_skills;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rh_funcionarios_preserva_contratacao_self ON public.rh_funcionarios;
CREATE TRIGGER trg_rh_funcionarios_preserva_contratacao_self
  BEFORE UPDATE ON public.rh_funcionarios
  FOR EACH ROW
  EXECUTE PROCEDURE public.rh_funcionarios_preserva_contratacao_self_sem_perm_grupo();

CREATE TABLE IF NOT EXISTS public.rh_funcionario_self_media (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rh_funcionario_id   uuid NOT NULL REFERENCES public.rh_funcionarios (id) ON DELETE CASCADE,
  kind                text NOT NULL CHECK (kind IN ('documento', 'foto')),
  storage_path        text NOT NULL,
  file_name           text NOT NULL,
  mime_type           text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid
);

CREATE INDEX IF NOT EXISTS idx_rh_func_self_media_func ON public.rh_funcionario_self_media (rh_funcionario_id, kind, created_at DESC);

COMMENT ON TABLE public.rh_funcionario_self_media IS
  'Anexos enviados pelo próprio prestador na página Dados de Cadastro (documentos e fotos).';

ALTER TABLE public.rh_funcionario_self_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY rh_funcionario_self_media_select
  ON public.rh_funcionario_self_media FOR SELECT TO authenticated
  USING (
    public._rh_dados_cadastro_perm('view')
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      INNER JOIN public.profiles p ON p.id = auth.uid()
        AND lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(p.email, '')))
      WHERE f.id = rh_funcionario_self_media.rh_funcionario_id
    )
  );

CREATE POLICY rh_funcionario_self_media_insert
  ON public.rh_funcionario_self_media FOR INSERT TO authenticated
  WITH CHECK (
    public._rh_dados_cadastro_perm('edit')
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      INNER JOIN public.profiles p ON p.id = auth.uid()
        AND lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(p.email, '')))
      WHERE f.id = rh_funcionario_self_media.rh_funcionario_id
    )
  );

CREATE POLICY rh_funcionario_self_media_delete
  ON public.rh_funcionario_self_media FOR DELETE TO authenticated
  USING (
    public._rh_dados_cadastro_perm('edit')
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      INNER JOIN public.profiles p ON p.id = auth.uid()
        AND lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(p.email, '')))
      WHERE f.id = rh_funcionario_self_media.rh_funcionario_id
    )
  );

REVOKE ALL ON TABLE public.rh_funcionario_self_media FROM PUBLIC;
GRANT SELECT, INSERT, DELETE ON TABLE public.rh_funcionario_self_media TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rh-prestador-self-media',
  'rh-prestador-self-media',
  false,
  15728640,
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY rh_self_media_storage_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'rh-prestador-self-media'
    AND public._rh_dados_cadastro_perm('view')
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      INNER JOIN public.profiles p ON p.id = auth.uid()
        AND lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(p.email, '')))
      WHERE f.id::text = split_part(name, '/', 1)
    )
  );

CREATE POLICY rh_self_media_storage_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'rh-prestador-self-media'
    AND public._rh_dados_cadastro_perm('edit')
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      INNER JOIN public.profiles p ON p.id = auth.uid()
        AND lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(p.email, '')))
      WHERE f.id::text = split_part(name, '/', 1)
    )
  );

CREATE POLICY rh_self_media_storage_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'rh-prestador-self-media'
    AND public._rh_dados_cadastro_perm('edit')
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      INNER JOIN public.profiles p ON p.id = auth.uid()
        AND lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(p.email, '')))
      WHERE f.id::text = split_part(name, '/', 1)
    )
  );

CREATE POLICY rh_self_media_storage_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'rh-prestador-self-media'
    AND public._rh_dados_cadastro_perm('edit')
    AND EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      INNER JOIN public.profiles p ON p.id = auth.uid()
        AND lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(p.email, '')))
      WHERE f.id::text = split_part(name, '/', 1)
    )
  );

COMMIT;
