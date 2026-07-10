import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";

export type CsInstagramComposerVariant = "dm" | "comentario" | "atender";

const HINT: Record<CsInstagramComposerVariant, string> = {
  dm: "Na Fase 2, a resposta aparecerá na conversa acima e no app Instagram. Fora da janela de 24h, o envio fica bloqueado até nova mensagem do usuário.",
  comentario: "Comentários usam fluxo distinto de DM: resposta pública no post, sem janela de 24h da mensagem privada.",
  atender: "Opcional na Fase 2 — enviar resposta junto com a alteração de status.",
};

const PLACEHOLDER: Record<CsInstagramComposerVariant, string> = {
  dm: "Resposta enviada diretamente para a DM do usuário…",
  comentario: "Resposta pública ao comentário…",
  atender: "Opcional na Fase 2 — enviar resposta junto com a alteração de status…",
};

const LABEL: Record<CsInstagramComposerVariant, string> = {
  dm: "Responder no Instagram",
  comentario: "Responder no Instagram",
  atender: "Resposta no Instagram",
};

export function CsChamadoInstagramComposerBloco({ variant, t }: { variant: CsInstagramComposerVariant; t: Theme }) {
  return (
    <div
      style={{
        marginTop: 16,
        padding: "14px 16px",
        borderRadius: 10,
        border: `1px dashed ${t.cardBorder}`,
        background: t.inputBg,
        opacity: 0.85,
      }}
      aria-disabled="true"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
          fontFamily: FONT.body,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{LABEL[variant]}</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 6,
            background: "rgba(225,48,140,0.12)",
            color: "#e1306c",
            border: "1px solid rgba(225,48,140,0.25)",
          }}
        >
          Fase 2
        </span>
      </div>
      <textarea
        disabled
        aria-label={LABEL[variant]}
        placeholder={PLACEHOLDER[variant]}
        style={{
          width: "100%",
          minHeight: 72,
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px solid ${t.cardBorder}`,
          background: t.cardBg,
          color: t.textMuted,
          fontFamily: FONT.body,
          fontSize: 13,
          resize: "vertical",
          boxSizing: "border-box",
          cursor: "not-allowed",
        }}
      />
      <p style={{ margin: "8px 0 0", fontSize: 11, color: t.textMuted, lineHeight: 1.45, fontFamily: FONT.body }}>
        {HINT[variant]}
      </p>
    </div>
  );
}
