export const FONT = {
  /** Usa var(--brand-fontFamily) quando operador tem fonte customizada; fallback título Spin */
  title: "var(--brand-fontFamily, 'Barlow Condensed', 'Impact', 'Arial Black', sans-serif)",
  /** Usa var(--brand-fontFamily) quando operador tem fonte customizada; fallback Spin (Inter) */
  body:  "var(--brand-fontFamily, 'Inter', 'Helvetica Neue', Arial, sans-serif)",
};

/** KPIs / páginas densas — NHD Bold + brand; distinto de {@link FONT.title} (Barlow em seções). */
export const FONT_TITLE = "var(--brand-fontFamily, 'NHD Bold', 'nhd-bold', sans-serif)";

export const BASE_COLORS = {
  blue:   "#1e36f8",
  red:    "#e94025",
  purple: "#4a3082",
};

/** Cores semânticas Spin (conteúdo / roteiro) — evita duplicar hex em cada página. */
export const BRAND_SEMANTIC = {
  azul: BASE_COLORS.blue,
  vermelho: BASE_COLORS.red,
  roxo: "#4a2082",
  ciano: "#70cae4",
  verde: "#22c55e",
  amarelo: "#f59e0b",
  azulLight: "rgba(30,54,248,0.12)",
  azulBorder: "rgba(30,54,248,0.30)",
  vermelhoLight: "rgba(232,64,37,0.10)",
  vermelhoBorder: "rgba(232,64,37,0.30)",
  roxoLight: "rgba(74,32,130,0.12)",
  roxoBorder: "rgba(74,32,130,0.30)",
  cianoLight: "rgba(112,202,228,0.12)",
  cianoBorder: "rgba(112,202,228,0.30)",
  roxoVivo: "#7c3aed",
  cinza: "#6b7280",
} as const;

export const DARK_THEME = {
  bg:           "#0f0f1a",
  sidebar:      "linear-gradient(180deg, #2d1b4e 0%, #0a0a0f 100%)",
  sidebarBorder:"#1a1a2e",
  headerBg:     "#1a1a2e",
  headerBorder: "#2a2a4e",
  headerText:   "#ffffff",
  cardBg:       "#1a1a2e",
  cardBorder:   "#2a2a4e",
  inputBg:      "rgba(255,255,255,0.07)",
  inputBorder:  "rgba(255,255,255,0.15)",
  inputText:    "#ffffff",
  label:        "#aaaacc",
  text:         "#ffffff",
  textMuted:    "#e5dce1",
  sectionTitle: "#ffffff",
  divider:      "#2a2a4e",
  isDark:       true,
};

export const LIGHT_THEME = {
  bg:           "#f4f4f8",
  sidebar:      "linear-gradient(180deg, #2d1b4e 0%, #0a0a0f 100%)",
  sidebarBorder:"#1a1a2e",
  headerBg:     "#ffffff",
  headerBorder: "#e8e8f0",
  headerText:   "#000000",
  cardBg:       "#ffffff",
  cardBorder:   "#e8e8f0",
  inputBg:      "#f8f8fc",
  inputBorder:  "#d0d0e0",
  inputText:    "#1a1a2e",
  label:        "#444466",
  text:         "#1a1a2e",
  textMuted:    "#666688",
  sectionTitle: "#1a1a2e",
  divider:      "#e8e8f0",
  isDark:       false,
};

export type Theme = typeof LIGHT_THEME;
