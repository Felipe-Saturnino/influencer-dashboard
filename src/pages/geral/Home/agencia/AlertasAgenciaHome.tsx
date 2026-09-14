import { HomeAlertaBox } from "../shared/HomeAlertaBox";
import { homeAlertaCtaStyle } from "../shared/homeAlertaStyles";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import {
  AGENCIA_HOME_CADASTRO_INCOMPLETO_CTA,
  AGENCIA_HOME_HORAS_PENDENTES_CTA,
  mensagemCadastrosIncompletosAgencia,
  mensagemHorasPendentesAgencia,
} from "../../../../lib/homeAgenciaCopy";

export function AlertasAgenciaHome({
  cadastrosIncompletosCount,
  horasPendentesCount,
  horasPendentesTotal,
}: {
  cadastrosIncompletosCount: number;
  horasPendentesCount: number;
  horasPendentesTotal: number;
}) {
  const { propsFor } = useAppPageNav();
  const showCadastro = cadastrosIncompletosCount > 0;
  const showHoras = horasPendentesCount > 0;

  if (!showCadastro && !showHoras) return null;

  return (
    <>
      {showCadastro ? (
        <HomeAlertaBox variante="acao">
          <p style={{ margin: "0 0 12px" }}>{mensagemCadastrosIncompletosAgencia(cadastrosIncompletosCount)}</p>
          <a {...propsFor("influencers")} style={homeAlertaCtaStyle("acao")}>
            {AGENCIA_HOME_CADASTRO_INCOMPLETO_CTA}
          </a>
        </HomeAlertaBox>
      ) : null}
      {showHoras ? (
        <HomeAlertaBox variante="acao">
          <p style={{ margin: "0 0 12px" }}>
            {mensagemHorasPendentesAgencia(horasPendentesCount, horasPendentesTotal)}
          </p>
          <a {...propsFor("agenda")} style={homeAlertaCtaStyle("acao")}>
            {AGENCIA_HOME_HORAS_PENDENTES_CTA}
          </a>
        </HomeAlertaBox>
      ) : null}
    </>
  );
}
