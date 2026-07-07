import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import type { Theme } from "../../../constants/theme";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import {
  FiltroBarTabButton,
  FiltroCalendarioStaffSelect,
  FiltroCalendarioTimeSelect,
  FiltroHistoricoButton,
} from "../../../components/dashboard";
import { getPageFilterBoxStyle } from "../../../lib/pageContentBoxStyles";
import {
  FILTRO_BAR_TAB_ICON_PROPS,
  getFilterBarRowStyle,
  onFiltroBarTabsKeyDown,
} from "../../../lib/filterBarStyles";
import { CalendarRange, LineChart } from "lucide-react";
import type { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import type { OverviewPrestadorTab } from "./useOverviewPrestadorDados";

type Brand = ReturnType<typeof useDashboardBrand>;

type Props = {
  brand: Brand;
  t: Theme;
  aba: OverviewPrestadorTab;
  onSelectAba: (tab: OverviewPrestadorTab) => void;
  historico: boolean;
  onToggleHistorico: () => void;
  labelCarrossel: string;
  carrosselAnteriorDisabled: boolean;
  carrosselProximoDisabled: boolean;
  onCarrosselAnterior: () => void;
  onCarrosselProximo: () => void;
  showTimeFilter: boolean;
  showStaffFilter: boolean;
  timeItems: { id: string; name: string }[];
  staffItems: { id: string; name: string }[];
  filtroTimeIds: string[];
  onFiltroTimeChange: (ids: string[]) => void;
  filtroStaffIds: string[];
  onFiltroStaffChange: (ids: string[]) => void;
  loading: boolean;
};

const TABS: { key: OverviewPrestadorTab; label: string; icon: typeof CalendarRange }[] = [
  { key: "escala", label: "Escala", icon: CalendarRange },
  { key: "performance", label: "Performance", icon: LineChart },
];

export function OverviewPrestadorFiltroBar({
  brand,
  t,
  aba,
  onSelectAba,
  historico,
  onToggleHistorico,
  labelCarrossel,
  carrosselAnteriorDisabled,
  carrosselProximoDisabled,
  onCarrosselAnterior,
  onCarrosselProximo,
  showTimeFilter,
  showStaffFilter,
  timeItems,
  staffItems,
  filtroTimeIds,
  onFiltroTimeChange,
  filtroStaffIds,
  onFiltroStaffChange,
  loading,
}: Props) {
  return (
    <div style={getPageFilterBoxStyle(brand, t)}>
      <div style={getFilterBarRowStyle()}>
        <button
          type="button"
          aria-label="Mês anterior"
          style={getCarouselBtnNavStyle(t, carrosselAnteriorDisabled)}
          onClick={onCarrosselAnterior}
          disabled={carrosselAnteriorDisabled}
        >
          <ChevronLeft size={14} aria-hidden="true" />
        </button>

        <span style={getCarouselPeriodLabelStyle(t, { minWidth: "clamp(120px, 40vw, 180px)" })}>
          {labelCarrossel}
        </span>

        <button
          type="button"
          aria-label="Próximo mês"
          style={getCarouselBtnNavStyle(t, carrosselProximoDisabled)}
          onClick={onCarrosselProximo}
          disabled={carrosselProximoDisabled}
        >
          <ChevronRight size={14} aria-hidden="true" />
        </button>

        <FiltroHistoricoButton active={historico} onClick={onToggleHistorico} />

        {showTimeFilter && (
          <FiltroCalendarioTimeSelect
            mode="single"
            selected={filtroTimeIds}
            onChange={onFiltroTimeChange}
            items={timeItems}
          />
        )}

        {showStaffFilter && (
          <FiltroCalendarioStaffSelect
            mode="single"
            selected={filtroStaffIds}
            onChange={onFiltroStaffChange}
            items={staffItems}
          />
        )}

        {loading && (
          <span
            style={{ fontSize: 12, color: t.textMuted, display: "flex", alignItems: "center", gap: 4 }}
            aria-live="polite"
          >
            <Clock size={12} aria-hidden />
            Carregando…
          </span>
        )}
      </div>

      <div
        style={{
          ...getFilterBarRowStyle(),
          paddingTop: 12,
          marginTop: 12,
          borderTop: `1px solid ${t.cardBorder}`,
        }}
      >
        <div
          role="tablist"
          aria-label="Abas do Overview Prestador"
          style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", width: "100%" }}
          onKeyDown={(e) =>
            onFiltroBarTabsKeyDown(e, TABS.map((x) => x.key), onSelectAba, (k) => `tab-overview-prestador-${k}`)
          }
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const ativo = aba === tab.key;
            return (
              <FiltroBarTabButton
                key={tab.key}
                id={`tab-overview-prestador-${tab.key}`}
                active={ativo}
                aria-controls={`panel-overview-prestador-${tab.key}`}
                onClick={() => onSelectAba(tab.key)}
                icon={<Icon {...FILTRO_BAR_TAB_ICON_PROPS} />}
              >
                {tab.label}
              </FiltroBarTabButton>
            );
          })}
        </div>
      </div>
    </div>
  );
}
