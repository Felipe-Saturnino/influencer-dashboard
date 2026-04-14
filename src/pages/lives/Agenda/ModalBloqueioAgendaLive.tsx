import { useEffect, useRef } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { BRAND, FONT_TITLE } from "../../../lib/dashboardConstants";
import { X, AlertCircle } from "lucide-react";

export type ModalBloqueioAgendaContexto = "agenda" | "emitir_link";

const TEXTO_POR_CONTEXTO: Record<
  ModalBloqueioAgendaContexto,
  { titulo: string; introSegunda: string; introTerceira: string }
> = {
  agenda: {
    titulo: "Agendamento indisponível",
    introSegunda: "Para agendar uma live na agenda, você precisa:",
    introTerceira: "Não é possível agendar live para este influencer até que:",
  },
  emitir_link: {
    titulo: "Emissão de link indisponível",
    introSegunda: "Para emitir o link de rastreamento, você precisa:",
    introTerceira: "Não é possível emitir o link para este influencer até que:",
  },
};

interface Props {
  open: boolean;
  onClose: () => void;
  perfilIncompleto: boolean;
  faltaPlaybook: boolean;
  /** true: "você precisa..."; false: "O influencer precisa..." */
  segundaPessoa: boolean;
  /** Agenda (padrão) ou Links e Materiais — ajusta título e introdução; itens da lista iguais. */
  contexto?: ModalBloqueioAgendaContexto;
  onIrInfluencers: () => void;
  onIrPlaybook: () => void;
}

export default function ModalBloqueioAgendaLive({
  open,
  onClose,
  perfilIncompleto,
  faltaPlaybook,
  segundaPessoa,
  contexto = "agenda",
  onIrInfluencers,
  onIrPlaybook,
}: Props) {
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

  const copy = TEXTO_POR_CONTEXTO[contexto];
  const intro = segundaPessoa ? copy.introSegunda : copy.introTerceira;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#00000088",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: 20,
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-bloqueio-agenda-title"
        style={{
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 20,
          padding: "clamp(16px, 4vw, 28px)",
          width: "100%",
          maxWidth: 440,
          boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
          outline: "none",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: brand.primaryIconBg,
                border: brand.primaryIconBorder,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <AlertCircle size={18} color={BRAND.vermelho} aria-hidden="true" />
            </span>
            <h2
              id="modal-bloqueio-agenda-title"
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 800,
                color: t.text,
                fontFamily: FONT_TITLE,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                lineHeight: 1.3,
              }}
            >
              {copy.titulo}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: t.textMuted,
              display: "flex",
              alignItems: "center",
              padding: 4,
            }}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: 14, color: t.text, fontFamily: FONT.body, margin: "0 0 14px", lineHeight: 1.5 }}>
          {intro}
        </p>
        <ul style={{ margin: "0 0 20px", paddingLeft: 20, color: t.text, fontFamily: FONT.body, fontSize: 13, lineHeight: 1.65 }}>
          {perfilIncompleto && (
            <li>
              {segundaPessoa
                ? "Concluir seu cadastro na página Influencers (dados obrigatórios)."
                : "O influencer conclua o cadastro na página Influencers (dados obrigatórios)."}
            </li>
          )}
          {faltaPlaybook && (
            <li>
              {segundaPessoa
                ? "Ler e registrar ciência nos termos obrigatórios do Playbook Influencers."
                : "O influencer leia e registre ciência nos termos obrigatórios do Playbook Influencers."}
            </li>
          )}
        </ul>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {perfilIncompleto && (
            <button
              type="button"
              onClick={onIrInfluencers}
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                background: brand.useBrand ? "var(--brand-accent)" : "linear-gradient(135deg, var(--brand-secondary, #4a2082), var(--brand-accent, #1e36f8))",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: FONT.body,
              }}
            >
              Ir para Influencers
            </button>
          )}
          {faltaPlaybook && (
            <button
              type="button"
              onClick={onIrPlaybook}
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                border: `1px solid var(--brand-accent, ${BRAND.azul})`,
                cursor: "pointer",
                background: `color-mix(in srgb, var(--brand-accent, ${BRAND.azul}) 14%, transparent)`,
                color: "var(--brand-accent, #1e36f8)",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: FONT.body,
              }}
            >
              Ir para Playbook Influencers
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              cursor: "pointer",
              background: t.inputBg ?? t.cardBg,
              color: t.textMuted,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: FONT.body,
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
