-- Gestão de Staff: campos extras em prestadores, permissão page_key rh_staff, RPC de times (Studio Ops + Customer Service).

BEGIN;

ALTER TABLE public.rh_funcionarios
  ADD COLUMN IF NOT EXISTS staff_nickname text,
  ADD COLUMN IF NOT EXISTS staff_operadora_slug text REFERENCES public.operadoras (slug) ON UPDATE CASCADE ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS staff_barcode text,
  ADD COLUMN IF NOT EXISTS staff_skills jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.rh_funcionarios.staff_nickname IS 'Apelido na operação (Gestão de Staff).';
COMMENT ON COLUMN public.rh_funcionarios.staff_operadora_slug IS 'Operadora vinculada ao staff (slug operadoras).';
COMMENT ON COLUMN public.rh_funcionarios.staff_barcode IS 'Código de barras / identificador físico do crachá.';
COMMENT ON COLUMN public.rh_funcionarios.staff_skills IS 'JSON por jogo: baccarat|blackjack|vip|roleta|futebol_studio → ativo|treinamento|inativo.';

CREATE OR REPLACE FUNCTION public._rh_funcionario_perm(p_need text)
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
          AND rp.page_key = 'rh_funcionarios'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND rp.page_key = 'rh_staff'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
          )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.rh_staff_times_filtrados()
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
      (
        lower(btrim(g.nome)) LIKE '%studio%'
        AND lower(btrim(g.nome)) LIKE '%operations%'
      )
      OR (
        lower(btrim(g.nome)) LIKE '%customer%'
        AND lower(btrim(g.nome)) LIKE '%service%'
      )
    )
    AND auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
      OR EXISTS (
        SELECT 1
        FROM public.profiles pr
        INNER JOIN public.role_permissions rp ON rp.role::text = pr.role::text
        WHERE pr.id = auth.uid()
          AND rp.page_key = 'rh_staff'
          AND rp.can_view IN ('sim', 'proprios')
      )
    )
  ORDER BY g.nome, t.nome;
$$;

REVOKE ALL ON FUNCTION public.rh_staff_times_filtrados() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_staff_times_filtrados() TO authenticated;

COMMENT ON FUNCTION public.rh_staff_times_filtrados() IS
  'Gestão de Staff: times ativos das gerências cujo nome sugere Studio Operations ou Customer Service. Requer rh_staff.can_view ou admin.';

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT role, 'rh_staff', can_view, can_criar, can_editar, can_excluir
FROM public.role_permissions
WHERE page_key = 'rh_funcionarios'
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view    = EXCLUDED.can_view,
  can_criar   = EXCLUDED.can_criar,
  can_editar  = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
VALUES ('recursos_humanos', 'rh_staff')
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

COMMIT;
