import type { CSSProperties, ReactNode } from "react";
import { Building2, Coins, Dices, Signpost } from "lucide-react";
import OperadoraTag from "./OperadoraTag";
import { FONT } from "../constants/theme";

/** Roxo de produto/formato ao vivo — distinto de operadora e de semântica KPI. */
export const PROSPECTO_FLAG_LIVE_CASSINO_COLOR = "#a855f7";

/** Metadado de prospecção (tipo de contato → Origem). */
export const PROSPECTO_FLAG_ORIGEM_COLOR = "#6b7280";

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

export type ProspectoCardFlagsProps = {
  liveCassino?: string | null;
  operadoraNome?: string | null;
  /** Cor primária da operadora (`operadoras.brand_action`) — `OperadoraTag` quando preenchida. */
  operadoraCorPrimaria?: string | null;
  origemLabel?: string | null;
  /** Espaço acima quando há conteúdo anterior no card (ex.: plataformas). */
  marginTop?: number;
};

export function ProspectoCardFlags({
  liveCassino,
  operadoraNome,
  operadoraCorPrimaria,
  origemLabel,
  marginTop = 6,
}: ProspectoCardFlagsProps) {
  const showLiveCassino = liveCassino === "sim";
  const opNome = (operadoraNome ?? "").trim();
  const origem = (origemLabel ?? "").trim();

  if (!showLiveCassino && !opNome && !origem) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop }}>
      {showLiveCassino && (
        <span style={prospectoCardFlagPillFromHex(PROSPECTO_FLAG_LIVE_CASSINO_COLOR)}>
          <Dices size={11} aria-hidden="true" />
          Live Cassino
        </span>
      )}
      {opNome && (
        <OperadoraTag
          label={opNome}
          corPrimaria={operadoraCorPrimaria}
          icon={<Building2 size={11} aria-hidden="true" />}
        />
      )}
      {origem && (
        <span
          style={prospectoCardFlagPillFromHex(PROSPECTO_FLAG_ORIGEM_COLOR)}
          title={`Origem: ${origem}`}
        >
          <Signpost size={11} aria-hidden="true" />
          Origem · {origem}
        </span>
      )}
    </div>
  );
}

export function ProspectoCacheFlag({
  label,
  marginTop = 6,
  icon,
}: {
  label: string;
  marginTop?: number;
  icon?: ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop }}>
      <span style={prospectoCardFlagPillFromHex(PROSPECTO_FLAG_CACHE_COLOR)}>
        {icon ?? <Coins size={11} aria-hidden="true" />}
        {label}
      </span>
    </div>
  );
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
