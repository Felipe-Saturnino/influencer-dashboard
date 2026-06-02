import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { AlertTriangle, Banknote, CheckCircle2, Loader2, Plus, RotateCcw } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { fmtBRL, fmtHorasTotal } from "../../../lib/dashboardHelpers";
import { supabase } from "../../../lib/supabase";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import type { CicloPagamento } from "../../../types";
import type { FinanceiroLiveComResultado, FinanceiroLiveRow, PagamentoRow } from "./financeiroTypes";

export function ModalPagar({ row, onClose, onConfirm, onRetornar }: {
  row: PagamentoRow;
  onClose: () => void;
  onConfirm: (id: string, isAgente: boolean) => Promise<void>;
  onRetornar: (id: string, isAgente: boolean) => Promise<void>;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
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
      <ModalHeader title="Registrar pagamento" onClose={onClose} />
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
      <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "20px" }}>
        Confirmar pagamento para <strong style={{ color: t.text }}>{row.influencer_name}</strong>
        {row.is_agente && row.descricao && <> — {row.descricao}</>}
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderTop: `1px solid ${t.divider}`, borderBottom: `1px solid ${t.divider}`, marginBottom: "20px" }}>
        <span style={{ color: t.textMuted, fontSize: "14px" }}>Total</span>
        <span style={{ fontWeight: 900, color: "#22c55e", fontSize: "24px", fontFamily: FONT_TITLE }}>{fmtBRL(row.total)}</span>
      </div>
      <p style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "20px", lineHeight: 1.6 }}>
        A data de pagamento será registrada como hoje.
      </p>
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          type="button"
          onClick={handleRetornarClick}
          disabled={saving}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "10px",
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.text,
            fontSize: "13px",
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {saving ? (
            <>
              <Loader2 size={13} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
              Salvando...
            </>
          ) : (
            <>
              <RotateCcw size={13} aria-hidden />
              Retornar
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving}
          style={{
            flex: 2,
            padding: "12px",
            borderRadius: "10px",
            border: "none",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
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
              <Banknote size={13} aria-hidden />
              Confirmar pagamento
            </>
          )}
        </button>
      </div>
    </ModalBase>
  );
}