import { BRAND } from "./constants";

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
}

/** Checkbox visual customizado — consistente em Dark/Light mode, independente do browser */
export function Checkbox({ checked, onChange }: CheckboxProps) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 16,
        height: 16,
        borderRadius: 4,
        flexShrink: 0,
        border: `1.5px solid ${checked ? BRAND.roxoVivo : "#9ca3af"}`,
        background: checked ? BRAND.roxoVivo : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {checked && (
        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
          <path d="M1 3.5L3.5 6L8 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}
