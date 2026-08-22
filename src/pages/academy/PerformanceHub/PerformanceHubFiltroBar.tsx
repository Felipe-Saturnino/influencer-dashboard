import { BarChart3, ChevronLeft, ChevronRight, ClipboardList, Settings } from "lucide-react";
import type { Theme } from "../../../constants/theme";
import type { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { PERFORMANCE_HUB_TIME_OPTIONS } from "../../../lib/academyPerformanceHubConstants";
import type { PerformanceHubTab, PerformanceHubTimeSlug } from "../../../lib/academyPerformanceHubTypes";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { FILTER_BAR_ROW_GAP, onFiltroBarTabsKeyDown } from "../../../lib/filterBarStyles";
import { getPageFilterBoxStyle } from "../../../lib/pageContentBoxStyles";
import { AjudaContextualAcoes } from "../../../components/AjudaContextualAcoes";
import {
  FILTRO_BAR_TAB_ICON_PROPS,
  FiltroBarTabButton,
  FiltroCalendarioStaffSelect,
  FiltroCalendarioTimeSelect,
  FiltroHistoricoButton,
} from "../../../components/dashboard";

type Brand = ReturnType<typeof useDashboardBrand>;

type Props = {
  brand: Brand;
  t: Theme;
  aba: PerformanceHubTab;
  onSelectAba: (tab: PerformanceHubTab) => void;
  historico: boolean;
  onToggleHistorico: () => void;
  labelCarrossel: string;
  carrosselAnteriorDisabled: boolean;
  carrosselProximoDisabled: boolean;
  onCarrosselAnterior: () => void;
  onCarrosselProximo: () => void;
  timeSelecionado: PerformanceHubTimeSlug;
  onSelecionarTime: (time: PerformanceHubTimeSlug) => void;
  /** Ver = Próprios: oculto — lista já fica só nas avaliações do usuário. */
  showTimeFilter: boolean;
  staffItems: { id: string; name: string }[];
  staffSelecionado: string[];
  onSelecionarStaff: (ids: string[]) => void;
  /** Criar = Sim: abas Gerenciamento e Configuração. */
  canCriarSim: boolean;
  /** Oculto na aba Configuração */
  showStaffFilter: boolean;
};

function tabsVisiveis(canCriarSim: boolean): PerformanceHubTab[] {
  const tabs: PerformanceHubTab[] = ["avaliacoes"];
  if (canCriarSim) {
    tabs.push("gerenciamento", "configuracao");
  }
  return tabs;
}

export function PerformanceHubFiltroBar({
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
  timeSelecionado,
  onSelecionarTime,
  showTimeFilter,
  staffItems,
  staffSelecionado,
  onSelecionarStaff,
  canCriarSim,
  showStaffFilter,
}: Props) {
  const tabs = tabsVisiveis(canCriarSim);

  return (
    <div style={getPageFilterBoxStyle(brand, t)}>
      <div className="app-filter-bar-tabs-cta">
      <span className="app-filter-bar-tabs-cta__spacer" aria-hidden />
      <div className="app-filter-bar-tabs-cta__tabs" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: FILTER_BAR_ROW_GAP, flexWrap: "wrap" }}>
        <button
          type="button"
          aria-label="Mês anterior"
          style={getCarouselBtnNavStyle(t, carrosselAnteriorDisabled)}
          disabled={carrosselAnteriorDisabled}
          onClick={onCarrosselAnterior}
        >
          <ChevronLeft size={14} aria-hidden />
        </button>
        <span style={getCarouselPeriodLabelStyle(t, { minWidth: "clamp(140px, 40vw, 180px)" })}>
          {labelCarrossel}
        </span>
        <button
          type="button"
          aria-label="Próximo mês"
          style={getCarouselBtnNavStyle(t, carrosselProximoDisabled)}
          disabled={carrosselProximoDisabled}
          onClick={onCarrosselProximo}
        >
          <ChevronRight size={14} aria-hidden />
        </button>

        <FiltroHistoricoButton active={historico} onClick={onToggleHistorico} />

        {showTimeFilter ? (
          <FiltroCalendarioTimeSelect
            mode="single"
            selected={[timeSelecionado]}
            onChange={(ids) => onSelecionarTime((ids[0] as PerformanceHubTimeSlug | undefined) ?? timeSelecionado)}
            items={PERFORMANCE_HUB_TIME_OPTIONS.map((item) => ({ id: item.value, name: item.label }))}
          />
        ) : null}

        {canCriarSim && showStaffFilter ? (
          <FiltroCalendarioStaffSelect
            mode="single"
            selected={staffSelecionado}
            onChange={onSelecionarStaff}
            items={staffItems}
          />
        ) : null}
      </div>
      <div className="app-filter-bar-tabs-cta__actions">
        <AjudaContextualAcoes pageKey="academy_performance_hub" />
      </div>
      </div>

      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${t.cardBorder}` }}>
        <div
          role="tablist"
          aria-label="Abas do Performance Hub"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: FILTER_BAR_ROW_GAP, flexWrap: "wrap", width: "100%" }}
          onKeyDown={(e) => onFiltroBarTabsKeyDown(e, tabs, onSelectAba, (k) => `tab-performance-hub-${k}`)}
        >
          <FiltroBarTabButton
            id="tab-performance-hub-avaliacoes"
            active={aba === "avaliacoes"}
            aria-controls="panel-performance-hub-avaliacoes"
            onClick={() => onSelectAba("avaliacoes")}
            icon={<BarChart3 {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            Avaliações
          </FiltroBarTabButton>

          {canCriarSim ? (
            <FiltroBarTabButton
              id="tab-performance-hub-gerenciamento"
              active={aba === "gerenciamento"}
              aria-controls="panel-performance-hub-gerenciamento"
              onClick={() => onSelectAba("gerenciamento")}
              icon={<ClipboardList {...FILTRO_BAR_TAB_ICON_PROPS} />}
            >
              Gerenciamento
            </FiltroBarTabButton>
          ) : null}

          {canCriarSim ? (
            <FiltroBarTabButton
              id="tab-performance-hub-configuracao"
              active={aba === "configuracao"}
              aria-controls="panel-performance-hub-configuracao"
              onClick={() => onSelectAba("configuracao")}
              icon={<Settings {...FILTRO_BAR_TAB_ICON_PROPS} />}
            >
              Configuração
            </FiltroBarTabButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
