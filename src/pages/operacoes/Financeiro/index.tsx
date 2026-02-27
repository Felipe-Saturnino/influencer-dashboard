import { useState, useEffect, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { CicloPagamento, Pagamento, PagamentoStatus } from "../../../types";

// ── Constantes ────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<PagamentoStatus, { label: string; color: string }> = {
  em_analise:        { label: "Em análise",       color: "#f39c12" },
  a_pagar:           { label: "A pagar",           color: "#6b7fff" },
  pago:              { label: "Pago",              color: "#27ae60" },
  perfil_incompleto: { label: "Perfil incompleto", color: "#e94025" },
};

// Gera opções de meses do mês atual para trás (12 meses)
function gerarOpcoesMeses(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  const MESES = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
  ];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: `${MESES[d.getMonth()]} ${d.getFullYear()}`,
    });
  }
  return opts;
}

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtHoras(horas: number) {
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function calcularTotalHoras(pagamentos: Pagamento[]) {
  return pagamentos.reduce((acc, p) => acc + p.horas_realizadas, 0);
}

// Retorna quarta-feira mais próxima futura (ou hoje se for quarta)
function proximaQuarta(): string {
  const d = new Date();
  const day = d.getDay(); // 0=dom, 3=qua
  const diff = (3 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" });
}

// ── Estilos compartilhados ────────────────────────────────────────────────────
function useStyles(t: any) {
  const card: React.CSSProperties = {
    background: t.cardBg, border: `1px solid ${t.cardBorder}`,
    borderRadius: "16px", padding: "22px", marginBottom: "24px",
  };
  const sectionLabel: React.CSSProperties = {
    fontSize: "11px", fontWeight: 700, letterSpacing: "1.5px",
    textTransform: "uppercase", color: BASE_COLORS.purple, fontFamily: FONT.body,
  };
  const tableWrap: React.CSSProperties = {
    overflowX: "auto", borderRadius: "12px", border: `1px solid ${t.cardBorder}`,
  };
  const th: React.CSSProperties = {
    padding: "11px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700,
    letterSpacing: "1.2px", textTransform: "uppercase", color: t.textMuted,
    background: t.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
    borderBottom: `1px solid ${t.cardBorder}`,
  };
  const td: React.CSSProperties = {
    padding: "13px 14px", fontSize: "13px", color: t.text, fontFamily: FONT.body,
  };
  const inputStyle: React.CSSProperties = {
    padding: "7px 12px", borderRadius: "10px", border: `1px solid ${t.cardBorder}`,
    background: t.inputBg, color: t.inputText, fontSize: "12px",
    fontFamily: FONT.body, outline: "none", cursor: "pointer",
  };
  const actionBtn = (color: string, bg: string): React.CSSProperties => ({
    padding: "4px 11px", borderRadius: "8px", border: `1px solid ${color}`,
    background: bg, color, fontSize: "11px", fontWeight: 700,
    fontFamily: FONT.body, cursor: "pointer",
  });
  return { card, sectionLabel, tableWrap, th, td, inputStyle, actionBtn };
}

// ── Badge de Status ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: PagamentoStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "20px",
      background: `${cfg.color}22`, color: cfg.color,
      border: `1px solid ${cfg.color}44`, whiteSpace: "nowrap",
    }}>
      {status === "em_analise"        && "⏳ "}
      {status === "a_pagar"           && "💳 "}
      {status === "pago"              && "✅ "}
      {status === "perfil_incompleto" && "⚠️ "}
      {cfg.label}
    </span>
  );
}

// ── KPIs ──────────────────────────────────────────────────────────────────────
function KpiCards({
  totalPagoHistorico, qtdInfluencers, qtdCiclos,
  valorPendente, qtdPendentes,
  totalHorasHistorico, horasCicloAtual,
  t,
}: {
  totalPagoHistorico: number; qtdInfluencers: number; qtdCiclos: number;
  valorPendente: number; qtdPendentes: number;
  totalHorasHistorico: number; horasCicloAtual: number;
  t: any;
}) {
  const kpiCard = (accent: string): React.CSSProperties => ({
    background: t.cardBg, border: `1px solid ${t.cardBorder}`,
    borderRadius: "16px", padding: "20px 22px",
    borderTop: `3px solid ${accent}`, flex: 1,
  });
  const val: React.CSSProperties = {
    fontFamily: FONT.title, fontSize: "30px", fontWeight: 900, lineHeight: 1, marginBottom: "6px",
  };
  const lbl: React.CSSProperties = {
    fontSize: "12px", color: t.textMuted, fontWeight: 500, fontFamily: FONT.body,
  };
  const sub: React.CSSProperties = {
    fontSize: "11px", color: t.textMuted, marginTop: "8px",
    paddingTop: "8px", borderTop: `1px solid ${t.divider}`, fontFamily: FONT.body,
  };

  return (
    <div style={{ display: "flex", gap: "14px", marginBottom: "28px", flexWrap: "wrap" }}>
      <div style={kpiCard(`linear-gradient(90deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`)}>
        <div style={{ ...val, color: "#c9b8f0" }}>{fmtMoeda(totalPagoHistorico)}</div>
        <div style={lbl}>Total pago (histórico)</div>
        <div style={sub}>{qtdInfluencers} influencers · {qtdCiclos} ciclos fechados</div>
      </div>
      <div style={kpiCard("#f39c12")}>
        <div style={{ ...val, color: "#f39c12" }}>{fmtMoeda(valorPendente)}</div>
        <div style={lbl}>Valor pendente</div>
        <div style={sub}>Ciclo atual em aberto · {qtdPendentes} pagamentos</div>
      </div>
      <div style={kpiCard("#27ae60")}>
        <div style={{ ...val, color: "#27ae60" }}>{fmtHoras(totalHorasHistorico)}</div>
        <div style={lbl}>Total de horas realizadas</div>
        <div style={sub}>Ciclo atual: {fmtHoras(horasCicloAtual)}</div>
      </div>
    </div>
  );
}

// ── Modal Fechar Semana ───────────────────────────────────────────────────────
function ModalFecharSemana({
  ciclo, pagamentos, onClose, onConfirm, t,
}: {
  ciclo: CicloPagamento; pagamentos: Pagamento[];
  onClose: () => void; onConfirm: () => Promise<void>; t: any;
}) {
  const [saving, setSaving] = useState(false);
  const incompletos = pagamentos.filter(p => p.status === "perfil_incompleto");
  const totalValor  = pagamentos.filter(p => p.status !== "perfil_incompleto")
                                .reduce((acc, p) => acc + p.total, 0);

  async function handleConfirm() {
    setSaving(true);
    await onConfirm();
    setSaving(false);
  }

  const row: React.CSSProperties = {
    display: "flex", justifyContent: "space-between",
    padding: "10px 0", borderBottom: `1px solid ${t.divider}`,
    fontSize: "13px",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "420px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 900, color: t.text, fontFamily: FONT.title }}>🔒 Fechar Semana</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: t.textMuted }}>✕</button>
        </div>
        <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "20px" }}>
          {ciclo.data_inicio} – {ciclo.data_fim}
        </p>

        <div style={row}>
          <span style={{ color: t.textMuted }}>Influencers com live</span>
          <span style={{ fontWeight: 700 }}>{pagamentos.length}</span>
        </div>
        <div style={{ ...row, borderBottom: `1px solid ${t.divider}` }}>
          <span style={{ color: t.textMuted }}>Perfis incompletos</span>
          <span style={{ fontWeight: 700, color: incompletos.length > 0 ? "#e94025" : t.text }}>
            {incompletos.length > 0 ? `⚠️ ${incompletos.length} — ${incompletos.map(p => p.influencer_name).join(", ")}` : "0"}
          </span>
        </div>
        <div style={{ ...row, borderBottom: "none" }}>
          <span style={{ color: t.textMuted }}>Total a processar</span>
          <span style={{ fontWeight: 700, color: "#c9b8f0", fontSize: "16px" }}>{fmtMoeda(totalValor)}</span>
        </div>

        <p style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body, marginTop: "14px", lineHeight: 1.5 }}>
          Esta ação calculará os pagamentos automaticamente e não poderá ser desfeita.
        </p>

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: "10px", cursor: "pointer", border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.textMuted, fontSize: "13px", fontWeight: 700, fontFamily: FONT.body }}>
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={saving} style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: FONT.body }}>
            {saving ? "⏳ Fechando..." : "🔒 Confirmar Fechamento"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Aprovar / Pagar ─────────────────────────────────────────────────────
function ModalAcaoPagamento({
  tipo, pagamento, onClose, onConfirm, t,
}: {
  tipo: "aprovar" | "pagar";
  pagamento: Pagamento;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  t: any;
}) {
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    setSaving(true);
    await onConfirm();
    setSaving(false);
  }

  const isAprovar = tipo === "aprovar";
  const accentColor = isAprovar ? "#6b7fff" : "#27ae60";
  const row: React.CSSProperties = {
    display: "flex", justifyContent: "space-between",
    padding: "10px 0", borderBottom: `1px solid ${t.divider}`,
    fontSize: "13px",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "400px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 900, color: t.text, fontFamily: FONT.title }}>
            {isAprovar ? "✅ Aprovar Pagamento" : "💰 Registrar Pagamento"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: t.textMuted }}>✕</button>
        </div>
        <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "20px" }}>
          {isAprovar ? "Confirmar valores para " : "Confirmar pagamento para "}
          <strong style={{ color: t.text }}>{pagamento.influencer_name}</strong>
        </p>

        <div style={row}>
          <span style={{ color: t.textMuted }}>Horas realizadas</span>
          <span style={{ fontWeight: 700 }}>{fmtHoras(pagamento.horas_realizadas)}</span>
        </div>
        <div style={row}>
          <span style={{ color: t.textMuted }}>Cachê/hora</span>
          <span style={{ fontWeight: 700 }}>{fmtMoeda(pagamento.cache_hora)}</span>
        </div>
        <div style={{ ...row, borderBottom: "none" }}>
          <span style={{ color: t.textMuted }}>Total</span>
          <span style={{ fontWeight: 700, color: accentColor, fontSize: "16px" }}>{fmtMoeda(pagamento.total)}</span>
        </div>

        {!isAprovar && (
          <p style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body, marginTop: "14px", lineHeight: 1.5 }}>
            A data de pagamento será registrada como hoje.
          </p>
        )}

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: "10px", cursor: "pointer", border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.textMuted, fontSize: "13px", fontWeight: 700, fontFamily: FONT.body }}>
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={saving} style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, background: isAprovar ? `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})` : "linear-gradient(135deg, #1a6e3c, #27ae60)", color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: FONT.body }}>
            {saving ? "⏳ Salvando..." : isAprovar ? "✅ Aprovar valor" : "💰 Confirmar pagamento"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bloco Ciclo de Pagamento ──────────────────────────────────────────────────
function BlockCiclo({
  ciclos, cicloSelecionado, setCicloSelecionado,
  pagamentos, onFecharSemana, onAprovar, onPagar, t,
}: {
  ciclos: CicloPagamento[];
  cicloSelecionado: CicloPagamento | null;
  setCicloSelecionado: (c: CicloPagamento) => void;
  pagamentos: Pagamento[];
  onFecharSemana: () => void;
  onAprovar: (p: Pagamento) => void;
  onPagar: (p: Pagamento) => void;
  t: any;
}) {
  const { card, sectionLabel, tableWrap, th, td, inputStyle, actionBtn } = useStyles(t);
  const isAberto = !cicloSelecionado?.fechado_em;

  const resumo = {
    em_analise: pagamentos.filter(p => p.status === "em_analise").length,
    a_pagar:    pagamentos.filter(p => p.status === "a_pagar").length,
    pago:       pagamentos.filter(p => p.status === "pago").length,
    total:      pagamentos.filter(p => p.status !== "perfil_incompleto").reduce((a, p) => a + p.total, 0),
  };

  const resumoCard = (value: string | number, label: string, color: string): React.CSSProperties => ({});

  return (
    <div style={card}>
      {/* Topo */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={sectionLabel}>📅 CICLO DE PAGAMENTO</span>
          <span style={{
            fontSize: "12px", fontWeight: 700, padding: "4px 13px", borderRadius: "20px",
            background: isAberto ? "rgba(243,156,18,0.15)" : "rgba(39,174,96,0.12)",
            color:      isAberto ? "#f39c12" : "#27ae60",
            border:     `1px solid ${isAberto ? "rgba(243,156,18,0.3)" : "rgba(39,174,96,0.3)"}`,
          }}>
            {isAberto ? "🔓 Aberto" : "✅ Fechado"}
          </span>
          <select
            value={cicloSelecionado?.id ?? ""}
            onChange={e => {
              const found = ciclos.find(c => c.id === e.target.value);
              if (found) setCicloSelecionado(found);
            }}
            style={inputStyle}
          >
            {ciclos.map(c => (
              <option key={c.id} value={c.id}>
                {c.data_inicio} – {c.data_fim}{!c.fechado_em ? " (atual)" : ""}
              </option>
            ))}
          </select>
        </div>
        {isAberto && (
          <button onClick={onFecharSemana} style={{
            padding: "9px 18px", borderRadius: "10px", border: "none", cursor: "pointer",
            background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
            color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: FONT.body,
          }}>
            🔒 Fechar Semana
          </button>
        )}
      </div>

      {/* Alerta ciclo aberto — dentro do card, abaixo do filtro */}
      {isAberto && (
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "11px 16px", borderRadius: "10px", marginTop: "16px",
          background: "rgba(243,156,18,0.1)", border: "1px solid rgba(243,156,18,0.3)",
          color: "#f39c12", fontSize: "13px", fontFamily: FONT.body,
        }}>
          ⚠️ Ciclo atual ainda aberto — fechamento previsto para{" "}
          <strong>{proximaQuarta()} · 18h00</strong>.
        </div>
      )}

      {/* Resumo mini */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", margin: "18px 0" }}>
        {[
          { value: resumo.em_analise, label: "Em análise",  color: "#f39c12" },
          { value: resumo.a_pagar,    label: "A pagar",     color: "#6b7fff" },
          { value: resumo.pago,       label: "Pago",        color: "#27ae60" },
          { value: fmtMoeda(resumo.total), label: "Total do ciclo", color: t.text },
        ].map((item, i) => (
          <div key={i} style={{
            background: t.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
            border: `1px solid ${t.cardBorder}`, borderRadius: "10px",
            padding: "12px 14px", textAlign: "center",
          }}>
            <div style={{ fontFamily: FONT.title, fontSize: "22px", fontWeight: 900, color: item.color, marginBottom: "3px" }}>
              {item.value}
            </div>
            <div style={{ fontSize: "10px", color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: FONT.body }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div style={tableWrap}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Influencer","Horas realizadas","Total","Status","Ação"].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagamentos.length === 0 ? (
              <tr><td colSpan={5} style={{ ...td, textAlign: "center", color: t.textMuted, padding: "40px" }}>
                Nenhum pagamento neste ciclo.
              </td></tr>
            ) : pagamentos.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: i < pagamentos.length - 1 ? `1px solid ${t.cardBorder}` : "none" }}>
                <td style={td}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{
                      width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                      background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontWeight: 800, fontSize: "11px",
                    }}>
                      {(p.influencer_name ?? "?")[0].toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600 }}>{p.influencer_name ?? p.influencer_id}</span>
                  </div>
                </td>
                <td style={td}>{fmtHoras(p.horas_realizadas)}</td>
                <td style={{ ...td, fontWeight: 700, color: p.status === "perfil_incompleto" ? "#e94025" : t.text }}>
                  {p.status === "perfil_incompleto" ? "—" : fmtMoeda(p.total)}
                </td>
                <td style={td}><StatusBadge status={p.status} /></td>
                <td style={td}>
                  {p.status === "em_analise" && (
                    <button style={actionBtn("rgba(30,54,248,0.18)", "#6b7fff")} onClick={() => onAprovar(p)}>
                      ✅ Aprovar
                    </button>
                  )}
                  {p.status === "a_pagar" && (
                    <button style={actionBtn("rgba(39,174,96,0.15)", "#27ae60")} onClick={() => onPagar(p)}>
                      💰 Pagar
                    </button>
                  )}
                  {(p.status === "pago" || p.status === "perfil_incompleto") && (
                    <span style={{ fontSize: "11px", color: t.textMuted }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {pagamentos.length > 0 && (
            <tfoot>
              <tr style={{ background: t.isDark ? "rgba(74,48,130,0.1)" : "rgba(74,48,130,0.05)", borderTop: `2px solid rgba(74,48,130,0.4)` }}>
                <td style={{ ...td, fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", color: t.textMuted }}>TOTAL DO CICLO</td>
                <td style={{ ...td, fontWeight: 700 }}>{fmtHoras(calcularTotalHoras(pagamentos))}</td>
                <td style={{ ...td, fontSize: "15px", color: "#c9b8f0", fontWeight: 700 }}>{fmtMoeda(resumo.total)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ── Bloco Consolidado ─────────────────────────────────────────────────────────
interface ConsolidadoRow {
  influencer_id:   string;
  influencer_name: string;
  email:           string;
  totalPago:       number;
  totalHoras:      number;
  pendente:        number;
  ultimoPagamento: string | null;
  statusGeral:     "ativo" | "inativo" | "perfil_incompleto";
}

function BlockConsolidado({ t }: { t: any }) {
  const { card, sectionLabel, tableWrap, th, td, inputStyle } = useStyles(t);

  const OPCOES_MESES = useMemo(() => gerarOpcoesMeses(), []);

  const [mesFiltro,    setMesFiltro]    = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [busca,        setBusca]        = useState("");
  const [rows,         setRows]         = useState<ConsolidadoRow[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [expandido,    setExpandido]    = useState<string | null>(null);
  const [historico,    setHistorico]    = useState<Record<string, Pagamento[]>>({});
  const [loadingHist,  setLoadingHist]  = useState<string | null>(null);

  useEffect(() => { carregarConsolidado(); }, [mesFiltro]);

  async function carregarConsolidado() {
    setLoading(true);

    // Busca todos os influencers
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email")
      .eq("role", "influencer")
      .order("name");

    if (!profiles) { setLoading(false); return; }

    // Monta filtro de data
    let dataInicio = "2000-01-01";
    let dataFim    = new Date().toISOString().split("T")[0];
    if (mesFiltro) {
      const [ano, mes] = mesFiltro.split("-").map(Number);
      dataInicio = `${mesFiltro}-01`;
      const ultimo = new Date(ano, mes, 0).getDate();
      dataFim = `${mesFiltro}-${String(ultimo).padStart(2, "0")}`;
    }

    // Busca ciclos no período
    const { data: ciclosPeriodo } = await supabase
      .from("ciclos_pagamento")
      .select("id")
      .gte("data_inicio", dataInicio)
      .lte("data_fim",    dataFim);

    const cicloIds = (ciclosPeriodo ?? []).map((c: any) => c.id);

    // Busca pagamentos desses ciclos
    let pagamentosData: any[] = [];
    if (cicloIds.length > 0) {
      const { data } = await supabase
        .from("pagamentos")
        .select("*")
        .in("ciclo_id", cicloIds);
      pagamentosData = data ?? [];
    }

    // Agrupa por influencer
    const resultado: ConsolidadoRow[] = profiles.map((prof: any) => {
      const pags = pagamentosData.filter((p: any) => p.influencer_id === prof.id);
      const pagos = pags.filter((p: any) => p.status === "pago");
      const pendentes = pags.filter((p: any) => p.status === "a_pagar" || p.status === "em_analise");
      const incompleto = pags.some((p: any) => p.status === "perfil_incompleto");
      const totalPago  = pagos.reduce((a: number, p: any) => a + p.total, 0);
      const totalHoras = pags.filter((p: any) => p.status !== "perfil_incompleto")
                             .reduce((a: number, p: any) => a + p.horas_realizadas, 0);
      const pendente   = pendentes.reduce((a: number, p: any) => a + p.total, 0);
      const ultimoPag  = pagos.sort((a: any, b: any) =>
        (b.pago_em ?? "").localeCompare(a.pago_em ?? "")
      )[0]?.pago_em ?? null;

      const statusGeral: ConsolidadoRow["statusGeral"] =
        incompleto ? "perfil_incompleto" :
        pags.length > 0 ? "ativo" : "inativo";

      return {
        influencer_id:   prof.id,
        influencer_name: prof.name ?? prof.email,
        email:           prof.email,
        totalPago, totalHoras, pendente,
        ultimoPagamento: ultimoPag,
        statusGeral,
      };
    });

    setRows(resultado);
    setLoading(false);
  }

  async function toggleExpand(influencer_id: string) {
    if (expandido === influencer_id) { setExpandido(null); return; }
    setExpandido(influencer_id);
    if (historico[influencer_id]) return;

    setLoadingHist(influencer_id);
    const { data } = await supabase
      .from("pagamentos")
      .select(`*, ciclos_pagamento(data_inicio, data_fim)`)
      .eq("influencer_id", influencer_id)
      .order("criado_em", { ascending: false })
      .limit(12);
    if (data) setHistorico(prev => ({ ...prev, [influencer_id]: data }));
    setLoadingHist(null);
  }

  const filtered = rows.filter(r => {
    const nomeOk   = !busca        || r.influencer_name.toLowerCase().includes(busca.toLowerCase()) || r.email.toLowerCase().includes(busca.toLowerCase());
    const statusOk = !statusFiltro || r.statusGeral === statusFiltro;
    return nomeOk && statusOk;
  });

  const statusLabel: Record<string, { label: string; color: string }> = {
    ativo:             { label: "● Ativo",            color: "#27ae60" },
    inativo:           { label: "○ Inativo",          color: "#aaaacc" },
    perfil_incompleto: { label: "⚠️ Perfil incompleto", color: "#e94025" },
  };

  return (
    <div style={card}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={sectionLabel}>👥 CONSOLIDADO POR INFLUENCER</span>
          {!loading && (
            <span style={{ fontSize: "12px", color: t.textMuted }}>{filtered.length} influencers</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="🔍 Buscar influencer..."
            style={{ ...inputStyle, width: "200px" }}
          />
          <select value={mesFiltro} onChange={e => setMesFiltro(e.target.value)} style={inputStyle}>
            <option value="">Todos os meses</option>
            {OPCOES_MESES.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} style={inputStyle}>
            <option value="">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="perfil_incompleto">Perfil incompleto</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "48px", color: t.textMuted, fontFamily: FONT.body }}>
          Carregando...
        </div>
      ) : (
        <div style={tableWrap}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...th, width: "32px" }}></th>
                {["Influencer","Total pago","Total horas realizadas","Pendente","Último pagamento","Status"].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: t.textMuted, padding: "40px" }}>
                  Nenhum influencer encontrado.
                </td></tr>
              ) : filtered.map(row => {
                const isOpen = expandido === row.influencer_id;
                const hist   = historico[row.influencer_id] ?? [];
                const sl     = statusLabel[row.statusGeral];
                return (
                  <>
                    <tr
                      key={row.influencer_id}
                      style={{ cursor: "pointer", borderBottom: `1px solid ${t.cardBorder}` }}
                      onClick={() => toggleExpand(row.influencer_id)}
                    >
                      <td style={td}>
                        <span style={{ fontSize: "10px", color: t.textMuted, display: "inline-block", transition: "transform 0.2s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "11px" }}>
                            {row.influencer_name[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "13px" }}>{row.influencer_name}</div>
                            <div style={{ fontSize: "11px", color: t.textMuted }}>{row.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ ...td, fontWeight: 700, color: "#27ae60" }}>{fmtMoeda(row.totalPago)}</td>
                      <td style={td}>{fmtHoras(row.totalHoras)}</td>
                      <td style={{ ...td, color: row.pendente > 0 ? "#f39c12" : t.textMuted, fontWeight: row.pendente > 0 ? 600 : 400 }}>
                        {row.statusGeral === "perfil_incompleto" ? <span style={{ color: "#e94025" }}>⚠️ Incompleto</span> : fmtMoeda(row.pendente)}
                      </td>
                      <td style={{ ...td, color: t.textMuted }}>
                        {row.ultimoPagamento ? new Date(row.ultimoPagamento).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td style={td}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "20px", background: `${sl.color}22`, color: sl.color, border: `1px solid ${sl.color}44` }}>
                          {sl.label}
                        </span>
                      </td>
                    </tr>

                    {/* Expand histórico */}
                    {isOpen && (
                      <tr key={`exp-${row.influencer_id}`} style={{ background: t.isDark ? "rgba(74,48,130,0.06)" : "rgba(74,48,130,0.03)" }}>
                        <td colSpan={7} style={{ padding: "16px 20px", borderBottom: `1px solid ${t.cardBorder}` }}>
                          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: t.textMuted, marginBottom: "10px" }}>
                            Histórico de ciclos — {row.influencer_name}
                          </div>
                          {loadingHist === row.influencer_id ? (
                            <div style={{ color: t.textMuted, fontSize: "12px" }}>Carregando...</div>
                          ) : hist.length === 0 ? (
                            <div style={{ color: t.textMuted, fontSize: "12px" }}>Nenhum ciclo encontrado.</div>
                          ) : (
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <thead>
                                <tr>
                                  {["Ciclo","Horas","Total","Status","Pago em"].map(h => (
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
                                    <td style={{ ...td, fontSize: "12px", padding: "8px 10px" }}>{h.status === "perfil_incompleto" ? "—" : fmtMoeda(h.total)}</td>
                                    <td style={{ ...td, fontSize: "12px", padding: "8px 10px" }}><StatusBadge status={h.status} /></td>
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
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function Financeiro() {
  const { theme: t } = useApp();

  const [ciclos,           setCiclos]           = useState<CicloPagamento[]>([]);
  const [cicloSelecionado, setCicloSelecionado] = useState<CicloPagamento | null>(null);
  const [pagamentos,       setPagamentos]       = useState<Pagamento[]>([]);
  const [loading,          setLoading]          = useState(true);

  // KPI state
  const [kpi, setKpi] = useState({
    totalPagoHistorico:  0,
    qtdInfluencers:      0,
    qtdCiclos:           0,
    valorPendente:       0,
    qtdPendentes:        0,
    totalHorasHistorico: 0,
    horasCicloAtual:     0,
  });

  // Modais
  const [modalFechar,  setModalFechar]  = useState(false);
  const [modalAcao,    setModalAcao]    = useState<{ tipo: "aprovar" | "pagar"; pagamento: Pagamento } | null>(null);

  useEffect(() => { carregarTudo(); }, []);

  async function carregarTudo() {
    setLoading(true);
    await Promise.all([carregarCiclos(), carregarKpis()]);
    setLoading(false);
  }

  async function carregarCiclos() {
    const { data } = await supabase
      .from("ciclos_pagamento")
      .select("*")
      .order("data_inicio", { ascending: false });

    if (data && data.length > 0) {
      setCiclos(data);
      setCicloSelecionado(data[0]);
      await carregarPagamentos(data[0].id);
    }
  }

  async function carregarPagamentos(cicloId: string) {
    const { data } = await supabase
      .from("pagamentos")
      .select(`*, profiles!pagamentos_influencer_id_fkey(name)`)
      .eq("ciclo_id", cicloId)
      .order("criado_em", { ascending: true });

    if (data) {
      setPagamentos(data.map((p: any) => ({ ...p, influencer_name: p.profiles?.name })));
    }
  }

  async function carregarKpis() {
    const { data: pagsTodos } = await supabase
      .from("pagamentos")
      .select("total, horas_realizadas, status, influencer_id, ciclo_id");

    if (!pagsTodos) return;

    const pagos = pagsTodos.filter((p: any) => p.status === "pago");
    const pendentes = pagsTodos.filter((p: any) => p.status === "em_analise" || p.status === "a_pagar");

    const { data: ciclosFechados } = await supabase
      .from("ciclos_pagamento")
      .select("id")
      .not("fechado_em", "is", null);

    setKpi({
      totalPagoHistorico:  pagos.reduce((a: number, p: any) => a + p.total, 0),
      qtdInfluencers:      new Set(pagos.map((p: any) => p.influencer_id)).size,
      qtdCiclos:           ciclosFechados?.length ?? 0,
      valorPendente:       pendentes.reduce((a: number, p: any) => a + p.total, 0),
      qtdPendentes:        pendentes.length,
      totalHorasHistorico: pagsTodos.reduce((a: number, p: any) => a + p.horas_realizadas, 0),
      horasCicloAtual:     0, // será calculado após cicloSelecionado carregar
    });
  }

  async function handleFecharSemana() {
    if (!cicloSelecionado) return;

    // Calcula horas de live_resultados para cada influencer neste ciclo
    const { data: livesRealizadas } = await supabase
      .from("lives")
      .select(`id, influencer_id, live_resultados(duracao_horas, duracao_min)`)
      .eq("status", "realizada")
      .gte("data", cicloSelecionado.data_inicio)
      .lte("data", cicloSelecionado.data_fim);

    if (livesRealizadas) {
      // Agrupa horas por influencer
      const horasPorInfluencer: Record<string, number> = {};
      for (const live of livesRealizadas as any[]) {
        const id = live.influencer_id;
        const res = live.live_resultados?.[0];
        if (res) {
          horasPorInfluencer[id] = (horasPorInfluencer[id] ?? 0) + res.duracao_horas + res.duracao_min / 60;
        }
      }

      // Para cada influencer, busca cache_hora e cria/atualiza pagamento
      for (const [influencer_id, horas] of Object.entries(horasPorInfluencer)) {
        const { data: perfil } = await supabase
          .from("influencer_perfil")
          .select("cache_hora")
          .eq("id", influencer_id)
          .single();

        const cache_hora = perfil?.cache_hora ?? 0;
        const status: PagamentoStatus = cache_hora > 0 ? "em_analise" : "perfil_incompleto";
        const total = horas * cache_hora;

        await supabase.from("pagamentos").upsert({
          ciclo_id: cicloSelecionado.id,
          influencer_id,
          horas_realizadas: Math.round(horas * 100) / 100,
          cache_hora,
          total: Math.round(total * 100) / 100,
          status,
        }, { onConflict: "ciclo_id,influencer_id" });
      }
    }

    // Fecha o ciclo
    await supabase
      .from("ciclos_pagamento")
      .update({ fechado_em: new Date().toISOString() })
      .eq("id", cicloSelecionado.id);

    setModalFechar(false);
    await carregarTudo();
  }

  async function handleAprovar(pagamento: Pagamento) {
    await supabase
      .from("pagamentos")
      .update({ status: "a_pagar" })
      .eq("id", pagamento.id);

    setModalAcao(null);
    await carregarPagamentos(cicloSelecionado!.id);
    await carregarKpis();
  }

  async function handlePagar(pagamento: Pagamento) {
    await supabase
      .from("pagamentos")
      .update({ status: "pago", pago_em: new Date().toISOString() })
      .eq("id", pagamento.id);

    setModalAcao(null);
    await carregarPagamentos(cicloSelecionado!.id);
    await carregarKpis();
  }

  async function handleTrocarCiclo(ciclo: CicloPagamento) {
    setCicloSelecionado(ciclo);
    await carregarPagamentos(ciclo.id);
  }

  // KPI de horas do ciclo atual ao carregar pagamentos
  useEffect(() => {
    if (pagamentos.length > 0) {
      const horas = calcularTotalHoras(pagamentos);
      setKpi(prev => ({ ...prev, horasCicloAtual: horas }));
    }
  }, [pagamentos]);

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
      <div style={{ padding: "28px 32px", maxWidth: "900px", margin: "0 auto" }}>
        <h1 style={{ fontFamily: FONT.title, fontSize: "26px", fontWeight: 900, marginBottom: "6px", color: t.text }}>💰 Financeiro</h1>
        <p style={{ fontSize: "13px", color: t.textMuted, marginBottom: "28px", fontFamily: FONT.body }}>Gestão de pagamentos e ciclos semanais de influencers.</p>
        <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "16px", padding: "48px", textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>📅</div>
          <p style={{ fontFamily: FONT.title, fontSize: "18px", fontWeight: 900, color: t.text, marginBottom: "8px" }}>Nenhum ciclo cadastrado</p>
          <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body }}>Crie o primeiro ciclo de pagamento para começar.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: "1100px", margin: "0 auto" }}>
      <h1 style={{ fontFamily: FONT.title, fontSize: "26px", fontWeight: 900, marginBottom: "6px", color: t.text }}>💰 Financeiro</h1>
      <p style={{ fontSize: "13px", color: t.textMuted, marginBottom: "28px", fontFamily: FONT.body }}>Gestão de pagamentos e ciclos semanais de influencers.</p>

      <KpiCards
        totalPagoHistorico={kpi.totalPagoHistorico}
        qtdInfluencers={kpi.qtdInfluencers}
        qtdCiclos={kpi.qtdCiclos}
        valorPendente={kpi.valorPendente}
        qtdPendentes={kpi.qtdPendentes}
        totalHorasHistorico={kpi.totalHorasHistorico}
        horasCicloAtual={kpi.horasCicloAtual}
        t={t}
      />

      {cicloSelecionado && (
        <BlockCiclo
          ciclos={ciclos}
          cicloSelecionado={cicloSelecionado}
          setCicloSelecionado={handleTrocarCiclo}
          pagamentos={pagamentos}
          onFecharSemana={() => setModalFechar(true)}
          onAprovar={p => setModalAcao({ tipo: "aprovar", pagamento: p })}
          onPagar={p => setModalAcao({ tipo: "pagar", pagamento: p })}
          t={t}
        />
      )}

      <BlockConsolidado t={t} />

      {modalFechar && cicloSelecionado && (
        <ModalFecharSemana
          ciclo={cicloSelecionado}
          pagamentos={pagamentos}
          onClose={() => setModalFechar(false)}
          onConfirm={handleFecharSemana}
          t={t}
        />
      )}

      {modalAcao && (
        <ModalAcaoPagamento
          tipo={modalAcao.tipo}
          pagamento={modalAcao.pagamento}
          onClose={() => setModalAcao(null)}
          onConfirm={modalAcao.tipo === "aprovar"
            ? () => handleAprovar(modalAcao.pagamento)
            : () => handlePagar(modalAcao.pagamento)
          }
          t={t}
        />
      )}
    </div>
  );
}
