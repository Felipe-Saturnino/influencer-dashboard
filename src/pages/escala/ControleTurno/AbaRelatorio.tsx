import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { SectionTitle } from "../../../components/dashboard";
import { AppPageLink } from "../../../components/AppPageLink";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { formatDiaBr } from "./helpers";

type Props = {
  diaIso: string;
};

/** Nesta 1ª entrega: ponte para a página dedicada Relatório de Turno (permanece no menu até a migração). */
export function AbaRelatorio({ diaIso }: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const pageBox = getPageContentBoxStyle(brand, t);

  return (
    <div style={pageBox}>
      <SectionTitle sub={formatDiaBr(diaIso)}>Controle dos Turnos</SectionTitle>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: t.text, fontFamily: FONT.body, lineHeight: 1.5 }}>
        Os relatórios de turno e de estúdio continuam na página dedicada{" "}
        <strong>Relatório de Turno</strong> enquanto consolidamos os cards por turno nesta aba. O dia
        selecionado no carrossel serve de referência para a consulta.
      </p>
      <p style={{ margin: "0 0 14px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
        Dia selecionado: <strong style={{ color: t.text }}>{formatDiaBr(diaIso)}</strong>
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <AppPageLink
          pageKey="escala_relatorio_turno"
          tabSlug="RelatorioDoTurno"
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
          Abrir Relatório do Turno
        </AppPageLink>
        <AppPageLink
          pageKey="escala_relatorio_turno"
          tabSlug="RelatorioDeEstudio"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "10px 20px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.text,
            fontWeight: 700,
            fontSize: 13,
            fontFamily: FONT.body,
            textDecoration: "none",
          }}
        >
          Abrir Relatório de Estúdio
        </AppPageLink>
      </div>
    </div>
  );
}
