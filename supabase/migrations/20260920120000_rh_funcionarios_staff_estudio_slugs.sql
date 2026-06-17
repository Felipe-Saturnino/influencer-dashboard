-- Gestão de Staff / Escala: múltiplos estúdios por prestador ou «todos» (exclusivo).

BEGIN;

ALTER TABLE public.rh_funcionarios
  ADD COLUMN IF NOT EXISTS staff_estudio_slugs text[];

COMMENT ON COLUMN public.rh_funcionarios.staff_estudio_slugs IS
  'Estúdios do prestador: vazio = nenhum; {todos} = todos os estúdios (exclusivo); demais = N slugs específicos. staff_estudio_slug mantém o primário para legado.';

UPDATE public.rh_funcionarios
SET staff_estudio_slugs = ARRAY[staff_estudio_slug]
WHERE staff_estudio_slug IS NOT NULL
  AND btrim(staff_estudio_slug) <> ''
  AND (staff_estudio_slugs IS NULL OR cardinality(staff_estudio_slugs) = 0);

DROP FUNCTION IF EXISTS public.rh_escala_prestadores_times() CASCADE;

CREATE FUNCTION public.rh_escala_prestadores_times()
RETURNS TABLE (
  id uuid,
  nome text,
  cargo text,
  escala text,
  staff_turno text,
  email text,
  org_time_id uuid,
  nome_time text,
  staff_nickname text,
  staff_estudio_slug text,
  staff_estudio_slugs text[],
  staff_operadora_slug text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._prestador_page_perm('rh_gestao_escala', 'view')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND p.role IS DISTINCT FROM 'prestador'
        AND rp.page_key = 'rh_gestao_escala'
        AND rp.can_view IN ('sim', 'proprios')
    )
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    f.id,
    f.nome,
    f.cargo,
    f.escala,
    f.staff_turno,
    f.email,
    f.org_time_id,
    t.nome AS nome_time,
    f.staff_nickname,
    f.staff_estudio_slug::text,
    f.staff_estudio_slugs,
    f.staff_operadora_slug::text
  FROM public.rh_funcionarios f
  INNER JOIN public.rh_org_times t ON t.id = f.org_time_id AND t.status = 'ativo'
  INNER JOIN public.rh_org_gerencias g ON g.id = t.gerencia_id AND g.status = 'ativo'
  WHERE f.status IN ('ativo', 'indisponivel')
    AND (
      (lower(btrim(g.nome)) LIKE '%game floor%')
      OR (
        lower(btrim(g.nome)) LIKE '%operation%'
        AND lower(btrim(g.nome)) LIKE '%management%'
      )
    )
    AND lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) <> 'contador de cartas'
  ORDER BY t.nome, f.nome;
END;
$$;

COMMENT ON FUNCTION public.rh_escala_prestadores_times() IS
  'RH Gestão de Escala: staff Game Floor / Operation Management; inclui staff_estudio_slugs para filtro multi-estúdio na UI.';

REVOKE ALL ON FUNCTION public.rh_escala_prestadores_times() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_escala_prestadores_times() TO authenticated;

COMMIT;
