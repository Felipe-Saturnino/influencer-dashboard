import { FiltroBarTabButton } from "../../../components/dashboard";
import { FILTRO_BAR_TAB_ICON_SIZE, handleFiltroBarTabsArrowKeyDown } from "../../../lib/filterBarStyles";
import {
  OVERVIEW_COMERCIAL_TAB_ICONS,
  OVERVIEW_COMERCIAL_TAB_LABEL,
  OVERVIEW_COMERCIAL_TABS,
  type OverviewComercialTab,
} from "./overviewComercialTabs";

export function OverviewComercialAbaNav({
  aba,
  onSelectAba,
}: {
  aba: OverviewComercialTab;
  onSelectAba: (key: OverviewComercialTab) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Seções Overview Comercial"
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        justifyContent: "center",
        width: "100%",
        marginBottom: 10,
      }}
    >
      {OVERVIEW_COMERCIAL_TABS.map((key) => {
        const TabIcon = OVERVIEW_COMERCIAL_TAB_ICONS[key];
        return (
          <FiltroBarTabButton
            key={key}
            id={`tab-overview-comercial-${key}`}
            active={aba === key}
            aria-controls={`panel-overview-comercial-${key}`}
            onClick={() => onSelectAba(key)}
            onKeyDown={(e) =>
              handleFiltroBarTabsArrowKeyDown(
                e,
                OVERVIEW_COMERCIAL_TABS,
                key,
                onSelectAba,
                "tab-overview-comercial-",
              )
            }
            icon={<TabIcon size={FILTRO_BAR_TAB_ICON_SIZE} strokeWidth={2} aria-hidden="true" />}
          >
            {OVERVIEW_COMERCIAL_TAB_LABEL[key]}
          </FiltroBarTabButton>
        );
      })}
    </div>
  );
}
