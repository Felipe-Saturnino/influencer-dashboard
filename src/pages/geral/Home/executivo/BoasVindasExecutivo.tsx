import { BoasVindasHome } from "../shared/BoasVindasHome";

const SUBTITULO_EXECUTIVO =
  "O panorama completo da Spin na sua tela.\nPerformance, operações e inteligência de dados para quem define onde a empresa vai.";

export function BoasVindasExecutivo({ nome }: { nome: string }) {
  return <BoasVindasHome nome={nome} subtitulo={SUBTITULO_EXECUTIVO} />;
}
