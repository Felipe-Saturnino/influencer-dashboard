import type { KeyboardEvent } from "react";

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
  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
  e.preventDefault();
  const idx = orderedTabs.indexOf(currentKey);
  if (idx < 0) return;
  const nextIdx =
    e.key === "ArrowRight"
      ? (idx + 1) % orderedTabs.length
      : (idx - 1 + orderedTabs.length) % orderedTabs.length;
  const next = orderedTabs[nextIdx];
  onSelect(next);
  requestAnimationFrame(() => {
    document.getElementById(`${tabIdPrefix}${next}`)?.focus();
  });
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
