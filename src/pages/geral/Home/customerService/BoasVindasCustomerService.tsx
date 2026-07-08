import { BoasVindasHome } from "../shared/BoasVindasHome";

const SUBTITULO_CUSTOMER_SERVICE =
  "Você representa a Spin com proximidade e clareza.\nSeu trabalho acolhe jogadores, resolve demandas com agilidade e mantém a confiança na experiência de atendimento. Esta plataforma foi criada para apoiar sua rotina e fortalecer quem cuida de cada contato.";

export function BoasVindasCustomerService({ nome }: { nome: string }) {
  return <BoasVindasHome nome={nome} subtitulo={SUBTITULO_CUSTOMER_SERVICE} />;
}
