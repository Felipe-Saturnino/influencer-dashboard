import type { PagamentoStatus } from "../../../types"

// ── Tipos locais ───────────────────────────────────────────────────────────────

export interface PagamentoRow {
  id: string;
  influencer_id: string;
  influencer_name: string;
  operadora_slug?: string;
  horas_realizadas: number;
  cache_hora: number;
  total: number;
  status: PagamentoStatus;
  pago_em: string | null;
  is_agente?: boolean;
  descricao?: string;
  qtd_lives?: number;
  /** `influencer_perfil.status` — ausente em linhas de agente. */
  statusInfluencer?: string | null;
}

export interface FinanceiroLiveRow {
  id: string;
  influencer_id: string;
  operadora_slug?: string | null;
  data?: string;
  plataforma?: string;
}

export interface FinanceiroLiveComResultado extends FinanceiroLiveRow {
  _resultado?: { duracao_horas: number; duracao_min: number };
}

export interface FinanceiroPagamentoParcial {
  influencer_id: string;
  total: number;
  horas_realizadas: number;
  status: string;
  operadora_slug?: string | null;
}

export interface FinanceiroPagamentoDbRow extends FinanceiroPagamentoParcial {
  id: string;
  pago_em?: string | null;
  cache_hora?: number;
}

export interface FinanceiroAgenteDbRow {
  id?: string;
  total: number;
  status: string;
  operadora_slug?: string | null;
  pago_em?: string | null;
  descricao?: string | null;
}

export interface FinanceiroProfileRow {
  id: string;
  name?: string | null;
  email?: string | null;
}

export interface FinanceiroPerfilRow {
  id: string;
  nome_artistico?: string | null;
  status?: string | null;
}

export interface FinanceiroHistoricoPagRow {
  id: string;
  horas_realizadas: number;
  total: number;
  status: PagamentoStatus;
  pago_em?: string | null;
  ciclos_pagamento?: { data_inicio?: string; data_fim?: string } | null;
}

export interface FinanceiroLiveResultadoRow {
  live_id: string | number;
  duracao_horas?: number | null;
  duracao_min?: number | null;
}

export interface FinanceiroPerfilCacheRow {
  id: string;
  cache_hora?: number | null;
  nome_artistico?: string | null;
  status?: string | null;
}

export type FinanceiroLiveEscopoRow = FinanceiroLiveRow & { data: string };

export type FinanceiroPagamentoCicloEscopo = { ciclo_id: string; influencer_id: string; operadora_slug: string };

export type FinanceiroAgenteCicloEscopo = { ciclo_id: string; operadora_slug: string };

