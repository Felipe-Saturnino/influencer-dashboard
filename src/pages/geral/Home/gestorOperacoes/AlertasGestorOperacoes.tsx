import { HomeAlertaBox, homeAlertaCtaStyle } from "../shared/HomeAlertaBox";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import { mensagemEscalaNaoAprovada } from "../../../../lib/homeGestorAlertasCopy";
import type { HomeGestorOperacoesAlerta } from "../hooks/useHomeGestorOperacoesData";

export function AlertasGestorOperacoes({ alerta }: { alerta: HomeGestorOperacoesAlerta }) {
  const { propsFor } = useAppPageNav();
  if (!alerta.ativo) return null;
  return (
    <HomeAlertaBox variante="acao">
      <p style={{ margin: "0 0 12px" }}>
        {mensagemEscalaNaoAprovada(alerta.diasUteis, alerta.areasLabel, alerta.mesLabel)}
      </p>
      <a {...propsFor("rh_gestao_escala")} style={homeAlertaCtaStyle("acao")}>
        Ir para Escala Estúdio
      </a>
    </HomeAlertaBox>
  );
}
