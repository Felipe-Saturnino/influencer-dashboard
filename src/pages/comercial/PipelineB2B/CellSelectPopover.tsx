import { useEffect, useRef } from "react";
import { FONT } from "../../../constants/theme";

export function CellSelectPopover<T extends string>({
  open,
  anchorRect,
  options,
  value,
  onSelect,
  onClose,
  labelOption,
  t,
}: {
  open: boolean;
  anchorRect: DOMRect | null;
  options: readonly T[];
  value: T;
  onSelect: (v: T) => void;
  onClose: () => void;
  labelOption: (v: T) => string;
  t: { cardBg: string; cardBorder: string; text: string };
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);

  if (!open || !anchorRect) return null;

  const top = Math.min(anchorRect.bottom + 6, window.innerHeight - 220);
  const left = Math.min(anchorRect.left, window.innerWidth - 220);

  return (
    <>
      <div
        role="presentation"
        style={{ position: "fixed", inset: 0, zIndex: 900 }}
        onMouseDown={onClose}
      />
      <div
        ref={ref}
        role="listbox"
        aria-label="Opções"
        style={{
          position: "fixed",
          zIndex: 901,
          top,
          left,
          minWidth: 200,
          maxWidth: 280,
          maxHeight: 240,
          overflowY: "auto",
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          padding: 6,
        }}
      >
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            role="option"
            aria-selected={opt === value}
            onClick={() => {
              onSelect(opt);
              onClose();
            }}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "8px 12px",
              border: "none",
              borderRadius: 8,
              background:
                opt === value
                  ? "color-mix(in srgb, var(--brand-accent, #1e36f8) 12%, transparent)"
                  : "transparent",
              color: t.text,
              fontSize: 13,
              fontFamily: FONT.body,
              fontWeight: opt === value ? 700 : 500,
              cursor: "pointer",
            }}
          >
            {labelOption(opt)}
          </button>
        ))}
      </div>
    </>
  );
}
