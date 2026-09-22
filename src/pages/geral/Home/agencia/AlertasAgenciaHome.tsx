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
  cadastrosIncompletosNomes,
  horasPendentesCount,
  horasPendentesTotal,
  horasPendentesNomes,
}: {
  cadastrosIncompletosCount: number;
  cadastrosIncompletosNomes: string[];
  horasPendentesCount: number;
  horasPendentesTotal: number;
  horasPendentesNomes: string[];
}) {
  const { propsFor } = useAppPageNav();
  const showCadastro = cadastrosIncompletosCount > 0;
  const showHoras = horasPendentesCount > 0;

  if (!showCadastro && !showHoras) return null;

  return (
    <>
      {showCadastro ? (
        <HomeAlertaBox variante="acao">
          <p style={{ margin: "0 0 12px" }}>
            {mensagemCadastrosIncompletosAgencia(cadastrosIncompletosCount, cadastrosIncompletosNomes)}
          </p>
          <a {...propsFor("influencers")} style={homeAlertaCtaStyle("acao")}>
            {AGENCIA_HOME_CADASTRO_INCOMPLETO_CTA}
          </a>
        </HomeAlertaBox>
      ) : null}
      {showHoras ? (
        <HomeAlertaBox variante="acao">
          <p style={{ margin: "0 0 12px" }}>
            {mensagemHorasPendentesAgencia(
              horasPendentesCount,
              horasPendentesTotal,
              horasPendentesNomes,
            )}
          </p>
          <a {...propsFor("agenda")} style={homeAlertaCtaStyle("acao")}>
            {AGENCIA_HOME_HORAS_PENDENTES_CTA}
          </a>
        </HomeAlertaBox>
      ) : null}
    </>
  );
}
