import { HomeAlertaBox, homeAlertaCtaStyle } from "../shared/HomeAlertaBox";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import type { HomeGestorAcademyAlertas } from "../hooks/useHomeGestorAcademyData";

export function AlertasGestorAcademy({ alertas }: { alertas: HomeGestorAcademyAlertas }) {
  const { propsFor } = useAppPageNav();
  const showAprov = alertas.postagensAprovacao > 0;
  const showMeta = !alertas.metaAtingida;
  if (!showAprov && !showMeta) return null;

  return (
    <>
      {showAprov ? (
        <HomeAlertaBox variante="acao">
          <p style={{ margin: "0 0 12px" }}>
            Há {alertas.postagensAprovacao.toLocaleString("pt-BR")} postagem
            {alertas.postagensAprovacao === 1 ? "" : "ns"} no Portal da Academy aguardando aprovação.
          </p>
          <a {...propsFor("academy_portal")} style={homeAlertaCtaStyle("acao")}>
            Ir para Portal da Academy
          </a>
        </HomeAlertaBox>
      ) : null}
      {showMeta ? (
        <HomeAlertaBox variante="atencao">
          <p style={{ margin: "0 0 12px" }}>
            Meta do mês: {alertas.metaAvaliacoesMes} avaliações aprovadas no Performance Hub ainda não atingida.
          </p>
          <a {...propsFor("academy_performance_hub")} style={homeAlertaCtaStyle("atencao")}>
            Ir para Performance Hub
          </a>
        </HomeAlertaBox>
      ) : null}
    </>
  );
}
