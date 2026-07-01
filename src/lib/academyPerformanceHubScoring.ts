import type {
  PerformanceHubMesaTipo,
  PerformanceHubScoringConfig,
} from "./academyPerformanceHubTypes";

export const ESCALA_NOTA_MAX = 10;

export const PERFORMANCE_HUB_SCORING_DEFAULT: PerformanceHubScoringConfig = {
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
      { slug: "dealer_change", label: "Pontualidade nas trocas (Dealer Change)", peso: 1, mesaTipo: null },
      { slug: "procedimentos_mesa", label: "Procedimentos à mesa", peso: 1.5, mesaTipo: null },
      { slug: "recolhimento_cartas", label: "Recolhimento de cartas", peso: 1, mesaTipo: "cartas" },
      { slug: "regras_jogos", label: "Regras dos jogos", peso: 1.5, mesaTipo: null },
      { slug: "tecnica_giro", label: "Técnica de giro (roleta)", peso: 1.5, mesaTipo: "roleta" },
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

export function formatNotaPerformanceHub(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) return "—";
  return Number(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function criteriosMesaPorTipo(
  config: PerformanceHubScoringConfig,
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

export function calcularNotaTotal(
  notasDim: {
    comunicacao: number | null;
    mesa: number | null;
    imagem: number | null;
  },
  config: PerformanceHubScoringConfig,
): number | null {
  let soma = 0;
  let pesoTotal = 0;
  const dims: (keyof typeof notasDim)[] = ["comunicacao", "mesa", "imagem"];
  for (const key of dims) {
    const nota = notasDim[key];
    if (nota == null || Number.isNaN(nota)) continue;
    soma += nota * config[key].pesoDimensao;
    pesoTotal += config[key].pesoDimensao;
  }
  if (pesoTotal === 0) return null;
  return soma / pesoTotal;
}
