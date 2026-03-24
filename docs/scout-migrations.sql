-- =============================================================================
-- Scout: Tabelas para prospectação de influencers pelo Gestor
-- Execute no SQL Editor do Supabase
--
-- Permissões de PÁGINA (menu Scout, ver/criar/editar/excluir no app):
--   Configure apenas em Plataforma → Gestão de Usuários. Não use SQL em
--   role_permissions para isso — este arquivo não altera role_permissions.
--
-- RLS abaixo: políticas do Postgres (quem pode ler/gravar LINHAS nas tabelas
--   scout_* com sessão autenticada). É camada de banco, não substitui a
--   Gestão de Usuários na interface.
--
-- NOTA: Ao marcar status "Fechado", o sistema cria usuário (Edge Function +
--   Service Role). O frontend chama a função com a Anon Key.
-- =============================================================================

-- Tabela principal: scout_influencer
-- Status: visualizado, contato, negociação, fechado (fechado não aparece no quadro)
CREATE TABLE IF NOT EXISTS scout_influencer (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_artistico    TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'visualizado' CHECK (status IN ('visualizado', 'contato', 'negociacao', 'fechado')),
  -- Contato
  tipo_contato      TEXT CHECK (tipo_contato IN ('agente', 'plataforma', 'direto')),
  nome_agente       TEXT,
  telefone          TEXT,
  cache_negociado   NUMERIC(12,2) DEFAULT 0,
  operadora_slug    TEXT REFERENCES operadoras(slug) ON DELETE SET NULL,
  live_cassino      TEXT CHECK (live_cassino IN ('sim', 'nao') OR live_cassino IS NULL),
  email             TEXT,
  -- Canais (plataformas e links - mesmo padrão da página Influencers)
  plataformas       TEXT[] DEFAULT '{}',
  link_twitch       TEXT,
  link_youtube      TEXT,
  link_kick         TEXT,
  link_instagram    TEXT,
  link_tiktok       TEXT,
  views_twitch      INTEGER,
  views_youtube     INTEGER,
  views_kick        INTEGER,
  views_instagram   INTEGER,
  views_tiktok      INTEGER,
  categorias        TEXT[] DEFAULT '{}', -- Vida Real, Jogos Populares, Variedades, Esportes, Cassino
  -- Vinculado quando fechado (user criado na Gestão de Usuários)
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_scout_influencer_status ON scout_influencer(status);
CREATE INDEX IF NOT EXISTS idx_scout_influencer_nome ON scout_influencer(nome_artistico);
CREATE INDEX IF NOT EXISTS idx_scout_influencer_plataformas ON scout_influencer USING GIN(plataformas);
CREATE INDEX IF NOT EXISTS idx_scout_influencer_user_id ON scout_influencer(user_id);

-- Tabela de anotações
CREATE TABLE IF NOT EXISTS scout_anotacoes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_id     UUID NOT NULL REFERENCES scout_influencer(id) ON DELETE CASCADE,
  usuario_id   UUID REFERENCES auth.users(id),
  texto        TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scout_anotacoes_scout_id ON scout_anotacoes(scout_id);

-- RLS (Row Level Security)
ALTER TABLE scout_influencer ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_anotacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated to manage scout_influencer" ON scout_influencer;
CREATE POLICY "Allow authenticated to manage scout_influencer" ON scout_influencer
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated to manage scout_anotacoes" ON scout_anotacoes;
CREATE POLICY "Allow authenticated to manage scout_anotacoes" ON scout_anotacoes
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Trigger updated_at
CREATE OR REPLACE FUNCTION scout_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS scout_influencer_updated ON scout_influencer;
CREATE TRIGGER scout_influencer_updated
  BEFORE UPDATE ON scout_influencer
  FOR EACH ROW EXECUTE FUNCTION scout_updated_at();
