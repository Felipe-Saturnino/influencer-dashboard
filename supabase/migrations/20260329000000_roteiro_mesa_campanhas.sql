-- ─── roteiro_mesa_campanhas: campanhas promocionais para anunciar na mesa ─────
-- Campanhas temporárias ou permanentes que o dealer deve anunciar (ex: cashback, promoções).

CREATE TABLE roteiro_mesa_campanhas (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operadora_slug  text        NOT NULL REFERENCES operadoras(slug) ON DELETE CASCADE,
  titulo          text        NOT NULL,
  texto           text        NOT NULL,
  jogos           text[]      DEFAULT '{todos}',
  data_inicio     date,
  data_fim        date,
  ativo           boolean     NOT NULL DEFAULT true,
  ordem           int         NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_roteiro_mesa_campanhas_operadora ON roteiro_mesa_campanhas(operadora_slug);
CREATE INDEX idx_roteiro_mesa_campanhas_ativo ON roteiro_mesa_campanhas(ativo) WHERE ativo = true;

COMMENT ON TABLE roteiro_mesa_campanhas IS 'Campanhas promocionais para anunciar na mesa (ex: cashback, promoções) por operadora.';

ALTER TABLE roteiro_mesa_campanhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode tudo em roteiro_mesa_campanhas"
  ON roteiro_mesa_campanhas FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Gestor pode tudo em roteiro_mesa_campanhas"
  ON roteiro_mesa_campanhas FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'gestor'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'gestor'));

CREATE POLICY "Operador_executivo leem e escrevem campanhas das suas operadoras"
  ON roteiro_mesa_campanhas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_scopes
      WHERE user_scopes.user_id = auth.uid()
      AND user_scopes.scope_type = 'operadora'
      AND user_scopes.scope_ref = roteiro_mesa_campanhas.operadora_slug
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestor', 'executivo'))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_scopes
      WHERE user_scopes.user_id = auth.uid()
      AND user_scopes.scope_type = 'operadora'
      AND user_scopes.scope_ref = roteiro_mesa_campanhas.operadora_slug
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gestor', 'executivo'))
  );
