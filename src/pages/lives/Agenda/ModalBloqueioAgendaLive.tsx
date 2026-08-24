import { useEffect, useRef } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { BRAND, FONT_TITLE } from "../../../lib/dashboardConstants";
import { X, AlertCircle } from "lucide-react";

export type ModalBloqueioAgendaContexto = "agenda" | "agenda_acesso" | "emitir_link";

const TEXTO_POR_CONTEXTO: Record<
  ModalBloqueioAgendaContexto,
  { titulo: string; introSegunda: string; introTerceira: string }
> = {
  agenda: {
    titulo: "Agendamento indisponível",
    introSegunda: "Para agendar uma live na agenda, você precisa:",
    introTerceira: "Não é possível agendar live para este influencer até que:",
  },
  agenda_acesso: {
    titulo: "Agenda indisponível",
    introSegunda: "Para usar a Agenda, você precisa:",
    introTerceira: "Não é possível usar a Agenda para este influencer até que:",
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
  /** Consulta de pré-requisitos falhou — bloqueio conservador. */
  erroVerificacao?: boolean;
  /** true: "você precisa..."; false: "O influencer precisa..." */
  segundaPessoa: boolean;
  /** Agenda (padrão) ou Links e Materiais — ajusta título e introdução; itens da lista iguais. */
  contexto?: ModalBloqueioAgendaContexto;
  /** Sem overlay nem botão fechar — bloco fixo na página (gate de acesso do influencer). */
  embedded?: boolean;
  onIrInfluencers: () => void;
  onIrPlaybook: () => void;
  onTentarNovamente?: () => void;
}

export default function ModalBloqueioAgendaLive({
  open,
  onClose,
  perfilIncompleto,
  faltaPlaybook,
  erroVerificacao = false,
  segundaPessoa,
  contexto = "agenda",
  embedded = false,
  onIrInfluencers,
  onIrPlaybook,
  onTentarNovamente,
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

  const panel = (
    <div
      ref={panelRef}
      tabIndex={-1}
      role={embedded ? "region" : "dialog"}
      aria-modal={embedded ? undefined : true}
      aria-labelledby="modal-bloqueio-agenda-title"
      style={{
        background: t.cardBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 20,
        padding: "clamp(16px, 4vw, 28px)",
        width: "100%",
        maxWidth: embedded ? undefined : 440,
        boxShadow: embedded ? undefined : "0 16px 48px rgba(0,0,0,0.35)",
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
        {!embedded ? (
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: t.text,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 4,
              flexShrink: 0,
            }}
            aria-label="Fechar modal"
            title="Fechar modal"
          >
            <X size={22} strokeWidth={2.75} aria-hidden="true" />
          </button>
        ) : null}
      </div>

        <p style={{ fontSize: 14, color: t.text, fontFamily: FONT.body, margin: "0 0 14px", lineHeight: 1.5 }}>
          {erroVerificacao
            ? "Não foi possível verificar seus pré-requisitos agora. Tente novamente em instantes."
            : intro}
        </p>
        {!erroVerificacao ? (
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
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {erroVerificacao && onTentarNovamente ? (
            <button
              type="button"
              onClick={onTentarNovamente}
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                background: brand.useBrand
                  ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
                  : "linear-gradient(135deg, #4a2082, #1e36f8)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: FONT.body,
              }}
            >
              Tentar de novo
            </button>
          ) : null}
          {!erroVerificacao && perfilIncompleto && (
            <button
              type="button"
              onClick={onIrInfluencers}
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                background: brand.useBrand
                  ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
                  : "linear-gradient(135deg, #4a2082, #1e36f8)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: FONT.body,
              }}
            >
              Ir para Influencers
            </button>
          )}
          {!erroVerificacao && faltaPlaybook && (
            <button
              type="button"
              onClick={onIrPlaybook}
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                border: "1px solid var(--brand-secondary, #1e36f8)",
                cursor: "pointer",
                background: "color-mix(in srgb, var(--brand-secondary, #1e36f8) 12%, transparent)",
                color: "var(--brand-secondary, #1e36f8)",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: FONT.body,
              }}
            >
              Ir para Playbook Influencers
            </button>
          )}
          {!embedded ? (
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
          ) : null}
        </div>
    </div>
  );

  if (embedded) return panel;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: 20,
      }}
    >
      {panel}
    </div>
  );
}
