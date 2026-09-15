import { BoasVindasHome } from "../shared/BoasVindasHome";

const SUBTITULO_GAME_PRESENTER =
  "Você conduz a mesa com energia e presença.\nSeu próximo turno, trocas e Academy — o que precisa de ação, primeiro.";

export function BoasVindasGamePresenter({ nome }: { nome: string }) {
  return <BoasVindasHome nome={nome} subtitulo={SUBTITULO_GAME_PRESENTER} />;
}
