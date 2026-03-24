import { useState, useEffect } from "react";

/**
 * Corresponde a media queries CSS (ex.: layout responsivo, drawer no mobile).
 * Usa matchMedia — alinhado aos breakpoints em global.css (--app-breakpoint-nav etc.).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** Largura máxima em que o menu vira drawer (deve bater com @media em global.css). */
export const MEDIA_MAX_NAV_DRAWER = "(max-width: 900px)";
