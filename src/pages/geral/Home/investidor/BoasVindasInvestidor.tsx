import { BoasVindasHome } from "../shared/BoasVindasHome";

const SUBTITULO_INVESTIDOR =
  "Acesso privilegiado. Parceria real.\nVocê enxerga a operação de onde ela acontece. Dashboards e métricas calibrados com a profundidade de quem faz parte do resultado.";

export function BoasVindasInvestidor({ nome }: { nome: string }) {
  return <BoasVindasHome nome={nome} subtitulo={SUBTITULO_INVESTIDOR} />;
}
