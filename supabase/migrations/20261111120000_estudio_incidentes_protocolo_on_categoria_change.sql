-- Incidentes: ao editar, se a família da categoria (CASO / OCULTO / ERRO) mudar,
-- regenera o protocolo na sequência correspondente. Dentro da mesma família
-- (ex.: erro → nao_avisado) o protocolo permanece.

BEGIN;

CREATE OR REPLACE FUNCTION public.estudio_incidente_protocol_family(p_incidente text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_incidente = 'caso' THEN 'CASO'
    WHEN p_incidente = 'oculto' THEN 'OCULTO'
    ELSE 'ERRO'
  END;
$$;

COMMENT ON FUNCTION public.estudio_incidente_protocol_family(text) IS
  'Família do prefixo de protocolo (CASO / OCULTO / ERRO) a partir da categoria incidente.';

CREATE OR REPLACE FUNCTION public.estudio_incidentes_set_protocol()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.protocolo IS NULL OR btrim(NEW.protocolo) = '' THEN
      NEW.protocolo := public.estudio_incidente_next_protocol(NEW.incidente);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.incidente IS DISTINCT FROM OLD.incidente
       AND public.estudio_incidente_protocol_family(NEW.incidente)
           IS DISTINCT FROM public.estudio_incidente_protocol_family(OLD.incidente)
    THEN
      NEW.protocolo := public.estudio_incidente_next_protocol(NEW.incidente);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_estudio_incidentes_protocol ON public.estudio_incidentes;
CREATE TRIGGER trg_estudio_incidentes_protocol
  BEFORE INSERT OR UPDATE OF incidente ON public.estudio_incidentes
  FOR EACH ROW
  EXECUTE PROCEDURE public.estudio_incidentes_set_protocol();

COMMENT ON FUNCTION public.estudio_incidentes_set_protocol() IS
  'INSERT: gera protocolo se vazio. UPDATE de incidente: regenera se a família CASO/OCULTO/ERRO mudar.';

COMMIT;
