import { ChevronLeft, ChevronRight, Clock, LayoutDashboard, Briefcase, UserMinus } from "lucide-react";
import type { Theme } from "../../../constants/theme";
import {
  FiltroBarCampoSelect,
  FiltroBarTabButton,
  FiltroHistoricoButton,
  FILTRO_BAR_TAB_ICON_PROPS,
  onFiltroBarTabsKeyDown,
} from "../../../components/dashboard";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { FilterBarIcons } from "../../../lib/filterBarIconCatalog";
import { getFilterBarRowStyle } from "../../../lib/filterBarStyles";
import { getPageFilterBoxStyle } from "../../../lib/pageContentBoxStyles";
import type { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import type { HeadcountDiretoriaRef } from "../../../lib/headcountMetrics";
import type { HeadcountTab } from "./useHeadcountDados";

type Brand = ReturnType<typeof useDashboardBrand>;

const TABS: { key: HeadcountTab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "vagas", label: "Contratação", icon: Briefcase },
  { key: "distrato", label: "Distratos", icon: UserMinus },
];

type Props = {
  brand: Brand;
  t: Theme;
  aba: HeadcountTab;
  onSelectAba: (tab: HeadcountTab) => void;
  historico: boolean;
  onToggleHistorico: () => void;
  labelCarrossel: string;
  carrosselAnteriorDisabled: boolean;
  carrosselProximoDisabled: boolean;
  onCarrosselAnterior: () => void;
  onCarrosselProximo: () => void;
  filtroDiretoria: string;
  onFiltroDiretoria: (v: string) => void;
  diretorias: HeadcountDiretoriaRef[];
  loading: boolean;
};

export function HeadcountFiltroBar({
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
  filtroDiretoria,
  onFiltroDiretoria,
  diretorias,
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

        <FiltroBarCampoSelect
          value={filtroDiretoria}
          onChange={onFiltroDiretoria}
          options={diretorias.map((d) => ({ value: d.id, label: d.nome }))}
          icon={FilterBarIcons.diretoria}
          ariaLabel="Diretorias"
          todasValue="todas"
          todasLabel="Todas as diretorias"
          minWidth={200}
        />

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
          aria-label="Abas do Headcount"
          style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", width: "100%" }}
          onKeyDown={(e) =>
            onFiltroBarTabsKeyDown(
              e,
              TABS.map((x) => x.key),
              onSelectAba,
              (k) => `tab-headcount-${k}`,
            )
          }
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <FiltroBarTabButton
                key={tab.key}
                id={`tab-headcount-${tab.key}`}
                active={aba === tab.key}
                aria-controls={`panel-headcount-${tab.key}`}
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
