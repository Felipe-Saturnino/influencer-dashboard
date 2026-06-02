import type { CSSProperties } from "react";

export function getExperienciaInputStyle(t: {
  cardBorder: string;
  inputBg: string;
  text: string;
}): CSSProperties {
  return {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 13,
    fontFamily: "inherit",
  };
}

export function getExperienciaBtnIconTabela(t: { cardBorder: string; inputBg: string }): CSSProperties {
  return {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  };
}

export function getExperienciaSectionHeaderStyle(): CSSProperties {
  return {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  };
}
