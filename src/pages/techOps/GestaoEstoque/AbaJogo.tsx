import { useMemo, useState } from "react";
import { Eye, Pencil } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { compareLocaleTexto, compareNumber } from "../../../lib/classificacaoSort";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { SectionTitle, SortTableTh, CtaCriarButton, type SortDir } from "../../../components/dashboard";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import type { Permissoes } from "../../../hooks/usePermission";
import {
  codigoEstoqueJogoLote,
  ESTOQUE_JOGO_CATEGORIAS,
  ESTOQUE_JOGO_CATEGORIA_LABEL,
  proximoCodigoEstoque,
  qtdAtualJogoLote,
  type EstoqueJogoCategoria,
  type EstoqueJogoLoteRow,
} from "../../../lib/techOpsEstoque";
import { CampoLeituraEstoque, ESTOQUE_FORM_GRID, KpiEstoqueCard, VazioEstoque } from "./estoqueUi";
import { ModalVerEstoque } from "./ModalVerEstoque";
import { ModalNovoJogoEstoque } from "./ModaisNovoEstoque";
import { ModalEditarJogoEstoque } from "./ModaisEditarEstoque";

type SortCol = "codigo" | "categoria" | "nome_lote" | "qtd_inicial" | "qtd_consumida" | "qtd_atual";

/** Cores locais dos cards de consumíveis de jogo (não são identidade de jogo Baccarat/Roleta/BJ/FB). */
const JOGO_KPI_COR: Record<EstoqueJogoCategoria, string> = {
  bolinhas: "#a78bfa",
  cartas: "#3b82f6",
  tecidos: "#22c55e",
};

export function AbaJogo({
  rows,
  loading,
  busca,
  filtroEstudio,
  filtroCategoria,
  setFiltroCategoria,
  perm,
  onReload,
}: {
  rows: EstoqueJogoLoteRow[];
  loading: boolean;
  busca: string;
  filtroEstudio: string;
  filtroCategoria: string;
  setFiltroCategoria: (c: string) => void;
  perm: Permissoes;
  onReload: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: "codigo", dir: "asc" });
  const [novoAberto, setNovoAberto] = useState(false);
  const [verRow, setVerRow] = useState<EstoqueJogoLoteRow | null>(null);
  const [editRow, setEditRow] = useState<EstoqueJogoLoteRow | null>(null);

  const pageBox = getPageContentBoxStyle(brand, t);

  const filtradosSemCategoria = useMemo(
    () =>
      rows.filter((r) => {
        if (filtroEstudio !== "todos" && r.estudio_slug !== filtroEstudio) return false;
        return textoContemBuscaEmAlgum(busca, codigoEstoqueJogoLote(r), r.nome_lote);
      }),
    [rows, filtroEstudio, busca],
  );

  const kpis = useMemo(
    () =>
      ESTOQUE_JOGO_CATEGORIAS.map((c) => {
        const daCategoria = filtradosSemCategoria.filter((r) => r.categoria === c);
        return {
          categoria: c,
          valor: daCategoria.reduce((s, r) => s + qtdAtualJogoLote(r), 0),
          breakdown: [
            { label: "Qtd Inicial", valor: daCategoria.reduce((s, r) => s + r.qtd_inicial, 0) },
            { label: "Qtd Consumida", valor: daCategoria.reduce((s, r) => s + r.qtd_consumida, 0) },
            { label: "Qtd Descartada", valor: daCategoria.reduce((s, r) => s + r.qtd_descartada, 0) },
          ],
        };
      }),
    [filtradosSemCategoria],
  );

  const filtrados = useMemo(() => {
    const lista = filtroCategoria
      ? filtradosSemCategoria.filter((r) => r.categoria === filtroCategoria)
      : filtradosSemCategoria;
    const dir = sort.dir;
    return [...lista].sort((a, b) => {
      switch (sort.col) {
        case "codigo":
          return compareNumber(a.codigo_num, b.codigo_num, dir);
        case "categoria":
          return compareLocaleTexto(
            ESTOQUE_JOGO_CATEGORIA_LABEL[a.categoria],
            ESTOQUE_JOGO_CATEGORIA_LABEL[b.categoria],
            dir,
          );
        case "nome_lote":
          return compareLocaleTexto(a.nome_lote, b.nome_lote, dir);
        case "qtd_inicial":
          return compareNumber(a.qtd_inicial, b.qtd_inicial, dir);
        case "qtd_consumida":
          return compareNumber(a.qtd_consumida, b.qtd_consumida, dir);
        case "qtd_atual":
          return compareNumber(qtdAtualJogoLote(a), qtdAtualJogoLote(b), dir);
        default:
          return 0;
      }
    });
  }, [filtradosSemCategoria, filtroCategoria, sort]);

  function onSort(col: SortCol) {
    setSort((prev) => (prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }));
  }

  return (
    <>
      <div style={pageBox}>
        <SectionTitle sub="Quantidade atual por categoria — clique em um card para filtrar o catálogo">
          Consolidado de Estoque
        </SectionTitle>
        <div className="app-grid-kpi-3" style={{ display: "grid", gap: 12 }}>
          {kpis.map((k) => (
            <KpiEstoqueCard
              key={k.categoria}
              label={ESTOQUE_JOGO_CATEGORIA_LABEL[k.categoria]}
              valor={k.valor}
              cor={JOGO_KPI_COR[k.categoria]}
              active={filtroCategoria === k.categoria}
              onClick={() => setFiltroCategoria(filtroCategoria === k.categoria ? "" : k.categoria)}
              breakdown={k.breakdown}
            />
          ))}
        </div>
      </div>

      <div style={pageBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <SectionTitle sub="Lotes de itens de jogo cadastrados">Catálogo</SectionTitle>
          {perm.canCriarOk ? (
            <CtaCriarButton onClick={() => setNovoAberto(true)}>Novo Item de Jogo</CtaCriarButton>
          ) : null}
        </div>
        {loading ? (
          <VazioEstoque>Carregando…</VazioEstoque>
        ) : filtrados.length === 0 ? (
          <VazioEstoque>Nenhum item de jogo encontrado.</VazioEstoque>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 760 })}>
              <caption style={{ display: "none" }}>Catálogo de itens de jogo</caption>
              <thead>
                <tr>
                  <SortTableTh label="Código" col="codigo" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Categoria" col="categoria" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Nome do Lote" col="nome_lote" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Qtd Inicial" col="qtd_inicial" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Qtd Consumida" col="qtd_consumida" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Qtd Atual" col="qtd_atual" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
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
                    <td style={{ ...dataTable.tdCenter, fontWeight: 700 }}>{codigoEstoqueJogoLote(r)}</td>
                    <td style={dataTable.tdCenter}>{ESTOQUE_JOGO_CATEGORIA_LABEL[r.categoria]}</td>
                    <td style={dataTable.tdCenter} title={r.nome_lote}>
                      {r.nome_lote}
                    </td>
                    <td style={dataTable.tdCenter}>{r.qtd_inicial.toLocaleString("pt-BR")}</td>
                    <td style={dataTable.tdCenter}>{r.qtd_consumida.toLocaleString("pt-BR")}</td>
                    <td style={dataTable.tdCenter}>{qtdAtualJogoLote(r).toLocaleString("pt-BR")}</td>
                    <td style={dataTable.tdCenter}>
                      <span style={{ display: "inline-flex", gap: 6 }}>
                        <BtnIconeAcaoLinha label={tooltipAcao("Ver Item de Jogo")} onClick={() => setVerRow(r)}>
                          <Eye size={13} aria-hidden />
                        </BtnIconeAcaoLinha>
                        {perm.canEditarOk ? (
                          <BtnIconeAcaoLinha label={tooltipAcao("Editar Item de Jogo")} onClick={() => setEditRow(r)}>
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
        <ModalNovoJogoEstoque
          proximoCodigo={proximoCodigoEstoque("JOG", rows)}
          onClose={() => setNovoAberto(false)}
          onCriado={onReload}
        />
      ) : null}

      {editRow ? <ModalEditarJogoEstoque row={editRow} onClose={() => setEditRow(null)} onSalvo={onReload} /> : null}

      {verRow ? (
        <ModalVerEstoque
          titulo={verRow.nome_lote}
          subtitulo={`${codigoEstoqueJogoLote(verRow)} — ${ESTOQUE_JOGO_CATEGORIA_LABEL[verRow.categoria]}`}
          primeiraAbaLabel="Quantidades do Item"
          entidadeTipo="jogo"
          entidadeId={verRow.id}
          onClose={() => setVerRow(null)}
          primeiraAbaConteudo={
            <div style={ESTOQUE_FORM_GRID}>
              <CampoLeituraEstoque label="Quantidade Inicial" valor={verRow.qtd_inicial.toLocaleString("pt-BR")} />
              <CampoLeituraEstoque label="Quantidade Consumida" valor={verRow.qtd_consumida.toLocaleString("pt-BR")} />
              <CampoLeituraEstoque label="Quantidade Descartada" valor={verRow.qtd_descartada.toLocaleString("pt-BR")} />
              <CampoLeituraEstoque label="Quantidade de Estoque" valor={qtdAtualJogoLote(verRow).toLocaleString("pt-BR")} />
            </div>
          }
        />
      ) : null}
    </>
  );
}
