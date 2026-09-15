import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import { FONT } from "../../../../constants/theme";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { getCtaCriarGradient } from "../../../../lib/ctaCriarStyles";
import {
  fmtDiaMesTurnoHome,
  partesDataTurnoDestaque,
  useHomeProximosTurnos,
  type HomeProximoTurno,
} from "../hooks/useHomeProximosTurnos";
import { homeSectionTitleStyle, HOME_BODY_MUTED, HOME_LINK_BUTTON } from "./homeSharedUi";
import { HomeSectionMesSubtitle } from "./HomeSectionMesSubtitle";

function PillOrigem({ viaMarketplace, showMarketplace }: { viaMarketplace: boolean; showMarketplace: boolean }) {
  const { theme: t } = useApp();
  const isMkt = showMarketplace && viaMarketplace;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 10,
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: 20,
        whiteSpace: "nowrap",
        background: isMkt ? "rgba(245, 158, 11, 0.15)" : `color-mix(in srgb, ${t.cardBorder} 40%, transparent)`,
        color: isMkt ? "#f59e0b" : t.textMuted,
        border: isMkt ? "1px solid rgba(245, 158, 11, 0.35)" : `1px solid ${t.cardBorder}`,
        fontFamily: FONT.body,
      }}
    >
      {isMkt ? "Marketplace" : "Escala"}
    </span>
  );
}

function TurnoDestaque({
  turno,
  showMarketplacePill,
}: {
  turno: HomeProximoTurno;
  showMarketplacePill: boolean;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const { propsFor } = useAppPageNav();
  const nav = propsFor("rh_calendario");
  const { diaNum, mesCurto } = partesDataTurnoDestaque(turno.diaIso);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 16,
        alignItems: "stretch",
        padding: 16,
        borderRadius: 14,
        border: `1px solid ${t.cardBorder}`,
        background: t.inputBg ?? t.cardBg,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          minWidth: 88,
          textAlign: "center",
          padding: "10px 12px",
          borderRadius: 12,
          background: brand.useBrand
            ? "color-mix(in srgb, var(--brand-primary) 12%, transparent)"
            : "rgba(74, 32, 130, 0.1)",
          border: brand.useBrand
            ? "1px solid color-mix(in srgb, var(--brand-primary) 28%, transparent)"
            : "1px solid rgba(74, 32, 130, 0.22)",
        }}
        aria-hidden
      >
        <div style={{ fontSize: 28, fontWeight: 800, color: t.text, fontFamily: FONT.body, lineHeight: 1 }}>
          {diaNum}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, marginTop: 4 }}>{mesCurto}</div>
        <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>{turno.horarioLabel}</div>
      </div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: t.text, fontFamily: FONT.body }}>
          Próximo turno
        </h3>
        <p style={{ margin: "0 0 4px", fontSize: 13, color: t.text, fontFamily: FONT.body }}>
          <strong>{turno.turnoLabel}</strong> · {turno.estudioLabel}
        </p>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
          Área {turno.areaLabel} · {showMarketplacePill && turno.viaMarketplace ? "via Marketplace" : "escala aprovada"}
        </p>
        <a
          href={nav.href}
          onClick={nav.onClick}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "8px 16px",
            borderRadius: 10,
            background: getCtaCriarGradient(brand),
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: FONT.body,
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          Abrir Calendário
        </a>
      </div>
    </div>
  );
}

export function ProximosTurnosStaffHome({
  sectionIdPrefix,
  showMarketplacePill = true,
}: {
  sectionIdPrefix: string;
  /** GP / Shuffler / SL / SM — Coach/CS só mostram Escala. */
  showMarketplacePill?: boolean;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const box = getPageContentBoxStyle(brand, t);
  const { propsFor } = useAppPageNav();
  const { loading, turnos } = useHomeProximosTurnos();
  const titleId = `${sectionIdPrefix}-proximos-turnos-title`;

  if (loading || turnos.length === 0) return null;

  const [destaque, ...resto] = turnos;

  return (
    <section style={box} aria-labelledby={titleId}>
      <h2 id={titleId} style={homeSectionTitleStyle(t.sectionTitle)}>
        Próximos turnos
      </h2>
      <HomeSectionMesSubtitle label="Do Calendário · Compromissos" />

      {destaque ? <TurnoDestaque turno={destaque} showMarketplacePill={showMarketplacePill} /> : null}

      {resto.length > 0 ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {resto.map((turno) => {
            const { dataCurta } = fmtDiaMesTurnoHome(turno.diaIso);
            return (
              <li
                key={`${turno.diaIso}-${turno.turnoLabel}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg ?? t.cardBg,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text, fontFamily: FONT.body }}>
                    {dataCurta} · {turno.horarioLabel} · {turno.turnoLabel}
                  </div>
                  <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginTop: 2 }}>
                    {turno.estudioLabel} ·{" "}
                    {showMarketplacePill && turno.viaMarketplace ? "via Marketplace (compra)" : "escala"}
                  </div>
                </div>
                <PillOrigem viaMarketplace={turno.viaMarketplace} showMarketplace={showMarketplacePill} />
              </li>
            );
          })}
        </ul>
      ) : null}

      <p style={{ ...HOME_BODY_MUTED, color: t.textMuted, marginTop: 14, fontSize: 12 }}>
        Quer ver a semana completa?{" "}
        <a {...propsFor("rh_calendario")} style={HOME_LINK_BUTTON}>
          Abrir Calendário
        </a>
      </p>
    </section>
  );
}
