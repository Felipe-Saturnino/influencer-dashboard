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

export function ModalBloqueioSolicitacaoCampanha({
  tipo,
  onClose,
}: {
  tipo: "perfil" | "playbook";
  onClose: () => void;
}) {
  const { theme: t, setActivePage } = useApp();
  const brand = useDashboardBrand();
  const texto = tipo === "perfil"
    ? "Para solicitar valores para a Campanha promocional você precisa concluir o cadastro na página de Influencers. Qualquer solicitação permanece bloqueada até a conclusão do cadastro."
    : "Para solicitar valores para a Campanha promocional você precisa ler e dar ciência nos termos do Playbook. Qualquer solicitação permanece bloqueada até que essa ciência seja registrada.";

  function irResolver() {
    onClose();
    setActivePage(tipo === "perfil" ? "influencers" : "playbook_influencers");
  }

  return (
    <ModalBase onClose={onClose} maxWidth={460} zIndex={1100}>
      <ModalHeader title="Solicitação indisponível" onClose={onClose} />
      <p style={{ margin: "0 0 22px", fontSize: 14, color: t.text, fontFamily: FONT.body, lineHeight: 1.55 }}>
        {texto}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1, minWidth: 120, padding: 12, borderRadius: 10, border: `1px solid ${t.cardBorder}`,
            background: t.inputBg, color: t.textMuted, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer",
          }}
        >
          Fechar
        </button>
        <button
          type="button"
          onClick={irResolver}
          style={{
            flex: 2, minWidth: 180, padding: 12, borderRadius: 10, border: "none", fontWeight: 700, fontFamily: FONT.body, cursor: "pointer",
            background: brand.useBrand ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" : `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
            color: "#fff",
          }}
        >
          {tipo === "perfil" ? "Ir para Influencers" : "Ir para Playbook"}
        </button>
      </div>
    </ModalBase>
  );
}
