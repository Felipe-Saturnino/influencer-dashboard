import type { CSSProperties } from "react";

export function getFormacaoInputStyle(t: {
  cardBorder: string;
  inputBg: string;
  text: string;
}): CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 13,
    fontFamily: "inherit",
  };
}

export function getFormacaoBtnIconTabela(t: { cardBorder: string; inputBg: string }): CSSProperties {
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

export function getFormacaoStatusBadgeStyle(cor: string): CSSProperties {
  return {
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
  };
}

export function getFormacaoSectionHeaderStyle(): CSSProperties {
  return {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  };
}
