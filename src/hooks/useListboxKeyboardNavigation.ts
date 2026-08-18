import { useEffect, useRef, useState, type KeyboardEvent } from "react";

type ListboxKeyboardOptions<T> = {
  items: readonly T[];
  onSelect: (item: T) => void;
  /** Fecha só o painel/dropdown aberto — Escape nunca fecha o modal. */
  onEscape?: () => void;
};

/**
 * Navegação canônica para listas pesquisáveis: ↑/↓ percorrem, Home/End saltam,
 * Enter seleciona e Escape fecha o painel (`onEscape`) sem propagar.
 */
export function useListboxKeyboardNavigation<T>({
  items,
  onSelect,
  onEscape,
}: ListboxKeyboardOptions<T>) {
  const [activeIndex, setActiveIndex] = useState(0);
  const optionRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(items.length - 1, 0)));
  }, [items.length]);

  useEffect(() => {
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onEscape?.();
      return;
    }

    if (items.length === 0) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const delta = e.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => (current + delta + items.length) % items.length);
      return;
    }
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setActiveIndex(e.key === "Home" ? 0 : items.length - 1);
      return;
    }
    if (e.key === "Enter") {
      const item = items[activeIndex];
      if (!item) return;
      e.preventDefault();
      onSelect(item);
    }
  }

  return { activeIndex, setActiveIndex, optionRefs, onKeyDown };
}
