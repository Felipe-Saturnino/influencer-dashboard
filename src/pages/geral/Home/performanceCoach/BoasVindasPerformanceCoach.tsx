import { BoasVindasHome } from "../shared/BoasVindasHome";

const SUBTITULO_PERFORMANCE_COACH =
  "Você transforma desempenho em excelência.\nAvaliações, feedbacks e Academy — o que precisa de ação, primeiro.";

export function BoasVindasPerformanceCoach({ nome }: { nome: string }) {
  return <BoasVindasHome nome={nome} subtitulo={SUBTITULO_PERFORMANCE_COACH} />;
}
