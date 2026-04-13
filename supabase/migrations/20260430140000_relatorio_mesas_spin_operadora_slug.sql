-- Mesas Spin: identificar cada linha pela operadora (slug canônico = operadoras.slug).
-- Backfill: TODO o histórico já existente nestas tabelas = Casa de Apostas (`casa_apostas`).
-- Próximas subidas (Blaze, etc.): inserir com `operadora_slug` correto; não reexecutar o UPDATE abaixo em produção com dados multi-operadora.

-- ── 1. relatorio_daily_summary ───────────────────────────────────────────────
ALTER TABLE public.relatorio_daily_summary
  ADD COLUMN IF NOT EXISTS operadora_slug text;

UPDATE public.relatorio_daily_summary
SET operadora_slug = 'casa_apostas'
WHERE operadora_slug IS NULL;

ALTER TABLE public.relatorio_daily_summary
  ALTER COLUMN operadora_slug SET NOT NULL;

ALTER TABLE public.relatorio_daily_summary
  DROP CONSTRAINT IF EXISTS relatorio_daily_summary_pkey;

ALTER TABLE public.relatorio_daily_summary
  ADD CONSTRAINT relatorio_daily_summary_pkey PRIMARY KEY (data, operadora_slug);

ALTER TABLE public.relatorio_daily_summary
  ADD CONSTRAINT relatorio_daily_summary_operadora_slug_fkey
  FOREIGN KEY (operadora_slug) REFERENCES public.operadoras (slug) ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_relatorio_daily_summary_operadora_slug
  ON public.relatorio_daily_summary (operadora_slug);

COMMENT ON COLUMN public.relatorio_daily_summary.operadora_slug IS 'Operadora dona da linha (FK operadoras.slug).';

-- ── 2. relatorio_monthly_summary ────────────────────────────────────────────
ALTER TABLE public.relatorio_monthly_summary
  ADD COLUMN IF NOT EXISTS operadora_slug text;

UPDATE public.relatorio_monthly_summary
SET operadora_slug = 'casa_apostas'
WHERE operadora_slug IS NULL;

ALTER TABLE public.relatorio_monthly_summary
  ALTER COLUMN operadora_slug SET NOT NULL;

ALTER TABLE public.relatorio_monthly_summary
  DROP CONSTRAINT IF EXISTS relatorio_monthly_summary_pkey;

ALTER TABLE public.relatorio_monthly_summary
  ADD CONSTRAINT relatorio_monthly_summary_pkey PRIMARY KEY (mes, operadora_slug);

ALTER TABLE public.relatorio_monthly_summary
  ADD CONSTRAINT relatorio_monthly_summary_operadora_slug_fkey
  FOREIGN KEY (operadora_slug) REFERENCES public.operadoras (slug) ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_relatorio_monthly_summary_operadora_slug
  ON public.relatorio_monthly_summary (operadora_slug);

COMMENT ON COLUMN public.relatorio_monthly_summary.operadora_slug IS 'Operadora dona da linha (FK operadoras.slug).';

-- ── 3. relatorio_uap_por_jogo ────────────────────────────────────────────────
ALTER TABLE public.relatorio_uap_por_jogo
  ADD COLUMN IF NOT EXISTS operadora_slug text;

UPDATE public.relatorio_uap_por_jogo
SET operadora_slug = 'casa_apostas'
WHERE operadora_slug IS NULL;

ALTER TABLE public.relatorio_uap_por_jogo
  ALTER COLUMN operadora_slug SET NOT NULL;

ALTER TABLE public.relatorio_uap_por_jogo
  DROP CONSTRAINT IF EXISTS relatorio_uap_por_jogo_data_jogo_key;

ALTER TABLE public.relatorio_uap_por_jogo
  ADD CONSTRAINT relatorio_uap_por_jogo_data_jogo_operadora_key UNIQUE (data, jogo, operadora_slug);

ALTER TABLE public.relatorio_uap_por_jogo
  ADD CONSTRAINT relatorio_uap_por_jogo_operadora_slug_fkey
  FOREIGN KEY (operadora_slug) REFERENCES public.operadoras (slug) ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_relatorio_uap_por_jogo_operadora_slug
  ON public.relatorio_uap_por_jogo (operadora_slug);

COMMENT ON COLUMN public.relatorio_uap_por_jogo.operadora_slug IS 'Operadora dona da linha (FK operadoras.slug).';

-- ── 4. relatorio_por_tabela ──────────────────────────────────────────────────
ALTER TABLE public.relatorio_por_tabela
  ADD COLUMN IF NOT EXISTS operadora_slug text;

-- Histórico 100% Casa de Apostas (não inferir slug pelo texto — evita marcar blaze/outros por engano).
UPDATE public.relatorio_por_tabela
SET operadora_slug = 'casa_apostas'
WHERE operadora_slug IS NULL;

-- Se após unificar slug houver duas linhas com o mesmo (dia, operadora_slug, mesa), mantém uma (ctid mínimo).
DELETE FROM public.relatorio_por_tabela a
WHERE a.ctid NOT IN (
  SELECT min(r.ctid)
  FROM public.relatorio_por_tabela r
  GROUP BY r.dia, r.operadora_slug, r.mesa
);

ALTER TABLE public.relatorio_por_tabela
  ALTER COLUMN operadora_slug SET NOT NULL;

ALTER TABLE public.relatorio_por_tabela
  DROP CONSTRAINT IF EXISTS relatorio_por_tabela_dia_operadora_mesa_key;

ALTER TABLE public.relatorio_por_tabela
  ADD CONSTRAINT relatorio_por_tabela_dia_operadora_slug_mesa_key UNIQUE (dia, operadora_slug, mesa);

ALTER TABLE public.relatorio_por_tabela
  ADD CONSTRAINT relatorio_por_tabela_operadora_slug_fkey
  FOREIGN KEY (operadora_slug) REFERENCES public.operadoras (slug) ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_relatorio_por_tabela_operadora_slug
  ON public.relatorio_por_tabela (operadora_slug);

COMMENT ON COLUMN public.relatorio_por_tabela.operadora IS 'Rótulo/texto da origem do dado (ex.: Casa de Apostas, Blaze).';
COMMENT ON COLUMN public.relatorio_por_tabela.operadora_slug IS 'Identificação canônica da operadora (FK operadoras.slug).';
