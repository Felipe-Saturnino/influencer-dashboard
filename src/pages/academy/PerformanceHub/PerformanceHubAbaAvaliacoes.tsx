import { useMemo, useState, type ReactNode } from "react";
import { Eye, FileSearch, History, Image, ListChecks, MessageSquare, Star, TableProperties, Users } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { FONT } from "../../../constants/theme";
import type { Role } from "../../../types";
import type { PermissaoValor } from "../../../types";
import type { PerformanceHubAvaliacao, PerformanceHubStatus, PerformanceHubTimeSlug } from "../../../lib/academyPerformanceHubTypes";
import {
  PERFORMANCE_HUB_KPI_SUB,
  PERFORMANCE_HUB_STATUS_COLOR,
  PERFORMANCE_HUB_STATUS_LABEL,
} from "../../../lib/academyPerformanceHubConstants";
import {
  formatNotaPerformanceHub,
  labelTerceiraDimensaoTime,
  notaTerceiraDimensaoAvaliacao,
} from "../../../lib/academyPerformanceHubScoring";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { SEARCH_PLACEHOLDER_ELLIPSIS } from "../../../lib/searchBarConstants";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { SectionTitle, SortTableTh, type SortDir } from "../../../components/dashboard";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { textoContemBusca } from "../../../lib/searchText";

type Props = {
  avaliacoes: PerformanceHubAvaliacao[];
  timeSelecionado: PerformanceHubTimeSlug;
  canView: PermissaoValor;
  roleUsuario: Role;
  onVer: (row: PerformanceHubAvaliacao) => void;
  onAnalisar: (row: PerformanceHubAvaliacao) => void;
};

type SortCol = "data" | "avaliado" | "avaliador" | "status" | "total" | "imagem" | "comunicacao" | "terceira";

function scoreStatus(status: PerformanceHubStatus): number {
  const order: PerformanceHubStatus[] = ["pendente", "rascunho", "em_analise", "feedback", "concluida"];
  return order.indexOf(status);
}

function dateNumber(value: string): number {
  const [dia, mes, ano] = value.split("/").map(Number);
  if (!dia || !mes || !ano) return 0;
  return new Date(ano, mes - 1, dia).getTime();
}

function mediaNotas(rows: PerformanceHubAvaliacao[], pick: (row: PerformanceHubAvaliacao) => number | null): number | null {
  const vals = rows.map(pick).filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function corNotaCelula(nota: number | null): string {
  if (nota == null) return "#6b7280";
  if (nota >= 8) return "#22c55e";
  if (nota >= 6) return "#f59e0b";
  return "#e84025";
}

function KpiCard({
  label,
  value,
  icon,
  accent,
  border,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  accent: string;
  border: string;
}) {
  return (
    <div style={{ borderRadius: 14, border: `1px solid ${border}`, overflow: "hidden", minHeight: 92 }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, transparent)` }} />
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: `color-mix(in srgb, ${accent} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${accent} 28%, transparent)`,
              color: accent,
            }}
          >
            {icon}
          </span>
          <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280", fontWeight: 700 }}>
            {label}
          </span>
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      </div>
    </div>
  );
}

export function PerformanceHubAbaAvaliacoes({
  avaliacoes,
  timeSelecionado,
  canView,
  roleUsuario,
  onVer,
  onAnalisar,
}: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);
  const isProprios = canView === "proprios";
  const isShuffler = timeSelecionado === "shuffler";
  const labelTerceiraDim = labelTerceiraDimensaoTime(timeSelecionado);
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: "data", dir: "desc" });
  const [busca, setBusca] = useState("");
  const showBusca = roleUsuario === "gestor" || roleUsuario === "admin";

  const rowsVisiveis = useMemo(() => {
    const filtradas = avaliacoes
      .filter((row) => (isProprios ? row.status === "concluida" : true))
      .filter((row) => (showBusca ? textoContemBusca(row.avaliadoNome, busca) : true));

    const sorted = [...filtradas].sort((a, b) => {
      let cmp = 0;
      if (sort.col === "data") cmp = dateNumber(a.data) - dateNumber(b.data);
      if (sort.col === "avaliado") cmp = a.avaliadoNome.localeCompare(b.avaliadoNome, "pt-BR");
      if (sort.col === "avaliador") cmp = a.avaliadorNome.localeCompare(b.avaliadorNome, "pt-BR");
      if (sort.col === "status") cmp = scoreStatus(a.status) - scoreStatus(b.status);
      if (sort.col === "total") cmp = (a.notaTotal ?? -1) - (b.notaTotal ?? -1);
      if (sort.col === "imagem") cmp = (a.notaImagem ?? -1) - (b.notaImagem ?? -1);
      if (sort.col === "comunicacao") cmp = (a.notaComunicacao ?? -1) - (b.notaComunicacao ?? -1);
      if (sort.col === "terceira") {
        cmp = (notaTerceiraDimensaoAvaliacao(a) ?? -1) - (notaTerceiraDimensaoAvaliacao(b) ?? -1);
      }
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [avaliacoes, isProprios, showBusca, busca, sort]);

  const kpiAvaliacoes = rowsVisiveis.length;
  const kpiNotaTotal = mediaNotas(rowsVisiveis, (r) => r.notaTotal);
  const kpiImagem = mediaNotas(rowsVisiveis, (r) => r.notaImagem);
  const kpiComunicacao = mediaNotas(rowsVisiveis, (r) => r.notaComunicacao);
  const kpiTerceira = mediaNotas(rowsVisiveis, (r) => notaTerceiraDimensaoAvaliacao(r));

  function handleSort(col: SortCol) {
    setSort((prev) => (prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }));
  }

  function renderNotaCell(nota: number | null) {
    return (
      <span style={{ color: corNotaCelula(nota), fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        {formatNotaPerformanceHub(nota)}
      </span>
    );
  }

  return (
    <>
      <div style={pageBox}>
        <SectionTitle sub={PERFORMANCE_HUB_KPI_SUB}>Consolidados</SectionTitle>
        <div className="app-grid-kpi-2" style={{ gap: 12, marginBottom: 12 }}>
          <KpiCard
            label="Avaliações"
            value={String(kpiAvaliacoes)}
            accent="#7c3aed"
            border={t.cardBorder}
            icon={<Users size={14} aria-hidden />}
          />
          <KpiCard
            label="Nota Total"
            value={formatNotaPerformanceHub(kpiNotaTotal)}
            accent="#1e36f8"
            border={t.cardBorder}
            icon={<Star size={14} aria-hidden />}
          />
        </div>
        <div className="app-grid-kpi-3" style={{ gap: 12 }}>
          <KpiCard
            label="Imagem"
            value={formatNotaPerformanceHub(kpiImagem)}
            accent="#a78bfa"
            border={t.cardBorder}
            icon={<Image size={14} aria-hidden />}
          />
          <KpiCard
            label="Comunicação"
            value={formatNotaPerformanceHub(kpiComunicacao)}
            accent="#22c55e"
            border={t.cardBorder}
            icon={<MessageSquare size={14} aria-hidden />}
          />
          <KpiCard
            label={labelTerceiraDim}
            value={formatNotaPerformanceHub(kpiTerceira)}
            accent={isShuffler ? "#1e36f8" : "#eab308"}
            border={t.cardBorder}
            icon={isShuffler ? <ListChecks size={14} aria-hidden /> : <TableProperties size={14} aria-hidden />}
          />
        </div>
      </div>

      <div style={pageBox}>
        <SectionTitle sub="histórico de avaliações no período">Avaliações</SectionTitle>

        {showBusca ? (
          <div style={{ marginBottom: 12 }}>
            <BarraPesquisaPagina
              value={busca}
              onChange={setBusca}
              placeholder={`Buscar por Nome${SEARCH_PLACEHOLDER_ELLIPSIS}`}
              aria-label="Buscar avaliado por nome"
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
            <table style={getDataTableStyle({ minWidth: isProprios ? 720 : 980 })}>
              <caption style={{ display: "none" }}>Avaliações de desempenho no período</caption>
              <thead>
                <tr>
                  <SortTableTh label="Data" col="data" sortCol={sort.col} sortDir={sort.dir} onSort={handleSort} thStyle={dataTable.thHeaderSticky} align="center" />
                  {!isProprios ? (
                    <SortTableTh label="Avaliado" col="avaliado" sortCol={sort.col} sortDir={sort.dir} onSort={handleSort} thStyle={dataTable.thHeader} align="center" />
                  ) : null}
                  <SortTableTh label="Total" col="total" sortCol={sort.col} sortDir={sort.dir} onSort={handleSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Imagem" col="imagem" sortCol={sort.col} sortDir={sort.dir} onSort={handleSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Comunicação" col="comunicacao" sortCol={sort.col} sortDir={sort.dir} onSort={handleSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label={labelTerceiraDim} col="terceira" sortCol={sort.col} sortDir={sort.dir} onSort={handleSort} thStyle={dataTable.thHeader} align="center" />
                  {!isProprios ? (
                    <SortTableTh label="Avaliador" col="avaliador" sortCol={sort.col} sortDir={sort.dir} onSort={handleSort} thStyle={dataTable.thHeader} align="center" />
                  ) : null}
                  <SortTableTh label="Status" col="status" sortCol={sort.col} sortDir={sort.dir} onSort={handleSort} thStyle={dataTable.thHeader} align="center" />
                  <th scope="col" style={dataTable.thHeader}>Vídeo</th>
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
                      <td style={dataTable.tdCenter}>{renderNotaCell(row.notaTotal)}</td>
                      <td style={dataTable.tdCenter}>{renderNotaCell(row.notaImagem)}</td>
                      <td style={dataTable.tdCenter}>{renderNotaCell(row.notaComunicacao)}</td>
                      <td style={dataTable.tdCenter}>{renderNotaCell(notaTerceiraDimensaoAvaliacao(row))}</td>
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
                      <td style={dataTable.tdCenter}>
                        {row.videoUrl ? (
                          <a
                            href={row.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: brand.primary, fontSize: 13, fontWeight: 600, fontFamily: FONT.body }}
                          >
                            Assistir
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={dataTable.tdCenter}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                          <BtnIconeAcaoLinha
                            label={tooltipAcao("Ver avaliação")}
                            onClick={() => onVer(row)}
                          >
                            <Eye size={14} aria-hidden />
                          </BtnIconeAcaoLinha>

                          {!isProprios && row.status === "em_analise" ? (
                            <BtnIconeAcaoLinha
                              label={tooltipAcao("Analisar avaliação")}
                              onClick={() => onAnalisar(row)}
                            >
                              <FileSearch size={14} aria-hidden />
                            </BtnIconeAcaoLinha>
                          ) : null}

                          <BtnIconeAcaoLinha
                            label={tooltipAcao("Histórico da avaliação")}
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
