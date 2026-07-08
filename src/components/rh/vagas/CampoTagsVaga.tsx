import { useState, type CSSProperties, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { FONT } from "../../../constants/theme";
import { CampoObrigatorioMark } from "../../CampoObrigatorioMark";
import {
  adicionarTagVaga,
  mensagemErroAdicionarTagVaga,
  removerTagVaga,
  RH_VAGA_TAG_MAX_LEN,
} from "../../../lib/rhVagaTags";

type Theme = {
  text: string;
  textMuted: string;
  cardBorder: string;
  inputBg: string;
};

export function CampoTagsVaga({
  id,
  label = "Tags",
  value,
  onChange,
  t,
  inputStyle,
  erro,
  obrigatorio = false,
}: {
  id: string;
  label?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  t: Theme;
  inputStyle: CSSProperties;
  erro?: string;
  obrigatorio?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [erroLocal, setErroLocal] = useState<string | null>(null);

  function tentarAdicionar(raw: string) {
    const res = adicionarTagVaga(value, raw);
    if (!res.ok) {
      const msg = mensagemErroAdicionarTagVaga(res.reason);
      if (msg) setErroLocal(msg);
      return;
    }
    setErroLocal(null);
    onChange(res.tags);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      tentarAdicionar(draft);
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(removerTagVaga(value, value.length - 1));
    }
  }

  return (
    <div style={{ marginBottom: 18 }}>
      <label htmlFor={id} style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}>
        {label}
        {obrigatorio ? <CampoObrigatorioMark /> : null}
      </label>
      <input
        id={id}
        type="text"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          if (erroLocal) setErroLocal(null);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (draft.trim()) tentarAdicionar(draft);
        }}
        placeholder="Digite uma tag e pressione Enter..."
        maxLength={RH_VAGA_TAG_MAX_LEN}
        autoComplete="off"
        style={inputStyle}
      />
      {value.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {value.map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
                padding: "3px 8px 3px 10px",
                borderRadius: 20,
                background: "color-mix(in srgb, var(--brand-primary, #7c3aed) 12%, transparent)",
                color: "var(--brand-primary, #7c3aed)",
                border: "1px solid color-mix(in srgb, var(--brand-primary, #7c3aed) 28%, transparent)",
                fontFamily: FONT.body,
              }}
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(removerTagVaga(value, i))}
                aria-label={`Remover tag ${tag}`}
                title={`Remover tag ${tag}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 18,
                  height: 18,
                  padding: 0,
                  border: "none",
                  borderRadius: 999,
                  background: "transparent",
                  color: "inherit",
                  cursor: "pointer",
                }}
              >
                <X size={12} aria-hidden />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {erroLocal ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 6 }}>{erroLocal}</div> : null}
      {erro ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 6 }}>{erro}</div> : null}
    </div>
  );
}
