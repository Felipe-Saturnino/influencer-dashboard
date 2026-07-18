-- Tech Ops — Ordem de Saída: matriz específica de Criar / Editar e escopo Próprios.

BEGIN;

ALTER TABLE public.tech_ops_ordem_saida
  ALTER COLUMN solicitante_user_id SET DEFAULT auth.uid();

CREATE OR REPLACE FUNCTION public._tech_ops_ordem_saida_acao_valor(p_need text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valor text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 'nao';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN
    RETURN 'sim';
  END IF;
  IF NOT public._tech_ops_ordem_saida_perm(p_need) THEN
    RETURN 'nao';
  END IF;

  SELECT CASE p_need
    WHEN 'create' THEN rp.can_criar::text
    WHEN 'edit' THEN rp.can_editar::text
    ELSE 'nao'
  END
  INTO v_valor
  FROM public.profiles p
  INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
  WHERE p.id = auth.uid()
    AND rp.page_key = 'tech_ops_ordem_saida'
  LIMIT 1;

  RETURN COALESCE(v_valor, 'nao');
END;
$$;

REVOKE ALL ON FUNCTION public._tech_ops_ordem_saida_acao_valor(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._tech_ops_ordem_saida_acao_valor(text) TO authenticated;

CREATE OR REPLACE FUNCTION public._tech_ops_ordem_saida_propria(p_ordem_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tech_ops_ordem_saida os
    LEFT JOIN public.profiles p ON p.id = auth.uid()
    WHERE os.id = p_ordem_id
      AND (
        os.solicitante_user_id = auth.uid()
        OR (
          NULLIF(BTRIM(COALESCE(p.name, '')), '') IS NOT NULL
          AND (
            LOWER(BTRIM(os.solicitante_nome)) = LOWER(BTRIM(p.name))
            OR LOWER(BTRIM(os.responsavel_nome)) = LOWER(BTRIM(p.name))
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public._tech_ops_ordem_saida_propria(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._tech_ops_ordem_saida_propria(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public._tech_ops_ordem_saida_pode_nova()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public._tech_ops_ordem_saida_acao_valor('create') IN ('sim', 'proprios')
    OR public._tech_ops_ordem_saida_acao_valor('edit') IN ('sim', 'proprios');
$$;

CREATE OR REPLACE FUNCTION public._tech_ops_ordem_saida_pode_atualizar(p_ordem_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public._tech_ops_ordem_saida_acao_valor('edit') IN ('sim', 'proprios')
    OR public._tech_ops_ordem_saida_acao_valor('create') = 'sim'
    OR (
      public._tech_ops_ordem_saida_acao_valor('create') = 'proprios'
      AND public._tech_ops_ordem_saida_propria(p_ordem_id)
    );
$$;

REVOKE ALL ON FUNCTION public._tech_ops_ordem_saida_pode_nova() FROM PUBLIC;
REVOKE ALL ON FUNCTION public._tech_ops_ordem_saida_pode_atualizar(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._tech_ops_ordem_saida_pode_nova() TO authenticated;
GRANT EXECUTE ON FUNCTION public._tech_ops_ordem_saida_pode_atualizar(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.tech_ops_ordem_saida_proximo_codigo(
  p_tipo text,
  p_competencia date DEFAULT NULL
)
RETURNS TABLE (codigo_num int, competencia date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comp date;
  v_num int;
BEGIN
  IF p_tipo NOT IN ('interna', 'externa', 'manutencao') THEN
    RAISE EXCEPTION 'tipo inválido';
  END IF;
  IF NOT public._tech_ops_ordem_saida_pode_nova() THEN
    RAISE EXCEPTION 'sem permissão';
  END IF;

  v_comp := date_trunc('month', COALESCE(p_competencia, CURRENT_DATE))::date;
  INSERT INTO public.tech_ops_ordem_saida_codigo_counters (tipo, competencia, ultimo_num)
  VALUES (p_tipo, v_comp, 1)
  ON CONFLICT (tipo, competencia) DO UPDATE
    SET ultimo_num = public.tech_ops_ordem_saida_codigo_counters.ultimo_num + 1
  RETURNING public.tech_ops_ordem_saida_codigo_counters.ultimo_num INTO v_num;

  codigo_num := v_num;
  competencia := v_comp;
  RETURN NEXT;
END;
$$;

DROP POLICY IF EXISTS tech_ops_os_insert ON public.tech_ops_ordem_saida;
DROP POLICY IF EXISTS tech_ops_os_update ON public.tech_ops_ordem_saida;
CREATE POLICY tech_ops_os_insert
  ON public.tech_ops_ordem_saida FOR INSERT TO authenticated
  WITH CHECK (
    public._tech_ops_ordem_saida_pode_nova()
    AND solicitante_user_id = auth.uid()
  );
CREATE POLICY tech_ops_os_update
  ON public.tech_ops_ordem_saida FOR UPDATE TO authenticated
  USING (public._tech_ops_ordem_saida_pode_atualizar(id))
  WITH CHECK (public._tech_ops_ordem_saida_pode_atualizar(id));

DROP POLICY IF EXISTS tech_ops_os_itens_insert ON public.tech_ops_ordem_saida_itens;
DROP POLICY IF EXISTS tech_ops_os_itens_update ON public.tech_ops_ordem_saida_itens;
DROP POLICY IF EXISTS tech_ops_os_itens_delete ON public.tech_ops_ordem_saida_itens;
CREATE POLICY tech_ops_os_itens_insert
  ON public.tech_ops_ordem_saida_itens FOR INSERT TO authenticated
  WITH CHECK (public._tech_ops_ordem_saida_pode_atualizar(ordem_id));
CREATE POLICY tech_ops_os_itens_update
  ON public.tech_ops_ordem_saida_itens FOR UPDATE TO authenticated
  USING (public._tech_ops_ordem_saida_pode_atualizar(ordem_id))
  WITH CHECK (public._tech_ops_ordem_saida_pode_atualizar(ordem_id));
CREATE POLICY tech_ops_os_itens_delete
  ON public.tech_ops_ordem_saida_itens FOR DELETE TO authenticated
  USING (public._tech_ops_ordem_saida_pode_atualizar(ordem_id));

DROP POLICY IF EXISTS tech_ops_os_anot_insert ON public.tech_ops_ordem_saida_anotacoes;
CREATE POLICY tech_ops_os_anot_insert
  ON public.tech_ops_ordem_saida_anotacoes FOR INSERT TO authenticated
  WITH CHECK (public._tech_ops_ordem_saida_pode_atualizar(ordem_id));

COMMIT;
