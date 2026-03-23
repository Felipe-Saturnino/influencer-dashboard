-- ─── roteiro_mesa_sugestoes: sugestões de texto por operadora e bloco ─────────
-- Blocos: abertura, durante_jogo, fechamento
-- Cada operadora pode ter múltiplas sugestões por bloco.

CREATE TABLE roteiro_mesa_sugestoes (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operadora_slug  text        NOT NULL REFERENCES operadoras(slug) ON DELETE CASCADE,
  bloco           text        NOT NULL CHECK (bloco IN ('abertura', 'durante_jogo', 'fechamento')),
  texto           text        NOT NULL,
  ordem           int         NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_roteiro_mesa_sugestoes_operadora_bloco ON roteiro_mesa_sugestoes(operadora_slug, bloco);

COMMENT ON TABLE roteiro_mesa_sugestoes IS 'Sugestões de texto para roteiro de mesa (abertura, durante jogo, fechamento) por operadora.';

ALTER TABLE roteiro_mesa_sugestoes ENABLE ROW LEVEL SECURITY;

-- Admin pode tudo
CREATE POLICY "Admin pode tudo em roteiro_mesa_sugestoes"
  ON roteiro_mesa_sugestoes
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Gestor pode tudo
CREATE POLICY "Gestor pode tudo em roteiro_mesa_sugestoes"
  ON roteiro_mesa_sugestoes
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'gestor')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'gestor')
  );

-- Operador/Executivo: ler e escrever apenas das operadoras do escopo
CREATE POLICY "Operador_executivo leem e escrevem roteiro das suas operadoras"
  ON roteiro_mesa_sugestoes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_scopes
      WHERE user_scopes.user_id = auth.uid()
      AND user_scopes.scope_type = 'operadora'
      AND user_scopes.scope_ref = roteiro_mesa_sugestoes.operadora_slug
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestor', 'executivo'))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_scopes
      WHERE user_scopes.user_id = auth.uid()
      AND user_scopes.scope_type = 'operadora'
      AND user_scopes.scope_ref = roteiro_mesa_sugestoes.operadora_slug
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestor', 'executivo'))
  );
