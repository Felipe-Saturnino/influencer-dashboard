import { useMemo, useState } from "react";
import { Eye, FileSearch, History } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { FONT } from "../../../constants/theme";
import type { Role } from "../../../types";
import type { PermissaoValor } from "../../../types";
import type { PerformanceHubAvaliacao, PerformanceHubStatus } from "../../../lib/academyPerformanceHubTypes";
import {
  PERFORMANCE_HUB_KPI_SUB,
  PERFORMANCE_HUB_STATUS_COLOR,
  PERFORMANCE_HUB_STATUS_LABEL,
} from "../../../lib/academyPerformanceHubConstants";
import { formatNotaPerformanceHub } from "../../../lib/academyPerformanceHubScoring";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { SectionTitle, SortTableTh, type SortDir } from "../../../components/dashboard";
import { tooltipAcaoAbreModal } from "../../../lib/iconOnlyButtonA11y";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";

type Props = {
  avaliacoes: PerformanceHubAvaliacao[];
  canEditar: PermissaoValor;
  roleUsuario: Role;
  onAnalisar: (row: PerformanceHubAvaliacao) => void;
};

type SortCol = "data" | "avaliado" | "avaliador" | "status" | "nota";

function scoreStatus(status: PerformanceHubStatus): number {
  const order: PerformanceHubStatus[] = ["pendente", "em_analise", "feedback", "concluida"];
  return order.indexOf(status);
}

function dateNumber(value: string): number {
  const [dia, mes, ano] = value.split("/").map(Number);
  if (!dia || !mes || !ano) return 0;
  return new Date(ano, mes - 1, dia).getTime();
}

function cardStyle(border: string) {
  return {
    borderRadius: 14,
    border: `1px solid ${border}`,
    padding: "14px 16px",
    minHeight: 92,
  };
}

export function PerformanceHubAbaAvaliacoes({
  avaliacoes,
  canEditar,
  roleUsuario,
  onAnalisar,
}: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);
  const isProprios = canEditar === "proprios";
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: "data", dir: "desc" });
  const [busca, setBusca] = useState("");
  const showBusca = roleUsuario === "gestor";

  const rowsVisiveis = useMemo(() => {
    const filtradas = avaliacoes
      .filter((row) => (isProprios ? row.status === "concluida" : true))
      .filter((row) =>
        showBusca
          ? textoContemBuscaEmAlgum(busca, row.avaliadoNome, row.avaliadorNome, PERFORMANCE_HUB_STATUS_LABEL[row.status])
          : true,
      );

    const sorted = [...filtradas].sort((a, b) => {
      let cmp = 0;
      if (sort.col === "data") cmp = dateNumber(a.data) - dateNumber(b.data);
      if (sort.col === "avaliado") cmp = a.avaliadoNome.localeCompare(b.avaliadoNome, "pt-BR");
      if (sort.col === "avaliador") cmp = a.avaliadorNome.localeCompare(b.avaliadorNome, "pt-BR");
      if (sort.col === "status") cmp = scoreStatus(a.status) - scoreStatus(b.status);
      if (sort.col === "nota") cmp = (a.notaTotal ?? -1) - (b.notaTotal ?? -1);
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [avaliacoes, isProprios, showBusca, busca, sort]);

  const kpiPendentes = rowsVisiveis.filter((row) => row.status === "pendente").length;
  const kpiEmAnalise = rowsVisiveis.filter((row) => row.status === "em_analise").length;
  const kpiConcluidas = rowsVisiveis.filter((row) => row.status === "concluida").length;
  const notasValidas = rowsVisiveis.filter((row) => row.notaTotal != null);
  const kpiNotaMedia = notasValidas.length
    ? notasValidas.reduce((acc, row) => acc + (row.notaTotal ?? 0), 0) / notasValidas.length
    : 0;

  function handleSort(col: SortCol) {
    setSort((prev) => (prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }));
  }

  return (
    <>
      <div style={pageBox}>
        <SectionTitle sub={PERFORMANCE_HUB_KPI_SUB}>KPIs Consolidados</SectionTitle>
        <div className="app-grid-kpi-4" style={{ gap: 12 }}>
          <div style={cardStyle(t.cardBorder)}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMuted, fontWeight: 700 }}>
              Pendentes
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: t.text, marginTop: 8 }}>{kpiPendentes}</div>
          </div>
          <div style={cardStyle(t.cardBorder)}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMuted, fontWeight: 700 }}>
              Em Análise
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: t.text, marginTop: 8 }}>{kpiEmAnalise}</div>
          </div>
          <div style={cardStyle(t.cardBorder)}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMuted, fontWeight: 700 }}>
              Concluídas
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: t.text, marginTop: 8 }}>{kpiConcluidas}</div>
          </div>
          <div style={cardStyle(t.cardBorder)}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMuted, fontWeight: 700 }}>
              Nota Média
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: t.text, marginTop: 8 }}>{formatNotaPerformanceHub(kpiNotaMedia)}</div>
          </div>
        </div>
      </div>

      <div style={pageBox}>
        <SectionTitle sub={isProprios ? "somente avaliações concluídas do perfil logado" : "acompanhamento do ciclo por status"}>
          Lista de Avaliações
        </SectionTitle>

        {showBusca ? (
          <div style={{ marginBottom: 12 }}>
            <BarraPesquisaPagina
              value={busca}
              onChange={setBusca}
              placeholder="Buscar por avaliado, avaliador ou status..."
              aria-label="Buscar avaliações"
              wrapperStyle={{ width: "100%", maxWidth: 380 }}
            />
          </div>
        ) : null}

        {rowsVisiveis.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Sem dados para o período selecionado.
          </div>
        ) : (
          <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: isProprios ? 620 : 860 })}>
              <caption style={{ display: "none" }}>Tabela de avaliações de performance</caption>
              <thead>
                <tr>
                  <SortTableTh label="Data" col="data" sortCol={sort.col} sortDir={sort.dir} onSort={handleSort} thStyle={dataTable.thHeader} align="center" />
                  {!isProprios ? (
                    <SortTableTh
                      label="Avaliado"
                      col="avaliado"
                      sortCol={sort.col}
                      sortDir={sort.dir}
                      onSort={handleSort}
                      thStyle={dataTable.thHeader}
                      align="center"
                    />
                  ) : null}
                  {!isProprios ? (
                    <SortTableTh
                      label="Avaliador"
                      col="avaliador"
                      sortCol={sort.col}
                      sortDir={sort.dir}
                      onSort={handleSort}
                      thStyle={dataTable.thHeader}
                      align="center"
                    />
                  ) : null}
                  <SortTableTh label="Status" col="status" sortCol={sort.col} sortDir={sort.dir} onSort={handleSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Nota" col="nota" sortCol={sort.col} sortDir={sort.dir} onSort={handleSort} thStyle={dataTable.thHeader} align="center" />
                  <th scope="col" style={dataTable.thHeader}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {rowsVisiveis.map((row, idx) => {
                  const statusColor = PERFORMANCE_HUB_STATUS_COLOR[row.status];
                  return (
                    <tr key={row.id} style={{ background: dataTable.zebraRow(idx) }}>
                      <td style={dataTable.tdCenter}>{row.data}</td>
                      {!isProprios ? <td style={dataTable.tdCenter}>{row.avaliadoNome}</td> : null}
                      {!isProprios ? <td style={dataTable.tdCenter}>{row.avaliadorNome}</td> : null}
                      <td style={dataTable.tdCenter}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 999,
                            padding: "4px 10px",
                            border: `1px solid ${statusColor}`,
                            background: `color-mix(in srgb, ${statusColor} 15%, transparent)`,
                            color: statusColor,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {PERFORMANCE_HUB_STATUS_LABEL[row.status]}
                        </span>
                      </td>
                      <td style={dataTable.tdCenter}>{formatNotaPerformanceHub(row.notaTotal)}</td>
                      <td style={dataTable.tdCenter}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                          <BtnIconeAcaoLinha
                            label={
                              isProprios
                                ? tooltipAcaoAbreModal("Ver minha avaliação", row.avaliadoNome)
                                : tooltipAcaoAbreModal("Ver avaliação", row.avaliadoNome)
                            }
                            onClick={() => onAnalisar(row)}
                          >
                            <Eye size={14} aria-hidden />
                          </BtnIconeAcaoLinha>

                          {!isProprios && row.status === "em_analise" ? (
                            <BtnIconeAcaoLinha
                              label={tooltipAcaoAbreModal("Analisar avaliação", row.avaliadoNome)}
                              onClick={() => onAnalisar(row)}
                            >
                              <FileSearch size={14} aria-hidden />
                            </BtnIconeAcaoLinha>
                          ) : null}

                          <BtnIconeAcaoLinha
                            label={tooltipAcaoAbreModal("Histórico da avaliação", row.avaliadoNome)}
                            onClick={() => undefined}
                          >
                            <History size={14} aria-hidden />
                          </BtnIconeAcaoLinha>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
