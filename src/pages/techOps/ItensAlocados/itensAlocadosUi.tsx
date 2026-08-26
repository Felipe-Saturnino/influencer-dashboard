/* eslint-disable react-refresh/only-export-components */
import type { CSSProperties, ReactNode } from "react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import {
  ITEM_ALOCADO_STATUS_COLOR,
  ITEM_ALOCADO_STATUS_LABEL,
  type ItemAlocadoStatus,
} from "../../../lib/techOpsItensAlocados";

export function BadgeStatusAlocado({ status }: { status: ItemAlocadoStatus }) {
  const cor = ITEM_ALOCADO_STATUS_COLOR[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 10,
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: 20,
        background: `${cor}22`,
        color: cor,
        border: `1px solid ${cor}44`,
        whiteSpace: "nowrap",
        fontFamily: FONT.body,
      }}
    >
      {ITEM_ALOCADO_STATUS_LABEL[status]}
    </span>
  );
}

/** Campo estilo Incidentes — label uppercase + valor sem caixa. */
export function CampoCardAlocado({ label, value }: { label: string; value: ReactNode }) {
  const { theme: t } = useApp();
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: t.textMuted,
          fontFamily: FONT.body,
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          color: t.text,
          fontFamily: FONT.body,
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

export const ROW2_ALOCADO: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
};

export function KpiSetCard({
  label,
  valor,
  color,
  active,
  onClick,
}: {
  label: string;
  valor: number;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  const { theme: t } = useApp();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        border: `1px solid ${active ? color : t.cardBorder}`,
        borderRadius: 12,
        padding: "16px 18px",
        background: active ? `color-mix(in srgb, ${color} 12%, ${t.inputBg})` : t.inputBg,
        cursor: "pointer",
        textAlign: "center",
        fontFamily: FONT.body,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: t.textMuted,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: "tabular-nums", color }}>{valor}</div>
    </button>
  );
}
