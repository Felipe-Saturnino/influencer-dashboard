import { Layers } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { FONT } from "../../../../constants/theme";
import SectionTitle from "../../../../components/dashboard/SectionTitle";
import {
  type ConcorrenteLobby,
  type LobbyExecucaoRow,
  fmtPosicao,
  fmtUltimaAtualizacao,
  posicaoTextColor,
} from "../../../../lib/lobbyMonitorHelpers";

interface Props {
  card: React.CSSProperties;
  ultimaGlobal: LobbyExecucaoRow | null;
  jogos: ConcorrenteLobby[];
}

export default function VitrinePiorMesaCard({ card, ultimaGlobal, jogos }: Props) {
  const { theme: t } = useApp();

  return (
    <div style={{ ...card, marginBottom: 14 }}>
      <SectionTitle icon={<Layers size={15} />}>Vitrine acima da mesa mais atrás</SectionTitle>
      <p style={{ fontSize: 11, color: t.textMuted, margin: "0 0 8px", fontFamily: FONT.body }}>
        {fmtUltimaAtualizacao(ultimaGlobal?.executado_em)}
      </p>
      {ultimaGlobal?.pior_mesa_posicao != null && ultimaGlobal.pior_mesa_nome ? (
        <p style={{ fontSize: 12, color: t.text, margin: "0 0 12px", fontFamily: FONT.body, fontWeight: 600 }}>
          Mesa de referência: {fmtPosicao(ultimaGlobal.pior_mesa_posicao)} — {ultimaGlobal.pior_mesa_nome}
        </p>
      ) : null}
      {jogos.length === 0 ? (
        <p style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body, margin: 0 }}>
          {ultimaGlobal?.pior_mesa_posicao == null
            ? "Nenhuma mesa Spin localizada na última coleta."
            : "Nenhum jogo de concorrente acima dessa posição na última coleta."}
        </p>
      ) : (
        <div className="app-table-wrap" style={{ maxHeight: 360 }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              fontFamily: FONT.body,
              fontSize: 12,
            }}
          >
            <caption style={{ display: "none" }}>
              Jogos de concorrentes na vitrine acima da mesa Spin em pior posição
            </caption>
            <thead>
              <tr>
                <th scope="col" style={{ textAlign: "left", padding: "8px 10px", color: t.textMuted }}>
                  Pos.
                </th>
                <th scope="col" style={{ textAlign: "left", padding: "8px 10px", color: t.textMuted }}>
                  Jogo
                </th>
                <th scope="col" style={{ textAlign: "left", padding: "8px 10px", color: t.textMuted }}>
                  Provedor
                </th>
              </tr>
            </thead>
            <tbody>
              {jogos.map((j) => (
                <tr key={`${j.game_id}-${j.posicao}`}>
                  <td style={{ padding: "8px 10px", fontWeight: 700, color: posicaoTextColor(j.posicao) }}>
                    {fmtPosicao(j.posicao)}
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      color: t.text,
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={j.name}
                  >
                    {j.name}
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      color: t.textMuted,
                      maxWidth: 140,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={j.provider_name}
                  >
                    {j.provider_name || j.provider_slug || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ fontSize: 11, color: t.textMuted, margin: "10px 0 0", fontFamily: FONT.body }}>
        {jogos.length.toLocaleString("pt-BR")} {jogos.length === 1 ? "jogo" : "jogos"} de concorrentes (qualquer
        categoria) acima de{" "}
        {ultimaGlobal?.pior_mesa_posicao != null ? fmtPosicao(ultimaGlobal.pior_mesa_posicao) : "—"}.
      </p>
    </div>
  );
}
