import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import type { AcademyCronogramaHistorico } from "../../../lib/academyCronogramaTypes";
import { fmtDataHoraCatalogo } from "../../../lib/academyCronogramaUi";

export function CronogramaHistoricoLista({
  t,
  linhas,
  loading,
  erro,
}: {
  t: Theme;
  linhas: AcademyCronogramaHistorico[];
  loading: boolean;
  erro: string | null;
}) {
  if (loading) {
    return <p style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>Carregando histórico…</p>;
  }
  if (erro) {
    return (
      <p role="alert" style={{ fontSize: 13, color: "#e84025", fontFamily: FONT.body }}>
        {erro}
      </p>
    );
  }
  if (linhas.length === 0) {
    return <p style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>Nenhuma alteração registrada.</p>;
  }
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      {linhas.map((linha) => (
        <li
          key={linha.id}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg ?? t.cardBg,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text, fontFamily: FONT.body }}>{linha.acao}</div>
          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4, fontFamily: FONT.body }}>
            {fmtDataHoraCatalogo(linha.created_at)} · {linha.autor_nome}
          </div>
        </li>
      ))}
    </ul>
  );
}
