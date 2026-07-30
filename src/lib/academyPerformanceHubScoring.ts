import type {
  PerformanceHubMesaTipo,
  PerformanceHubScoringConfigGamePresenter,
  PerformanceHubScoringConfigShuffler,
  PerformanceHubScoringPorTime,
  PerformanceHubTimeSlug,
  PerformanceHubDimensaoConfig,
} from "./academyPerformanceHubTypes";

export const ESCALA_NOTA_MAX = 10;

export const PERFORMANCE_HUB_SCORING_GAME_PRESENTER: PerformanceHubScoringConfigGamePresenter = {
  comunicacao: {
    label: "Comunicação",
    pesoDimensao: 2,
    criterios: [
      { slug: "anuncio_estatisticas", label: "Anúncio de estatísticas", peso: 1.5 },
      { slug: "boas_vindas", label: "Boas-vindas a novos jogadores", peso: 1 },
      { slug: "comentarios_jogo", label: "Comentários sobre o jogo", peso: 1.5 },
      { slug: "parabens_vitorias", label: "Parabéns a vitórias", peso: 1 },
      { slug: "sorriso", label: "Sorriso", peso: 1.5 },
      { slug: "volume_voz", label: "Volume da voz", peso: 1 },
    ],
  },
  mesa: {
    label: "Mesa",
    pesoDimensao: 2,
    criterios: [
      { slug: "abrir_fechar", label: "Abrir e fechar o jogo", peso: 1, mesaTipo: null },
      { slug: "contato_camera", label: "Contato com a câmera", peso: 1.5, mesaTipo: null },
      { slug: "distribuicao_cartas", label: "Distribuição de cartas", peso: 1.5, mesaTipo: "cartas" },
      { slug: "gestos_jogo", label: "Gestos relacionados ao jogo", peso: 1.5, mesaTipo: null },
      { slug: "procedimentos_mesa", label: "Procedimentos à mesa", peso: 1.5, mesaTipo: null },
      { slug: "recolhimento_cartas", label: "Recolhimento de cartas", peso: 1, mesaTipo: "cartas" },
      { slug: "regras_jogos", label: "Regras dos jogos", peso: 1.5, mesaTipo: null },
      { slug: "tecnica_giro", label: "Técnica de giro", peso: 1.5, mesaTipo: "roleta" },
      { slug: "uso_id", label: "Uso de ID", peso: 1, mesaTipo: null },
      { slug: "velocidade", label: "Velocidade", peso: 1, mesaTipo: null },
    ],
  },
  imagem: {
    label: "Imagem",
    pesoDimensao: 1,
    criterios: [
      { slug: "acessorios", label: "Acessórios", peso: 2 },
      { slug: "cabelo", label: "Cabelo", peso: 1 },
      { slug: "maquiagem", label: "Maquiagem", peso: 1 },
      { slug: "postura", label: "Postura", peso: 1 },
      { slug: "tatuagens", label: "Tatuagens", peso: 1 },
      { slug: "unhas", label: "Unhas", peso: 2 },
      { slug: "uniforme", label: "Uniforme", peso: 2 },
    ],
  },
};

export const PERFORMANCE_HUB_SCORING_SHUFFLER: PerformanceHubScoringConfigShuffler = {
  comunicacao: {
    label: "Comunicação",
    pesoDimensao: 1,
    criterios: [
      { slug: "contato_camera", label: "Contato com a Câmera", peso: 1 },
      { slug: "comunicacao_gp", label: "Comunicação com Game Presenter", peso: 1.5 },
    ],
  },
  imagem: {
    label: "Imagem",
    pesoDimensao: 1,
    criterios: [
      { slug: "cabelo", label: "Cabelo", peso: 1 },
      { slug: "maquiagem", label: "Maquiagem", peso: 1 },
      { slug: "unhas", label: "Unhas", peso: 1 },
      { slug: "tatuagens", label: "Tatuagens", peso: 1 },
      { slug: "acessorios", label: "Acessórios", peso: 1 },
      { slug: "uniforme", label: "Uniforme", peso: 1 },
      { slug: "postura", label: "Postura", peso: 1 },
    ],
  },
  procedimentos: {
    label: "Procedimentos",
    pesoDimensao: 2,
    criterios: [
      { slug: "mostra_maos", label: "Mostra das Mãos", peso: 1 },
      { slug: "torres_embaralhamento", label: "Torres de Embaralhamento", peso: 1.5 },
      { slug: "riffles_strips", label: "Riffles e Strips", peso: 1.5 },
      { slug: "procedimento_corte", label: "Procedimento de Corte", peso: 1.5 },
      { slug: "velocidade_embaralhamento", label: "Velocidade de Embaralhamento", peso: 1.5 },
      { slug: "shoe_box", label: "Shoe e Box", peso: 1 },
      { slug: "procedimentos_incidentes", label: "Procedimentos e Incidentes", peso: 1 },
      { slug: "organizacao", label: "Organização", peso: 1 },
    ],
  },
};

export const PERFORMANCE_HUB_SCORING_POR_TIME: PerformanceHubScoringPorTime = {
  game_presenter: PERFORMANCE_HUB_SCORING_GAME_PRESENTER,
  shuffler: PERFORMANCE_HUB_SCORING_SHUFFLER,
};

/** Alias legado — Game Presenter */
export const PERFORMANCE_HUB_SCORING_DEFAULT = PERFORMANCE_HUB_SCORING_GAME_PRESENTER;

export function cloneScoringPorTime(): PerformanceHubScoringPorTime {
  return JSON.parse(JSON.stringify(PERFORMANCE_HUB_SCORING_POR_TIME)) as PerformanceHubScoringPorTime;
}

export function scoringConfigParaTime(
  porTime: PerformanceHubScoringPorTime,
  time: PerformanceHubTimeSlug,
): PerformanceHubScoringConfigGamePresenter | PerformanceHubScoringConfigShuffler {
  return porTime[time];
}

export function formatPesoPerformanceHub(peso: number): string {
  return peso.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatNotaPerformanceHub(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) return "—";
  return Number(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function criteriosMesaPorTipo(
  config: PerformanceHubScoringConfigGamePresenter,
  mesaTipo: PerformanceHubMesaTipo,
) {
  return config.mesa.criterios.filter(
    (c) => c.mesaTipo == null || c.mesaTipo === mesaTipo,
  );
}

export function calcularNotaDimensao(
  pares: { nota: number; peso: number }[],
): number | null {
  let soma = 0;
  let pesoTotal = 0;
  for (const p of pares) {
    if (Number.isNaN(p.nota)) continue;
    soma += p.nota * p.peso;
    pesoTotal += p.peso;
  }
  if (pesoTotal === 0) return null;
  return soma / pesoTotal;
}

export function calcularNotaTotalPorDimensoes(
  notasPorDim: Record<string, number | null>,
  config: Record<string, PerformanceHubDimensaoConfig>,
): number | null {
  let soma = 0;
  let pesoTotal = 0;
  for (const key of Object.keys(config)) {
    const nota = notasPorDim[key];
    if (nota == null || Number.isNaN(nota)) continue;
    soma += nota * config[key]!.pesoDimensao;
    pesoTotal += config[key]!.pesoDimensao;
  }
  if (pesoTotal === 0) return null;
  return soma / pesoTotal;
}

export function calcularNotaTotalGamePresenter(
  notasDim: {
    comunicacao: number | null;
    mesa: number | null;
    imagem: number | null;
  },
  config: PerformanceHubScoringConfigGamePresenter,
): number | null {
  return calcularNotaTotalPorDimensoes(notasDim, config);
}

export function calcularNotaTotalShuffler(
  notasDim: {
    comunicacao: number | null;
    procedimentos: number | null;
    imagem: number | null;
  },
  config: PerformanceHubScoringConfigShuffler,
): number | null {
  return calcularNotaTotalPorDimensoes(notasDim, config);
}

/** @deprecated Use calcularNotaTotalGamePresenter */
export function calcularNotaTotal(
  notasDim: {
    comunicacao: number | null;
    mesa: number | null;
    imagem: number | null;
  },
  config: PerformanceHubScoringConfigGamePresenter,
): number | null {
  return calcularNotaTotalGamePresenter(notasDim, config);
}

export function notaTerceiraDimensaoAvaliacao(
  row: { time: PerformanceHubTimeSlug; notaMesa: number | null; notaProcedimentos: number | null },
): number | null {
  return row.time === "shuffler" ? row.notaProcedimentos : row.notaMesa;
}

export function labelTerceiraDimensaoTime(time: PerformanceHubTimeSlug): string {
  return time === "shuffler" ? "Procedimentos" : "Mesa";
}
