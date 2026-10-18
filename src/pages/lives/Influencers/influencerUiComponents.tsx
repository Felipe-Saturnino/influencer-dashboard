import { useState, useRef, useEffect, useCallback, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Eye, EyeOff, Contact, Share2, Coins, Building2, History, Clock } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { usePainelSelectPortal } from "../../../hooks/usePainelSelectPortal";
import { estiloPainelPortalFixed } from "../../../lib/selectPainelPortal";
import { FONT } from "../../../constants/theme";
import { FiltroBarTabButton, FILTRO_BAR_TAB_ICON_PROPS, onFiltroBarTabsKeyDown } from "../../../components/dashboard";
import {
  STATUS_COLOR,
  STATUS_LABEL,
  STATUS_OPTS,
  type InfluencerModalTab,
  type StatusInfluencer,
} from "./influencerTypes";

const INFLUENCER_TAB_ICONS: Record<InfluencerModalTab, ReactNode> = {
  cadastral: <Contact {...FILTRO_BAR_TAB_ICON_PROPS} />,
  horas: <Clock {...FILTRO_BAR_TAB_ICON_PROPS} />,
  canais: <Share2 {...FILTRO_BAR_TAB_ICON_PROPS} />,
  financeiro: <Coins {...FILTRO_BAR_TAB_ICON_PROPS} />,
  operadoras: <Building2 {...FILTRO_BAR_TAB_ICON_PROPS} />,
  historico: <History {...FILTRO_BAR_TAB_ICON_PROPS} />,
};

export function InfluencerModalTabs<T extends InfluencerModalTab>({
  tabs,
  tab,
  setTab,
  tabIdPrefix,
  panelIdPrefix,
  wrapStyle,
}: {
  tabs: { key: T; label: string }[];
  tab: T;
  setTab: (k: T) => void;
  tabIdPrefix: string;
  panelIdPrefix: string;
  wrapStyle?: CSSProperties;
}) {
  const tabKeys = tabs.map((tb) => tb.key);
  return (
    <div
      role="tablist"
      aria-label="Seções do influencer"
      style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "nowrap", overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 2, ...wrapStyle }}
      onKeyDown={(e) => onFiltroBarTabsKeyDown(e, tabKeys, setTab, (k) => `${tabIdPrefix}${k}`)}
    >
      {tabs.map((tb) => (
        <FiltroBarTabButton
          key={tb.key}
          id={`${tabIdPrefix}${tb.key}`}
          active={tab === tb.key}
          aria-controls={`${panelIdPrefix}${tb.key}`}
          onClick={() => setTab(tb.key)}
          icon={INFLUENCER_TAB_ICONS[tb.key]}
          style={{ flexShrink: 0 }}
        >
          {tb.label}
        </FiltroBarTabButton>
      ))}
    </div>
  );
}

// ─── BLUR EM DADOS SENSÍVEIS ──────────────────────────────────────────────────
export function SensitiveField({
  value, label, labelStyle, textStyle, editMode = false,
}: {
  value?: string;   label?: string; labelStyle?: CSSProperties;
  textStyle?: CSSProperties; editMode?: boolean;
}) {
  const [visible, setVisible] = useState(editMode);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { theme: t } = useApp();

  function reveal() {
    setVisible(true);
    if (!editMode) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 10000);
    }
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const display = value || "—";

  return (
    <div>
      {label && <span style={labelStyle}>{label}</span>}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          ...textStyle,
          filter: visible ? "none" : "blur(5px)",
          userSelect: visible ? "auto" : "none",
          transition: "filter 0.2s",
          cursor: visible ? "text" : "default",
        }}>
          {display}
        </span>
        <button
          type="button"
          onClick={() => visible ? setVisible(false) : reveal()}
          aria-label={visible ? `Ocultar ${label ?? "dado sensível"}` : `Revelar ${label ?? "dado sensível"}`}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: t.textMuted, padding: 2, flexShrink: 0,
            display: "flex", alignItems: "center",
            opacity: 0.7,
          }}
        >
          {visible ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
interface StatusBadgeProps {
  value:     StatusInfluencer;
  onChange:  (v: StatusInfluencer) => void;
  readonly?: boolean;
}

export function StatusBadge({ value, onChange, readonly }: StatusBadgeProps) {
  const { theme: t } = useApp();
  const [open, setOpen] = useState(false);
  const closePanel = useCallback(() => setOpen(false), []);
  const { triggerRef, panelRef, pos } = usePainelSelectPortal({
    open: open && !readonly,
    onClose: closePanel,
    minWidth: 140,
    matchTriggerWidth: false,
  });
  const color = STATUS_COLOR[value] ?? "#888";
  const menuNode =
    open && !readonly && pos ? (
      <div
        ref={panelRef}
        role="menu"
        style={estiloPainelPortalFixed(pos, { background: t.cardBg, border: t.cardBorder }, {
          padding: 0,
          minWidth: 140,
          overflow: "hidden",
          borderRadius: 10,
        })}
      >
        {STATUS_OPTS.map((s) => (
          <button
            key={s}
            type="button"
            role="menuitem"
            onClick={() => {
              onChange(s);
              closePanel();
            }}
            style={{
              display: "block",
              width: "100%",
              padding: "9px 14px",
              border: "none",
              background: s === value ? `${STATUS_COLOR[s]}18` : "transparent",
              color: STATUS_COLOR[s],
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              textAlign: "left",
              fontFamily: FONT.body,
            }}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>
    ) : null;
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => { if (!readonly) setOpen((o) => !o); }}
        {...(!readonly ? { "aria-haspopup": "menu" as const, "aria-expanded": open } : {})}
        aria-label={`Status: ${STATUS_LABEL[value]}`}
        style={{
          padding: "4px 12px", borderRadius: "20px",
          border: `1.5px solid ${color}`, background: `${color}18`, color,
          fontSize: "12px", fontWeight: 700, fontFamily: FONT.body,
          cursor: readonly ? "default" : "pointer",
          display: "flex", alignItems: "center", gap: "5px",
        }}
      >
        {STATUS_LABEL[value]}
        {!readonly && <ChevronDown size={9} style={{ opacity: 0.7 }} aria-hidden="true" />}
      </button>
      {menuNode ? createPortal(menuNode, document.body) : null}
    </div>
  );
}

