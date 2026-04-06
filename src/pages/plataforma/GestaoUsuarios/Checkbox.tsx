interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  /** Usado como aria-label quando o rótulo visível não está associado por id */
  label?: string;
}

/** Checkbox acessível — teclado Espaço/Enter, sem input nativo */
export function Checkbox({ checked, onChange, label }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      tabIndex={0}
      onClick={onChange}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onChange();
        }
      }}
      style={{
        width: 16,
        height: 16,
        borderRadius: 4,
        flexShrink: 0,
        border: `1.5px solid ${checked ? "var(--brand-primary, #7c3aed)" : "#9ca3af"}`,
        background: checked ? "var(--brand-primary, #7c3aed)" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.15s",
        padding: 0,
        outline: "none",
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow =
          "0 0 0 2px color-mix(in srgb, var(--brand-primary, #7c3aed) 40%, transparent)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {checked && (
        <svg width="9" height="7" viewBox="0 0 9 7" fill="none" aria-hidden="true">
          <path
            d="M1 3.5L3.5 6L8 1"
            stroke="#fff"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
