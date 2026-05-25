-- Revisão cadastral periódica (6 meses) — Dados de Cadastro / Gestão de Prestadores

BEGIN;

ALTER TABLE public.rh_funcionarios
  ADD COLUMN IF NOT EXISTS cadastro_revisado_em timestamptz,
  ADD COLUMN IF NOT EXISTS cadastro_revisao_tipo text;

ALTER TABLE public.rh_funcionarios
  DROP CONSTRAINT IF EXISTS rh_funcionarios_cadastro_revisao_tipo_check;

ALTER TABLE public.rh_funcionarios
  ADD CONSTRAINT rh_funcionarios_cadastro_revisao_tipo_check CHECK (
    cadastro_revisao_tipo IS NULL OR cadastro_revisao_tipo IN ('alteracao', 'sem_alteracao')
  );

COMMENT ON COLUMN public.rh_funcionarios.cadastro_revisado_em IS
  'Última confirmação/atualização cadastral pelo próprio prestador (Dados de Cadastro). Ciclo de 6 meses. NULL: o prazo conta desde created_at (cadastro em Gestão de Prestadores); após a primeira revisão, só este campo vale.';
COMMENT ON COLUMN public.rh_funcionarios.cadastro_revisao_tipo IS
  'alteracao = campos ou documentos atualizados; sem_alteracao = declaração sem mudanças no período.';

CREATE INDEX IF NOT EXISTS idx_rh_funcionarios_cadastro_revisado_em
  ON public.rh_funcionarios (cadastro_revisado_em)
  WHERE cadastro_revisado_em IS NOT NULL;

CREATE OR REPLACE FUNCTION public._rh_funcionario_eh_self_cadastro(p_email text, p_email_spin text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        lower(trim(coalesce(p.email, ''))) = lower(trim(coalesce(p_email, '')))
        OR (
          trim(coalesce(p_email_spin, '')) <> ''
          AND lower(trim(coalesce(p.email, ''))) = lower(trim(coalesce(p_email_spin, '')))
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public._rh_funcionario_eh_self_cadastro(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_funcionario_eh_self_cadastro(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_registrar_revisao_cadastral_sem_alteracao(p_funcionario_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f public.rh_funcionarios%ROWTYPE;
  usuario_lbl text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT public._rh_dados_cadastro_perm('edit') THEN
    RAISE EXCEPTION 'Sem permissão para atualizar cadastro';
  END IF;

  SELECT * INTO f FROM public.rh_funcionarios WHERE id = p_funcionario_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cadastro não encontrado';
  END IF;

  IF f.status = 'encerrado' THEN
    RAISE EXCEPTION 'Prestação encerrada';
  END IF;

  IF NOT public._rh_funcionario_eh_self_cadastro(f.email, f.email_spin) THEN
    RAISE EXCEPTION 'Só o próprio prestador pode registrar esta confirmação';
  END IF;

  SELECT coalesce(nullif(trim(p.name), ''), nullif(trim(p.email), ''), 'Utilizador')
  INTO usuario_lbl
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;

  UPDATE public.rh_funcionarios
  SET
    cadastro_revisado_em = now(),
    cadastro_revisao_tipo = 'sem_alteracao'
  WHERE id = p_funcionario_id;

  INSERT INTO public.rh_funcionario_historico (rh_funcionario_id, tipo, detalhes, created_by)
  VALUES (
    p_funcionario_id,
    'atualizacao_cadastral_sem_alteracao',
    jsonb_build_object(
      'usuario_label', coalesce(usuario_lbl, 'Utilizador'),
      'declaracao', true,
      'revisao_periodica', true
    ),
    auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rh_registrar_revisao_cadastral_sem_alteracao(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_registrar_revisao_cadastral_sem_alteracao(uuid) TO authenticated;

COMMENT ON FUNCTION public.rh_registrar_revisao_cadastral_sem_alteracao(uuid) IS
  'Prestação de contas sem alteração de dados (ciclo 6 meses) — página Dados de Cadastro.';

COMMIT;
