-- Inclui Elogios entre os tipos aceitos pelo registro público.

BEGIN;

CREATE OR REPLACE FUNCTION public.registrar_denuncia_spin(
  p_deseja_identificar boolean,
  p_nome text,
  p_telefone text,
  p_email text,
  p_tipos_denuncia text[],
  p_tipo_outro_descricao text,
  p_relato text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_protocolo text;
BEGIN
  IF p_tipos_denuncia IS NULL OR cardinality(p_tipos_denuncia) < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'tipos_vazio');
  END IF;
  IF p_relato IS NULL OR length(btrim(p_relato)) < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'relato_vazio');
  END IF;

  IF p_deseja_identificar THEN
    IF p_nome IS NULL OR length(btrim(p_nome)) < 1
       OR p_email IS NULL OR length(btrim(p_email)) < 1
       OR p_telefone IS NULL OR length(btrim(p_telefone)) < 1
    THEN
      RETURN jsonb_build_object('ok', false, 'error', 'identificacao_incompleta');
    END IF;
  END IF;

  IF 'outro' = ANY (p_tipos_denuncia)
     AND (p_tipo_outro_descricao IS NULL OR length(btrim(p_tipo_outro_descricao)) < 1)
  THEN
    RETURN jsonb_build_object('ok', false, 'error', 'outro_sem_descricao');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_tipos_denuncia) AS u(x)
    WHERE u.x NOT IN (
      'assedio_moral',
      'assedio_sexual',
      'discriminacao',
      'fraudes_corrupcao',
      'conflito_interesses',
      'conduta_antietica',
      'violacao_politicas',
      'uso_indevido_recursos',
      'vazamento_info',
      'seguranca_trabalho',
      'retaliacao',
      'elogios',
      'outro'
    )
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'tipo_invalido');
  END IF;

  INSERT INTO public.canal_denuncias_spin (
    deseja_identificar,
    nome,
    telefone,
    email,
    tipos_denuncia,
    tipo_outro_descricao,
    relato
  )
  VALUES (
    p_deseja_identificar,
    CASE WHEN p_deseja_identificar THEN btrim(p_nome) END,
    CASE WHEN p_deseja_identificar THEN btrim(p_telefone) END,
    CASE WHEN p_deseja_identificar THEN lower(btrim(p_email)) END,
    p_tipos_denuncia,
    CASE WHEN 'outro' = ANY (p_tipos_denuncia) THEN btrim(p_tipo_outro_descricao) END,
    btrim(p_relato)
  )
  RETURNING id, protocolo INTO v_id, v_protocolo;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_id,
    'protocolo', v_protocolo
  );
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_denuncia_spin(boolean, text, text, text, text[], text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_denuncia_spin(boolean, text, text, text, text[], text, text) TO anon, authenticated;

COMMENT ON FUNCTION public.registrar_denuncia_spin(boolean, text, text, text, text[], text, text) IS
  'Canal de denúncias Spin — insert público (bypass RLS); validação mínima de campos, incluindo Elogios.';

COMMIT;
