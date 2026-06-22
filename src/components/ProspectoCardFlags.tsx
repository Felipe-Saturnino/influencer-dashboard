import type { ReactNode } from "react";
import { Building2, Coins, Dices, Signpost, User } from "lucide-react";
import OperadoraTag from "./OperadoraTag";
import {
  PROSPECTO_FLAG_CACHE_COLOR,
  PROSPECTO_FLAG_LIVE_CASSINO_COLOR,
  PROSPECTO_FLAG_ORIGEM_COLOR,
  PROSPECTO_FLAG_REGISTRADO_COLOR,
  prospectoCardFlagPillFromHex,
} from "../lib/prospectoCardFlagsStyles";

export type ProspectoCardFlagsProps = {
  liveCassino?: string | null;
  operadoraNome?: string | null;
  /** Cor primária da operadora (`operadoras.brand_action`) — `OperadoraTag` quando preenchida. */
  operadoraCorPrimaria?: string | null;
  origemLabel?: string | null;
  /** Nome de quem registrou na plataforma — omitir quando vazio (ex.: site público). */
  registradoPorLabel?: string | null;
  /** Espaço acima quando há conteúdo anterior no card (ex.: plataformas). */
  marginTop?: number;
};

export function ProspectoCardFlags({
  liveCassino,
  operadoraNome,
  operadoraCorPrimaria,
  origemLabel,
  registradoPorLabel,
  marginTop = 6,
}: ProspectoCardFlagsProps) {
  const showLiveCassino = liveCassino === "sim";
  const opNome = (operadoraNome ?? "").trim();
  const origem = (origemLabel ?? "").trim();
  const registrado = (registradoPorLabel ?? "").trim();

  if (!showLiveCassino && !opNome && !origem && !registrado) return null;

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
      {registrado && (
        <span
          style={prospectoCardFlagPillFromHex(PROSPECTO_FLAG_REGISTRADO_COLOR)}
          title={`Registrado por ${registrado}`}
        >
          <User size={11} aria-hidden="true" />
          Registrado · {registrado}
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
