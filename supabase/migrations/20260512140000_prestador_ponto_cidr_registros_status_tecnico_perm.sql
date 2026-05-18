-- CIDR allowlist (Status Técnico) + registros de ponto (prestador) + permissão unificada status_tecnico.
-- RPCs internas só para service_role (Edge prestador-ponto).

BEGIN;

-- ─── Helper: permissão efetiva Status Técnico (espelha AppContext) ─────────────

CREATE OR REPLACE FUNCTION public._status_tecnico_perm(p_need text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  r text;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT p.role::text INTO r FROM public.profiles p WHERE p.id = uid;
  IF r IS NULL THEN
    RETURN false;
  END IF;

  IF r = 'admin' THEN
    RETURN true;
  END IF;

  IF r = 'gestor' THEN
    IF p_need = 'view' THEN
      RETURN public._gestor_page_perm('status_tecnico', 'view');
    ELSIF p_need = 'edit' THEN
      RETURN public._gestor_page_perm('status_tecnico', 'edit');
    END IF;
    RETURN false;
  END IF;

  IF r = 'prestador' THEN
    IF p_need = 'view' THEN
      RETURN public._prestador_page_perm('status_tecnico', 'view');
    ELSIF p_need = 'edit' THEN
      RETURN public._prestador_page_perm('status_tecnico', 'edit');
    END IF;
    RETURN false;
  END IF;

  IF r = 'operador' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = uid
        AND p.role = 'operador'
        AND rp.page_key = 'status_tecnico'
        AND (
          (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
          OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
        )
    )
    AND EXISTS (
      SELECT 1
      FROM public.user_scopes s
      INNER JOIN public.operadora_pages op
        ON op.operadora_slug = s.scope_ref AND op.page_key = 'status_tecnico'
      WHERE s.user_id = uid AND s.scope_type = 'operadora'
    );
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
    WHERE p.id = uid
      AND rp.page_key = 'status_tecnico'
      AND (
        (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
        OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION public._status_tecnico_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._status_tecnico_perm(text) TO authenticated;

COMMENT ON FUNCTION public._status_tecnico_perm(text) IS
  'status_tecnico: view/edit alinhados a role_permissions + matrizes (gestor/prestador/operador).';

-- ─── Tabela: allowlist CIDR (WANs públicas) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.prestador_ponto_cidr_allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cidr cidr NOT NULL,
  rotulo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  CONSTRAINT prestador_ponto_cidr_allowlist_cidr_uk UNIQUE (cidr)
);

COMMENT ON TABLE public.prestador_ponto_cidr_allowlist IS
  'Prefixos IPv4 públicos (CIDR) cuja saída WAN libera Check-in/out de prestadores. CRUD em Status Técnico.';

ALTER TABLE public.prestador_ponto_cidr_allowlist ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.prestador_ponto_cidr_allowlist FROM PUBLIC;
GRANT SELECT, INSERT, DELETE ON TABLE public.prestador_ponto_cidr_allowlist TO authenticated;

DROP POLICY IF EXISTS prestador_ponto_cidr_select ON public.prestador_ponto_cidr_allowlist;
CREATE POLICY prestador_ponto_cidr_select
  ON public.prestador_ponto_cidr_allowlist FOR SELECT TO authenticated
  USING (public._status_tecnico_perm('view'));

DROP POLICY IF EXISTS prestador_ponto_cidr_insert ON public.prestador_ponto_cidr_allowlist;
CREATE POLICY prestador_ponto_cidr_insert
  ON public.prestador_ponto_cidr_allowlist FOR INSERT TO authenticated
  WITH CHECK (public._status_tecnico_perm('edit'));

DROP POLICY IF EXISTS prestador_ponto_cidr_delete ON public.prestador_ponto_cidr_allowlist;
CREATE POLICY prestador_ponto_cidr_delete
  ON public.prestador_ponto_cidr_allowlist FOR DELETE TO authenticated
  USING (public._status_tecnico_perm('edit'));

-- ─── Tabela: registros de ponto (só Edge com service_role grava) ─────────────

CREATE TABLE IF NOT EXISTS public.prestador_ponto_registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('check_in', 'check_out')),
  dia_sp date NOT NULL,
  client_ip inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.prestador_ponto_registros IS
  'Ponto prestador: sequência check_in/check_out por dia (America/Sao_Paulo). Inserção via Edge prestador-ponto.';

CREATE INDEX IF NOT EXISTS prestador_ponto_registros_user_dia_idx
  ON public.prestador_ponto_registros (user_id, dia_sp, created_at DESC);

ALTER TABLE public.prestador_ponto_registros ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.prestador_ponto_registros FROM PUBLIC;
-- Sem GRANT a authenticated: leitura/escrita pela Edge (service_role).

-- ─── RPCs só service_role (Edge) ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.prestador_ponto_ip_permitido(p_ip text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_ip IS NOT NULL
    AND trim(p_ip) <> ''
    AND EXISTS (
      SELECT 1
      FROM public.prestador_ponto_cidr_allowlist a
      WHERE trim(p_ip)::inet <<= a.cidr
    );
$$;

COMMENT ON FUNCTION public.prestador_ponto_ip_permitido(text) IS
  'true se o IP está contido em algum CIDR da allowlist (Edge / service_role).';

CREATE OR REPLACE FUNCTION public.prestador_ponto_cidr_configurado()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.prestador_ponto_cidr_allowlist);
$$;

CREATE OR REPLACE FUNCTION public.prestador_ponto_escalado_dia(
  p_funcionario_id uuid,
  p_dia date
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rh_gestao_escala_grade g
    INNER JOIN public.rh_gestao_escala_grade_status s
      ON s.ref_mes = g.ref_mes
     AND s.area_key = g.area_key
     AND s.status = 'aprovada'
    WHERE g.funcionario_id = p_funcionario_id
      AND g.dia_iso = p_dia
      AND trim(coalesce(g.valor, '')) <> ''
      AND lower(trim(g.valor)) NOT IN ('folga', 'f')
      AND trim(g.valor) NOT IN ('Folga', 'F')
  );
$$;

COMMENT ON FUNCTION public.prestador_ponto_escalado_dia(uuid, date) IS
  'true se há célula aprovada e não-folga na grade para o funcionário na data (Gestão de Escala).';

REVOKE ALL ON FUNCTION public.prestador_ponto_ip_permitido(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prestador_ponto_cidr_configurado() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prestador_ponto_escalado_dia(uuid, date) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.prestador_ponto_ip_permitido(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.prestador_ponto_cidr_configurado() TO service_role;
GRANT EXECUTE ON FUNCTION public.prestador_ponto_escalado_dia(uuid, date) TO service_role;

COMMIT;
