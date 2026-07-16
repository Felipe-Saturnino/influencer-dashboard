import { useMemo, useState } from "react";
import { Eye, Pencil } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { compareLocaleTexto, compareNumber } from "../../../lib/classificacaoSort";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";
import { fmtBRL } from "../../../lib/dashboardHelpers";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { SectionTitle, SortTableTh, CtaCriarButton, type SortDir } from "../../../components/dashboard";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import type { Permissoes } from "../../../hooks/usePermission";
import {
  codigoEstoqueItem,
  ESTOQUE_ITEM_CATEGORIAS,
  ESTOQUE_ITEM_CATEGORIA_LABEL,
  estoqueDisponivelItem,
  type EstoqueItemRow,
} from "../../../lib/techOpsEstoque";
import {
  BlocoInfoEstoque,
  CampoLeituraEstoque,
  ESTOQUE_FORM_GRID,
  KpiEstoqueCard,
  VazioEstoque,
} from "./estoqueUi";
import { ModalVerEstoque } from "./ModalVerEstoque";
import { ModalNovoItemEstoque } from "./ModaisNovoEstoque";
import { ModalEditarItemEstoque } from "./ModaisEditarEstoque";

type StatusKpi = "" | "estoque" | "em_uso" | "manutencao";
type SortCol = "codigo" | "categoria" | "nome" | "modelo" | "total" | "em_uso" | "estoque" | "manutencao";

const KPI_COR = {
  total: "var(--brand-primary, #7c3aed)",
  estoque: "#22c55e",
  em_uso: "#3b82f6",
  manutencao: "#f59e0b",
} as const;

export function AbaItens({
  rows,
  loading,
  busca,
  filtroEstudio,
  filtroCategoria,
  perm,
  onReload,
}: {
  rows: EstoqueItemRow[];
  loading: boolean;
  busca: string;
  filtroEstudio: string;
  filtroCategoria: string;
  perm: Permissoes;
  onReload: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const [statusKpi, setStatusKpi] = useState<StatusKpi>("");
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: "codigo", dir: "asc" });
  const [novoAberto, setNovoAberto] = useState(false);
  const [verRow, setVerRow] = useState<EstoqueItemRow | null>(null);
  const [editRow, setEditRow] = useState<EstoqueItemRow | null>(null);

  const pageBox = getPageContentBoxStyle(brand, t);

  const filtradosBase = useMemo(
    () =>
      rows.filter((r) => {
        if (filtroEstudio !== "todos" && r.estudio_slug !== filtroEstudio) return false;
        if (filtroCategoria && r.categoria !== filtroCategoria) return false;
        return textoContemBuscaEmAlgum(busca, codigoEstoqueItem(r), r.nome, r.marca, r.modelo);
      }),
    [rows, filtroEstudio, filtroCategoria, busca],
  );

  const kpis = useMemo(() => {
    const porCategoria = (extrator: (r: EstoqueItemRow) => number) =>
      ESTOQUE_ITEM_CATEGORIAS.map((c) => ({
        label: ESTOQUE_ITEM_CATEGORIA_LABEL[c],
        valor: filtradosBase.filter((r) => r.categoria === c).reduce((s, r) => s + extrator(r), 0),
      }));
    const soma = (extrator: (r: EstoqueItemRow) => number) =>
      filtradosBase.reduce((s, r) => s + extrator(r), 0);
    return {
      total: { valor: soma((r) => r.quantidade_total), breakdown: porCategoria((r) => r.quantidade_total) },
      estoque: { valor: soma(estoqueDisponivelItem), breakdown: porCategoria(estoqueDisponivelItem) },
      em_uso: { valor: soma((r) => r.quantidade_em_uso), breakdown: porCategoria((r) => r.quantidade_em_uso) },
      manutencao: {
        valor: soma((r) => r.quantidade_manutencao),
        breakdown: porCategoria((r) => r.quantidade_manutencao),
      },
    };
  }, [filtradosBase]);

  const filtrados = useMemo(() => {
    let lista = filtradosBase;
    if (statusKpi === "estoque") lista = lista.filter((r) => estoqueDisponivelItem(r) > 0);
    else if (statusKpi === "em_uso") lista = lista.filter((r) => r.quantidade_em_uso > 0);
    else if (statusKpi === "manutencao") lista = lista.filter((r) => r.quantidade_manutencao > 0);

    const dir = sort.dir;
    return [...lista].sort((a, b) => {
      switch (sort.col) {
        case "codigo":
          return compareNumber(a.codigo_num, b.codigo_num, dir);
        case "categoria":
          return compareLocaleTexto(
            ESTOQUE_ITEM_CATEGORIA_LABEL[a.categoria],
            ESTOQUE_ITEM_CATEGORIA_LABEL[b.categoria],
            dir,
          );
        case "nome":
          return compareLocaleTexto(a.nome, b.nome, dir);
        case "modelo":
          return compareLocaleTexto(a.modelo, b.modelo, dir);
        case "total":
          return compareNumber(a.quantidade_total, b.quantidade_total, dir);
        case "em_uso":
          return compareNumber(a.quantidade_em_uso, b.quantidade_em_uso, dir);
        case "estoque":
          return compareNumber(estoqueDisponivelItem(a), estoqueDisponivelItem(b), dir);
        case "manutencao":
          return compareNumber(a.quantidade_manutencao, b.quantidade_manutencao, dir);
        default:
          return 0;
      }
    });
  }, [filtradosBase, statusKpi, sort]);

  function onSort(col: SortCol) {
    setSort((prev) => (prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }));
  }

  const kpiClick = (s: StatusKpi) => () => setStatusKpi((prev) => (prev === s ? "" : s));

  return (
    <>
      <div style={pageBox}>
        <SectionTitle sub="Quantidades por status — clique em um card para filtrar o catálogo">
          Consolidado de KPIs
        </SectionTitle>
        <div className="app-grid-kpi-4" style={{ display: "grid", gap: 12 }}>
          <KpiEstoqueCard
            label="Total"
            valor={kpis.total.valor}
            cor={KPI_COR.total}
            active={statusKpi === ""}
            onClick={() => setStatusKpi("")}
            breakdown={kpis.total.breakdown}
          />
          <KpiEstoqueCard
            label="Estoque"
            valor={kpis.estoque.valor}
            cor={KPI_COR.estoque}
            active={statusKpi === "estoque"}
            onClick={kpiClick("estoque")}
            breakdown={kpis.estoque.breakdown}
          />
          <KpiEstoqueCard
            label="Em uso"
            valor={kpis.em_uso.valor}
            cor={KPI_COR.em_uso}
            active={statusKpi === "em_uso"}
            onClick={kpiClick("em_uso")}
            breakdown={kpis.em_uso.breakdown}
          />
          <KpiEstoqueCard
            label="Manutenção"
            valor={kpis.manutencao.valor}
            cor={KPI_COR.manutencao}
            active={statusKpi === "manutencao"}
            onClick={kpiClick("manutencao")}
            breakdown={kpis.manutencao.breakdown}
          />
        </div>
      </div>

      <div style={pageBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <SectionTitle sub="Itens de estoque cadastrados">Catálogo</SectionTitle>
          {perm.canCriarOk ? <CtaCriarButton onClick={() => setNovoAberto(true)}>Novo Item</CtaCriarButton> : null}
        </div>
        {loading ? (
          <VazioEstoque>Carregando…</VazioEstoque>
        ) : filtrados.length === 0 ? (
          <VazioEstoque>Nenhum item encontrado.</VazioEstoque>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 860 })}>
              <caption style={{ display: "none" }}>Catálogo de itens de estoque</caption>
              <thead>
                <tr>
                  <SortTableTh label="Código" col="codigo" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Categoria" col="categoria" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Nome" col="nome" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Modelo" col="modelo" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Total" col="total" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Em Uso" col="em_uso" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Estoque" col="estoque" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Manutenção" col="manutencao" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <th scope="col" style={dataTable.thHeader}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((r, i) => (
                  <tr
                    key={r.id}
                    style={{ background: dataTable.zebraRow(i) }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = dataTable.totalRowBg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = dataTable.zebraRow(i);
                    }}
                  >
                    <td style={{ ...dataTable.tdCenter, fontWeight: 700 }}>{codigoEstoqueItem(r)}</td>
                    <td style={dataTable.tdCenter}>{ESTOQUE_ITEM_CATEGORIA_LABEL[r.categoria]}</td>
                    <td style={dataTable.tdCenter} title={r.nome}>
                      {r.nome}
                    </td>
                    <td style={dataTable.tdCenter}>{r.modelo}</td>
                    <td style={dataTable.tdCenter}>{r.quantidade_total.toLocaleString("pt-BR")}</td>
                    <td style={dataTable.tdCenter}>{r.quantidade_em_uso.toLocaleString("pt-BR")}</td>
                    <td style={dataTable.tdCenter}>{estoqueDisponivelItem(r).toLocaleString("pt-BR")}</td>
                    <td style={dataTable.tdCenter}>{r.quantidade_manutencao.toLocaleString("pt-BR")}</td>
                    <td style={dataTable.tdCenter}>
                      <span style={{ display: "inline-flex", gap: 6 }}>
                        <BtnIconeAcaoLinha label={tooltipAcao("Ver Item")} onClick={() => setVerRow(r)}>
                          <Eye size={13} aria-hidden />
                        </BtnIconeAcaoLinha>
                        {perm.canEditarOk ? (
                          <BtnIconeAcaoLinha label={tooltipAcao("Editar Item")} onClick={() => setEditRow(r)}>
                            <Pencil size={13} aria-hidden />
                          </BtnIconeAcaoLinha>
                        ) : null}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {novoAberto ? <ModalNovoItemEstoque onClose={() => setNovoAberto(false)} onCriado={onReload} /> : null}

      {editRow ? <ModalEditarItemEstoque row={editRow} onClose={() => setEditRow(null)} onSalvo={onReload} /> : null}

      {verRow ? (
        <ModalVerEstoque
          titulo={verRow.nome}
          subtitulo={`${codigoEstoqueItem(verRow)} — ${ESTOQUE_ITEM_CATEGORIA_LABEL[verRow.categoria]}`}
          primeiraAbaLabel="Dados do Item"
          entidadeTipo="item"
          entidadeId={verRow.id}
          onClose={() => setVerRow(null)}
          primeiraAbaConteudo={
            <>
              <div style={ESTOQUE_FORM_GRID}>
                <CampoLeituraEstoque label="Marca" valor={verRow.marca || "—"} />
                <CampoLeituraEstoque label="Modelo" valor={verRow.modelo || "—"} />
              </div>
              <BlocoInfoEstoque titulo="Quantidade">
                <CampoLeituraEstoque label="Quantidade Total" valor={verRow.quantidade_total.toLocaleString("pt-BR")} />
                <CampoLeituraEstoque label="Quantidade Em Uso" valor={verRow.quantidade_em_uso.toLocaleString("pt-BR")} />
                <CampoLeituraEstoque label="Quantidade Estoque" valor={estoqueDisponivelItem(verRow).toLocaleString("pt-BR")} />
                <CampoLeituraEstoque
                  label="Quantidade Manutenção"
                  valor={verRow.quantidade_manutencao.toLocaleString("pt-BR")}
                />
              </BlocoInfoEstoque>
              <BlocoInfoEstoque titulo="Valores">
                <CampoLeituraEstoque label="Valor Unitário" valor={fmtBRL(verRow.valor_unitario)} />
                <CampoLeituraEstoque
                  label="Valor do Estoque"
                  valor={fmtBRL(verRow.valor_unitario * estoqueDisponivelItem(verRow))}
                />
              </BlocoInfoEstoque>
            </>
          }
        />
      ) : null}
    </>
  );
}
