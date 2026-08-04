-- Estúdio — Incidentes (registro de erros de mesa)
-- PageKey: incidentes | Protocolos: CASO- / OCULTO- / ERRO-

BEGIN;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT r.role, 'incidentes', 'nao', NULL, 'nao', NULL
FROM (
  SELECT unnest(ARRAY[
    'gestor_aquisicao', 'gestor_marketing', 'gestor_operacoes', 'gestor_tech_ops', 'gestor_academy', 'gestor_rh',
    'operador', 'agencia', 'influencer', 'afiliado', 'investidor', 'executivo',
    'prestador', 'rh', 'figurino', 'comunicacao', 'performance_coach', 'service_manager', 'shift_leader',
    'customer_service', 'game_presenter', 'shuffler', 'tech_ops'
  ]::text[]) AS role
) r
ON CONFLICT (role, page_key) DO NOTHING;

INSERT INTO public.prestador_tipo_pages (prestador_tipo_slug, page_key)
SELECT DISTINCT pt.prestador_tipo_slug, 'incidentes'
FROM public.prestador_tipo_pages pt
WHERE pt.page_key = 'roteiro_mesa'
ON CONFLICT (prestador_tipo_slug, page_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public._estudio_incidentes_perm(p_need text)
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
      OR public._gestor_page_perm('incidentes', p_need)
      OR public._prestador_page_perm('incidentes', p_need)
      OR public._staff_spin_page_perm('incidentes', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'incidentes'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._estudio_incidentes_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._estudio_incidentes_perm(text) TO authenticated;

CREATE SEQUENCE IF NOT EXISTS public.estudio_incidente_protocolo_caso_seq;
CREATE SEQUENCE IF NOT EXISTS public.estudio_incidente_protocolo_oculto_seq;
CREATE SEQUENCE IF NOT EXISTS public.estudio_incidente_protocolo_erro_seq;

CREATE OR REPLACE FUNCTION public.estudio_incidente_next_protocol(p_incidente text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_n bigint;
BEGIN
  IF p_incidente = 'caso' THEN
    v_prefix := 'CASO';
    v_n := nextval('public.estudio_incidente_protocolo_caso_seq');
  ELSIF p_incidente = 'oculto' THEN
    v_prefix := 'OCULTO';
    v_n := nextval('public.estudio_incidente_protocolo_oculto_seq');
  ELSE
    v_prefix := 'ERRO';
    v_n := nextval('public.estudio_incidente_protocolo_erro_seq');
  END IF;
  RETURN v_prefix || '-' || lpad(v_n::text, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.estudio_incidentes_set_protocol()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.protocolo IS NULL OR btrim(NEW.protocolo) = '' THEN
    NEW.protocolo := public.estudio_incidente_next_protocol(NEW.incidente);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.estudio_incidentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo text NOT NULL UNIQUE,
  ocorrido_em timestamptz NOT NULL DEFAULT now(),
  time_alvo text NOT NULL CHECK (time_alvo IN ('gp', 'shuf')),
  prestador_id uuid NOT NULL REFERENCES public.rh_funcionarios(id) ON DELETE RESTRICT,
  prestador_nome text NOT NULL,
  mesa_id uuid REFERENCES public.mesas_spin_cadastro(id) ON DELETE SET NULL,
  mesa_label text NOT NULL,
  estudio_slug text,
  jogo text NOT NULL,
  incidente text NOT NULL CHECK (incidente IN (
    'caso', 'erro', 'oculto', 'nao_avisado', 'avisado_resolvido', 'avisado_nao_resolvido'
  )),
  tipo text NOT NULL,
  id_rodada text NOT NULL,
  data_rodada date NOT NULL,
  hora_rodada time NOT NULL,
  local_mesa text CHECK (local_mesa IS NULL OR local_mesa IN ('em_mesa', 'fora_mesa')),
  resolucao text NOT NULL CHECK (resolucao IN (
    'Resolvido', 'Jogo Cancelado', 'Jogo Encerrado Incorretamente', 'Não afetado'
  )),
  payout_necessario boolean NOT NULL DEFAULT false,
  descricao text NOT NULL,
  relator_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  relator_nome text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT estudio_incidentes_descricao_len CHECK (length(trim(descricao)) > 0),
  CONSTRAINT estudio_incidentes_tipo_len CHECK (length(trim(tipo)) > 0),
  CONSTRAINT estudio_incidentes_local_shuf CHECK (
    (time_alvo = 'shuf' AND local_mesa IS NOT NULL) OR time_alvo = 'gp'
  )
);

CREATE INDEX IF NOT EXISTS idx_estudio_incidentes_ocorrido
  ON public.estudio_incidentes (ocorrido_em DESC);
CREATE INDEX IF NOT EXISTS idx_estudio_incidentes_prestador
  ON public.estudio_incidentes (prestador_id);
CREATE INDEX IF NOT EXISTS idx_estudio_incidentes_time
  ON public.estudio_incidentes (time_alvo);
CREATE INDEX IF NOT EXISTS idx_estudio_incidentes_incidente
  ON public.estudio_incidentes (incidente);
CREATE INDEX IF NOT EXISTS idx_estudio_incidentes_estudio
  ON public.estudio_incidentes (estudio_slug);

DROP TRIGGER IF EXISTS trg_estudio_incidentes_protocol ON public.estudio_incidentes;
CREATE TRIGGER trg_estudio_incidentes_protocol
  BEFORE INSERT ON public.estudio_incidentes
  FOR EACH ROW EXECUTE PROCEDURE public.estudio_incidentes_set_protocol();

CREATE OR REPLACE FUNCTION public.estudio_incidentes_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_estudio_incidentes_updated ON public.estudio_incidentes;
CREATE TRIGGER trg_estudio_incidentes_updated
  BEFORE UPDATE ON public.estudio_incidentes
  FOR EACH ROW EXECUTE PROCEDURE public.estudio_incidentes_touch_updated_at();

CREATE TABLE IF NOT EXISTS public.estudio_incidente_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incidente_id uuid NOT NULL REFERENCES public.estudio_incidentes(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  content_type text,
  file_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estudio_incidente_anexos_inc
  ON public.estudio_incidente_anexos (incidente_id);

ALTER TABLE public.estudio_incidentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estudio_incidente_anexos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS estudio_incidentes_select ON public.estudio_incidentes;
CREATE POLICY estudio_incidentes_select
  ON public.estudio_incidentes FOR SELECT TO authenticated
  USING (public._estudio_incidentes_perm('view'));

DROP POLICY IF EXISTS estudio_incidentes_insert ON public.estudio_incidentes;
CREATE POLICY estudio_incidentes_insert
  ON public.estudio_incidentes FOR INSERT TO authenticated
  WITH CHECK (public._estudio_incidentes_perm('edit'));

DROP POLICY IF EXISTS estudio_incidentes_update ON public.estudio_incidentes;
CREATE POLICY estudio_incidentes_update
  ON public.estudio_incidentes FOR UPDATE TO authenticated
  USING (public._estudio_incidentes_perm('edit'))
  WITH CHECK (public._estudio_incidentes_perm('edit'));

DROP POLICY IF EXISTS estudio_incidente_anexos_select ON public.estudio_incidente_anexos;
CREATE POLICY estudio_incidente_anexos_select
  ON public.estudio_incidente_anexos FOR SELECT TO authenticated
  USING (public._estudio_incidentes_perm('view'));

DROP POLICY IF EXISTS estudio_incidente_anexos_insert ON public.estudio_incidente_anexos;
CREATE POLICY estudio_incidente_anexos_insert
  ON public.estudio_incidente_anexos FOR INSERT TO authenticated
  WITH CHECK (public._estudio_incidentes_perm('edit'));

REVOKE ALL ON TABLE public.estudio_incidentes FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON TABLE public.estudio_incidentes TO authenticated;
REVOKE ALL ON TABLE public.estudio_incidente_anexos FROM PUBLIC;
GRANT SELECT, INSERT ON TABLE public.estudio_incidente_anexos TO authenticated;

-- Leitura auxiliar (mesas / estúdios / prestadores / times) para quem vê a página
DROP POLICY IF EXISTS mesas_spin_cadastro_select_incidentes ON public.mesas_spin_cadastro;
CREATE POLICY mesas_spin_cadastro_select_incidentes
  ON public.mesas_spin_cadastro FOR SELECT TO authenticated
  USING (public._estudio_incidentes_perm('view'));

DROP POLICY IF EXISTS estudios_spin_select_incidentes ON public.estudios_spin;
CREATE POLICY estudios_spin_select_incidentes
  ON public.estudios_spin FOR SELECT TO authenticated
  USING (public._estudio_incidentes_perm('view'));

DROP POLICY IF EXISTS rh_funcionarios_select_incidentes ON public.rh_funcionarios;
CREATE POLICY rh_funcionarios_select_incidentes
  ON public.rh_funcionarios FOR SELECT TO authenticated
  USING (public._estudio_incidentes_perm('view'));

DROP POLICY IF EXISTS rh_org_times_select_incidentes ON public.rh_org_times;
CREATE POLICY rh_org_times_select_incidentes
  ON public.rh_org_times FOR SELECT TO authenticated
  USING (public._estudio_incidentes_perm('view'));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'estudio-incidentes',
  'estudio-incidentes',
  false,
  10485760,
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

DROP POLICY IF EXISTS estudio_incidentes_storage_insert ON storage.objects;
CREATE POLICY estudio_incidentes_storage_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'estudio-incidentes'
    AND public._estudio_incidentes_perm('edit')
  );

DROP POLICY IF EXISTS estudio_incidentes_storage_select ON storage.objects;
CREATE POLICY estudio_incidentes_storage_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'estudio-incidentes'
    AND public._estudio_incidentes_perm('view')
  );

COMMIT;
