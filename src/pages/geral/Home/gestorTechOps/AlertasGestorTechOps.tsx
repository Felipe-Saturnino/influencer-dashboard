import { HomeAlertaBox, homeAlertaCtaStyle } from "../shared/HomeAlertaBox";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import type { HomeGestorTechOpsAlertas } from "../hooks/useHomeGestorTechOpsData";

export function AlertasGestorTechOps({ alertas }: { alertas: HomeGestorTechOpsAlertas }) {
  const { propsFor } = useAppPageNav();
  if (alertas.osSolicitadas <= 0) return null;
  const n = alertas.osSolicitadas.toLocaleString("pt-BR");
  return (
    <HomeAlertaBox variante="acao">
      <p style={{ margin: "0 0 12px" }}>
        Há {n} ordem{alertas.osSolicitadas === 1 ? "" : "ns"} de saída com status Solicitada aguardando
        atendimento.
      </p>
      <a {...propsFor("tech_ops_ordem_saida")} style={homeAlertaCtaStyle("acao")}>
        Ir para Ordem de Saída
      </a>
    </HomeAlertaBox>
  );
}
