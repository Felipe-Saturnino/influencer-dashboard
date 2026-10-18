import { BoasVindasHome } from "../shared/BoasVindasHome";

const SUBTITULO_SHIFT_LEADER =
  "Você mantém a operação em movimento.\nSeu turno, o time e o que precisa de cobertura — primeiro.";

export function BoasVindasShiftLeader({ nome }: { nome: string }) {
  return <BoasVindasHome nome={nome} subtitulo={SUBTITULO_SHIFT_LEADER} />;
}
