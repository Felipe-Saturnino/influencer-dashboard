/* eslint-disable react-refresh/only-export-components -- helpers de estilo + componentes partilhados da secção. */
import type { CSSProperties, ReactNode } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import {
  formatCodigoOrdemSaida,
  type OrdemSaidaItemRow,
  type OrdemSaidaRow,
  type OrdemSaidaTipo,
} from "../../../lib/techOpsOrdemSaida";

type ThemeLike = {
  text: string;
  textMuted: string;
  cardBorder: string;
  inputBg: string;
  isDark: boolean;
};

/* ─── Formulários ─────────────────────────────────────────────────────────── */

export function getOsLabelStyle(t: ThemeLike): CSSProperties {
  return {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: t.textMuted,
    marginBottom: 6,
    fontFamily: FONT.body,
  };
}

export function getOsInputStyle(t: ThemeLike): CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
  };
}

export function getOsHintStyle(t: ThemeLike): CSSProperties {
  return {
    fontSize: 11,
    color: t.textMuted,
    marginTop: 4,
    fontFamily: FONT.body,
  };
}

export const OS_FORM_GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
};

export function ErroInline({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}
    >
      {children}
    </div>
  );
}

export function CampoLeitura({ label, valor }: { label: string; valor: ReactNode }) {
  const { theme: t } = useApp();
  return (
    <div style={{ minWidth: 0 }}>
      <div style={getOsLabelStyle(t)}>{label}</div>
      <div
        style={{
          ...getOsInputStyle(t),
          minHeight: 20,
          fontWeight: 600,
          color: t.text,
          overflowWrap: "anywhere",
        }}
      >
        {valor ?? "—"}
      </div>
    </div>
  );
}

export function BotaoPrimario({
  onClick,
  loading,
  loadingLabel,
  disabled,
  children,
}: {
  onClick: () => void;
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const brand = useDashboardBrand();
  const off = disabled || loading;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={off}
      style={{
        width: "100%",
        marginTop: 18,
        padding: "11px 20px",
        borderRadius: 10,
        border: "none",
        cursor: off ? "not-allowed" : "pointer",
        opacity: off ? 0.7 : 1,
        background: getCtaCriarGradient(brand),
        color: "#fff",
        fontSize: 13,
        fontWeight: 700,
        fontFamily: FONT.body,
      }}
    >
      {loading ? (loadingLabel ?? "Salvando…") : children}
    </button>
  );
}

export function BadgeOs({ label, cor }: { label: string; cor: string }) {
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
      {label}
    </span>
  );
}

/** KPI clicável (sem breakdown) — filtro por status. */
export function KpiOsCard({
  label,
  valor,
  cor,
  active,
  onClick,
  hint,
}: {
  label: string;
  valor: number;
  cor: string;
  active: boolean;
  onClick: () => void;
  hint: string;
}) {
  const { theme: t } = useApp();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        textAlign: "left",
        cursor: "pointer",
        border: `1px solid ${active ? cor : t.cardBorder}`,
        background: active ? `color-mix(in srgb, ${cor} 10%, transparent)` : t.inputBg,
        borderRadius: 14,
        padding: "14px 16px",
        fontFamily: FONT.body,
        minWidth: 0,
        borderLeft: `3px solid ${cor}`,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: t.textMuted,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: cor,
          fontVariantNumeric: "tabular-nums",
          fontFamily: FONT.body,
        }}
      >
        {valor.toLocaleString("pt-BR")}
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: t.textMuted }}>{hint}</div>
    </button>
  );
}

export function VazioOs({ children }: { children: ReactNode }) {
  const { theme: t } = useApp();
  return (
    <div
      style={{
        padding: "40px 0",
        textAlign: "center",
        color: t.textMuted,
        fontSize: 13,
        fontFamily: FONT.body,
      }}
    >
      {children}
    </div>
  );
}

/** Máscara progressiva DD/MM/AAAA. */
export function mascaraDataBrOs(raw: string): string {
  const v = raw.replace(/\D/g, "").slice(0, 8);
  if (v.length > 4) return `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
  if (v.length > 2) return `${v.slice(0, 2)}/${v.slice(2)}`;
  return v;
}

/** Preview do próximo código (max+1 no mês corrente entre rows do mesmo tipo). */
export function previewCodigoOs(
  tipo: OrdemSaidaTipo,
  rows: OrdemSaidaRow[],
  competencia: string,
): string {
  const mes = competencia.slice(0, 7);
  const doMes = rows.filter((r) => r.tipo === tipo && r.competencia.slice(0, 7) === mes);
  const max = doMes.reduce((m, r) => Math.max(m, r.codigo_num), 0);
  return formatCodigoOrdemSaida(tipo, competencia.slice(0, 10), max + 1);
}

export function resumoItensOs(itens: OrdemSaidaItemRow[]): { label: string; tip: string } {
  const n = itens.length;
  const tip = itens
    .map((i) =>
      i.entidade_tipo === "equipamento" ? i.label_snapshot : `${i.label_snapshot} (x${i.quantidade})`,
    )
    .join("\n");
  return {
    label: n === 1 ? "1 item" : `${n} itens`,
    tip: tip || "—",
  };
}

export function CelulaItensOs({ itens, labelOverride }: { itens: OrdemSaidaItemRow[]; labelOverride?: string }) {
  const brand = useDashboardBrand();
  const { label, tip } = resumoItensOs(itens);
  return (
    <span
      title={tip}
      style={{
        fontWeight: 600,
        color: brand.accent,
        cursor: tip !== "—" ? "help" : "default",
        fontFamily: FONT.body,
      }}
    >
      {labelOverride ?? label}
    </span>
  );
}
