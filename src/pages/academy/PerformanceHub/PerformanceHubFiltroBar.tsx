import { BarChart3, ChevronLeft, ChevronRight, ClipboardList, Settings } from "lucide-react";
import type { Theme } from "../../../constants/theme";
import type { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { PERFORMANCE_HUB_TIME_OPTIONS } from "../../../lib/academyPerformanceHubConstants";
import type { PerformanceHubTab, PerformanceHubTimeSlug } from "../../../lib/academyPerformanceHubTypes";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { FILTER_BAR_ROW_GAP, onFiltroBarTabsKeyDown } from "../../../lib/filterBarStyles";
import { getPageFilterBoxStyle } from "../../../lib/pageContentBoxStyles";
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
  staffItems: { id: string; name: string }[];
  staffSelecionado: string[];
  onSelecionarStaff: (ids: string[]) => void;
  canEditarOk: boolean;
  canCriarOk: boolean;
};

function tabsVisiveis(canEditarOk: boolean, canCriarOk: boolean): PerformanceHubTab[] {
  const tabs: PerformanceHubTab[] = ["avaliacoes"];
  if (canEditarOk) tabs.push("gerenciamento");
  if (canCriarOk) tabs.push("configuracao");
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
  staffItems,
  staffSelecionado,
  onSelecionarStaff,
  canEditarOk,
  canCriarOk,
}: Props) {
  const tabs = tabsVisiveis(canEditarOk, canCriarOk);

  return (
    <div style={getPageFilterBoxStyle(brand, t)}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: FILTER_BAR_ROW_GAP, flexWrap: "wrap", width: "100%" }}>
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

        <FiltroCalendarioTimeSelect
          mode="single"
          selected={[timeSelecionado]}
          onChange={(ids) => onSelecionarTime((ids[0] as PerformanceHubTimeSlug | undefined) ?? timeSelecionado)}
          items={PERFORMANCE_HUB_TIME_OPTIONS.map((item) => ({ id: item.value, name: item.label }))}
        />

        {canEditarOk ? (
          <FiltroCalendarioStaffSelect
            mode="single"
            selected={staffSelecionado}
            onChange={onSelecionarStaff}
            items={staffItems}
          />
        ) : null}
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

          {canEditarOk ? (
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

          {canCriarOk ? (
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
