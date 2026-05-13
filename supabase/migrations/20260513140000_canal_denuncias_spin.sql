-- Canal de Denúncias Spin (público + Central RH interna)
-- Protocolo CDSPIN00001… | Storage bucket canal-denuncias-spin

BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.canal_denuncia_spin_protocol_seq;

CREATE OR REPLACE FUNCTION public.canal_denuncia_spin_next_protocol()
RETURNS text
LANGUAGE sql
SET search_path = public
AS $$
  SELECT 'CDSPIN' || lpad((nextval('public.canal_denuncia_spin_protocol_seq'))::text, 5, '0');
$$;

CREATE OR REPLACE FUNCTION public.canal_denuncias_spin_set_protocol()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.protocolo IS NULL OR btrim(NEW.protocolo) = '' THEN
    NEW.protocolo := public.canal_denuncia_spin_next_protocol();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.canal_denuncias_spin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo text NOT NULL UNIQUE,
  deseja_identificar boolean NOT NULL DEFAULT false,
  nome text,
  telefone text,
  email text,
  tipos_denuncia text[] NOT NULL DEFAULT '{}'::text[],
  tipo_outro_descricao text,
  relato text NOT NULL,
  status text NOT NULL DEFAULT 'relatado'
    CHECK (status IN ('relatado', 'em_avaliacao', 'procedente', 'nao_procedente')),
  descricao_resolucao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_canal_denuncias_spin_protocol ON public.canal_denuncias_spin;
CREATE TRIGGER trg_canal_denuncias_spin_protocol
  BEFORE INSERT ON public.canal_denuncias_spin
  FOR EACH ROW EXECUTE PROCEDURE public.canal_denuncias_spin_set_protocol();

CREATE OR REPLACE FUNCTION public.canal_denuncias_spin_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_canal_denuncias_spin_updated ON public.canal_denuncias_spin;
CREATE TRIGGER trg_canal_denuncias_spin_updated
  BEFORE UPDATE ON public.canal_denuncias_spin
  FOR EACH ROW EXECUTE PROCEDURE public.canal_denuncias_spin_touch_updated_at();

CREATE TABLE IF NOT EXISTS public.canal_denuncia_status_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  denuncia_id uuid NOT NULL REFERENCES public.canal_denuncias_spin(id) ON DELETE CASCADE,
  status_anterior text,
  status_novo text NOT NULL,
  descricao_resolucao text,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_canal_denuncia_status_hist_denuncia
  ON public.canal_denuncia_status_historico (denuncia_id, changed_at);

CREATE OR REPLACE FUNCTION public.canal_denuncia_spin_registrar_status_historico()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.canal_denuncia_status_historico (
      denuncia_id, status_anterior, status_novo, descricao_resolucao, changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      CASE
        WHEN NEW.status IN ('procedente', 'nao_procedente') THEN NEW.descricao_resolucao
        ELSE NULL
      END,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_canal_denuncia_status_hist ON public.canal_denuncias_spin;
CREATE TRIGGER trg_canal_denuncia_status_hist
  AFTER UPDATE OF status ON public.canal_denuncias_spin
  FOR EACH ROW EXECUTE PROCEDURE public.canal_denuncia_spin_registrar_status_historico();

CREATE TABLE IF NOT EXISTS public.canal_denuncia_anotacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  denuncia_id uuid NOT NULL REFERENCES public.canal_denuncias_spin(id) ON DELETE CASCADE,
  texto text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT canal_denuncia_anotacoes_texto CHECK (length(trim(texto)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_canal_denuncia_anot_denuncia
  ON public.canal_denuncia_anotacoes (denuncia_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.canal_denuncia_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  denuncia_id uuid NOT NULL REFERENCES public.canal_denuncias_spin(id) ON DELETE CASCADE,
  anotacao_id uuid REFERENCES public.canal_denuncia_anotacoes(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  content_type text,
  file_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_canal_denuncia_anexos_denuncia
  ON public.canal_denuncia_anexos (denuncia_id);

-- Permissão RH (espelha outras páginas RH)
CREATE OR REPLACE FUNCTION public._rh_central_denuncias_perm(p_need text)
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
          AND rp.page_key = 'rh_central_denuncias'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._rh_central_denuncias_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_central_denuncias_perm(text) TO authenticated;

-- Anon: anexo só nas primeiras horas após abertura (upload formulário)
CREATE OR REPLACE FUNCTION public._denuncia_spin_anexo_anon_ok(p_denuncia_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.canal_denuncias_spin d
    WHERE d.id = p_denuncia_id
      AND d.created_at > now() - interval '4 hours'
  );
$$;

REVOKE ALL ON FUNCTION public._denuncia_spin_anexo_anon_ok(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._denuncia_spin_anexo_anon_ok(uuid) TO anon, authenticated;

ALTER TABLE public.canal_denuncias_spin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canal_denuncia_status_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canal_denuncia_anotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canal_denuncia_anexos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS canal_denuncias_spin_anon_insert ON public.canal_denuncias_spin;
CREATE POLICY canal_denuncias_spin_anon_insert
  ON public.canal_denuncias_spin FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS canal_denuncias_spin_select_auth ON public.canal_denuncias_spin;
CREATE POLICY canal_denuncias_spin_select_auth
  ON public.canal_denuncias_spin FOR SELECT TO authenticated
  USING (public._rh_central_denuncias_perm('view'));

DROP POLICY IF EXISTS canal_denuncias_spin_update_auth ON public.canal_denuncias_spin;
CREATE POLICY canal_denuncias_spin_update_auth
  ON public.canal_denuncias_spin FOR UPDATE TO authenticated
  USING (public._rh_central_denuncias_perm('edit'))
  WITH CHECK (public._rh_central_denuncias_perm('edit'));

DROP POLICY IF EXISTS canal_denuncias_spin_delete_admin ON public.canal_denuncias_spin;
CREATE POLICY canal_denuncias_spin_delete_admin
  ON public.canal_denuncias_spin FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._rh_central_denuncias_perm('delete')
  );

DROP POLICY IF EXISTS canal_denuncia_status_hist_select ON public.canal_denuncia_status_historico;
CREATE POLICY canal_denuncia_status_hist_select
  ON public.canal_denuncia_status_historico FOR SELECT TO authenticated
  USING (public._rh_central_denuncias_perm('view'));

DROP POLICY IF EXISTS canal_denuncia_anot_select ON public.canal_denuncia_anotacoes;
CREATE POLICY canal_denuncia_anot_select
  ON public.canal_denuncia_anotacoes FOR SELECT TO authenticated
  USING (public._rh_central_denuncias_perm('view'));

DROP POLICY IF EXISTS canal_denuncia_anot_insert ON public.canal_denuncia_anotacoes;
CREATE POLICY canal_denuncia_anot_insert
  ON public.canal_denuncia_anotacoes FOR INSERT TO authenticated
  WITH CHECK (public._rh_central_denuncias_perm('edit'));

DROP POLICY IF EXISTS canal_denuncia_anexos_anon_insert ON public.canal_denuncia_anexos;
CREATE POLICY canal_denuncia_anexos_anon_insert
  ON public.canal_denuncia_anexos FOR INSERT TO anon
  WITH CHECK (
    anotacao_id IS NULL
    AND public._denuncia_spin_anexo_anon_ok(denuncia_id)
  );

DROP POLICY IF EXISTS canal_denuncia_anexos_select ON public.canal_denuncia_anexos;
CREATE POLICY canal_denuncia_anexos_select
  ON public.canal_denuncia_anexos FOR SELECT TO authenticated
  USING (public._rh_central_denuncias_perm('view'));

DROP POLICY IF EXISTS canal_denuncia_anexos_insert_auth ON public.canal_denuncia_anexos;
CREATE POLICY canal_denuncia_anexos_insert_auth
  ON public.canal_denuncia_anexos FOR INSERT TO authenticated
  WITH CHECK (public._rh_central_denuncias_perm('edit'));

REVOKE ALL ON TABLE public.canal_denuncias_spin FROM PUBLIC;
GRANT INSERT ON TABLE public.canal_denuncias_spin TO anon;
GRANT SELECT, UPDATE, DELETE ON TABLE public.canal_denuncias_spin TO authenticated;

REVOKE ALL ON TABLE public.canal_denuncia_status_historico FROM PUBLIC;
GRANT SELECT ON TABLE public.canal_denuncia_status_historico TO authenticated;

REVOKE ALL ON TABLE public.canal_denuncia_anotacoes FROM PUBLIC;
GRANT SELECT, INSERT ON TABLE public.canal_denuncia_anotacoes TO authenticated;

REVOKE ALL ON TABLE public.canal_denuncia_anexos FROM PUBLIC;
GRANT INSERT ON TABLE public.canal_denuncia_anexos TO anon;
GRANT SELECT, INSERT ON TABLE public.canal_denuncia_anexos TO authenticated;

-- Consulta pública por protocolo (sem dados do relato / denunciante)
CREATE OR REPLACE FUNCTION public.consultar_denuncia_spin(p_protocolo text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm text;
  v_id uuid;
  v_status text;
  v_created timestamptz;
  v_res text;
  t_avaliacao timestamptz;
  t_atendida timestamptz;
BEGIN
  v_norm := upper(btrim(p_protocolo));
  IF v_norm !~ '^CDSPIN[0-9]{5}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT d.id, d.status::text, d.created_at, d.descricao_resolucao
  INTO v_id, v_status, v_created, v_res
  FROM public.canal_denuncias_spin d
  WHERE d.protocolo = v_norm;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT min(h.changed_at) INTO t_avaliacao
  FROM public.canal_denuncia_status_historico h
  WHERE h.denuncia_id = v_id AND h.status_novo = 'em_avaliacao';

  SELECT min(h.changed_at) INTO t_atendida
  FROM public.canal_denuncia_status_historico h
  WHERE h.denuncia_id = v_id AND h.status_novo IN ('procedente', 'nao_procedente');

  RETURN jsonb_build_object(
    'ok', true,
    'status', v_status,
    'relatado_em', v_created,
    'em_avaliacao_em', t_avaliacao,
    'atendida_em', t_atendida,
    'descricao_resolucao',
    CASE WHEN v_status IN ('procedente', 'nao_procedente') THEN v_res ELSE NULL END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consultar_denuncia_spin(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_denuncia_spin(text) TO anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'canal-denuncias-spin',
  'canal-denuncias-spin',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS canal_denuncias_spin_storage_insert_anon ON storage.objects;
CREATE POLICY canal_denuncias_spin_storage_insert_anon
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'canal-denuncias-spin'
    AND public._denuncia_spin_anexo_anon_ok(split_part(name, '/', 1)::uuid)
  );

DROP POLICY IF EXISTS canal_denuncias_spin_storage_select_edit ON storage.objects;
CREATE POLICY canal_denuncias_spin_storage_select_edit
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'canal-denuncias-spin'
    AND public._rh_central_denuncias_perm('edit')
  );

DROP POLICY IF EXISTS canal_denuncias_spin_storage_insert_edit ON storage.objects;
CREATE POLICY canal_denuncias_spin_storage_insert_edit
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'canal-denuncias-spin'
    AND public._rh_central_denuncias_perm('edit')
  );

DROP POLICY IF EXISTS canal_denuncias_spin_storage_update_edit ON storage.objects;
CREATE POLICY canal_denuncias_spin_storage_update_edit
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'canal-denuncias-spin'
    AND public._rh_central_denuncias_perm('edit')
  );

DROP POLICY IF EXISTS canal_denuncias_spin_storage_delete_edit ON storage.objects;
CREATE POLICY canal_denuncias_spin_storage_delete_edit
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'canal-denuncias-spin'
    AND public._rh_central_denuncias_perm('edit')
  );

-- role_permissions: nova página (default sem acesso), um row por role já presente em rh_vagas
INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT r.role, 'rh_central_denuncias', 'nao', NULL, NULL, NULL
FROM public.role_permissions r
WHERE r.page_key = 'rh_vagas'
ON CONFLICT (role, page_key) DO NOTHING;

INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
SELECT DISTINCT gt.gestor_tipo_slug, 'rh_central_denuncias'
FROM public.gestor_tipo_pages gt
WHERE gt.page_key = 'rh_vagas'
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

INSERT INTO public.prestador_tipo_pages (prestador_tipo_slug, page_key)
SELECT DISTINCT pt.prestador_tipo_slug, 'rh_central_denuncias'
FROM public.prestador_tipo_pages pt
WHERE pt.page_key = 'rh_vagas'
ON CONFLICT (prestador_tipo_slug, page_key) DO NOTHING;

COMMENT ON TABLE public.canal_denuncias_spin IS
  'Canal de denúncias Spin — insert anônimo; gestão via rh_central_denuncias.';

COMMIT;
