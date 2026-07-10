import { BoasVindasHome } from "../shared/BoasVindasHome";

/** Baseline Prestador — personalizar depois. */
const SUBTITULO_RH =
  "Cada turno faz a diferença. Cada pessoa também.\nVocê é parte essencial da experiência que entregamos aos jogadores. Aqui você encontra as ferramentas, informações e oportunidades para acompanhar sua jornada com mais praticidade e transparência.";

export function BoasVindasRh({ nome }: { nome: string }) {
  return <BoasVindasHome nome={nome} subtitulo={SUBTITULO_RH} />;
}
