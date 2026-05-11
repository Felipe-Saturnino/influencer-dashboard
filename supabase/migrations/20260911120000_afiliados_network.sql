-- Afiliados — Network: cadastro de afiliados em funil (espelha Scout na app; tabelas dedicadas).
-- Ordem: após _gestor_page_perm / _staff_spin_page_perm / _prestador_page_perm (migrations 20260908+).

BEGIN;

-- ─── Helper de permissão (paridade Spin na Rede / campanhas) ─────────────────

CREATE OR REPLACE FUNCTION public._afiliados_network_perm(p_need text)
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
      OR public._gestor_page_perm('afiliados_network', p_need)
      OR public._prestador_page_perm('afiliados_network', p_need)
      OR public._staff_spin_page_perm('afiliados_network', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'afiliados_network'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._afiliados_network_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._afiliados_network_perm(text) TO authenticated;

-- ─── Tabela principal ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.afiliados_network (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            text        NOT NULL,
  status          text        NOT NULL DEFAULT 'visualizado'
    CHECK (status IN ('visualizado', 'contato', 'negociacao', 'fechado')),
  email           text,
  tipo_contato    text
    CHECK (tipo_contato IS NULL OR tipo_contato IN ('direto', 'agencia', 'site_spin')),
  telefone        text,
  live_cassino    text
    CHECK (live_cassino IS NULL OR live_cassino IN ('sim', 'nao')),
  operadora_slug  text REFERENCES public.operadoras (slug) ON DELETE SET NULL,
  operacao        text,
  created_by      uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_afiliados_network_status ON public.afiliados_network (status);
CREATE INDEX IF NOT EXISTS idx_afiliados_network_created_by ON public.afiliados_network (created_by);

COMMENT ON TABLE public.afiliados_network IS
  'Prospectos de afiliados (funil). App: Afiliados → Network.';

CREATE OR REPLACE FUNCTION public.afiliados_network_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_afiliados_network_updated ON public.afiliados_network;
CREATE TRIGGER trg_afiliados_network_updated
  BEFORE UPDATE ON public.afiliados_network
  FOR EACH ROW EXECUTE PROCEDURE public.afiliados_network_set_updated_at();

ALTER TABLE public.afiliados_network ENABLE ROW LEVEL SECURITY;

CREATE POLICY afiliados_network_select ON public.afiliados_network
  FOR SELECT TO authenticated
  USING (public._afiliados_network_perm('view'));

CREATE POLICY afiliados_network_insert ON public.afiliados_network
  FOR INSERT TO authenticated
  WITH CHECK (public._afiliados_network_perm('create'));

CREATE POLICY afiliados_network_update ON public.afiliados_network
  FOR UPDATE TO authenticated
  USING (public._afiliados_network_perm('edit'))
  WITH CHECK (public._afiliados_network_perm('edit'));

CREATE POLICY afiliados_network_delete ON public.afiliados_network
  FOR DELETE TO authenticated
  USING (public._afiliados_network_perm('delete'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.afiliados_network TO authenticated;

-- ─── Anotações ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.afiliados_network_anotacoes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  afiliado_id  uuid NOT NULL REFERENCES public.afiliados_network (id) ON DELETE CASCADE,
  usuario_id   uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  texto        text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_afiliados_net_anot_afiliado ON public.afiliados_network_anotacoes (afiliado_id);

ALTER TABLE public.afiliados_network_anotacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY afiliados_net_anot_select ON public.afiliados_network_anotacoes
  FOR SELECT TO authenticated
  USING (public._afiliados_network_perm('view'));

CREATE POLICY afiliados_net_anot_insert ON public.afiliados_network_anotacoes
  FOR INSERT TO authenticated
  WITH CHECK (public._afiliados_network_perm('edit'));

CREATE POLICY afiliados_net_anot_delete ON public.afiliados_network_anotacoes
  FOR DELETE TO authenticated
  USING (public._afiliados_network_perm('delete'));

GRANT SELECT, INSERT, DELETE ON public.afiliados_network_anotacoes TO authenticated;

-- ─── role_permissions (base: scout se existir; senão campanhas) ─────────────

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT r.role, 'afiliados_network', r.can_view, r.can_criar, r.can_editar, r.can_excluir
FROM public.role_permissions r
WHERE r.page_key = 'scout'
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view    = EXCLUDED.can_view,
  can_criar   = EXCLUDED.can_criar,
  can_editar  = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT c.role, 'afiliados_network', c.can_view, c.can_criar, c.can_editar, c.can_excluir
FROM public.role_permissions c
WHERE c.page_key = 'campanhas'
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions x
    WHERE x.page_key = 'afiliados_network' AND x.role = c.role
  )
ON CONFLICT (role, page_key) DO NOTHING;

INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
VALUES ('afiliados', 'afiliados_network')
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
SELECT DISTINCT gt.gestor_tipo_slug, 'afiliados_network'
FROM public.gestor_tipo_pages gt
WHERE gt.page_key = 'campanhas'
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

INSERT INTO public.prestador_tipo_pages (prestador_tipo_slug, page_key)
SELECT DISTINCT ptp.prestador_tipo_slug, 'afiliados_network'
FROM public.prestador_tipo_pages ptp
WHERE ptp.page_key = 'campanhas'
ON CONFLICT (prestador_tipo_slug, page_key) DO NOTHING;

INSERT INTO public.operadora_pages (operadora_slug, page_key)
SELECT DISTINCT op.operadora_slug, 'afiliados_network'
FROM public.operadora_pages op
WHERE op.page_key = 'campanhas'
ON CONFLICT (operadora_slug, page_key) DO NOTHING;

COMMIT;
