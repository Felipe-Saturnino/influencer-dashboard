import { supabase } from "./supabase";
import type {
  PerformanceHubDimensaoConfig,
  PerformanceHubScoringPorTime,
  PerformanceHubTimeSlug,
} from "./academyPerformanceHubTypes";
import { cloneScoringPorTime } from "./academyPerformanceHubScoring";

type ScoringConfigRow = {
  time_slug: PerformanceHubTimeSlug;
  config: unknown;
};

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pesoValido(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10;
}

/**
 * Aplica somente pesos persistidos sobre o catálogo atual.
 * Labels, critérios novos e critérios removidos continuam definidos pelo código.
 */
function aplicarPesosPersistidos(
  base: Record<string, PerformanceHubDimensaoConfig>,
  raw: unknown,
): Record<string, PerformanceHubDimensaoConfig> {
  if (!isJsonObject(raw)) return base;

  const next = structuredClone(base);
  for (const [dimKey, dimensaoBase] of Object.entries(next)) {
    const dimensaoRaw = raw[dimKey];
    if (!isJsonObject(dimensaoRaw)) continue;

    if (pesoValido(dimensaoRaw.pesoDimensao)) {
      dimensaoBase.pesoDimensao = dimensaoRaw.pesoDimensao;
    }

    const criteriosRaw = Array.isArray(dimensaoRaw.criterios) ? dimensaoRaw.criterios : [];
    const pesosPorSlug = new Map<string, number>();
    for (const criterioRaw of criteriosRaw) {
      if (!isJsonObject(criterioRaw)) continue;
      if (typeof criterioRaw.slug !== "string" || !pesoValido(criterioRaw.peso)) continue;
      pesosPorSlug.set(criterioRaw.slug, criterioRaw.peso);
    }

    dimensaoBase.criterios = dimensaoBase.criterios.map((criterio) => {
      const peso = pesosPorSlug.get(criterio.slug);
      return peso == null ? criterio : { ...criterio, peso };
    });
  }
  return next;
}

export async function fetchPerformanceHubScoringConfig(): Promise<{
  config: PerformanceHubScoringPorTime;
  error: string | null;
}> {
  const defaults = cloneScoringPorTime();
  const { data, error } = await supabase
    .from("academy_performance_hub_scoring_config")
    .select("time_slug, config");

  if (error) {
    console.error("Performance Hub: falha ao carregar configuração de pesos", error);
    return {
      config: defaults,
      error: "Não foi possível carregar os pesos salvos. Se o problema persistir, entre em contato com o suporte.",
    };
  }

  for (const row of (data ?? []) as ScoringConfigRow[]) {
    if (row.time_slug === "game_presenter") {
      defaults.game_presenter = aplicarPesosPersistidos(
        defaults.game_presenter,
        row.config,
      ) as PerformanceHubScoringPorTime["game_presenter"];
    } else if (row.time_slug === "shuffler") {
      defaults.shuffler = aplicarPesosPersistidos(
        defaults.shuffler,
        row.config,
      ) as PerformanceHubScoringPorTime["shuffler"];
    }
  }

  return { config: defaults, error: null };
}

export async function salvarPerformanceHubScoringConfig(
  time: PerformanceHubTimeSlug,
  config: Record<string, PerformanceHubDimensaoConfig>,
): Promise<string | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    console.error("Performance Hub: usuário indisponível ao salvar pesos", authError);
    return "Não foi possível identificar o usuário. Atualize a página e tente novamente.";
  }

  const { error } = await supabase
    .from("academy_performance_hub_scoring_config")
    .upsert(
      {
        time_slug: time,
        config,
        updated_by: authData.user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "time_slug" },
    );

  if (error) {
    console.error("Performance Hub: falha ao salvar configuração de pesos", error);
    return "Não foi possível salvar os pesos. Se o problema persistir, entre em contato com o suporte.";
  }
  return null;
}
