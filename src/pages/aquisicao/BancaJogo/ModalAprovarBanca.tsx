import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import { verificarElegibilidadeAgendaLive } from "../../../lib/influencerAgendaGate";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader, ModalConfirmDelete } from "../../../components/OperacoesModal";
import { Loader2 } from "lucide-react";
import type { BancaRowDb, BancaStatus, BancaStatusConta, BancaPerfilMapRow } from "./bancaJogoTypes";
import { STATUS_BANCA } from "./bancaJogoTypes";
import { fmtMoeda, formatarCPFVisivel, mascaraCPF } from "./bancaJogoHelpers";
import type { BlocoFiltros } from "./bancaJogoFiltros";

export function ModalAprovarBanca({
  row,
  userId,
  onClose,
  onSucesso,
}: {
  row: BancaRowDb;
  userId: string;
  onClose: () => void;
  onSucesso: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [valorStr, setValorStr] = useState(String(row.valor));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${t.cardBorder}`,
    background: t.inputBg, color: t.inputText, fontSize: 13, fontFamily: FONT.body, boxSizing: "border-box",
  };
  const valorNum = parseFloat(valorStr.replace(",", ".")) || 0;

  async function handleConfirmar() {
    setErr("");
    if (valorNum <= 0) {
      setErr("Informe um valor maior que zero.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("banca_jogo_solicitacoes").update({
      valor: valorNum,
      status: "aprovado",
      aprovado_em: new Date().toISOString(),
      aprovado_por: userId,
      updated_at: new Date().toISOString(),
    }).eq("id", row.id).eq("status", "solicitado");
    setSaving(false);
    if (error) {
      setErr(error.message ?? "Não foi possível aprovar.");
      return;
    }
    onSucesso();
    onClose();
  }

  return (
    <ModalBase onClose={onClose} maxWidth={440}>
      <ModalHeader title="Aprovar solicitação" onClose={onClose} />
      <p style={{ margin: "0 0 16px", fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
        Ajuste o valor, se necessário, antes de aprovar.
      </p>
      <div>
        <label style={labelStyle}>
          Valor (R$)
          <CampoObrigatorioMark />
        </label>
        <input
          type="number"
          min={0.01}
          step="0.01"
          value={valorStr}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "") { setValorStr(""); return; }
            const n = parseFloat(v.replace(",", "."));
            if (!isNaN(n) && n < 0) return;
            setValorStr(v);
          }}
          style={inputStyle}
        />
      </div>
      {err ? <div style={{ color: "#ef4444", fontSize: 12, marginTop: 12, fontFamily: FONT.body }}>{err}</div> : null}
      <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
        <button
          type="button"
          onClick={onClose}
          style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.textMuted, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleConfirmar}
          disabled={saving || valorNum <= 0}
          style={{
            flex: 2, padding: 12, borderRadius: 10, border: "none", fontWeight: 700, fontFamily: FONT.body,
            cursor: saving || valorNum <= 0 ? "not-allowed" : "pointer", opacity: saving || valorNum <= 0 ? 0.6 : 1,
            background: brand.useBrand ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" : `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
            color: "#fff",
          }}
        >
          {saving ? "Salvando..." : "Confirmar aprovação"}
        </button>
      </div>
    </ModalBase>
  );
}
