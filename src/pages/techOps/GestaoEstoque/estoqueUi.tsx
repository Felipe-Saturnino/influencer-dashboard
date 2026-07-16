/* eslint-disable react-refresh/only-export-components -- helpers de estilo + componentes partilhados da secção. */
import type { CSSProperties, ReactNode } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";

type ThemeLike = {
  text: string;
  textMuted: string;
  cardBorder: string;
  inputBg: string;
  isDark: boolean;
};

/* ─── Formulários ─────────────────────────────────────────────────────────── */

export function getEstoqueLabelStyle(t: ThemeLike): CSSProperties {
  return {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: t.textMuted,
    marginBottom: 6,
    fontFamily: FONT.body,
  };
}

export function getEstoqueInputStyle(t: ThemeLike): CSSProperties {
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

export function getEstoqueHintStyle(t: ThemeLike): CSSProperties {
  return {
    fontSize: 11,
    color: t.textMuted,
    marginTop: 4,
    fontFamily: FONT.body,
  };
}

/** Grid de 2 colunas para campos de formulário/leitura em modais. */
export const ESTOQUE_FORM_GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
};

export function ErroInlineEstoque({ children }: { children: ReactNode }) {
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

/* ─── Leitura (modal Ver) ─────────────────────────────────────────────────── */

export function CampoLeituraEstoque({ label, valor }: { label: string; valor: ReactNode }) {
  const { theme: t } = useApp();
  return (
    <div style={{ minWidth: 0 }}>
      <div style={getEstoqueLabelStyle(t)}>{label}</div>
      <div
        style={{
          ...getEstoqueInputStyle(t),
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

/** Bloco titulado dentro do modal Ver (ex.: «Quantidade», «Valores»). */
export function BlocoInfoEstoque({ titulo, children }: { titulo: string; children: ReactNode }) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  return (
    <div
      style={{
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 12,
        padding: 14,
        marginTop: 14,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: brand.primary,
          fontFamily: FONT.body,
          marginBottom: 10,
        }}
      >
        {titulo}
      </div>
      <div style={ESTOQUE_FORM_GRID}>{children}</div>
    </div>
  );
}

/* ─── Botão primário de modal (Registrar / Salvar) ────────────────────────── */

export function BotaoPrimarioModalEstoque({
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

/* ─── Badge de status (workflow do domínio) ───────────────────────────────── */

export function BadgeEstoque({ label, cor }: { label: string; cor: string }) {
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

/* ─── KPI clicável (Consolidado) ──────────────────────────────────────────── */

export function KpiEstoqueCard({
  label,
  valor,
  cor,
  active,
  onClick,
  breakdown,
}: {
  label: string;
  valor: number;
  cor: string;
  active: boolean;
  onClick: () => void;
  breakdown: { label: string; valor: number }[];
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
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: cor,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: t.text, fontVariantNumeric: "tabular-nums" }}>
        {valor.toLocaleString("pt-BR")}
      </div>
      <div style={{ marginTop: 10, display: "grid", gap: 4 }}>
        {breakdown.map((b) => (
          <div
            key={b.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              fontSize: 11,
              color: t.textMuted,
            }}
          >
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {b.label}
            </span>
            <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, color: t.text }}>
              {b.valor.toLocaleString("pt-BR")}
            </span>
          </div>
        ))}
      </div>
    </button>
  );
}

/* ─── Estado vazio de lista ───────────────────────────────────────────────── */

export function VazioEstoque({ children }: { children: ReactNode }) {
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

/* ─── Valores monetários (input pt-BR) ────────────────────────────────────── */

/** Converte texto pt-BR («1.234,56») em número; devolve null se inválido. */
export function parseValorEstoque(texto: string): number | null {
  const limpo = texto.trim().replace(/\./g, "").replace(",", ".");
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
