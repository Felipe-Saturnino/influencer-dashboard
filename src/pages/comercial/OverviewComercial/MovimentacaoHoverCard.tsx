import { useId, useState } from "react";
import { FONT } from "../../../constants/theme";

type Props = {
  label: string;
  value: number;
  marcas: string[];
  valueColor: string;
  prefixPlus?: boolean;
  t: { cardBorder: string; inputBg: string; textMuted: string };
};

export function MovimentacaoHoverCard({
  label,
  value,
  marcas,
  valueColor,
  prefixPlus,
  t,
}: Props) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <div
        tabIndex={0}
        aria-describedby={marcas.length > 0 && open ? tooltipId : undefined}
        style={{
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 14,
          padding: "14px 16px",
          background: t.inputBg,
          fontFamily: FONT.body,
          cursor: marcas.length > 0 ? "help" : "default",
          outline: open ? `2px solid color-mix(in srgb, ${valueColor} 35%, transparent)` : undefined,
        }}
      >
        <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 600 }}>{label}</div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            marginTop: 4,
            fontVariantNumeric: "tabular-nums",
            color: valueColor,
          }}
        >
          {prefixPlus && value > 0 ? "+" : ""}
          {value.toLocaleString("pt-BR")}
        </div>
      </div>
      {open && marcas.length > 0 ? (
        <div
          id={tooltipId}
          role="tooltip"
          style={{
            position: "absolute",
            zIndex: 20,
            left: 0,
            right: 0,
            bottom: "calc(100% + 8px)",
            maxHeight: 220,
            overflowY: "auto",
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            fontFamily: FONT.body,
            fontSize: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: t.textMuted,
              marginBottom: 6,
            }}
          >
            Marcas alteradas
          </div>
          {marcas.map((nome) => (
            <div key={nome} style={{ padding: "3px 0" }}>
              {nome}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
