import type { CicloPagamento, Role } from "../../../types"
import { ROLES_GESTOR_DEPARTAMENTO } from "../../../lib/staffRoles"
import { MESES_NOMES } from "./financeiroConstants"

// ── Helpers ────────────────────────────────────────────────────────────────────

export function gerarMeses(): { value: string; label: string }[] {
  const lista: { value: string; label: string }[] = [{ value: "", label: "Total" }];
  const agora = new Date();
  const inicio = new Date(2025, 11, 1); // Dez/2025
  const cur = new Date(agora.getFullYear(), agora.getMonth(), 1);
  while (cur >= inicio) {
    lista.push({
      value: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`,
      label: `${MESES_NOMES[cur.getMonth()]} ${cur.getFullYear()}`,
    });
    cur.setMonth(cur.getMonth() - 1);
  }
  return lista;
}

export function periodoDoMes(mes: string): { inicio: string; fim: string } | null {
  if (!mes) return null;
  const [ano, m] = mes.split("-").map(Number);
  const ultimo = new Date(ano, m, 0).getDate();
  return { inicio: `${mes}-01`, fim: `${mes}-${String(ultimo).padStart(2, "0")}` };
}

/** Retorna o ciclo (quinta a quarta) ao qual uma data pertence */
export function cicloSemanalParaData(dataStr: string): { data_inicio: string; data_fim: string } | null {
  if (!dataStr || dataStr.length < 10) return null;
  const d = new Date(dataStr + "T12:00:00");
  if (isNaN(d.getTime())) return null;
  const day = d.getDay();
  const diff = day >= 4 ? day - 4 : day + 3;
  const quinta = new Date(d);
  quinta.setDate(quinta.getDate() - diff);
  const quarta = new Date(quinta);
  quarta.setDate(quarta.getDate() + 6);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (x: Date) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
  return { data_inicio: fmt(quinta), data_fim: fmt(quarta) };
}

/** Gera ciclos semanais (qui–qua) de uma data inicial até N semanas à frente */
export function gerarCiclosProativos(desdeData: Date, semanasAhead: number): { data_inicio: string; data_fim: string }[] {
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (x: Date) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
  const day = desdeData.getDay();
  const diff = day >= 4 ? day - 4 : day + 3;
  const primeiraQuinta = new Date(desdeData);
  primeiraQuinta.setDate(desdeData.getDate() - diff);
  const ciclos: { data_inicio: string; data_fim: string }[] = [];
  for (let i = 0; i < semanasAhead; i++) {
    const quinta = new Date(primeiraQuinta);
    quinta.setDate(primeiraQuinta.getDate() + i * 7);
    const quarta = new Date(quinta);
    quarta.setDate(quinta.getDate() + 6);
    ciclos.push({ data_inicio: fmt(quinta), data_fim: fmt(quarta) });
  }
  return ciclos;
}

export function cicloAberto(ciclo: CicloPagamento): boolean {
  if (ciclo.fechado_em) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fim = new Date(ciclo.data_fim + "T00:00:00");
  return hoje <= fim;
}

/** Só perfis de operação interna veem `pagamentos_agentes` (influencer e agência: apenas pagamentos dos influencers da gestão). */
export const ROLES_VER_PAGAMENTO_AGENTE: readonly Role[] = [
  "admin",
  ...ROLES_GESTOR_DEPARTAMENTO,
  "executivo",
  "operador",
  "shift_leader",
  "service_manager",
  "customer_service",
  "game_presenter",
  "shuffler",
  "tech_ops",
  "figurino",
  "comunicacao",
  "performance_coach",
  "rh",
];

export function podeVerPagamentosAgenteFinanceiro(role: string | undefined): boolean {
  return !!role && (ROLES_VER_PAGAMENTO_AGENTE as readonly string[]).includes(role);
}

/** Rótulo curto para select de ciclos (ex.: 18/03 – 24/03/26). */
export function fmtCicloDatas(inicio: string, fim: string): string {
  if (!inicio || !fim || inicio.length < 10 || fim.length < 10) return `${inicio} – ${fim}`;
  const fmt = (s: string) => {
    const [, m, d] = s.split("-");
    return `${d}/${m}`;
  };
  const anoFim = fim.split("-")[0] ?? "";
  return `${fmt(inicio)} – ${fmt(fim)}/${anoFim.slice(2)}`;
}

export function mesCalendarioDeHoje(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function yyyymmFromDateStr(yyyyMmDd: string): string {
  if (!yyyyMmDd || yyyyMmDd.length < 7) return "";
  return yyyyMmDd.slice(0, 7);
}

/** Meses (yyyy-mm) posteriores ao mês de referência até fimYm (inclusive), em ordem decrescente — ex.: ciclo que termina em abril enquanto estamos em março → ["2026-04"]. */
export function mesesPosterioresAoMesAtualAte(fimYm: string, mesReferenciaYm: string): string[] {
  if (!fimYm || !mesReferenciaYm || fimYm <= mesReferenciaYm) return [];
  const r: string[] = [];
  let y = Number(fimYm.slice(0, 4));
  let m = Number(fimYm.slice(5, 7));
  while (true) {
    const curYm = `${y}-${String(m).padStart(2, "0")}`;
    if (curYm <= mesReferenciaYm) break;
    r.push(curYm);
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }
  return r;
}

/** Lista do carrossel: meses passados + atual (gerarMeses) e, se o ciclo aberto terminar em mês futuro, esses meses aparecem à frente (índice 0 = mais “à frente” no calendário). */
export function opcoesMesesDoCarrossel(ciclos: CicloPagamento[]): { value: string; label: string }[] {
  const base = gerarMeses().slice(1);
  const refYm = mesCalendarioDeHoje();
  const aberto = ciclos.find((c) => cicloAberto(c));
  const fimYm = aberto?.data_fim ? yyyymmFromDateStr(aberto.data_fim) : "";
  const extrasYm = fimYm ? mesesPosterioresAoMesAtualAte(fimYm, refYm) : [];
  const extraOpcoes = extrasYm.map((value) => ({
    value,
    label: `${MESES_NOMES[Number(value.slice(5, 7)) - 1]} ${value.slice(0, 4)}`,
  }));
  const seen = new Set(extraOpcoes.map((o) => o.value));
  const merged: { value: string; label: string }[] = [...extraOpcoes];
  for (const o of base) {
    if (!seen.has(o.value)) {
      seen.add(o.value);
      merged.push(o);
    }
  }
  return merged;
}
