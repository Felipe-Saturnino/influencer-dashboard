-- =============================================================================
-- MIGRAÇÃO: Status Técnico — tabelas para monitoramento de integrações
-- Execute no Supabase SQL Editor.
-- =============================================================================

-- 1. Tabela de integrações conhecidas
CREATE TABLE IF NOT EXISTS integrations (
  slug        text PRIMARY KEY,
  nome        text NOT NULL,
  descricao   text,
  ativo       boolean DEFAULT true,
  criado_em   timestamptz DEFAULT now()
);

INSERT INTO integrations (slug, nome, descricao) VALUES
  ('casa_apostas', 'Casa de Apostas (CDA)', 'Sync de métricas via API Plywood')
ON CONFLICT (slug) DO NOTHING;

-- 2. Logs de execução do sync (Edge Function sync-metricas grava aqui)
CREATE TABLE IF NOT EXISTS sync_logs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integracao_slug       text NOT NULL REFERENCES integrations(slug),
  executado_em          timestamptz NOT NULL DEFAULT now(),
  status                text NOT NULL CHECK (status IN ('ok', 'falha')),
  registros_inseridos   int DEFAULT 0,
  registros_atualizados int DEFAULT 0,
  erros_count          int DEFAULT 0,
  mensagem_erro        text,
  duracao_ms            int,
  periodo_inicio        date,
  periodo_fim           date,
  created_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_integracao ON sync_logs (integracao_slug);
CREATE INDEX IF NOT EXISTS idx_sync_logs_executado ON sync_logs (executado_em DESC);

COMMENT ON TABLE sync_logs IS 'Logs de execução das Edge Functions de sync. Preenchido pela função sync-metricas.';

-- 3. Logs de erros técnicos (para exibir em "Logs Recentes")
CREATE TABLE IF NOT EXISTS tech_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integracao_slug  text REFERENCES integrations(slug),
  tipo            text NOT NULL,  -- timeout, auth, api, outro
  descricao       text NOT NULL,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tech_logs_created ON tech_logs (created_at DESC);

-- 4. Configuração de alertas (condições e thresholds)
CREATE TABLE IF NOT EXISTS alert_config (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condicao    text NOT NULL UNIQUE,  -- nenhum_registro_24h, taxa_erro_alta, sync_atrasado, integracao_offline
  threshold   text,                  -- JSON ou valor: {"horas": 24}, "5", "60"
  ativo       boolean DEFAULT true,
  criado_em   timestamptz DEFAULT now()
);

INSERT INTO alert_config (condicao, threshold, ativo) VALUES
  ('nenhum_registro_24h', '24', true),
  ('taxa_erro_alta', '5', true),
  ('sync_atrasado', '60', true),
  ('integracao_offline', 'timeout', true)
ON CONFLICT (condicao) DO NOTHING;

-- 5. Permissões: NÃO inserir aqui — configurar em Gestão de Usuários > Permissões

-- RLS (leitura para authenticated)
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tech_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read sync_logs" ON sync_logs;
CREATE POLICY "Allow authenticated read sync_logs" ON sync_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read tech_logs" ON tech_logs;
CREATE POLICY "Allow authenticated read tech_logs" ON tech_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read alert_config" ON alert_config;
CREATE POLICY "Allow authenticated read alert_config" ON alert_config FOR SELECT TO authenticated USING (true);

-- integrations: leitura para authenticated
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read integrations" ON integrations;
CREATE POLICY "Allow authenticated read integrations" ON integrations FOR SELECT TO authenticated USING (true);
