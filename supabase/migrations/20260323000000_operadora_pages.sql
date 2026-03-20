-- ─── operadora_pages: páginas permitidas por operadora (não por usuário) ─────
-- Todos os operadores com escopo na operadora Blaze veem as mesmas páginas.
-- Substitui user_operadora_pages.

DROP TABLE IF EXISTS user_operadora_pages;

CREATE TABLE operadora_pages (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operadora_slug  text        NOT NULL REFERENCES operadoras(slug) ON DELETE CASCADE,
  page_key        text        NOT NULL,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (operadora_slug, page_key)
);

CREATE INDEX idx_operadora_pages_slug ON operadora_pages(operadora_slug);

COMMENT ON TABLE operadora_pages IS 'Páginas que operadores de cada operadora podem acessar. Todos os operadores da mesma operadora veem o mesmo menu.';

ALTER TABLE operadora_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode tudo em operadora_pages"
  ON operadora_pages
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Operador pode ler páginas das suas operadoras"
  ON operadora_pages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_scopes
      WHERE user_scopes.user_id = auth.uid()
      AND user_scopes.scope_type = 'operadora'
      AND user_scopes.scope_ref = operadora_pages.operadora_slug
    )
  );
