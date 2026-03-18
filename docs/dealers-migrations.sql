-- =============================================================================
-- Dealers: Tabelas para Gestão de Dealers (Operações)
-- Execute no SQL Editor do Supabase
--
-- IMPORTANTE: As permissões de acesso (quem pode ver, criar, editar, excluir)
-- são configuradas na página Gestão de Usuários > Aba Permissões.
-- Não execute migrations SQL para role_permissions — use sempre a interface.
-- =============================================================================

-- Tabela principal: dealers
CREATE TABLE IF NOT EXISTS dealers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_real         TEXT NOT NULL,
  nickname          TEXT NOT NULL,
  fotos             TEXT[] DEFAULT '{}',           -- URLs das fotos (Supabase Storage)
  genero            TEXT NOT NULL CHECK (genero IN ('feminino', 'masculino')),
  turno             TEXT NOT NULL CHECK (turno IN ('manha', 'tarde', 'noite')),
  jogos             TEXT[] NOT NULL DEFAULT '{}',   -- blackjack, roleta, baccarat, mesa_vip
  operadora_slug    TEXT REFERENCES operadoras(slug) ON DELETE SET NULL,  -- NULL = sem operadora
  perfil_influencer TEXT,
  status            TEXT DEFAULT 'aprovado' CHECK (status IN ('aprovado', 'pendente')),
  vip              BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_dealers_genero ON dealers(genero);
CREATE INDEX IF NOT EXISTS idx_dealers_turno ON dealers(turno);
CREATE INDEX IF NOT EXISTS idx_dealers_operadora ON dealers(operadora_slug);
CREATE INDEX IF NOT EXISTS idx_dealers_jogos ON dealers USING GIN(jogos);
CREATE INDEX IF NOT EXISTS idx_dealers_nickname ON dealers(nickname);

-- Tabela de observações dos dealers
CREATE TABLE IF NOT EXISTS dealer_observacoes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id    UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  usuario_id   UUID REFERENCES auth.users(id),
  texto        TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dealer_observacoes_dealer_id ON dealer_observacoes(dealer_id);

-- RLS
ALTER TABLE dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_observacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated to manage dealers" ON dealers;
CREATE POLICY "Allow authenticated to manage dealers" ON dealers
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated to manage dealer_observacoes" ON dealer_observacoes;
CREATE POLICY "Allow authenticated to manage dealer_observacoes" ON dealer_observacoes
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Trigger updated_at
CREATE OR REPLACE FUNCTION dealers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS dealers_updated_at_trigger ON dealers;
CREATE TRIGGER dealers_updated_at_trigger
  BEFORE UPDATE ON dealers
  FOR EACH ROW EXECUTE FUNCTION dealers_updated_at();

-- =============================================================================
-- Storage: Bucket para fotos dos dealers
-- Execute no SQL Editor (Supabase suporta storage.objects)
-- Se der erro, crie o bucket manualmente em Storage > New bucket:
--   - Nome: dealer-photos
--   - Public: Sim
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dealer-photos',
  'dealer-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Política: usuários autenticados podem fazer upload
DROP POLICY IF EXISTS "Allow authenticated upload dealer photos" ON storage.objects;
CREATE POLICY "Allow authenticated upload dealer photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'dealer-photos' AND auth.role() = 'authenticated'
  );

-- Política: leitura pública (fotos são exibidas na interface)
DROP POLICY IF EXISTS "Public read dealer photos" ON storage.objects;
CREATE POLICY "Public read dealer photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'dealer-photos');

-- Política: usuários autenticados podem atualizar/deletar (para edição)
DROP POLICY IF EXISTS "Allow authenticated update dealer photos" ON storage.objects;
CREATE POLICY "Allow authenticated update dealer photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'dealer-photos' AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Allow authenticated delete dealer photos" ON storage.objects;
CREATE POLICY "Allow authenticated delete dealer photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'dealer-photos' AND auth.role() = 'authenticated'
  );
