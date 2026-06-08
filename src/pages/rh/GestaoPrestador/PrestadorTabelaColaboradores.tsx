import {
  ClipboardList,
  Eye,
  EyeOff,
  History,
  Pencil,
  StickyNote,
  Trash2,
} from "lucide-react";
import type { CSSProperties } from "react";
import type { Theme } from "../../../constants/theme";
import { FONT } from "../../../constants/theme";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { nomeLiderPrimeiroUltimoParaTabela } from "../../../lib/rhOrganogramaLiderImediato";
import { revisaoCadastralPendenteParaFuncionario } from "../../../lib/rhCadastroRevisao";
import type { RhFuncionario } from "../../../types/rhFuncionario";
import { SkeletonTableRow, SortTableTh, type SortDir } from "../../../components/dashboard";
import {
  blurSensivel,
  corStatusPrestador,
  ctaGradient,
  labelStatusPrestador,
  textoDataFuncaoColunaTabela,
  textoRemuneracaoColunaTabela,
  type PrestadoresSortCol,
} from "./gestaoPrestadorHelpers";
type DashboardBrand = ReturnType<
  typeof import("../../../hooks/useDashboardBrand").useDashboardBrand
>;

type Props = {
  brand: DashboardBrand;
  t: Theme;
  panelPaginaRhId: string;
  idTabPagina: string;
  legendaTabelaPorAba: string;
  tabelaSemSalario: boolean;
  colunasTabela: number;
  preencherAcoesHeadcount: boolean;
  tabelaAcoesRh: boolean;
  tabelaAnotacoesRh: boolean;
  loading: boolean;
  filtrada: RhFuncionario[];
  filtradaOrdenada: RhFuncionario[];
  sortPrestadores: { col: PrestadoresSortCol; dir: SortDir };
  onSortPrestadores: (col: PrestadoresSortCol) => void;
  liderImediatoLinha: (row: RhFuncionario) => string;
  podeVerDadosSensiveis: boolean;
  tabelaSalarioVisivel: boolean;
  onToggleTabelaSalarioVisivel: () => void;
  podeEditar: boolean;
  podeExcluir: boolean;
  onAbrirVer: (row: RhFuncionario) => void;
  onAbrirHistorico: (row: RhFuncionario) => void;
  onAbrirEditar: (row: RhFuncionario) => void;
  onRegistrarAcao: (row: RhFuncionario) => void;
  onRegistrarAnotacao: (row: RhFuncionario) => void;
  onConfirmarExclusao: (row: RhFuncionario) => void;
};

export function PrestadorTabelaColaboradores({
  brand,
  t,
  panelPaginaRhId,
  idTabPagina,
  legendaTabelaPorAba,
  tabelaSemSalario,
  colunasTabela,
  preencherAcoesHeadcount,
  tabelaAcoesRh,
  tabelaAnotacoesRh,
  loading,
  filtrada,
  filtradaOrdenada,
  sortPrestadores,
  onSortPrestadores,
  liderImediatoLinha,
  podeVerDadosSensiveis,
  tabelaSalarioVisivel,
  onToggleTabelaSalarioVisivel,
  podeEditar,
  podeExcluir,
  onAbrirVer,
  onAbrirHistorico,
  onAbrirEditar,
  onRegistrarAcao,
  onRegistrarAnotacao,
  onConfirmarExclusao,
}: Props) {
  const dataTable = useDataTableBlock();

  const btnIconTabela: CSSProperties = {
    padding: "6px 10px",
    borderRadius: 8,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: FONT.body,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
  const btnIconTabelaCta: CSSProperties = {
    ...btnIconTabela,
    border: "none",
    color: "#fff",
    fontWeight: 700,
    background: ctaGradient(brand),
  };
  const btnIconTabelaPerigo: CSSProperties = {
    ...btnIconTabela,
    border: "1px solid rgba(232,64,37,0.45)",
    color: "#e84025",
  };

  return (
    <div role="tabpanel" id={panelPaginaRhId} aria-labelledby={idTabPagina}>
      <div className="app-table-wrap" style={getDataTableWrapStyle()}>
        <table style={getDataTableStyle({ minWidth: tabelaSemSalario ? 620 : 720 })}>
          <caption style={{ display: "none" }}>{legendaTabelaPorAba}</caption>
          <thead>
            <tr>
              <SortTableTh<PrestadoresSortCol>
                label="Nome"
                col="nome"
                sortCol={sortPrestadores.col}
                sortDir={sortPrestadores.dir}
                onSort={onSortPrestadores}
                thStyle={dataTable.thHeader}
                align="center"
              />
              <SortTableTh<PrestadoresSortCol>
                label="Função"
                col="cargo"
                sortCol={sortPrestadores.col}
                sortDir={sortPrestadores.dir}
                onSort={onSortPrestadores}
                thStyle={dataTable.thHeader}
                align="center"
              />
              <SortTableTh<PrestadoresSortCol>
                label="Líder Imediato"
                col="lider"
                sortCol={sortPrestadores.col}
                sortDir={sortPrestadores.dir}
                onSort={onSortPrestadores}
                thStyle={dataTable.thHeader}
                align="center"
              />
              <SortTableTh<PrestadoresSortCol>
                label="Data da Função"
                col="data_funcao"
                sortCol={sortPrestadores.col}
                sortDir={sortPrestadores.dir}
                onSort={onSortPrestadores}
                thStyle={dataTable.thHeader}
                align="center"
              />
              {!tabelaSemSalario ? (
                <SortTableTh<PrestadoresSortCol>
                  label="Remuneração"
                  col="salario"
                  sortCol={sortPrestadores.col}
                  sortDir={sortPrestadores.dir}
                  onSort={onSortPrestadores}
                  thStyle={dataTable.thHeader}
                  align="center"
                  endAdornment={
                    podeVerDadosSensiveis ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleTabelaSalarioVisivel();
                        }}
                        aria-label={
                          tabelaSalarioVisivel
                            ? "Ocultar valores de remuneração na tabela"
                            : "Exibir valores de remuneração na tabela"
                        }
                        title={tabelaSalarioVisivel ? "Ocultar" : "Ver"}
                        style={{
                          padding: 4,
                          borderRadius: 8,
                          border: `1px solid ${t.cardBorder}`,
                          background: t.inputBg,
                          cursor: "pointer",
                          color: t.textMuted,
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        {tabelaSalarioVisivel ? (
                          <EyeOff size={14} aria-hidden />
                        ) : (
                          <Eye size={14} aria-hidden />
                        )}
                      </button>
                    ) : null
                  }
                />
              ) : null}
              <SortTableTh<PrestadoresSortCol>
                label="Status"
                col="status"
                sortCol={sortPrestadores.col}
                sortDir={sortPrestadores.dir}
                onSort={onSortPrestadores}
                thStyle={dataTable.thHeader}
                align="center"
              />
              <th scope="col" style={dataTable.thHeader}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                <SkeletonTableRow cols={colunasTabela} />
                <SkeletonTableRow cols={colunasTabela} />
              </>
            ) : filtrada.length === 0 ? (
              <tr>
                <td
                  colSpan={colunasTabela}
                  style={{ ...dataTable.tdCenter, padding: "40px 16px", color: t.textMuted }}
                >
                  Sem dados para o período selecionado.
                </td>
              </tr>
            ) : (
              filtradaOrdenada.map((row, i) => {
                const nomeExibicao = row.nome.trim() || "—";
                const liderCompleto = liderImediatoLinha(row);
                const lider = nomeLiderPrimeiroUltimoParaTabela(liderCompleto);
                const remCol = textoRemuneracaoColunaTabela(row);
                const dataFuncaoTxt = textoDataFuncaoColunaTabela(row);
                const zebraBg = dataTable.zebraRow(i);
                return (
                  <tr
                    key={row.id}
                    style={{ background: zebraBg }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = t.isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(0,0,0,0.02)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = zebraBg;
                    }}
                  >
                    <td
                      style={{
                        ...dataTable.tdCenter,
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={nomeExibicao !== "—" ? row.nome.trim() : undefined}
                    >
                      {nomeExibicao}
                      {revisaoCadastralPendenteParaFuncionario(row) ? (
                        <span
                          style={{
                            display: "inline-block",
                            marginLeft: 8,
                            padding: "2px 8px",
                            borderRadius: 999,
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#f59e0b",
                            border: "1px solid rgba(245, 158, 11, 0.45)",
                            background: "rgba(245, 158, 11, 0.12)",
                            verticalAlign: "middle",
                          }}
                        >
                          Revisão pendente
                        </span>
                      ) : null}
                    </td>
                    <td style={dataTable.tdCenter}>{row.cargo}</td>
                    <td
                      style={{
                        ...dataTable.tdCenter,
                        maxWidth: 140,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={liderCompleto !== "—" ? liderCompleto : undefined}
                    >
                      {lider}
                    </td>
                    <td style={dataTable.tdCenter}>{dataFuncaoTxt}</td>
                    {!tabelaSemSalario ? (
                      <td
                        title={
                          podeVerDadosSensiveis && tabelaSalarioVisivel ? remCol.title : undefined
                        }
                        style={{
                          ...dataTable.tdCenter,
                          ...(podeVerDadosSensiveis && !tabelaSalarioVisivel ? blurSensivel : {}),
                        }}
                      >
                        {podeVerDadosSensiveis ? remCol.texto : "—"}
                      </td>
                    ) : null}
                    <td style={dataTable.tdCenter}>
                      <span style={{ fontWeight: 700, color: corStatusPrestador(row.status) }}>
                        {labelStatusPrestador(row.status)}
                      </span>
                    </td>
                    <td style={dataTable.tdCenter}>
                      {preencherAcoesHeadcount || tabelaAcoesRh || tabelaAnotacoesRh ? (
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            justifyContent: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => onAbrirVer(row)}
                            style={btnIconTabela}
                            aria-label={`Visualizar ${row.nome}`}
                          >
                            <Eye size={14} aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => onAbrirHistorico(row)}
                            style={btnIconTabela}
                            aria-label={`Histórico de ${row.nome}`}
                          >
                            <History size={14} aria-hidden />
                          </button>
                          {preencherAcoesHeadcount && podeEditar ? (
                            <button
                              type="button"
                              onClick={() => onAbrirEditar(row)}
                              style={btnIconTabela}
                              aria-label={`Editar ${row.nome}`}
                            >
                              <Pencil size={14} aria-hidden />
                            </button>
                          ) : null}
                          {tabelaAcoesRh && podeEditar ? (
                            <button
                              type="button"
                              onClick={() => onRegistrarAcao(row)}
                              style={btnIconTabelaCta}
                              aria-label={`Registrar ação de RH para ${row.nome}`}
                            >
                              <ClipboardList size={14} aria-hidden />
                            </button>
                          ) : null}
                          {tabelaAnotacoesRh && podeEditar ? (
                            <button
                              type="button"
                              onClick={() => onRegistrarAnotacao(row)}
                              style={btnIconTabelaCta}
                              aria-label={`Registrar anotação de RH para ${row.nome}`}
                            >
                              <StickyNote size={14} aria-hidden />
                            </button>
                          ) : null}
                          {podeExcluir ? (
                            <button
                              type="button"
                              onClick={() => onConfirmarExclusao(row)}
                              style={btnIconTabelaPerigo}
                              aria-label={`Excluir ${row.nome}`}
                            >
                              <Trash2 size={14} aria-hidden />
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
