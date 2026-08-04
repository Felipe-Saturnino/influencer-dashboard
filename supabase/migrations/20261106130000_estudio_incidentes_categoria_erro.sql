-- Incidentes: categoria «Erro» (entre Caso e Oculto no consolidado / formulário).
-- Idempotente para ambientes que já aplicaram 20261106120000_estudio_incidentes.

ALTER TABLE public.estudio_incidentes
  DROP CONSTRAINT IF EXISTS estudio_incidentes_incidente_check;

ALTER TABLE public.estudio_incidentes
  ADD CONSTRAINT estudio_incidentes_incidente_check CHECK (incidente IN (
    'caso', 'erro', 'oculto', 'nao_avisado', 'avisado_resolvido', 'avisado_nao_resolvido'
  ));

-- Protocolo: «erro» e demais categorias de erro → prefixo ERRO- (seq já existente).
CREATE OR REPLACE FUNCTION public.estudio_incidente_next_protocol(p_incidente text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_n bigint;
BEGIN
  IF p_incidente = 'caso' THEN
    v_prefix := 'CASO';
    v_n := nextval('public.estudio_incidente_protocolo_caso_seq');
  ELSIF p_incidente = 'oculto' THEN
    v_prefix := 'OCULTO';
    v_n := nextval('public.estudio_incidente_protocolo_oculto_seq');
  ELSE
    -- erro, nao_avisado, avisado_resolvido, avisado_nao_resolvido
    v_prefix := 'ERRO';
    v_n := nextval('public.estudio_incidente_protocolo_erro_seq');
  END IF;
  RETURN v_prefix || '-' || lpad(v_n::text, 5, '0');
END;
$$;
