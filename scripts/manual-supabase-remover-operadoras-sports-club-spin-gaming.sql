-- =============================================================================
-- Remover operadoras incorretas: Sports Club / Sports Clube e Spin Gaming
-- =============================================================================
-- Contexto (business.mdc): Sports Club é ESTÚDIO network, não operadora parceira.
-- Spin Gaming é a marca/plataforma — não deve constar como operadora parceira
-- ao lado de Blaze, Casa de Apostas, etc.
--
-- Onde executar: SQL Editor do Supabase (recomendado: role postgres / service).
--
-- Fluxo:
--   1) Execute só a seção «PREVIEW» e confira slugs + contagens.
--   2) Ajuste a lista em `_op_alvo` se os slugs forem diferentes no seu ambiente.
--   3) Execute a seção «DELETE» dentro da transação (BEGIN … COMMIT).
--
-- Revogar: não há undo automático — faça backup ou export se houver dúvida.
-- =============================================================================

-- ─── PREVIEW: slugs reais na base ───────────────────────────────────────────

SELECT slug, nome, ativo, created_at
FROM public.operadoras
WHERE slug IN ('sports_club', 'sports_clube', 'spin_gaming')
   OR lower(trim(nome)) IN ('sports club', 'sports clube', 'spin gaming')
   OR lower(nome) LIKE '%sports club%'
   OR lower(nome) LIKE '%sports clube%'
   OR lower(nome) LIKE '%spin gaming%'
ORDER BY slug;

-- ─── PREVIEW: montar lista alvo (ajuste manualmente se necessário) ───────────

DROP TABLE IF EXISTS _op_alvo;
CREATE TEMP TABLE _op_alvo (slug text PRIMARY KEY);

INSERT INTO _op_alvo (slug)
SELECT o.slug
FROM public.operadoras o
WHERE o.slug IN ('sports_club', 'sports_clube', 'spin_gaming')
   OR lower(trim(o.nome)) IN ('sports club', 'sports clube', 'spin gaming')
ON CONFLICT DO NOTHING;

-- Conferir quantos slugs entraram (deve ser 2; se 0, pare e corrija o INSERT acima)
SELECT * FROM _op_alvo ORDER BY slug;

-- ─── PREVIEW: vínculos por tabela ───────────────────────────────────────────

SELECT 'mesas_spin_cadastro' AS tabela, count(*) AS linhas
FROM public.mesas_spin_cadastro m
WHERE m.operadora_slug IN (SELECT slug FROM _op_alvo)
UNION ALL
SELECT 'mesas_spin_operadora_identificacao', count(*)
FROM public.mesas_spin_operadora_identificacao i
WHERE i.operadora_slug IN (SELECT slug FROM _op_alvo)
UNION ALL
SELECT 'estudios_spin_operadoras (só vínculo N:N)', count(*)
FROM public.estudios_spin_operadoras j
WHERE j.operadora_slug IN (SELECT slug FROM _op_alvo)
UNION ALL
SELECT 'relatorio_daily_summary', count(*)
FROM public.relatorio_daily_summary r
WHERE r.operadora_slug IN (SELECT slug FROM _op_alvo)
UNION ALL
SELECT 'relatorio_monthly_summary', count(*)
FROM public.relatorio_monthly_summary r
WHERE r.operadora_slug IN (SELECT slug FROM _op_alvo)
UNION ALL
SELECT 'relatorio_uap_por_jogo', count(*)
FROM public.relatorio_uap_por_jogo r
WHERE r.operadora_slug IN (SELECT slug FROM _op_alvo)
UNION ALL
SELECT 'relatorio_por_tabela', count(*)
FROM public.relatorio_por_tabela r
WHERE r.operadora_slug IN (SELECT slug FROM _op_alvo)
UNION ALL
SELECT 'lobby_monitor_execucao', count(*)
FROM public.lobby_monitor_execucao e
WHERE e.operadora_slug IN (SELECT slug FROM _op_alvo)
UNION ALL
SELECT 'lobby_monitor_posicao', count(*)
FROM public.lobby_monitor_posicao p
WHERE p.operadora_slug IN (SELECT slug FROM _op_alvo)
UNION ALL
SELECT 'rh_figurino_peca_operadoras', count(*)
FROM public.rh_figurino_peca_operadoras f
WHERE f.operadora_slug IN (SELECT slug FROM _op_alvo)
UNION ALL
SELECT 'banca_jogo_solicitacoes', count(*)
FROM public.banca_jogo_solicitacoes b
WHERE b.operadora_slug IN (SELECT slug FROM _op_alvo)
UNION ALL
SELECT 'influencer_metricas', count(*)
FROM public.influencer_metricas im
WHERE im.operadora_slug IN (SELECT slug FROM _op_alvo)
UNION ALL
SELECT 'influencer_operadoras', count(*)
FROM public.influencer_operadoras io
WHERE io.operadora_slug IN (SELECT slug FROM _op_alvo)
UNION ALL
SELECT 'campanhas', count(*)
FROM public.campanhas c
WHERE c.operadora_slug IN (SELECT slug FROM _op_alvo)
UNION ALL
SELECT 'operadora_pages', count(*)
FROM public.operadora_pages op
WHERE op.operadora_slug IN (SELECT slug FROM _op_alvo)
UNION ALL
SELECT 'user_scopes (operadora)', count(*)
FROM public.user_scopes s
WHERE s.scope_type = 'operadora'
  AND s.scope_ref IN (SELECT slug FROM _op_alvo)
ORDER BY tabela;

-- =============================================================================
-- DELETE — execute este bloco INTEIRO de uma vez (BEGIN … COMMIT)
-- =============================================================================
-- Se deu erro 23503 em mesas_spin_cadastro, é porque faltou apagar as mesas antes.
-- Não rode só «DELETE FROM operadoras» — use sempre o bloco completo abaixo.

BEGIN;

-- Slugs alvo (ajuste se o PREVIEW acima mostrar outros)
DROP TABLE IF EXISTS _op_alvo;
CREATE TEMP TABLE _op_alvo (slug text PRIMARY KEY);

INSERT INTO _op_alvo (slug) VALUES
  ('sports_club'),
  ('sports_clube'),
  ('spin_gaming')
ON CONFLICT DO NOTHING;

-- Garante slugs que existem na base (por nome também)
INSERT INTO _op_alvo (slug)
SELECT o.slug
FROM public.operadoras o
WHERE lower(trim(o.nome)) IN ('sports club', 'sports clube', 'spin gaming')
ON CONFLICT DO NOTHING;

-- Conferência: deve listar 1–2 slugs (ex.: sports_club, spin_gaming)
SELECT 'Alvos' AS passo, slug FROM _op_alvo ORDER BY slug;

-- 1) Mesas — OBRIGATÓRIO antes de apagar operadoras (FK RESTRICT)
DELETE FROM public.mesas_spin_operadora_identificacao i
WHERE i.operadora_slug IN (SELECT slug FROM _op_alvo)
   OR i.mesa_id IN (
     SELECT m.id FROM public.mesas_spin_cadastro m
     WHERE m.operadora_slug IN (SELECT slug FROM _op_alvo)
   );

DELETE FROM public.mesas_spin_cadastro m
WHERE m.operadora_slug IN (SELECT slug FROM _op_alvo);

-- Sanity: deve ser 0
SELECT 'mesas restantes' AS passo, count(*) AS n
FROM public.mesas_spin_cadastro m
WHERE m.operadora_slug IN (SELECT slug FROM _op_alvo);

-- 2) Estúdios — só vínculo N:N
DELETE FROM public.estudios_spin_operadoras j
WHERE j.operadora_slug IN (SELECT slug FROM _op_alvo);

-- 3) Relatórios Mesas Spin
DELETE FROM public.relatorio_por_tabela r
WHERE r.operadora_slug IN (SELECT slug FROM _op_alvo);

DELETE FROM public.relatorio_uap_por_jogo r
WHERE r.operadora_slug IN (SELECT slug FROM _op_alvo);

DELETE FROM public.relatorio_monthly_summary r
WHERE r.operadora_slug IN (SELECT slug FROM _op_alvo);

DELETE FROM public.relatorio_daily_summary r
WHERE r.operadora_slug IN (SELECT slug FROM _op_alvo);

-- 4) Lobby monitor
DELETE FROM public.lobby_monitor_posicao p
WHERE p.operadora_slug IN (SELECT slug FROM _op_alvo);

DELETE FROM public.lobby_monitor_execucao e
WHERE e.operadora_slug IN (SELECT slug FROM _op_alvo);

-- 5) Figurinos RH
DELETE FROM public.rh_figurino_peca_operadoras f
WHERE f.operadora_slug IN (SELECT slug FROM _op_alvo);

-- 6) Aquisição / influencers
DELETE FROM public.banca_jogo_solicitacoes b
WHERE b.operadora_slug IN (SELECT slug FROM _op_alvo);

DELETE FROM public.influencer_metricas im
WHERE im.operadora_slug IN (SELECT slug FROM _op_alvo);

DELETE FROM public.influencer_operadoras io
WHERE io.operadora_slug IN (SELECT slug FROM _op_alvo);

UPDATE public.campanhas c
SET operadora_slug = NULL,
    updated_at = now()
WHERE c.operadora_slug IN (SELECT slug FROM _op_alvo);

DELETE FROM public.user_scopes s
WHERE s.scope_type = 'operadora'
  AND s.scope_ref IN (SELECT slug FROM _op_alvo);

-- 7) Operadoras (só depois das mesas)
DELETE FROM public.operadoras o
WHERE o.slug IN (SELECT slug FROM _op_alvo)
RETURNING o.slug, o.nome;

COMMIT;

-- Conferência pós-commit (0 linhas)
SELECT slug, nome FROM public.operadoras
WHERE slug IN ('sports_club', 'sports_clube', 'spin_gaming');

-- =============================================================================
-- Bloco legado comentado (substituído pelo DELETE acima)
-- =============================================================================
/*
BEGIN;
...
COMMIT;
*/

-- =============================================================================
-- Próximo passo no app (após limpar):
--   1) Gestão de Estúdios → aba Estúdios → Novo Estúdio «Sports Club» (tipo Network)
--   2) Vincular operadoras parceiras reais (Blaze, Casa de Apostas, …)
--   3) Cadastrar mesas na aba Mesas escolhendo o estúdio
-- =============================================================================
