-- Vagas com data fim de inscrições <= ontem (America/Sao_Paulo) passam de aberta → em_andamento.

BEGIN;

CREATE OR REPLACE FUNCTION public.rh_vagas_ontem_sp()
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT ((now() AT TIME ZONE 'America/Sao_Paulo')::date - 1);
$$;

COMMENT ON FUNCTION public.rh_vagas_ontem_sp() IS 'Data de ontem no fuso America/Sao_Paulo (regra data fim inscrições).';

CREATE OR REPLACE FUNCTION public.rh_vagas_sync_status_data_fim()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  ontem date := public.rh_vagas_ontem_sp();
BEGIN
  IF NEW.status = 'aberta' AND NEW.data_fim_inscricoes <= ontem THEN
    NEW.status := 'em_andamento';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rh_vagas_status_data_fim ON public.rh_vagas;
CREATE TRIGGER trg_rh_vagas_status_data_fim
  BEFORE INSERT OR UPDATE ON public.rh_vagas
  FOR EACH ROW
  EXECUTE PROCEDURE public.rh_vagas_sync_status_data_fim();

CREATE OR REPLACE FUNCTION public.rh_vagas_atualizar_status_inscricoes_encerradas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ontem date := public.rh_vagas_ontem_sp();
  n integer;
BEGIN
  UPDATE public.rh_vagas
  SET status = 'em_andamento'
  WHERE status = 'aberta'
    AND data_fim_inscricoes <= ontem;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_vagas_atualizar_status_inscricoes_encerradas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_vagas_atualizar_status_inscricoes_encerradas() TO authenticated;

COMMENT ON FUNCTION public.rh_vagas_atualizar_status_inscricoes_encerradas() IS
  'Promove vagas abertas com data_fim_inscricoes <= ontem (SP) para em_andamento. Chamado ao listar vagas.';

COMMIT;
