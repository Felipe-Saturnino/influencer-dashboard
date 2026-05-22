import type { CSSProperties } from "react";
import { X } from "lucide-react";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import { BRAND } from "./constants";

export function SingleSelectOperadora({
  t,
  label,
  items,
  selected,
  onSelect,
  cor = BRAND.roxoVivo,
  obrigatorio = false,
  field,
  labelStyle,
}: {
  t: Theme;
  label: string;
  items: { value: string; label: string }[];
  selected: string[];
  onSelect: (v: string) => void;
  cor?: string;
  obrigatorio?: boolean;
  field: CSSProperties;
  labelStyle: CSSProperties;
}) {
  return (
    <div style={field}>
      <label style={labelStyle}>
        {label}
        {obrigatorio ? <CampoObrigatorioMark /> : null}
        <span style={{ opacity: 0.5, fontWeight: 400, marginLeft: 6 }}>(seleção única)</span>
      </label>
      <div
        style={{
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 8,
          padding: 10,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          maxHeight: 160,
          overflowY: "auto",
          background: t.inputBg ?? t.cardBg,
        }}
      >
        {items.map((op) => {
          const sel = selected.includes(op.value);
          return (
            <button
              key={op.value}
              type="button"
              onClick={() => onSelect(op.value)}
              style={{
                border: `1px solid ${sel ? cor : t.cardBorder}`,
                background: sel ? `${cor}22` : "transparent",
                color: sel ? cor : t.text,
                borderRadius: 20,
                padding: "5px 12px",
                cursor: "pointer",
                fontFamily: FONT.body,
                fontSize: 12,
                fontWeight: sel ? 700 : 400,
                transition: "all 0.15s",
              }}
            >
              {op.label}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p style={{ fontFamily: FONT.body, fontSize: 11, color: t.textMuted, marginTop: 4 }}>
          Operadora selecionada: {items.find((i) => i.value === selected[0])?.label ?? selected[0]}
        </p>
      )}
    </div>
  );
}

export function MultiSelect({
  t,
  label,
  items,
  selected,
  onToggle,
  cor = BRAND.roxoVivo,
  obrigatorio = false,
  field,
  labelStyle,
}: {
  t: Theme;
  label: string;
  items: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
  cor?: string;
  obrigatorio?: boolean;
  field: CSSProperties;
  labelStyle: CSSProperties;
}) {
  return (
    <div style={field}>
      <label style={labelStyle}>
        {label}
        {obrigatorio ? <CampoObrigatorioMark /> : null}
        <span style={{ opacity: 0.5, fontWeight: 400, marginLeft: 6 }}>(multi-seleção)</span>
      </label>
      <div
        style={{
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 8,
          padding: 10,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          maxHeight: 160,
          overflowY: "auto",
          background: t.inputBg ?? t.cardBg,
        }}
      >
        {items.map((op) => {
          const sel = selected.includes(op.value);
          return (
            <button
              key={op.value}
              type="button"
              onClick={() => onToggle(op.value)}
              style={{
                border: `1px solid ${sel ? cor : t.cardBorder}`,
                background: sel ? `${cor}22` : "transparent",
                color: sel ? cor : t.text,
                borderRadius: 20,
                padding: "5px 12px",
                cursor: "pointer",
                fontFamily: FONT.body,
                fontSize: 12,
                fontWeight: sel ? 700 : 400,
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: sel ? 5 : 0,
              }}
            >
              {op.label}
              {sel && <X size={10} style={{ flexShrink: 0 }} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p style={{ fontFamily: FONT.body, fontSize: 11, color: t.textMuted, marginTop: 4 }}>
          {selected.length} selecionado{selected.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
