import { useEffect, useRef } from "react";
import { AlertCircle, X } from "lucide-react";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { buildAppPath } from "../../../lib/appRoutes";
import {
  MSG_BLOQUEIO_AGENDA_CONTRATO,
  type PersonaBloqueioAgendaCota,
} from "../../../lib/influencerHorasCota";
import { propsBotaoFecharModal } from "../../../lib/iconOnlyButtonA11y";

export default function ModalBloqueioInfluencerInativo({
  open,
  persona,
  onClose,
  onIrInfluencers,
}: {
  open: boolean;
  persona: PersonaBloqueioAgendaCota;
  onClose: () => void;
  onIrInfluencers: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      panelRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  if (!open) return null;

  const hrefInfluencers = buildAppPath("influencers");

  return (
    <div
      className="app-modal-overlay-pad"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-bloqueio-inativo-title"
        style={{
          background: brand.blockBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 20,
          padding: 28,
          width: "100%",
          maxWidth: 440,
          maxHeight: "90dvh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <AlertCircle size={20} color="#f59e0b" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
            <h2
              id="modal-bloqueio-inativo-title"
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 800,
                color: t.text,
                fontFamily: FONT_TITLE,
                letterSpacing: "0.03em",
              }}
            >
              Agendamento indisponível
            </h2>
          </div>
          <button type="button" onClick={onClose} {...propsBotaoFecharModal()} style={{ background: "none", border: "none", cursor: "pointer", color: t.text, display: "flex", padding: 4, flexShrink: 0 }}>
            <X size={22} strokeWidth={2.75} aria-hidden="true" />
          </button>
        </div>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: t.text, fontFamily: FONT.body }}>
          {persona === "contrato" ? (
            MSG_BLOQUEIO_AGENDA_CONTRATO
          ) : (
            <>
              Influencer está com cadastro inativo. Realize a ativação na página{" "}
              <a
                href={hrefInfluencers}
                onClick={(e) => {
                  e.preventDefault();
                  onIrInfluencers();
                }}
                style={{ color: "var(--brand-primary, #7c3aed)", fontWeight: 700, textDecoration: "underline" }}
              >
                Influencers
              </a>{" "}
              para agendar.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
