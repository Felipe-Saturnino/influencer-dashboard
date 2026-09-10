import type { CSSProperties } from "react";
import { Check, ClipboardPen, Clock, Loader2 } from "lucide-react";
import { FONT } from "../../../constants/theme";
import { SectionTitle, SortTableTh } from "../../../components/dashboard";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { getDataTableStyle, getDataTableWrapStyle, dataTableRowHoverHandlers } from "../../../lib/dataTableStyles";
import type { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import type { Theme } from "../../../constants/theme";
import type { PresencaAcoesLinha, PresencaCorrecaoMeta, PresencaJustificativaMeta } from "../../../lib/rhCalendarioPresencaGestao";
import { CelulaIndicadorCorrecaoPresencaCalendario } from "./CelulaIndicadorCorrecaoPresencaCalendario";
import { CelulaIndicadorJustificativaMedicoPresencaCalendario } from "./CelulaIndicadorJustificativaMedicoPresencaCalendario";
import type { SortDir } from "../../../components/dashboard";

export type RelatorioPresencaLinha = {
  funcionarioId: string;
  nome: string;
  situacao: string;
  entEsc: string;
  saiEsc: string;
  entRealExib: string;
  saiRealExib: string;
  horasEsc: string;
  horasRealExib: string;
  status: string;
  /** Comentário do overlay CT (Aprovado/Registrado pela Liderança), se houver. */
  overlayComentario?: string | null;
  entRealDesvio: boolean;
  saiRealDesvio: boolean;
  horasRealDesvio: boolean;
  acoesLinha: PresencaAcoesLinha;
  exibirIndicadorMedico: boolean;
  justificativaMedico: PresencaJustificativaMeta | null;
  correcao: PresencaCorrecaoMeta | undefined;
  correcaoEntradaAlterada: boolean;
  correcaoSaidaAlterada: boolean;
  podeAnalisarCorrecao: boolean;
  dia: Date;
  entReal: string;
  saiReal: string;
  horasReal: string;
};

const COR_DESVIO_PONTO = "#e84025";

type DataTable = ReturnType<typeof useDataTableBlock>;

type Props = {
  t: Theme;
  dataTable: DataTable;
  contentBox: CSSProperties;
  linhas: RelatorioPresencaLinha[];
  loading: boolean;
  semTime: boolean;
  sortDir: SortDir;
  onToggleSortNome: () => void;
  onAprovarTurno: (row: RelatorioPresencaLinha) => void;
  onJustificar: (row: RelatorioPresencaLinha) => void;
  onHistorico: (row: RelatorioPresencaLinha) => void;
  onAnalisarCorrecao: (
    fid: string,
    dia: Date,
    decisao: "aprovada" | "recusada",
    campo: "entrada" | "saida",
  ) => void;
};

export function RelatorioPresencaPainel({
  t,
  dataTable,
  contentBox,
  linhas,
  loading,
  semTime,
  sortDir,
  onToggleSortNome,
  onAprovarTurno,
  onJustificar,
  onHistorico,
  onAnalisarCorrecao,
}: Props) {
  const acoesCellInner: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 32,
    flexWrap: "nowrap",
  };

  return (
    <div style={contentBox}>
      <SectionTitle sub="Justificativas em análise no mês selecionado. Atestado de vários dias: confira também o mês no Controle de Presença.">
        Relatório de Justificativas
      </SectionTitle>
      {semTime ? (
        <div
          style={{
            padding: "40px 0",
            textAlign: "center",
            color: t.textMuted,
            fontSize: 13,
            fontFamily: FONT.body,
          }}
        >
          Selecione um time ou prestador para ver o relatório de justificativas do mês.
        </div>
      ) : (
        <div className="app-table-wrap" style={getDataTableWrapStyle()}>
          {loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
                color: t.textMuted,
                fontSize: 13,
                fontFamily: FONT.body,
              }}
            >
              <Loader2 size={14} className="app-lucide-spin" aria-hidden color="var(--brand-primary, #7c3aed)" />
              Atualizando registros de ponto…
            </div>
          ) : null}
          {linhas.length === 0 && !loading ? (
            <div
              style={{
                padding: "40px 0",
                textAlign: "center",
                color: t.textMuted,
                fontSize: 13,
                fontFamily: FONT.body,
              }}
            >
              Nenhuma justificativa pendente para o período e filtros selecionados.
            </div>
          ) : (
            <table style={getDataTableStyle({ minWidth: 960 })}>
              <caption style={{ display: "none" }}>
                Relatório de justificativas por prestador no mês selecionado
              </caption>
              <thead>
                <tr>
                  <th rowSpan={2} scope="col" style={{ ...dataTable.thHeader, whiteSpace: "normal" }}>
                    Data
                  </th>
                  <SortTableTh
                    col="nome"
                    label="Prestador"
                    sortCol="nome"
                    sortDir={sortDir}
                    onSort={() => onToggleSortNome()}
                    thStyle={{ ...dataTable.thHeader, whiteSpace: "normal" }}
                    align="center"
                    rowSpan={2}
                  />
                  <th rowSpan={2} scope="col" style={{ ...dataTable.thHeader, whiteSpace: "normal" }}>
                    Situação
                  </th>
                  <th
                    colSpan={2}
                    scope="colgroup"
                    style={{
                      ...dataTable.thHeader,
                      whiteSpace: "normal",
                      borderLeft: `2px solid ${t.cardBorder}`,
                      borderBottom: "none",
                    }}
                  >
                    Entrada
                  </th>
                  <th
                    colSpan={2}
                    scope="colgroup"
                    style={{
                      ...dataTable.thHeader,
                      whiteSpace: "normal",
                      borderLeft: `2px solid ${t.cardBorder}`,
                      borderBottom: "none",
                    }}
                  >
                    Saída
                  </th>
                  <th
                    colSpan={2}
                    scope="colgroup"
                    style={{
                      ...dataTable.thHeader,
                      whiteSpace: "normal",
                      borderLeft: `2px solid ${t.cardBorder}`,
                      borderBottom: "none",
                    }}
                  >
                    Horas
                  </th>
                  <th rowSpan={2} scope="col" style={{ ...dataTable.thHeader, whiteSpace: "normal" }}>
                    Status
                  </th>
                  <th rowSpan={2} scope="col" style={{ ...dataTable.thHeader, whiteSpace: "normal" }}>
                    Ações
                  </th>
                </tr>
                <tr>
                  <th
                    scope="col"
                    style={{
                      ...dataTable.thHeaderSub,
                      whiteSpace: "normal",
                      borderLeft: `2px solid ${t.cardBorder}`,
                    }}
                  >
                    Escalada
                  </th>
                  <th scope="col" style={{ ...dataTable.thHeaderSub, whiteSpace: "normal" }}>
                    Realizada
                  </th>
                  <th
                    scope="col"
                    style={{
                      ...dataTable.thHeaderSub,
                      whiteSpace: "normal",
                      borderLeft: `2px solid ${t.cardBorder}`,
                    }}
                  >
                    Escalada
                  </th>
                  <th scope="col" style={{ ...dataTable.thHeaderSub, whiteSpace: "normal" }}>
                    Realizada
                  </th>
                  <th
                    scope="col"
                    style={{
                      ...dataTable.thHeaderSub,
                      whiteSpace: "normal",
                      borderLeft: `2px solid ${t.cardBorder}`,
                    }}
                  >
                    Escalada
                  </th>
                  <th scope="col" style={{ ...dataTable.thHeaderSub, whiteSpace: "normal" }}>
                    Realizada
                  </th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((row, i) => {
                  const zebraBg = dataTable.zebraRow(i);
                  const diaLabel = row.dia.toLocaleDateString("pt-BR", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                  });
                  return (
                  <tr
                    key={`${row.funcionarioId}:${row.dia.getFullYear()}-${row.dia.getMonth()}-${row.dia.getDate()}`}
                    style={{ background: zebraBg }}
                    {...dataTableRowHoverHandlers(zebraBg)}
                  >
                    <td style={dataTable.tdCenter}>{diaLabel}</td>
                    <td style={dataTable.tdCenter} title={row.nome}>
                      {row.nome}
                    </td>
                    <td style={dataTable.tdCenter}>{row.situacao}</td>
                    <td style={{ ...dataTable.tdCenter, borderLeft: `2px solid ${t.cardBorder}` }}>{row.entEsc}</td>
                    <td
                      style={{
                        ...dataTable.tdCenter,
                        position: "relative",
                        ...(row.entRealDesvio ? { color: COR_DESVIO_PONTO } : {}),
                      }}
                      title={row.overlayComentario || undefined}
                    >
                      {row.entRealExib}
                      {row.exibirIndicadorMedico && row.justificativaMedico ? (
                        <CelulaIndicadorJustificativaMedicoPresencaCalendario
                          t={t}
                          justificativa={row.justificativaMedico}
                        />
                      ) : row.correcao && row.correcaoEntradaAlterada ? (
                        <CelulaIndicadorCorrecaoPresencaCalendario
                          t={t}
                          campo="entrada"
                          correcao={row.correcao}
                          valorCorrecao={row.correcao.entradaCorrigida}
                          podeAnalisar={row.podeAnalisarCorrecao}
                          onAprovar={() =>
                            onAnalisarCorrecao(row.funcionarioId, row.dia, "aprovada", "entrada")
                          }
                          onRejeitar={() =>
                            onAnalisarCorrecao(row.funcionarioId, row.dia, "recusada", "entrada")
                          }
                        />
                      ) : null}
                    </td>
                    <td style={{ ...dataTable.tdCenter, borderLeft: `2px solid ${t.cardBorder}` }}>{row.saiEsc}</td>
                    <td
                      style={{
                        ...dataTable.tdCenter,
                        position: "relative",
                        ...(row.saiRealDesvio ? { color: COR_DESVIO_PONTO } : {}),
                      }}
                      title={row.overlayComentario || undefined}
                    >
                      {row.saiRealExib}
                      {row.exibirIndicadorMedico && row.justificativaMedico ? (
                        <CelulaIndicadorJustificativaMedicoPresencaCalendario
                          t={t}
                          justificativa={row.justificativaMedico}
                        />
                      ) : row.correcao && row.correcaoSaidaAlterada ? (
                        <CelulaIndicadorCorrecaoPresencaCalendario
                          t={t}
                          campo="saida"
                          correcao={row.correcao}
                          valorCorrecao={row.correcao.saidaCorrigida}
                          podeAnalisar={row.podeAnalisarCorrecao}
                          onAprovar={() =>
                            onAnalisarCorrecao(row.funcionarioId, row.dia, "aprovada", "saida")
                          }
                          onRejeitar={() =>
                            onAnalisarCorrecao(row.funcionarioId, row.dia, "recusada", "saida")
                          }
                        />
                      ) : null}
                    </td>
                    <td style={{ ...dataTable.tdCenter, borderLeft: `2px solid ${t.cardBorder}` }}>{row.horasEsc}</td>
                    <td
                      style={{
                        ...dataTable.tdCenter,
                        ...(row.horasRealDesvio ? { color: COR_DESVIO_PONTO } : {}),
                      }}
                    >
                      {row.horasRealExib}
                    </td>
                    <td style={dataTable.tdCenter}>
                      <div>{row.status}</div>
                      {row.overlayComentario ? (
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 500,
                            color: t.textMuted,
                            marginTop: 2,
                            lineHeight: 1.2,
                          }}
                        >
                          {row.overlayComentario}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ ...dataTable.tdCenter, verticalAlign: "middle" }}>
                      <div style={acoesCellInner}>
                        {row.acoesLinha.mostrarTravessaoAcoes ? (
                          <span style={{ lineHeight: "32px" }} aria-hidden>
                            —
                          </span>
                        ) : (
                          <>
                            {row.acoesLinha.acaoPrimaria === "aprovar" ? (
                              <BtnIconeAcaoLinha
                                label={tooltipAcao("Aprovar turno")}
                                onClick={() => onAprovarTurno(row)}
                              >
                                <Check size={14} aria-hidden />
                              </BtnIconeAcaoLinha>
                            ) : null}
                            {row.acoesLinha.acaoPrimaria === "justificar" ? (
                              <BtnIconeAcaoLinha label={tooltipAcao("Justificar")} onClick={() => onJustificar(row)}>
                                <ClipboardPen size={14} aria-hidden />
                              </BtnIconeAcaoLinha>
                            ) : null}
                            {row.acoesLinha.mostrarHistorico ? (
                              <BtnIconeAcaoLinha
                                label={tooltipAcao("Histórico de presença")}
                                onClick={() => onHistorico(row)}
                              >
                                <Clock size={14} aria-hidden />
                              </BtnIconeAcaoLinha>
                            ) : null}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
