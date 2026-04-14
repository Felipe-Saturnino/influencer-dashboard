import { useState, useEffect, type CSSProperties } from "react";
import { fmtBRL } from "../lib/dashboardHelpers";

function parseBRL(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

function maskBRL(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "") || "0";
  const num = parseInt(digits, 10) / 100;
  return fmtBRL(num);
}

export interface CurrencyInputProps {
  value: number;
  onChange: (v: number) => void;
  style?: CSSProperties;
  placeholder?: string;
  disabled?: boolean;
  /** Rótulo acessível quando não há `<label>` associado por `htmlFor`. */
  ariaLabel?: string;
}

/** Input de moeda BRL controlado (centavos internamente via máscara). */
export function CurrencyInput({
  value,
  onChange,
  style,
  placeholder,
  disabled,
  ariaLabel,
}: CurrencyInputProps) {
  const [display, setDisplay] = useState(value > 0 ? fmtBRL(value) : "");

  useEffect(() => {
    setDisplay(value > 0 ? fmtBRL(value) : "");
  }, [value]);

  if (disabled) {
    return (
      <input
        type="text"
        value={value > 0 ? fmtBRL(value) : ""}
        readOnly
        disabled
        aria-label={ariaLabel}
        style={{ ...style, opacity: 0.8, cursor: "not-allowed" }}
      />
    );
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      placeholder={placeholder ?? "R$ 0,00"}
      aria-label={ariaLabel}
      onChange={(e) => {
        const masked = maskBRL(e.target.value);
        setDisplay(masked);
        onChange(parseBRL(masked));
      }}
      onFocus={(e) => {
        if (!display) setDisplay(fmtBRL(0));
        e.target.select();
      }}
      onBlur={() => {
        if (value === 0) setDisplay("");
      }}
      style={style}
    />
  );
}
