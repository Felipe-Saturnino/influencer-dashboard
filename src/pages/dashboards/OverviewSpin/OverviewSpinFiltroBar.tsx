import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import type { Theme } from "../../../constants/theme";
import { FONT } from "../../../constants/theme";
import { CAROUSEL_NAV_BTN_PX, getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { FiltroHistoricoButton, FiltroOperadoraSelect } from "../../../components/dashboard";
type DashboardBrand = ReturnType<
  typeof import("../../../hooks/useDashboardBrand").useDashboardBrand
>;
import { getPageFilterBoxStyle } from "../../../lib/pageContentBoxStyles";
import { AjudaContextualAcoes } from "../../../components/AjudaContextualAcoes";
import { OverviewSpinAbaNav } from "./OverviewSpinAbaNav";
import { abaEhFinanceira, type OverviewSpinTab } from "./overviewSpinTabs";

type Props = {
  brand: DashboardBrand;
  t: Theme;
  aba: OverviewSpinTab;
  tabsVisiveis: OverviewSpinTab[];
  labelCarrosselCentral: string;
  carrosselAnteriorDisabled: boolean;
  carrosselProximoDisabled: boolean;
  onCarrosselAnterior: () => void;
  onCarrosselProximo: () => void;
  historico: boolean;
  onToggleHistorico: () => void;
  showFiltroOperadora: boolean;
  filtroOperadora: string;
  onFiltroOperadoraChange: (v: string) => void;
  operadorasOcr: { slug: string; nome: string }[];
  podeVerOperadora: (slug: string) => boolean;
  loading: boolean;
  onSelectAba: (key: OverviewSpinTab) => void;
};

export function OverviewSpinFiltroBar({
  brand,
  t,
  aba,
  tabsVisiveis,
  labelCarrosselCentral,
  carrosselAnteriorDisabled,
  carrosselProximoDisabled,
  onCarrosselAnterior,
  onCarrosselProximo,
  historico,
  onToggleHistorico,
  showFiltroOperadora,
  filtroOperadora,
  onFiltroOperadoraChange,
  operadorasOcr,
  podeVerOperadora,
  loading,
  onSelectAba,
}: Props) {
  const financeira = abaEhFinanceira(aba);

  return (
    <div style={getPageFilterBoxStyle(brand, t)}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        {financeira ? (
          <button
            type="button"
            aria-label="Mês anterior"
            style={getCarouselBtnNavStyle(t, carrosselAnteriorDisabled)}
            onClick={onCarrosselAnterior}
            disabled={carrosselAnteriorDisabled}
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
        ) : (
          <span style={{ width: CAROUSEL_NAV_BTN_PX, flexShrink: 0 }} aria-hidden />
        )}
        <span style={getCarouselPeriodLabelStyle(t, { minWidth: "min(100%, 180px)" })}>
          {labelCarrosselCentral}
        </span>
        {financeira ? (
          <button
            type="button"
            aria-label="Próximo mês"
            style={getCarouselBtnNavStyle(t, carrosselProximoDisabled)}
            onClick={onCarrosselProximo}
            disabled={carrosselProximoDisabled}
          >
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        ) : (
          <span style={{ width: CAROUSEL_NAV_BTN_PX, flexShrink: 0 }} aria-hidden />
        )}

        {financeira ? (
          <FiltroHistoricoButton active={historico} onClick={onToggleHistorico} />
        ) : null}

        {showFiltroOperadora && (
          <FiltroOperadoraSelect
            value={filtroOperadora}
            onChange={onFiltroOperadoraChange}
            operadoras={operadorasOcr}
            podeVerOperadora={podeVerOperadora}
          />
        )}

        {financeira && loading && (
          <span
            style={{
              fontSize: 12,
              color: t.textMuted,
              fontFamily: FONT.body,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Clock size={12} aria-hidden />
            Carregando…
          </span>
        )}
      </div>

      <div className="app-filter-bar-tabs-cta">
        <span className="app-filter-bar-tabs-cta__spacer" aria-hidden />
        <div className="app-filter-bar-tabs-cta__tabs">
          <OverviewSpinAbaNav aba={aba} onSelectAba={onSelectAba} tabsVisiveis={tabsVisiveis} />
        </div>
        <div className="app-filter-bar-tabs-cta__actions">
          <AjudaContextualAcoes pageKey="mesas_spin" />
        </div>
      </div>
    </div>
  );
}
