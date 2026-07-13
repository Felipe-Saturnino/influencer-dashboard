import { useState } from "react";
import { Eye, History } from "lucide-react";
import type { SortDir } from "../../../components/dashboard";
import { SortTableTh } from "../../../components/dashboard";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { FONT } from "../../../constants/theme";
import {
  AGREGADORA_COL_LABEL,
  AGREGADORA_TABLE_COLS,
  STATUS_PIPELINE_AGREGADORA_COLOR,
  STATUS_PIPELINE_AGREGADORA_LABEL,
  STATUS_PIPELINE_AGREGADORA_ORDEM,
  badgePipelineAgregadoraStyle,
  type StatusPipelineAgregadora,
  type TableColAgregadora,
} from "./constants";
import type { AgregadoraRow } from "./types";
import { CellSelectPopover } from "../PipelineB2B/CellSelectPopover";
import { fmtUltimoContato, fmtJogos } from "./helpers";

export function AgregadorasTable({
  rows,
  sort,
  onSort,
  canEditar,
  onVer,
  onHistorico,
  onUpdateStatus,
  onUpdateUltimoContato,
  t,
}: {
  rows: AgregadoraRow[];
  sort: { col: TableColAgregadora; dir: SortDir };
  onSort: (col: TableColAgregadora) => void;
  canEditar: boolean;
  onVer: (row: AgregadoraRow) => void;
  onHistorico: (row: AgregadoraRow) => void;
  onUpdateStatus: (row: AgregadoraRow, status: StatusPipelineAgregadora) => void;
  onUpdateUltimoContato: (row: AgregadoraRow, iso: string | null) => void;
  t: {
    text: string;
    textMuted: string;
    cardBorder: string;
    inputBg: string;
    cardBg: string;
    isDark?: boolean;
  };
}) {
  const dataTable = useDataTableBlock();
  const [pop, setPop] = useState<{
    row: AgregadoraRow;
    rect: DOMRect;
  } | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: "40px 0",
          textAlign: "center",
          color: t.textMuted,
          fontSize: 13,
          fontFamily: FONT.body,
        }}
      >
        Nenhuma agregadora encontrada para os filtros selecionados.
      </div>
    );
  }

  return (
    <>
      <div className="app-table-wrap" style={getDataTableWrapStyle()}>
        <table style={getDataTableStyle({ minWidth: 720 })}>
          <caption style={{ display: "none" }}>Lista de agregadoras do pipeline</caption>
          <thead>
            <tr>
              {AGREGADORA_TABLE_COLS.map((col) => {
                const sortable =
                  col === "nome" ||
                  col === "site" ||
                  col === "jogos" ||
                  col === "status" ||
                  col === "ultimo_contato";
                if (sortable) {
                  return (
                    <SortTableTh
                      key={col}
                      label={AGREGADORA_COL_LABEL[col]}
                      col={col}
                      sortCol={sort.col}
                      sortDir={sort.dir}
                      thStyle={dataTable.thHeader}
                      align="center"
                      onSort={onSort}
                    />
                  );
                }
                return (
                  <th key={col} scope="col" style={dataTable.thHeader}>
                    {AGREGADORA_COL_LABEL[col]}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id}
                style={{
                  background:
                    hoverId === row.id
                      ? `color-mix(in srgb, ${t.cardBorder} 35%, ${dataTable.zebraRow(i)})`
                      : dataTable.zebraRow(i),
                }}
                onMouseEnter={() => setHoverId(row.id)}
                onMouseLeave={() => setHoverId(null)}
              >
                <td style={dataTable.tdCenter}>
                  <button
                    type="button"
                    onClick={() => onVer(row)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      color: "var(--brand-primary, #7c3aed)",
                      fontWeight: 600,
                      fontSize: 13,
                      fontFamily: FONT.body,
                      textDecoration: "underline",
                      textUnderlineOffset: 2,
                    }}
                  >
                    {row.nome}
                  </button>
                </td>
                <td style={dataTable.tdCenter}>
                  <a
                    href={row.site}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "var(--brand-primary, #7c3aed)",
                      fontSize: 13,
                      fontFamily: FONT.body,
                    }}
                  >
                    {row.site.replace(/^https?:\/\//i, "")}
                  </a>
                </td>
                <td style={dataTable.tdCenter}>{fmtJogos(row.jogos)}</td>
                <td style={dataTable.tdCenter}>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <button
                      type="button"
                      disabled={!canEditar}
                      aria-label={`Status ${STATUS_PIPELINE_AGREGADORA_LABEL[row.status_pipeline]}`}
                      onClick={(e) => {
                        if (!canEditar) return;
                        setPop({ row, rect: e.currentTarget.getBoundingClientRect() });
                      }}
                      style={{
                        ...badgePipelineAgregadoraStyle(
                          STATUS_PIPELINE_AGREGADORA_COLOR[row.status_pipeline],
                        ),
                        cursor: canEditar ? "pointer" : "default",
                        fontFamily: FONT.body,
                      }}
                    >
                      {STATUS_PIPELINE_AGREGADORA_LABEL[row.status_pipeline]}
                    </button>
                  </div>
                </td>
                <td style={dataTable.tdCenter}>
                  {canEditar ? (
                    <input
                      type="date"
                      aria-label={`Último contato — ${row.nome}`}
                      value={row.ultimo_contato ?? ""}
                      onChange={(e) => {
                        const v = e.target.value || null;
                        void onUpdateUltimoContato(row, v);
                      }}
                      style={{
                        border: `1px solid ${t.cardBorder}`,
                        borderRadius: 8,
                        background: t.inputBg,
                        color: t.text,
                        fontSize: 12,
                        fontFamily: FONT.body,
                        padding: "4px 8px",
                      }}
                    />
                  ) : (
                    fmtUltimoContato(row.ultimo_contato)
                  )}
                </td>
                <td style={dataTable.tdCenter}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <BtnIconeAcaoLinha
                      label={tooltipAcao("Ver agregadora")}
                      onClick={() => onVer(row)}
                    >
                      <Eye size={13} aria-hidden />
                    </BtnIconeAcaoLinha>
                    <BtnIconeAcaoLinha
                      label={tooltipAcao("Histórico da agregadora")}
                      onClick={() => onHistorico(row)}
                    >
                      <History size={13} aria-hidden />
                    </BtnIconeAcaoLinha>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CellSelectPopover
        open={!!pop}
        anchorRect={pop?.rect ?? null}
        options={STATUS_PIPELINE_AGREGADORA_ORDEM}
        value={pop?.row.status_pipeline ?? "conexao"}
        onSelect={(v) => {
          if (pop) void onUpdateStatus(pop.row, v);
          setPop(null);
        }}
        onClose={() => setPop(null)}
        labelOption={(v) => STATUS_PIPELINE_AGREGADORA_LABEL[v]}
        t={t}
      />
    </>
  );
}
