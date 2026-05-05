-- Anotações exclusivas da Gestão de Staff (não ligadas a rh_funcionario_historico).

BEGIN;

CREATE OR REPLACE FUNCTION public._rh_staff_perm(p_need text)
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
          AND rp.page_key = 'rh_staff'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._rh_staff_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_staff_perm(text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.rh_staff_anotacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rh_funcionario_id uuid NOT NULL REFERENCES public.rh_funcionarios (id) ON DELETE CASCADE,
  texto text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT rh_staff_anotacoes_texto_nao_vazio CHECK (length(trim(texto)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_rh_staff_anotacoes_func_created
  ON public.rh_staff_anotacoes (rh_funcionario_id, created_at DESC);

COMMENT ON TABLE public.rh_staff_anotacoes IS
  'Anotações só na Gestão de Staff; RLS baseada em rh_staff (não exposto na Gestão de Prestadores).';

CREATE OR REPLACE FUNCTION public.rh_staff_anotacoes_set_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.created_by := coalesce(NEW.created_by, auth.uid());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rh_staff_anotacoes_ins ON public.rh_staff_anotacoes;
CREATE TRIGGER trg_rh_staff_anotacoes_ins
  BEFORE INSERT ON public.rh_staff_anotacoes
  FOR EACH ROW EXECUTE PROCEDURE public.rh_staff_anotacoes_set_user();

ALTER TABLE public.rh_staff_anotacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY rh_staff_anotacoes_select
  ON public.rh_staff_anotacoes FOR SELECT TO authenticated
  USING (public._rh_staff_perm('view'));

CREATE POLICY rh_staff_anotacoes_insert
  ON public.rh_staff_anotacoes FOR INSERT TO authenticated
  WITH CHECK (
    public._rh_staff_perm('edit')
    AND EXISTS (SELECT 1 FROM public.rh_funcionarios f WHERE f.id = rh_funcionario_id)
  );

REVOKE ALL ON public.rh_staff_anotacoes FROM PUBLIC;
GRANT SELECT, INSERT ON public.rh_staff_anotacoes TO authenticated;

COMMIT;
