import { FONT } from "../../../constants/theme";
import { labelCampoLinha4Kanban, labelLinha4CardKanban, labelTipoCandidatura } from "../../../lib/rhVagaCandidaturaKanban";
import type { RhVagaCandidaturaEtapa, RhVagaCandidaturaRow } from "../../../types/rhVagaCandidatura";
import type { RhVagaTipo } from "../../../types/rhVaga";

type Theme = {
  text: string;
  textMuted: string;
  cardBorder: string;
  inputBg: string;
  cardBg?: string;
};

export function CandidaturaKanbanCard({
  c,
  etapaColuna,
  t,
  onVer,
  onHistorico,
}: {
  c: RhVagaCandidaturaRow;
  etapaColuna: RhVagaCandidaturaEtapa;
  t: Theme;
  onVer: () => void;
  onHistorico: () => void;
}) {
  const codigo = (c.vaga?.codigo_vaga ?? "").trim() || "—";
  const tituloVaga = (c.vaga?.titulo ?? "").trim() || "—";
  const tipoCand = labelTipoCandidatura(c.vaga?.tipo_vaga as RhVagaTipo | undefined);
  const linha4Label = labelCampoLinha4Kanban(etapaColuna);
  const linha4Valor = labelLinha4CardKanban({ ...c, etapa: etapaColuna });

  const linhaStyle = { fontSize: 12, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body, lineHeight: 1.4 };
  const valorStyle = { color: t.text, fontWeight: 600 as const };

  const btnStyle = {
    padding: "6px 10px",
    borderRadius: 8,
    border: `1px solid ${t.cardBorder}`,
    background: t.cardBg ?? t.inputBg,
    color: t.text,
    fontWeight: 600,
    fontSize: 12,
    fontFamily: FONT.body,
    cursor: "pointer" as const,
  };

  return (
    <li
      style={{
        borderRadius: 10,
        border: `1px solid ${t.cardBorder}`,
        padding: 10,
        background: t.inputBg,
        listStyle: "none",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 8, fontFamily: FONT.body }}>{c.nome_completo}</div>
      {(c.email ?? "").trim() ? (
        <div style={{ ...linhaStyle, marginBottom: 6 }}>
          <span style={valorStyle}>{(c.email ?? "").trim()}</span>
        </div>
      ) : null}
      <div style={linhaStyle}>
        <span style={valorStyle}>{codigo}</span>
      </div>
      <div style={{ ...linhaStyle, marginBottom: 6 }}>{tituloVaga}</div>
      <div style={linhaStyle}>
        {linha4Label}: <span style={valorStyle}>{linha4Valor}</span>
      </div>
      {etapaColuna === "dispensado" ? (
        <div style={linhaStyle}>
          Motivo da Dispensa: <span style={valorStyle}>{(c.motivo_dispensa ?? "").trim() || "—"}</span>
        </div>
      ) : null}
      <div style={{ ...linhaStyle, marginBottom: 10 }}>Tipo: <span style={valorStyle}>{tipoCand}</span></div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" onClick={onVer} style={btnStyle} aria-label={`Ver candidatura de ${c.nome_completo}`}>
          Ver
        </button>
        <button type="button" onClick={onHistorico} style={btnStyle} aria-label={`Histórico de ${c.nome_completo}`}>
          Histórico
        </button>
      </div>
    </li>
  );
}
