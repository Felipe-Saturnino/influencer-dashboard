import { BoasVindasHome } from "../shared/BoasVindasHome";

const SUBTITULO_FIGURINO =
  "Você veste a experiência da Spin.\nCada detalhe do figurino contribui para a identidade, a qualidade e o profissionalismo que entregamos aos jogadores. Esta plataforma foi criada para apoiar sua rotina e conectar você a tudo o que precisa para continuar fazendo parte dessa experiência.";

export function BoasVindasFigurino({ nome }: { nome: string }) {
  return <BoasVindasHome nome={nome} subtitulo={SUBTITULO_FIGURINO} />;
}
