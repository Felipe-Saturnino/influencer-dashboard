/** Deep-link Home → Galeria de Fotos (sub-aba + evento opcional). */

export const HOME_GALERIA_FOCUS_KEY = "home_galeria_focus_v1";

export type HomeGaleriaFocus = {
  subAba: "gerais" | "minhas_fotos";
  /** Quando `gerais`, filtra o álbum do evento. */
  eventoId?: string;
};

export function setHomeGaleriaFocus(focus: HomeGaleriaFocus): void {
  try {
    sessionStorage.setItem(HOME_GALERIA_FOCUS_KEY, JSON.stringify(focus));
  } catch {
    /* ignore */
  }
}

export function consumeHomeGaleriaFocus(): HomeGaleriaFocus | null {
  try {
    const raw = sessionStorage.getItem(HOME_GALERIA_FOCUS_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(HOME_GALERIA_FOCUS_KEY);
    const parsed = JSON.parse(raw) as HomeGaleriaFocus;
    if (parsed?.subAba !== "gerais" && parsed?.subAba !== "minhas_fotos") return null;
    return parsed;
  } catch {
    return null;
  }
}
