import { useState, useEffect, useMemo, useCallback } from "react";
import { useApp } from "../../../context/AppContext";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { CicloPagamento, Pagamento, PagamentoStatus } from "../../../types";

// ── Tipos locais ──────────────────────────────────────────────────────────────

interface PagamentoAgente {
  id: string;
  ciclo_id: string;
  descricao: string;
  total: number;
  status: "em_analise" | "a_pagar" | "pago";
  pago_em: string | null;
  criado_em: string;
}

interface PreviewInfluencer {
  influencer_id: string;
  influencer_name: string;
  horas_realizadas: number;
  total_estimado: number;
  cache_hora: number;
  qtd_lives: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PagamentoStatus, { label: string; color: string }> = {
  em_analise:        { label: "Em análise",       color: "#f39c12" },
  a_pagar:           { label: "Aguard. pagamento", color: "#6b7fff" },
  pago:              { label: "Pago",              color: "#27ae60" },
  perfil_incompleto: { label: "Perfil incompleto", color: "#e94025" },
};

const STATUS_AGENTE_CONFIG: Record<string, { label: string; color: string }> = {
  em_analise: { label: "Em análise",       color: "#f39c12" },
  a_pagar:    { label: "Aguard. pagamento", color: "#6b7fff" },
  pago:       { label: "Pago",              color: "#27ae60" },
};

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtHoras(horas: number) {
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function gerarOpcoesMeses() {
  const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({ value: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`, label: `${MESES[d.getMonth()]} ${d.getFullYear()}` });
  }
  return opts;
}

// ── Estilos compartilhados ────────────────────────────────────────────────────

function useStyles(t: any) {
  const card: React.CSSProperties = {
    background: t.cardBg, border: `1px solid ${t.cardBorder}`,
    borderRadius: "16px", padding: "22px", marginBottom: "24px",
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
  const tableWrap: React.CSSProperties = {
    overflowX: "auto", borderRadius: "12px", border: `1px solid ${t.cardBorder}`,
  };
  const sectionLabel: React.CSSProperties = {
    fontSize: "11px", fontWeight: 700, letterSpacing: "1.5px",
    textTransform: "uppercase", color: BASE_COLORS.purple, fontFamily: FONT.body,
  };
  const btnPrimary: React.CSSProperties = {
    padding: "9px 18px", borderRadius: "10px", border: "none", cursor: "pointer",
    background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
    color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: FONT.body,
  };
  return { card, th, td, inputStyle, tableWrap, sectionLabel, btnPrimary };
}

// ── Badge de Status ───────────────────────────────────────────────────────────

function StatusBadge({ status, config }: { status: string; config: Record<string, { label: string; color: string }> }) {
  const cfg = config[status] ?? { label: status, color: "#aaa" };
  const icons: Record<string, string> = { em_analise: "⏳", a_pagar: "💳", pago: "✅", perfil_incompleto: "⚠️" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "20px",
      background: `${cfg.color}22`, color: cfg.color,
      border: `1px solid ${cfg.color}44`, whiteSpace: "nowrap",
    }}>
      {icons[status] ?? ""} {cfg.label}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  return (
    <div style={{
      width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 800, fontSize: "11px",
    }}>
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

// ── KPIs ──────────────────────────────────────────────────────────────────────

function KpiCards({ totalPago, qtdCiclos, valorPendente, totalHoras, t }: {
  totalPago: number; qtdCiclos: number; valorPendente: number; totalHoras: number; t: any;
}) {
  const kpiCard = (accent: string): React.CSSProperties => ({
    background: t.cardBg, border: `1px solid ${t.cardBorder}`,
    borderRadius: "16px", padding: "20px 22px",
    borderTop: `3px solid ${accent}`, flex: 1,
  });
  const val: React.CSSProperties = { fontFamily: FONT.title, fontSize: "28px", fontWeight: 900, lineHeight: 1, marginBottom: "6px" };
  const lbl: React.CSSProperties = { fontSize: "12px", color: t.textMuted, fontWeight: 500, fontFamily: FONT.body };
  const sub: React.CSSProperties = { fontSize: "11px", color: t.textMuted, marginTop: "8px", paddingTop: "8px", borderTop: `1px solid ${t.divider}`, fontFamily: FONT.body };

  return (
    <div style={{ display: "flex", gap: "14px", marginBottom: "28px", flexWrap: "wrap" }}>
      <div style={kpiCard(`linear-gradient(90deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`)}>
        <div style={{ ...val, color: "#c9b8f0" }}>{fmtMoeda(totalPago)}</div>
        <div style={lbl}>Total pago (histórico)</div>
        <div style={sub}>{qtdCiclos} ciclos fechados</div>
      </div>
      <div style={kpiCard("#f39c12")}>
        <div style={{ ...val, color: "#f39c12" }}>{fmtMoeda(valorPendente)}</div>
        <div style={lbl}>Estimativa ciclo atual</div>
        <div style={sub}>Baseado nas lives realizadas</div>
      </div>
      <div style={kpiCard("#27ae60")}>
        <div style={{ ...val, color: "#27ae60" }}>{fmtHoras(totalHoras)}</div>
        <div style={lbl}>Total de horas realizadas</div>
        <div style={sub}>Histórico completo</div>
      </div>
    </div>
  );
}

// ── Modal Aprovar (com edição de valor) ───────────────────────────────────────

function ModalAprovar({ pagamento, onClose, onConfirm, t }: {
  pagamento: Pagamento;
  onClose: () => void;
  onConfirm: (novoTotal: number) => Promise<void>;
  t: any;
}) {
  const [saving, setSaving] = useState(false);
  const [valor, setValor] = useState(pagamento.total.toString());
  const valorNum = parseFloat(valor.replace(",", ".")) || 0;
  const editado = valorNum !== pagamento.total;

  async function handleConfirm() {
    setSaving(true);
    await onConfirm(valorNum);
    setSaving(false);
  }

  const row: React.CSSProperties = {
    display: "flex", justifyContent: "space-between",
    padding: "10px 0", borderBottom: `1px solid ${t.divider}`, fontSize: "13px",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "400px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 900, color: t.text, fontFamily: FONT.title }}>✅ Aprovar Pagamento</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: t.textMuted }}>✕</button>
        </div>
        <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "20px" }}>
          Revisão de pagamento para <strong style={{ color: t.text }}>{pagamento.influencer_name}</strong>
        </p>

        <div style={row}>
          <span style={{ color: t.textMuted }}>Horas realizadas</span>
          <span style={{ fontWeight: 700 }}>{fmtHoras(pagamento.horas_realizadas)}</span>
        </div>
        <div style={row}>
          <span style={{ color: t.textMuted }}>Cachê/hora</span>
          <span style={{ fontWeight: 700 }}>{fmtMoeda(pagamento.cache_hora)}</span>
        </div>
        <div style={{ ...row, borderBottom: "none", alignItems: "center" }}>
          <span style={{ color: t.textMuted }}>Valor a pagar</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {editado && (
              <span style={{ fontSize: "11px", color: "#f39c12", textDecoration: "line-through" }}>{fmtMoeda(pagamento.total)}</span>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ fontSize: "13px", color: t.textMuted }}>R$</span>
              <input
                type="number"
                value={valor}
                onChange={e => setValor(e.target.value)}
                style={{
                  width: "110px", padding: "6px 10px", borderRadius: "8px",
                  border: `1px solid ${editado ? "#f39c12" : t.cardBorder}`,
                  background: t.inputBg, color: t.inputText, fontSize: "14px",
                  fontWeight: 700, fontFamily: FONT.body, outline: "none", textAlign: "right",
                }}
              />
            </div>
          </div>
        </div>

        {editado && (
          <div style={{
            marginTop: "12px", padding: "10px 14px", borderRadius: "10px",
            background: "rgba(243,156,18,0.1)", border: "1px solid rgba(243,156,18,0.3)",
            fontSize: "12px", color: "#f39c12", fontFamily: FONT.body,
          }}>
            ⚠️ Valor editado manualmente. O cálculo automático era {fmtMoeda(pagamento.total)}.
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: "10px", cursor: "pointer", border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.textMuted, fontSize: "13px", fontWeight: 700, fontFamily: FONT.body }}>
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={saving || valorNum <= 0} style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", cursor: (saving || valorNum <= 0) ? "not-allowed" : "pointer", opacity: (saving || valorNum <= 0) ? 0.7 : 1, background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: FONT.body }}>
            {saving ? "⏳ Salvando..." : "✅ Aprovar valor"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Pagar ───────────────────────────────────────────────────────────────

function ModalPagar({ pagamento, onClose, onConfirm, t }: {
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

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "380px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 900, color: t.text, fontFamily: FONT.title }}>💰 Registrar Pagamento</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: t.textMuted }}>✕</button>
        </div>
        <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "20px" }}>
          Confirmar pagamento para <strong style={{ color: t.text }}>{pagamento.influencer_name}</strong>
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontSize: "15px" }}>
          <span style={{ color: t.textMuted }}>Total</span>
          <span style={{ fontWeight: 900, color: "#27ae60", fontSize: "20px" }}>{fmtMoeda(pagamento.total)}</span>
        </div>
        <p style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body, marginTop: "8px", lineHeight: 1.5 }}>
          A data de pagamento será registrada como hoje.
        </p>
        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: "10px", cursor: "pointer", border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.textMuted, fontSize: "13px", fontWeight: 700, fontFamily: FONT.body }}>
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={saving} style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, background: "linear-gradient(135deg, #1a6e3c, #27ae60)", color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: FONT.body }}>
            {saving ? "⏳ Salvando..." : "💰 Confirmar pagamento"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Adicionar Agente ────────────────────────────────────────────────────

function ModalAdicionarAgente({ ciclos, cicloAtualId, onClose, onConfirm, t }: {
  ciclos: CicloPagamento[];
  cicloAtualId: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  t: any;
}) {
  const [saving, setSaving] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [cicloId, setCicloId] = useState(cicloAtualId);

  async function handleConfirm() {
    const valorNum = parseFloat(valor.replace(",", "."));
    if (!descricao.trim() || isNaN(valorNum) || valorNum <= 0 || !cicloId) return;

    setSaving(true);
    await supabase.from("pagamentos_agentes").insert({
      ciclo_id: cicloId,
      descricao: descricao.trim(),
      total: valorNum,
      status: "em_analise",
    });
    await onConfirm();
    setSaving(false);
  }

  const valorNum = parseFloat(valor.replace(",", ".")) || 0;
  const canSubmit = descricao.trim().length > 0 && valorNum > 0 && cicloId;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "400px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 900, color: t.text, fontFamily: FONT.title }}>➕ Adicionar Agente</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: t.textMuted }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "6px", fontFamily: FONT.body }}>
              Descrição *
            </label>
            <input
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Ex: Comissão agente João"
              style={{ width: "100%", padding: "9px 12px", borderRadius: "10px", border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.inputText, fontSize: "13px", fontFamily: FONT.body, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "11px", fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "6px", fontFamily: FONT.body }}>
              Valor (R$) *
            </label>
            <input
              type="number"
              value={valor}
              onChange={e => setValor(e.target.value)}
              placeholder="0,00"
              style={{ width: "100%", padding: "9px 12px", borderRadius: "10px", border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.inputText, fontSize: "13px", fontFamily: FONT.body, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "11px", fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "6px", fontFamily: FONT.body }}>
              Ciclo *
            </label>
            <select
              value={cicloId}
              onChange={e => setCicloId(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: "10px", border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.inputText, fontSize: "13px", fontFamily: FONT.body, outline: "none", boxSizing: "border-box" }}
            >
              {ciclos.map(c => (
                <option key={c.id} value={c.id}>
                  {c.data_inicio} – {c.data_fim}{!c.fechado_em ? " (atual)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: "10px", cursor: "pointer", border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.textMuted, fontSize: "13px", fontWeight: 700, fontFamily: FONT.body }}>
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={saving || !canSubmit} style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", cursor: (saving || !canSubmit) ? "not-allowed" : "pointer", opacity: (saving || !canSubmit) ? 0.6 : 1, background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: FONT.body }}>
            {saving ? "⏳ Salvando..." : "➕ Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tabela de Pagamentos (usada em ciclo aberto e fechado) ────────────────────

function TabelaPagamentos({ pagamentos, cicloAberto, onAprovar, onPagar, t }: {
  pagamentos: Pagamento[];
  cicloAberto: boolean;
  onAprovar: (p: Pagamento) => void;
  onPagar: (p: Pagamento) => void;
  t: any;
}) {
  const { th, td, tableWrap } = useStyles(t);

  const totalCiclo = pagamentos
    .filter(p => p.status !== "perfil_incompleto")
    .reduce((a, p) => a + p.total, 0);

  return (
    <div style={tableWrap}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Influencer", "Horas realizadas", "Total", "Status", "Ação"].map(h => (
              <th key={h} style={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pagamentos.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ ...td, textAlign: "center", color: t.textMuted, padding: "48px" }}>
                {cicloAberto
                  ? "Nenhuma live realizada neste ciclo ainda."
                  : "Nenhum pagamento neste ciclo."}
              </td>
            </tr>
          ) : pagamentos.map((p, i) => (
            <tr key={p.id} style={{ borderBottom: i < pagamentos.length - 1 ? `1px solid ${t.cardBorder}` : "none" }}>
              <td style={td}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Avatar name={p.influencer_name ?? "?"} />
                  <span style={{ fontWeight: 600 }}>{p.influencer_name ?? p.influencer_id}</span>
                </div>
              </td>
              <td style={td}>{fmtHoras(p.horas_realizadas)}</td>
              <td style={{ ...td, fontWeight: 700, color: p.status === "perfil_incompleto" ? "#e94025" : t.text }}>
                {p.status === "perfil_incompleto" ? "—" : fmtMoeda(p.total)}
              </td>
              <td style={td}>
                <StatusBadge status={p.status} config={STATUS_CONFIG} />
              </td>
              <td style={td}>
                {p.status === "em_analise" && (
                  <button
                    onClick={() => onAprovar(p)}
                    style={{ padding: "5px 12px", borderRadius: "8px", border: `1px solid rgba(107,127,255,0.4)`, background: "rgba(107,127,255,0.12)", color: "#6b7fff", fontSize: "11px", fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}
                  >
                    ✅ Aprovar
                  </button>
                )}
                {p.status === "a_pagar" && (
                  <button
                    onClick={() => onPagar(p)}
                    style={{ padding: "5px 12px", borderRadius: "8px", border: `1px solid rgba(39,174,96,0.4)`, background: "rgba(39,174,96,0.12)", color: "#27ae60", fontSize: "11px", fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}
                  >
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
              <td style={{ ...td, fontWeight: 700 }}>
                {fmtHoras(pagamentos.reduce((a, p) => a + p.horas_realizadas, 0))}
              </td>
              <td style={{ ...td, fontSize: "15px", color: "#c9b8f0", fontWeight: 700 }}>{fmtMoeda(totalCiclo)}</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

// ── Preview do Ciclo Aberto ───────────────────────────────────────────────────

function PreviewCicloAberto({ cicloId, dataInicio, dataFim, t }: {
  cicloId: string; dataInicio: string; dataFim: string; t: any;
}) {
  const [preview, setPreview] = useState<PreviewInfluencer[]>([]);
  const [loading, setLoading] = useState(true);
  const { th, td, tableWrap } = useStyles(t);

  useEffect(() => { carregarPreview(); }, [cicloId]);

  async function carregarPreview() {
    setLoading(true);

    const { data: lives } = await supabase
      .from("lives")
      .select("id, influencer_id, live_resultados(duracao_horas, duracao_min)")
      .eq("status", "realizada")
      .gte("data", dataInicio)
      .lte("data", dataFim);

    if (!lives || lives.length === 0) { setLoading(false); return; }

    // Agrupa horas por influencer
    const horasPorInfluencer: Record<string, { horas: number; qtd: number }> = {};
    for (const live of lives as any[]) {
      const id = live.influencer_id;
      const res = live.live_resultados?.[0];
      if (res) {
        if (!horasPorInfluencer[id]) horasPorInfluencer[id] = { horas: 0, qtd: 0 };
        horasPorInfluencer[id].horas += res.duracao_horas + res.duracao_min / 60;
        horasPorInfluencer[id].qtd += 1;
      }
    }

    const influencerIds = Object.keys(horasPorInfluencer);
    if (influencerIds.length === 0) { setLoading(false); return; }

    // Busca nomes e cache_hora
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", influencerIds);

    const { data: perfis } = await supabase
      .from("influencer_perfil")
      .select("id, cache_hora")
      .in("id", influencerIds);

    const profileMap: Record<string, string> = {};
    for (const p of (profiles ?? []) as any[]) profileMap[p.id] = p.name;

    const perfilMap: Record<string, number> = {};
    for (const p of (perfis ?? []) as any[]) perfilMap[p.id] = p.cache_hora ?? 0;

    const resultado: PreviewInfluencer[] = influencerIds.map(id => ({
      influencer_id: id,
      influencer_name: profileMap[id] ?? id,
      horas_realizadas: Math.round(horasPorInfluencer[id].horas * 100) / 100,
      cache_hora: perfilMap[id] ?? 0,
      total_estimado: Math.round(horasPorInfluencer[id].horas * (perfilMap[id] ?? 0) * 100) / 100,
      qtd_lives: horasPorInfluencer[id].qtd,
    }));

    resultado.sort((a, b) => b.total_estimado - a.total_estimado);
    setPreview(resultado);
    setLoading(false);
  }

  const totalEstimado = preview.reduce((a, p) => a + p.total_estimado, 0);

  if (loading) return (
    <div style={{ textAlign: "center", padding: "40px", color: t.textMuted, fontFamily: FONT.body }}>
      Carregando lives do ciclo...
    </div>
  );

  return (
    <div>
      {preview.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px", color: t.textMuted, fontFamily: FONT.body }}>
          Nenhuma live realizada neste ciclo ainda.
        </div>
      ) : (
        <div style={tableWrap}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Influencer", "Lives realizadas", "Horas", "Cachê/hora", "Estimativa"].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((p, i) => (
                <tr key={p.influencer_id} style={{ borderBottom: i < preview.length - 1 ? `1px solid ${t.cardBorder}` : "none" }}>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Avatar name={p.influencer_name} />
                      <span style={{ fontWeight: 600 }}>{p.influencer_name}</span>
                    </div>
                  </td>
                  <td style={{ ...td, color: t.textMuted }}>{p.qtd_lives} live{p.qtd_lives !== 1 ? "s" : ""}</td>
                  <td style={td}>{fmtHoras(p.horas_realizadas)}</td>
                  <td style={{ ...td, color: t.textMuted }}>
                    {p.cache_hora > 0 ? fmtMoeda(p.cache_hora) : <span style={{ color: "#e94025" }}>⚠️ Sem cadastro</span>}
                  </td>
                  <td style={{ ...td, fontWeight: 700, color: p.cache_hora > 0 ? "#c9b8f0" : "#e94025" }}>
                    {p.cache_hora > 0 ? fmtMoeda(p.total_estimado) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: t.isDark ? "rgba(74,48,130,0.1)" : "rgba(74,48,130,0.05)", borderTop: `2px solid rgba(74,48,130,0.4)` }}>
                <td style={{ ...td, fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", color: t.textMuted }}>ESTIMATIVA TOTAL</td>
                <td colSpan={3}></td>
                <td style={{ ...td, fontSize: "15px", color: "#c9b8f0", fontWeight: 700 }}>{fmtMoeda(totalEstimado)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Bloco Principal de Ciclo ──────────────────────────────────────────────────

function BlockCiclo({ ciclos, cicloSelecionado, setCicloSelecionado, pagamentos, onAprovar, onPagar, onFecharCiclo, t }: {
  ciclos: CicloPagamento[];
  cicloSelecionado: CicloPagamento | null;
  setCicloSelecionado: (c: CicloPagamento) => void;
  pagamentos: Pagamento[];
  onAprovar: (p: Pagamento) => void;
  onPagar: (p: Pagamento) => void;
  onFecharCiclo: () => void;
  t: any;
}) {
  const { card, sectionLabel, inputStyle } = useStyles(t);
  const isAberto = !cicloSelecionado?.fechado_em;

  const resumo = {
    em_analise: pagamentos.filter(p => p.status === "em_analise").length,
    a_pagar:    pagamentos.filter(p => p.status === "a_pagar").length,
    pago:       pagamentos.filter(p => p.status === "pago").length,
    total:      pagamentos.filter(p => p.status !== "perfil_incompleto").reduce((a, p) => a + p.total, 0),
  };

  return (
    <div style={card}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={sectionLabel}>📅 CICLO DE PAGAMENTO</span>
          <span style={{
            fontSize: "12px", fontWeight: 700, padding: "4px 13px", borderRadius: "20px",
            background: isAberto ? "rgba(243,156,18,0.15)" : "rgba(39,174,96,0.12)",
            color:      isAberto ? "#f39c12" : "#27ae60",
            border:     `1px solid ${isAberto ? "rgba(243,156,18,0.3)" : "rgba(39,174,96,0.3)"}`,
          }}>
            {isAberto ? "🔓 Atual" : "✅ Fechado"}
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
          <button onClick={onFecharCiclo} style={{
            padding: "9px 18px", borderRadius: "10px", cursor: "pointer",
            background: t.isDark ? "rgba(233,64,37,0.15)" : "rgba(233,64,37,0.1)",
            color: "#e94025", border: "1px solid rgba(233,64,37,0.3)",
            fontSize: "13px", fontWeight: 700, fontFamily: FONT.body,
          }}>
            🔒 Fechar Ciclo
          </button>
        )}
      </div>

      {/* Mini-resumo (apenas ciclos fechados) */}
      {!isAberto && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "18px" }}>
          {[
            { value: resumo.em_analise, label: "Em análise",  color: "#f39c12" },
            { value: resumo.a_pagar,    label: "A pagar",     color: "#6b7fff" },
            { value: resumo.pago,       label: "Pago",        color: "#27ae60" },
            { value: fmtMoeda(resumo.total), label: "Total do ciclo", color: t.text },
          ].map((item, i) => (
            <div key={i} style={{
              background: t.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
              border: `1px solid ${t.cardBorder}`, borderRadius: "10px", padding: "12px 14px", textAlign: "center",
            }}>
              <div style={{ fontFamily: FONT.title, fontSize: "22px", fontWeight: 900, color: item.color, marginBottom: "3px" }}>{item.value}</div>
              <div style={{ fontSize: "10px", color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: FONT.body }}>{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Conteúdo: preview ou tabela de pagamentos */}
      {isAberto ? (
        <PreviewCicloAberto
          cicloId={cicloSelecionado!.id}
          dataInicio={cicloSelecionado!.data_inicio}
          dataFim={cicloSelecionado!.data_fim}
          t={t}
        />
      ) : (
        <TabelaPagamentos
          pagamentos={pagamentos}
          cicloAberto={false}
          onAprovar={onAprovar}
          onPagar={onPagar}
          t={t}
        />
      )}
    </div>
  );
}

// ── Bloco Agentes ─────────────────────────────────────────────────────────────

function BlockAgentes({ ciclos, cicloAtualId, t }: {
  ciclos: CicloPagamento[];
  cicloAtualId: string;
  t: any;
}) {
  const { card, sectionLabel, th, td, tableWrap, inputStyle } = useStyles(t);
  const [agentes, setAgentes] = useState<PagamentoAgente[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [filtroCiclo, setFiltroCiclo] = useState("");

  useEffect(() => { carregarAgentes(); }, []);

  async function carregarAgentes() {
    setLoading(true);
    const { data } = await supabase
      .from("pagamentos_agentes")
      .select("*, ciclos_pagamento(data_inicio, data_fim)")
      .order("criado_em", { ascending: false });
    setAgentes((data ?? []) as any);
    setLoading(false);
  }

  async function handleAprovar(id: string) {
    await supabase.from("pagamentos_agentes").update({ status: "a_pagar" }).eq("id", id);
    carregarAgentes();
  }

  async function handlePagar(id: string) {
    await supabase.from("pagamentos_agentes").update({ status: "pago", pago_em: new Date().toISOString() }).eq("id", id);
    carregarAgentes();
  }

  const filtrados = filtroCiclo ? agentes.filter(a => a.ciclo_id === filtroCiclo) : agentes;

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={sectionLabel}>🤝 PAGAMENTOS DE AGENTES</span>
          {!loading && <span style={{ fontSize: "12px", color: t.textMuted }}>{filtrados.length} registro{filtrados.length !== 1 ? "s" : ""}</span>}
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <select value={filtroCiclo} onChange={e => setFiltroCiclo(e.target.value)} style={inputStyle}>
            <option value="">Todos os ciclos</option>
            {ciclos.map(c => (
              <option key={c.id} value={c.id}>{c.data_inicio} – {c.data_fim}{!c.fechado_em ? " (atual)" : ""}</option>
            ))}
          </select>
          <button
            onClick={() => setModalAberto(true)}
            style={{
              padding: "8px 16px", borderRadius: "10px", border: "none", cursor: "pointer",
              background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
              color: "#fff", fontSize: "12px", fontWeight: 700, fontFamily: FONT.body,
            }}
          >
            ➕ Adicionar Agente
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: t.textMuted, fontFamily: FONT.body }}>Carregando...</div>
      ) : (
        <div style={tableWrap}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Descrição", "Ciclo", "Total", "Status", "Ação"].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={5} style={{ ...td, textAlign: "center", color: t.textMuted, padding: "40px" }}>
                  Nenhum pagamento de agente registrado.
                </td></tr>
              ) : filtrados.map((a: any, i) => (
                <tr key={a.id} style={{ borderBottom: i < filtrados.length - 1 ? `1px solid ${t.cardBorder}` : "none" }}>
                  <td style={{ ...td, fontWeight: 600 }}>{a.descricao}</td>
                  <td style={{ ...td, color: t.textMuted, fontSize: "12px" }}>
                    {a.ciclos_pagamento?.data_inicio} – {a.ciclos_pagamento?.data_fim}
                  </td>
                  <td style={{ ...td, fontWeight: 700 }}>{fmtMoeda(a.total)}</td>
                  <td style={td}><StatusBadge status={a.status} config={STATUS_AGENTE_CONFIG} /></td>
                  <td style={td}>
                    {a.status === "em_analise" && (
                      <button onClick={() => handleAprovar(a.id)} style={{ padding: "5px 12px", borderRadius: "8px", border: `1px solid rgba(107,127,255,0.4)`, background: "rgba(107,127,255,0.12)", color: "#6b7fff", fontSize: "11px", fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}>
                        ✅ Aprovar
                      </button>
                    )}
                    {a.status === "a_pagar" && (
                      <button onClick={() => handlePagar(a.id)} style={{ padding: "5px 12px", borderRadius: "8px", border: `1px solid rgba(39,174,96,0.4)`, background: "rgba(39,174,96,0.12)", color: "#27ae60", fontSize: "11px", fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}>
                        💰 Pagar
                      </button>
                    )}
                    {a.status === "pago" && <span style={{ fontSize: "11px", color: t.textMuted }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <ModalAdicionarAgente
          ciclos={ciclos}
          cicloAtualId={cicloAtualId}
          onClose={() => setModalAberto(false)}
          onConfirm={async () => { setModalAberto(false); await carregarAgentes(); }}
          t={t}
        />
      )}
    </div>
  );
}

// ── Bloco Consolidado ─────────────────────────────────────────────────────────

function BlockConsolidado({ t }: { t: any }) {
  const { card, sectionLabel, tableWrap, th, td, inputStyle } = useStyles(t);
  const OPCOES_MESES = useMemo(() => gerarOpcoesMeses(), []);

  interface ConsolidadoRow {
    influencer_id: string; influencer_name: string; email: string;
    totalPago: number; totalHoras: number; pendente: number;
    ultimoPagamento: string | null; statusGeral: string;
  }

  const [mesFiltro, setMesFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [busca, setBusca] = useState("");
  const [rows, setRows] = useState<ConsolidadoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [historico, setHistorico] = useState<Record<string, Pagamento[]>>({});
  const [loadingHist, setLoadingHist] = useState<string | null>(null);

  useEffect(() => { carregarConsolidado(); }, [mesFiltro]);

  async function carregarConsolidado() {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("id, name, email").eq("role", "influencer").order("name");
    if (!profiles) { setLoading(false); return; }

    let dataInicio = "2000-01-01";
    let dataFim = new Date().toISOString().split("T")[0];
    if (mesFiltro) {
      const [ano, mes] = mesFiltro.split("-").map(Number);
      dataInicio = `${mesFiltro}-01`;
      const ultimo = new Date(ano, mes, 0).getDate();
      dataFim = `${mesFiltro}-${String(ultimo).padStart(2, "0")}`;
    }

    const { data: ciclosPeriodo } = await supabase.from("ciclos_pagamento").select("id").gte("data_inicio", dataInicio).lte("data_fim", dataFim);
    const cicloIds = (ciclosPeriodo ?? []).map((c: any) => c.id);

    let pagamentosData: any[] = [];
    if (cicloIds.length > 0) {
      const { data } = await supabase.from("pagamentos").select("*").in("ciclo_id", cicloIds);
      pagamentosData = data ?? [];
    }

    const resultado: ConsolidadoRow[] = (profiles as any[]).map(prof => {
      const pags = pagamentosData.filter(p => p.influencer_id === prof.id);
      const pagos = pags.filter(p => p.status === "pago");
      const pendentes = pags.filter(p => p.status === "a_pagar" || p.status === "em_analise");
      const incompleto = pags.some(p => p.status === "perfil_incompleto");
      const totalPago = pagos.reduce((a, p) => a + p.total, 0);
      const totalHoras = pags.filter(p => p.status !== "perfil_incompleto").reduce((a, p) => a + p.horas_realizadas, 0);
      const pendente = pendentes.reduce((a, p) => a + p.total, 0);
      const ultimoPag = pagos.sort((a, b) => (b.pago_em ?? "").localeCompare(a.pago_em ?? ""))[0]?.pago_em ?? null;
      const statusGeral = incompleto ? "perfil_incompleto" : pags.length > 0 ? "ativo" : "inativo";
      return { influencer_id: prof.id, influencer_name: prof.name ?? prof.email, email: prof.email, totalPago, totalHoras, pendente, ultimoPagamento: ultimoPag, statusGeral };
    });

    setRows(resultado);
    setLoading(false);
  }

  async function toggleExpand(influencer_id: string) {
    if (expandido === influencer_id) { setExpandido(null); return; }
    setExpandido(influencer_id);
    if (historico[influencer_id]) return;
    setLoadingHist(influencer_id);
    const { data } = await supabase.from("pagamentos").select("*, ciclos_pagamento(data_inicio, data_fim)").eq("influencer_id", influencer_id).order("criado_em", { ascending: false }).limit(12);
    if (data) setHistorico(prev => ({ ...prev, [influencer_id]: data as any }));
    setLoadingHist(null);
  }

  const filtered = rows.filter(r => {
    const nomeOk = !busca || r.influencer_name.toLowerCase().includes(busca.toLowerCase()) || r.email.toLowerCase().includes(busca.toLowerCase());
    const statusOk = !statusFiltro || r.statusGeral === statusFiltro;
    return nomeOk && statusOk;
  });

  const statusLabel: Record<string, { label: string; color: string }> = {
    ativo:             { label: "● Ativo",             color: "#27ae60" },
    inativo:           { label: "○ Inativo",           color: "#aaaacc" },
    perfil_incompleto: { label: "⚠️ Perfil incompleto", color: "#e94025" },
  };

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={sectionLabel}>👥 CONSOLIDADO POR INFLUENCER</span>
          {!loading && <span style={{ fontSize: "12px", color: t.textMuted }}>{filtered.length} influencers</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍 Buscar..." style={{ ...inputStyle, width: "180px" }} />
          <select value={mesFiltro} onChange={e => setMesFiltro(e.target.value)} style={inputStyle}>
            <option value="">Todos os meses</option>
            {OPCOES_MESES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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
        <div style={{ textAlign: "center", padding: "48px", color: t.textMuted, fontFamily: FONT.body }}>Carregando...</div>
      ) : (
        <div style={tableWrap}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...th, width: "32px" }}></th>
                {["Influencer", "Total pago", "Total horas", "Pendente", "Último pagamento", "Status"].map(h => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: t.textMuted, padding: "40px" }}>Nenhum influencer encontrado.</td></tr>
              ) : filtered.map(row => {
                const isOpen = expandido === row.influencer_id;
                const hist = historico[row.influencer_id] ?? [];
                const sl = statusLabel[row.statusGeral] ?? { label: row.statusGeral, color: "#aaa" };
                return (
                  <>
                    <tr key={row.influencer_id} style={{ cursor: "pointer", borderBottom: `1px solid ${t.cardBorder}` }} onClick={() => toggleExpand(row.influencer_id)}>
                      <td style={td}>
                        <span style={{ fontSize: "10px", color: t.textMuted, display: "inline-block", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▶</span>
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Avatar name={row.influencer_name} />
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

                    {isOpen && (
                      <tr key={`exp-${row.influencer_id}`} style={{ background: t.isDark ? "rgba(74,48,130,0.06)" : "rgba(74,48,130,0.03)" }}>
                        <td colSpan={7} style={{ padding: "16px 20px", borderBottom: `1px solid ${t.cardBorder}` }}>
                          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: t.textMuted, marginBottom: "10px" }}>
                            Histórico — {row.influencer_name}
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
                                {(hist as any[]).map(h => (
                                  <tr key={h.id} style={{ borderBottom: `1px solid ${t.divider}` }}>
                                    <td style={{ ...td, fontSize: "12px", padding: "8px 10px" }}>{h.ciclos_pagamento?.data_inicio} – {h.ciclos_pagamento?.data_fim}</td>
                                    <td style={{ ...td, fontSize: "12px", padding: "8px 10px" }}>{fmtHoras(h.horas_realizadas)}</td>
                                    <td style={{ ...td, fontSize: "12px", padding: "8px 10px" }}>{h.status === "perfil_incompleto" ? "—" : fmtMoeda(h.total)}</td>
                                    <td style={{ ...td, fontSize: "12px", padding: "8px 10px" }}><StatusBadge status={h.status} config={STATUS_CONFIG} /></td>
                                    <td style={{ ...td, fontSize: "12px", padding: "8px 10px", color: t.textMuted }}>{h.pago_em ? new Date(h.pago_em).toLocaleDateString("pt-BR") : "—"}</td>
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

  const [ciclos, setCiclos] = useState<CicloPagamento[]>([]);
  const [cicloSelecionado, setCicloSelecionado] = useState<CicloPagamento | null>(null);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState({ totalPago: 0, qtdCiclos: 0, valorPendente: 0, totalHoras: 0 });
  const [modalAprovar, setModalAprovar] = useState<Pagamento | null>(null);
  const [modalPagar, setModalPagar] = useState<Pagamento | null>(null);

  useEffect(() => { carregarTudo(); }, []);

  async function carregarTudo() {
    setLoading(true);
    await Promise.all([carregarCiclos(), carregarKpis()]);
    setLoading(false);
  }

  async function carregarCiclos() {
    const { data } = await supabase.from("ciclos_pagamento").select("*").order("data_inicio", { ascending: false });
    if (data && data.length > 0) {
      setCiclos(data);
      setCicloSelecionado(data[0]);
      if (data[0].fechado_em) await carregarPagamentos(data[0].id);
    }
  }

  async function carregarPagamentos(cicloId: string) {
    const { data } = await supabase
      .from("pagamentos")
      .select("*, profiles!pagamentos_influencer_id_fkey(name)")
      .eq("ciclo_id", cicloId)
      .order("criado_em", { ascending: true });
    if (data) setPagamentos(data.map((p: any) => ({ ...p, influencer_name: p.profiles?.name })));
  }

  async function carregarKpis() {
    const { data: pagsTodos } = await supabase.from("pagamentos").select("total, horas_realizadas, status");
    const { data: ciclosFechados } = await supabase.from("ciclos_pagamento").select("id").not("fechado_em", "is", null);
    if (!pagsTodos) return;
    const pagos = pagsTodos.filter((p: any) => p.status === "pago");
    setKpi({
      totalPago: pagos.reduce((a: number, p: any) => a + p.total, 0),
      qtdCiclos: ciclosFechados?.length ?? 0,
      valorPendente: 0, // atualizado pelo preview
      totalHoras: pagsTodos.reduce((a: number, p: any) => a + p.horas_realizadas, 0),
    });
  }

  async function handleTrocarCiclo(ciclo: CicloPagamento) {
    setCicloSelecionado(ciclo);
    setPagamentos([]);
    if (ciclo.fechado_em) await carregarPagamentos(ciclo.id);
  }

  async function handleFecharCiclo() {
    if (!cicloSelecionado) return;

    // Busca lives realizadas no período
    const { data: lives } = await supabase
      .from("lives")
      .select("id, influencer_id, live_resultados(duracao_horas, duracao_min)")
      .eq("status", "realizada")
      .gte("data", cicloSelecionado.data_inicio)
      .lte("data", cicloSelecionado.data_fim);

    if (lives && lives.length > 0) {
      const horasPorInfluencer: Record<string, number> = {};
      for (const live of lives as any[]) {
        const id = live.influencer_id;
        const res = live.live_resultados?.[0];
        if (res) horasPorInfluencer[id] = (horasPorInfluencer[id] ?? 0) + res.duracao_horas + res.duracao_min / 60;
      }

      for (const [influencer_id, horas] of Object.entries(horasPorInfluencer)) {
        const { data: perfil } = await supabase.from("influencer_perfil").select("cache_hora").eq("id", influencer_id).single();
        const cache_hora = perfil?.cache_hora ?? 0;
        const status: PagamentoStatus = cache_hora > 0 ? "em_analise" : "perfil_incompleto";
        const total = Math.round(horas * cache_hora * 100) / 100;
        await supabase.from("pagamentos").upsert({
          ciclo_id: cicloSelecionado.id, influencer_id,
          horas_realizadas: Math.round(horas * 100) / 100,
          cache_hora, total, status,
        }, { onConflict: "ciclo_id,influencer_id" });
      }
    }

    await supabase.from("ciclos_pagamento").update({ fechado_em: new Date().toISOString() }).eq("id", cicloSelecionado.id);
    await carregarTudo();
  }

  async function handleAprovar(novoTotal: number) {
    if (!modalAprovar) return;
    await supabase.from("pagamentos").update({ status: "a_pagar", total: novoTotal }).eq("id", modalAprovar.id);
    setModalAprovar(null);
    if (cicloSelecionado) await carregarPagamentos(cicloSelecionado.id);
    await carregarKpis();
  }

  async function handlePagar() {
    if (!modalPagar) return;
    await supabase.from("pagamentos").update({ status: "pago", pago_em: new Date().toISOString() }).eq("id", modalPagar.id);
    setModalPagar(null);
    if (cicloSelecionado) await carregarPagamentos(cicloSelecionado.id);
    await carregarKpis();
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "400px" }}>
      <div style={{ textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
        Carregando financeiro...
      </div>
    </div>
  );

  if (ciclos.length === 0) return (
    <div style={{ padding: "28px 32px", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontFamily: FONT.title, fontSize: "26px", fontWeight: 900, marginBottom: "6px", color: t.text }}>💰 Financeiro</h1>
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "16px", padding: "48px", textAlign: "center" }}>
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>📅</div>
        <p style={{ fontFamily: FONT.title, fontSize: "18px", fontWeight: 900, color: t.text, marginBottom: "8px" }}>Nenhum ciclo cadastrado</p>
        <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body }}>Crie o primeiro ciclo de pagamento diretamente no Supabase para começar.</p>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: "1100px", margin: "0 auto" }}>
      <h1 style={{ fontFamily: FONT.title, fontSize: "26px", fontWeight: 900, marginBottom: "6px", color: t.text }}>💰 Financeiro</h1>
      <p style={{ fontSize: "13px", color: t.textMuted, marginBottom: "28px", fontFamily: FONT.body }}>Gestão de pagamentos e ciclos semanais de influencers.</p>

      <KpiCards
        totalPago={kpi.totalPago}
        qtdCiclos={kpi.qtdCiclos}
        valorPendente={kpi.valorPendente}
        totalHoras={kpi.totalHoras}
        t={t}
      />

      {cicloSelecionado && (
        <BlockCiclo
          ciclos={ciclos}
          cicloSelecionado={cicloSelecionado}
          setCicloSelecionado={handleTrocarCiclo}
          pagamentos={pagamentos}
          onAprovar={p => setModalAprovar(p)}
          onPagar={p => setModalPagar(p)}
          onFecharCiclo={handleFecharCiclo}
          t={t}
        />
      )}

      <BlockAgentes
        ciclos={ciclos}
        cicloAtualId={ciclos[0]?.id ?? ""}
        t={t}
      />

      <BlockConsolidado t={t} />

      {modalAprovar && (
        <ModalAprovar
          pagamento={modalAprovar}
          onClose={() => setModalAprovar(null)}
          onConfirm={handleAprovar}
          t={t}
        />
      )}

      {modalPagar && (
        <ModalPagar
          pagamento={modalPagar}
          onClose={() => setModalPagar(null)}
          onConfirm={handlePagar}
          t={t}
        />
      )}
    </div>
  );
}
