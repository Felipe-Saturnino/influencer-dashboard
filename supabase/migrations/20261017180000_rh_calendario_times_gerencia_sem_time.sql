-- Calendário: gerências sem times ativos entram no filtro Time
-- (efeito cascata — vínculo org_gerencia_id sem org_time_id).

BEGIN;

DROP FUNCTION IF EXISTS public.rh_calendario_times_visiveis();
CREATE FUNCTION public.rh_calendario_times_visiveis()
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
  WITH
  perm AS (
    SELECT public._rh_calendario_permissao_valor('view') AS valor
  ),
  me AS (
    SELECT public._rh_funcionario_login_id() AS id
  ),
  diretorias_lideradas AS (
    SELECT d.id
    FROM public.rh_org_diretorias d, me
    WHERE d.status = 'ativo' AND d.diretor_funcionario_id = me.id
  ),
  gerencias_lideradas AS (
    SELECT g.id
    FROM public.rh_org_gerencias g, me
    WHERE g.status = 'ativo' AND g.gerente_funcionario_id = me.id
  ),
  times_reais AS (
    SELECT t.id, t.nome, t.gerencia_id, g.nome AS gerencia_nome
    FROM public.rh_org_times t
    INNER JOIN public.rh_org_gerencias g ON g.id = t.gerencia_id AND g.status = 'ativo'
    CROSS JOIN perm
    CROSS JOIN me
    WHERE t.status = 'ativo'
      AND (
        perm.valor = 'sim'
        OR (
          perm.valor = 'proprios'
          AND (
            t.lider_funcionario_id = me.id
            OR t.id IN (
              SELECT f.org_time_id
              FROM public.rh_funcionarios f
              WHERE f.id = me.id AND f.org_time_id IS NOT NULL
            )
            OR t.gerencia_id IN (SELECT id FROM gerencias_lideradas)
            OR g.diretoria_id IN (SELECT id FROM diretorias_lideradas)
          )
        )
      )
  ),
  -- Na ausência de times ativos, a gerência aparece como opção de Time (id = gerencia.id).
  gerencias_sem_time AS (
    SELECT
      g.id,
      g.nome,
      g.id AS gerencia_id,
      g.nome AS gerencia_nome
    FROM public.rh_org_gerencias g
    CROSS JOIN perm
    CROSS JOIN me
    WHERE g.status = 'ativo'
      AND NOT EXISTS (
        SELECT 1
        FROM public.rh_org_times t
        WHERE t.gerencia_id = g.id
          AND t.status = 'ativo'
      )
      AND (
        perm.valor = 'sim'
        OR (
          perm.valor = 'proprios'
          AND (
            g.gerente_funcionario_id = me.id
            OR g.id IN (SELECT id FROM gerencias_lideradas)
            OR g.diretoria_id IN (SELECT id FROM diretorias_lideradas)
            OR g.id IN (
              SELECT f.org_gerencia_id
              FROM public.rh_funcionarios f
              WHERE f.id = me.id
                AND f.org_gerencia_id IS NOT NULL
                AND f.org_time_id IS NULL
            )
          )
        )
      )
  )
  SELECT * FROM times_reais
  UNION ALL
  SELECT * FROM gerencias_sem_time
  ORDER BY 2
$$;

COMMENT ON FUNCTION public.rh_calendario_times_visiveis() IS
  'Times ativos no escopo do Calendário + gerências sem times ativos (cascata: gerência como Time).';

REVOKE ALL ON FUNCTION public.rh_calendario_times_visiveis() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_calendario_times_visiveis() TO authenticated;

COMMIT;
