import type { CSSProperties } from "react";
import { FONT } from "../constants/theme";

/** Roxo de produto/formato ao vivo — distinto de operadora e de semântica KPI. */
export const PROSPECTO_FLAG_LIVE_CASSINO_COLOR = "#a855f7";

/** Metadado de prospecção (tipo de contato → Origem). */
export const PROSPECTO_FLAG_ORIGEM_COLOR = "#6b7280";

/** Usuário que registrou o prospecto na plataforma. */
export const PROSPECTO_FLAG_REGISTRADO_COLOR = "#6366f1";

/** Cachê negociado — tom ouro/âmbar de domínio financeiro (não semântica de alerta). */
export const PROSPECTO_FLAG_CACHE_COLOR = "#b45309";

export function prospectoCardFlagPillFromHex(hex: string): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "3px 10px",
    borderRadius: 20,
    background: `color-mix(in srgb, ${hex} 12%, transparent)`,
    border: `1px solid color-mix(in srgb, ${hex} 28%, transparent)`,
    fontSize: 11,
    fontWeight: 600,
    color: hex,
    fontFamily: FONT.body,
  };
}

/** Resolve rótulo de origem (tipo de contato) a partir do valor persistido. */
export function resolveProspectoOrigemLabel(
  tipoContato: string | null | undefined,
  options: readonly { value: string; label: string }[],
): string | null {
  const v = (tipoContato ?? "").trim();
  if (!v) return null;
  return options.find((o) => o.value === v)?.label ?? v;
}
