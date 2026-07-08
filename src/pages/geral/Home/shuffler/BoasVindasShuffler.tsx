import { BoasVindasHome } from "../shared/BoasVindasHome";

const SUBTITULO_SHUFFLER =
  "Você garante precisão e ritmo em cada rodada.\nSeu trabalho mantém a fluidez do jogo e a confiança na operação da mesa. Esta plataforma foi criada para apoiar sua rotina e fortalecer quem cuida dos procedimentos no estúdio.";

export function BoasVindasShuffler({ nome }: { nome: string }) {
  return <BoasVindasHome nome={nome} subtitulo={SUBTITULO_SHUFFLER} />;
}
