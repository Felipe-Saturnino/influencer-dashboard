import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Eye, Loader2, Pencil } from "lucide-react";
import type { CSSProperties } from "react";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import SectionTitle from "../../../components/dashboard/SectionTitle";
import { SortTableTh, type SortDir } from "../../../components/dashboard";
import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import { compareLocaleTexto } from "../../../lib/classificacaoSort";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import type { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import {
  CS_ATENDIMENTO_CONTA_INSTAGRAM,
  CS_ATENDIMENTO_STATUS_CORES,
  fmtDataChamado,
  fmtTempoRespostaChamado,
  labelStatusChamado,
  slaInstagramComentTodosStatus,
  slaInstagramDmTodosStatus,
} from "../../../lib/csAtendimentoConstants";
import { unwrapCsEmbed } from "../../../lib/csAtendimentoHelpers";
import {
  COL_LABEL_INSTAGRAM_COMENT,
  COL_LABEL_INSTAGRAM_DM,
  getColunasInstagramComent,
  getColunasInstagramDm,
  solicitanteInstagram,
  type SortColInstagramComent,
  type SortColInstagramDm,
} from "../../../lib/csAtendimentoTableColumns";
import type { CsChamadoFiltroStatus, CsChamadoRow } from "../../../types/csAtendimento";
import type { usePermission } from "../../../hooks/usePermission";

type DataTable = ReturnType<typeof useDataTableBlock>;
type Perm = ReturnType<typeof usePermission>;

function nomeAtendente(row: CsChamadoRow): string {
  return unwrapCsEmbed(row.atendente)?.name?.trim() || "—";
}

function badgeStatus(status: CsChamadoRow["status"]) {
  const cor = CS_ATENDIMENTO_STATUS_CORES[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 10,
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: 20,
        background: `${cor}22`,
        color: cor,
        border: `1px solid ${cor}44`,
        whiteSpace: "nowrap",
      }}
    >
      {labelStatusChamado(status)}
    </span>
  );
}

function celulaTextoEllipsis(valor: string, maxWidth = 160) {
  return (
    <span
      style={{
        display: "inline-block",
        maxWidth,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
      title={valor !== "—" ? valor : undefined}
    >
      {valor}
    </span>
  );
}

function ordenarDm(rows: CsChamadoRow[], col: SortColInstagramDm, dir: SortDir) {
  return [...rows].sort((a, b) => {
    switch (col) {
      case "chamado":
        return compareLocaleTexto(a.protocolo, b.protocolo, dir);
      case "data":
        return (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0) * (dir === "asc" ? 1 : -1);
      case "solicitante":
        return compareLocaleTexto(solicitanteInstagram(a), solicitanteInstagram(b), dir);
      case "inicio":
        return (
          ((a.inicio_atendimento_em ?? "") < (b.inicio_atendimento_em ?? "") ? -1 : (a.inicio_atendimento_em ?? "") > (b.inicio_atendimento_em ?? "") ? 1 : 0) *
          (dir === "asc" ? 1 : -1)
        );
      case "atendente":
        return compareLocaleTexto(nomeAtendente(a), nomeAtendente(b), dir);
      case "tempo_resposta":
        return compareLocaleTexto(
          fmtTempoRespostaChamado(a.created_at, a.primeira_resposta_em),
          fmtTempoRespostaChamado(b.created_at, b.primeira_resposta_em),
          dir,
        );
      case "sla":
        return compareLocaleTexto(slaInstagramDmTodosStatus(a), slaInstagramDmTodosStatus(b), dir);
      case "status":
        return compareLocaleTexto(labelStatusChamado(a.status), labelStatusChamado(b.status), dir);
      default:
        return 0;
    }
  });
}

function ordenarComent(rows: CsChamadoRow[], col: SortColInstagramComent, dir: SortDir) {
  return [...rows].sort((a, b) => {
    switch (col) {
      case "chamado":
        return compareLocaleTexto(a.protocolo, b.protocolo, dir);
      case "data":
        return (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0) * (dir === "asc" ? 1 : -1);
      case "solicitante":
        return compareLocaleTexto(solicitanteInstagram(a), solicitanteInstagram(b), dir);
      case "inicio":
        return (
          ((a.inicio_atendimento_em ?? "") < (b.inicio_atendimento_em ?? "") ? -1 : (a.inicio_atendimento_em ?? "") > (b.inicio_atendimento_em ?? "") ? 1 : 0) *
          (dir === "asc" ? 1 : -1)
        );
      case "atendente":
        return compareLocaleTexto(nomeAtendente(a), nomeAtendente(b), dir);
      case "sla":
        return compareLocaleTexto(slaInstagramComentTodosStatus(a), slaInstagramComentTodosStatus(b), dir);
      case "status":
        return compareLocaleTexto(labelStatusChamado(a.status), labelStatusChamado(b.status), dir);
      default:
        return 0;
    }
  });
}

export interface CsAtendimentoInstagramPainelProps {
  listaDm: CsChamadoRow[];
  listaComentario: CsChamadoRow[];
  loading: boolean;
  filtroStatus: CsChamadoFiltroStatus;
  t: Theme;
  dataTable: DataTable;
  pageBox: CSSProperties;
  perm: Perm;
  onVer: (row: CsChamadoRow) => void;
  onAtender: (row: CsChamadoRow) => void;
}

function TabelaBloco({
  titulo,
  sub,
  caption,
  colunas,
  colLabels,
  rows,
  sortCol,
  sortDir,
  onSort,
  renderLinha,
  loading,
  t,
  dataTable,
  minWidth,
}: {
  titulo: string;
  sub: string;
  caption: string;
  colunas: string[];
  colLabels: Record<string, string>;
  rows: CsChamadoRow[];
  sortCol: string;
  sortDir: SortDir;
  onSort: (col: string) => void;
  renderLinha: (row: CsChamadoRow, i: number) => ReactNode;
  loading: boolean;
  t: Theme;
  dataTable: DataTable;
  minWidth: number;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <SectionTitle sub={sub}>{titulo}</SectionTitle>
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
          <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 13 }}>Carregando…</div>
        </div>
      ) : rows.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Nenhum chamado encontrado.
        </div>
      ) : (
        <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
          <table style={getDataTableStyle({ minWidth })}>
            <caption style={{ display: "none" }}>{caption}</caption>
            <thead>
              <tr>
                {colunas.map((col) =>
                  col === "acoes" ? (
                    <th key={col} scope="col" style={dataTable.thHeader}>
                      {colLabels[col]}
                    </th>
                  ) : (
                    <SortTableTh
                      key={col}
                      label={colLabels[col] ?? col}
                      col={col}
                      sortCol={sortCol}
                      sortDir={sortDir}
                      onSort={onSort}
                      thStyle={col === "chamado" ? dataTable.thHeaderSticky : dataTable.thHeader}
                      align="center"
                    />
                  ),
                )}
              </tr>
            </thead>
            <tbody>{rows.map((row, i) => renderLinha(row, i))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function CsAtendimentoInstagramPainel({
  listaDm,
  listaComentario,
  loading,
  filtroStatus,
  t,
  dataTable,
  pageBox,
  perm,
  onVer,
  onAtender,
}: CsAtendimentoInstagramPainelProps) {
  const [sortDm, setSortDm] = useState<{ col: SortColInstagramDm; dir: SortDir }>({ col: "data", dir: "desc" });
  const [sortComent, setSortComent] = useState<{ col: SortColInstagramComent; dir: SortDir }>({ col: "data", dir: "desc" });

  const colunasDm = useMemo(() => getColunasInstagramDm(filtroStatus), [filtroStatus]);
  const colunasComent = useMemo(() => getColunasInstagramComent(filtroStatus), [filtroStatus]);

  useEffect(() => {
    if (!colunasDm.includes(sortDm.col)) {
      setSortDm({ col: "data", dir: "desc" });
    }
  }, [colunasDm, sortDm.col]);

  useEffect(() => {
    if (!colunasComent.includes(sortComent.col)) {
      setSortComent({ col: "data", dir: "desc" });
    }
  }, [colunasComent, sortComent.col]);

  const rowsDm = useMemo(() => ordenarDm(listaDm, sortDm.col, sortDm.dir), [listaDm, sortDm]);
  const rowsComent = useMemo(() => ordenarComent(listaComentario, sortComent.col, sortComent.dir), [listaComentario, sortComent]);

  function onSortDm(col: string) {
    const c = col as SortColInstagramDm;
    setSortDm((s) => (s.col === c ? { col: c, dir: s.dir === "asc" ? "desc" : "asc" } : { col: c, dir: c === "data" ? "desc" : "asc" }));
  }

  function onSortComent(col: string) {
    const c = col as SortColInstagramComent;
    setSortComent((s) => (s.col === c ? { col: c, dir: s.dir === "asc" ? "desc" : "asc" } : { col: c, dir: c === "data" ? "desc" : "asc" }));
  }

  function renderAcoes(row: CsChamadoRow) {
    return (
      <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
        <BtnIconeAcaoLinha label={tooltipAcao("Ver Chamado")} onClick={() => onVer(row)}>
          <Eye size={14} aria-hidden />
        </BtnIconeAcaoLinha>
        {row.status !== "arquivado" && perm.canEditarOk ? (
          <BtnIconeAcaoLinha label={tooltipAcao("Atender Chamado")} onClick={() => onAtender(row)}>
            <Pencil size={14} aria-hidden />
          </BtnIconeAcaoLinha>
        ) : null}
      </div>
    );
  }

  function renderLinhaDm(row: CsChamadoRow, i: number) {
    return (
      <tr
        key={row.id}
        style={{ background: dataTable.zebraRow(i) }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = t.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = dataTable.zebraRow(i);
        }}
      >
        {colunasDm.map((col) => {
          if (col === "chamado") {
            return (
              <td key={col} style={dataTable.tdSticky({ rowIndex: i })}>
                <strong>{row.protocolo}</strong>
              </td>
            );
          }
          if (col === "data") return <td key={col} style={dataTable.tdCenter}>{fmtDataChamado(row.created_at)}</td>;
          if (col === "solicitante") {
            return (
              <td key={col} style={dataTable.tdCenter}>
                {celulaTextoEllipsis(solicitanteInstagram(row))}
              </td>
            );
          }
          if (col === "inicio") return <td key={col} style={dataTable.tdCenter}>{fmtDataChamado(row.inicio_atendimento_em)}</td>;
          if (col === "atendente") return <td key={col} style={dataTable.tdCenter}>{celulaTextoEllipsis(nomeAtendente(row))}</td>;
          if (col === "tempo_resposta") {
            return (
              <td key={col} style={dataTable.tdCenter}>
                {fmtTempoRespostaChamado(row.created_at, row.primeira_resposta_em)}
              </td>
            );
          }
          if (col === "sla") return <td key={col} style={dataTable.tdCenter}>{slaInstagramDmTodosStatus(row)}</td>;
          if (col === "status") {
            return (
              <td key={col} style={dataTable.tdCenter}>
                <div style={{ display: "flex", justifyContent: "center" }}>{badgeStatus(row.status)}</div>
              </td>
            );
          }
          return (
            <td key={col} style={dataTable.tdCenter}>
              {renderAcoes(row)}
            </td>
          );
        })}
      </tr>
    );
  }

  function renderLinhaComent(row: CsChamadoRow, i: number) {
    return (
      <tr
        key={row.id}
        style={{ background: dataTable.zebraRow(i) }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = t.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = dataTable.zebraRow(i);
        }}
      >
        {colunasComent.map((col) => {
          if (col === "chamado") {
            return (
              <td key={col} style={dataTable.tdSticky({ rowIndex: i })}>
                <strong>{row.protocolo}</strong>
              </td>
            );
          }
          if (col === "data") return <td key={col} style={dataTable.tdCenter}>{fmtDataChamado(row.created_at)}</td>;
          if (col === "solicitante") {
            return (
              <td key={col} style={dataTable.tdCenter}>
                {celulaTextoEllipsis(solicitanteInstagram(row))}
              </td>
            );
          }
          if (col === "inicio") return <td key={col} style={dataTable.tdCenter}>{fmtDataChamado(row.inicio_atendimento_em)}</td>;
          if (col === "atendente") return <td key={col} style={dataTable.tdCenter}>{celulaTextoEllipsis(nomeAtendente(row))}</td>;
          if (col === "sla") return <td key={col} style={dataTable.tdCenter}>{slaInstagramComentTodosStatus(row)}</td>;
          if (col === "status") {
            return (
              <td key={col} style={dataTable.tdCenter}>
                <div style={{ display: "flex", justifyContent: "center" }}>{badgeStatus(row.status)}</div>
              </td>
            );
          }
          return (
            <td key={col} style={dataTable.tdCenter}>
              {renderAcoes(row)}
            </td>
          );
        })}
      </tr>
    );
  }

  return (
    <div id="panel-cs-instagram" role="tabpanel" aria-labelledby="tab-cs-instagram">
      <div style={pageBox}>
        <TabelaBloco
          titulo="Mensagens"
          sub={`DM privadas da conta ${CS_ATENDIMENTO_CONTA_INSTAGRAM}`}
          caption="Lista de chamados Instagram — mensagens diretas"
          colunas={colunasDm}
          colLabels={COL_LABEL_INSTAGRAM_DM}
          rows={rowsDm}
          sortCol={sortDm.col}
          sortDir={sortDm.dir}
          onSort={onSortDm}
          renderLinha={renderLinhaDm}
          loading={loading}
          t={t}
          dataTable={dataTable}
          minWidth={800}
        />
      </div>

      <div style={pageBox}>
        <TabelaBloco
          titulo="Comentários"
          sub="Comentários públicos em posts da conta"
          caption="Lista de chamados Instagram — comentários"
          colunas={colunasComent}
          colLabels={COL_LABEL_INSTAGRAM_COMENT}
          rows={rowsComent}
          sortCol={sortComent.col}
          sortDir={sortComent.dir}
          onSort={onSortComent}
          renderLinha={renderLinhaComent}
          loading={loading}
          t={t}
          dataTable={dataTable}
          minWidth={720}
        />
      </div>
    </div>
  );
}
