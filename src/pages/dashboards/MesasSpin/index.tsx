import { useState, useEffect, useMemo, useCallback } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import { fetchAllPages } from "../../../lib/supabasePaginate";
import { MesasSpinRelatorioUpload } from "../../../components/MesasSpinRelatorioUpload";
import KpiCard from "../../../components/dashboard/KpiCard";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  LayoutGrid,
  Table2,
  FileImage,
  Wallet,
  TrendingUp,
  ListOrdered,
  Percent,
  ChartColumnBig,
  Users,
  Coins,
} from "lucide-react";
import { GiCalendar, GiShield } from "react-icons/gi";

/** ─── Schema v2 (relatorio_* após migração 20260420100000): daily sem operadora; monthly só UAP+ARPU; por_tabela com dia + operadora/mesa texto. */

const BRAND = {
  roxo: "#4a2082",
  roxoVivo: "#7c3aed",
  azul: "#1e36f8",
  vermelho: "#e84025",
  verde: "#22c55e",
  ciano: "#70cae4",
  amarelo: "#f59e0b",
  rosa: "#ec4899",
} as const;

interface DailyRow {
  data: string;
  turnover: number | null;
  ggr: number | null;
  /** v2: coluna `apostas`; UI antiga usava `bets` */
  bets: number | null;
  uap: number | null;
  margin_pct: number | null;
  bet_size: number | null;
  arpu: number | null;
}

interface MonthlyRow {
  mes: string;
  turnover: number | null;
  ggr: number | null;
  margin_pct: number | null;
  bets: number | null;
  uap: number | null;
  bet_size: number | null;
  arpu: number | null;
}

/** Linha enriquecida da tabela de detalhe (diário ou mensal/histórico). */
type LinhaDetalheTab = Pick<DailyRow, "turnover" | "ggr" | "bets" | "uap"> & {
  label: string;
  margin_pct: number | null;
  bet_size: number | null;
  arpu: number | null;
};

interface PorTabelaRow {
  data_relatorio: string;
  nome_tabela: string;
  operadora: string | null;
  ggr_d1: number | null;
  turnover_d1: number | null;
  bets_d1: number | null;
  ggr_d2: number | null;
  turnover_d2: number | null;
  bets_d2: number | null;
  ggr_mtd: number | null;
  turnover_mtd: number | null;
  bets_mtd: number | null;
}

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function getMesesDisponiveis() {
  const hoje = new Date();
  const lista: { ano: number; mes: number; label: string }[] = [];
  let ano = 2024,
    mes = 0;
  while (ano < hoje.getFullYear() || (ano === hoje.getFullYear() && mes <= hoje.getMonth())) {
    lista.push({ ano, mes, label: `${MESES_PT[mes]} ${ano}` });
    mes++;
    if (mes > 11) {
      mes = 0;
      ano++;
    }
  }
  return lista;
}

function getDatasDoMes(ano: number, mes: number) {
  return { inicio: fmt(new Date(ano, mes, 1)), fim: fmt(new Date(ano, mes + 1, 0)) };
}

const OPERADORA_CASA_APOSTAS = "casa_apostas";
const EXIBICAO_OPERADORA_CASA_APOSTAS = "Casa de Aposta";
const OPERADORA_OUTRAS = "outras_mesas";

function slugFromRelatorioOperadora(operadoraRaw: string): string {
  const t = operadoraRaw.trim().toLowerCase();
  if (t.includes("casa de apostas")) return OPERADORA_CASA_APOSTAS;
  if (t.includes("bet nacional")) return "bet_nacional";
  const slug = t.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  return slug.length > 0 ? slug : OPERADORA_OUTRAS;
}

/** v2: reconstrói nome completo tipo print para heurísticas CDA + exibição. */
function syntheticNomeTabela(operadora: string, mesa: string): string {
  const op = operadora.trim();
  const m = mesa.trim();
  if (!op) return m;
  return `${op} ${m}`;
}

function mapPorTabelaV2(r: {
  dia: string;
  operadora: string;
  mesa: string;
  ggr: number | null;
  turnover: number | null;
  apostas: number | null;
}): PorTabelaRow {
  const nome = syntheticNomeTabela(r.operadora, r.mesa);
  return {
    data_relatorio: r.dia,
    nome_tabela: nome,
    operadora: slugFromRelatorioOperadora(r.operadora),
    ggr_d1: r.ggr != null ? Number(r.ggr) : null,
    turnover_d1: r.turnover != null ? Number(r.turnover) : null,
    bets_d1: r.apostas != null ? Number(r.apostas) : null,
    ggr_d2: null,
    turnover_d2: null,
    bets_d2: null,
    ggr_mtd: null,
    turnover_mtd: null,
    bets_mtd: null,
  };
}

function canonicalMesaCasaAposta(nomeTabela: string): string | null {
  const t = nomeTabela.trim();
  const pares: readonly (readonly [RegExp, string])[] = [
    [/^casa de apostas?\s+vip\s+blackjack\s+1\s*$/i, "Blackjack VIP"],
    [/^casa de apostas?\s+blackjack\s+1\s*$/i, "Blackjack 1"],
    [/^casa de apostas?\s+blackjack\s+2\s*$/i, "Blackjack 2"],
    [/^casa de apostas?\s+speed\s+baccarat\s*$/i, "Speed Baccarat"],
    [/^casa de apostas?\s+roulette\s*$/i, "Roleta"],
    [/^casa de apostas?\s+r(o|ou)leta\s*$/i, "Roleta"],
  ];
  for (const [re, mesa] of pares) {
    if (re.test(t)) return mesa;
  }
  return null;
}

function nomeMesaCdaCurto(nomeTabela: string): string {
  const s = nomeTabela.replace(/^casa de apostas?\s+/i, "").trim();
  return s.length > 0 ? s : nomeTabela.trim();
}

function isMesaCasaApostas(row: PorTabelaRow): boolean {
  if (row.operadora === OPERADORA_CASA_APOSTAS) return true;
  if (row.operadora != null && row.operadora !== OPERADORA_OUTRAS) return false;
  return /^casa de apostas?\b/i.test(row.nome_tabela);
}

function slugOperadoraPorLinha(row: PorTabelaRow): string {
  if (row.operadora != null && String(row.operadora).length > 0) return row.operadora;
  if (isMesaCasaApostas(row)) return OPERADORA_CASA_APOSTAS;
  return OPERADORA_OUTRAS;
}

function nomeMesaParaExibicao(
  row: PorTabelaRow,
  slug: string,
  operadorasList: { slug: string; nome: string }[],
): string {
  const canon = canonicalMesaCasaAposta(row.nome_tabela);
  if (canon != null) return canon;

  const op = operadorasList.find((o) => o.slug === slug);
  if (op) {
    const nt = row.nome_tabela.trim();
    if (nt.toLowerCase().startsWith(op.nome.toLowerCase())) {
      const rest = nt.slice(op.nome.length).replace(/^\s+/, "").trim();
      if (rest.length > 0) return rest;
    }
  }
  if (slug === OPERADORA_CASA_APOSTAS || isMesaCasaApostas(row)) return nomeMesaCdaCurto(row.nome_tabela);
  return row.nome_tabela.trim();
}

function nomeTituloOperadora(slug: string, operadorasList: { slug: string; nome: string }[]): string {
  if (slug === OPERADORA_OUTRAS) return "Outras mesas";
  if (slug === OPERADORA_CASA_APOSTAS) return EXIBICAO_OPERADORA_CASA_APOSTAS;
  const o = operadorasList.find((x) => x.slug === slug);
  return o?.nome ?? slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function filtrarPorEscopoOperadora(
  rows: PorTabelaRow[],
  filtroOperadora: string,
  operadoraSlugsForcado: string[] | null,
  podeVerOperadoraFn: (s: string) => boolean,
): PorTabelaRow[] {
  const slugsFixos = operadoraSlugsForcado?.length ? operadoraSlugsForcado : null;
  const slugsEscolha = !slugsFixos && filtroOperadora !== "todas" ? [filtroOperadora] : null;
  const permitir = slugsFixos ?? slugsEscolha;
  return rows.filter((r) => {
    const slug = slugOperadoraPorLinha(r);
    if (!podeVerOperadoraFn(slug)) return false;
    if (permitir && !permitir.includes(slug)) return false;
    return true;
  });
}

function agruparPorSlug(rows: PorTabelaRow[]): Map<string, PorTabelaRow[]> {
  const m = new Map<string, PorTabelaRow[]>();
  for (const r of rows) {
    const slug = slugOperadoraPorLinha(r);
    if (!m.has(slug)) m.set(slug, []);
    m.get(slug)!.push(r);
  }
  return m;
}

function ordenarSlugs(slugs: string[], operadorasList: { slug: string; nome: string }[]): string[] {
  return [...slugs].sort((a, b) =>
    nomeTituloOperadora(a, operadorasList).localeCompare(nomeTituloOperadora(b, operadorasList), "pt-BR"),
  );
}

function addDaysIso(isoYmd: string, delta: number): string {
  const [y, m, d] = isoYmd.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, (d ?? 1) + delta);
  return fmt(dt);
}

function fmtDataPtBr(isoYmd: string): string {
  return new Date(isoYmd + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtBRL(v: number) {
  const sign = v < 0 ? "-" : "";
  return sign + Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtPct(v: number | null) {
  if (v == null) return "—";
  return `${Number(v).toFixed(1)}%`;
}

type MonthlyKpiSnapshot = {
  turnover: number | null;
  ggr: number | null;
  margin_pct: number | null;
  bets: number | null;
  uap: number | null;
  bet_size: number | null;
  arpu: number | null;
};

/** Agrega linhas do detalhamento diário (somas + margem, aposta média e ARPU derivados). */
function aggDailyMesKpi(rows: DailyRow[]): MonthlyKpiSnapshot | null {
  if (rows.length === 0) return null;
  let turnover = 0;
  let ggr = 0;
  let bets = 0;
  let uap = 0;
  for (const r of rows) {
    turnover += Number(r.turnover ?? 0);
    ggr += Number(r.ggr ?? 0);
    bets += Number(r.bets ?? 0);
    uap += Number(r.uap ?? 0);
  }
  const margin_pct = turnover !== 0 ? (ggr / turnover) * 100 : null;
  const bet_size = bets !== 0 ? turnover / bets : null;
  const arpu = uap !== 0 ? ggr / uap : null;
  return {
    turnover,
    ggr,
    margin_pct,
    bets,
    uap: uap || null,
    bet_size,
    arpu,
  };
}

function nKpi(v: number | null | undefined): number {
  return Number(v) || 0;
}

type RotulosMesa = { d1: string; usouFallbackDaily: boolean };

function rotulosPorMesaParaMes(
  dailyData: DailyRow[],
  snapshotIso: string | null,
  ano: number,
  mes0a11: number,
): RotulosMesa {
  const { inicio, fim } = getDatasDoMes(ano, mes0a11);
  const inMonth = dailyData.filter((r) => r.data >= inicio && r.data <= fim);
  const ultimoDiaDailyIso =
    inMonth.length === 0 ? null : inMonth.reduce((a, r) => (r.data > a ? r.data : a), inMonth[0].data);
  const d1Referencia = ultimoDiaDailyIso ?? (snapshotIso ? addDaysIso(snapshotIso, -1) : null);
  if (!d1Referencia) {
    return { d1: "—", usouFallbackDaily: false };
  }
  return {
    d1: fmtDataPtBr(d1Referencia),
    usouFallbackDaily: ultimoDiaDailyIso === null,
  };
}

const BLACKJACK_MESA_ORDER = ["Blackjack 1", "Blackjack VIP", "Blackjack 2"] as const;
const BOTTOM_MESA_ORDER = ["Speed Baccarat", "Roleta"] as const;

function apostaMediaMesa(t: number | null, b: number | null): number | null {
  if (t == null || b == null) return null;
  const bn = Number(b);
  if (!Number.isFinite(bn) || bn === 0) return null;
  return Number(t) / bn;
}

/** Uma linha na mini-tabela por mesa (d-1). */
function MesaD1MiniTable({
  row,
  rotulos,
  slugOperadora,
  operadorasList,
  thMini,
  tdMini,
  tdMiniNum,
}: {
  row: PorTabelaRow;
  rotulos: RotulosMesa;
  slugOperadora: string;
  operadorasList: { slug: string; nome: string }[];
  thMini: React.CSSProperties;
  tdMini: React.CSSProperties;
  tdMiniNum: React.CSSProperties;
}) {
  const { theme: tt } = useApp();
  const am = apostaMediaMesa(row.turnover_d1, row.bets_d1);
  return (
    <div
      style={{
        border: `1px solid ${tt.cardBorder}`,
        borderRadius: 14,
        padding: 14,
        background: "rgba(74,32,130,0.04)",
        width: "100%",
        boxSizing: "border-box",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontWeight: 800,
          fontSize: 13,
          color: tt.text,
          marginBottom: 10,
          fontFamily: FONT.body,
          lineHeight: 1.35,
          wordBreak: "break-word",
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: tt.textMuted,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            display: "block",
            marginBottom: 4,
          }}
        >
          Mesa
        </span>
        {nomeMesaParaExibicao(row, slugOperadora, operadorasList)}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 280 }}>
          <thead>
            <tr>
              <th style={thMini}>Data</th>
              <th style={{ ...thMini, textAlign: "right" }}>GGR</th>
              <th style={{ ...thMini, textAlign: "right" }}>Turnover</th>
              <th style={{ ...thMini, textAlign: "right" }}>Apostas</th>
              <th style={{ ...thMini, textAlign: "right" }}>Aposta média</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: "rgba(74,32,130,0.06)" }}>
              <td style={tdMini}>{rotulos.d1}</td>
              <td
                style={{
                  ...tdMiniNum,
                  color: (row.ggr_d1 ?? 0) >= 0 ? BRAND.verde : BRAND.vermelho,
                  fontWeight: 600,
                }}
              >
                {row.ggr_d1 != null ? fmtBRL(Number(row.ggr_d1)) : "—"}
              </td>
              <td style={tdMiniNum}>{row.turnover_d1 != null ? fmtBRL(Number(row.turnover_d1)) : "—"}</td>
              <td style={tdMiniNum}>{row.bets_d1 != null ? row.bets_d1.toLocaleString("pt-BR") : "—"}</td>
              <td style={tdMiniNum}>{am != null ? fmtBRL(am) : "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function partitionCasaApostasMesas(
  rows: PorTabelaRow[],
  slug: string,
  operadorasList: { slug: string; nome: string }[],
): { blackjack: PorTabelaRow[]; bottom: PorTabelaRow[]; rest: PorTabelaRow[] } | null {
  if (slug !== OPERADORA_CASA_APOSTAS) return null;
  const byName = new Map<string, PorTabelaRow>();
  for (const r of rows) {
    const name = nomeMesaParaExibicao(r, slug, operadorasList);
    byName.set(name, r);
  }
  const blackjack = BLACKJACK_MESA_ORDER.map((n) => byName.get(n)).filter((x): x is PorTabelaRow => x != null);
  const bottom = BOTTOM_MESA_ORDER.map((n) => byName.get(n)).filter((x): x is PorTabelaRow => x != null);
  const placed = new Set<string>([...BLACKJACK_MESA_ORDER, ...BOTTOM_MESA_ORDER]);
  const rest: PorTabelaRow[] = [];
  for (const r of rows) {
    const name = nomeMesaParaExibicao(r, slug, operadorasList);
    if (!placed.has(name)) rest.push(r);
  }
  return { blackjack, bottom, rest };
}

function MarginBadge({ value }: { value: number | null }) {
  const { theme: tt } = useApp();
  if (value == null) return <span style={{ color: tt.textMuted }}>—</span>;
  const v = Number(value);
  let bg: string = "rgba(124,58,237,0.12)", color: string = BRAND.roxoVivo;
  if (v >= 5) {
    bg = "rgba(34,197,94,0.12)";
    color = BRAND.verde;
  } else if (v < 3) {
    bg = "rgba(232,64,37,0.12)";
    color = BRAND.vermelho;
  }
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: FONT.body,
      }}
    >
      {fmtPct(v)}
    </span>
  );
}

function MesasPorMesaListaVertical({
  rows,
  rotulos,
  slugOperadora,
  operadorasList,
  thMini,
  tdMini,
  tdMiniNum,
}: {
  rows: PorTabelaRow[];
  rotulos: RotulosMesa;
  slugOperadora: string;
  operadorasList: { slug: string; nome: string }[];
  thMini: React.CSSProperties;
  tdMini: React.CSSProperties;
  tdMiniNum: React.CSSProperties;
}) {
  const sorted = [...rows].sort((a, b) =>
    nomeMesaParaExibicao(a, slugOperadora, operadorasList).localeCompare(
      nomeMesaParaExibicao(b, slugOperadora, operadorasList),
      "pt-BR",
    ),
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      {sorted.map((row) => (
        <MesaD1MiniTable
          key={`${row.data_relatorio}|${slugOperadora}|${row.nome_tabela}`}
          row={row}
          rotulos={rotulos}
          slugOperadora={slugOperadora}
          operadorasList={operadorasList}
          thMini={thMini}
          tdMini={tdMini}
          tdMiniNum={tdMiniNum}
        />
      ))}
    </div>
  );
}

/** Casa de Apostas: 3 Blackjacks na mesma linha; Speed Baccarat e Roleta na linha seguinte; restantes abaixo. */
function MesasCasaApostasGrid({
  rows,
  rotulos,
  slugOperadora,
  operadorasList,
  thMini,
  tdMini,
  tdMiniNum,
}: {
  rows: PorTabelaRow[];
  rotulos: RotulosMesa;
  slugOperadora: string;
  operadorasList: { slug: string; nome: string }[];
  thMini: React.CSSProperties;
  tdMini: React.CSSProperties;
  tdMiniNum: React.CSSProperties;
}) {
  const part = partitionCasaApostasMesas(rows, slugOperadora, operadorasList);
  if (!part) {
    return (
      <MesasPorMesaListaVertical
        rows={rows}
        rotulos={rotulos}
        slugOperadora={slugOperadora}
        operadorasList={operadorasList}
        thMini={thMini}
        tdMini={tdMini}
        tdMiniNum={tdMiniNum}
      />
    );
  }
  const { blackjack, bottom, rest } = part;
  const grid3: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    width: "100%",
  };
  const grid2: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    width: "100%",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      {blackjack.length > 0 && (
        <div style={grid3}>
          {blackjack.map((row) => (
            <MesaD1MiniTable
              key={`${row.data_relatorio}|bj|${row.nome_tabela}`}
              row={row}
              rotulos={rotulos}
              slugOperadora={slugOperadora}
              operadorasList={operadorasList}
              thMini={thMini}
              tdMini={tdMini}
              tdMiniNum={tdMiniNum}
            />
          ))}
        </div>
      )}
      {bottom.length > 0 && (
        <div style={grid2}>
          {bottom.map((row) => (
            <MesaD1MiniTable
              key={`${row.data_relatorio}|bt|${row.nome_tabela}`}
              row={row}
              rotulos={rotulos}
              slugOperadora={slugOperadora}
              operadorasList={operadorasList}
              thMini={thMini}
              tdMini={tdMini}
              tdMiniNum={tdMiniNum}
            />
          ))}
        </div>
      )}
      {rest.length > 0 && (
        <MesasPorMesaListaVertical
          rows={rest}
          rotulos={rotulos}
          slugOperadora={slugOperadora}
          operadorasList={operadorasList}
          thMini={thMini}
          tdMini={tdMini}
          tdMiniNum={tdMiniNum}
        />
      )}
    </div>
  );
}

function SectionHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  const { theme: tt } = useApp();
  const brand = useDashboardBrand();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: brand.primaryIconBg,
          border: brand.primaryIconBorder,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: brand.primaryIconColor,
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: brand.primary,
          fontFamily: FONT_TITLE,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </span>
      {sub && (
        <span style={{ fontSize: 11, color: tt.textMuted, fontFamily: FONT.body, marginLeft: 4 }}>
          {sub}
        </span>
      )}
    </div>
  );
}

function mapDailyV2(r: { data: string; turnover: number | null; ggr: number | null; apostas: number | null; uap: number | null }): DailyRow {
  const a = r.apostas != null ? Number(r.apostas) : null;
  return {
    data: r.data,
    turnover: r.turnover != null ? Number(r.turnover) : null,
    ggr: r.ggr != null ? Number(r.ggr) : null,
    bets: a,
    uap: r.uap != null ? Number(r.uap) : null,
    margin_pct: null,
    bet_size: null,
    arpu: null,
  };
}

function mapMonthlyV2(r: { mes: string; uap: number | null; arpu: number | null }): MonthlyRow {
  return {
    mes: r.mes,
    turnover: null,
    ggr: null,
    margin_pct: null,
    bets: null,
    uap: r.uap != null ? Number(r.uap) : null,
    bet_size: null,
    arpu: r.arpu != null ? Number(r.arpu) : null,
  };
}

export default function MesasSpin() {
  const { theme: t } = useApp();
  const { showFiltroOperadora, podeVerOperadora, operadoraSlugsForcado } = useDashboardFiltros();
  const perm = usePermission("mesas_spin");

  const mesesDisponiveis = useMemo(() => getMesesDisponiveis(), []);
  const hoje = new Date();
  const idxInicial = mesesDisponiveis.findIndex(
    (m) => m.ano === hoje.getFullYear() && m.mes === hoje.getMonth(),
  );

  const [idxMes, setIdxMes] = useState(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1);
  const [historico, setHistorico] = useState(false);
  const [loading, setLoading] = useState(true);

  const [dailyData, setDailyData] = useState<DailyRow[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyRow[]>([]);
  const [porTabelaRows, setPorTabelaRows] = useState<PorTabelaRow[]>([]);
  const [porTabelaSnapshot, setPorTabelaSnapshot] = useState<string | null>(null);
  const [porTabelaHistAll, setPorTabelaHistAll] = useState<PorTabelaRow[]>([]);
  /** Só para comparação MoM no carrossel: totais do mês anterior a partir do daily. */
  const [dailyDataPrevMonth, setDailyDataPrevMonth] = useState<DailyRow[]>([]);
  const [operadorasOcr, setOperadorasOcr] = useState<{ slug: string; nome: string }[]>([]);
  const [uploadMsg, setUploadMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [filtroOperadora, setFiltroOperadora] = useState<string>("todas");

  const mesSelecionado = mesesDisponiveis[idxMes];

  function irMesAnterior() {
    setHistorico(false);
    setIdxMes((i) => Math.max(0, i - 1));
  }
  function irMesProximo() {
    setHistorico(false);
    setIdxMes((i) => Math.min(mesesDisponiveis.length - 1, i + 1));
  }
  function toggleHistorico() {
    if (historico) {
      setHistorico(false);
      setIdxMes(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1);
    } else setHistorico(true);
  }

  useEffect(() => {
    let alive = true;
    supabase
      .from("operadoras")
      .select("slug, nome")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => {
        if (alive) setOperadorasOcr(data ?? []);
      });
    return () => {
      alive = false;
    };
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    setPorTabelaRows([]);
    setPorTabelaSnapshot(null);
    setPorTabelaHistAll([]);
    setDailyDataPrevMonth([]);

    try {
      if (historico) {
        const monthlyRaw = await fetchAllPages(async (from, to) =>
          supabase
            .from("relatorio_monthly_summary")
            .select("mes, uap, arpu")
            .order("mes", { ascending: true })
            .range(from, to),
        );
        const dailyRaw = await fetchAllPages(async (from, to) =>
          supabase
            .from("relatorio_daily_summary")
            .select("data, turnover, ggr, apostas, uap")
            .order("data", { ascending: true })
            .range(from, to),
        );
        const porAllRaw = await fetchAllPages(async (from, to) =>
          supabase
            .from("relatorio_por_tabela")
            .select("dia, operadora, mesa, ggr, turnover, apostas")
            .order("dia", { ascending: true })
            .range(from, to),
        );
        setMonthlyData((monthlyRaw as { mes: string; uap: number | null; arpu: number | null }[]).map(mapMonthlyV2));
        setDailyData((dailyRaw as Parameters<typeof mapDailyV2>[0][]).map(mapDailyV2));
        setPorTabelaHistAll((porAllRaw as Parameters<typeof mapPorTabelaV2>[0][]).map(mapPorTabelaV2));
      } else if (mesSelecionado) {
        const { inicio, fim } = getDatasDoMes(mesSelecionado.ano, mesSelecionado.mes);
        const dailyRaw = await fetchAllPages(async (from, to) =>
          supabase
            .from("relatorio_daily_summary")
            .select("data, turnover, ggr, apostas, uap")
            .gte("data", inicio)
            .lte("data", fim)
            .order("data", { ascending: true })
            .range(from, to),
        );
        setDailyData((dailyRaw as Parameters<typeof mapDailyV2>[0][]).map(mapDailyV2));
        setMonthlyData([]);

        if (idxMes > 0) {
          const prev = mesesDisponiveis[idxMes - 1]!;
          const { inicio: pi, fim: pf } = getDatasDoMes(prev.ano, prev.mes);
          const dailyPrevRaw = await fetchAllPages(async (from, to) =>
            supabase
              .from("relatorio_daily_summary")
              .select("data, turnover, ggr, apostas, uap")
              .gte("data", pi)
              .lte("data", pf)
              .order("data", { ascending: true })
              .range(from, to),
          );
          setDailyDataPrevMonth((dailyPrevRaw as Parameters<typeof mapDailyV2>[0][]).map(mapDailyV2));
        }

        const { data: snap } = await supabase
          .from("relatorio_por_tabela")
          .select("dia")
          .gte("dia", inicio)
          .lte("dia", fim)
          .order("dia", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (snap?.dia) {
          setPorTabelaSnapshot(snap.dia);
          const mesasRaw = await fetchAllPages(async (from, to) =>
            supabase
              .from("relatorio_por_tabela")
              .select("dia, operadora, mesa, ggr, turnover, apostas")
              .eq("dia", snap.dia)
              .order("mesa")
              .range(from, to),
          );
          setPorTabelaRows((mesasRaw as Parameters<typeof mapPorTabelaV2>[0][]).map(mapPorTabelaV2));
        }
      }
    } finally {
      setLoading(false);
    }
  }, [historico, mesSelecionado, idxMes, mesesDisponiveis]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const tabelaRows = useMemo(() => {
    const enrich = (base: Pick<DailyRow, "turnover" | "ggr" | "bets" | "uap"> & { label: string }): LinhaDetalheTab => {
      const t = base.turnover;
      const g = base.ggr;
      const b = base.bets;
      const u = base.uap;
      const margin_pct = t != null && Number(t) !== 0 && g != null ? (Number(g) / Number(t)) * 100 : null;
      const bet_size =
        b != null && Number(b) !== 0 && t != null ? Number(t) / Number(b) : null;
      const arpu = u != null && Number(u) !== 0 && g != null ? Number(g) / Number(u) : null;
      return { ...base, margin_pct, bet_size, arpu };
    };
    if (historico) {
      return monthlyData.map((r) => {
        const d = new Date(r.mes + "T12:00:00");
        return enrich({
          label: `${MESES_CURTOS[d.getMonth()]} ${d.getFullYear()}`,
          turnover: r.turnover,
          ggr: r.ggr,
          bets: r.bets,
          uap: r.uap,
        });
      });
    }
    return dailyData.map((r) =>
      enrich({
        label: new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        }),
        turnover: r.turnover,
        ggr: r.ggr,
        bets: r.bets,
        uap: r.uap,
      }),
    );
  }, [historico, dailyData, monthlyData]);

  const kpiExibir = useMemo(() => (dailyData.length === 0 ? null : aggDailyMesKpi(dailyData)), [dailyData]);

  const kpiAntExibir = useMemo(() => {
    if (historico || dailyDataPrevMonth.length === 0) return null;
    return aggDailyMesKpi(dailyDataPrevMonth);
  }, [historico, dailyDataPrevMonth]);

  const operadorasListFmt = operadorasOcr;

  const porTabelaFiltradas = useMemo(
    () =>
      filtrarPorEscopoOperadora(
        porTabelaRows,
        filtroOperadora,
        operadoraSlugsForcado,
        podeVerOperadora,
      ),
    [porTabelaRows, filtroOperadora, operadoraSlugsForcado, podeVerOperadora],
  );

  const porOperadoraSnapshot = useMemo(() => {
    const m = agruparPorSlug(porTabelaFiltradas);
    return ordenarSlugs([...m.keys()], operadorasListFmt).map((slug) => ({
      slug,
      rows: m.get(slug)!,
    }));
  }, [porTabelaFiltradas, operadorasListFmt]);

  const rotulosPorMesaBrl = useMemo(() => {
    if (!mesSelecionado) {
      return { d1: "—", usouFallbackDaily: false };
    }
    return rotulosPorMesaParaMes(dailyData, porTabelaSnapshot, mesSelecionado.ano, mesSelecionado.mes);
  }, [dailyData, porTabelaSnapshot, mesSelecionado]);

  const porMesaPorMesHistorico = useMemo(() => {
    if (!historico || porTabelaHistAll.length === 0) return [];
    const filtroLinhas = (rows: PorTabelaRow[]) =>
      filtrarPorEscopoOperadora(rows, filtroOperadora, operadoraSlugsForcado, podeVerOperadora);

    const map = new Map<string, PorTabelaRow[]>();
    for (const r of porTabelaHistAll) {
      const ym = r.data_relatorio.slice(0, 7);
      if (!map.has(ym)) map.set(ym, []);
      map.get(ym)!.push(r);
    }
    const items: Array<{
      ym: string;
      mesLabel: string;
      snapshot: string;
      porOperadora: { slug: string; rows: PorTabelaRow[] }[];
    }> = [];
    for (const [ym, list] of map) {
      if (list.length === 0) continue;
      const snapshot = list.reduce((a, r) => (r.data_relatorio > a ? r.data_relatorio : a), list[0].data_relatorio);
      let rowsSnap = list.filter((r) => r.data_relatorio === snapshot);
      rowsSnap = filtroLinhas(rowsSnap);
      const bySlug = agruparPorSlug(rowsSnap);
      const porOperadora = ordenarSlugs([...bySlug.keys()], operadorasListFmt)
        .map((slug) => ({ slug, rows: bySlug.get(slug)! }))
        .filter((b) => b.rows.length > 0);
      const [yStr, mStr] = ym.split("-");
      const Y = Number(yStr);
      const M = Number(mStr) - 1;
      items.push({
        ym,
        mesLabel: `${MESES_PT[M]} ${Y}`,
        snapshot,
        porOperadora,
      });
    }
    items.sort((a, b) => a.ym.localeCompare(b.ym));
    return items.filter((it) => it.porOperadora.length > 0);
  }, [
    historico,
    porTabelaHistAll,
    filtroOperadora,
    operadoraSlugsForcado,
    podeVerOperadora,
    operadorasListFmt,
  ]);

  const isHistoricoKpi = historico || idxMes === 0 || dailyDataPrevMonth.length === 0;

  const brand = useDashboardBrand();

  const card: React.CSSProperties = {
    background: brand.blockBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
  };

  const thStyle: React.CSSProperties = {
    textAlign: "left",
    fontSize: 10,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: t.textMuted,
    fontWeight: 600,
    padding: "10px 12px",
    borderBottom: `1px solid ${t.cardBorder}`,
    background: "rgba(74,32,130,0.08)",
    fontFamily: FONT.body,
    whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "9px 12px",
    fontSize: 13,
    borderBottom: `1px solid rgba(255,255,255,0.04)`,
    color: t.text,
    fontFamily: FONT.body,
    whiteSpace: "nowrap",
  };

  const tdNum: React.CSSProperties = { ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" };

  const thMini: React.CSSProperties = {
    ...thStyle,
    fontSize: 10,
    padding: "8px 10px",
    whiteSpace: "nowrap",
  };
  const tdMini: React.CSSProperties = { ...tdStyle, fontSize: 12, padding: "8px 10px" };
  const tdMiniNum: React.CSSProperties = { ...tdNum, fontSize: 12, padding: "8px 10px" };

  const isPrimeiro = idxMes === 0;
  const isUltimo = idxMes === mesesDisponiveis.length - 1;

  const btnNav: React.CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: "50%",
    border: `1px solid ${t.cardBorder}`,
    background: "transparent",
    color: t.text,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const selectStyle: React.CSSProperties = {
    padding: "6px 12px 6px 32px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg ?? t.cardBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
    cursor: "pointer",
    appearance: "none" as const,
    outline: "none",
  };

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar Mesas Spin.
      </div>
    );
  }

  return (
    <div
      className="app-page-shell app-page-shell--pb64"
      style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}
    >
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            borderRadius: 14,
            border: brand.primaryTransparentBorder,
            background: brand.primaryTransparentBg,
            padding: "12px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              style={{
                ...btnNav,
                opacity: historico || isPrimeiro ? 0.35 : 1,
                cursor: historico || isPrimeiro ? "not-allowed" : "pointer",
              }}
              onClick={irMesAnterior}
              disabled={historico || isPrimeiro}
            >
              <ChevronLeft size={14} />
            </button>
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: t.text,
                fontFamily: FONT.body,
                minWidth: 180,
                textAlign: "center",
              }}
            >
              {historico ? "Todo o período" : mesSelecionado?.label}
            </span>
            <button
              style={{
                ...btnNav,
                opacity: historico || isUltimo ? 0.35 : 1,
                cursor: historico || isUltimo ? "not-allowed" : "pointer",
              }}
              onClick={irMesProximo}
              disabled={historico || isUltimo}
            >
              <ChevronRight size={14} />
            </button>

            <button
              onClick={toggleHistorico}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 999,
                cursor: "pointer",
                fontFamily: FONT.body,
                fontSize: 13,
                border: historico ? `1px solid ${brand.accent}` : `1px solid ${t.cardBorder}`,
                background: historico
                  ? brand.useBrand
                    ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)"
                    : `${BRAND.roxoVivo}18`
                  : "transparent",
                color: historico ? brand.accent : t.textMuted,
                fontWeight: historico ? 700 : 400,
                transition: "all 0.15s",
              }}
            >
              <GiCalendar size={15} /> Histórico
            </button>

            {showFiltroOperadora && (
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 10,
                    display: "flex",
                    alignItems: "center",
                    pointerEvents: "none",
                    color: t.textMuted,
                  }}
                >
                  <GiShield size={15} />
                </span>
                <select
                  value={filtroOperadora}
                  onChange={(e) => setFiltroOperadora(e.target.value)}
                  style={selectStyle}
                >
                  <option value="todas">Todas as operadoras</option>
                  {operadorasOcr
                    .filter((o) => podeVerOperadora(o.slug))
                    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                    .map((o) => (
                      <option key={o.slug} value={o.slug}>
                        {o.nome}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {loading && (
              <span
                style={{
                  fontSize: 12,
                  color: t.textMuted,
                  fontFamily: FONT.body,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Clock size={12} /> Carregando...
              </span>
            )}
          </div>
        </div>
      </div>

      {uploadMsg && (
        <div
          style={{
            marginBottom: 14,
            padding: 12,
            borderRadius: 12,
            border: `1px solid ${uploadMsg.tipo === "ok" ? BRAND.verde : BRAND.vermelho}`,
            background: uploadMsg.tipo === "ok" ? `${BRAND.verde}14` : `${BRAND.vermelho}14`,
            color: uploadMsg.tipo === "ok" ? BRAND.verde : BRAND.vermelho,
            fontFamily: FONT.body,
            fontSize: 13,
          }}
        >
          {uploadMsg.tipo === "ok" ? "✅ " : "⚠️ "}
          {uploadMsg.texto}
        </div>
      )}

      {!perm.loading && perm.canEditarOk && (
        <div style={{ ...card, marginBottom: 14 }}>
          <SectionHeader
            icon={<FileImage size={15} />}
            title="Importar relatório (print)"
            sub="· mesmo fluxo OCR do Status Técnico"
          />
          <MesasSpinRelatorioUpload
            t={t}
            disabled={perm.loading}
            embedded
            onImported={() => {
              void carregar();
            }}
            onUserMessage={setUploadMsg}
          />
        </div>
      )}

      {!loading && (
        <div style={{ ...card, marginBottom: 14 }}>
          <SectionHeader
            icon={<LayoutGrid size={15} />}
            title="KPIs Consolidados"
            sub={historico ? "todo o período · soma do detalhamento diário" : "mês selecionado"}
          />
          <div className="app-grid-kpi-4" style={{ gap: 12, marginBottom: 12 }}>
            <KpiCard
              label="GGR"
              value={kpiExibir?.ggr != null ? fmtBRL(kpiExibir.ggr) : "—"}
              icon={<TrendingUp size={16} />}
              accentVar="--brand-extra1"
              accentColor={nKpi(kpiExibir?.ggr) >= 0 ? BRAND.verde : BRAND.vermelho}
              atual={nKpi(kpiExibir?.ggr)}
              anterior={nKpi(kpiAntExibir?.ggr)}
              isBRL
              isHistorico={isHistoricoKpi}
            />
            <KpiCard
              label="Turnover"
              value={kpiExibir?.turnover != null ? fmtBRL(kpiExibir.turnover) : "—"}
              icon={<Wallet size={16} />}
              accentVar="--brand-extra3"
              accentColor={BRAND.roxoVivo}
              atual={nKpi(kpiExibir?.turnover)}
              anterior={nKpi(kpiAntExibir?.turnover)}
              isBRL
              isHistorico={isHistoricoKpi}
            />
            <KpiCard
              label="Apostas"
              value={kpiExibir?.bets != null ? kpiExibir.bets.toLocaleString("pt-BR") : "—"}
              icon={<ListOrdered size={16} />}
              accentVar="--brand-extra2"
              accentColor={BRAND.azul}
              atual={nKpi(kpiExibir?.bets)}
              anterior={nKpi(kpiAntExibir?.bets)}
              isHistorico={isHistoricoKpi}
            />
            <KpiCard
              label="Margem"
              value={kpiExibir?.margin_pct != null ? fmtPct(kpiExibir.margin_pct) : "—"}
              icon={<Percent size={16} />}
              accentVar="--brand-extra4"
              accentColor={BRAND.amarelo}
              atual={nKpi(kpiExibir?.margin_pct)}
              anterior={nKpi(kpiAntExibir?.margin_pct)}
              isHistorico={isHistoricoKpi}
            />
          </div>
          <div className="app-grid-kpi-3" style={{ gap: 12 }}>
            <KpiCard
              label="Aposta média"
              value={kpiExibir?.bet_size != null ? fmtBRL(kpiExibir.bet_size) : "—"}
              icon={<ChartColumnBig size={16} />}
              accentVar="--brand-extra4"
              accentColor={BRAND.ciano}
              atual={nKpi(kpiExibir?.bet_size)}
              anterior={nKpi(kpiAntExibir?.bet_size)}
              isBRL
              isHistorico={isHistoricoKpi}
            />
            <KpiCard
              label="UAP"
              value={kpiExibir?.uap != null ? kpiExibir.uap.toLocaleString("pt-BR") : "—"}
              icon={<Users size={16} />}
              accentVar="--brand-extra2"
              accentColor={BRAND.roxo}
              atual={nKpi(kpiExibir?.uap)}
              anterior={nKpi(kpiAntExibir?.uap)}
              isHistorico={isHistoricoKpi}
            />
            <KpiCard
              label="ARPU"
              value={kpiExibir?.arpu != null ? fmtBRL(kpiExibir.arpu) : "—"}
              icon={<Coins size={16} />}
              accentVar="--brand-extra3"
              accentColor={BRAND.roxoVivo}
              atual={nKpi(kpiExibir?.arpu)}
              anterior={nKpi(kpiAntExibir?.arpu)}
              isBRL
              isHistorico={isHistoricoKpi}
            />
          </div>
        </div>
      )}

      <div style={{ ...card, marginBottom: 14 }}>
        <SectionHeader
          icon={<GiCalendar size={15} />}
          title={historico ? "Comparativo Mensal" : "Detalhamento Diário"}
          sub={historico ? "consolidado mês a mês" : "dia a dia"}
        />

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>
            <Clock size={16} style={{ marginBottom: 8 }} />
            <div>Carregando...</div>
          </div>
        ) : tabelaRows.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>
            Nenhum dado para o período selecionado.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>{historico ? "Mês" : "Data"}</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>GGR</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Turnover</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Apostas</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Margem</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Aposta média</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>UAP</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>ARPU</th>
                </tr>
              </thead>
              <tbody>
                {tabelaRows.map((r, i) => {
                  const ggr = r.ggr ?? 0;
                  return (
                    <tr
                      key={i}
                      style={{ background: i % 2 === 1 ? "rgba(74,32,130,0.05)" : "transparent" }}
                    >
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{r.label}</td>
                      <td
                        style={{
                          ...tdNum,
                          color: ggr > 0 ? BRAND.verde : ggr < 0 ? BRAND.vermelho : t.text,
                          fontWeight: 600,
                        }}
                      >
                        {r.ggr != null ? fmtBRL(r.ggr) : "—"}
                      </td>
                      <td style={tdNum}>{r.turnover != null ? fmtBRL(r.turnover) : "—"}</td>
                      <td style={tdNum}>{r.bets != null ? r.bets.toLocaleString("pt-BR") : "—"}</td>
                      <td style={{ ...tdNum }}>
                        <MarginBadge value={r.margin_pct} />
                      </td>
                      <td style={tdNum}>{r.bet_size != null ? fmtBRL(Number(r.bet_size)) : "—"}</td>
                      <td style={tdNum}>{r.uap != null ? r.uap.toLocaleString("pt-BR") : "—"}</td>
                      <td style={tdNum}>{r.arpu != null ? fmtBRL(Number(r.arpu)) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!historico && (
        <>
          {loading ? (
            <div style={{ ...card, marginBottom: 14 }}>
              <SectionHeader icon={<Table2 size={15} />} title="Dados por mesa" />
              <div style={{ padding: 24, textAlign: "center", color: t.textMuted }}>
                <Clock size={16} style={{ marginBottom: 8 }} />
                Carregando mesas…
              </div>
            </div>
          ) : porTabelaRows.length === 0 ? (
            <div style={{ ...card, marginBottom: 14 }}>
              <SectionHeader icon={<Table2 size={15} />} title="Dados por mesa" />
              <p style={{ margin: 0, color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                Nenhum registo em <code style={{ fontSize: 12 }}>relatorio_por_tabela</code> para este mês. Importe
                pelo bloco acima ou pelo Status Técnico.
              </p>
            </div>
          ) : porOperadoraSnapshot.length === 0 ? (
            <div style={{ ...card, marginBottom: 14 }}>
              <SectionHeader icon={<Table2 size={15} />} title="Dados por mesa" />
              <p style={{ margin: 0, color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                Nenhuma mesa neste filtro de operadora.
              </p>
            </div>
          ) : (
            <>
              {rotulosPorMesaBrl.usouFallbackDaily && porTabelaFiltradas.length > 0 && (
                <p style={{ margin: "0 0 16px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
                  Sem resumo diário neste mês: a data da linha usa a véspera da data do print.
                </p>
              )}
              {porOperadoraSnapshot.map(({ slug, rows }) => (
                <div key={slug} style={{ ...card, marginBottom: 14 }}>
                  <SectionHeader
                    icon={<Table2 size={15} />}
                    title="Dados por mesa"
                    sub={`· ${nomeTituloOperadora(slug, operadorasListFmt)}`}
                  />
                  {slug === OPERADORA_CASA_APOSTAS ? (
                    <MesasCasaApostasGrid
                      rows={rows}
                      rotulos={rotulosPorMesaBrl}
                      slugOperadora={slug}
                      operadorasList={operadorasListFmt}
                      thMini={thMini}
                      tdMini={tdMini}
                      tdMiniNum={tdMiniNum}
                    />
                  ) : (
                    <MesasPorMesaListaVertical
                      rows={rows}
                      rotulos={rotulosPorMesaBrl}
                      slugOperadora={slug}
                      operadorasList={operadorasListFmt}
                      thMini={thMini}
                      tdMini={tdMini}
                      tdMiniNum={tdMiniNum}
                    />
                  )}
                </div>
              ))}
            </>
          )}
        </>
      )}

      {historico && (
        <div style={{ ...card, marginBottom: 14 }}>
          <SectionHeader
            icon={<Table2 size={15} />}
            title="Dados por mesa"
            sub="· última importação por mês — métricas d-1 · BRL"
          />
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: t.textMuted }}>
              <Clock size={16} style={{ marginBottom: 8 }} />
              Carregando mesas…
            </div>
          ) : porMesaPorMesHistorico.length === 0 ? (
            <p style={{ margin: 0, color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
              Nenhum registo em <code style={{ fontSize: 12 }}>relatorio_por_tabela</code> no período.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {porMesaPorMesHistorico.map((blo) => {
                const [yStr, mStr] = blo.ym.split("-");
                const rot = rotulosPorMesaParaMes(
                  dailyData,
                  blo.snapshot,
                  Number(yStr),
                  Number(mStr) - 1,
                );
                return (
                  <div key={blo.ym}>
                    <h3
                      style={{
                        fontFamily: FONT_TITLE,
                        fontSize: 13,
                        fontWeight: 800,
                        color: brand.primary,
                        margin: "0 0 14px",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {blo.mesLabel}
                      <span
                        style={{
                          fontFamily: FONT.body,
                          fontWeight: 500,
                          fontSize: 11,
                          color: t.textMuted,
                          marginLeft: 8,
                          textTransform: "none",
                          letterSpacing: "normal",
                        }}
                      >
                        · print {fmtDataPtBr(blo.snapshot)}
                      </span>
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      {blo.porOperadora.map(({ slug: opSlug, rows }) => (
                        <div key={`${blo.ym}-${opSlug}`}>
                          <SectionHeader
                            icon={<Table2 size={14} />}
                            title="Dados por mesa"
                            sub={`· ${nomeTituloOperadora(opSlug, operadorasListFmt)}`}
                          />
                          {rot.usouFallbackDaily && rows.length > 0 && (
                            <p
                              style={{
                                margin: "0 0 10px",
                                fontSize: 11,
                                color: t.textMuted,
                                fontFamily: FONT.body,
                              }}
                            >
                              Sem resumo diário neste mês: rótulos por data do print.
                            </p>
                          )}
                          {opSlug === OPERADORA_CASA_APOSTAS ? (
                            <MesasCasaApostasGrid
                              rows={rows}
                              rotulos={rot}
                              slugOperadora={opSlug}
                              operadorasList={operadorasListFmt}
                              thMini={thMini}
                              tdMini={tdMini}
                              tdMiniNum={tdMiniNum}
                            />
                          ) : (
                            <MesasPorMesaListaVertical
                              rows={rows}
                              rotulos={rot}
                              slugOperadora={opSlug}
                              operadorasList={operadorasListFmt}
                              thMini={thMini}
                              tdMini={tdMini}
                              tdMiniNum={tdMiniNum}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
