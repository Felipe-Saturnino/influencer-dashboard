import { BoasVindasHome } from "../shared/BoasVindasHome";

const SUBTITULO_SERVICE_MANAGER =
  "Você garante que cada jogo aconteça com confiança.\nSeu turno, a operação e o que precisa de ação — primeiro.";

export function BoasVindasServiceManager({ nome }: { nome: string }) {
  return <BoasVindasHome nome={nome} subtitulo={SUBTITULO_SERVICE_MANAGER} />;
}
