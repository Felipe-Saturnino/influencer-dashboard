-- Dados de Cadastro — aba Formação e Competências (formação, idiomas, cursos, portfólio).

BEGIN;

-- ─── Catálogo de idiomas (seed fixo) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rh_idiomas (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome  text NOT NULL,
  ordem int  NOT NULL DEFAULT 0,
  CONSTRAINT rh_idiomas_nome_unique UNIQUE (nome)
);

COMMENT ON TABLE public.rh_idiomas IS 'Catálogo fechado de idiomas — Formação e Competências (Dados de Cadastro).';

INSERT INTO public.rh_idiomas (nome, ordem) VALUES
  ('Português', 1),
  ('Inglês', 2),
  ('Espanhol', 3),
  ('Francês', 4),
  ('Italiano', 5),
  ('Alemão', 6),
  ('Japonês', 7),
  ('Mandarim', 8),
  ('Árabe', 9),
  ('Libras', 10)
ON CONFLICT (nome) DO NOTHING;

ALTER TABLE public.rh_idiomas ENABLE ROW LEVEL SECURITY;

CREATE POLICY rh_idiomas_select_authenticated
  ON public.rh_idiomas FOR SELECT TO authenticated
  USING (true);

REVOKE ALL ON TABLE public.rh_idiomas FROM PUBLIC;
GRANT SELECT ON TABLE public.rh_idiomas TO authenticated;

-- ─── Tabelas por prestador ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rh_funcionario_formacao (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rh_funcionario_id uuid NOT NULL REFERENCES public.rh_funcionarios (id) ON DELETE CASCADE,
  curso             text NOT NULL,
  instituicao       text NOT NULL,
  grau              text NOT NULL,
  ano_conclusao     int  NULL,
  status            text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rh_funcionario_formacao_grau_check CHECK (
    grau IN (
      'ensino_medio', 'tecnico', 'tecnologo', 'graduacao', 'pos_graduacao',
      'mba', 'mestrado', 'doutorado'
    )
  ),
  CONSTRAINT rh_funcionario_formacao_status_check CHECK (
    status IN ('concluido', 'cursando', 'trancado')
  ),
  CONSTRAINT rh_funcionario_formacao_ano_check CHECK (
    ano_conclusao IS NULL OR (ano_conclusao >= 1950 AND ano_conclusao <= extract(year FROM now())::int + 10)
  )
);

CREATE INDEX IF NOT EXISTS idx_rh_func_formacao_func
  ON public.rh_funcionario_formacao (rh_funcionario_id, ano_conclusao DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.rh_funcionario_idioma (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rh_funcionario_id uuid NOT NULL REFERENCES public.rh_funcionarios (id) ON DELETE CASCADE,
  rh_idioma_id      uuid NOT NULL REFERENCES public.rh_idiomas (id),
  nivel             text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rh_funcionario_idioma_nivel_check CHECK (
    nivel IN ('basico', 'intermediario', 'avancado', 'fluente', 'nativo')
  ),
  CONSTRAINT rh_funcionario_idioma_unique UNIQUE (rh_funcionario_id, rh_idioma_id)
);

CREATE INDEX IF NOT EXISTS idx_rh_func_idioma_func
  ON public.rh_funcionario_idioma (rh_funcionario_id);

CREATE TABLE IF NOT EXISTS public.rh_funcionario_curso (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rh_funcionario_id   uuid NOT NULL REFERENCES public.rh_funcionarios (id) ON DELETE CASCADE,
  nome                text NOT NULL,
  instituicao         text NOT NULL,
  carga_horaria_horas int  NULL,
  ano                 int  NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rh_funcionario_curso_ano_check CHECK (
    ano IS NULL OR (ano >= 1950 AND ano <= extract(year FROM now())::int + 10)
  ),
  CONSTRAINT rh_funcionario_curso_carga_check CHECK (
    carga_horaria_horas IS NULL OR carga_horaria_horas >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_rh_func_curso_func
  ON public.rh_funcionario_curso (rh_funcionario_id, ano DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.rh_funcionario_portfolio (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rh_funcionario_id uuid NOT NULL REFERENCES public.rh_funcionarios (id) ON DELETE CASCADE,
  titulo            text NOT NULL,
  tipo              text NOT NULL,
  origem            text NOT NULL,
  url               text NULL,
  storage_path      text NULL,
  file_name         text NULL,
  mime_type         text NULL,
  tamanho_bytes     bigint NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rh_funcionario_portfolio_tipo_check CHECK (
    tipo IN ('video', 'imagem', 'texto', 'audio', 'codigo', 'outro')
  ),
  CONSTRAINT rh_funcionario_portfolio_origem_check CHECK (
    origem IN ('link', 'arquivo')
  ),
  CONSTRAINT rh_funcionario_portfolio_origem_payload_check CHECK (
    (origem = 'link' AND url IS NOT NULL AND trim(url) <> '' AND storage_path IS NULL)
    OR (origem = 'arquivo' AND storage_path IS NOT NULL AND trim(storage_path) <> '' AND file_name IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_rh_func_portfolio_func
  ON public.rh_funcionario_portfolio (rh_funcionario_id, created_at DESC);

-- ─── updated_at ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rh_formacao_competencias_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rh_funcionario_formacao_upd ON public.rh_funcionario_formacao;
CREATE TRIGGER trg_rh_funcionario_formacao_upd
  BEFORE UPDATE ON public.rh_funcionario_formacao
  FOR EACH ROW EXECUTE PROCEDURE public.rh_formacao_competencias_set_updated_at();

DROP TRIGGER IF EXISTS trg_rh_funcionario_idioma_upd ON public.rh_funcionario_idioma;
CREATE TRIGGER trg_rh_funcionario_idioma_upd
  BEFORE UPDATE ON public.rh_funcionario_idioma
  FOR EACH ROW EXECUTE PROCEDURE public.rh_formacao_competencias_set_updated_at();

DROP TRIGGER IF EXISTS trg_rh_funcionario_curso_upd ON public.rh_funcionario_curso;
CREATE TRIGGER trg_rh_funcionario_curso_upd
  BEFORE UPDATE ON public.rh_funcionario_curso
  FOR EACH ROW EXECUTE PROCEDURE public.rh_formacao_competencias_set_updated_at();

DROP TRIGGER IF EXISTS trg_rh_funcionario_portfolio_upd ON public.rh_funcionario_portfolio;
CREATE TRIGGER trg_rh_funcionario_portfolio_upd
  BEFORE UPDATE ON public.rh_funcionario_portfolio
  FOR EACH ROW EXECUTE PROCEDURE public.rh_formacao_competencias_set_updated_at();

-- ─── Helpers RLS ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._rh_formacao_funcionario_editavel(p_funcionario_id uuid)
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

REVOKE ALL ON FUNCTION public._rh_formacao_funcionario_editavel(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_formacao_funcionario_editavel(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public._rh_formacao_cadastro_pode_mutar(p_funcionario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    public._rh_dados_cadastro_perm('edit')
    AND public._rh_formacao_funcionario_editavel(p_funcionario_id)
    AND (
      (
        public._rh_dados_cadastro_perm_val('edit') = 'sim'
      )
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

REVOKE ALL ON FUNCTION public._rh_formacao_cadastro_pode_mutar(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_formacao_cadastro_pode_mutar(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public._rh_formacao_cadastro_pode_ver(p_funcionario_id uuid)
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

REVOKE ALL ON FUNCTION public._rh_formacao_cadastro_pode_ver(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_formacao_cadastro_pode_ver(uuid) TO authenticated;

-- ─── RLS tabelas ─────────────────────────────────────────────────────────────

ALTER TABLE public.rh_funcionario_formacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_funcionario_idioma ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_funcionario_curso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_funcionario_portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY rh_funcionario_formacao_select ON public.rh_funcionario_formacao
  FOR SELECT TO authenticated
  USING (public._rh_formacao_cadastro_pode_ver(rh_funcionario_id));

CREATE POLICY rh_funcionario_formacao_insert ON public.rh_funcionario_formacao
  FOR INSERT TO authenticated
  WITH CHECK (public._rh_formacao_cadastro_pode_mutar(rh_funcionario_id));

CREATE POLICY rh_funcionario_formacao_update ON public.rh_funcionario_formacao
  FOR UPDATE TO authenticated
  USING (public._rh_formacao_cadastro_pode_mutar(rh_funcionario_id))
  WITH CHECK (public._rh_formacao_cadastro_pode_mutar(rh_funcionario_id));

CREATE POLICY rh_funcionario_formacao_delete ON public.rh_funcionario_formacao
  FOR DELETE TO authenticated
  USING (public._rh_formacao_cadastro_pode_mutar(rh_funcionario_id));

CREATE POLICY rh_funcionario_idioma_select ON public.rh_funcionario_idioma
  FOR SELECT TO authenticated
  USING (public._rh_formacao_cadastro_pode_ver(rh_funcionario_id));

CREATE POLICY rh_funcionario_idioma_insert ON public.rh_funcionario_idioma
  FOR INSERT TO authenticated
  WITH CHECK (public._rh_formacao_cadastro_pode_mutar(rh_funcionario_id));

CREATE POLICY rh_funcionario_idioma_update ON public.rh_funcionario_idioma
  FOR UPDATE TO authenticated
  USING (public._rh_formacao_cadastro_pode_mutar(rh_funcionario_id))
  WITH CHECK (public._rh_formacao_cadastro_pode_mutar(rh_funcionario_id));

CREATE POLICY rh_funcionario_idioma_delete ON public.rh_funcionario_idioma
  FOR DELETE TO authenticated
  USING (public._rh_formacao_cadastro_pode_mutar(rh_funcionario_id));

CREATE POLICY rh_funcionario_curso_select ON public.rh_funcionario_curso
  FOR SELECT TO authenticated
  USING (public._rh_formacao_cadastro_pode_ver(rh_funcionario_id));

CREATE POLICY rh_funcionario_curso_insert ON public.rh_funcionario_curso
  FOR INSERT TO authenticated
  WITH CHECK (public._rh_formacao_cadastro_pode_mutar(rh_funcionario_id));

CREATE POLICY rh_funcionario_curso_update ON public.rh_funcionario_curso
  FOR UPDATE TO authenticated
  USING (public._rh_formacao_cadastro_pode_mutar(rh_funcionario_id))
  WITH CHECK (public._rh_formacao_cadastro_pode_mutar(rh_funcionario_id));

CREATE POLICY rh_funcionario_curso_delete ON public.rh_funcionario_curso
  FOR DELETE TO authenticated
  USING (public._rh_formacao_cadastro_pode_mutar(rh_funcionario_id));

CREATE POLICY rh_funcionario_portfolio_select ON public.rh_funcionario_portfolio
  FOR SELECT TO authenticated
  USING (public._rh_formacao_cadastro_pode_ver(rh_funcionario_id));

CREATE POLICY rh_funcionario_portfolio_insert ON public.rh_funcionario_portfolio
  FOR INSERT TO authenticated
  WITH CHECK (public._rh_formacao_cadastro_pode_mutar(rh_funcionario_id));

CREATE POLICY rh_funcionario_portfolio_update ON public.rh_funcionario_portfolio
  FOR UPDATE TO authenticated
  USING (public._rh_formacao_cadastro_pode_mutar(rh_funcionario_id))
  WITH CHECK (public._rh_formacao_cadastro_pode_mutar(rh_funcionario_id));

CREATE POLICY rh_funcionario_portfolio_delete ON public.rh_funcionario_portfolio
  FOR DELETE TO authenticated
  USING (public._rh_formacao_cadastro_pode_mutar(rh_funcionario_id));

REVOKE ALL ON TABLE public.rh_funcionario_formacao FROM PUBLIC;
REVOKE ALL ON TABLE public.rh_funcionario_idioma FROM PUBLIC;
REVOKE ALL ON TABLE public.rh_funcionario_curso FROM PUBLIC;
REVOKE ALL ON TABLE public.rh_funcionario_portfolio FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rh_funcionario_formacao TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rh_funcionario_idioma TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rh_funcionario_curso TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rh_funcionario_portfolio TO authenticated;

-- ─── Histórico RH — insert via Dados de Cadastro ─────────────────────────────

DROP POLICY IF EXISTS rh_funcionario_historico_insert_dados_cadastro_formacao ON public.rh_funcionario_historico;
CREATE POLICY rh_funcionario_historico_insert_dados_cadastro_formacao
  ON public.rh_funcionario_historico FOR INSERT TO authenticated
  WITH CHECK (
    tipo = 'formacao_competencias'
    AND public._rh_formacao_cadastro_pode_mutar(rh_funcionario_id)
  );

-- Portfólio arquivo: subpasta portfolio/ no bucket existente (mesmas policies por funcionário)

COMMENT ON TABLE public.rh_funcionario_formacao IS 'Formação acadêmica — Dados de Cadastro / Formação e Competências.';
COMMENT ON TABLE public.rh_funcionario_idioma IS 'Idiomas e nível — Dados de Cadastro / Formação e Competências.';
COMMENT ON TABLE public.rh_funcionario_curso IS 'Cursos e certificações — Dados de Cadastro / Formação e Competências.';
COMMENT ON TABLE public.rh_funcionario_portfolio IS 'Portfólio (link ou arquivo no bucket rh-prestador-self-media) — Formação e Competências.';

COMMIT;
