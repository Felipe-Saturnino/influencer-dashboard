import { FONT } from "../../../constants/theme";

type ThemePick = {
  cardBorder: string;
  inputBg?: string;
  textMuted: string;
  text: string;
};

export function AcademyPortalJogosMultiSelect({
  opcoes,
  selected,
  onChange,
  t,
  hasError,
}: {
  opcoes: string[];
  selected: string[];
  onChange: (jogos: string[]) => void;
  t: ThemePick;
  hasError?: boolean;
}) {
  function toggle(jogo: string) {
    onChange(selected.includes(jogo) ? selected.filter((j) => j !== jogo) : [...selected, jogo]);
  }

  if (opcoes.length === 0) {
    return (
      <p style={{ fontSize: 12, color: t.textMuted, margin: 0, fontFamily: FONT.body }}>
        Nenhum jogo cadastrado em Gestão de Estúdios.
      </p>
    );
  }

  return (
    <div
      id="ap-jogo"
      role="group"
      aria-label="Qual jogo"
      aria-invalid={hasError || undefined}
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        padding: hasError ? "10px 12px" : undefined,
        borderRadius: hasError ? 10 : undefined,
        border: hasError ? "1px solid #e84025" : undefined,
      }}
    >
      {opcoes.map((jogo) => {
        const checked = selected.includes(jogo);
        return (
          <button
            key={jogo}
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-label={jogo}
            onClick={() => toggle(jogo)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 14px",
              borderRadius: 999,
              border: `1px solid ${checked ? "#22c55e" : t.cardBorder}`,
              background: checked ? "#22c55e22" : t.inputBg ?? "transparent",
              color: checked ? "#22c55e" : t.textMuted,
              fontSize: 12,
              fontWeight: checked ? 700 : 500,
              fontFamily: FONT.body,
              cursor: "pointer",
            }}
          >
            {jogo}
          </button>
        );
      })}
    </div>
  );
}
