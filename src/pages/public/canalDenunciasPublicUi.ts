import { type CSSProperties } from "react";
import { FONT } from "../../constants/theme";
import type { CanalDenunciaMensagemPublica } from "../../lib/canalDenunciasSpin";

export const UPLOAD_CONCURRENCY = 3;

export type ConsultaPublicOk = {
  ok: true;
  status: string;
  relatado_em: string;
  em_avaliacao_em: string | null;
  atendida_em: string | null;
  descricao_resolucao: string | null;
  mensagens?: CanalDenunciaMensagemPublica[];
};

export const PANEL_BOX_STYLE: CSSProperties = {
  border: "1px solid rgba(124,58,237,0.35)",
  borderRadius: 16,
  padding: "clamp(18px, 4vw, 28px)",
  background: "rgba(15,15,26,0.88)",
};

export const UPLOAD_THEME = {
  text: "#e5dce1",
  textMuted: "#9b8ab8",
  cardBorder: "rgba(255,255,255,0.12)",
  inputBg: "rgba(0,0,0,0.25)",
};

export const inp: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.25)",
  color: "#fff",
  fontSize: 16,
  fontFamily: FONT.body,
};

export const alertBox: CSSProperties = {
  padding: "12px 14px",
  borderRadius: 10,
  background: "rgba(232,64,37,0.12)",
  border: "1px solid rgba(232,64,37,0.35)",
  color: "#e84025",
  fontSize: 13,
};

export function fmtDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}
