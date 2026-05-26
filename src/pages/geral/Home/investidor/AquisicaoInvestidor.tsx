import { Loader2, Share2, Tv } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { fmtBRL, fmtHorasTotal } from "../../../../lib/dashboardHelpers";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { FONT } from "../../../../constants/theme";
import { useHomeInvestidorAquisicao } from "../hooks/useHomeInvestidorAquisicao";
import { HomeInvestidorKpiCard } from "./HomeInvestidorKpiCard";
import {
  homeInvestidorSectionTitleStyle,
  HOME_INVESTIDOR_BODY_MUTED,
  HOME_INVESTIDOR_FOOTER_HINT,
  HOME_INVESTIDOR_LINK_BUTTON,
} from "./homeInvestidorUi";

export function AquisicaoInvestidor() {
  const { theme: t, setActivePage } = useApp();
  const brand = useDashboardBrand();
  const { loading, erro, data } = useHomeInvestidorAquisicao();
  const box = getPageContentBoxStyle(brand, t);

  const fmtNum = (n: number) => n.toLocaleString("pt-BR");

  return (
    <section style={box} aria-labelledby="home-investidor-aquisicao-title">
      <h2 id="home-investidor-aquisicao-title" style={homeInvestidorSectionTitleStyle(t.sectionTitle)}>
        Ações de Aquisição
      </h2>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0" }}>
          <Loader2 className="app-lucide-spin" size={20} color="var(--brand-primary, #7c3aed)" aria-hidden />
          <span style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Carregando…</span>
        </div>
      ) : erro || !data ? (
        <p style={{ ...HOME_INVESTIDOR_BODY_MUTED, color: t.textMuted }}>
          Não foi possível carregar os dados de aquisição. Se o problema persistir, contate o suporte.
        </p>
      ) : (
        <>
          <div className="app-grid-2">
            <HomeInvestidorKpiCard
              label="Streamers"
              icon={<Tv size={16} aria-hidden />}
              accentVar="--brand-primary"
              breakdown={[
                { label: "Lives realizadas", value: fmtNum(data.streamers.lives) },
                { label: "Horas realizadas", value: fmtHorasTotal(data.streamers.horas) },
                { label: "Depósitos", value: fmtBRL(data.streamers.depositosTotal) },
              ]}
            />
            <HomeInvestidorKpiCard
              label="Mídias Sociais"
              icon={<Share2 size={16} aria-hidden />}
              accentVar="--brand-secondary"
              breakdown={[
                { label: "Postagens", value: fmtNum(data.social.postagens) },
                { label: "Seguidores totais", value: fmtNum(data.social.seguidores) },
                { label: "Impressões totais", value: fmtNum(data.social.impressoes) },
              ]}
            />
          </div>
          <p style={{ ...HOME_INVESTIDOR_FOOTER_HINT, color: t.textMuted }}>
            Quer saber mais? Acessa o Dashboard de{" "}
            <button type="button" onClick={() => setActivePage("streamers")} style={HOME_INVESTIDOR_LINK_BUTTON}>
              Streamers
            </button>{" "}
            e de{" "}
            <button
              type="button"
              onClick={() => setActivePage("dash_midias_sociais")}
              style={HOME_INVESTIDOR_LINK_BUTTON}
            >
              Mídias Sociais
            </button>
          </p>
        </>
      )}
    </section>
  );
}
