import { BoasVindasHome } from "../shared/BoasVindasHome";

const SUBTITULO_TECH_OPS =
  "Você mantém a operação técnica do estúdio funcionando com precisão.\nSeu trabalho garante equipamentos, infraestrutura e suporte em tempo real para que cada transmissão aconteça com qualidade. Esta plataforma foi criada para apoiar sua rotina e fortalecer quem cuida da base técnica por trás dos jogos.";

export function BoasVindasTechOps({ nome }: { nome: string }) {
  return <BoasVindasHome nome={nome} subtitulo={SUBTITULO_TECH_OPS} />;
}
