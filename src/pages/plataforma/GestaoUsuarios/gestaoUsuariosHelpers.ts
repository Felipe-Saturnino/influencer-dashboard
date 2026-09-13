import type { CSSProperties, KeyboardEvent } from "react";
import { handleFiltroBarTabsArrowKeyDown } from "../../../lib/filterBarStyles";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";

/** Copy canónica de erro de save (Global § Erros). */
export const MSG_ERRO_SALVAR_GESTAO =
  "Não foi possível salvar. Se o problema persistir, entre em contato com o suporte.";

export const MSG_ERRO_SALVAR_RECARREGAR =
  "Não foi possível concluir o salvamento. Recarregue a página para verificar o estado atual. Se o problema persistir, entre em contato com o suporte.";

export const MSG_ERRO_CARREGAR_GESTAO =
  "Não foi possível carregar os dados. Se o problema persistir, entre em contato com o suporte.";

/**
 * Sync seguro: INSERT dos novos primeiro, depois DELETE dos removidos.
 * Se o insert falhar, a matriz antiga permanece; se só o delete falhar, sobram extras (não fica vazia).
 */
export async function sincronizarLinhasTabela<T extends Record<string, string>>(opts: {
  table: string;
  existing: T[];
  desired: T[];
  keyOf: (row: T) => string;
  deleteEq: (row: T) => PromiseLike<{ error: { message: string } | null }>;
}): Promise<"ok" | "insert" | "delete"> {
  const existingKeys = new Set(opts.existing.map(opts.keyOf));
  const desiredKeys = new Set(opts.desired.map(opts.keyOf));
  const toInsert = opts.desired.filter((r) => !existingKeys.has(opts.keyOf(r)));
  const toDelete = opts.existing.filter((r) => !desiredKeys.has(opts.keyOf(r)));

  if (toInsert.length > 0) {
    const { error } = await supabase.from(opts.table).insert(toInsert);
    if (error) {
      console.error(`[GestaoUsuarios] insert ${opts.table}:`, error);
      return "insert";
    }
  }

  for (const row of toDelete) {
    const { error } = await opts.deleteEq(row);
    if (error) {
      console.error(`[GestaoUsuarios] delete ${opts.table}:`, error);
      return "delete";
    }
  }
  return "ok";
}

export const BRAND_FOCUS_BORDER = "var(--brand-primary, #7c3aed)";

export function onInputFocusBrand(e: { currentTarget: HTMLInputElement | HTMLSelectElement }) {
  e.currentTarget.style.borderColor = BRAND_FOCUS_BORDER;
}

export function onInputBlurBrand(
  e: { currentTarget: HTMLInputElement | HTMLSelectElement },
  defaultBorder: string,
) {
  e.currentTarget.style.borderColor = defaultBorder;
}

export function handleGestaoTabsArrowKeyDown<T extends string>(
  e: KeyboardEvent<HTMLButtonElement>,
  orderedTabs: readonly T[],
  currentKey: T,
  onSelect: (key: T) => void,
  tabIdPrefix: string,
) {
  handleFiltroBarTabsArrowKeyDown(e, orderedTabs, currentKey, onSelect, tabIdPrefix);
}

export function ctaGradientSalvar(
  brand: { useBrand: boolean },
  salvando: boolean,
  cinza: string,
): string {
  if (salvando) return cinza;
  return brand.useBrand
    ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
    : "linear-gradient(135deg, #4a2082, #1e36f8)";
}

export function tabAtivaPrincipalStyle(ativa: boolean, cardBorder: string, inputBg?: string): {
  background: string;
  border: string;
  color: string;
  fontWeight: number;
} {
  if (!ativa) {
    return {
      background: inputBg ?? "transparent",
      border: `1px solid ${cardBorder}`,
      color: "inherit",
      fontWeight: 400,
    };
  }
  return {
    background: "color-mix(in srgb, var(--brand-primary, #7c3aed) 15%, transparent)",
    border: "1px solid var(--brand-primary, #7c3aed)",
    color: "var(--brand-primary, #7c3aed)",
    fontWeight: 700,
  };
}

export function brandTintBg(level: "12" | "8" | "7", cssVar = "var(--brand-primary, #4a2082)"): string {
  const pct = level === "12" ? "12%" : level === "8" ? "8%" : "7%";
  return `color-mix(in srgb, ${cssVar} ${pct}, transparent)`;
}

/** Cabeçalho de seção na grade Escopos — altura uniforme (2 linhas) + título centralizado. */
export function getEscopoSecaoHeaderStyle(
  background: string,
  cardBorder: string,
  textMuted: string,
): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    boxSizing: "border-box",
    padding: "10px 12px",
    background,
    borderBottom: `2px solid ${cardBorder}`,
    fontFamily: FONT.body,
    fontWeight: 700,
    fontSize: 11,
    color: textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    textAlign: "center",
    lineHeight: 1.25,
  };
}
