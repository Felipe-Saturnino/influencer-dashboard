-- Tech Ops — Gestão de Estoque (page_key tech_ops_estoque).
-- Itens de estoque, equipamentos, itens de jogo (lotes), fornecedores + contatos,
-- anotações e histórico por entidade. Sem dados seed — estrutura pronta para carga real.
-- Permissões: matriz role_permissions (aba Permissões); seed inicial Não para todos os perfis exceto admin.

BEGIN;

-- ─── Consistência dos helpers de staff Spin ──────────────────────────────────
-- Migrações com timestamp posterior (20260922–20260928) regrediram estas funções para listas
-- sem tech_ops / customer_service / game_presenter / shuffler / gestores de departamento.
-- Restaura a versão completa (base 20260710200000 e 20260708170000).

CREATE OR REPLACE FUNCTION public._role_sem_escopo_app()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.role IN (
          'executivo',
          'investidor',
          'prestador',
          'shift_leader',
          'service_manager',
          'customer_service',
          'game_presenter',
          'shuffler',
          'tech_ops',
          'figurino',
          'comunicacao',
          'performance_coach',
          'rh'
        )
        OR p.role::text = ANY (public._gestor_departamento_roles())
      )
  );
$$;

COMMENT ON FUNCTION public._role_sem_escopo_app() IS
  'Executivo, Investidor, Prestador, staff Spin e gestores de departamento: sem escopo operadora/influencer na app — só role_permissions.';

CREATE OR REPLACE FUNCTION public._staff_spin_page_perm(p_page_key text, p_need text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
    WHERE p.id = auth.uid()
      AND p.role IN (
        'shift_leader',
        'service_manager',
        'customer_service',
        'game_presenter',
        'shuffler',
        'tech_ops',
        'figurino',
        'comunicacao',
        'performance_coach',
        'rh'
      )
      AND rp.page_key = p_page_key
      AND (
        (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
        OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
        OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
        OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
      )
  );
$$;

COMMENT ON FUNCTION public._staff_spin_page_perm(text, text) IS
  'Staff Spin (Estúdio + Escritório): ação efetiva só conforme role_permissions (aba Permissões), sem user_scopes.';

-- ─── Permissão da página (padrão _afiliados_network_perm) ────────────────────

CREATE OR REPLACE FUNCTION public._tech_ops_estoque_perm(p_need text)
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
      OR public._gestor_page_perm('tech_ops_estoque', p_need)
      OR public._prestador_page_perm('tech_ops_estoque', p_need)
      OR public._staff_spin_page_perm('tech_ops_estoque', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'tech_ops_estoque'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._tech_ops_estoque_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._tech_ops_estoque_perm(text) TO authenticated;

-- ─── Trigger updated_at partilhado ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.tech_ops_estoque_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ─── Itens de estoque (aba Itens) ────────────────────────────────────────────

CREATE TABLE public.tech_ops_estoque_itens (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_num            int  GENERATED ALWAYS AS IDENTITY UNIQUE,
  categoria             text NOT NULL,
  nome                  text NOT NULL,
  marca                 text NOT NULL DEFAULT '',
  modelo                text NOT NULL DEFAULT '',
  quantidade_total      int  NOT NULL DEFAULT 0,
  quantidade_em_uso     int  NOT NULL DEFAULT 0,
  quantidade_manutencao int  NOT NULL DEFAULT 0,
  valor_unitario        numeric(14, 2) NOT NULL DEFAULT 0,
  estudio_slug          text REFERENCES public.estudios_spin (slug) ON UPDATE CASCADE ON DELETE SET NULL,
  ativo                 boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tech_ops_estoque_itens_nome_trim CHECK (btrim(nome) <> ''),
  CONSTRAINT tech_ops_estoque_itens_categoria_check CHECK (
    categoria IN ('cabos_conectores', 'energia', 'iluminacao', 'rede_it', 'tripes_suportes', 'audio_video')
  ),
  CONSTRAINT tech_ops_estoque_itens_qtd_total_check CHECK (quantidade_total >= 0),
  CONSTRAINT tech_ops_estoque_itens_qtd_em_uso_check CHECK (quantidade_em_uso >= 0),
  CONSTRAINT tech_ops_estoque_itens_qtd_manutencao_check CHECK (quantidade_manutencao >= 0),
  CONSTRAINT tech_ops_estoque_itens_valor_check CHECK (valor_unitario >= 0)
);

COMMENT ON TABLE public.tech_ops_estoque_itens IS
  'Tech Ops → Gestão de Estoque, aba Itens. Código exibido = ITM-<codigo_num com 3 dígitos>. Estoque = total - em uso - manutenção (derivado na UI).';

CREATE INDEX idx_tech_ops_estoque_itens_categoria ON public.tech_ops_estoque_itens (categoria);
CREATE INDEX idx_tech_ops_estoque_itens_estudio ON public.tech_ops_estoque_itens (estudio_slug);

DROP TRIGGER IF EXISTS trg_tech_ops_estoque_itens_upd ON public.tech_ops_estoque_itens;
CREATE TRIGGER trg_tech_ops_estoque_itens_upd
  BEFORE UPDATE ON public.tech_ops_estoque_itens
  FOR EACH ROW EXECUTE PROCEDURE public.tech_ops_estoque_touch_updated_at();

-- ─── Equipamentos (aba Equipamentos) ─────────────────────────────────────────

CREATE TABLE public.tech_ops_estoque_equipamentos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_num    int  GENERATED ALWAYS AS IDENTITY UNIQUE,
  categoria     text NOT NULL,
  nome          text NOT NULL,
  numero_serie  text NOT NULL DEFAULT '',
  marca         text NOT NULL DEFAULT '',
  modelo        text NOT NULL DEFAULT '',
  valor         numeric(14, 2) NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'estoque',
  estudio_slug  text REFERENCES public.estudios_spin (slug) ON UPDATE CASCADE ON DELETE SET NULL,
  ativo         boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tech_ops_estoque_equip_nome_trim CHECK (btrim(nome) <> ''),
  CONSTRAINT tech_ops_estoque_equip_categoria_check CHECK (
    categoria IN ('roleta', 'maquina_cartas', 'camera', 'iluminacao', 'lentes', 'video_switcher', 'audio')
  ),
  CONSTRAINT tech_ops_estoque_equip_status_check CHECK (status IN ('estoque', 'em_uso', 'manutencao')),
  CONSTRAINT tech_ops_estoque_equip_valor_check CHECK (valor >= 0)
);

COMMENT ON TABLE public.tech_ops_estoque_equipamentos IS
  'Tech Ops → Gestão de Estoque, aba Equipamentos. Código exibido = EQP-<codigo_num com 3 dígitos>. Alocação (estudio_slug) preenchida quando status = em_uso.';

CREATE INDEX idx_tech_ops_estoque_equip_categoria ON public.tech_ops_estoque_equipamentos (categoria);
CREATE INDEX idx_tech_ops_estoque_equip_status ON public.tech_ops_estoque_equipamentos (status);
CREATE INDEX idx_tech_ops_estoque_equip_estudio ON public.tech_ops_estoque_equipamentos (estudio_slug);

DROP TRIGGER IF EXISTS trg_tech_ops_estoque_equip_upd ON public.tech_ops_estoque_equipamentos;
CREATE TRIGGER trg_tech_ops_estoque_equip_upd
  BEFORE UPDATE ON public.tech_ops_estoque_equipamentos
  FOR EACH ROW EXECUTE PROCEDURE public.tech_ops_estoque_touch_updated_at();

-- ─── Itens de jogo — lotes (aba Jogo) ────────────────────────────────────────

CREATE TABLE public.tech_ops_estoque_jogo_lotes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_num      int  GENERATED ALWAYS AS IDENTITY UNIQUE,
  categoria       text NOT NULL,
  nome_lote       text NOT NULL,
  qtd_inicial     int  NOT NULL DEFAULT 0,
  qtd_consumida   int  NOT NULL DEFAULT 0,
  qtd_descartada  int  NOT NULL DEFAULT 0,
  estudio_slug    text REFERENCES public.estudios_spin (slug) ON UPDATE CASCADE ON DELETE SET NULL,
  ativo           boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tech_ops_estoque_jogo_nome_trim CHECK (btrim(nome_lote) <> ''),
  CONSTRAINT tech_ops_estoque_jogo_categoria_check CHECK (categoria IN ('bolinhas', 'cartas', 'tecidos')),
  CONSTRAINT tech_ops_estoque_jogo_qtd_inicial_check CHECK (qtd_inicial >= 0),
  CONSTRAINT tech_ops_estoque_jogo_qtd_consumida_check CHECK (qtd_consumida >= 0),
  CONSTRAINT tech_ops_estoque_jogo_qtd_descartada_check CHECK (qtd_descartada >= 0)
);

COMMENT ON TABLE public.tech_ops_estoque_jogo_lotes IS
  'Tech Ops → Gestão de Estoque, aba Jogo. Código exibido = JOG-<codigo_num com 3 dígitos>. Qtd atual = inicial - consumida - descartada (derivado na UI).';

CREATE INDEX idx_tech_ops_estoque_jogo_categoria ON public.tech_ops_estoque_jogo_lotes (categoria);
CREATE INDEX idx_tech_ops_estoque_jogo_estudio ON public.tech_ops_estoque_jogo_lotes (estudio_slug);

DROP TRIGGER IF EXISTS trg_tech_ops_estoque_jogo_upd ON public.tech_ops_estoque_jogo_lotes;
CREATE TRIGGER trg_tech_ops_estoque_jogo_upd
  BEFORE UPDATE ON public.tech_ops_estoque_jogo_lotes
  FOR EACH ROW EXECUTE PROCEDURE public.tech_ops_estoque_touch_updated_at();

-- ─── Fornecedores + contatos (aba Fornecedores) ──────────────────────────────

CREATE TABLE public.tech_ops_estoque_fornecedores (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social  text NOT NULL,
  cnpj          text NOT NULL DEFAULT '',
  tipo          text NOT NULL,
  observacao    text NOT NULL DEFAULT '',
  ativo         boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tech_ops_estoque_fornecedores_razao_trim CHECK (btrim(razao_social) <> ''),
  CONSTRAINT tech_ops_estoque_fornecedores_tipo_trim CHECK (btrim(tipo) <> '')
);

COMMENT ON TABLE public.tech_ops_estoque_fornecedores IS
  'Tech Ops → Gestão de Estoque, aba Fornecedores. Tipo livre (ex.: Destruição de cartas, Geral).';

DROP TRIGGER IF EXISTS trg_tech_ops_estoque_fornecedores_upd ON public.tech_ops_estoque_fornecedores;
CREATE TRIGGER trg_tech_ops_estoque_fornecedores_upd
  BEFORE UPDATE ON public.tech_ops_estoque_fornecedores
  FOR EACH ROW EXECUTE PROCEDURE public.tech_ops_estoque_touch_updated_at();

CREATE TABLE public.tech_ops_estoque_fornecedor_contatos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id  uuid NOT NULL REFERENCES public.tech_ops_estoque_fornecedores (id) ON DELETE CASCADE,
  nome           text NOT NULL,
  telefone       text NOT NULL DEFAULT '',
  email          text NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tech_ops_estoque_fornecedor_contatos_nome_trim CHECK (btrim(nome) <> '')
);

CREATE INDEX idx_tech_ops_estoque_fornecedor_contatos_fornecedor
  ON public.tech_ops_estoque_fornecedor_contatos (fornecedor_id);

-- ─── Anotações por entidade ──────────────────────────────────────────────────

CREATE TABLE public.tech_ops_estoque_anotacoes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_tipo  text NOT NULL,
  entidade_id    uuid NOT NULL,
  texto          text NOT NULL,
  anexo_url      text,
  autor_user_id  uuid DEFAULT auth.uid(),
  autor_nome     text NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tech_ops_estoque_anotacoes_texto_trim CHECK (btrim(texto) <> ''),
  CONSTRAINT tech_ops_estoque_anotacoes_tipo_check CHECK (
    entidade_tipo IN ('item', 'equipamento', 'jogo', 'fornecedor')
  )
);

COMMENT ON TABLE public.tech_ops_estoque_anotacoes IS
  'Anotações da Gestão de Estoque (Tech Ops) — por entidade (item, equipamento, lote de jogo, fornecedor); anexo opcional no bucket tech-ops-estoque.';

CREATE INDEX idx_tech_ops_estoque_anotacoes_entidade
  ON public.tech_ops_estoque_anotacoes (entidade_tipo, entidade_id, created_at DESC);

-- ─── Histórico por entidade ──────────────────────────────────────────────────

CREATE TABLE public.tech_ops_estoque_historico (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_tipo  text NOT NULL,
  entidade_id    uuid NOT NULL,
  acao           text NOT NULL,
  detalhe        text,
  autor_user_id  uuid DEFAULT auth.uid(),
  autor_nome     text NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tech_ops_estoque_historico_acao_trim CHECK (btrim(acao) <> ''),
  CONSTRAINT tech_ops_estoque_historico_tipo_check CHECK (
    entidade_tipo IN ('item', 'equipamento', 'jogo', 'fornecedor')
  )
);

COMMENT ON TABLE public.tech_ops_estoque_historico IS
  'Histórico de ações e edições da Gestão de Estoque (Tech Ops) — quem fez o quê e quando, por entidade.';

CREATE INDEX idx_tech_ops_estoque_historico_entidade
  ON public.tech_ops_estoque_historico (entidade_tipo, entidade_id, created_at DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.tech_ops_estoque_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_ops_estoque_equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_ops_estoque_jogo_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_ops_estoque_fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_ops_estoque_fornecedor_contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_ops_estoque_anotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_ops_estoque_historico ENABLE ROW LEVEL SECURITY;

-- Itens
CREATE POLICY tech_ops_estoque_itens_select
  ON public.tech_ops_estoque_itens FOR SELECT TO authenticated
  USING (public._tech_ops_estoque_perm('view'));
CREATE POLICY tech_ops_estoque_itens_insert
  ON public.tech_ops_estoque_itens FOR INSERT TO authenticated
  WITH CHECK (public._tech_ops_estoque_perm('create'));
CREATE POLICY tech_ops_estoque_itens_update
  ON public.tech_ops_estoque_itens FOR UPDATE TO authenticated
  USING (public._tech_ops_estoque_perm('edit'))
  WITH CHECK (public._tech_ops_estoque_perm('edit'));
CREATE POLICY tech_ops_estoque_itens_delete
  ON public.tech_ops_estoque_itens FOR DELETE TO authenticated
  USING (public._tech_ops_estoque_perm('delete'));

-- Equipamentos
CREATE POLICY tech_ops_estoque_equip_select
  ON public.tech_ops_estoque_equipamentos FOR SELECT TO authenticated
  USING (public._tech_ops_estoque_perm('view'));
CREATE POLICY tech_ops_estoque_equip_insert
  ON public.tech_ops_estoque_equipamentos FOR INSERT TO authenticated
  WITH CHECK (public._tech_ops_estoque_perm('create'));
CREATE POLICY tech_ops_estoque_equip_update
  ON public.tech_ops_estoque_equipamentos FOR UPDATE TO authenticated
  USING (public._tech_ops_estoque_perm('edit'))
  WITH CHECK (public._tech_ops_estoque_perm('edit'));
CREATE POLICY tech_ops_estoque_equip_delete
  ON public.tech_ops_estoque_equipamentos FOR DELETE TO authenticated
  USING (public._tech_ops_estoque_perm('delete'));

-- Jogo (lotes)
CREATE POLICY tech_ops_estoque_jogo_select
  ON public.tech_ops_estoque_jogo_lotes FOR SELECT TO authenticated
  USING (public._tech_ops_estoque_perm('view'));
CREATE POLICY tech_ops_estoque_jogo_insert
  ON public.tech_ops_estoque_jogo_lotes FOR INSERT TO authenticated
  WITH CHECK (public._tech_ops_estoque_perm('create'));
CREATE POLICY tech_ops_estoque_jogo_update
  ON public.tech_ops_estoque_jogo_lotes FOR UPDATE TO authenticated
  USING (public._tech_ops_estoque_perm('edit'))
  WITH CHECK (public._tech_ops_estoque_perm('edit'));
CREATE POLICY tech_ops_estoque_jogo_delete
  ON public.tech_ops_estoque_jogo_lotes FOR DELETE TO authenticated
  USING (public._tech_ops_estoque_perm('delete'));

-- Fornecedores
CREATE POLICY tech_ops_estoque_fornecedores_select
  ON public.tech_ops_estoque_fornecedores FOR SELECT TO authenticated
  USING (public._tech_ops_estoque_perm('view'));
CREATE POLICY tech_ops_estoque_fornecedores_insert
  ON public.tech_ops_estoque_fornecedores FOR INSERT TO authenticated
  WITH CHECK (public._tech_ops_estoque_perm('create'));
CREATE POLICY tech_ops_estoque_fornecedores_update
  ON public.tech_ops_estoque_fornecedores FOR UPDATE TO authenticated
  USING (public._tech_ops_estoque_perm('edit'))
  WITH CHECK (public._tech_ops_estoque_perm('edit'));
CREATE POLICY tech_ops_estoque_fornecedores_delete
  ON public.tech_ops_estoque_fornecedores FOR DELETE TO authenticated
  USING (public._tech_ops_estoque_perm('delete'));

-- Contatos de fornecedor (mutação com criar OU editar — modal Novo e modal Editar)
CREATE POLICY tech_ops_estoque_fornecedor_contatos_select
  ON public.tech_ops_estoque_fornecedor_contatos FOR SELECT TO authenticated
  USING (public._tech_ops_estoque_perm('view'));
CREATE POLICY tech_ops_estoque_fornecedor_contatos_insert
  ON public.tech_ops_estoque_fornecedor_contatos FOR INSERT TO authenticated
  WITH CHECK (public._tech_ops_estoque_perm('create') OR public._tech_ops_estoque_perm('edit'));
CREATE POLICY tech_ops_estoque_fornecedor_contatos_update
  ON public.tech_ops_estoque_fornecedor_contatos FOR UPDATE TO authenticated
  USING (public._tech_ops_estoque_perm('edit'))
  WITH CHECK (public._tech_ops_estoque_perm('edit'));
CREATE POLICY tech_ops_estoque_fornecedor_contatos_delete
  ON public.tech_ops_estoque_fornecedor_contatos FOR DELETE TO authenticated
  USING (public._tech_ops_estoque_perm('edit') OR public._tech_ops_estoque_perm('delete'));

-- Anotações (registro via modal Editar — exige editar; sem update/delete na v1)
CREATE POLICY tech_ops_estoque_anotacoes_select
  ON public.tech_ops_estoque_anotacoes FOR SELECT TO authenticated
  USING (public._tech_ops_estoque_perm('view'));
CREATE POLICY tech_ops_estoque_anotacoes_insert
  ON public.tech_ops_estoque_anotacoes FOR INSERT TO authenticated
  WITH CHECK (
    (public._tech_ops_estoque_perm('create') OR public._tech_ops_estoque_perm('edit'))
    AND (autor_user_id IS NULL OR autor_user_id = auth.uid())
  );

-- Histórico (gravado junto com criar/editar; imutável na UI)
CREATE POLICY tech_ops_estoque_historico_select
  ON public.tech_ops_estoque_historico FOR SELECT TO authenticated
  USING (public._tech_ops_estoque_perm('view'));
CREATE POLICY tech_ops_estoque_historico_insert
  ON public.tech_ops_estoque_historico FOR INSERT TO authenticated
  WITH CHECK (
    (public._tech_ops_estoque_perm('create') OR public._tech_ops_estoque_perm('edit'))
    AND (autor_user_id IS NULL OR autor_user_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tech_ops_estoque_itens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tech_ops_estoque_equipamentos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tech_ops_estoque_jogo_lotes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tech_ops_estoque_fornecedores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tech_ops_estoque_fornecedor_contatos TO authenticated;
GRANT SELECT, INSERT ON public.tech_ops_estoque_anotacoes TO authenticated;
GRANT SELECT, INSERT ON public.tech_ops_estoque_historico TO authenticated;

-- ─── Storage — anexos de anotações ───────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('tech-ops-estoque', 'tech-ops-estoque', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS tech_ops_estoque_anexos_select ON storage.objects;
CREATE POLICY tech_ops_estoque_anexos_select
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tech-ops-estoque' AND public._tech_ops_estoque_perm('view'));

DROP POLICY IF EXISTS tech_ops_estoque_anexos_insert ON storage.objects;
CREATE POLICY tech_ops_estoque_anexos_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tech-ops-estoque'
    AND (public._tech_ops_estoque_perm('create') OR public._tech_ops_estoque_perm('edit'))
  );

-- ─── Leitura de estúdios para o filtro da página ─────────────────────────────
-- Redefine _estudios_spin_leitura_perm (base 20260924150000) somando quem vê tech_ops_estoque.

CREATE OR REPLACE FUNCTION public._estudios_spin_leitura_perm(p_need text DEFAULT 'view')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      public._mesas_spin_cadastro_perm(p_need)
      OR public._rh_staff_perm(p_need)
      OR public._gestor_page_perm('rh_gestao_escala', p_need)
      OR public._prestador_page_perm('rh_gestao_escala', p_need)
      OR public._staff_spin_page_perm('rh_gestao_escala', p_need)
      OR public._executivo_role_permissions_can_view('rh_gestao_escala')
      OR public._gestor_page_perm('gestao_dealers', p_need)
      OR public._prestador_page_perm('gestao_dealers', p_need)
      OR public._staff_spin_page_perm('gestao_dealers', p_need)
      OR public._executivo_role_permissions_can_view('gestao_dealers')
      OR public._gestor_page_perm('rh_figurinos', p_need)
      OR public._prestador_page_perm('rh_figurinos', p_need)
      OR public._staff_spin_page_perm('rh_figurinos', p_need)
      OR public._executivo_role_permissions_can_view('rh_figurinos')
      OR public._gestor_page_perm('roteiro_mesa', p_need)
      OR public._prestador_page_perm('roteiro_mesa', p_need)
      OR public._staff_spin_page_perm('roteiro_mesa', p_need)
      OR public._executivo_role_permissions_can_view('roteiro_mesa')
      OR public._gestor_page_perm('central_notificacoes', p_need)
      OR public._prestador_page_perm('central_notificacoes', p_need)
      OR public._staff_spin_page_perm('central_notificacoes', p_need)
      OR public._executivo_role_permissions_can_view('central_notificacoes')
      OR public._tech_ops_estoque_perm(p_need)
    );
$$;

COMMENT ON FUNCTION public._estudios_spin_leitura_perm(text) IS
  'SELECT em estudios_spin: Gestão de Mesas ou páginas operacionais (Staff, Escala, Dealers, Figurinos, Roteiro, Central, Gestão de Estoque Tech Ops).';

-- ─── Seed de permissões — Não para todos os perfis exceto admin ──────────────

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT DISTINCT rp.role, 'tech_ops_estoque', 'nao', 'nao', 'nao', NULL
FROM public.role_permissions rp
WHERE rp.role::text <> 'admin'
ON CONFLICT (role, page_key) DO NOTHING;

COMMIT;
