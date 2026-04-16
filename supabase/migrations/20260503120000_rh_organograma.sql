-- ─── RH — Organograma (Diretoria → Gerência → Time) + vínculo em funcionários ─
-- Soft delete por status. RLS alinhado a rh_funcionarios (page_key rh_organograma).
-- Um mesmo funcionário ativo não pode ser responsável em dois nós do mesmo nível (índice parcial).

BEGIN;

CREATE TABLE IF NOT EXISTS public.rh_org_diretorias (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                    text        NOT NULL,
  diretor_funcionario_id  uuid        REFERENCES public.rh_funcionarios (id) ON DELETE SET NULL,
  diretor_nome_livre      text,
  status                  text        NOT NULL DEFAULT 'ativo'
    CHECK (status IN ('ativo', 'inativo')),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rh_org_gerencias (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diretoria_id             uuid        NOT NULL REFERENCES public.rh_org_diretorias (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  nome                     text        NOT NULL,
  gerente_funcionario_id   uuid        REFERENCES public.rh_funcionarios (id) ON DELETE SET NULL,
  gerente_nome_livre       text,
  status                   text        NOT NULL DEFAULT 'ativo'
    CHECK (status IN ('ativo', 'inativo')),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rh_org_times (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gerencia_id             uuid        NOT NULL REFERENCES public.rh_org_gerencias (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  nome                    text        NOT NULL,
  lider_funcionario_id    uuid        REFERENCES public.rh_funcionarios (id) ON DELETE SET NULL,
  lider_nome_livre        text,
  status                  text        NOT NULL DEFAULT 'ativo'
    CHECK (status IN ('ativo', 'inativo')),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rh_org_gerencias_diretoria ON public.rh_org_gerencias (diretoria_id);
CREATE INDEX IF NOT EXISTS idx_rh_org_times_gerencia ON public.rh_org_times (gerencia_id);
CREATE INDEX IF NOT EXISTS idx_rh_org_diretorias_status ON public.rh_org_diretorias (status);

CREATE UNIQUE INDEX IF NOT EXISTS rh_org_diretorias_diretor_ativo_unique
  ON public.rh_org_diretorias (diretor_funcionario_id)
  WHERE diretor_funcionario_id IS NOT NULL AND status = 'ativo';

CREATE UNIQUE INDEX IF NOT EXISTS rh_org_gerencias_gerente_ativo_unique
  ON public.rh_org_gerencias (gerente_funcionario_id)
  WHERE gerente_funcionario_id IS NOT NULL AND status = 'ativo';

CREATE UNIQUE INDEX IF NOT EXISTS rh_org_times_lider_ativo_unique
  ON public.rh_org_times (lider_funcionario_id)
  WHERE lider_funcionario_id IS NOT NULL AND status = 'ativo';

CREATE OR REPLACE FUNCTION public.rh_org_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rh_org_diretorias_upd ON public.rh_org_diretorias;
CREATE TRIGGER trg_rh_org_diretorias_upd
  BEFORE UPDATE ON public.rh_org_diretorias
  FOR EACH ROW EXECUTE PROCEDURE public.rh_org_set_updated_at();

DROP TRIGGER IF EXISTS trg_rh_org_gerencias_upd ON public.rh_org_gerencias;
CREATE TRIGGER trg_rh_org_gerencias_upd
  BEFORE UPDATE ON public.rh_org_gerencias
  FOR EACH ROW EXECUTE PROCEDURE public.rh_org_set_updated_at();

DROP TRIGGER IF EXISTS trg_rh_org_times_upd ON public.rh_org_times;
CREATE TRIGGER trg_rh_org_times_upd
  BEFORE UPDATE ON public.rh_org_times
  FOR EACH ROW EXECUTE PROCEDURE public.rh_org_set_updated_at();

ALTER TABLE public.rh_funcionarios
  ADD COLUMN IF NOT EXISTS org_time_id uuid REFERENCES public.rh_org_times (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rh_funcionarios_org_time ON public.rh_funcionarios (org_time_id);

CREATE OR REPLACE FUNCTION public._rh_organograma_perm(p_need text)
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
          AND rp.page_key = 'rh_organograma'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._rh_organograma_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_organograma_perm(text) TO authenticated;

ALTER TABLE public.rh_org_diretorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_org_gerencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_org_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY rh_org_diretorias_select ON public.rh_org_diretorias FOR SELECT TO authenticated
  USING (public._rh_organograma_perm('view'));
CREATE POLICY rh_org_diretorias_insert ON public.rh_org_diretorias FOR INSERT TO authenticated
  WITH CHECK (public._rh_organograma_perm('create'));
CREATE POLICY rh_org_diretorias_update ON public.rh_org_diretorias FOR UPDATE TO authenticated
  USING (public._rh_organograma_perm('edit')) WITH CHECK (public._rh_organograma_perm('edit'));

CREATE POLICY rh_org_gerencias_select ON public.rh_org_gerencias FOR SELECT TO authenticated
  USING (public._rh_organograma_perm('view'));
CREATE POLICY rh_org_gerencias_insert ON public.rh_org_gerencias FOR INSERT TO authenticated
  WITH CHECK (public._rh_organograma_perm('create'));
CREATE POLICY rh_org_gerencias_update ON public.rh_org_gerencias FOR UPDATE TO authenticated
  USING (public._rh_organograma_perm('edit')) WITH CHECK (public._rh_organograma_perm('edit'));

CREATE POLICY rh_org_times_select ON public.rh_org_times FOR SELECT TO authenticated
  USING (public._rh_organograma_perm('view'));
CREATE POLICY rh_org_times_insert ON public.rh_org_times FOR INSERT TO authenticated
  WITH CHECK (public._rh_organograma_perm('create'));
CREATE POLICY rh_org_times_update ON public.rh_org_times FOR UPDATE TO authenticated
  USING (public._rh_organograma_perm('edit')) WITH CHECK (public._rh_organograma_perm('edit'));

REVOKE DELETE ON TABLE public.rh_org_diretorias FROM authenticated;
REVOKE DELETE ON TABLE public.rh_org_gerencias FROM authenticated;
REVOKE DELETE ON TABLE public.rh_org_times FROM authenticated;

GRANT SELECT, INSERT, UPDATE ON public.rh_org_diretorias TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.rh_org_gerencias TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.rh_org_times TO authenticated;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT role, 'rh_organograma', can_view, can_criar, can_editar, can_excluir
FROM public.role_permissions
WHERE page_key = 'rh_funcionarios'
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view    = EXCLUDED.can_view,
  can_criar   = EXCLUDED.can_criar,
  can_editar  = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
VALUES ('recursos_humanos', 'rh_organograma')
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

COMMENT ON TABLE public.rh_org_diretorias IS 'RH organograma — nível 1 (Diretoria).';
COMMENT ON TABLE public.rh_org_gerencias IS 'RH organograma — nível 2 (Gerência).';
COMMENT ON TABLE public.rh_org_times IS 'RH organograma — nível 3 (Time); rh_funcionarios.org_time_id opcional.';

COMMIT;
