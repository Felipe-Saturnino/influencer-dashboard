/**
 * Faixas de status (BOM → MUITO RUIM) para métricas GP na aba KPIs de Mesa — visão individual.
 * Tempos em segundos (como na UI); cooperação em percentual 0–100.
 */

import type { GameIdentityKey } from "./gameIdentityColors";

export type GpKpiStatusFaixa = "bom" | "ok" | "ruim" | "muito_ruim";

export type GpKpiStatusMetrica = "velocidade" | "reacao" | "bola" | "cilindro";

/** Cores semânticas Global — só o ícone. */
export const GP_KPI_STATUS_COR: Record<GpKpiStatusFaixa, string> = {
  bom: "#22c55e",
  ok: "#f59e0b",
  ruim: "#e84025",
  muito_ruim: "#a78bfa",
};

export const GP_KPI_STATUS_LABEL: Record<GpKpiStatusFaixa, string> = {
  bom: "Bom",
  ok: "Ok",
  ruim: "Ruim",
  muito_ruim: "Muito ruim",
};

/** Menor é melhor: BOM se &lt; bomMax; OK até okMax; RUIM até ruimMax; senão MUITO RUIM. */
function statusMenorMelhor(
  valor: number,
  bomMaxExclusivo: number,
  okMaxInclusivo: number,
  ruimMaxInclusivo: number,
): GpKpiStatusFaixa {
  if (valor < bomMaxExclusivo) return "bom";
  if (valor <= okMaxInclusivo) return "ok";
  if (valor <= ruimMaxInclusivo) return "ruim";
  return "muito_ruim";
}

/** Maior é melhor (coop %): BOM se &gt; bomMin; OK se &gt;= okMin; RUIM se &gt;= ruimMin; senão MUITO RUIM. */
function statusMaiorMelhor(
  valor: number,
  bomMinExclusivo: number,
  okMinInclusivo: number,
  ruimMinInclusivo: number,
): GpKpiStatusFaixa {
  if (valor > bomMinExclusivo) return "bom";
  if (valor >= okMinInclusivo) return "ok";
  if (valor >= ruimMinInclusivo) return "ruim";
  return "muito_ruim";
}

/**
 * Classifica a métrica do jogo. `null` se sem valor ou combinação sem faixa (ex.: Bola fora da Roleta).
 * `segundos` = média em s (Velocidade/Reação); `pct` = 0–100 (Bola/Cilindro).
 */
export function classificarGpKpiStatus(
  jogoKey: GameIdentityKey,
  metrica: GpKpiStatusMetrica,
  valor: number | null,
): GpKpiStatusFaixa | null {
  if (valor == null || !Number.isFinite(valor)) return null;

  if (metrica === "velocidade" || metrica === "reacao") {
    if (jogoKey === "blackjack") {
      return metrica === "velocidade"
        ? statusMenorMelhor(valor, 1, 1.35, 1.99)
        : statusMenorMelhor(valor, 2.2, 2.99, 3.99);
    }
    if (jogoKey === "baccarat" || jogoKey === "futebol_brasileiro") {
      return metrica === "velocidade"
        ? statusMenorMelhor(valor, 4, 4.99, 5.99)
        : statusMenorMelhor(valor, 3, 3.99, 4.99);
    }
    return null;
  }

  if (jogoKey !== "roleta") return null;
  if (metrica === "cilindro") return statusMaiorMelhor(valor, 70, 61, 56);
  if (metrica === "bola") return statusMaiorMelhor(valor, 80, 70, 61);
  return null;
}
