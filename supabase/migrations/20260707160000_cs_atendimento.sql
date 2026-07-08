-- Customer Success — Atendimento (chamados Site Spin) + page_key cs_atendimento

BEGIN;

CREATE TABLE IF NOT EXISTS public.cs_chamado_protocolo_contador (
  ano    int  NOT NULL PRIMARY KEY,
  ultimo int  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.cs_chamados (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo               text        NOT NULL UNIQUE,
  origem                  text        NOT NULL DEFAULT 'site_spin'
    CHECK (origem IN ('site_spin')),
  status                  text        NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('aberto', 'em_andamento', 'arquivado')),
  nome_completo           text        NOT NULL,
  telefone                text,
  email                   text        NOT NULL,
  atuacao                 text        NOT NULL
    CHECK (atuacao IN ('operador', 'provedor', 'parceria', 'agregador', 'jogador', 'outros')),
  empresa                 text,
  mensagem                text        NOT NULL DEFAULT '',
  inicio_atendimento_em   timestamptz,
  arquivado_em            timestamptz,
  atendente_id            uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cs_chamados_empresa_quando_atuacao CHECK (
    atuacao NOT IN ('operador', 'provedor', 'parceria', 'agregador')
    OR (empresa IS NOT NULL AND btrim(empresa) <> '')
  )
);

CREATE INDEX IF NOT EXISTS idx_cs_chamados_status ON public.cs_chamados (status);
CREATE INDEX IF NOT EXISTS idx_cs_chamados_origem ON public.cs_chamados (origem);
CREATE INDEX IF NOT EXISTS idx_cs_chamados_created_at ON public.cs_chamados (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cs_chamados_atendente ON public.cs_chamados (atendente_id);
CREATE INDEX IF NOT EXISTS idx_cs_chamados_protocolo ON public.cs_chamados (protocolo);

DROP TRIGGER IF EXISTS trg_cs_chamados_upd ON public.cs_chamados;
CREATE TRIGGER trg_cs_chamados_upd
  BEFORE UPDATE ON public.cs_chamados
  FOR EACH ROW EXECUTE PROCEDURE public.rh_org_set_updated_at();

CREATE TABLE IF NOT EXISTS public.cs_chamado_historico (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id      uuid        NOT NULL REFERENCES public.cs_chamados (id) ON DELETE CASCADE,
  tipo_acao       text        NOT NULL
    CHECK (tipo_acao IN ('abertura', 'inicio_atendimento', 'anotacao', 'alteracao_status', 'arquivamento')),
  usuario_id      uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  usuario_nome    text        NOT NULL,
  anotacao        text,
  status_anterior text,
  status_novo     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cs_chamado_historico_chamado ON public.cs_chamado_historico (chamado_id, created_at ASC);

CREATE OR REPLACE FUNCTION public.cs_gerar_protocolo_site()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ano int := extract(year FROM timezone('America/Sao_Paulo', now()))::int;
  v_num int;
BEGIN
  INSERT INTO public.cs_chamado_protocolo_contador (ano, ultimo)
  VALUES (v_ano, 1)
  ON CONFLICT (ano) DO UPDATE
    SET ultimo = public.cs_chamado_protocolo_contador.ultimo + 1
  RETURNING ultimo INTO v_num;

  RETURN 'SITE-' || v_ano::text || '/' || lpad(v_num::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.cs_gerar_protocolo_site() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cs_gerar_protocolo_site() TO service_role;
GRANT EXECUTE ON FUNCTION public.cs_gerar_protocolo_site() TO authenticated;

CREATE OR REPLACE FUNCTION public._cs_atendimento_perm(p_need text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND rp.page_key = 'cs_atendimento'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._cs_atendimento_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._cs_atendimento_perm(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cs_chamado_atender(
  p_chamado_id   uuid,
  p_status_novo  text,
  p_anotacao     text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid           uuid := auth.uid();
  v_nome          text;
  v_row           public.cs_chamados%ROWTYPE;
  v_anotacao      text := btrim(coalesce(p_anotacao, ''));
  v_status_antigo text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT public._cs_atendimento_perm('edit') THEN
    RAISE EXCEPTION 'Sem permissão para atender chamados';
  END IF;

  IF p_status_novo NOT IN ('em_andamento', 'arquivado') THEN
    RAISE EXCEPTION 'Status inválido';
  END IF;

  SELECT * INTO v_row FROM public.cs_chamados WHERE id = p_chamado_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chamado não encontrado';
  END IF;

  IF v_row.status = 'arquivado' THEN
    RAISE EXCEPTION 'Chamado já arquivado';
  END IF;

  IF p_status_novo = 'em_andamento' AND v_row.status <> 'aberto' THEN
    RAISE EXCEPTION 'Transição de status inválida';
  END IF;

  IF p_status_novo = 'arquivado' AND v_row.status NOT IN ('aberto', 'em_andamento') THEN
    RAISE EXCEPTION 'Transição de status inválida';
  END IF;

  v_status_antigo := v_row.status;

  IF p_status_novo <> v_status_antigo AND v_anotacao = '' THEN
    RAISE EXCEPTION 'Informe uma anotação ao alterar o status do chamado';
  END IF;

  SELECT coalesce(nullif(btrim(p.name), ''), p.email, '—')
  INTO v_nome
  FROM public.profiles p
  WHERE p.id = v_uid;

  UPDATE public.cs_chamados
  SET
    status = p_status_novo,
    atendente_id = coalesce(atendente_id, v_uid),
    inicio_atendimento_em = CASE
      WHEN p_status_novo = 'em_andamento' AND inicio_atendimento_em IS NULL THEN now()
      ELSE inicio_atendimento_em
    END,
    arquivado_em = CASE
      WHEN p_status_novo = 'arquivado' THEN now()
      ELSE arquivado_em
    END,
    updated_at = now()
  WHERE id = p_chamado_id;

  IF p_status_novo <> v_status_antigo THEN
    IF p_status_novo = 'em_andamento' THEN
      INSERT INTO public.cs_chamado_historico (
        chamado_id, tipo_acao, usuario_id, usuario_nome, anotacao, status_anterior, status_novo
      ) VALUES (
        p_chamado_id, 'inicio_atendimento', v_uid, v_nome, v_anotacao, v_status_antigo, p_status_novo
      );
    ELSIF p_status_novo = 'arquivado' THEN
      INSERT INTO public.cs_chamado_historico (
        chamado_id, tipo_acao, usuario_id, usuario_nome, anotacao, status_anterior, status_novo
      ) VALUES (
        p_chamado_id, 'arquivamento', v_uid, v_nome, v_anotacao, v_status_antigo, p_status_novo
      );
    END IF;
  ELSIF v_anotacao <> '' THEN
    INSERT INTO public.cs_chamado_historico (
      chamado_id, tipo_acao, usuario_id, usuario_nome, anotacao
    ) VALUES (
      p_chamado_id, 'anotacao', v_uid, v_nome, v_anotacao
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.cs_chamado_atender(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cs_chamado_atender(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cs_chamado_criar_site_spin(
  p_nome_completo text,
  p_telefone      text,
  p_email         text,
  p_atuacao       text,
  p_empresa       text,
  p_mensagem      text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id        uuid;
  v_protocolo text;
  v_nome      text := btrim(p_nome_completo);
  v_email     text := lower(btrim(p_email));
  v_atuacao   text := btrim(p_atuacao);
  v_empresa   text := nullif(btrim(coalesce(p_empresa, '')), '');
  v_mensagem  text := btrim(coalesce(p_mensagem, ''));
BEGIN
  IF v_nome = '' OR v_email = '' OR v_atuacao = '' OR v_mensagem = '' THEN
    RAISE EXCEPTION 'Campos obrigatórios ausentes';
  END IF;

  IF v_atuacao NOT IN ('operador', 'provedor', 'parceria', 'agregador', 'jogador', 'outros') THEN
    RAISE EXCEPTION 'Atuação inválida';
  END IF;

  IF v_atuacao IN ('operador', 'provedor', 'parceria', 'agregador') AND v_empresa IS NULL THEN
    RAISE EXCEPTION 'Empresa obrigatória para esta atuação';
  END IF;

  IF v_atuacao IN ('jogador', 'outros') THEN
    v_empresa := NULL;
  END IF;

  v_protocolo := public.cs_gerar_protocolo_site();

  INSERT INTO public.cs_chamados (
    protocolo, origem, status, nome_completo, telefone, email, atuacao, empresa, mensagem
  ) VALUES (
    v_protocolo, 'site_spin', 'aberto', v_nome, nullif(btrim(coalesce(p_telefone, '')), ''), v_email, v_atuacao, v_empresa, v_mensagem
  )
  RETURNING id INTO v_id;

  INSERT INTO public.cs_chamado_historico (
    chamado_id, tipo_acao, usuario_id, usuario_nome, anotacao
  ) VALUES (
    v_id, 'abertura', NULL, v_nome, NULL
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cs_chamado_criar_site_spin(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cs_chamado_criar_site_spin(text, text, text, text, text, text) TO service_role;

ALTER TABLE public.cs_chamados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_chamado_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY cs_chamados_select ON public.cs_chamados FOR SELECT TO authenticated
  USING (public._cs_atendimento_perm('view'));

CREATE POLICY cs_chamados_update ON public.cs_chamados FOR UPDATE TO authenticated
  USING (public._cs_atendimento_perm('edit'))
  WITH CHECK (public._cs_atendimento_perm('edit'));

CREATE POLICY cs_chamado_historico_select ON public.cs_chamado_historico FOR SELECT TO authenticated
  USING (
    public._cs_atendimento_perm('view')
    AND EXISTS (
      SELECT 1 FROM public.cs_chamados c WHERE c.id = chamado_id
    )
  );

REVOKE INSERT, DELETE ON TABLE public.cs_chamados FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.cs_chamado_historico FROM authenticated;
GRANT SELECT, UPDATE ON public.cs_chamados TO authenticated;
GRANT SELECT ON public.cs_chamado_historico TO authenticated;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT r.role, 'cs_atendimento', 'nao', NULL, NULL, NULL
FROM (
  SELECT unnest(ARRAY[
    'gestor', 'operador', 'agencia', 'influencer', 'afiliado', 'investidor',
    'executivo', 'prestador', 'rh', 'figurino', 'comunicacao', 'performance_coach',
    'service_manager', 'tech_ops', 'shift_leader'
  ]::text[]) AS role
) r
ON CONFLICT (role, page_key) DO NOTHING;

INSERT INTO public.prestador_tipo_pages (prestador_tipo_slug, page_key)
SELECT 'customer_service', 'cs_atendimento'
ON CONFLICT (prestador_tipo_slug, page_key) DO NOTHING;

COMMENT ON TABLE public.cs_chamados IS
  'Customer Success — chamados de atendimento (origem Site Spin). Protocolo SITE-ANO/NNNN.';
COMMENT ON TABLE public.cs_chamado_historico IS
  'Customer Success — histórico de ações e anotações por chamado.';

COMMIT;
