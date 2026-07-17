-- Otimização de performance do escopo do Calendário (rh_calendario).
--
-- Problema: rh_calendario_funcionarios_gerenciaveis avaliava
-- _rh_calendario_funcionario_gerenciavel por funcionário visível, e cada
-- chamada recalculava a cascata completa do Organograma (custo quadrático).
-- Com dezenas/centenas de funcionários isso adicionava segundos ao
-- carregamento dos filtros de Time e Staff.
--
-- Correção: materializar os conjuntos de escopo (Ver e Editar) UMA vez por
-- chamada e resolver por JOIN. O mesmo ajuste se aplica a
-- rh_calendario_reunioes_mes, que avaliava _rh_calendario_funcionario_no_escopo
-- por linha de agendamento.
--
-- O Organograma continua "vivo": o escopo segue lido das tabelas rh_org_* /
-- rh_funcionarios em cada RPC — a otimização não introduz snapshot nem cache.

-- Conjunto de funcionários sobre os quais o usuário pode agir (aprovar/corrigir).
-- Uma única passada: interseção dos escopos de Ver e Editar.
CREATE OR REPLACE FUNCTION public.rh_calendario_funcionarios_gerenciaveis()
RETURNS TABLE (funcionario_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
  perm_edit AS (
    SELECT public._rh_calendario_permissao_valor('edit') AS valor
  ),
  me AS (
    SELECT public._rh_funcionario_login_id() AS id
  )
  SELECT v.funcionario_id
  FROM public._rh_calendario_funcionarios_escopo_por_permissao('view') v
  INNER JOIN public._rh_calendario_funcionarios_escopo_por_permissao('edit') e
    ON e.funcionario_id = v.funcionario_id
  CROSS JOIN perm_edit
  CROSS JOIN me
  WHERE perm_edit.valor = 'sim'
     OR (perm_edit.valor = 'proprios' AND v.funcionario_id IS DISTINCT FROM me.id)
$$;

-- Checagem unitária delega ao conjunto acima (uma materialização por chamada).
CREATE OR REPLACE FUNCTION public._rh_calendario_funcionario_gerenciavel(p_funcionario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rh_calendario_funcionarios_gerenciaveis() g
    WHERE g.funcionario_id = p_funcionario_id
  )
$$;

-- Reuniões do mês: escopo resolvido por JOIN (esc.funcionario_id IS NOT NULL)
-- em vez de _rh_calendario_funcionario_no_escopo por linha.
CREATE OR REPLACE FUNCTION public.rh_calendario_reunioes_mes(p_ref_mes date)
RETURNS TABLE (
  id uuid,
  solicitante_funcionario_id uuid,
  solicitante_nome text,
  dia_iso date,
  reuniao_com text,
  reuniao_com_label text,
  motivo text,
  turno text,
  status text,
  created_at timestamptz,
  solicitacao_status text,
  observacao_rh text,
  atendente_nome text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_perm text := public._rh_calendario_permissao_valor('view');
  v_me uuid := public._rh_funcionario_login_id();
  v_admin boolean := false;
BEGIN
  IF auth.uid() IS NULL OR v_perm NOT IN ('sim', 'proprios') THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  INTO v_admin;

  RETURN QUERY
  SELECT
    a.id,
    a.solicitante_funcionario_id,
    trim(coalesce(f.nome, ''))::text AS solicitante_nome,
    left(trim(a.payload->>'dia_iso'), 10)::date AS dia_iso,
    trim(coalesce(a.payload->>'reuniao_com', ''))::text AS reuniao_com,
    trim(coalesce(a.payload->>'reuniao_com_label', ''))::text AS reuniao_com_label,
    trim(coalesce(a.payload->>'motivo', ''))::text AS motivo,
    trim(coalesce(a.payload->>'turno', ''))::text AS turno,
    a.status,
    a.created_at,
    s.status::text AS solicitacao_status,
    trim(coalesce(s.observacao_rh, ''))::text AS observacao_rh,
    trim(coalesce(pa.name, ''))::text AS atendente_nome
  FROM public.rh_calendario_acoes a
  LEFT JOIN public.rh_funcionarios f
    ON f.id = a.solicitante_funcionario_id
    AND f.status IN ('ativo', 'indisponivel')
  LEFT JOIN public.rh_solicitacoes s
    ON s.rh_calendario_acao_id = a.id
    AND s.tipo = 'reuniao_rh'
  LEFT JOIN public.profiles pa ON pa.id = s.atendido_por
  LEFT JOIN public._rh_calendario_funcionarios_escopo() esc
    ON esc.funcionario_id = a.solicitante_funcionario_id
  WHERE a.tipo_acao = 'agendamento_reuniao'
    AND coalesce(trim(a.payload->>'dia_iso'), '') <> ''
    AND length(trim(a.payload->>'dia_iso')) >= 10
    AND date_trunc('month', left(trim(a.payload->>'dia_iso'), 10)::date) = v_ref
    AND (
      (
        trim(coalesce(a.payload->>'reuniao_com', '')) = 'rh'
        AND s.id IS NOT NULL
        AND (
          a.solicitante_funcionario_id = v_me
          OR v_admin
          OR v_perm = 'sim'
          OR (
            s.status IN ('aprovado', 'rejeitado')
            AND auth.uid() = s.atendido_por
          )
        )
      )
      OR (
        trim(coalesce(a.payload->>'reuniao_com', '')) <> 'rh'
        AND a.status = 'Agendado'
        AND (
          esc.funcionario_id IS NOT NULL
          OR (
            trim(coalesce(a.payload->>'reuniao_com', '')) = 'shift_lead'
            AND EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid() AND p.role = 'shift_leader'
            )
          )
          OR (
            trim(coalesce(a.payload->>'reuniao_com', '')) = 'figurino'
            AND EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid() AND p.role = 'figurino'
            )
          )
          OR (
            trim(coalesce(a.payload->>'reuniao_com', '')) = 'gerente_operacoes'
            AND EXISTS (
              SELECT 1
              FROM public.user_scopes sc
              WHERE sc.user_id = auth.uid()
                AND sc.scope_type = 'gestor_tipo'
                AND sc.scope_ref = 'operacoes'
            )
          )
        )
      )
      OR (
        trim(coalesce(a.payload->>'reuniao_com', '')) = 'rh'
        AND s.id IS NULL
        AND a.status = 'Agendado'
        AND (
          a.solicitante_funcionario_id = v_me
          OR v_admin
          OR v_perm = 'sim'
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'rh'
          )
        )
      )
    )
  ORDER BY a.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_calendario_funcionarios_gerenciaveis() FROM PUBLIC;
REVOKE ALL ON FUNCTION public._rh_calendario_funcionario_gerenciavel(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_calendario_reunioes_mes(date) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rh_calendario_funcionarios_gerenciaveis() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rh_calendario_reunioes_mes(date) TO authenticated;

COMMENT ON FUNCTION public.rh_calendario_funcionarios_gerenciaveis() IS
  'Funcionários sobre os quais o usuário logado pode agir no Calendário (aprovar/corrigir presença). Interseção dos escopos Ver e Editar materializada uma única vez por chamada.';
