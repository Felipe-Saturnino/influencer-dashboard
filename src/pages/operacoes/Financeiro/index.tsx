import { useState, useEffect, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { enviarPagamentoEmailCiclo } from "../../../lib/financeiroEnviarPagamentoEmail";
import { buscarInvestimentoPago } from "../../../lib/investimentoPago";
import { CicloPagamento, PagamentoStatus } from "../../../types";
import InfluencerMultiSelect from "../../../components/InfluencerMultiSelect";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GiShield } from "react-icons/gi";

// ── Tipos locais ───────────────────────────────────────────────────────────────

interface PagamentoRow {
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
}

// ── Constantes ─────────────────────────────────────────────────────────────────

const MESES_NOMES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const STATUS_PAG: Record<string, { label: string; color: string; icon: string }> = {
  em_analise: { label: "Em análise",        color: "#f59e0b", icon: "⏳" },
  a_pagar:    { label: "Aguard. pagamento",  color: "#6b7fff", icon: "💳" },
  pago:       { label: "Pago",               color: "#10b981", icon: "✅" },
};

const STATUS_INFLUENCER: Record<string, { label: string; color: string }> = {
  ativo:     { label: "Ativo",     color: "#10b981" },
  inativo:   { label: "Inativo",   color: "#94a3b8" },
  cancelado: { label: "Cancelado", color: "#ef4444" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtHoras(h: number) {
  if (!h || h === 0) return "0h";
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return mm === 0 ? `${hh}h` : `${hh}h ${mm}m`;
}

function gerarMeses(): { value: string; label: string }[] {
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

function periodoDoMes(mes: string): { inicio: string; fim: string } | null {
  if (!mes) return null;
  const [ano, m] = mes.split("-").map(Number);
  const ultimo = new Date(ano, m, 0).getDate();
  return { inicio: `${mes}-01`, fim: `${mes}-${String(ultimo).padStart(2, "0")}` };
}

/** Retorna o ciclo (quinta a quarta) ao qual uma data pertence */
function cicloSemanalParaData(dataStr: string): { data_inicio: string; data_fim: string } | null {
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
function gerarCiclosProativos(desdeData: Date, semanasAhead: number): { data_inicio: string; data_fim: string }[] {
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

function cicloAberto(ciclo: CicloPagamento): boolean {
  if (ciclo.fechado_em) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fim = new Date(ciclo.data_fim + "T00:00:00");
  return hoje <= fim;
}

function mesCalendarioDeHoje(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function yyyymmFromDateStr(yyyyMmDd: string): string {
  if (!yyyyMmDd || yyyyMmDd.length < 7) return "";
  return yyyyMmDd.slice(0, 7);
}

/** Meses (yyyy-mm) posteriores ao mês de referência até fimYm (inclusive), em ordem decrescente — ex.: ciclo que termina em abril enquanto estamos em março → ["2026-04"]. */
function mesesPosterioresAoMesAtualAte(fimYm: string, mesReferenciaYm: string): string[] {
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
function opcoesMesesDoCarrossel(ciclos: CicloPagamento[]): { value: string; label: string }[] {
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

// ── Componentes base ───────────────────────────────────────────────────────────

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const letra = (name ?? "?")[0].toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 800, fontSize: size * 0.4,
    }}>
      {letra}
    </div>
  );
}

function Badge({ status, config }: {
  status: string;
  config: Record<string, { label: string; color: string; icon?: string }>;
}) {
  const cfg = config[status] ?? { label: status, color: "#94a3b8" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "20px",
      background: `${cfg.color}22`, color: cfg.color,
      border: `1px solid ${cfg.color}44`, whiteSpace: "nowrap",
    }}>
      {cfg.icon ?? ""} {cfg.label}
    </span>
  );
}

function SelectInput({ value, onChange, options, style }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  style?: React.CSSProperties;
}) {
  const { theme: t } = useApp();
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: "7px 12px", borderRadius: "10px",
        border: `1px solid ${t.cardBorder}`,
        background: t.inputBg, color: t.inputText,
        fontSize: "12px", fontFamily: FONT.body,
        outline: "none", cursor: "pointer", ...style,
      }}
    >
      {[...options].sort((a, b) => (a.label ?? "").localeCompare(b.label ?? "", "pt-BR")).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function BtnPrimary({ onClick, children, disabled, style, title }: {
  onClick: () => void; children: React.ReactNode;
  disabled?: boolean; style?: React.CSSProperties;
  title?: string;
}) {
  const brand = useDashboardBrand();
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "8px 16px", borderRadius: "10px", border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        background: brand.useBrand ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" : `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
        color: "#fff", fontSize: "12px", fontWeight: 700,
        fontFamily: FONT.body, ...style,
      }}
    >
      {children}
    </button>
  );
}

function BtnAcao({ onClick, children, color }: {
  onClick: () => void; children: React.ReactNode; color: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px", borderRadius: "8px",
        border: `1px solid ${color}44`,
        background: `${color}15`, color,
        fontSize: "11px", fontWeight: 700,
        fontFamily: FONT.body, cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function ModalBase({ children, maxWidth = 440, onClose: _onClose }: {
  children: React.ReactNode; maxWidth?: number; onClose: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#00000090",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "20px",
    }}>
      <div style={{
        background: brand.blockBg, border: `1px solid ${t.cardBorder}`,
        borderRadius: "20px", padding: "28px",
        width: "100%", maxWidth, maxHeight: "90vh", overflowY: "auto",
      }}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  const { theme: t } = useApp();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
      <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 900, color: t.text, fontFamily: FONT.title }}>{title}</h2>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: t.textMuted }}>✕</button>
    </div>
  );
}

function BlocoLabel({ label }: { label: string }) {
  const brand = useDashboardBrand();
  return (
    <span style={{
      fontSize: "11px", fontWeight: 700, letterSpacing: "1.5px",
      textTransform: "uppercase", color: brand.secondary, fontFamily: FONT.body,
    }}>
      {label}
    </span>
  );
}

// ── MODAL ANALISAR ─────────────────────────────────────────────────────────────

function ModalAnalisar({ row, ciclo, onClose, onConfirm }: {
  row: PagamentoRow;
  ciclo: CicloPagamento;
  onClose: () => void;
  onConfirm: (id: string, novoTotal: number, isAgente: boolean) => Promise<void>;
}) {
  const { theme: t } = useApp();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [valor, setValor] = useState(String(row.total));
  const [lives, setLives] = useState<any[]>([]);

  const rawValor = valor.replace(",", ".").trim();
  const parsedValor = rawValor === "" ? NaN : Number.parseFloat(rawValor);
  const valorNum = Number.isFinite(parsedValor) ? parsedValor : NaN;
  const editado = Number.isFinite(valorNum) && valorNum !== row.total;

  useEffect(() => {
    if (!row.is_agente) carregarLives();
  }, []);

  async function carregarLives() {
    let query = supabase
      .from("lives")
      .select("id, data, plataforma")
      .eq("influencer_id", row.influencer_id)
      .eq("status", "realizada")
      .gte("data", ciclo.data_inicio)
      .lte("data", ciclo.data_fim)
      .order("data", { ascending: false });
    if (row.operadora_slug) {
      query = query.eq("operadora_slug", row.operadora_slug);
    }
    const { data: livesData } = await query;
    const livesList = livesData ?? [];
    if (livesList.length === 0) { setLives([]); return; }
    const liveIds = livesList.map((l: any) => l.id);
    const { data: resData } = await supabase
      .from("live_resultados")
      .select("live_id, duracao_horas, duracao_min")
      .in("live_id", liveIds);
    const resultadosMap = new Map<string, { duracao_horas: number; duracao_min: number }>();
    for (const r of (resData ?? []) as { live_id: string; duracao_horas: number; duracao_min: number }[]) {
      resultadosMap.set(String(r.live_id), { duracao_horas: r.duracao_horas ?? 0, duracao_min: r.duracao_min ?? 0 });
    }
    const merged = livesList.map((l: any) => ({
      ...l,
      _resultado: resultadosMap.get(String(l.id)),
    }));
    setLives(merged);
  }

  async function handleConfirm(totalAprovar: number) {
    setError("");
    setSaving(true);
    try {
      await onConfirm(row.id, totalAprovar, row.is_agente ?? false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar. Tente novamente.";
      setError(msg);
      console.error("[ModalAnalisar] Erro ao aprovar:", e);
      alert("Erro ao aprovar: " + msg);
    } finally {
      setSaving(false);
    }
  }
  const handleConfirmClick = () => {
    if (!Number.isFinite(valorNum) || valorNum < 0) {
      alert("Informe um valor válido (use 0,00 para zerar o valor da plataforma).");
      return;
    }
    void handleConfirm(valorNum);
  };

  const rowStyle: React.CSSProperties = {
    display: "flex", justifyContent: "space-between",
    padding: "10px 0", borderBottom: `1px solid ${t.divider}`,
    fontSize: "13px",
  };

  return (
    <ModalBase maxWidth={480} onClose={onClose}>
      <ModalHeader
        title={row.is_agente ? "⏳ Analisar — Agente" : `⏳ Analisar — ${row.influencer_name}`}
        onClose={onClose}
      />

      {error && (
        <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)", color: "#ef4444", borderRadius: 10, padding: "12px 14px", fontSize: 13, marginBottom: 16, fontFamily: FONT.body }}>
          ⚠️ {error}
        </div>
      )}

      {!row.is_agente && (
        <div style={{ marginBottom: "16px" }}>
          <div style={rowStyle}>
            <span style={{ color: t.textMuted }}>Horas realizadas</span>
            <span style={{ fontWeight: 700 }}>{fmtHoras(row.horas_realizadas)}</span>
          </div>
          <div style={{ ...rowStyle, borderBottom: "none" }}>
            <span style={{ color: t.textMuted }}>Cachê/hora</span>
            <span style={{ fontWeight: 700 }}>
              {row.cache_hora > 0 ? fmtMoeda(row.cache_hora) : <span style={{ color: "#ef4444" }}>Não cadastrado</span>}
            </span>
          </div>
        </div>
      )}

      {row.is_agente && row.descricao && (
        <div style={{ ...rowStyle, marginBottom: "16px", borderBottom: "none" }}>
          <span style={{ color: t.textMuted }}>Descrição</span>
          <span style={{ fontWeight: 600 }}>{row.descricao}</span>
        </div>
      )}

      {!row.is_agente && lives.length > 0 && (
        <div style={{
          marginBottom: "20px", padding: "14px", borderRadius: "12px",
          background: t.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
          border: `1px solid ${t.cardBorder}`,
        }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px", fontFamily: FONT.body }}>
            Lives no período
          </div>
          {lives.map((l: any) => {
            const r = l._resultado;
            const h = r ? (r.duracao_horas ?? 0) + (r.duracao_min ?? 0) / 60 : 0;
            return (
              <div key={l.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${t.divider}`, fontSize: "12px" }}>
                <span style={{ color: t.text }}>{l.data} · {l.plataforma}</span>
                <span style={{ color: t.textMuted, fontFamily: FONT.body }}>{fmtHoras(h)}</span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginBottom: "20px" }}>
        <label style={{ fontSize: "11px", fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "8px", fontFamily: FONT.body }}>
          Valor a aprovar (R$)
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            type="number"
            min={0}
            step="0.01"
            value={valor}
            onChange={e => {
              const v = e.target.value;
              if (v === "") { setValor(v); return; }
              if (v === "-") return;
              const num = parseFloat(v.replace(",", "."));
              if (!isNaN(num) && num < 0) return;
              setValor(v);
            }}
            style={{
              flex: 1, padding: "10px 14px", borderRadius: "10px",
              border: `1px solid ${editado ? "#f59e0b" : t.cardBorder}`,
              background: t.inputBg, color: t.inputText,
              fontSize: "16px", fontWeight: 700, fontFamily: FONT.body, outline: "none",
            }}
          />
          {editado && <span style={{ fontSize: "11px", color: "#f59e0b", whiteSpace: "nowrap" }}>era {fmtMoeda(row.total)}</span>}
        </div>
        {editado && (
          <div style={{ marginTop: "8px", fontSize: "11px", color: "#f59e0b", fontFamily: FONT.body }}>
            ⚠️ Valor editado manualmente.
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.textMuted, fontSize: "13px", fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}>
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleConfirmClick}
          disabled={saving || !Number.isFinite(valorNum) || valorNum < 0}
          style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", cursor: (saving || !Number.isFinite(valorNum) || valorNum < 0) ? "not-allowed" : "pointer", opacity: (saving || !Number.isFinite(valorNum) || valorNum < 0) ? 0.7 : 1, background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: FONT.body }}
        >
          {saving ? "⏳ Salvando..." : "✅ Aprovar valor"}
        </button>
      </div>
    </ModalBase>
  );
}

// ── MODAL PAGAR ────────────────────────────────────────────────────────────────

function ModalPagar({ row, onClose, onConfirm, onRetornar }: {
  row: PagamentoRow;
  onClose: () => void;
  onConfirm: (id: string, isAgente: boolean) => Promise<void>;
  onRetornar: (id: string, isAgente: boolean) => Promise<void>;
}) {
  const { theme: t } = useApp();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setError("");
    setSaving(true);
    try {
      await onConfirm(row.id, row.is_agente ?? false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRetornarClick() {
    setError("");
    setSaving(true);
    try {
      await onRetornar(row.id, row.is_agente ?? false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao retornar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalBase maxWidth={380} onClose={onClose}>
      <ModalHeader title="💰 Registrar Pagamento" onClose={onClose} />
      {error && (
        <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)", color: "#ef4444", borderRadius: 10, padding: "12px 14px", fontSize: 13, marginBottom: 16, fontFamily: FONT.body }}>
          ⚠️ {error}
        </div>
      )}
      <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "20px" }}>
        Confirmar pagamento para <strong style={{ color: t.text }}>{row.influencer_name}</strong>
        {row.is_agente && row.descricao && <> — {row.descricao}</>}
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderTop: `1px solid ${t.divider}`, borderBottom: `1px solid ${t.divider}`, marginBottom: "20px" }}>
        <span style={{ color: t.textMuted, fontSize: "14px" }}>Total</span>
        <span style={{ fontWeight: 900, color: "#10b981", fontSize: "24px", fontFamily: FONT.title }}>{fmtMoeda(row.total)}</span>
      </div>
      <p style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "20px", lineHeight: 1.6 }}>
        A data de pagamento será registrada como hoje.
      </p>
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={handleRetornarClick}
          disabled={saving}
          style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.text, fontSize: "13px", fontWeight: 700, fontFamily: FONT.body, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "⏳ Salvando..." : "↩️ Retornar"}
        </button>
        <button
          onClick={handleConfirm}
          disabled={saving}
          style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, background: "linear-gradient(135deg, #065f46, #10b981)", color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: FONT.body }}
        >
          {saving ? "⏳ Salvando..." : "💰 Confirmar pagamento"}
        </button>
      </div>
    </ModalBase>
  );
}

// ── MODAL AGENTE ───────────────────────────────────────────────────────────────

function ModalAgente({ cicloId, filterOperadora, operadorasList, podeVerOperadora, onClose, onSalvo }: {
  cicloId: string;
  filterOperadora: string;
  operadorasList: { slug: string; nome: string }[];
  podeVerOperadora: (slug: string) => boolean;
  onClose: () => void;
  onSalvo: () => Promise<void>;
}) {
  const { theme: t } = useApp();
  const [saving, setSaving] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [operadoraSlug, setOperadoraSlug] = useState(filterOperadora !== "todas" ? filterOperadora : "");

  const opcoes = operadorasList.filter((o) => podeVerOperadora(o.slug));
  const precisaSelecionarOp = filterOperadora === "todas" && opcoes.length > 1;
  const opFinal = filterOperadora !== "todas" ? filterOperadora : operadoraSlug;

  const valorNum = parseFloat(valor.replace(",", ".")) || 0;
  const canSubmit = descricao.trim().length > 0 && valorNum > 0 && (!precisaSelecionarOp || opFinal);

  async function handleConfirm() {
    if (!canSubmit || !opFinal) return;
    setSaving(true);
    await supabase.from("pagamentos_agentes").insert({
      ciclo_id: cicloId,
      operadora_slug: opFinal,
      descricao: descricao.trim(),
      total: valorNum,
      status: "em_analise",
    });
    await onSalvo();
    setSaving(false);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: "10px",
    border: `1px solid ${t.cardBorder}`, background: t.inputBg,
    color: t.inputText, fontSize: "13px", fontFamily: FONT.body,
    outline: "none", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "11px", fontWeight: 700, color: t.textMuted,
    textTransform: "uppercase", letterSpacing: "1px",
    display: "block", marginBottom: "6px", fontFamily: FONT.body,
  };

  return (
    <ModalBase maxWidth={400} onClose={onClose}>
      <ModalHeader title="➕ Pagamento de Agente" onClose={onClose} />
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {precisaSelecionarOp && (
          <div>
            <label style={labelStyle}>Operadora *</label>
            <select value={operadoraSlug} onChange={e => setOperadoraSlug(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">Selecione...</option>
              {[...opcoes].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map(o => <option key={o.slug} value={o.slug}>{o.nome}</option>)}
            </select>
          </div>
        )}
        <div>
          <label style={labelStyle}>Descrição *</label>
          <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Comissão João" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Valor (R$) *</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={valor}
            onChange={e => {
              const v = e.target.value;
              if (v === "") { setValor(v); return; }
              if (v === "-") return;
              const num = parseFloat(v.replace(",", "."));
              if (!isNaN(num) && num < 0) return;
              setValor(v);
            }}
            placeholder="0,00"
            style={inputStyle}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
        <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.textMuted, fontSize: "13px", fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}>
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          disabled={saving || !canSubmit}
          style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", cursor: (saving || !canSubmit) ? "not-allowed" : "pointer", opacity: (saving || !canSubmit) ? 0.6 : 1, background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: FONT.body }}
        >
          {saving ? "⏳ Salvando..." : "➕ Adicionar"}
        </button>
      </div>
    </ModalBase>
  );
}

// ── BLOCO 1: KPIs ──────────────────────────────────────────────────────────────

interface BlocoFiltros {
  podeVerInfluencer: (id: string) => boolean;
  podeVerOperadora: (slug: string) => boolean;
  filterInfluencers: string[];
  filterOperadora: string;
  filtroOp: string[] | null;
  operadoraInfMap: Record<string, string[]>;
  operadorasList: { slug: string; nome: string }[];
  mesFiltro: string;
  historico: boolean;
}

function BlocoKpis({ filtros }: { filtros: BlocoFiltros }) {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const { podeVerInfluencer, filterInfluencers, filterOperadora, filtroOp, mesFiltro, historico } = filtros;
  const mes = historico ? "" : mesFiltro;

  const [totalPago, setTotalPago] = useState(0);
  const [pendente, setPendente] = useState(0);
  const [horas, setHoras] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { carregar(); }, [mes, podeVerInfluencer, filterInfluencers, filterOperadora]);

  async function carregar() {
    setLoading(true);
    const periodo = periodoDoMes(mes);

    let cicloIds: string[] = [];
    if (periodo) {
      const { data: ciclos } = await supabase
        .from("ciclos_pagamento")
        .select("id")
        .gte("data_fim", periodo.inicio)
        .lte("data_fim", periodo.fim);
      cicloIds = (ciclos ?? []).map((c: any) => c.id);
      if (cicloIds.length === 0) {
        setTotalPago(0); setPendente(0); setHoras(0);
        setLoading(false); return;
      }
    }

    // Total pago: usa mesma fonte que os Dashboards (RPC ou fallback) — garante alinhamento
    if (periodo) {
      const { total } = await buscarInvestimentoPago(periodo, {
        influencerIds: filterInfluencers.length > 0 ? filterInfluencers : undefined,
        operadora_slug: filtroOp?.length ? filtroOp[0] : (filterOperadora !== "todas" ? filterOperadora : undefined),
      });
      setTotalPago(total);
    }

    const pQuery = periodo
      ? supabase.from("pagamentos").select("influencer_id, total, horas_realizadas, status, operadora_slug").in("ciclo_id", cicloIds)
      : supabase.from("pagamentos").select("influencer_id, total, horas_realizadas, status, operadora_slug");

    const aQuery = periodo
      ? supabase.from("pagamentos_agentes").select("total, status, operadora_slug").in("ciclo_id", cicloIds)
      : supabase.from("pagamentos_agentes").select("total, status, operadora_slug");

    const [{ data: pags }, { data: agentes }] = await Promise.all([pQuery, aQuery]);

    let allPags = (pags ?? []).filter((p: any) => podeVerInfluencer(p.influencer_id));
    if (filterInfluencers.length > 0) allPags = allPags.filter((p: any) => filterInfluencers.includes(p.influencer_id));
    if (filtroOp?.length) {
      allPags = allPags.filter((p: any) => p.operadora_slug && filtroOp.includes(p.operadora_slug));
    } else if (filterOperadora && filterOperadora !== "todas") {
      allPags = allPags.filter((p: any) => p.operadora_slug === filterOperadora);
    }
    let allAgs = user?.role === "influencer" ? [] : (agentes ?? []);
    if (filtroOp?.length) {
      allAgs = allAgs.filter((a: any) => a.operadora_slug && filtroOp.includes(a.operadora_slug));
    } else if (filterOperadora && filterOperadora !== "todas") {
      allAgs = allAgs.filter((a: any) => a.operadora_slug === filterOperadora);
    }

    if (!periodo) {
      setTotalPago(
        [...allPags.filter((p: any) => p.status === "pago"), ...allAgs.filter((a: any) => a.status === "pago")]
          .reduce((acc: number, x: any) => acc + x.total, 0)
      );
    }
    setPendente(
      [...allPags.filter((p: any) => p.status === "em_analise" || p.status === "a_pagar"), ...allAgs.filter((a: any) => a.status === "em_analise" || a.status === "a_pagar")]
        .reduce((acc: number, x: any) => acc + x.total, 0)
    );
    setHoras(allPags.reduce((acc: number, p: any) => acc + p.horas_realizadas, 0));
    setLoading(false);
  }

  const innerCard = (accent: string): React.CSSProperties => ({
    background: t.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.025)",
    border: `1px solid ${t.cardBorder}`,
    borderRadius: "12px",
    padding: "20px 22px",
    borderTop: `3px solid ${accent}`,
    flex: 1,
    minWidth: "180px",
  });

  return (
    <div style={{
      background: brand.blockBg,
      border: `1px solid ${t.cardBorder}`,
      borderRadius: "16px",
      padding: "22px",
      marginBottom: "24px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
        <BlocoLabel label="📊 KPIs" />
      </div>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <div style={innerCard(BASE_COLORS.purple)}>
          <div style={{ fontFamily: FONT.title, fontSize: "26px", fontWeight: 900, color: "#c9b8f0", lineHeight: 1, marginBottom: "6px" }}>
            {loading ? "—" : fmtMoeda(totalPago)}
          </div>
          <div style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body }}>Total pago</div>
        </div>

        <div style={innerCard("#f59e0b")}>
          <div style={{ fontFamily: FONT.title, fontSize: "26px", fontWeight: 900, color: "#f59e0b", lineHeight: 1, marginBottom: "6px" }}>
            {loading ? "—" : fmtMoeda(pendente)}
          </div>
          <div style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body }}>Pendente</div>
        </div>

        <div style={innerCard("#10b981")}>
          <div style={{ fontFamily: FONT.title, fontSize: "26px", fontWeight: 900, color: "#10b981", lineHeight: 1, marginBottom: "6px" }}>
            {loading ? "—" : fmtHoras(horas)}
          </div>
          <div style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body }}>Total de horas realizadas</div>
        </div>
      </div>
    </div>
  );
}

// ── BLOCO 2: CICLOS ────────────────────────────────────────────────────────────

function BlocoCiclos({ ciclos, onRecarregar, filtros }: {
  ciclos: CicloPagamento[];
  onRecarregar: () => void;
  filtros: BlocoFiltros;
}) {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("financeiro");
  const { podeVerInfluencer, podeVerOperadora: _podeVerOperadora, filterInfluencers, filterOperadora, filtroOp, operadoraInfMap: _operadoraInfMap, operadorasList } = filtros;

  const cicloAtualAberto = ciclos.find(c => !c.fechado_em && cicloAberto(c));
  const [cicloId, setCicloId] = useState<string>(cicloAtualAberto?.id ?? ciclos[0]?.id ?? "");
  const [rows, setRows] = useState<PagamentoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalAnalisar, setModalAnalisar] = useState<PagamentoRow | null>(null);
  const [modalPagar, setModalPagar] = useState<PagamentoRow | null>(null);
  const [modalAgente, setModalAgente] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [enviarPagamentoLoading, setEnviarPagamentoLoading] = useState(false);

  const ciclo = ciclos.find(c => c.id === cicloId) ?? ciclos[0] ?? null;
  const isAberto = ciclo ? cicloAberto(ciclo) : false;
  const temAguardandoPagamento = useMemo(
    () => rows.some(r => r.status === "a_pagar"),
    [rows],
  );

  // Padrão: ciclo atual (aberto). Só altera se a seleção for inválida (ciclo removido da lista)
  useEffect(() => {
    const sel = ciclos.find(c => c.id === cicloId);
    const aberto = ciclos.find(c => !c.fechado_em && cicloAberto(c));
    if (!sel) setCicloId(aberto?.id ?? ciclos[0]?.id ?? "");
  }, [ciclos, cicloId]);

  // Fecha automaticamente ciclos vencidos (quando quarta 23h59 passou → quinta 00h)
  useEffect(() => {
    if (ciclos.length === 0) return;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const paraFechar = ciclos.find(c => !c.fechado_em && hoje > new Date((c.data_fim || "") + "T00:00:00"));
    if (paraFechar) fecharCiclo(paraFechar);
  }, [ciclos]);

  useEffect(() => {
    if (ciclo) carregarDados(ciclo);
  }, [cicloId, podeVerInfluencer, filterInfluencers, filterOperadora, refreshTrigger]);

  async function fecharCiclo(c: CicloPagamento) {
    await gerarPagamentosDoCiclo(c);
    await supabase.from("ciclos_pagamento").update({ fechado_em: new Date().toISOString() }).eq("id", c.id);
    onRecarregar();
  }

  const OPERADORA_PADRAO = "casa_apostas";

  async function gerarPagamentosDoCiclo(c: CicloPagamento) {
    const { data: lives } = await supabase
      .from("lives")
      .select("id, influencer_id, operadora_slug")
      .eq("status", "realizada")
      .gte("data", c.data_inicio)
      .lte("data", c.data_fim);

    const livesFiltradas = ((lives ?? []) as any[]).filter((l: any) => podeVerInfluencer(l.influencer_id));
    const liveIds = livesFiltradas.map((l: any) => l.id);
    let resultados: { live_id: string; duracao_horas: number; duracao_min: number }[] = [];
    if (liveIds.length > 0) {
      const { data: resData } = await supabase.from("live_resultados").select("live_id, duracao_horas, duracao_min").in("live_id", liveIds);
      resultados = resData || [];
    }

    const horasPorPar: Record<string, number> = {};
    const key = (inf: string, op: string) => `${inf}::${op}`;
    for (const live of livesFiltradas) {
      const res = resultados.find((r) => r.live_id === live.id);
      if (res) {
        const opSlug = live.operadora_slug?.trim() || OPERADORA_PADRAO;
        const k = key(live.influencer_id, opSlug);
        const horas = (res.duracao_horas ?? 0) + (res.duracao_min ?? 0) / 60;
        horasPorPar[k] = (horasPorPar[k] ?? 0) + horas;
      }
    }

    for (const [parKey, horas] of Object.entries(horasPorPar)) {
      const [influencer_id, operadora_slug] = parKey.split("::");
      const { data: perfil } = await supabase.from("influencer_perfil").select("cache_hora").eq("id", influencer_id).single();
      const cache_hora = perfil?.cache_hora ?? 0;
      const total = Math.round(horas * cache_hora * 100) / 100;
      await supabase.from("pagamentos").upsert({
        ciclo_id: c.id, influencer_id, operadora_slug,
        horas_realizadas: Math.round(horas * 100) / 100,
        cache_hora, total, status: "em_analise",
      }, { onConflict: "ciclo_id,influencer_id,operadora_slug" });
    }
  }

  async function carregarDados(c: CicloPagamento) {
    setLoading(true);
    if (cicloAberto(c)) {
      await carregarPreview(c);
    } else {
      // Ciclo fechado: carrega os pagamentos existentes (preserva status aprovado/a pagar/pago).
      await carregarPagamentos(c);
    }
    setLoading(false);
  }

  async function carregarPreview(c: CicloPagamento) {
    const { data: lives } = await supabase
      .from("lives")
      .select("id, influencer_id, operadora_slug")
      .eq("status", "realizada")
      .gte("data", c.data_inicio)
      .lte("data", c.data_fim);

    const livesFiltradas = (lives ?? []).filter((l: any) => podeVerInfluencer(l.influencer_id));
    if (livesFiltradas.length === 0) { setRows([]); return; }

    const liveIds = livesFiltradas.map((l: any) => l.id);
    let resultados: { live_id: string; duracao_horas: number; duracao_min: number }[] = [];
    if (liveIds.length > 0) {
      const { data: resData } = await supabase.from("live_resultados").select("live_id, duracao_horas, duracao_min").in("live_id", liveIds);
      resultados = resData || [];
    }

    const horasPorPar: Record<string, { horas: number; qtd: number }> = {};
    const key = (inf: string, op: string) => `${inf}::${op}`;
    for (const live of livesFiltradas as any[]) {
      const res = resultados.find((r) => String(r.live_id) === String(live.id));
      if (res) {
        const opSlug = live.operadora_slug?.trim() || OPERADORA_PADRAO;
        const k = key(live.influencer_id, opSlug);
        if (!horasPorPar[k]) horasPorPar[k] = { horas: 0, qtd: 0 };
        const horas = (res.duracao_horas ?? 0) + (res.duracao_min ?? 0) / 60;
        horasPorPar[k].horas += horas;
        horasPorPar[k].qtd += 1;
      }
    }

    let parKeys = Object.keys(horasPorPar);
    if (filterInfluencers.length > 0) parKeys = parKeys.filter((k) => filterInfluencers.includes(k.split("::")[0]));
    if (filtroOp?.length) {
      parKeys = parKeys.filter((k) => filtroOp.some(op => k.endsWith(`::${op}`)));
    } else if (filterOperadora && filterOperadora !== "todas") {
      parKeys = parKeys.filter((k) => k.endsWith(`::${filterOperadora}`));
    }
    const ids = [...new Set(parKeys.map((k) => k.split("::")[0]))];
    const [{ data: profiles }, { data: perfis }] = await Promise.all([
      supabase.from("profiles").select("id, name").in("id", ids),
      supabase.from("influencer_perfil").select("id, cache_hora, nome_artistico").in("id", ids),
    ]);

    const nameMap: Record<string, string> = {};
    for (const p of (profiles ?? []) as any[]) nameMap[p.id] = p.name;

    const perfilMap: Record<string, { cache: number; artistico: string }> = {};
    for (const p of (perfis ?? []) as any[]) {
      perfilMap[p.id] = { cache: p.cache_hora ?? 0, artistico: p.nome_artistico ?? nameMap[p.id] ?? p.id };
    }

    const result: PagamentoRow[] = parKeys.map(parKey => {
      const [id, opSlug] = parKey.split("::");
      const { horas, qtd } = horasPorPar[parKey];
      const h = Math.round(horas * 100) / 100;
      const cache = perfilMap[id]?.cache ?? 0;
      return {
        id: `preview_${parKey}`,
        influencer_id: id,
        influencer_name: perfilMap[id]?.artistico ?? nameMap[id] ?? id,
        operadora_slug: opSlug,
        horas_realizadas: h,
        cache_hora: cache,
        total: Math.round(h * cache * 100) / 100,
        status: "em_analise" as PagamentoStatus,
        pago_em: null,
        qtd_lives: qtd,
      };
    });

    result.sort((a, b) => b.total - a.total);
    setRows(result);
  }

  async function carregarPagamentos(c: CicloPagamento) {
    const [{ data: pags }, { data: agentes }, { data: livesCiclo }] = await Promise.all([
      supabase.from("pagamentos")
        .select("*")
        .eq("ciclo_id", c.id)
        .order("total", { ascending: false }),
      supabase.from("pagamentos_agentes")
        .select("*")
        .eq("ciclo_id", c.id)
        .order("criado_em", { ascending: true }),
      supabase.from("lives")
        .select("id, influencer_id, operadora_slug")
        .eq("status", "realizada")
        .gte("data", c.data_inicio)
        .lte("data", c.data_fim),
    ]);

    // Sincroniza lives validadas após o fechamento: cria pagamentos faltantes (em_analise) sem alterar os existentes
    const existentesKeys = new Set((pags ?? []).map((p: any) => `${p.influencer_id}::${p.operadora_slug}`));
    const livesSemPagamento = (livesCiclo ?? []).filter((l: any) => {
      if (!podeVerInfluencer(l.influencer_id)) return false;
      const opSlug = l.operadora_slug?.trim() || OPERADORA_PADRAO;
      return !existentesKeys.has(`${l.influencer_id}::${opSlug}`);
    });
    let pagsFinais = pags ?? [];
    if (livesSemPagamento.length > 0) {
      const liveIdsSync = livesSemPagamento.map((l: any) => l.id);
      const { data: resSync } = await supabase.from("live_resultados").select("live_id, duracao_horas, duracao_min").in("live_id", liveIdsSync);
      const horasPorPar: Record<string, number> = {};
      const keySync = (inf: string, op: string) => `${inf}::${op}`;
      for (const live of livesSemPagamento as any[]) {
        const res = (resSync ?? []).find((r: any) => String(r.live_id) === String(live.id));
        if (res) {
          const opSlug = live.operadora_slug?.trim() || OPERADORA_PADRAO;
          const k = keySync(live.influencer_id, opSlug);
          const horas = (res.duracao_horas ?? 0) + (res.duracao_min ?? 0) / 60;
          horasPorPar[k] = (horasPorPar[k] ?? 0) + horas;
        }
      }
      for (const [parKey, horas] of Object.entries(horasPorPar)) {
        const [influencer_id, operadora_slug] = parKey.split("::");
        const { data: perfil } = await supabase.from("influencer_perfil").select("cache_hora").eq("id", influencer_id).single();
        const cache_hora = perfil?.cache_hora ?? 0;
        const total = Math.round(horas * cache_hora * 100) / 100;
        await supabase.from("pagamentos").upsert({
          ciclo_id: c.id, influencer_id, operadora_slug,
          horas_realizadas: Math.round(horas * 100) / 100,
          cache_hora, total, status: "em_analise",
        }, { onConflict: "ciclo_id,influencer_id,operadora_slug" });
      }
      if (Object.keys(horasPorPar).length > 0) {
        const { data: pagsAtual } = await supabase.from("pagamentos").select("*").eq("ciclo_id", c.id).order("total", { ascending: false });
        pagsFinais = pagsAtual ?? pagsFinais;
      }
    }

    const liveIds = (livesCiclo ?? []).map((l: any) => l.id);
    let resultados: { live_id: string }[] = [];
    if (liveIds.length > 0) {
      const { data: resData } = await supabase.from("live_resultados").select("live_id").in("live_id", liveIds);
      resultados = resData ?? [];
    }
    const qtdPorPar: Record<string, number> = {};
    const key = (inf: string, op: string) => `${inf}::${op}`;
    for (const l of (livesCiclo ?? []) as any[]) {
      if (!podeVerInfluencer(l.influencer_id)) continue;
      const opSlug = l.operadora_slug?.trim() || OPERADORA_PADRAO;
      const temRes = resultados.some((r) => String(r.live_id) === String(l.id));
      if (temRes) {
        const k = key(l.influencer_id, opSlug);
        qtdPorPar[k] = (qtdPorPar[k] ?? 0) + 1;
      }
    }

    // Busca nomes separadamente para evitar falha silenciosa de FK
    const influencerIds = [...new Set(pagsFinais.map((p: any) => p.influencer_id))];
    const nomeMap: Record<string, string> = {};
    if (influencerIds.length > 0) {
      const [{ data: perfis }, { data: profiles }] = await Promise.all([
        supabase.from("influencer_perfil").select("id, nome_artistico").in("id", influencerIds),
        supabase.from("profiles").select("id, name").in("id", influencerIds),
      ]);
      for (const p of (profiles ?? []) as any[]) nomeMap[p.id] = p.name;
      for (const p of (perfis ?? []) as any[]) {
        if (p.nome_artistico) nomeMap[p.id] = p.nome_artistico;
      }
    }

    let pagsFiltrados = pagsFinais.filter((p: any) => podeVerInfluencer(p.influencer_id));
    if (filterInfluencers.length > 0) pagsFiltrados = pagsFiltrados.filter((p: any) => filterInfluencers.includes(p.influencer_id));
    if (filtroOp?.length) {
      pagsFiltrados = pagsFiltrados.filter((p: any) => p.operadora_slug && filtroOp.includes(p.operadora_slug));
    } else if (filterOperadora && filterOperadora !== "todas") {
      pagsFiltrados = pagsFiltrados.filter((p: any) => p.operadora_slug === filterOperadora);
    }

    const linhasInf: PagamentoRow[] = pagsFiltrados.map((p: any) => {
      const parKey = key(p.influencer_id, p.operadora_slug);
      return {
        id: p.id,
        influencer_id: p.influencer_id,
        influencer_name: nomeMap[p.influencer_id] ?? p.influencer_id,
        operadora_slug: p.operadora_slug,
        horas_realizadas: p.horas_realizadas,
        cache_hora: p.cache_hora,
        total: p.total,
        status: p.status,
        pago_em: p.pago_em,
        qtd_lives: qtdPorPar[parKey] ?? 0,
      };
    });

    let agentesFiltrados = user?.role === "influencer" ? [] : (agentes ?? []);
    if (filtroOp?.length) {
      agentesFiltrados = agentesFiltrados.filter((a: any) => a.operadora_slug && filtroOp.includes(a.operadora_slug));
    } else if (filterOperadora && filterOperadora !== "todas") {
      agentesFiltrados = agentesFiltrados.filter((a: any) => a.operadora_slug === filterOperadora);
    }
    const linhasAg: PagamentoRow[] = agentesFiltrados.map((a: any) => ({
      id: a.id,
      influencer_id: "agente",
      influencer_name: "Agentes",
      horas_realizadas: 0,
      cache_hora: 0,
      total: a.total,
      status: a.status,
      pago_em: a.pago_em,
      is_agente: true,
      descricao: a.descricao,
      qtd_lives: 0,
    }));

    setRows([...linhasInf, ...linhasAg]);
  }

  async function handleAprovar(id: string, novoTotal: number, isAgente: boolean) {
    if (String(id).startsWith("preview_")) {
      throw new Error("Ciclo ainda aberto — os pagamentos serão gerados ao fechar o período. Não é possível aprovar a prévia.");
    }
    const tb = isAgente ? "pagamentos_agentes" : "pagamentos";

    let ok = false;
    const { data: rpcData, error: rpcError } = await supabase.rpc("aprovar_pagamento", {
      p_id: id,
      p_total: novoTotal,
      p_is_agente: isAgente ?? false,
    });
    if (rpcError) {
      throw new Error(rpcError.message ?? "RPC falhou: " + JSON.stringify(rpcError));
    }
    if (rpcData && typeof rpcData === "object") {
      const res = rpcData as { ok?: boolean; error?: string };
      if (res.ok === true) ok = true;
      else if (res.ok === false) throw new Error(res.error ?? "Erro ao aprovar.");
    }

    if (!ok) {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("aprovar-pagamento", {
        body: { action: "aprovar", id, total: novoTotal, isAgente: isAgente ?? false },
      });
      if (!fnError && fnData && typeof fnData === "object" && (fnData as { ok?: boolean }).ok === true) {
        ok = true;
      } else if (fnData && typeof fnData === "object" && (fnData as { ok?: boolean }).ok === false) {
        throw new Error((fnData as { error?: string }).error ?? "Erro ao aprovar.");
      }
    }

    if (!ok) {
      const { data, error } = await supabase.from(tb).update({ status: "a_pagar", total: novoTotal }).eq("id", id).select("id");
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) {
        throw new Error("Não foi possível aprovar. Confira: (1) RPC aprovar_pagamento existe no Supabase? Execute docs/archive/fix-financeiro-rpc-aprovar.sql (se ainda aplicável ao estado da base). (2) Edge Function: supabase functions deploy aprovar-pagamento");
      }
    }

    setModalAnalisar(null);
    setRefreshTrigger(t => t + 1);
  }

  async function handlePagar(id: string, isAgente: boolean) {
    if (String(id).startsWith("preview_")) {
      throw new Error("Ciclo ainda aberto — os pagamentos serão gerados ao fechar o período.");
    }
    const tb = isAgente ? "pagamentos_agentes" : "pagamentos";

    let ok = false;
    const { data: rpcData, error: rpcError } = await supabase.rpc("registrar_pagamento", {
      p_id: id,
      p_is_agente: isAgente ?? false,
    });
    if (rpcError) {
      throw new Error(rpcError.message ?? "RPC falhou: " + JSON.stringify(rpcError));
    }
    if (rpcData && typeof rpcData === "object") {
      const res = rpcData as { ok?: boolean; error?: string };
      if (res.ok === true) ok = true;
      else if (res.ok === false) throw new Error(res.error ?? "Erro ao registrar pagamento.");
    }

    if (!ok) {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("aprovar-pagamento", {
        body: { action: "registrar", id, isAgente: isAgente ?? false },
      });
      if (!fnError && fnData && typeof fnData === "object" && (fnData as { ok?: boolean }).ok === true) {
        ok = true;
      } else if (fnData && typeof fnData === "object" && (fnData as { ok?: boolean }).ok === false) {
        throw new Error((fnData as { error?: string }).error ?? "Erro ao registrar pagamento.");
      }
    }

    if (!ok) {
      const { data, error } = await supabase.from(tb).update({ status: "pago", pago_em: new Date().toISOString() }).eq("id", id).select("id");
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) {
        throw new Error("Não foi possível registrar pagamento. Execute docs/archive/fix-financeiro-rpc-aprovar.sql no Supabase (se ainda aplicável ao estado da base).");
      }
    }

    setModalPagar(null);
    setRefreshTrigger(t => t + 1);
  }

  async function handleRetornar(id: string, isAgente: boolean) {
    if (String(id).startsWith("preview_")) {
      throw new Error("Ciclo ainda aberto.");
    }
    const tb = isAgente ? "pagamentos_agentes" : "pagamentos";
    const { error } = await supabase.from(tb).update({ status: "em_analise", pago_em: null }).eq("id", id).select("id");
    if (error) throw new Error(error.message);
    setModalPagar(null);
    setRefreshTrigger(t => t + 1);
  }

  const kpi = useMemo(() => ({
    em: rows.filter(r => r.status === "em_analise").length,
    ap: rows.filter(r => r.status === "a_pagar").length,
    pg: rows.filter(r => r.status === "pago").length,
    total: rows.reduce((a, r) => a + r.total, 0),
  }), [rows]);

  async function handleEnviarPagamentoEmail() {
    if (!ciclo || isAberto || !temAguardandoPagamento) return;
    setEnviarPagamentoLoading(true);
    try {
      const res = await enviarPagamentoEmailCiclo(supabase, ciclo.id);
      if (!res.ok) {
        alert(res.error);
        return;
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao enviar notificação de pagamento.");
    } finally {
      setEnviarPagamentoLoading(false);
    }
  }

  const th: React.CSSProperties = {
    padding: "11px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700,
    letterSpacing: "1.2px", textTransform: "uppercase", color: t.textMuted,
    background: t.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
    borderBottom: `1px solid ${t.cardBorder}`,
  };
  const td: React.CSSProperties = {
    padding: "13px 14px", fontSize: "13px", color: t.text, fontFamily: FONT.body,
  };

  const opcioesCiclo = ciclos.map(c => ({
    value: c.id,
    label: `${c.data_inicio} – ${c.data_fim}${cicloAberto(c) ? " (atual)" : ""}`,
  }));

  return (
    <div style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: "16px", padding: "22px", marginBottom: "24px" }}>

      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <BlocoLabel label="📅 CICLO DE PAGAMENTO" />

          {ciclo && (
            <span style={{
              fontSize: "12px", fontWeight: 700, padding: "4px 12px", borderRadius: "20px",
              background: isAberto ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.12)",
              color: isAberto ? "#f59e0b" : "#10b981",
              border: `1px solid ${isAberto ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.3)"}`,
            }}>
              {isAberto ? "🔓 Atual" : "✅ Fechado"}
            </span>
          )}

          <SelectInput
            value={cicloId}
            onChange={v => setCicloId(v)}
            options={opcioesCiclo}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {ciclo && !isAberto && temAguardandoPagamento && perm.canEditarOk && (
            <BtnPrimary
              onClick={() => void handleEnviarPagamentoEmail()}
              disabled={enviarPagamentoLoading}
              title="Notificar por e-mail (automação em configuração)"
            >
              {enviarPagamentoLoading ? "⏳ Enviando..." : "Enviar Pagamento"}
            </BtnPrimary>
          )}
          {ciclo && perm.canEditarOk && (
            <BtnPrimary onClick={() => setModalAgente(true)}>
              ➕ Pagamento de Agente
            </BtnPrimary>
          )}
        </div>
      </div>

      {/* KPIs do ciclo (apenas fechado) */}
      {!isAberto && rows.length > 0 && (
        <div className="app-grid-kpi-4" style={{ gap: "10px", marginBottom: "20px" }}>
          {[
            { value: kpi.em,             label: "Em análise",   color: "#f59e0b" },
            { value: kpi.ap,             label: "A pagar",      color: "#6b7fff" },
            { value: kpi.pg,             label: "Pago",         color: "#10b981" },
            { value: fmtMoeda(kpi.total), label: "Total do ciclo", color: t.text },
          ].map((item, i) => (
            <div key={i} style={{ background: t.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.cardBorder}`, borderRadius: "10px", padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontFamily: FONT.title, fontSize: "20px", fontWeight: 900, color: item.color, marginBottom: "3px" }}>{item.value}</div>
              <div style={{ fontSize: "10px", color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: FONT.body }}>{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Badge preview */}
      {isAberto && rows.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "10px", marginBottom: "16px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", fontSize: "12px", color: "#f59e0b", fontFamily: FONT.body }}>
          🔴 Prévia em tempo real — ciclo aberto. Os pagamentos serão gerados ao encerrar o período.
        </div>
      )}

      {/* Tabela */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px", color: t.textMuted, fontFamily: FONT.body }}>Carregando...</div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: "12px", border: `1px solid ${t.cardBorder}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Influencer</th>
                {filterOperadora === "todas" && <th style={th}>Operadora</th>}
                {isAberto
                  ? ["Lives", "Horas realizadas", "Cachê/hora", "Estimativa"].map(h => <th key={h} style={th}>{h}</th>)
                  : ["Lives", "Horas realizadas", "Total", "Status", "Ação"].map(h => <th key={h} style={th}>{h}</th>)
                }
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={(isAberto ? 5 : 6) + (filterOperadora === "todas" ? 1 : 0)} style={{ ...td, textAlign: "center", color: t.textMuted, padding: "48px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                      {isAberto ? "Nenhuma live realizada neste ciclo ainda." : "Nenhum pagamento neste ciclo."}
                      <span style={{ fontSize: "12px", maxWidth: 480, display: "block", marginTop: 8 }}>
                        <strong>Confira:</strong> (1) Selecione no dropdown acima o ciclo que contém as datas das suas lives — ex.: lives em 26–28/01 ficam no ciclo 22/01–28/01 (qui–qua). (2) A live foi validada em <strong>Lives → Resultados</strong> com status realizada, operadora e duração? (3) O influencer tem cachê/hora em Operações → Influencers? (4) O filtro de operadora está em &quot;Todas&quot;?
                      </span>
                    </div>
                  </td>
                </tr>
              ) : rows.map((row, i) => (
                <tr key={row.id} style={{ borderBottom: i < rows.length - 1 ? `1px solid ${t.cardBorder}` : "none" }}>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Avatar name={row.is_agente ? "A" : row.influencer_name} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{row.influencer_name}</div>
                        {row.is_agente && row.descricao && (
                          <div style={{ fontSize: "11px", color: t.textMuted }}>{row.descricao}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {filterOperadora === "todas" && (
                    <td style={{ ...td, color: t.textMuted, fontSize: "12px" }}>
                      {row.is_agente ? "—" : (operadorasList.find(o => o.slug === row.operadora_slug)?.nome ?? row.operadora_slug ?? "—")}
                    </td>
                  )}

                  {isAberto ? (
                    <>
                      <td style={{ ...td, color: t.textMuted }}>{row.qtd_lives ?? 0} live{(row.qtd_lives ?? 0) !== 1 ? "s" : ""}</td>
                      <td style={td}>{fmtHoras(row.horas_realizadas)}</td>
                      <td style={{ ...td, color: t.textMuted }}>
                        {row.cache_hora > 0
                          ? fmtMoeda(row.cache_hora)
                          : <span style={{ color: "#ef4444", fontSize: "11px" }}>Não cadastrado</span>}
                      </td>
                      <td style={{ ...td, fontWeight: 700, color: row.cache_hora > 0 ? "#c9b8f0" : t.textMuted }}>
                        {row.cache_hora > 0 ? fmtMoeda(row.total) : "—"}
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ ...td, color: t.textMuted }}>{row.is_agente ? "—" : `${row.qtd_lives ?? 0} live${(row.qtd_lives ?? 0) !== 1 ? "s" : ""}`}</td>
                      <td style={td}>{row.is_agente ? "—" : fmtHoras(row.horas_realizadas)}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{fmtMoeda(row.total)}</td>
                      <td style={td}><Badge status={row.status} config={STATUS_PAG} /></td>
                      <td style={td}>
                        {row.status === "em_analise" && perm.canEditarOk && (perm.canEditar !== "proprios" || row.is_agente || (row.influencer_id && podeVerInfluencer(row.influencer_id))) && (
                          <BtnAcao onClick={() => setModalAnalisar(row)} color="#f59e0b">⏳ Analisar</BtnAcao>
                        )}
                        {row.status === "a_pagar" && perm.canEditarOk && (perm.canEditar !== "proprios" || row.is_agente || (row.influencer_id && podeVerInfluencer(row.influencer_id))) && (
                          <BtnAcao onClick={() => setModalPagar(row)} color="#10b981">💰 Pagar</BtnAcao>
                        )}
                        {row.status === "pago" && (
                          <span style={{ fontSize: "11px", color: t.textMuted }}>
                            {row.pago_em ? new Date(row.pago_em).toLocaleDateString("pt-BR") : "—"}
                          </span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>

            {rows.length > 0 && (
              <tfoot>
                <tr style={{ background: t.isDark ? "rgba(74,48,130,0.1)" : "rgba(74,48,130,0.05)", borderTop: `2px solid rgba(74,48,130,0.35)` }}>
                  <td style={{ ...td, fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: t.textMuted }}>
                    {isAberto ? "ESTIMATIVA TOTAL" : "TOTAL"}
                  </td>
                  {filterOperadora === "todas" && <td style={td}></td>}
                  {isAberto ? (
                    <>
                      <td style={td}></td>
                      <td style={{ ...td, fontWeight: 700 }}>{fmtHoras(rows.reduce((a, r) => a + r.horas_realizadas, 0))}</td>
                      <td style={td}></td>
                      <td style={{ ...td, fontSize: "15px", color: "#c9b8f0", fontWeight: 700 }}>{fmtMoeda(rows.reduce((a, r) => a + r.total, 0))}</td>
                    </>
                  ) : (
                    <>
                      <td style={td}></td>
                      <td style={{ ...td, fontWeight: 700 }}>{fmtHoras(rows.filter(r => !r.is_agente).reduce((a, r) => a + r.horas_realizadas, 0))}</td>
                      <td style={{ ...td, fontSize: "15px", color: "#c9b8f0", fontWeight: 700 }}>{fmtMoeda(rows.reduce((a, r) => a + r.total, 0))}</td>
                      <td colSpan={2}></td>
                    </>
                  )}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Modais */}
      {modalAnalisar && ciclo && (
        <ModalAnalisar row={modalAnalisar} ciclo={ciclo} onClose={() => setModalAnalisar(null)} onConfirm={handleAprovar} />
      )}
      {modalPagar && (
        <ModalPagar row={modalPagar} onClose={() => setModalPagar(null)} onConfirm={handlePagar} onRetornar={handleRetornar} />
      )}
      {modalAgente && ciclo && (
        <ModalAgente
          cicloId={ciclo.id}
          filterOperadora={filterOperadora}
          operadorasList={operadorasList}
          podeVerOperadora={filtros.podeVerOperadora}
          onClose={() => setModalAgente(false)}
          onSalvo={async () => { setModalAgente(false); if (ciclo) await carregarDados(ciclo); }}
        />
      )}
    </div>
  );
}

// ── BLOCO 3: CONSOLIDADO ───────────────────────────────────────────────────────

function BlocoConsolidado({ filtros }: { filtros: BlocoFiltros }) {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const { podeVerInfluencer, filterInfluencers, filterOperadora, filtroOp, mesFiltro, historico } = filtros;
  const mes = historico ? "" : mesFiltro;

  interface ConRow {
    influencer_id: string;
    nome_artistico: string;
    email: string;
    totalPago: number;
    totalHoras: number;
    pendente: number;
    ultimoPagamento: string | null;
    statusInfluencer: string;
  }

  interface AgentesRow { totalPago: number; pendente: number; ultimoPagamento: string | null; }

  const [busca, setBusca] = useState("");
  const [rows, setRows] = useState<ConRow[]>([]);
  const [agentesRow, setAgentesRow] = useState<AgentesRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [historicoPagamentos, setHistoricoPagamentos] = useState<Record<string, any[]>>({});
  const [loadingHist, setLoadingHist] = useState<string | null>(null);

  useEffect(() => { carregar(); }, [mes, podeVerInfluencer, filterInfluencers, filterOperadora, filtroOp]);

  async function carregar() {
    setLoading(true);

    const { data: perfis } = await supabase
      .from("influencer_perfil")
      .select("id, nome_artistico, status")
      .order("nome_artistico");

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("role", "influencer");

    if (!perfis) { setLoading(false); return; }

    const emailMap: Record<string, string> = {};
    for (const p of (profiles ?? []) as any[]) emailMap[p.id] = p.email;

    let perfisFiltrados = (perfis as any[]).filter((p) => podeVerInfluencer(p.id));
    if (filterInfluencers.length > 0) perfisFiltrados = perfisFiltrados.filter((p) => filterInfluencers.includes(p.id));

    const periodo = periodoDoMes(mes);
    let cicloIds: string[] = [];
    if (periodo) {
      // Ciclos cujo último dia (data_fim) cai no período. Não usa fechado_em nem data de aprovação/pagamento.
      const { data: ciclos } = await supabase
        .from("ciclos_pagamento").select("id")
        .gte("data_fim", periodo.inicio)
        .lte("data_fim", periodo.fim);
      cicloIds = (ciclos ?? []).map((c: any) => c.id);
    }

    let pagamentosData: any[] = [];
    let agentesData: any[] = [];
    if (!periodo || cicloIds.length > 0) {
      const [{ data: pags }, { data: agts }] = await Promise.all([
        periodo
          ? supabase.from("pagamentos").select("*").in("ciclo_id", cicloIds)
          : supabase.from("pagamentos").select("*"),
        periodo
          ? supabase.from("pagamentos_agentes").select("*").in("ciclo_id", cicloIds)
          : supabase.from("pagamentos_agentes").select("*"),
      ]);
      pagamentosData = pags ?? [];
      agentesData = agts ?? [];
    }
    if (filtroOp?.length) {
      pagamentosData = pagamentosData.filter((p: any) => p.operadora_slug && filtroOp.includes(p.operadora_slug));
      agentesData = agentesData.filter((a: any) => a.operadora_slug && filtroOp.includes(a.operadora_slug));
      const infIdsComPag = [...new Set(pagamentosData.map((p: any) => p.influencer_id))];
      perfisFiltrados = perfisFiltrados.filter((p) => infIdsComPag.includes(p.id));
    } else if (filterOperadora && filterOperadora !== "todas") {
      pagamentosData = pagamentosData.filter((p: any) => p.operadora_slug === filterOperadora);
      agentesData = agentesData.filter((a: any) => a.operadora_slug === filterOperadora);
      const infIdsComPag = [...new Set(pagamentosData.map((p: any) => p.influencer_id))];
      perfisFiltrados = perfisFiltrados.filter((p) => infIdsComPag.includes(p.id));
    }

    // Linha de agentes
    const agtPagos = agentesData.filter(a => a.status === "pago");
    const agtPendentes = agentesData.filter(a => a.status === "em_analise" || a.status === "a_pagar");
    const agtTotalPago = agtPagos.reduce((a, x) => a + x.total, 0);
    const agtPendente = agtPendentes.reduce((a, x) => a + x.total, 0);
    const agtUltimoPag = agtPagos.sort((a, b) => (b.pago_em ?? "").localeCompare(a.pago_em ?? ""))[0]?.pago_em ?? null;

    // Influencers — filtrar os que têm pelo menos algum valor
    const resultado: ConRow[] = perfisFiltrados.map((perf) => {
      const pags = pagamentosData.filter(p => p.influencer_id === perf.id);
      const pagos = pags.filter(p => p.status === "pago");
      const pendentes = pags.filter(p => p.status === "em_analise" || p.status === "a_pagar");
      const totalPago = pagos.reduce((a, p) => a + p.total, 0);
      const totalHoras = pags.reduce((a, p) => a + p.horas_realizadas, 0);
      const pendente = pendentes.reduce((a, p) => a + p.total, 0);
      const ultimoPag = pagos.sort((a, b) => (b.pago_em ?? "").localeCompare(a.pago_em ?? ""))[0]?.pago_em ?? null;
      return {
        influencer_id: perf.id,
        nome_artistico: perf.nome_artistico ?? emailMap[perf.id] ?? perf.id,
        email: emailMap[perf.id] ?? "",
        totalPago, totalHoras, pendente,
        ultimoPagamento: ultimoPag,
        statusInfluencer: perf.status ?? "ativo",
      };
    }).filter(r => r.totalPago > 0 || r.totalHoras > 0 || r.pendente > 0);

    // Linha especial de agentes (só aparece se tiver algum dado; influencer não vê)
    setAgentesRow(
      user?.role !== "influencer" && (agtTotalPago > 0 || agtPendente > 0)
        ? { totalPago: agtTotalPago, pendente: agtPendente, ultimoPagamento: agtUltimoPag }
        : null
    );

    setRows(resultado);
    setLoading(false);
  }

  async function toggleExpand(id: string) {
    if (expandido === id) { setExpandido(null); return; }
    setExpandido(id);
    if (historicoPagamentos[id]) return;
    setLoadingHist(id);
    const { data } = await supabase
      .from("pagamentos")
      .select("*, ciclos_pagamento(data_inicio, data_fim)")
      .eq("influencer_id", id)
      .order("criado_em", { ascending: false })
      .limit(12);
    if (data) setHistoricoPagamentos(prev => ({ ...prev, [id]: data }));
    setLoadingHist(null);
  }

  const filtered = rows.filter(r =>
    !busca || r.nome_artistico.toLowerCase().includes(busca.toLowerCase()) || r.email.toLowerCase().includes(busca.toLowerCase())
  );

  const th: React.CSSProperties = {
    padding: "11px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700,
    letterSpacing: "1.2px", textTransform: "uppercase", color: t.textMuted,
    background: t.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
    borderBottom: `1px solid ${t.cardBorder}`,
  };
  const td: React.CSSProperties = {
    padding: "13px 14px", fontSize: "13px", color: t.text, fontFamily: FONT.body,
  };

  return (
    <div style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: "16px", padding: "22px", marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "18px" }}>
        <BlocoLabel label="👥 CONSOLIDADO DE INFLUENCERS" />
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="🔍 Buscar por nome ou e-mail..."
          style={{
            flex: 1, minWidth: 280, maxWidth: 420,
            padding: "8px 14px", borderRadius: "10px",
            border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.inputText,
            fontSize: "13px", fontFamily: FONT.body, outline: "none",
          }}
        />
        {!loading && <span style={{ fontSize: "12px", color: t.textMuted, whiteSpace: "nowrap" }}>{filtered.length} influencers</span>}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "48px", color: t.textMuted, fontFamily: FONT.body }}>Carregando...</div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: "12px", border: `1px solid ${t.cardBorder}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...th, width: "32px" }}></th>
                {["Influencer", "Total pago", "Total horas", "Pendente", "Último pagamento", "Status"].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !agentesRow ? (
                <tr>
                  <td colSpan={7} style={{ ...td, textAlign: "center", color: t.textMuted, padding: "40px" }}>
                    Nenhum influencer encontrado.
                  </td>
                </tr>
              ) : filtered.map(row => {
                const isOpen = expandido === row.influencer_id;
                const hist = historicoPagamentos[row.influencer_id] ?? [];
                const sl = STATUS_INFLUENCER[row.statusInfluencer] ?? { label: row.statusInfluencer, color: "#94a3b8" };

                return (
                  <>
                    <tr
                      key={row.influencer_id}
                      style={{ cursor: "pointer", borderBottom: `1px solid ${t.cardBorder}` }}
                      onClick={() => toggleExpand(row.influencer_id)}
                    >
                      <td style={td}>
                        <span style={{ fontSize: "10px", color: t.textMuted, display: "inline-block", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▶</span>
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Avatar name={row.nome_artistico} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "13px" }}>{row.nome_artistico}</div>
                            <div style={{ fontSize: "11px", color: t.textMuted }}>{row.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ ...td, fontWeight: 700, color: "#10b981" }}>{fmtMoeda(row.totalPago)}</td>
                      <td style={td}>{fmtHoras(row.totalHoras)}</td>
                      <td style={{ ...td, color: row.pendente > 0 ? "#f59e0b" : t.textMuted, fontWeight: row.pendente > 0 ? 600 : 400 }}>
                        {fmtMoeda(row.pendente)}
                      </td>
                      <td style={{ ...td, color: t.textMuted }}>
                        {row.ultimoPagamento ? new Date(row.ultimoPagamento).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td style={td}>
                        <span style={{ display: "inline-flex", alignItems: "center", fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "20px", background: `${sl.color}22`, color: sl.color, border: `1px solid ${sl.color}44` }}>
                          {sl.label}
                        </span>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr key={`exp-${row.influencer_id}`} style={{ background: t.isDark ? "rgba(74,48,130,0.06)" : "rgba(74,48,130,0.03)" }}>
                        <td colSpan={7} style={{ padding: "16px 20px", borderBottom: `1px solid ${t.cardBorder}` }}>
                          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: t.textMuted, marginBottom: "10px", fontFamily: FONT.body }}>
                            Histórico — {row.nome_artistico}
                          </div>
                          {loadingHist === row.influencer_id ? (
                            <div style={{ color: t.textMuted, fontSize: "12px" }}>Carregando...</div>
                          ) : hist.length === 0 ? (
                            <div style={{ color: t.textMuted, fontSize: "12px" }}>Nenhum ciclo encontrado.</div>
                          ) : (
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <thead>
                                <tr>
                                  {["Ciclo", "Horas", "Total", "Status", "Pago em"].map(h => (
                                    <th key={h} style={{ ...th, background: "transparent", fontSize: "10px", padding: "6px 10px" }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {hist.map((h: any) => (
                                  <tr key={h.id} style={{ borderBottom: `1px solid ${t.divider}` }}>
                                    <td style={{ ...td, fontSize: "12px", padding: "8px 10px" }}>
                                      {h.ciclos_pagamento?.data_inicio} – {h.ciclos_pagamento?.data_fim}
                                    </td>
                                    <td style={{ ...td, fontSize: "12px", padding: "8px 10px" }}>{fmtHoras(h.horas_realizadas)}</td>
                                    <td style={{ ...td, fontSize: "12px", padding: "8px 10px" }}>{fmtMoeda(h.total)}</td>
                                    <td style={{ ...td, fontSize: "12px", padding: "8px 10px" }}>
                                      <Badge status={h.status} config={STATUS_PAG} />
                                    </td>
                                    <td style={{ ...td, fontSize: "12px", padding: "8px 10px", color: t.textMuted }}>
                                      {h.pago_em ? new Date(h.pago_em).toLocaleDateString("pt-BR") : "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}

              {/* Linha de Agentes — sempre no fim */}
              {agentesRow && (
                <tr style={{ borderBottom: `1px solid ${t.cardBorder}`, background: t.isDark ? "rgba(245,158,11,0.04)" : "rgba(245,158,11,0.03)" }}>
                  <td style={td}>
                    <span style={{ fontSize: "10px", color: t.textMuted }}>—</span>
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Avatar name="A" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "13px" }}>Agentes</div>
                        <div style={{ fontSize: "11px", color: t.textMuted }}>Pagamentos de agência</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...td, fontWeight: 700, color: "#10b981" }}>{fmtMoeda(agentesRow.totalPago)}</td>
                  <td style={{ ...td, color: t.textMuted }}>—</td>
                  <td style={{ ...td, color: agentesRow.pendente > 0 ? "#f59e0b" : t.textMuted, fontWeight: agentesRow.pendente > 0 ? 600 : 400 }}>
                    {fmtMoeda(agentesRow.pendente)}
                  </td>
                  <td style={{ ...td, color: t.textMuted }}>
                    {agentesRow.ultimoPagamento ? new Date(agentesRow.ultimoPagamento).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td style={td}>
                    <span style={{ display: "inline-flex", alignItems: "center", fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "20px", background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
                      Agência
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ───────────────────────────────────────────────────────

export default function Financeiro() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const { showFiltroInfluencer, showFiltroOperadora, podeVerInfluencer, podeVerOperadora, escoposVisiveis, operadoraSlugsForcado } = useDashboardFiltros();
  const perm = usePermission("financeiro");

  const [ciclos, setCiclos] = useState<CicloPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterInfluencers, setFilterInfluencers] = useState<string[]>([]);
  const [filterOperadora, setFilterOperadora] = useState<string>("todas");
  const [influencerList, setInfluencerList] = useState<{ id: string; name: string }[]>([]);
  const [operadorasList, setOperadorasList] = useState<{ slug: string; nome: string }[]>([]);
  const [operadoraInfMap, setOperadoraInfMap] = useState<Record<string, string[]>>({});

  const influencerListVisiveis = useMemo(() =>
    influencerList.filter((i) => podeVerInfluencer(i.id)),
    [influencerList, podeVerInfluencer]
  );

  const MESES_OPCOES = useMemo(() => opcoesMesesDoCarrossel(ciclos), [ciclos]);
  const [mesFiltro, setMesFiltro] = useState(() => mesCalendarioDeHoje());
  const [historico, setHistorico] = useState(false);

  useEffect(() => {
    if (historico || MESES_OPCOES.length === 0) return;
    if (!MESES_OPCOES.some((m) => m.value === mesFiltro)) {
      const fallback = MESES_OPCOES.find((m) => m.value === mesCalendarioDeHoje()) ?? MESES_OPCOES[0];
      if (fallback) setMesFiltro(fallback.value);
    }
  }, [MESES_OPCOES, historico, mesFiltro]);

  const filterOperadoraEfetivo = operadoraSlugsForcado?.length ? operadoraSlugsForcado[0] : filterOperadora;
  const filtroOp = operadoraSlugsForcado?.length ? operadoraSlugsForcado : (filterOperadora !== "todas" ? [filterOperadora] : null);
  const filtros: BlocoFiltros = useMemo(() => ({
    podeVerInfluencer,
    podeVerOperadora,
    filterInfluencers,
    filterOperadora: filterOperadoraEfetivo,
    filtroOp,
    operadoraInfMap,
    operadorasList,
    mesFiltro: historico ? "" : mesFiltro,
    historico,
  }), [podeVerInfluencer, podeVerOperadora, filterInfluencers, filterOperadoraEfetivo, filtroOp, operadoraInfMap, operadorasList, mesFiltro, historico]);

  const ciclosFiltradosPorMes = useMemo(() => {
    if (historico || !mesFiltro) return ciclos;
    const periodo = periodoDoMes(mesFiltro);
    if (!periodo) return ciclos;
    return ciclos.filter(c => c.data_fim && c.data_fim >= periodo.inicio && c.data_fim <= periodo.fim);
  }, [ciclos, mesFiltro, historico]);

  const idxMesAtual = MESES_OPCOES.findIndex(m => m.value === mesFiltro);
  function prevMes() {
    if (idxMesAtual < MESES_OPCOES.length - 1) setMesFiltro(MESES_OPCOES[idxMesAtual + 1]?.value ?? "");
  }
  function nextMes() {
    if (idxMesAtual > 0) setMesFiltro(MESES_OPCOES[idxMesAtual - 1]?.value ?? "");
  }
  const btnNavStyle: React.CSSProperties = {
    width: 32, height: 32, borderRadius: "50%",
    border: `1px solid ${t.cardBorder}`, background: "transparent",
    color: t.text, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  const chipBase = (active: boolean) => ({
    padding: "6px 14px", borderRadius: 999,
    border: `1px solid ${active ? brand.accent : t.cardBorder}`,
    background: active ? (brand.useBrand ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)" : `${BASE_COLORS.purple}22`) : (t.inputBg ?? t.cardBg),
    color: active ? brand.accent : t.textMuted,
    fontSize: 13, fontWeight: active ? 700 : 400,
    fontFamily: FONT.body, cursor: "pointer", outline: "none",
  });

  useEffect(() => { carregarCiclos(); }, [escoposVisiveis]);

  useEffect(() => {
    supabase.from("profiles").select("id, name").eq("role", "influencer")
      .then(({ data }) => { if (data) setInfluencerList(data); });
  }, []);

  useEffect(() => {
    supabase.from("operadoras").select("slug, nome").order("nome")
      .then(({ data }) => { if (data) setOperadorasList(data); });
  }, []);

  useEffect(() => {
    supabase.from("influencer_operadoras").select("influencer_id, operadora_slug")
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, string[]> = {};
        data.forEach((row: { influencer_id: string; operadora_slug: string }) => {
          if (!map[row.operadora_slug]) map[row.operadora_slug] = [];
          map[row.operadora_slug].push(row.influencer_id);
        });
        setOperadoraInfMap(map);
      });
  }, []);

  async function carregarCiclos() {
    setLoading(true);
    const { data } = await supabase
      .from("ciclos_pagamento")
      .select("*")
      .order("data_inicio", { ascending: false });
    let ciclosExistentes = (data ?? []) as CicloPagamento[];

    // Ciclos a partir de 19/12 (lives iniciaram): qui 18/12 a qua 24/12 é o primeiro
    const PRIMEIRO_CICLO_INICIO = "2025-12-18";
    const baseQuinta = new Date(2025, 11, 18); // 18 dez 2025 (quinta da semana do dia 19)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diffMs = hoje.getTime() - baseQuinta.getTime();
    const semanasAteAgora = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    const semanasAhead = Math.max(1, semanasAteAgora + 1); // +1 para incluir a semana atual
    const ciclosProativos = gerarCiclosProativos(baseQuinta, semanasAhead);
    const existentesInicio = new Set(ciclosExistentes.map(c => c.data_inicio));
    const paraInserir = ciclosProativos.filter(c => !existentesInicio.has(c.data_inicio));

    if (paraInserir.length > 0) {
      const { data: inseridos } = await supabase.from("ciclos_pagamento").insert(paraInserir).select("*");
      if (inseridos?.length) {
        ciclosExistentes = [...ciclosExistentes, ...(inseridos as CicloPagamento[])].sort(
          (a, b) => (b.data_inicio || "").localeCompare(a.data_inicio || "")
        );
      }
    }

    // Fallback: se ainda vazio, criar a partir de lives realizadas (histórico)
    if (ciclosExistentes.length === 0) {
      ciclosExistentes = await criarCiclosAutomaticamente();
    } else {
      const complementados = await complementarCiclos(ciclosExistentes);
      if (complementados.length > 0) {
        ciclosExistentes = [...ciclosExistentes, ...complementados].sort(
          (a, b) => (b.data_inicio || "").localeCompare(a.data_inicio || "")
        );
      }
    }

    // Remove ciclos antes de 19/12 (lives iniciaram nessa data)
    let ciclosFiltrados = ciclosExistentes.filter(c => (c.data_inicio || "") >= PRIMEIRO_CICLO_INICIO);

    // Filtro por escopo: influencer, agência e operadora só veem ciclos com pagamento no seu escopo
    if (!escoposVisiveis.semRestricaoEscopo) {
      const fechados = ciclosFiltrados.filter(c => !cicloAberto(c));
      const abertos = ciclosFiltrados.filter(c => cicloAberto(c));
      const fechadoIds = fechados.map(c => c.id);

      const [pagsRes, agtsRes] = await Promise.all([
        fechadoIds.length > 0 ? supabase.from("pagamentos").select("ciclo_id, influencer_id, operadora_slug").in("ciclo_id", fechadoIds) : { data: [] as any[] },
        fechadoIds.length > 0 && user?.role !== "influencer"
          ? supabase.from("pagamentos_agentes").select("ciclo_id, operadora_slug").in("ciclo_id", fechadoIds)
          : { data: [] as any[] },
      ]);

      const pags = (pagsRes.data ?? []) as { ciclo_id: string; influencer_id: string; operadora_slug: string }[];
      const agts = (agtsRes.data ?? []) as { ciclo_id: string; operadora_slug: string }[];

      const ciclosComPagVisible = new Set<string>();
      for (const p of pags) {
        if (podeVerInfluencer(p.influencer_id) && p.operadora_slug && podeVerOperadora(p.operadora_slug)) {
          ciclosComPagVisible.add(p.ciclo_id);
        }
      }
      for (const a of agts) {
        if (a.operadora_slug && podeVerOperadora(a.operadora_slug)) {
          ciclosComPagVisible.add(a.ciclo_id);
        }
      }

      const ciclosVisiveis = fechados.filter(c => ciclosComPagVisible.has(c.id));

      if (abertos.length > 0) {
        const dataMin = abertos.reduce((acc, c) => (c.data_inicio || "") < acc ? c.data_inicio! : acc, abertos[0].data_inicio!);
        const dataMax = abertos.reduce((acc, c) => (c.data_fim || "") > acc ? c.data_fim! : acc, abertos[0].data_fim!);

        const { data: lives } = await supabase
          .from("lives")
          .select("id, data, influencer_id, operadora_slug")
          .eq("status", "realizada")
          .gte("data", dataMin)
          .lte("data", dataMax);

        const liveIds = (lives ?? []).map((l: any) => l.id);
        let resIds = new Set<string>();
        if (liveIds.length > 0) {
          const { data: resData } = await supabase.from("live_resultados").select("live_id").in("live_id", liveIds);
          resIds = new Set((resData ?? []).map((r: { live_id: string }) => String(r.live_id)));
        }

        const OPERADORA_PADRAO = "casa_apostas";
        for (const c of abertos) {
          const temVisible = (lives ?? []).some((l: any) => {
            const opSlug = l.operadora_slug?.trim() || OPERADORA_PADRAO;
            return l.data >= (c.data_inicio || "") && l.data <= (c.data_fim || "") &&
              resIds.has(String(l.id)) &&
              podeVerInfluencer(l.influencer_id) &&
              podeVerOperadora(opSlug);
          });
          if (temVisible) ciclosVisiveis.push(c);
        }
      }

      ciclosFiltrados = ciclosVisiveis.sort((a, b) => (b.data_inicio || "").localeCompare(a.data_inicio || ""));
    }

    setCiclos(ciclosFiltrados);
    setLoading(false);
  }

  /** Cria ciclos que faltam para datas de lives realizadas não cobertas pelos existentes */
  async function complementarCiclos(existentes: CicloPagamento[]): Promise<CicloPagamento[]> {
    const PRIMEIRO_CICLO = "2025-12-18";
    const { data: lives } = await supabase.from("lives").select("data").eq("status", "realizada").not("data", "is", null);
    if (!lives?.length) return [];
    const ciclosParaInserir: { data_inicio: string; data_fim: string }[] = [];
    const ciclosInicioSet = new Set(existentes.map(c => c.data_inicio));
    for (const l of lives as { data: string }[]) {
      const ciclo = cicloSemanalParaData(l.data);
      if (!ciclo || ciclo.data_inicio < PRIMEIRO_CICLO || ciclosInicioSet.has(ciclo.data_inicio)) continue;
      const estaCoberto = existentes.some(c => l.data >= (c.data_inicio || "") && l.data <= (c.data_fim || ""));
      if (!estaCoberto) {
        ciclosInicioSet.add(ciclo.data_inicio);
        ciclosParaInserir.push(ciclo);
      }
    }
    if (ciclosParaInserir.length === 0) return [];
    const { data: inseridos, error } = await supabase.from("ciclos_pagamento").insert(ciclosParaInserir).select("*");
    if (error) return [];
    return (inseridos ?? []) as CicloPagamento[];
  }

  async function criarCiclosAutomaticamente(): Promise<CicloPagamento[]> {
    const baseQuinta = new Date(2025, 11, 18); // 18 dez 2025 — lives iniciaram em 19/12
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const semanasAteAgora = Math.floor((hoje.getTime() - baseQuinta.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const semanasAhead = Math.max(1, semanasAteAgora + 1);
    const ciclosProativos = gerarCiclosProativos(baseQuinta, semanasAhead);
    const { data: inseridos, error } = await supabase.from("ciclos_pagamento").insert(ciclosProativos).select("*");
    if (error) {
      console.warn("Não foi possível criar ciclos automaticamente:", error.message);
      return [];
    }
    return (inseridos ?? []).sort((a, b) => (b.data_inicio || "").localeCompare(a.data_inicio || ""));
  }

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar o financeiro.
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "400px" }}>
        <div style={{ textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
          Carregando financeiro...
        </div>
      </div>
    );
  }

  if (ciclos.length === 0) {
    return (
      <div className="app-page-shell">
        <h1 style={{ fontFamily: FONT.title, fontSize: "26px", fontWeight: 900, marginBottom: "6px", color: brand.primary }}>💰 Financeiro</h1>
        <p style={{ fontSize: "13px", color: t.textMuted, marginBottom: "28px", fontFamily: FONT.body }}>Gestão de pagamentos e ciclos de influencers.</p>
        <div style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: "16px", padding: "48px", textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>📅</div>
          <p style={{ fontFamily: FONT.title, fontSize: "18px", fontWeight: 900, color: t.text, marginBottom: "8px" }}>
            {user?.role === "influencer" ? "Nenhum pagamento cadastrado" : "Nenhum ciclo cadastrado"}
          </p>
          <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "16px" }}>
            {user?.role === "influencer" ? (
              <>Os ciclos são criados automaticamente (qui–qua). Verifique se você realizou lives no período; caso tenha problemas, entre em contato.</>
            ) : (
              <>Os ciclos são criados automaticamente (qui–qua). Verifique as permissões da tabela <code style={{ background: "rgba(0,0,0,0.1)", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>ciclos_pagamento</code> no Supabase (INSERT permitido para autenticados).</>
            )}
          </p>
          <button
            onClick={() => { carregarCiclos(); }}
            style={{
              padding: "10px 20px", borderRadius: "10px", border: "none",
              background: brand.useBrand ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" : `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
              color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: FONT.body,
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page-shell">
      <h1 style={{ fontFamily: FONT.title, fontSize: "26px", fontWeight: 900, marginBottom: "6px", color: brand.primary }}>💰 Financeiro</h1>
      <p style={{ fontSize: "13px", color: t.textMuted, marginBottom: "14px", fontFamily: FONT.body }}>Gestão de pagamentos e ciclos semanais de influencers.</p>

      {/* Bloco de filtros (similar Agenda) */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          borderRadius: 14,
          border: brand.primaryTransparentBorder,
          background: brand.primaryTransparentBg,
          padding: "12px 20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, flexWrap: "wrap" }}>
            <button onClick={prevMes} style={btnNavStyle} disabled={idxMesAtual >= MESES_OPCOES.length - 1} title="Mês anterior">
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT.body, minWidth: 180, textAlign: "center" }}>
              {historico ? "Total" : (MESES_OPCOES.find(m => m.value === mesFiltro)?.label ?? mesFiltro)}
            </span>
            <button onClick={nextMes} style={btnNavStyle} disabled={idxMesAtual <= 0} title="Próximo mês">
              <ChevronRight size={14} />
            </button>

            <button onClick={() => setHistorico(h => !h)} style={chipBase(historico)}>
              Histórico
            </button>

            {showFiltroInfluencer && influencerListVisiveis.length > 0 && (
              <InfluencerMultiSelect
                selected={filterInfluencers}
                onChange={setFilterInfluencers}
                influencers={influencerListVisiveis}
                t={t}
              />
            )}

            {showFiltroOperadora && operadorasList.length > 0 && (
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: 10, display: "flex", alignItems: "center", pointerEvents: "none", color: t.textMuted }}>
                  <GiShield size={13} />
                </span>
                <select
                  value={filterOperadora}
                  onChange={(e) => setFilterOperadora(e.target.value)}
                  style={{
                    padding: "6px 14px 6px 30px", borderRadius: 999,
                    border: `1px solid ${filterOperadora !== "todas" ? brand.accent : t.cardBorder}`,
                    background: filterOperadora !== "todas" ? (brand.useBrand ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)" : `${BASE_COLORS.purple}22`) : (t.inputBg ?? t.cardBg),
                    color: filterOperadora !== "todas" ? brand.accent : t.textMuted,
                    fontSize: 13, fontWeight: filterOperadora !== "todas" ? 700 : 400,
                    fontFamily: FONT.body, cursor: "pointer", outline: "none", appearance: "none",
                  }}
                >
                  <option value="todas">Todas as operadoras</option>
                  {operadorasList
                    .filter((o) => podeVerOperadora(o.slug))
                    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                    .map((o) => (
                      <option key={o.slug} value={o.slug}>{o.nome}</option>
                    ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      <BlocoKpis filtros={filtros} />
      <BlocoCiclos ciclos={ciclosFiltradosPorMes} onRecarregar={carregarCiclos} filtros={filtros} />
      <BlocoConsolidado filtros={filtros} />
    </div>
  );
}
