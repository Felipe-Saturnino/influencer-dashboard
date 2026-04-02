-- Exemplo: colar no Supabase → SQL Editor (após aplicar a migração da tabela).
-- Uma linha por (data, jogo). Valores de `jogo` reconhecidos no gráfico:
--   'Blackjack', 'Roleta', 'Speed Baccarat' (texto exatamente assim).

-- UPSERT (recomendado ao reimportar o mesmo dia)
INSERT INTO public.relatorio_uap_por_jogo (data, jogo, uap)
VALUES
  ('2025-12-01'::date, 'Blackjack', 11),
  ('2025-12-01'::date, 'Roleta', 14),
  ('2025-12-01'::date, 'Speed Baccarat', 5)
ON CONFLICT (data, jogo) DO UPDATE SET
  uap = EXCLUDED.uap,
  updated_at = now();

-- Inserção simples (falha se já existir a mesma data+jogo)
-- INSERT INTO public.relatorio_uap_por_jogo (data, jogo, uap)
-- VALUES ('2025-12-02'::date, 'Blackjack', 17);
