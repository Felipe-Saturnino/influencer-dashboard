import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { fmtBRL, fmtHorasTotal } from "../../../../lib/dashboardHelpers";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { FONT } from "../../../../constants/theme";
import { useHomeInvestidorAquisicao } from "../hooks/useHomeInvestidorAquisicao";
import { homeInvestidorSectionTitleStyle, HOME_INVESTIDOR_BODY_MUTED } from "./homeInvestidorUi";

function MetricaLinha({ label, value }: { label: string; value: string }) {
  const { theme: t } = useApp();
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 10,
        fontSize: 13,
        fontFamily: FONT.body,
      }}
    >
      <span style={{ color: t.textMuted }}>{label}</span>
      <span style={{ color: t.text, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

function CardAquisicao({
  titulo,
  children,
  loading,
}: {
  titulo: string;
  children: ReactNode;
  loading: boolean;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();

  return (
    <div
      style={{
        flex: "1 1 280px",
        borderRadius: 14,
        border: `1px solid ${t.cardBorder}`,
        background: brand.blockBg,
        padding: "16px 18px",
      }}
    >
      <h3
        style={{
          margin: "0 0 14px",
          fontSize: 12,
          fontWeight: 800,
          color: brand.primary,
          fontFamily: FONT.body,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {titulo}
      </h3>
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Loader2 className="app-lucide-spin" size={18} color="var(--brand-primary, #7c3aed)" aria-hidden />
          <span style={{ color: t.textMuted, fontSize: 12 }}>Carregando…</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
      )}
    </div>
  );
}

export function AquisicaoInvestidor() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const { loading, erro, data } = useHomeInvestidorAquisicao();
  const box = getPageContentBoxStyle(brand, t);

  const fmtNum = (n: number) => n.toLocaleString("pt-BR");

  return (
    <section style={box} aria-labelledby="home-investidor-aquisicao-title">
      <h2 id="home-investidor-aquisicao-title" style={homeInvestidorSectionTitleStyle(t.sectionTitle)}>
        Ações de Aquisição
      </h2>

      {erro && !loading ? (
        <p style={{ ...HOME_INVESTIDOR_BODY_MUTED, color: t.textMuted }}>
          Não foi possível carregar os dados de aquisição. Se o problema persistir, contate o suporte.
        </p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <CardAquisicao titulo="Streamers" loading={loading}>
            <MetricaLinha
              label="Lives realizadas"
              value={data ? fmtNum(data.streamers.lives) : "—"}
            />
            <MetricaLinha
              label="Horas realizadas"
              value={data ? fmtHorasTotal(data.streamers.horas) : "—"}
            />
            <MetricaLinha
              label="Depósitos"
              value={data ? fmtBRL(data.streamers.depositosTotal) : "—"}
            />
          </CardAquisicao>

          <CardAquisicao titulo="Mídias Sociais" loading={loading}>
            <MetricaLinha
              label="Postagens"
              value={data ? fmtNum(data.social.postagens) : "—"}
            />
            <MetricaLinha
              label="Seguidores totais"
              value={data ? fmtNum(data.social.seguidores) : "—"}
            />
            <MetricaLinha
              label="Impressões totais"
              value={data ? fmtNum(data.social.impressoes) : "—"}
            />
          </CardAquisicao>
        </div>
      )}
    </section>
  );
}
