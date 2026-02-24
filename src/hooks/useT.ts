import { useApp } from "../context/AppContext";
import { translations } from "../constants/i18n";

export function useT() {
  const { lang } = useApp();
  return translations[lang];
}
