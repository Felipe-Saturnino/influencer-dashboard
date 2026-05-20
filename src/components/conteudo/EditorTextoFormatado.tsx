import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { Bold, Italic, List, Underline } from "lucide-react";
import { FONT } from "../../constants/theme";

type ThemePick = {
  cardBorder: string;
  inputBg?: string;
  cardBg?: string;
  text: string;
  textMuted: string;
};

export function EditorTextoFormatado({
  value,
  onChange,
  t,
  ariaLabel,
  hasError,
}: {
  value: string;
  onChange: (html: string) => void;
  t: ThemePick;
  ariaLabel: string;
  hasError?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || el.innerHTML === value) return;
    el.innerHTML = value || "";
  }, [value]);

  const sync = useCallback(() => {
    onChange(ref.current?.innerHTML ?? "");
  }, [onChange]);

  const exec = (cmd: string, val?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, val);
    sync();
  };

  const btnTool = (label: string, onClick: () => void, icon: ReactNode) => (
    <button
      type="button"
      aria-label={label}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        border: `1px solid ${t.cardBorder}`,
        background: t.inputBg ?? t.cardBg,
        color: t.textMuted,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icon}
    </button>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }} role="toolbar" aria-label="Formatação de texto">
        {btnTool("Negrito", () => exec("bold"), <Bold size={14} aria-hidden />)}
        {btnTool("Itálico", () => exec("italic"), <Italic size={14} aria-hidden />)}
        {btnTool("Sublinhado", () => exec("underline"), <Underline size={14} aria-hidden />)}
        {btnTool("Lista com marcadores", () => exec("insertUnorderedList"), <List size={14} aria-hidden />)}
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-label={ariaLabel}
        aria-multiline="true"
        onInput={sync}
        onBlur={sync}
        style={{
          minHeight: 140,
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px solid ${hasError ? "#e84025" : t.cardBorder}`,
          background: t.inputBg ?? t.cardBg,
          color: t.text,
          fontSize: 13,
          fontFamily: FONT.body,
          lineHeight: 1.5,
          outline: "none",
        }}
      />
    </div>
  );
}
