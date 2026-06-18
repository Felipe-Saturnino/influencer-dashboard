-- Estúdios Spin: cadastro N:N com operadoras; mesas vinculadas por estúdio.
-- Legado: mesas_spin_cadastro.operadora_slug e mesa_identificacao_operadora permanecem até migração futura.

BEGIN;

CREATE TABLE public.estudios_spin (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text        NOT NULL UNIQUE,
  nome        text        NOT NULL,
  tipo        text        NOT NULL,
  ativo       boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT estudios_spin_nome_trim CHECK (btrim(nome) <> ''),
  CONSTRAINT estudios_spin_slug_trim CHECK (btrim(slug) <> ''),
  CONSTRAINT estudios_spin_tipo_check CHECK (tipo IN ('network', 'dedicado'))
);

COMMENT ON TABLE public.estudios_spin IS
  'Estúdios físicos Spin (dedicado ou network) — hub Gestão de Estúdios; N operadoras por estúdio.';
COMMENT ON COLUMN public.estudios_spin.tipo IS 'network | dedicado';

CREATE INDEX idx_estudios_spin_tipo ON public.estudios_spin (tipo);
CREATE INDEX idx_estudios_spin_ativo ON public.estudios_spin (ativo) WHERE ativo = true;

CREATE TABLE public.estudios_spin_operadoras (
  estudio_slug   text NOT NULL REFERENCES public.estudios_spin (slug) ON UPDATE CASCADE ON DELETE CASCADE,
  operadora_slug text NOT NULL REFERENCES public.operadoras (slug) ON UPDATE CASCADE ON DELETE RESTRICT,
  PRIMARY KEY (estudio_slug, operadora_slug)
);

CREATE INDEX idx_estudios_spin_op_operadora ON public.estudios_spin_operadoras (operadora_slug);

ALTER TABLE public.mesas_spin_cadastro
  ADD COLUMN IF NOT EXISTS estudio_slug text REFERENCES public.estudios_spin (slug) ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mesas_spin_cadastro_estudio ON public.mesas_spin_cadastro (estudio_slug);

CREATE TABLE public.mesas_spin_operadora_identificacao (
  mesa_id                       uuid NOT NULL REFERENCES public.mesas_spin_cadastro (id) ON DELETE CASCADE,
  operadora_slug                text NOT NULL REFERENCES public.operadoras (slug) ON UPDATE CASCADE ON DELETE RESTRICT,
  mesa_identificacao_operadora  text,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (mesa_id, operadora_slug),
  CONSTRAINT mesas_spin_op_ident_trim CHECK (
    mesa_identificacao_operadora IS NULL OR btrim(mesa_identificacao_operadora) <> ''
  )
);

CREATE INDEX idx_mesas_spin_op_ident_slug ON public.mesas_spin_operadora_identificacao (operadora_slug);

CREATE OR REPLACE FUNCTION public.estudios_spin_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_estudios_spin_upd ON public.estudios_spin;
CREATE TRIGGER trg_estudios_spin_upd
  BEFORE UPDATE ON public.estudios_spin
  FOR EACH ROW EXECUTE PROCEDURE public.estudios_spin_touch_updated_at();

CREATE OR REPLACE FUNCTION public.mesas_spin_op_ident_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mesas_spin_op_ident_upd ON public.mesas_spin_operadora_identificacao;
CREATE TRIGGER trg_mesas_spin_op_ident_upd
  BEFORE UPDATE ON public.mesas_spin_operadora_identificacao
  FOR EACH ROW EXECUTE PROCEDURE public.mesas_spin_op_ident_touch_updated_at();

CREATE OR REPLACE FUNCTION public._estudios_spin_scope_estudio(p_estudio_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'gestor'))
      OR (
        EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role IN ('executivo', 'operador'))
        AND EXISTS (
          SELECT 1
          FROM public.estudios_spin_operadoras j
          INNER JOIN public.user_scopes s
            ON s.user_id = auth.uid()
           AND s.scope_type = 'operadora'
           AND s.scope_ref = j.operadora_slug
          WHERE j.estudio_slug = p_estudio_slug
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._estudios_spin_scope_estudio(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._estudios_spin_scope_estudio(text) TO authenticated;

ALTER TABLE public.estudios_spin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estudios_spin_operadoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesas_spin_operadora_identificacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY estudios_spin_select
  ON public.estudios_spin FOR SELECT TO authenticated
  USING (
    public._estudios_spin_scope_estudio(slug)
    AND public._mesas_spin_cadastro_perm('view')
  );

CREATE POLICY estudios_spin_insert
  ON public.estudios_spin FOR INSERT TO authenticated
  WITH CHECK (public._mesas_spin_cadastro_perm('create'));

CREATE POLICY estudios_spin_update
  ON public.estudios_spin FOR UPDATE TO authenticated
  USING (
    public._estudios_spin_scope_estudio(slug)
    AND public._mesas_spin_cadastro_perm('edit')
  )
  WITH CHECK (public._mesas_spin_cadastro_perm('edit'));

CREATE POLICY estudios_spin_delete
  ON public.estudios_spin FOR DELETE TO authenticated
  USING (
    public._estudios_spin_scope_estudio(slug)
    AND public._mesas_spin_cadastro_perm('delete')
  );

CREATE POLICY estudios_spin_operadoras_select
  ON public.estudios_spin_operadoras FOR SELECT TO authenticated
  USING (
    public._estudios_spin_scope_estudio(estudio_slug)
    AND public._mesas_spin_cadastro_perm('view')
  );

CREATE POLICY estudios_spin_operadoras_insert
  ON public.estudios_spin_operadoras FOR INSERT TO authenticated
  WITH CHECK (
    public._mesas_spin_cadastro_scope_slug(operadora_slug)
    AND public._mesas_spin_cadastro_perm('create')
  );

CREATE POLICY estudios_spin_operadoras_update
  ON public.estudios_spin_operadoras FOR UPDATE TO authenticated
  USING (
    public._estudios_spin_scope_estudio(estudio_slug)
    AND public._mesas_spin_cadastro_perm('edit')
  )
  WITH CHECK (
    public._mesas_spin_cadastro_scope_slug(operadora_slug)
    AND public._mesas_spin_cadastro_perm('edit')
  );

CREATE POLICY estudios_spin_operadoras_delete
  ON public.estudios_spin_operadoras FOR DELETE TO authenticated
  USING (
    public._estudios_spin_scope_estudio(estudio_slug)
    AND public._mesas_spin_cadastro_perm('delete')
  );

CREATE POLICY mesas_spin_op_ident_select
  ON public.mesas_spin_operadora_identificacao FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mesas_spin_cadastro m
      WHERE m.id = mesa_id
        AND public._mesas_spin_cadastro_scope_slug(m.operadora_slug)
        AND public._mesas_spin_cadastro_perm('view')
    )
  );

CREATE POLICY mesas_spin_op_ident_insert
  ON public.mesas_spin_operadora_identificacao FOR INSERT TO authenticated
  WITH CHECK (
    public._mesas_spin_cadastro_scope_slug(operadora_slug)
    AND public._mesas_spin_cadastro_perm('create')
    AND EXISTS (
      SELECT 1 FROM public.mesas_spin_cadastro m
      WHERE m.id = mesa_id
        AND public._mesas_spin_cadastro_perm('create')
    )
  );

CREATE POLICY mesas_spin_op_ident_update
  ON public.mesas_spin_operadora_identificacao FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mesas_spin_cadastro m
      WHERE m.id = mesa_id
        AND public._mesas_spin_cadastro_scope_slug(m.operadora_slug)
        AND public._mesas_spin_cadastro_perm('edit')
    )
  )
  WITH CHECK (
    public._mesas_spin_cadastro_scope_slug(operadora_slug)
    AND public._mesas_spin_cadastro_perm('edit')
  );

CREATE POLICY mesas_spin_op_ident_delete
  ON public.mesas_spin_operadora_identificacao FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mesas_spin_cadastro m
      WHERE m.id = mesa_id
        AND public._mesas_spin_cadastro_scope_slug(m.operadora_slug)
        AND public._mesas_spin_cadastro_perm('delete')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estudios_spin TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estudios_spin_operadoras TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mesas_spin_operadora_identificacao TO authenticated;

COMMIT;
