import { BoasVindasHome } from "../shared/BoasVindasHome";

const SUBTITULO_SHUFFLER =
  "Você garante precisão e ritmo em cada rodada.\nSeu próximo turno, trocas e Academy — o que precisa de ação, primeiro.";

export function BoasVindasShuffler({ nome }: { nome: string }) {
  return <BoasVindasHome nome={nome} subtitulo={SUBTITULO_SHUFFLER} />;
}
