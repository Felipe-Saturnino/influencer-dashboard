-- Regra bidirecional por data fim (America/Sao_Paulo):
-- data_fim <= ontem → em_andamento (se aberta ou em_andamento)
-- data_fim > ontem e status em_andamento → aberta (reabre inscrições)

BEGIN;

CREATE OR REPLACE FUNCTION public.rh_vagas_sync_status_data_fim()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  ontem date := public.rh_vagas_ontem_sp();
BEGIN
  IF NEW.status IN ('aberta', 'em_andamento') THEN
    IF NEW.data_fim_inscricoes <= ontem THEN
      NEW.status := 'em_andamento';
    ELSIF NEW.status = 'em_andamento' THEN
      NEW.status := 'aberta';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.rh_vagas_atualizar_status_inscricoes_encerradas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ontem date := public.rh_vagas_ontem_sp();
  n_promovidas integer;
  n_reabertas integer;
BEGIN
  UPDATE public.rh_vagas
  SET status = 'em_andamento'
  WHERE status = 'aberta'
    AND data_fim_inscricoes <= ontem;

  GET DIAGNOSTICS n_promovidas = ROW_COUNT;

  UPDATE public.rh_vagas
  SET status = 'aberta'
  WHERE status = 'em_andamento'
    AND data_fim_inscricoes > ontem;

  GET DIAGNOSTICS n_reabertas = ROW_COUNT;

  RETURN n_promovidas + n_reabertas;
END;
$$;

COMMENT ON FUNCTION public.rh_vagas_atualizar_status_inscricoes_encerradas() IS
  'Sincroniza status por data_fim_inscricoes vs ontem (SP): aberta→em_andamento ou em_andamento→aberta.';

COMMIT;
