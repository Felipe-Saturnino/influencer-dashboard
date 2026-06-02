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

export function ModalConfirmLiberar({
  idOperadora,
  onCancel,
  onSeguir,
  loading,
}: {
  idOperadora: string;
  onCancel: () => void;
  onSeguir: () => void;
  loading?: boolean;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const idTxt = (idOperadora ?? "").trim() || "—";
  return (
    <ModalBase onClose={onCancel} maxWidth={440}>
      <ModalHeader title="Liberar banca" onClose={onCancel} />
      <p style={{ margin: "0 0 24px", fontSize: 14, color: t.text, fontFamily: FONT.body, lineHeight: 1.5 }}>
        Verifique se a conta <strong style={{ fontFamily: "monospace" }}>{idTxt}</strong> está bloqueada.
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.textMuted, fontWeight: 700, fontFamily: FONT.body, cursor: loading ? "not-allowed" : "pointer" }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSeguir}
          disabled={loading}
          style={{
            flex: 1, padding: 12, borderRadius: 10, border: "none", fontWeight: 700, fontFamily: FONT.body,
            cursor: loading ? "not-allowed" : "pointer",
            background: brand.useBrand ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" : `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
            color: "#fff",
          }}
        >
          {loading ? "Processando..." : "Seguir"}
        </button>
      </div>
    </ModalBase>
  );
}
