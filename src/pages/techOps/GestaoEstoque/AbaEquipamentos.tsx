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
  codigoEstoqueEquipamento,
  ESTOQUE_EQUIP_CATEGORIAS,
  ESTOQUE_EQUIP_CATEGORIA_LABEL,
  ESTOQUE_EQUIP_STATUS_COLOR,
  ESTOQUE_EQUIP_STATUS_LABEL,
  labelEstoqueLocalSlug,
  proximoCodigoEstoque,
  type EstoqueEquipamentoRow,
  type EstoqueEquipStatus,
} from "../../../lib/techOpsEstoque";
import {
  BadgeEstoque,
  CampoLeituraEstoque,
  ESTOQUE_FORM_GRID,
  KpiEstoqueCard,
  VazioEstoque,
} from "./estoqueUi";
import { ModalVerEstoque } from "./ModalVerEstoque";
import { ModalNovoEquipamentoEstoque } from "./ModaisNovoEstoque";
import { ModalEditarEquipamentoEstoque } from "./ModaisEditarEstoque";

type StatusKpi = "" | EstoqueEquipStatus;
type SortCol = "codigo" | "categoria" | "nome" | "numero_serie" | "marca" | "modelo" | "status" | "alocacao";

const KPI_COR = {
  total: "var(--brand-primary, #7c3aed)",
  estoque: "#22c55e",
  em_uso: "#3b82f6",
  manutencao: "#f59e0b",
} as const;

export function AbaEquipamentos({
  rows,
  loading,
  busca,
  filtroEstudio,
  filtroCategoria,
  estudioNomePorSlug,
  perm,
  onReload,
}: {
  rows: EstoqueEquipamentoRow[];
  loading: boolean;
  busca: string;
  filtroEstudio: string;
  filtroCategoria: string;
  estudioNomePorSlug: Record<string, string>;
  perm: Permissoes;
  onReload: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const [statusKpi, setStatusKpi] = useState<StatusKpi>("");
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: "codigo", dir: "asc" });
  const [novoAberto, setNovoAberto] = useState(false);
  const [verRow, setVerRow] = useState<EstoqueEquipamentoRow | null>(null);
  const [editRow, setEditRow] = useState<EstoqueEquipamentoRow | null>(null);

  const pageBox = getPageContentBoxStyle(brand, t);

  const alocacao = (r: EstoqueEquipamentoRow): string =>
    r.status === "em_uso" && r.estudio_slug
      ? labelEstoqueLocalSlug(r.estudio_slug, estudioNomePorSlug)
      : "—";

  const filtradosBase = useMemo(
    () =>
      rows.filter((r) => {
        if (filtroEstudio !== "todos" && r.estudio_slug !== filtroEstudio) return false;
        if (filtroCategoria && r.categoria !== filtroCategoria) return false;
        return textoContemBuscaEmAlgum(busca, codigoEstoqueEquipamento(r), r.nome, r.numero_serie, r.marca, r.modelo);
      }),
    [rows, filtroEstudio, filtroCategoria, busca],
  );

  const kpis = useMemo(() => {
    const porCategoria = (filtro: (r: EstoqueEquipamentoRow) => boolean) =>
      ESTOQUE_EQUIP_CATEGORIAS.map((c) => ({
        label: ESTOQUE_EQUIP_CATEGORIA_LABEL[c],
        valor: filtradosBase.filter((r) => r.categoria === c && filtro(r)).length,
      }));
    const conta = (filtro: (r: EstoqueEquipamentoRow) => boolean) => filtradosBase.filter(filtro).length;
    return {
      total: { valor: conta(() => true), breakdown: porCategoria(() => true) },
      estoque: { valor: conta((r) => r.status === "estoque"), breakdown: porCategoria((r) => r.status === "estoque") },
      em_uso: { valor: conta((r) => r.status === "em_uso"), breakdown: porCategoria((r) => r.status === "em_uso") },
      manutencao: {
        valor: conta((r) => r.status === "manutencao"),
        breakdown: porCategoria((r) => r.status === "manutencao"),
      },
    };
  }, [filtradosBase]);

  const filtrados = useMemo(() => {
    const lista = statusKpi ? filtradosBase.filter((r) => r.status === statusKpi) : filtradosBase;
    const dir = sort.dir;
    return [...lista].sort((a, b) => {
      switch (sort.col) {
        case "codigo":
          return compareNumber(a.codigo_num, b.codigo_num, dir);
        case "categoria":
          return compareLocaleTexto(
            ESTOQUE_EQUIP_CATEGORIA_LABEL[a.categoria],
            ESTOQUE_EQUIP_CATEGORIA_LABEL[b.categoria],
            dir,
          );
        case "nome":
          return compareLocaleTexto(a.nome, b.nome, dir);
        case "numero_serie":
          return compareLocaleTexto(a.numero_serie, b.numero_serie, dir);
        case "marca":
          return compareLocaleTexto(a.marca, b.marca, dir);
        case "modelo":
          return compareLocaleTexto(a.modelo, b.modelo, dir);
        case "status":
          return compareLocaleTexto(ESTOQUE_EQUIP_STATUS_LABEL[a.status], ESTOQUE_EQUIP_STATUS_LABEL[b.status], dir);
        case "alocacao":
          return compareLocaleTexto(alocacao(a), alocacao(b), dir);
        default:
          return 0;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- alocacao depende só de estudioNomePorSlug
  }, [filtradosBase, statusKpi, sort, estudioNomePorSlug]);

  function onSort(col: SortCol) {
    setSort((prev) => (prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }));
  }

  const kpiClick = (s: EstoqueEquipStatus) => () => setStatusKpi((prev) => (prev === s ? "" : s));

  return (
    <>
      <div style={pageBox}>
        <SectionTitle sub="Peças por status — clique em um card para filtrar o catálogo">
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <SectionTitle compact sub="Equipamentos cadastrados">Catálogo</SectionTitle>
          {perm.canCriarOk ? (
            <CtaCriarButton onClick={() => setNovoAberto(true)} style={{ flexShrink: 0 }}>
              Novo Equipamento
            </CtaCriarButton>
          ) : null}
        </div>
        {loading ? (
          <VazioEstoque>Carregando…</VazioEstoque>
        ) : filtrados.length === 0 ? (
          <VazioEstoque>Nenhum equipamento encontrado.</VazioEstoque>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 960 })}>
              <caption style={{ display: "none" }}>Catálogo de equipamentos</caption>
              <thead>
                <tr>
                  <SortTableTh label="Código" col="codigo" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Categoria" col="categoria" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Nome" col="nome" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Número de Série" col="numero_serie" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Marca" col="marca" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Modelo" col="modelo" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Status" col="status" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Alocação" col="alocacao" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
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
                    <td style={{ ...dataTable.tdCenter, fontWeight: 700 }}>{codigoEstoqueEquipamento(r)}</td>
                    <td style={dataTable.tdCenter}>{ESTOQUE_EQUIP_CATEGORIA_LABEL[r.categoria]}</td>
                    <td style={dataTable.tdCenter} title={r.nome}>
                      {r.nome}
                    </td>
                    <td style={dataTable.tdCenter}>{r.numero_serie}</td>
                    <td style={dataTable.tdCenter}>{r.marca}</td>
                    <td style={dataTable.tdCenter}>{r.modelo}</td>
                    <td style={dataTable.tdCenter}>
                      <span style={{ display: "flex", justifyContent: "center" }}>
                        <BadgeEstoque
                          label={ESTOQUE_EQUIP_STATUS_LABEL[r.status]}
                          cor={ESTOQUE_EQUIP_STATUS_COLOR[r.status]}
                        />
                      </span>
                    </td>
                    <td style={dataTable.tdCenter}>{alocacao(r)}</td>
                    <td style={dataTable.tdCenter}>
                      <span style={{ display: "inline-flex", gap: 6 }}>
                        <BtnIconeAcaoLinha label={tooltipAcao("Ver Equipamento")} onClick={() => setVerRow(r)}>
                          <Eye size={13} aria-hidden />
                        </BtnIconeAcaoLinha>
                        {perm.canEditarOk ? (
                          <BtnIconeAcaoLinha label={tooltipAcao("Editar Equipamento")} onClick={() => setEditRow(r)}>
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

      {novoAberto ? (
        <ModalNovoEquipamentoEstoque
          proximoCodigo={proximoCodigoEstoque("EQP", rows)}
          onClose={() => setNovoAberto(false)}
          onCriado={onReload}
        />
      ) : null}

      {editRow ? (
        <ModalEditarEquipamentoEstoque row={editRow} onClose={() => setEditRow(null)} onSalvo={onReload} />
      ) : null}

      {verRow ? (
        <ModalVerEstoque
          titulo={verRow.nome}
          subtitulo={`${codigoEstoqueEquipamento(verRow)} — ${ESTOQUE_EQUIP_CATEGORIA_LABEL[verRow.categoria]}`}
          primeiraAbaLabel="Dados do Item"
          entidadeTipo="equipamento"
          entidadeId={verRow.id}
          onClose={() => setVerRow(null)}
          primeiraAbaConteudo={
            <div style={ESTOQUE_FORM_GRID}>
              <CampoLeituraEstoque label="Número de Série" valor={verRow.numero_serie || "—"} />
              <CampoLeituraEstoque label="Marca" valor={verRow.marca || "—"} />
              <CampoLeituraEstoque label="Modelo" valor={verRow.modelo || "—"} />
              <CampoLeituraEstoque label="Valor" valor={fmtBRL(verRow.valor)} />
            </div>
          }
        />
      ) : null}
    </>
  );
}
