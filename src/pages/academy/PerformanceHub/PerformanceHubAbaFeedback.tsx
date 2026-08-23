import { useMemo, useState } from "react";
import { Eye, History, MessageSquareReply } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { FONT } from "../../../constants/theme";
import type { PerformanceHubAvaliacao } from "../../../lib/academyPerformanceHubTypes";
import {
  avaliacaoFeedbackAplicado,
  avaliacaoFeedbackPendente,
} from "../../../lib/academyPerformanceHubWorkflow";
import { formatDataHoraHistoricoPerformanceHub } from "../../../lib/academyPerformanceHubAvaliacoesFetch";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { SectionTitle, SortTableTh, type SortDir } from "../../../components/dashboard";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";

type Props = {
  avaliacoes: PerformanceHubAvaliacao[];
  onVer: (row: PerformanceHubAvaliacao) => void;
  onAplicarFeedback: (row: PerformanceHubAvaliacao) => void;
  onHistorico: (row: PerformanceHubAvaliacao) => void;
};

type SortPendenteCol = "data" | "avaliado" | "solicitacao" | "mensagem";
type SortAplicadoCol = "data" | "avaliado" | "solicitacao" | "aplicacao" | "aplicador";

function toDateNumber(value: string): number {
  const [dia, mes, ano] = value.split("/").map(Number);
  if (!dia || !mes || !ano) return 0;
  return new Date(ano, mes - 1, dia).getTime();
}

function isoToTime(iso: string | null | undefined): number {
  if (!iso?.trim()) return 0;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatIsoDataHora(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  return formatDataHoraHistoricoPerformanceHub(iso);
}

function CelulaMensagem({ texto }: { texto: string | null | undefined }) {
  const valor = texto?.trim() ?? "";
  if (!valor) {
    return <span style={{ color: "#6b7280" }}>—</span>;
  }
  return (
    <span
      title={valor}
      style={{
        display: "block",
        maxWidth: 240,
        margin: "0 auto",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {valor}
    </span>
  );
}

export function PerformanceHubAbaFeedback({
  avaliacoes,
  onVer,
  onAplicarFeedback,
  onHistorico,
}: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);

  const [sortPendente, setSortPendente] = useState<{ col: SortPendenteCol; dir: SortDir }>({
    col: "solicitacao",
    dir: "desc",
  });
  const [sortAplicado, setSortAplicado] = useState<{ col: SortAplicadoCol; dir: SortDir }>({
    col: "aplicacao",
    dir: "desc",
  });

  const pendentes = useMemo(() => {
    return avaliacoes
      .filter(avaliacaoFeedbackPendente)
      .sort((a, b) => {
        let cmp = 0;
        if (sortPendente.col === "data") cmp = toDateNumber(a.data) - toDateNumber(b.data);
        if (sortPendente.col === "avaliado") cmp = a.avaliadoNome.localeCompare(b.avaliadoNome, "pt-BR");
        if (sortPendente.col === "solicitacao") {
          cmp = isoToTime(a.solicitacaoFeedbackEm) - isoToTime(b.solicitacaoFeedbackEm);
        }
        if (sortPendente.col === "mensagem") {
          cmp = (a.solicitacaoFeedbackTexto ?? "").localeCompare(b.solicitacaoFeedbackTexto ?? "", "pt-BR");
        }
        return sortPendente.dir === "asc" ? cmp : -cmp;
      });
  }, [avaliacoes, sortPendente]);

  const aplicados = useMemo(() => {
    return avaliacoes
      .filter(avaliacaoFeedbackAplicado)
      .sort((a, b) => {
        let cmp = 0;
        if (sortAplicado.col === "data") cmp = toDateNumber(a.data) - toDateNumber(b.data);
        if (sortAplicado.col === "avaliado") cmp = a.avaliadoNome.localeCompare(b.avaliadoNome, "pt-BR");
        if (sortAplicado.col === "solicitacao") {
          cmp = isoToTime(a.solicitacaoFeedbackEm) - isoToTime(b.solicitacaoFeedbackEm);
        }
        if (sortAplicado.col === "aplicacao") {
          cmp = isoToTime(a.aplicacaoFeedbackEm) - isoToTime(b.aplicacaoFeedbackEm);
        }
        if (sortAplicado.col === "aplicador") {
          cmp = (a.aplicacaoFeedbackPorNome ?? "").localeCompare(b.aplicacaoFeedbackPorNome ?? "", "pt-BR");
        }
        return sortAplicado.dir === "asc" ? cmp : -cmp;
      });
  }, [avaliacoes, sortAplicado]);

  function onSortPendente(col: SortPendenteCol) {
    setSortPendente((prev) =>
      prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" },
    );
  }

  function onSortAplicado(col: SortAplicadoCol) {
    setSortAplicado((prev) =>
      prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" },
    );
  }

  return (
    <>
      <div style={pageBox}>
        <SectionTitle sub="solicitações aguardando repasse do coach">Feedbacks Pendentes</SectionTitle>
        {pendentes.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Nenhum feedback pendente para o período selecionado.
          </div>
        ) : (
          <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 880 })}>
              <caption style={{ display: "none" }}>Tabela de feedbacks pendentes</caption>
              <thead>
                <tr>
                  <SortTableTh
                    label="Data da Avaliação"
                    col="data"
                    sortCol={sortPendente.col}
                    sortDir={sortPendente.dir}
                    onSort={onSortPendente}
                    thStyle={dataTable.thHeaderSticky}
                  />
                  <SortTableTh
                    label="Avaliado"
                    col="avaliado"
                    sortCol={sortPendente.col}
                    sortDir={sortPendente.dir}
                    onSort={onSortPendente}
                    thStyle={dataTable.thHeader}
                  />
                  <SortTableTh
                    label="Data da Solicitação do Feedback"
                    col="solicitacao"
                    sortCol={sortPendente.col}
                    sortDir={sortPendente.dir}
                    onSort={onSortPendente}
                    thStyle={dataTable.thHeader}
                  />
                  <SortTableTh
                    label="Mensagem"
                    col="mensagem"
                    sortCol={sortPendente.col}
                    sortDir={sortPendente.dir}
                    onSort={onSortPendente}
                    thStyle={dataTable.thHeader}
                  />
                  <th scope="col" style={dataTable.thHeader}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {pendentes.map((row, i) => (
                  <tr key={row.id} style={{ background: dataTable.zebraRow(i) }}>
                    <td style={dataTable.tdCenter}>{row.data}</td>
                    <td style={dataTable.tdCenter}>{row.avaliadoNome}</td>
                    <td style={dataTable.tdCenter}>{formatIsoDataHora(row.solicitacaoFeedbackEm)}</td>
                    <td style={dataTable.tdCenter}>
                      <CelulaMensagem texto={row.solicitacaoFeedbackTexto} />
                    </td>
                    <td style={dataTable.tdCenter}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                        <BtnIconeAcaoLinha
                          label={tooltipAcao("Aplicar feedback")}
                          onClick={() => onAplicarFeedback(row)}
                        >
                          <MessageSquareReply size={14} aria-hidden />
                        </BtnIconeAcaoLinha>
                        <BtnIconeAcaoLinha label={tooltipAcao("Ver avaliação")} onClick={() => onVer(row)}>
                          <Eye size={14} aria-hidden />
                        </BtnIconeAcaoLinha>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ ...pageBox, marginTop: 14 }}>
        <SectionTitle sub="repasses já registrados pelo coach">Feedbacks Aplicados</SectionTitle>
        {aplicados.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Nenhum feedback aplicado para o período selecionado.
          </div>
        ) : (
          <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 960 })}>
              <caption style={{ display: "none" }}>Tabela de feedbacks aplicados</caption>
              <thead>
                <tr>
                  <SortTableTh
                    label="Data da Avaliação"
                    col="data"
                    sortCol={sortAplicado.col}
                    sortDir={sortAplicado.dir}
                    onSort={onSortAplicado}
                    thStyle={dataTable.thHeaderSticky}
                  />
                  <SortTableTh
                    label="Avaliado"
                    col="avaliado"
                    sortCol={sortAplicado.col}
                    sortDir={sortAplicado.dir}
                    onSort={onSortAplicado}
                    thStyle={dataTable.thHeader}
                  />
                  <SortTableTh
                    label="Data da Solicitação do Feedback"
                    col="solicitacao"
                    sortCol={sortAplicado.col}
                    sortDir={sortAplicado.dir}
                    onSort={onSortAplicado}
                    thStyle={dataTable.thHeader}
                  />
                  <SortTableTh
                    label="Data da Aplicação de Feedback"
                    col="aplicacao"
                    sortCol={sortAplicado.col}
                    sortDir={sortAplicado.dir}
                    onSort={onSortAplicado}
                    thStyle={dataTable.thHeader}
                  />
                  <SortTableTh
                    label="Aplicador do Feedback"
                    col="aplicador"
                    sortCol={sortAplicado.col}
                    sortDir={sortAplicado.dir}
                    onSort={onSortAplicado}
                    thStyle={dataTable.thHeader}
                  />
                  <th scope="col" style={dataTable.thHeader}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {aplicados.map((row, i) => (
                  <tr key={row.id} style={{ background: dataTable.zebraRow(i) }}>
                    <td style={dataTable.tdCenter}>{row.data}</td>
                    <td style={dataTable.tdCenter}>{row.avaliadoNome}</td>
                    <td style={dataTable.tdCenter}>{formatIsoDataHora(row.solicitacaoFeedbackEm)}</td>
                    <td style={dataTable.tdCenter}>{formatIsoDataHora(row.aplicacaoFeedbackEm)}</td>
                    <td style={dataTable.tdCenter}>{row.aplicacaoFeedbackPorNome?.trim() || "—"}</td>
                    <td style={dataTable.tdCenter}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                        <BtnIconeAcaoLinha label={tooltipAcao("Ver avaliação")} onClick={() => onVer(row)}>
                          <Eye size={14} aria-hidden />
                        </BtnIconeAcaoLinha>
                        <BtnIconeAcaoLinha
                          label={tooltipAcao("Histórico da avaliação")}
                          onClick={() => onHistorico(row)}
                        >
                          <History size={14} aria-hidden />
                        </BtnIconeAcaoLinha>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
