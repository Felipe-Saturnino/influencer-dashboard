import { BoasVindasHome } from "../shared/BoasVindasHome";

const SUBTITULO_COMUNICACAO =
  "Você transforma ideias em experiências.\nCada vídeo, imagem e conteúdo criado por você fortalece a marca Spin Gaming e conecta nossos públicos com a qualidade da nossa operação. Esta plataforma foi criada para apoiar sua rotina e impulsionar a criatividade que move nossos projetos.";

export function BoasVindasComunicacao({ nome }: { nome: string }) {
  return <BoasVindasHome nome={nome} subtitulo={SUBTITULO_COMUNICACAO} />;
}
