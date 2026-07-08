import { BoasVindasHome } from "../shared/BoasVindasHome";

const SUBTITULO_GAME_PRESENTER =
  "Você conduz a mesa com energia e presença.\nSeu trabalho transforma cada transmissão em uma experiência envolvente para o jogador. Esta plataforma foi criada para apoiar sua rotina e fortalecer quem está no centro do jogo ao vivo.";

export function BoasVindasGamePresenter({ nome }: { nome: string }) {
  return <BoasVindasHome nome={nome} subtitulo={SUBTITULO_GAME_PRESENTER} />;
}
