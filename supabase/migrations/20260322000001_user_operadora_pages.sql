-- ─── user_operadora_pages: páginas permitidas por operador × operadora ─────────
-- Operador só vê página X na operadora Y se:
--   1. role_permissions(operador, X) permite view
--   2. Existe (user_id, operadora_slug, page_key) nesta tabela

CREATE TABLE IF NOT EXISTS user_operadora_pages (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operadora_slug  text        NOT NULL REFERENCES operadoras(slug) ON DELETE CASCADE,
  page_key        text        NOT NULL,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (user_id, operadora_slug, page_key)
);

CREATE INDEX IF NOT EXISTS idx_user_operadora_pages_user
  ON user_operadora_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_operadora_pages_operadora
  ON user_operadora_pages(operadora_slug);

COMMENT ON TABLE user_operadora_pages IS 'Páginas que cada operador pode acessar por operadora. Só afeta role=operador.';

-- RLS: apenas admin pode inserir/atualizar/excluir; usuário pode ler os próprios
ALTER TABLE user_operadora_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode tudo em user_operadora_pages"
  ON user_operadora_pages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Usuário pode ler próprias páginas"
  ON user_operadora_pages
  FOR SELECT
  USING (user_id = auth.uid());
