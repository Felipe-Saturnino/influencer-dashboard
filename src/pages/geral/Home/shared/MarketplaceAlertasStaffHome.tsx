import { useEffect, useState } from "react";
import { Bell, Handshake } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { useIdentidadeEfetiva } from "../../../../hooks/useIdentidadeEfetiva";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import { FONT_TITLE } from "../../../../lib/dashboardConstants";
import { FONT } from "../../../../constants/theme";
import {
  getPageHeaderIconBoxStyle,
  getPageHeaderTitleRowStyle,
  PAGE_HEADER_ICON_PROPS,
} from "../../../../lib/pageHeaderStyles";
import {
  carregarHomeMarketplaceAlertas,
  fraseTipoOfertaMarketplace,
  formatarDiaIsoPtBr,
  type HomeMarketplaceAlerta,
} from "../../../../lib/escalaMarketplace";
import { HOME_BODY_MUTED } from "./homeSharedUi";

const COR_PENDENTE = "#f59e0b";

function textoAlerta(a: HomeMarketplaceAlerta): string {
  const tipo = fraseTipoOfertaMarketplace(a.tipo);
  const data = formatarDiaIsoPtBr(a.diaIso);
  if (a.kind === "pendente") {
    return `Você tem uma ${tipo} em ${data} aguardando a sua aprovação.`;
  }
  return `Não esqueça da sua ${tipo} em ${data}.`;
}

/**
 * Cards da Home (GP, Shuffler, SL, SM): proposta Em análise e lembrete até o início do turno.
 * Sem «Li e Ocultar» — some sozinho quando a negociação avança ou o turno começa.
 */
export function MarketplaceAlertasStaffHome({ sectionIdPrefix }: { sectionIdPrefix: string }) {
  const { theme: t } = useApp();
  const { email: emailEfetivo, isSimulacao } = useIdentidadeEfetiva();
  const brand = useDashboardBrand();
  const { propsFor } = useAppPageNav();
  const [alertas, setAlertas] = useState<HomeMarketplaceAlerta[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const emailOverlay = isSimulacao ? emailEfetivo : null;
    void carregarHomeMarketplaceAlertas(emailOverlay).then((rows) => {
      if (!cancelled) setAlertas(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [isSimulacao, emailEfetivo]);

  if (!alertas || alertas.length === 0) return null;

  const cardBg = brand.useBrand && brand.blockBg ? brand.blockBg : t.cardBg;
  const navMinhas = propsFor("escala_marketplace_turnos", "MinhasOfertas");
  const navCalendario = propsFor("rh_calendario", "Compromissos");

  return (
    <>
      {alertas.map((a) => {
        const pendente = a.kind === "pendente";
        const cor = pendente ? COR_PENDENTE : brand.primary;
        const titleId = `${sectionIdPrefix}-mkt-${a.kind}-${a.id}`;
        const nav = pendente ? navMinhas : navCalendario;
        const cta = pendente ? "Abrir Marketplace" : "Abrir Calendário";
        return (
          <section
            key={`${a.kind}-${a.id}`}
            aria-labelledby={titleId}
            style={{
              background: cardBg,
              border: `1px solid ${cor}59`,
              borderRadius: 20,
              padding: "24px 28px",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: pendente
                  ? `linear-gradient(90deg, ${COR_PENDENTE}, #eab308)`
                  : `linear-gradient(90deg, ${brand.primary}, ${brand.accent})`,
              }}
              aria-hidden
            />
            <div style={getPageHeaderTitleRowStyle()}>
              <div
                style={{
                  ...getPageHeaderIconBoxStyle(brand),
                  background: `${cor}1f`,
                  border: `1px solid ${cor}59`,
                  color: cor,
                }}
              >
                {pendente ? (
                  <Handshake {...PAGE_HEADER_ICON_PROPS} color={cor} />
                ) : (
                  <Bell {...PAGE_HEADER_ICON_PROPS} color={cor} />
                )}
              </div>
              <h2
                id={titleId}
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 800,
                  color: t.text,
                  fontFamily: FONT_TITLE,
                  letterSpacing: "0.02em",
                  lineHeight: 1.3,
                }}
              >
                {pendente ? "Negociação aguardando aprovação" : "Não esqueça da sua negociação"}
              </h2>
            </div>
            <p
              style={{
                ...HOME_BODY_MUTED,
                color: t.textMuted,
                margin: "12px 0 16px",
                fontFamily: FONT.body,
              }}
            >
              {textoAlerta(a)}
            </p>
            <a
              href={nav.href}
              onClick={nav.onClick}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "10px 20px",
                borderRadius: 10,
                border: `1px solid ${cor}73`,
                background: `${cor}1f`,
                color: cor,
                fontSize: 13,
                fontWeight: 700,
                fontFamily: FONT.body,
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              {cta}
            </a>
          </section>
        );
      })}
    </>
  );
}
