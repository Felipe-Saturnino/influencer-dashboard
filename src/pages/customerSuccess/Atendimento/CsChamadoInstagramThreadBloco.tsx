import { Loader2 } from "lucide-react";
import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import { fmtDataChamado } from "../../../lib/csAtendimentoConstants";
import type { CsChamadoMensagemRow } from "../../../types/csAtendimento";

export function CsChamadoInstagramThreadBloco({
  mensagens,
  loading,
  t,
}: {
  mensagens: CsChamadoMensagemRow[];
  loading: boolean;
  t: Theme;
}) {
  if (loading) {
    return (
      <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        <Loader2 className="app-lucide-spin" size={20} color="var(--brand-primary, #7c3aed)" aria-hidden />
        <div style={{ fontSize: 13, marginTop: 8 }}>Carregando…</div>
      </div>
    );
  }

  if (mensagens.length === 0) {
    return (
      <div style={{ padding: "20px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
        Nenhuma mensagem na conversa.
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxHeight: 320,
        overflowY: "auto",
        padding: "12px 0",
      }}
    >
      {mensagens.map((msg) => {
        const inbound = msg.direcao === "inbound";
        const sistema = msg.direcao === "sistema";
        const align = inbound ? "flex-start" : "flex-end";
        const bg = sistema
          ? t.inputBg
          : inbound
            ? t.inputBg
            : "color-mix(in srgb, var(--brand-primary, #7c3aed) 12%, transparent)";
        const border = sistema ? `1px dashed ${t.cardBorder}` : `1px solid ${t.cardBorder}`;

        return (
          <div key={msg.id} style={{ display: "flex", justifyContent: align }}>
            <div
              style={{
                maxWidth: "85%",
                padding: "10px 12px",
                borderRadius: 12,
                background: bg,
                border,
                fontFamily: FONT.body,
              }}
            >
              {sistema ? (
                <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 4 }}>Sistema</div>
              ) : null}
              {msg.texto?.trim() ? (
                <div style={{ fontSize: 13, color: t.text, whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{msg.texto}</div>
              ) : msg.midia_url ? (
                <div style={{ fontSize: 12, color: t.textMuted }}>Mídia anexada</div>
              ) : (
                <div style={{ fontSize: 12, color: t.textMuted }}>—</div>
              )}
              <div style={{ fontSize: 10, color: t.textMuted, marginTop: 6 }}>{fmtDataChamado(msg.created_at)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
