import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { X } from "lucide-react";
import { GiFilmProjector } from "react-icons/gi";

const BRAND = {
  roxo: "#4a2082",
  azul: "#1e36f8",
  vermelho: "#e84025",
} as const;

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
        style={{
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 20,
          padding: 28,
          width: "100%",
          maxWidth: 440,
          boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `${BRAND.vermelho}18`,
                border: `1px solid ${BRAND.vermelho}40`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: BRAND.vermelho,
                flexShrink: 0,
              }}
            >
              <GiFilmProjector size={18} />
            </span>
            <h2
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
                background: `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`,
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
                border: `1px solid ${BRAND.azul}`,
                cursor: "pointer",
                background: `${BRAND.azul}14`,
                color: BRAND.azul,
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
