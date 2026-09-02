import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { SectionTitle } from "../../../components/dashboard";
import { AppPageLink } from "../../../components/AppPageLink";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { formatDiaCurto, labelTurnoCurto } from "./helpers";
import type { ControleTurnoTurno } from "./types";

type Props = {
  diaIso: string;
  turno: ControleTurnoTurno;
};

/** Nesta 1ª entrega: ponte para a página dedicada Rotação (permanece no menu até a migração). */
export function AbaRotacao({ diaIso, turno }: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const pageBox = getPageContentBoxStyle(brand, t);

  return (
    <div style={pageBox}>
      <SectionTitle sub={`${labelTurnoCurto(turno)} · ${formatDiaCurto(diaIso)}`}>
        Rotação
      </SectionTitle>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: t.text, fontFamily: FONT.body, lineHeight: 1.5 }}>
        O cockpit de geração e consulta da rotação continua na página dedicada{" "}
        <strong>Rotação</strong> enquanto consolidamos o fluxo aqui. Use o atalho abaixo com o mesmo
        dia/turno selecionado no Controle de Turno.
      </p>
      <p style={{ margin: "0 0 14px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
        Dia selecionado: <strong style={{ color: t.text }}>{formatDiaCurto(diaIso)}</strong>
        {" · "}
        Turno: <strong style={{ color: t.text }}>{labelTurnoCurto(turno)}</strong>
      </p>
      <AppPageLink
        pageKey="escala_rotacao"
        tabSlug="GerarRotacao"
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "10px 20px",
          borderRadius: 10,
          background: "linear-gradient(135deg, var(--brand-primary, #4a2082), var(--brand-secondary, #1e36f8))",
          color: "#fff",
          fontWeight: 700,
          fontSize: 13,
          fontFamily: FONT.body,
          textDecoration: "none",
        }}
      >
        Abrir Rotação
      </AppPageLink>
    </div>
  );
}
