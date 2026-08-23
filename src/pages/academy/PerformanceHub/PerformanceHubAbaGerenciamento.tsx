import { useMemo, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { FONT } from "../../../constants/theme";
import type {
  PerformanceHubAgendaItem,
  PerformanceHubAvaliacao,
  PerformanceHubTimeSlug,
} from "../../../lib/academyPerformanceHubTypes";
import { PERFORMANCE_HUB_STATUS_LABEL } from "../../../lib/academyPerformanceHubConstants";
import { avaliacaoVisivelGerenciamentoAnalisar } from "../../../lib/academyPerformanceHubWorkflow";
import { formatNotaPerformanceHub } from "../../../lib/academyPerformanceHubScoring";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { SectionTitle, SortTableTh, type SortDir } from "../../../components/dashboard";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";

type Props = {
  avaliacoes: PerformanceHubAvaliacao[];
  timeSelecionado: PerformanceHubTimeSlug;
  agenda: PerformanceHubAgendaItem[];
  onAvaliar: (row: PerformanceHubAvaliacao) => void;
  onAvaliarPorNome: (nome: string) => void;
};

type SortAvaliacaoCol = "data" | "avaliado" | "status" | "nota";
type SortAgendaCol = "nome" | "turno" | "realizadas" | "pendentes";

export function PerformanceHubAbaGerenciamento({
  avaliacoes,
  timeSelecionado,
  agenda,
  onAvaliar,
  onAvaliarPorNome,
}: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);
  const [buscaAgenda, setBuscaAgenda] = useState("");
  const [sortAvaliacao, setSortAvaliacao] = useState<{ col: SortAvaliacaoCol; dir: SortDir }>({
    col: "data",
    dir: "desc",
  });
  const [sortAgenda, setSortAgenda] = useState<{ col: SortAgendaCol; dir: SortDir }>({
    col: "pendentes",
    dir: "desc",
  });

  const avaliacoesPendentes = useMemo(() => {
    return avaliacoes
      .filter((row) => avaliacaoVisivelGerenciamentoAnalisar(row, timeSelecionado))
      .sort((a, b) => {
        let cmp = 0;
        if (sortAvaliacao.col === "data") cmp = toDateNumber(a.data) - toDateNumber(b.data);
        if (sortAvaliacao.col === "avaliado") cmp = a.avaliadoNome.localeCompare(b.avaliadoNome, "pt-BR");
        if (sortAvaliacao.col === "status") cmp = a.status.localeCompare(b.status, "pt-BR");
        if (sortAvaliacao.col === "nota") cmp = (a.notaTotal ?? -1) - (b.notaTotal ?? -1);
        return sortAvaliacao.dir === "asc" ? cmp : -cmp;
      });
  }, [avaliacoes, sortAvaliacao, timeSelecionado]);

  const agendaFiltrada = useMemo(() => {
    const filtrada = agenda.filter((item) =>
      textoContemBuscaEmAlgum(buscaAgenda, item.nome, item.turno, item.goLive),
    );
    return filtrada.sort((a, b) => {
      let cmp = 0;
      if (sortAgenda.col === "nome") cmp = a.nome.localeCompare(b.nome, "pt-BR");
      if (sortAgenda.col === "turno") cmp = a.turno.localeCompare(b.turno, "pt-BR");
      if (sortAgenda.col === "realizadas") cmp = a.realizadas - b.realizadas;
      if (sortAgenda.col === "pendentes") cmp = a.pendentes - b.pendentes;
      return sortAgenda.dir === "asc" ? cmp : -cmp;
    });
  }, [agenda, buscaAgenda, sortAgenda]);

  function onSortAvaliacao(col: SortAvaliacaoCol) {
    setSortAvaliacao((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: "asc" },
    );
  }

  function onSortAgenda(col: SortAgendaCol) {
    setSortAgenda((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: "asc" },
    );
  }

  return (
    <>
      <div style={pageBox}>
        <SectionTitle sub="avaliações salvas aguardando conclusão do avaliador">
          Avaliações em Rascunho
        </SectionTitle>

        {avaliacoesPendentes.length === 0 ? (
          <div style={{ padding: "28px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Sem dados para o período selecionado.
          </div>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 740 })}>
              <caption style={{ display: "none" }}>Tabela de avaliações em rascunho</caption>
              <thead>
                <tr>
                  <SortTableTh label="Data" col="data" sortCol={sortAvaliacao.col} sortDir={sortAvaliacao.dir} onSort={onSortAvaliacao} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Avaliado" col="avaliado" sortCol={sortAvaliacao.col} sortDir={sortAvaliacao.dir} onSort={onSortAvaliacao} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Status" col="status" sortCol={sortAvaliacao.col} sortDir={sortAvaliacao.dir} onSort={onSortAvaliacao} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Nota" col="nota" sortCol={sortAvaliacao.col} sortDir={sortAvaliacao.dir} onSort={onSortAvaliacao} thStyle={dataTable.thHeader} align="center" />
                  <th scope="col" style={dataTable.thHeader}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {avaliacoesPendentes.map((row, idx) => (
                  <tr key={row.id} style={{ background: dataTable.zebraRow(idx) }}>
                    <td style={dataTable.tdCenter}>{row.data}</td>
                    <td style={dataTable.tdCenter}>{row.avaliadoNome}</td>
                    <td style={dataTable.tdCenter}>{PERFORMANCE_HUB_STATUS_LABEL[row.status]}</td>
                    <td style={dataTable.tdCenter}>{formatNotaPerformanceHub(row.notaTotal)}</td>
                    <td style={dataTable.tdCenter}>
                      <BtnIconeAcaoLinha
                        label={tooltipAcao("Avaliar performance")}
                        onClick={() => onAvaliar(row)}
                      >
                        <ClipboardCheck size={14} aria-hidden />
                      </BtnIconeAcaoLinha>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={pageBox}>
        <SectionTitle sub="mínimo de 3 avaliações publicadas por prestador no mês">Agenda de Avaliações</SectionTitle>

        <div style={{ marginBottom: 12 }}>
          <BarraPesquisaPagina
            value={buscaAgenda}
            onChange={setBuscaAgenda}
            placeholder="Buscar por nome, turno ou data de go-live..."
            aria-label="Buscar agenda de avaliações"
            wrapperStyle={{ width: "100%", maxWidth: 380 }}
          />
        </div>

        {agendaFiltrada.length === 0 ? (
          <div style={{ padding: "28px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Sem dados para o período selecionado.
          </div>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 840 })}>
              <caption style={{ display: "none" }}>Tabela de agenda de avaliações</caption>
              <thead>
                <tr>
                  <SortTableTh label="Prestador" col="nome" sortCol={sortAgenda.col} sortDir={sortAgenda.dir} onSort={onSortAgenda} thStyle={dataTable.thHeader} align="center" />
                  <th scope="col" style={dataTable.thHeader}>Go-live</th>
                  <SortTableTh label="Turno" col="turno" sortCol={sortAgenda.col} sortDir={sortAgenda.dir} onSort={onSortAgenda} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Realizadas" col="realizadas" sortCol={sortAgenda.col} sortDir={sortAgenda.dir} onSort={onSortAgenda} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Pendentes" col="pendentes" sortCol={sortAgenda.col} sortDir={sortAgenda.dir} onSort={onSortAgenda} thStyle={dataTable.thHeader} align="center" />
                  <th scope="col" style={dataTable.thHeader}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {agendaFiltrada.map((item, idx) => (
                  <tr key={item.id} style={{ background: dataTable.zebraRow(idx) }}>
                    <td style={dataTable.tdCenter}>{item.nome}</td>
                    <td style={dataTable.tdCenter}>{item.goLive}</td>
                    <td style={dataTable.tdCenter}>{item.turno}</td>
                    <td style={dataTable.tdCenter}>{item.realizadas}</td>
                    <td style={dataTable.tdCenter}>{item.pendentes}</td>
                    <td style={dataTable.tdCenter}>
                      <BtnIconeAcaoLinha
                        label={tooltipAcao("Avaliar performance")}
                        onClick={() => onAvaliarPorNome(item.nome)}
                      >
                        <ClipboardCheck size={14} aria-hidden />
                      </BtnIconeAcaoLinha>
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

function toDateNumber(value: string): number {
  const [dia, mes, ano] = value.split("/").map(Number);
  if (!dia || !mes || !ano) return 0;
  return new Date(ano, mes - 1, dia).getTime();
}
