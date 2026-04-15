/**
 * Validação e normalização do brandguide (perfil Operador).
 * Distância de matiz em círculo (0–360°); ajuste de luminância simples até contraste mínimo.
 */

const SPIN_FALLBACK = {
  action: "#7c3aed",
  contrast: "#1e36f8",
  bg: "#0f0f1a",
  text: "#ffffff",
} as const;

const HUE_SEMANTICO_NEGATIVO = 14;
const MARGEM_HUE_SEMANTICO = 20;
const RATIO_ACTION_MIN = 4.5;
const RATIO_CONTRAST_MIN = 3.0;
const RATIO_TEXT_MIN = 7.0;
const HUE_MIN_SEP_CONTRAST = 20;

function normalizeHex(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(s)) return null;
  return s.toLowerCase();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = normalizeHex(hex);
  if (!h) return null;
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  };
}

function hexToLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const toLinear = (c: number) => {
    const x = c / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = hexToLuminance(hex1);
  const l2 = hexToLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Matiz 0–360 (aprox. RGB → HSL). */
export function hexToHue(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return Math.round(h * 360);
}

/** Distância angular mínima entre dois matizes (0–180). */
export function hueDistanceDeg(h1: number, h2: number): number {
  const d = Math.abs(h1 - h2) % 360;
  return Math.min(d, 360 - d);
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function aumentarLuminosidade(hex: string, deltaPct: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const f = 1 + deltaPct / 100;
  return rgbToHex(rgb.r * f, rgb.g * f, rgb.b * f);
}

function ajustarContraste(corAlvo: string, corReferencia: string, ratioMinimo: number): string {
  let hex = corAlvo;
  for (let i = 0; i < 24; i++) {
    if (contrastRatio(hex, corReferencia) >= ratioMinimo) return hex;
    hex = aumentarLuminosidade(hex, 6);
  }
  return hex;
}

export interface BrandInput {
  action?: string | null;
  contrast?: string | null;
  bg?: string | null;
  text?: string | null;
}

export interface BrandValidated {
  action: string;
  contrast: string;
  bg: string;
  text: string;
  warnings: string[];
}

/**
 * Valida e corrige as 4 cores base do brandguide.
 */
export function validarBrandguide(input: Partial<BrandInput>): BrandValidated {
  const warnings: string[] = [];

  const bg = normalizeHex(input.bg) ?? SPIN_FALLBACK.bg;
  const text = normalizeHex(input.text) ?? SPIN_FALLBACK.text;
  let action = normalizeHex(input.action) ?? SPIN_FALLBACK.action;
  let contrast = normalizeHex(input.contrast) ?? SPIN_FALLBACK.contrast;

  if (!normalizeHex(input.bg)) warnings.push("brand_bg ausente ou inválido — usando fallback Spin.");
  if (!normalizeHex(input.text)) warnings.push("brand_text ausente ou inválido — usando fallback Spin.");
  if (!normalizeHex(input.action)) warnings.push("brand_action ausente ou inválido — usando fallback Spin.");
  if (!normalizeHex(input.contrast)) warnings.push("brand_contrast ausente ou inválido — usando fallback Spin.");

  if (contrastRatio(action, bg) < RATIO_ACTION_MIN) {
    warnings.push(`--brand-action contraste insuficiente sobre o fundo — ajustando luminosidade.`);
    action = ajustarContraste(action, bg, RATIO_ACTION_MIN);
  }

  if (contrastRatio(contrast, bg) < RATIO_CONTRAST_MIN) {
    warnings.push(`--brand-contrast contraste insuficiente sobre o fundo — ajustando luminosidade.`);
    contrast = ajustarContraste(contrast, bg, RATIO_CONTRAST_MIN);
  }

  let textFinal = text;
  if (contrastRatio(text, bg) < RATIO_TEXT_MIN) {
    warnings.push(`--brand-text contraste insuficiente sobre o fundo — usando #ffffff.`);
    textFinal = "#ffffff";
  }

  const hueAction = hexToHue(action);
  const dNeg = hueDistanceDeg(hueAction, HUE_SEMANTICO_NEGATIVO);
  if (dNeg <= MARGEM_HUE_SEMANTICO) {
    warnings.push(
      `--brand-action (${action}, matiz ~${hueAction}°) próximo do vermelho semântico de erro (~${HUE_SEMANTICO_NEGATIVO}°). ` +
        "A cor de erro de dados (#e84025) não é alterada — revise a paleta se houver confusão visual."
    );
  }

  const dAC = hueDistanceDeg(hueAction, hexToHue(contrast));
  if (dAC < HUE_MIN_SEP_CONTRAST) {
    warnings.push(
      "--brand-contrast muito próximo de --brand-action em matiz — usando azul Spin como contraste."
    );
    contrast = SPIN_FALLBACK.contrast;
    if (contrastRatio(contrast, bg) < RATIO_CONTRAST_MIN) {
      contrast = ajustarContraste(contrast, bg, RATIO_CONTRAST_MIN);
    }
  }

  return { action, contrast, bg, text: textFinal, warnings };
}

/** Derivadas CSS (valores para `style.setProperty`). */
export function cssDerivadasBrand(brand: BrandValidated): Record<string, string> {
  const { action, contrast, bg, text } = brand;
  return {
    "--brand-action-12": `color-mix(in srgb, ${action} 12%, transparent)`,
    "--brand-action-20": `color-mix(in srgb, ${action} 20%, transparent)`,
    "--brand-action-30": `color-mix(in srgb, ${action} 30%, transparent)`,
    "--brand-action-border": `color-mix(in srgb, ${action} 35%, transparent)`,
    "--brand-contrast-12": `color-mix(in srgb, ${contrast} 12%, transparent)`,
    "--brand-contrast-30": `color-mix(in srgb, ${contrast} 30%, transparent)`,
    "--brand-surface": `color-mix(in srgb, ${text} 5%, ${bg})`,
    "--brand-surface-hi": `color-mix(in srgb, ${text} 9%, ${bg})`,
    "--brand-icon-color": `color-mix(in srgb, ${text} 70%, ${bg})`,
  };
}

export { SPIN_FALLBACK };
