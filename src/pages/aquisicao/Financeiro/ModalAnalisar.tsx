import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"
import { useApp } from "../../../context/AppContext"
import { useDashboardBrand } from "../../../hooks/useDashboardBrand"
import { BASE_COLORS, FONT } from "../../../constants/theme"
import { fmtBRL, fmtHorasTotal } from "../../../lib/dashboardHelpers"
import { supabase } from "../../../lib/supabase"
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark"
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal"
import type { CicloPagamento } from "../../../types"
import type { FinanceiroLiveComResultado, FinanceiroLiveRow, PagamentoRow } from "./financeiroTypes"

export function ModalAnalisar({ row, ciclo, onClose, onConfirm }: {
  row: PagamentoRow;
  ciclo: CicloPagamento;
  onClose: () => void;
  onConfirm: (id: string, novoTotal: number, isAgente: boolean) => Promise<void>;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [valor, setValor] = useState(String(row.total));
  const [lives, setLives] = useState<FinanceiroLiveComResultado[]>([]);

  const rawValor = valor.replace(",", ".").trim();
  const parsedValor = rawValor === "" ? NaN : Number.parseFloat(rawValor);
  const valorNum = Number.isFinite(parsedValor) ? parsedValor : NaN;
  const editado = Number.isFinite(valorNum) && valorNum !== row.total;

  const carregarLives = useCallback(async () => {
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
    const livesList = (livesData ?? []) as FinanceiroLiveRow[];
    if (livesList.length === 0) {
      setLives([]);
      return;
    }
    const liveIds = livesList.map((l) => l.id);
    const { data: resData } = await supabase
      .from("live_resultados")
      .select("live_id, duracao_horas, duracao_min")
      .in("live_id", liveIds);
    const resultadosMap = new Map<string, { duracao_horas: number; duracao_min: number }>();
    for (const r of (resData ?? []) as { live_id: string; duracao_horas: number; duracao_min: number }[]) {
      resultadosMap.set(String(r.live_id), { duracao_horas: r.duracao_horas ?? 0, duracao_min: r.duracao_min ?? 0 });
    }
    const merged: FinanceiroLiveComResultado[] = livesList.map((l) => ({
      ...l,
      _resultado: resultadosMap.get(String(l.id)),
    }));
    setLives(merged);
  }, [row.influencer_id, row.operadora_slug, ciclo.data_inicio, ciclo.data_fim]);

  useEffect(() => {
    if (!row.is_agente) void carregarLives();
  }, [row.is_agente, carregarLives]);

  async function handleConfirm(totalAprovar: number) {
    setError("");
    setSaving(true);
    try {
      await onConfirm(row.id, totalAprovar, row.is_agente ?? false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar. Tente novamente.";
      setError(msg);
      console.error("[ModalAnalisar] Erro ao aprovar:", e);
    } finally {
      setSaving(false);
    }
  }
  const handleConfirmClick = () => {
    if (!Number.isFinite(valorNum) || valorNum < 0) {
      setError("Informe um valor válido. Use 0,00 para zerar o valor da plataforma.");
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
        title={`Analisar — ${row.influencer_name}`}
        onClose={onClose}
      />

      {error ? (
        <div
          role="alert"
          aria-live="polite"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.4)",
            color: "#e84025",
            borderRadius: 10,
            padding: "12px 14px",
            fontSize: 13,
            marginBottom: 16,
            fontFamily: FONT.body,
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      {!row.is_agente && (
        <div style={{ marginBottom: "16px" }}>
          <div style={rowStyle}>
            <span style={{ color: t.textMuted }}>Horas realizadas</span>
            <span style={{ fontWeight: 700 }}>{fmtHorasTotal(row.horas_realizadas)}</span>
          </div>
          <div style={{ ...rowStyle, borderBottom: "none" }}>
            <span style={{ color: t.textMuted }}>Cachê/hora</span>
            <span style={{ fontWeight: 700 }}>
              {row.cache_hora > 0 ? fmtBRL(row.cache_hora) : <span style={{ color: "#e84025" }}>Não cadastrado</span>}
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
          {lives.map((l: FinanceiroLiveComResultado) => {
            const r = l._resultado;
            const h = r ? (r.duracao_horas ?? 0) + (r.duracao_min ?? 0) / 60 : 0;
            return (
              <div key={l.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${t.divider}`, fontSize: "12px" }}>
                <span style={{ color: t.text }}>{l.data} · {l.plataforma}</span>
                <span style={{ color: t.textMuted, fontFamily: FONT.body }}>{fmtHorasTotal(h)}</span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginBottom: "20px" }}>
        <label style={{ fontSize: "11px", fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "8px", fontFamily: FONT.body }}>
          Valor a aprovar (R$)
          <CampoObrigatorioMark />
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            type="number"
            inputMode="decimal"
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
          {editado && <span style={{ fontSize: "11px", color: "#f59e0b", whiteSpace: "nowrap" }}>era {fmtBRL(row.total)}</span>}
        </div>
        {editado && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: "8px", fontSize: "11px", color: "#f59e0b", fontFamily: FONT.body }}>
            <AlertTriangle size={12} aria-hidden />
            Valor editado manualmente.
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        
        <button
          type="button"
          onClick={handleConfirmClick}
          disabled={saving || !Number.isFinite(valorNum) || valorNum < 0}
          style={{
            flex: 2,
            padding: "12px",
            borderRadius: "10px",
            border: "none",
            cursor: saving || !Number.isFinite(valorNum) || valorNum < 0 ? "not-allowed" : "pointer",
            opacity: saving || !Number.isFinite(valorNum) || valorNum < 0 ? 0.7 : 1,
            background: brand.useBrand
              ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
              : `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
            color: "#fff",
            fontSize: "13px",
            fontWeight: 700,
            fontFamily: FONT.body,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {saving ? (
            <>
              <Loader2 size={13} className="app-lucide-spin" color="#fff" aria-hidden />
              Salvando...
            </>
          ) : (
            <>
              <CheckCircle2 size={13} aria-hidden />
              Aprovar valor
            </>
          )}
        </button>
      </div>
    </ModalBase>
  );
}