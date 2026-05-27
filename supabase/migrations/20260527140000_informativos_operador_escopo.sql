-- Informativos: escopo de operadora quando o perfil Operador está entre os destinos.

BEGIN;

ALTER TABLE public.conteudo_informativo
  ADD COLUMN IF NOT EXISTS operador_escopo text;

COMMENT ON COLUMN public.conteudo_informativo.operador_escopo IS
  'Escopo para perfil Operador: slug de operadora ativa em Gestão de Operadoras ou ''todos''. NULL quando operador não está em perfis.';

UPDATE public.conteudo_informativo
SET operador_escopo = 'todos'
WHERE 'operador' = ANY (perfis)
  AND operador_escopo IS NULL;

ALTER TABLE public.conteudo_informativo
  DROP CONSTRAINT IF EXISTS conteudo_informativo_operador_escopo_check;

-- CHECK sem subquery (PostgreSQL não permite EXISTS em CHECK).
ALTER TABLE public.conteudo_informativo
  ADD CONSTRAINT conteudo_informativo_operador_escopo_check
  CHECK (
    (NOT ('operador' = ANY (perfis)) AND operador_escopo IS NULL)
    OR (
      'operador' = ANY (perfis)
      AND operador_escopo IS NOT NULL
      AND btrim(operador_escopo) <> ''
    )
  );

CREATE OR REPLACE FUNCTION public.conteudo_informativo_operador_escopo_validate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT ('operador' = ANY (NEW.perfis)) THEN
    IF NEW.operador_escopo IS NOT NULL THEN
      RAISE EXCEPTION 'operador_escopo deve ser nulo quando o perfil Operador não está selecionado';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.operador_escopo IS NULL OR btrim(NEW.operador_escopo) = '' THEN
    RAISE EXCEPTION 'operador_escopo é obrigatório quando o perfil Operador está selecionado';
  END IF;

  IF NEW.operador_escopo = 'todos' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.operadoras o
    WHERE o.slug = NEW.operador_escopo
      AND o.ativo = true
  ) THEN
    RAISE EXCEPTION 'operador_escopo inválido: operadora inexistente ou inativa';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_conteudo_informativo_operador_escopo ON public.conteudo_informativo;

CREATE TRIGGER trg_conteudo_informativo_operador_escopo
  BEFORE INSERT OR UPDATE OF perfis, operador_escopo
  ON public.conteudo_informativo
  FOR EACH ROW
  EXECUTE PROCEDURE public.conteudo_informativo_operador_escopo_validate();

DROP POLICY IF EXISTS conteudo_informativo_select ON public.conteudo_informativo;

CREATE POLICY conteudo_informativo_select ON public.conteudo_informativo
  FOR SELECT TO authenticated
  USING (
    public._informativos_perm('edit')
    OR (
      public._informativos_perm('view')
      AND status = 'publicado'
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role::text = ANY (perfis)
          AND (
            p.role::text <> 'operador'
            OR operador_escopo = 'todos'
            OR EXISTS (
              SELECT 1
              FROM public.user_scopes us
              WHERE us.user_id = p.id
                AND us.scope_type = 'operadora'
                AND us.scope_ref = operador_escopo
            )
          )
      )
    )
  );

DROP POLICY IF EXISTS conteudo_informativo_select_home_feed_operador ON public.conteudo_informativo;

CREATE POLICY conteudo_informativo_select_home_feed_operador ON public.conteudo_informativo
  FOR SELECT TO authenticated
  USING (
    status = 'publicado'
    AND 'operador' = ANY (perfis)
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'operador'
    )
    AND (
      operador_escopo = 'todos'
      OR EXISTS (
        SELECT 1
        FROM public.user_scopes us
        WHERE us.user_id = auth.uid()
          AND us.scope_type = 'operadora'
          AND us.scope_ref = operador_escopo
      )
    )
  );

COMMENT ON POLICY conteudo_informativo_select_home_feed_operador ON public.conteudo_informativo IS
  'Home Operador: informativos publicados para operador, filtrados por operador_escopo (todos ou slug em user_scopes).';

COMMIT;
