import { FiltroBarTabButton } from "../../../components/dashboard";
import { FILTRO_BAR_TAB_ICON_SIZE, handleFiltroBarTabsArrowKeyDown } from "../../../lib/filterBarStyles";
import { TAB_ICONS_SPIN, TAB_IDS_SPIN, TAB_LABELS_SPIN, type OverviewSpinTab } from "./overviewSpinTabs";

export function OverviewSpinAbaNav({
  aba,
  onSelectAba,
}: {
  aba: OverviewSpinTab;
  onSelectAba: (key: OverviewSpinTab) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Seções Overview Spin"
      style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}
    >
      {TAB_IDS_SPIN.map((key) => {
        const TabIcon = TAB_ICONS_SPIN[key];
        return (
          <FiltroBarTabButton
            key={key}
            id={`tab-overview-spin-${key}`}
            active={aba === key}
            aria-controls={`panel-overview-spin-${key}`}
            onClick={() => onSelectAba(key)}
            onKeyDown={(e) =>
              handleFiltroBarTabsArrowKeyDown(e, TAB_IDS_SPIN, key, onSelectAba, "tab-overview-spin-")
            }
            icon={<TabIcon size={FILTRO_BAR_TAB_ICON_SIZE} strokeWidth={2} aria-hidden="true" />}
          >
            {TAB_LABELS_SPIN[key]}
          </FiltroBarTabButton>
        );
      })}
    </div>
  );
}
