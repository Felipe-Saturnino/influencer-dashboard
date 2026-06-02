-- Dados de Cadastro — aba Experiência Profissional (empregos anteriores).

BEGIN;

CREATE TABLE IF NOT EXISTS public.rh_funcionario_experiencia (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rh_funcionario_id uuid NOT NULL REFERENCES public.rh_funcionarios (id) ON DELETE CASCADE,
  cargo             text NOT NULL,
  empresa           text NOT NULL,
  mes_ano_inicio    date NOT NULL,
  mes_ano_fim       date NULL,
  descricao         text NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rh_funcionario_experiencia_fim_check CHECK (
    mes_ano_fim IS NULL OR mes_ano_fim >= mes_ano_inicio
  ),
  CONSTRAINT rh_funcionario_experiencia_descricao_len CHECK (
    descricao IS NULL OR char_length(descricao) <= 500
  )
);

CREATE INDEX IF NOT EXISTS idx_rh_func_experiencia_func
  ON public.rh_funcionario_experiencia (
    rh_funcionario_id,
    mes_ano_fim DESC NULLS FIRST,
    mes_ano_inicio DESC
  );

DROP TRIGGER IF EXISTS trg_rh_funcionario_experiencia_upd ON public.rh_funcionario_experiencia;
CREATE TRIGGER trg_rh_funcionario_experiencia_upd
  BEFORE UPDATE ON public.rh_funcionario_experiencia
  FOR EACH ROW EXECUTE PROCEDURE public.rh_formacao_competencias_set_updated_at();

-- ─── Helpers RLS ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._rh_experiencia_funcionario_editavel(p_funcionario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rh_funcionarios f
    WHERE f.id = p_funcionario_id
      AND f.status IS DISTINCT FROM 'encerrado'
  );
$$;

REVOKE ALL ON FUNCTION public._rh_experiencia_funcionario_editavel(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_experiencia_funcionario_editavel(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public._rh_experiencia_cadastro_pode_mutar(p_funcionario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    public._rh_dados_cadastro_perm('edit')
    AND public._rh_experiencia_funcionario_editavel(p_funcionario_id)
    AND (
      public._rh_dados_cadastro_perm_val('edit') = 'sim'
      OR (
        public._rh_dados_cadastro_perm_val('edit') = 'proprios'
        AND EXISTS (
          SELECT 1
          FROM public.rh_funcionarios f
          WHERE f.id = p_funcionario_id
            AND public._rh_funcionario_eh_self_cadastro(f.email, f.email_spin)
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._rh_experiencia_cadastro_pode_mutar(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_experiencia_cadastro_pode_mutar(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public._rh_experiencia_cadastro_pode_ver(p_funcionario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    public._rh_dados_cadastro_perm('view')
    AND (
      public._rh_dados_cadastro_perm_val('view') = 'sim'
      OR EXISTS (
        SELECT 1
        FROM public.rh_funcionarios f
        WHERE f.id = p_funcionario_id
          AND public._rh_funcionario_eh_self_cadastro(f.email, f.email_spin)
      )
    );
$$;

REVOKE ALL ON FUNCTION public._rh_experiencia_cadastro_pode_ver(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_experiencia_cadastro_pode_ver(uuid) TO authenticated;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.rh_funcionario_experiencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY rh_funcionario_experiencia_select ON public.rh_funcionario_experiencia
  FOR SELECT TO authenticated
  USING (public._rh_experiencia_cadastro_pode_ver(rh_funcionario_id));

CREATE POLICY rh_funcionario_experiencia_insert ON public.rh_funcionario_experiencia
  FOR INSERT TO authenticated
  WITH CHECK (public._rh_experiencia_cadastro_pode_mutar(rh_funcionario_id));

CREATE POLICY rh_funcionario_experiencia_update ON public.rh_funcionario_experiencia
  FOR UPDATE TO authenticated
  USING (public._rh_experiencia_cadastro_pode_mutar(rh_funcionario_id))
  WITH CHECK (public._rh_experiencia_cadastro_pode_mutar(rh_funcionario_id));

CREATE POLICY rh_funcionario_experiencia_delete ON public.rh_funcionario_experiencia
  FOR DELETE TO authenticated
  USING (public._rh_experiencia_cadastro_pode_mutar(rh_funcionario_id));

REVOKE ALL ON TABLE public.rh_funcionario_experiencia FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rh_funcionario_experiencia TO authenticated;

-- ─── Histórico RH ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS rh_funcionario_historico_insert_dados_cadastro_experiencia ON public.rh_funcionario_historico;
CREATE POLICY rh_funcionario_historico_insert_dados_cadastro_experiencia
  ON public.rh_funcionario_historico FOR INSERT TO authenticated
  WITH CHECK (
    tipo = 'experiencia_profissional'
    AND public._rh_experiencia_cadastro_pode_mutar(rh_funcionario_id)
  );

COMMENT ON TABLE public.rh_funcionario_experiencia IS
  'Experiências profissionais anteriores — Dados de Cadastro / Experiência Profissional.';

COMMIT;
