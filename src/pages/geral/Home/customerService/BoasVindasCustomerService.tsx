import { BoasVindasHome } from "../shared/BoasVindasHome";

const SUBTITULO_CUSTOMER_SERVICE =
  "Você representa a Spin com proximidade e clareza.\nChamados, fila e Academy — o que precisa de ação, primeiro.";

export function BoasVindasCustomerService({ nome }: { nome: string }) {
  return <BoasVindasHome nome={nome} subtitulo={SUBTITULO_CUSTOMER_SERVICE} />;
}
