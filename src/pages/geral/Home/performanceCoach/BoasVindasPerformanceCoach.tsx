import { BoasVindasHome } from "../shared/BoasVindasHome";

const SUBTITULO_PERFORMANCE_COACH =
  "Você transforma desempenho em excelência.\nSeu trabalho desenvolve pessoas, fortalece a qualidade da operação e garante que cada experiência entregue aos jogadores esteja alinhada aos padrões da Spin Gaming. Esta plataforma foi criada para apoiar sua rotina e potencializar esse impacto.";

export function BoasVindasPerformanceCoach({ nome }: { nome: string }) {
  return <BoasVindasHome nome={nome} subtitulo={SUBTITULO_PERFORMANCE_COACH} />;
}
