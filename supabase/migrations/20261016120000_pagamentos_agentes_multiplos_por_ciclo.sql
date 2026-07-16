-- Financeiro: permitir vários pagamentos de agente no mesmo ciclo (e na mesma operadora).
-- Remove UNIQUE (ciclo_id, operadora_slug) — cada linha é identificada por id + descricao (nome do agente).

ALTER TABLE public.pagamentos_agentes
  DROP CONSTRAINT IF EXISTS pagamentos_agentes_ciclo_operadora_key;

CREATE INDEX IF NOT EXISTS idx_pagamentos_agentes_ciclo
  ON public.pagamentos_agentes (ciclo_id);

COMMENT ON TABLE public.pagamentos_agentes IS
  'Pagamentos a agentes/agências por ciclo. Vários registros por ciclo e operadora; nome em descricao.';
