-- Itens Alocados — campos do formulário Registrar Manutenção + bucket de evidência (nivelamento).

BEGIN;

ALTER TABLE public.tech_ops_itens_alocados_manutencao
  ALTER COLUMN equipamento_id DROP NOT NULL;

ALTER TABLE public.tech_ops_itens_alocados_manutencao
  ADD COLUMN IF NOT EXISTS observacao text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS evidencia_storage_path text;

ALTER TABLE public.tech_ops_itens_alocados_manutencao
  DROP CONSTRAINT IF EXISTS tech_ops_ia_manut_mesa_ou_equip;

ALTER TABLE public.tech_ops_itens_alocados_manutencao
  ADD CONSTRAINT tech_ops_ia_manut_mesa_ou_equip CHECK (
    mesa_id IS NOT NULL OR equipamento_id IS NOT NULL
  );

ALTER TABLE public.tech_ops_itens_alocados_manutencao
  DROP CONSTRAINT IF EXISTS tech_ops_ia_manut_obs_trim;

ALTER TABLE public.tech_ops_itens_alocados_manutencao
  ADD CONSTRAINT tech_ops_ia_manut_obs_trim CHECK (btrim(observacao) <> '');

COMMENT ON COLUMN public.tech_ops_itens_alocados_manutencao.observacao IS
  'Observação obrigatória do registro de manutenção (aba Itens Alocados).';

COMMENT ON COLUMN public.tech_ops_itens_alocados_manutencao.evidencia_storage_path IS
  'Storage path da foto de evidência (nivelamento Roleta) — bucket tech-ops-itens-alocados-manutencao.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tech-ops-itens-alocados-manutencao',
  'tech-ops-itens-alocados-manutencao',
  false,
  15728640,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS tech_ops_ia_manut_storage_insert ON storage.objects;
CREATE POLICY tech_ops_ia_manut_storage_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tech-ops-itens-alocados-manutencao'
    AND public._tech_ops_itens_alocados_perm('create')
  );

DROP POLICY IF EXISTS tech_ops_ia_manut_storage_select ON storage.objects;
CREATE POLICY tech_ops_ia_manut_storage_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tech-ops-itens-alocados-manutencao'
    AND public._tech_ops_itens_alocados_perm('view')
  );

COMMIT;
