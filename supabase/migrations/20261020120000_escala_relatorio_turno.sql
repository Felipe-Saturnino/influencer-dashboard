-- Escala — Relatório de Turno (page_key escala_relatorio_turno).
-- Relatórios de turno (SL) e de estúdio (SM) + seed permissões Não (exceto admin).

BEGIN;

-- ─── Helper de permissão ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._escala_relatorio_turno_perm(p_need text)
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
      OR public._gestor_page_perm('escala_relatorio_turno', p_need)
      OR public._prestador_page_perm('escala_relatorio_turno', p_need)
      OR public._staff_spin_page_perm('escala_relatorio_turno', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'escala_relatorio_turno'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._escala_relatorio_turno_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._escala_relatorio_turno_perm(text) TO authenticated;

COMMENT ON FUNCTION public._escala_relatorio_turno_perm(text) IS
  'Permissão Escala → Relatório de Turno (view|create|edit|delete).';

-- ─── Tabelas: Relatório do Turno ─────────────────────────────────────────────

CREATE TABLE public.escala_relatorio_turno (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data            date NOT NULL,
  turno           text NOT NULL CHECK (turno IN ('manha', 'tarde', 'noite')),
  relator_user_id uuid NOT NULL REFERENCES auth.users (id),
  relator_nome    text NOT NULL,
  geral           text NOT NULL,
  publicado_em    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX escala_relatorio_turno_data_idx ON public.escala_relatorio_turno (data DESC);
CREATE INDEX escala_relatorio_turno_relator_idx ON public.escala_relatorio_turno (relator_user_id);

COMMENT ON TABLE public.escala_relatorio_turno IS
  'Relatório do Turno (passagem SL): cabeçalho + campo Geral.';

CREATE TABLE public.escala_relatorio_turno_estudio (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relatorio_id    uuid NOT NULL REFERENCES public.escala_relatorio_turno (id) ON DELETE CASCADE,
  estudio_slug    text NOT NULL,
  estudio_nome    text NOT NULL,
  gp_escalados    int NOT NULL CHECK (gp_escalados >= 0),
  absenteismo     int NOT NULL CHECK (absenteismo >= 0),
  resumo          text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX escala_relatorio_turno_estudio_rel_idx
  ON public.escala_relatorio_turno_estudio (relatorio_id);

COMMENT ON TABLE public.escala_relatorio_turno_estudio IS
  'Bloco por estúdio ativo no Relatório do Turno.';

CREATE TABLE public.escala_relatorio_turno_shuffler (
  relatorio_id         uuid PRIMARY KEY REFERENCES public.escala_relatorio_turno (id) ON DELETE CASCADE,
  shuffler_escalados   int NOT NULL CHECK (shuffler_escalados >= 0),
  absenteismo          int NOT NULL CHECK (absenteismo >= 0),
  resumo               text NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.escala_relatorio_turno_shuffler IS
  'Bloco Shufflers do Relatório do Turno (1:1).';

-- ─── Tabelas: Relatório de Estúdio ───────────────────────────────────────────

CREATE TABLE public.escala_relatorio_estudio (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data            date NOT NULL,
  turno           text NOT NULL CHECK (turno IN ('manha', 'noite')),
  relator_user_id uuid NOT NULL REFERENCES auth.users (id),
  relator_nome    text NOT NULL,
  sos             text NOT NULL,
  sinais          text NOT NULL,
  resumo          text NOT NULL,
  manutencao      jsonb NOT NULL DEFAULT '{}'::jsonb,
  publicado_em    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX escala_relatorio_estudio_data_idx ON public.escala_relatorio_estudio (data DESC);

COMMENT ON TABLE public.escala_relatorio_estudio IS
  'Relatório de Estúdio (SOS, sinais, checklist de manutenção).';

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.escala_relatorio_turno ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_relatorio_turno_estudio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_relatorio_turno_shuffler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_relatorio_estudio ENABLE ROW LEVEL SECURITY;

CREATE POLICY escala_relatorio_turno_select ON public.escala_relatorio_turno
  FOR SELECT TO authenticated
  USING (public._escala_relatorio_turno_perm('view'));

CREATE POLICY escala_relatorio_turno_insert ON public.escala_relatorio_turno
  FOR INSERT TO authenticated
  WITH CHECK (
    public._escala_relatorio_turno_perm('create')
    AND relator_user_id = auth.uid()
  );

CREATE POLICY escala_relatorio_turno_update ON public.escala_relatorio_turno
  FOR UPDATE TO authenticated
  USING (public._escala_relatorio_turno_perm('edit'))
  WITH CHECK (public._escala_relatorio_turno_perm('edit'));

CREATE POLICY escala_relatorio_turno_delete ON public.escala_relatorio_turno
  FOR DELETE TO authenticated
  USING (public._escala_relatorio_turno_perm('delete'));

CREATE POLICY escala_relatorio_turno_estudio_select ON public.escala_relatorio_turno_estudio
  FOR SELECT TO authenticated
  USING (public._escala_relatorio_turno_perm('view'));

CREATE POLICY escala_relatorio_turno_estudio_insert ON public.escala_relatorio_turno_estudio
  FOR INSERT TO authenticated
  WITH CHECK (
    public._escala_relatorio_turno_perm('create')
    AND EXISTS (
      SELECT 1 FROM public.escala_relatorio_turno r
      WHERE r.id = relatorio_id AND r.relator_user_id = auth.uid()
    )
  );

CREATE POLICY escala_relatorio_turno_estudio_all_admin ON public.escala_relatorio_turno_estudio
  FOR ALL TO authenticated
  USING (public._escala_relatorio_turno_perm('edit'))
  WITH CHECK (public._escala_relatorio_turno_perm('edit'));

CREATE POLICY escala_relatorio_turno_shuffler_select ON public.escala_relatorio_turno_shuffler
  FOR SELECT TO authenticated
  USING (public._escala_relatorio_turno_perm('view'));

CREATE POLICY escala_relatorio_turno_shuffler_insert ON public.escala_relatorio_turno_shuffler
  FOR INSERT TO authenticated
  WITH CHECK (
    public._escala_relatorio_turno_perm('create')
    AND EXISTS (
      SELECT 1 FROM public.escala_relatorio_turno r
      WHERE r.id = relatorio_id AND r.relator_user_id = auth.uid()
    )
  );

CREATE POLICY escala_relatorio_turno_shuffler_all_edit ON public.escala_relatorio_turno_shuffler
  FOR ALL TO authenticated
  USING (public._escala_relatorio_turno_perm('edit'))
  WITH CHECK (public._escala_relatorio_turno_perm('edit'));

CREATE POLICY escala_relatorio_estudio_select ON public.escala_relatorio_estudio
  FOR SELECT TO authenticated
  USING (public._escala_relatorio_turno_perm('view'));

CREATE POLICY escala_relatorio_estudio_insert ON public.escala_relatorio_estudio
  FOR INSERT TO authenticated
  WITH CHECK (
    public._escala_relatorio_turno_perm('create')
    AND relator_user_id = auth.uid()
  );

CREATE POLICY escala_relatorio_estudio_update ON public.escala_relatorio_estudio
  FOR UPDATE TO authenticated
  USING (public._escala_relatorio_turno_perm('edit'))
  WITH CHECK (public._escala_relatorio_turno_perm('edit'));

CREATE POLICY escala_relatorio_estudio_delete ON public.escala_relatorio_estudio
  FOR DELETE TO authenticated
  USING (public._escala_relatorio_turno_perm('delete'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.escala_relatorio_turno TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.escala_relatorio_turno_estudio TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.escala_relatorio_turno_shuffler TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.escala_relatorio_estudio TO authenticated;

-- ─── Opções de manutenção (estúdios + roletas) ───────────────────────────────

CREATE OR REPLACE FUNCTION public.escala_relatorio_turno_opcoes_manutencao()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estudios jsonb;
  v_roletas jsonb;
BEGIN
  IF NOT public._escala_relatorio_turno_perm('view')
     AND NOT public._escala_relatorio_turno_perm('create') THEN
    RAISE EXCEPTION 'sem permissão';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('slug', e.slug, 'nome', e.nome) ORDER BY e.nome
  ), '[]'::jsonb)
  INTO v_estudios
  FROM public.estudios_spin e
  WHERE e.ativo IS TRUE;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'key', m.id::text,
      'label', COALESCE(es.nome, m.estudio_slug) || ' - Roleta ' || COALESCE(NULLIF(trim(m.numero_mesa), ''), '?')
    )
    ORDER BY COALESCE(es.nome, m.estudio_slug), m.numero_mesa
  ), '[]'::jsonb)
  INTO v_roletas
  FROM public.mesas_spin_cadastro m
  LEFT JOIN public.estudios_spin es ON es.slug = m.estudio_slug
  WHERE trim(COALESCE(m.tipo_jogo, '')) = 'Roleta'
    AND (es.ativo IS TRUE OR es.id IS NULL);

  RETURN jsonb_build_object('estudios', v_estudios, 'roletas', v_roletas);
END;
$$;

REVOKE ALL ON FUNCTION public.escala_relatorio_turno_opcoes_manutencao() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_relatorio_turno_opcoes_manutencao() TO authenticated;

-- ─── Leitura de estúdios ativos para esta página ─────────────────────────────

CREATE OR REPLACE FUNCTION public._estudios_spin_leitura_perm(p_need text DEFAULT 'view')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      public._mesas_spin_cadastro_perm(p_need)
      OR public._rh_staff_perm(p_need)
      OR public._gestor_page_perm('rh_gestao_escala', p_need)
      OR public._prestador_page_perm('rh_gestao_escala', p_need)
      OR public._staff_spin_page_perm('rh_gestao_escala', p_need)
      OR public._executivo_role_permissions_can_view('rh_gestao_escala')
      OR public._gestor_page_perm('gestao_dealers', p_need)
      OR public._prestador_page_perm('gestao_dealers', p_need)
      OR public._staff_spin_page_perm('gestao_dealers', p_need)
      OR public._executivo_role_permissions_can_view('gestao_dealers')
      OR public._gestor_page_perm('rh_figurinos', p_need)
      OR public._prestador_page_perm('rh_figurinos', p_need)
      OR public._staff_spin_page_perm('rh_figurinos', p_need)
      OR public._executivo_role_permissions_can_view('rh_figurinos')
      OR public._gestor_page_perm('roteiro_mesa', p_need)
      OR public._prestador_page_perm('roteiro_mesa', p_need)
      OR public._staff_spin_page_perm('roteiro_mesa', p_need)
      OR public._executivo_role_permissions_can_view('roteiro_mesa')
      OR public._gestor_page_perm('central_notificacoes', p_need)
      OR public._prestador_page_perm('central_notificacoes', p_need)
      OR public._staff_spin_page_perm('central_notificacoes', p_need)
      OR public._executivo_role_permissions_can_view('central_notificacoes')
      OR public._tech_ops_estoque_perm(p_need)
      OR public._academy_performance_hub_perm(p_need)
      OR public._tech_ops_ordem_saida_perm(p_need)
      OR public._escala_relatorio_turno_perm(p_need)
    );
$$;

COMMENT ON FUNCTION public._estudios_spin_leitura_perm(text) IS
  'SELECT em estudios_spin: Gestão de Mesas ou páginas operacionais (incl. Relatório de Turno).';

-- ─── Seed de permissões ──────────────────────────────────────────────────────

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT DISTINCT rp.role, 'escala_relatorio_turno', 'nao', 'nao', 'nao', NULL
FROM public.role_permissions rp
WHERE rp.role::text <> 'admin'
ON CONFLICT (role, page_key) DO NOTHING;

COMMIT;
