-- Integração: Fechado = Contrato Assinado ou Ativo; permitir várias linhas por marca/tipo (sem UNIQUE).

BEGIN;

ALTER TABLE public.comercial_integracoes
  DROP CONSTRAINT IF EXISTS comercial_integracoes_marca_tipo_unique;

CREATE OR REPLACE FUNCTION public.comercial_integracao_from_assinado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome text;
  v_agregadora text;
BEGIN
  -- Mesmo critério da aba Fechado do Pipeline B2B.
  IF NEW.status_produto IS DISTINCT FROM 'contrato_assinado'
     AND NEW.status_produto IS DISTINCT FROM 'ativo' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
     AND OLD.status_produto IN ('contrato_assinado', 'ativo') THEN
    RETURN NEW;
  END IF;

  SELECT m.nome, m.agregadora
    INTO v_nome, v_agregadora
  FROM public.comercial_marcas m
  WHERE m.id = NEW.marca_id;

  IF v_nome IS NULL THEN
    RETURN NEW;
  END IF;

  -- Auto: no máximo uma linha por marca+tipo; Nova Integração pode criar extras.
  IF EXISTS (
    SELECT 1
    FROM public.comercial_integracoes i
    WHERE i.marca_id = NEW.marca_id
      AND i.tipo = NEW.produto
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.comercial_integracoes (
    marca_id,
    operador_nome,
    prioridade,
    tipo,
    caminho,
    pam,
    agregadora,
    status,
    comentario
  ) VALUES (
    NEW.marca_id,
    v_nome,
    'baixo',
    NEW.produto,
    NULL,
    NULL,
    NULLIF(trim(COALESCE(v_agregadora, '')), ''),
    'nao_iniciado',
    NULL
  );

  RETURN NEW;
END;
$$;

-- Backfill: produtos em Fechado sem linha automática ainda.
INSERT INTO public.comercial_integracoes (
  marca_id, operador_nome, prioridade, tipo, caminho, pam, agregadora, status
)
SELECT
  p.marca_id,
  m.nome,
  'baixo',
  p.produto,
  NULL,
  NULL,
  NULLIF(trim(COALESCE(m.agregadora, '')), ''),
  'nao_iniciado'
FROM public.comercial_marca_produtos p
INNER JOIN public.comercial_marcas m ON m.id = p.marca_id
WHERE p.status_produto IN ('contrato_assinado', 'ativo')
  AND NOT EXISTS (
    SELECT 1
    FROM public.comercial_integracoes i
    WHERE i.marca_id = p.marca_id
      AND i.tipo = p.produto
  );

COMMENT ON TABLE public.comercial_integracoes IS
  'Integração comercial — marcas em Fechado (Contrato Assinado ou Ativo) no Pipeline B2B.';

COMMIT;
