import { BoasVindasHome } from "../shared/BoasVindasHome";

const SUBTITULO_SERVICE_MANAGER =
  "Você garante que cada jogo aconteça com confiança.\nSeu trabalho preserva a integridade das partidas, resolve situações em tempo real e mantém a operação funcionando com segurança e qualidade. Esta plataforma foi criada para apoiar sua rotina e fortalecer quem garante a excelência nos bastidores.";

export function BoasVindasServiceManager({ nome }: { nome: string }) {
  return <BoasVindasHome nome={nome} subtitulo={SUBTITULO_SERVICE_MANAGER} />;
}
