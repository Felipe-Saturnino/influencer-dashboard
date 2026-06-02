import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import type { Theme } from "../../../constants/theme";
import { FONT } from "../../../constants/theme";
import { CAROUSEL_NAV_BTN_PX, getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { FiltroHistoricoButton, FiltroOperadoraSelect } from "../../../components/dashboard";
type DashboardBrand = ReturnType<
  typeof import("../../../hooks/useDashboardBrand").useDashboardBrand
>;
import { getPageFilterBoxStyle } from "../../../lib/pageContentBoxStyles";
import { OverviewSpinAbaNav } from "./OverviewSpinAbaNav";
import type { OverviewSpinTab } from "./overviewSpinTabs";

type Props = {
  brand: DashboardBrand;
  t: Theme;
  aba: OverviewSpinTab;
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
  podeVerOperadora: boolean;
  loading: boolean;
  onSelectAba: (key: OverviewSpinTab) => void;
};

export function OverviewSpinFiltroBar({
  brand,
  t,
  aba,
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
        {aba !== "posicionamento" ? (
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
        {aba !== "posicionamento" ? (
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

        {aba === "overview" ? (
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

        {aba === "overview" && loading && (
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

      <OverviewSpinAbaNav aba={aba} onSelectAba={onSelectAba} />
    </div>
  );
}
