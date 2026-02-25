export const FONT = {
  title: "'Barlow Condensed', 'Impact', 'Arial Black', sans-serif",
  body:  "'Inter', 'Helvetica Neue', Arial, sans-serif",
};

export const BASE_COLORS = {
  blue:   "#1e36f8",
  red:    "#e94025",
  purple: "#4a3082",
};

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
