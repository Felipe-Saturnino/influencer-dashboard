-- Calendário: Ver=Sim = recorte Organograma; Ver=Próprios = só o próprio;
-- Criar=Sim = empresa inteira (visão). Editar=Sim = Organograma (ações no escopo).
-- Admin continua irrestrito via _rh_calendario_permissao_valor / role.

CREATE OR REPLACE FUNCTION public._rh_calendario_funcionarios_escopo_por_permissao(p_need text)
RETURNS TABLE (funcionario_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
  perm AS (
    SELECT public._rh_calendario_permissao_valor(p_need) AS valor
  ),
  create_perm AS (
    SELECT public._rh_calendario_permissao_valor('create') AS valor
  ),
  me AS (
    SELECT public._rh_funcionario_login_id() AS id
  ),
  diretorias_lideradas AS (
    SELECT d.id
    FROM public.rh_org_diretorias d, me
    WHERE d.status = 'ativo'
      AND d.diretor_funcionario_id = me.id
  ),
  gerencias_lideradas AS (
    SELECT g.id
    FROM public.rh_org_gerencias g, me
    WHERE g.status = 'ativo'
      AND g.gerente_funcionario_id = me.id
  ),
  times_liderados AS (
    SELECT t.id
    FROM public.rh_org_times t, me
    WHERE t.status = 'ativo'
      AND t.lider_funcionario_id = me.id
  ),
  gerencias_no_escopo AS (
    SELECT gl.id FROM gerencias_lideradas gl
    UNION
    SELECT g.id
    FROM public.rh_org_gerencias g
    WHERE g.status = 'ativo'
      AND g.diretoria_id IN (SELECT id FROM diretorias_lideradas)
  ),
  times_no_escopo AS (
    SELECT tl.id FROM times_liderados tl
    UNION
    SELECT t.id
    FROM public.rh_org_times t
    WHERE t.status = 'ativo'
      AND t.gerencia_id IN (SELECT id FROM gerencias_no_escopo)
  ),
  lideres_no_escopo AS (
    SELECT d.diretor_funcionario_id AS id
    FROM public.rh_org_diretorias d
    WHERE d.status = 'ativo'
      AND d.id IN (SELECT id FROM diretorias_lideradas)
    UNION
    SELECT g.gerente_funcionario_id
    FROM public.rh_org_gerencias g
    WHERE g.status = 'ativo'
      AND g.id IN (SELECT id FROM gerencias_no_escopo)
    UNION
    SELECT t.lider_funcionario_id
    FROM public.rh_org_times t
    WHERE t.status = 'ativo'
      AND t.id IN (SELECT id FROM times_no_escopo)
  ),
  organograma AS (
    SELECT DISTINCT f.id
    FROM public.rh_funcionarios f
    CROSS JOIN me
    WHERE f.status IN ('ativo', 'indisponivel')
      AND (
        f.id = me.id
        OR f.id IN (SELECT id FROM lideres_no_escopo WHERE id IS NOT NULL)
        OR f.org_diretoria_id IN (SELECT id FROM diretorias_lideradas)
        OR f.org_gerencia_id IN (SELECT id FROM gerencias_no_escopo)
        OR f.org_time_id IN (SELECT id FROM times_no_escopo)
      )
  )
  SELECT DISTINCT f.id
  FROM public.rh_funcionarios f
  CROSS JOIN perm
  CROSS JOIN create_perm
  CROSS JOIN me
  WHERE f.status IN ('ativo', 'indisponivel')
    AND (
      -- Criar = Sim: empresa inteira (visão ampla / Relatório global)
      (p_need = 'view' AND create_perm.valor = 'sim')
      OR (
        -- Ver/Editar = Sim: recorte Organograma (não mais empresa inteira)
        perm.valor = 'sim'
        AND f.id IN (SELECT id FROM organograma)
      )
      OR (
        -- Ver/Editar = Próprios: só o próprio
        perm.valor = 'proprios'
        AND f.id = me.id
      )
    )
$$;

COMMENT ON FUNCTION public._rh_calendario_funcionarios_escopo_por_permissao(text) IS
  'Escopo Calendário: Criar=Sim (view) = empresa; Ver/Editar=Sim = Organograma liderado; Próprios = só o login.';

-- GP/Shuffler: dia trabalhado exclui Folga/F/Venda (case insensitive).
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
      AND lower(trim(g.valor)) NOT IN ('folga', 'f', 'venda')
  );
$$;

COMMENT ON FUNCTION public.prestador_ponto_escalado_dia(uuid, date) IS
  'true se há célula aprovada e não-Folga/F/Venda na grade para o funcionário na data (Gestão de Escala).';
