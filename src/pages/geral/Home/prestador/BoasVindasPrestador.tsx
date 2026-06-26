import { BoasVindasHome } from "../shared/BoasVindasHome";

const SUBTITULO_PRESTADOR =
  "Cada turno faz a diferença. Cada pessoa também.\nVocê é parte essencial da experiência que entregamos aos jogadores. Aqui você encontra as ferramentas, informações e oportunidades para acompanhar sua jornada com mais praticidade e transparência.";

export function BoasVindasPrestador({ nome }: { nome: string }) {
  return <BoasVindasHome nome={nome} subtitulo={SUBTITULO_PRESTADOR} />;
}
