-- Candidaturas a vagas internas abertas + bucket de currículo.

BEGIN;

CREATE OR REPLACE FUNCTION public._rh_funcionario_vinculado_ao_login(p_funcionario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rh_funcionarios f
    INNER JOIN public.profiles p ON p.id = auth.uid()
    WHERE f.id = p_funcionario_id
      AND f.status IN ('ativo', 'indisponivel')
      AND (
        lower(trim(coalesce(p.email, ''))) = lower(trim(coalesce(f.email, '')))
        OR (
          trim(coalesce(f.email_spin, '')) <> ''
          AND lower(trim(coalesce(p.email, ''))) = lower(trim(coalesce(f.email_spin, '')))
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public._rh_funcionario_vinculado_ao_login(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_funcionario_vinculado_ao_login(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.rh_vaga_candidaturas (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id                 uuid        NOT NULL REFERENCES public.rh_vagas (id) ON DELETE CASCADE,
  funcionario_id          uuid        NOT NULL REFERENCES public.rh_funcionarios (id) ON DELETE CASCADE,
  nome_completo           text        NOT NULL,
  funcao_atual            text        NOT NULL,
  curriculo_storage_path  text        NOT NULL,
  curriculo_nome_arquivo  text        NOT NULL,
  carta_apresentacao      text        NOT NULL,
  created_by              uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rh_vaga_candidaturas_vaga_funcionario_unique UNIQUE (vaga_id, funcionario_id)
);

CREATE INDEX IF NOT EXISTS idx_rh_vaga_candidaturas_vaga ON public.rh_vaga_candidaturas (vaga_id);
CREATE INDEX IF NOT EXISTS idx_rh_vaga_candidaturas_funcionario ON public.rh_vaga_candidaturas (funcionario_id);

DROP TRIGGER IF EXISTS trg_rh_vaga_candidaturas_upd ON public.rh_vaga_candidaturas;
CREATE TRIGGER trg_rh_vaga_candidaturas_upd
  BEFORE UPDATE ON public.rh_vaga_candidaturas
  FOR EACH ROW EXECUTE PROCEDURE public.rh_org_set_updated_at();

ALTER TABLE public.rh_vaga_candidaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY rh_vaga_candidaturas_select ON public.rh_vaga_candidaturas FOR SELECT TO authenticated
  USING (
    public._rh_vagas_perm('view')
    OR public._rh_funcionario_vinculado_ao_login(funcionario_id)
  );

CREATE POLICY rh_vaga_candidaturas_insert ON public.rh_vaga_candidaturas FOR INSERT TO authenticated
  WITH CHECK (
    public._rh_funcionario_vinculado_ao_login(funcionario_id)
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.rh_vagas v
      WHERE v.id = vaga_id
        AND v.status = 'aberta'
        AND v.tipo_vaga IN ('interna', 'mista')
    )
  );

REVOKE ALL ON TABLE public.rh_vaga_candidaturas FROM PUBLIC;
GRANT SELECT, INSERT ON TABLE public.rh_vaga_candidaturas TO authenticated;

COMMENT ON TABLE public.rh_vaga_candidaturas IS 'RH — candidaturas de prestadores a vagas internas abertas.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rh-vaga-candidaturas',
  'rh-vaga-candidaturas',
  false,
  15728640,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY rh_vaga_candidaturas_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'rh-vaga-candidaturas'
    AND (
      public._rh_vagas_perm('view')
      OR public._rh_funcionario_vinculado_ao_login((split_part(name, '/', 1))::uuid)
    )
  );

CREATE POLICY rh_vaga_candidaturas_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'rh-vaga-candidaturas'
    AND public._rh_funcionario_vinculado_ao_login((split_part(name, '/', 1))::uuid)
    AND EXISTS (
      SELECT 1
      FROM public.rh_vagas v
      WHERE v.id = (split_part(name, '/', 2))::uuid
        AND v.status = 'aberta'
        AND v.tipo_vaga IN ('interna', 'mista')
    )
  );

COMMIT;
