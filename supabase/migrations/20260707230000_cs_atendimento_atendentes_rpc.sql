-- Atendimento CS: lista de atendentes (prestadores do time Customer Service) para o filtro Staff.
-- SECURITY DEFINER — usuários com cs_atendimento não têm SELECT em rh_org_times / rh_funcionarios.

BEGIN;

CREATE OR REPLACE FUNCTION public.cs_atendimento_atendentes_listar()
RETURNS TABLE (
  profile_id uuid,
  nome       text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (out_profile_id)
    out_profile_id AS profile_id,
    out_nome AS nome
  FROM (
    SELECT
      COALESCE(p.id, f.id) AS out_profile_id,
      COALESCE(NULLIF(btrim(f.nome), ''), NULLIF(btrim(p.name), ''), '—') AS out_nome,
      btrim(f.nome) AS sort_nome
    FROM public.rh_funcionarios f
    INNER JOIN public.rh_org_times t
      ON t.id = f.org_time_id
      AND t.status = 'ativo'
      AND lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) = 'customer service'
    LEFT JOIN public.profiles p
      ON lower(btrim(p.email)) = lower(btrim(coalesce(nullif(btrim(f.email_spin), ''), f.email)))
    WHERE f.status IN ('ativo', 'indisponivel')
      AND public._cs_atendimento_perm('view')
  ) sub
  ORDER BY out_profile_id, sort_nome NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.cs_atendimento_atendentes_listar() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cs_atendimento_atendentes_listar() TO authenticated;

COMMENT ON FUNCTION public.cs_atendimento_atendentes_listar() IS
  'Atendimento CS: prestadores ativos/indisponíveis do time Customer Service (organograma), mapeados a profiles.id quando houver login. Requer cs_atendimento.can_view ou admin.';

COMMIT;
