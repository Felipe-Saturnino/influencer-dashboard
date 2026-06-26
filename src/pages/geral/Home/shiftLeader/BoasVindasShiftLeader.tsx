import { BoasVindasHome } from "../shared/BoasVindasHome";

const SUBTITULO_SHIFT_LEADER =
  "Você mantém a operação em movimento.\nCada decisão, ajuste de escala e acompanhamento da equipe garante que nossas mesas permaneçam ativas e que a experiência dos jogadores aconteça sem interrupções. Esta plataforma foi criada para apoiar sua rotina e fortalecer quem lidera a operação todos os dias.";

export function BoasVindasShiftLeader({ nome }: { nome: string }) {
  return <BoasVindasHome nome={nome} subtitulo={SUBTITULO_SHIFT_LEADER} />;
}
