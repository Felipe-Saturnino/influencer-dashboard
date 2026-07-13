import { useMemo, useState, type CSSProperties, type MouseEvent } from "react";
import { History, MessageSquare } from "lucide-react";
import type { SortDir } from "../../../components/dashboard";
import { SortTableTh } from "../../../components/dashboard";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { FONT } from "../../../constants/theme";
import { CellSelectPopover } from "../PipelineB2B/CellSelectPopover";
import { placeholderPesquisaFiltro } from "../../../lib/searchBarConstants";
import {
  INTEGRACAO_COL_LABEL,
  INTEGRACAO_TABLE_COLS,
  PRIORIDADE_COLOR,
  PRIORIDADE_LABEL,
  PRIORIDADE_ORDEM,
  SORTABLE_COLS_INTEGRACAO,
  STATUS_INTEGRACAO_COLOR,
  STATUS_INTEGRACAO_LABEL,
  STATUS_INTEGRACAO_ORDEM,
  TIPO_INTEGRACAO_LABEL,
  badgeIntegracaoStyle,
  type PrioridadeIntegracao,
  type StatusIntegracao,
  type TableColIntegracao,
} from "./constants";
import type { IntegracaoRow } from "./types";
import { truncarComentario } from "./helpers";

const cellEditable: CSSProperties = {
  cursor: "pointer",
  borderRadius: 8,
  minHeight: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
};

type PopoverKind = "prioridade" | "status" | "agregadora";

export function IntegracaoTable({
  rows,
  agregadoraOpcoes,
  sort,
  onSort,
  canEditar,
  onHistorico,
  onComentar,
  onUpdatePrioridade,
  onUpdateStatus,
  onUpdateAgregadora,
  onUpdateCaminho,
  onUpdatePam,
  t,
}: {
  rows: IntegracaoRow[];
  agregadoraOpcoes: string[];
  sort: { col: TableColIntegracao; dir: SortDir };
  onSort: (col: TableColIntegracao) => void;
  canEditar: boolean;
  onHistorico: (row: IntegracaoRow) => void;
  onComentar: (row: IntegracaoRow) => void;
  onUpdatePrioridade: (row: IntegracaoRow, prioridade: PrioridadeIntegracao) => void;
  onUpdateStatus: (row: IntegracaoRow, status: StatusIntegracao) => void;
  onUpdateAgregadora: (row: IntegracaoRow, agregadora: string | null) => void;
  onUpdateCaminho: (row: IntegracaoRow, caminho: string | null) => void;
  onUpdatePam: (row: IntegracaoRow, pam: string | null) => void;
  t: {
    text: string;
    textMuted: string;
    cardBorder: string;
    inputBg: string;
    cardBg: string;
  };
}) {
  const dataTable = useDataTableBlock();
  const [popover, setPopover] = useState<{
    kind: PopoverKind;
    row: IntegracaoRow;
    rect: DOMRect;
  } | null>(null);
  const [editingCaminhoId, setEditingCaminhoId] = useState<string | null>(null);
  const [editingPamId, setEditingPamId] = useState<string | null>(null);
  const [textoDraft, setTextoDraft] = useState("");
  const [hoverId, setHoverId] = useState<string | null>(null);

  const agregadoraOpts = useMemo(() => {
    const nomes = [...agregadoraOpcoes];
    const atual = popover?.kind === "agregadora" ? popover.row.agregadora : null;
    if (atual && !nomes.includes(atual)) nomes.push(atual);
    nomes.sort((a, b) => a.localeCompare(b, "pt-BR"));
    return ["", ...nomes];
  }, [agregadoraOpcoes, popover]);

  function openPopover(e: MouseEvent<HTMLElement>, kind: PopoverKind, row: IntegracaoRow) {
    if (!canEditar) return;
    setPopover({ kind, row, rect: e.currentTarget.getBoundingClientRect() });
  }

  function startEditText(row: IntegracaoRow, field: "caminho" | "pam") {
    if (!canEditar) return;
    setTextoDraft((field === "caminho" ? row.caminho : row.pam) ?? "");
    if (field === "caminho") {
      setEditingCaminhoId(row.id);
      setEditingPamId(null);
    } else {
      setEditingPamId(row.id);
      setEditingCaminhoId(null);
    }
  }

  function commitText(row: IntegracaoRow, field: "caminho" | "pam") {
    const next = textoDraft.trim() || null;
    if (field === "caminho") {
      void onUpdateCaminho(row, next);
      setEditingCaminhoId(null);
    } else {
      void onUpdatePam(row, next);
      setEditingPamId(null);
    }
  }

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
        Nenhuma integração encontrada para os filtros selecionados.
      </div>
    );
  }

  return (
    <>
      <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
        <table style={getDataTableStyle({ minWidth: 1100 })}>
          <caption style={{ display: "none" }}>Integrações comerciais</caption>
          <thead>
            <tr>
              {INTEGRACAO_TABLE_COLS.map((col, i) => {
                const sticky = i === 0;
                const thStyle = sticky ? dataTable.thHeaderSticky : dataTable.thHeader;
                if (SORTABLE_COLS_INTEGRACAO.includes(col)) {
                  return (
                    <SortTableTh
                      key={col}
                      label={INTEGRACAO_COL_LABEL[col]}
                      col={col}
                      sortCol={sort.col}
                      sortDir={sort.dir}
                      onSort={onSort}
                      thStyle={thStyle}
                      align="center"
                    />
                  );
                }
                return (
                  <th key={col} scope="col" style={thStyle}>
                    {INTEGRACAO_COL_LABEL[col]}
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
                      ? `color-mix(in srgb, ${t.inputBg} 70%, var(--brand-primary, #7c3aed) 8%)`
                      : dataTable.zebraRow(i),
                }}
                onMouseEnter={() => setHoverId(row.id)}
                onMouseLeave={() => setHoverId(null)}
              >
                <td style={dataTable.tdSticky({ rowIndex: i })}>{row.operador_nome}</td>
                <td style={dataTable.tdCenter}>
                  <button
                    type="button"
                    disabled={!canEditar}
                    style={{
                      ...cellEditable,
                      ...badgeIntegracaoStyle(PRIORIDADE_COLOR[row.prioridade]),
                      cursor: canEditar ? "pointer" : "default",
                      border: "none",
                      fontFamily: FONT.body,
                    }}
                    onClick={(e) => openPopover(e, "prioridade", row)}
                  >
                    {PRIORIDADE_LABEL[row.prioridade]}
                  </button>
                </td>
                <td style={dataTable.tdCenter}>{TIPO_INTEGRACAO_LABEL[row.tipo]}</td>
                <td style={dataTable.tdCenter}>
                  {editingCaminhoId === row.id ? (
                    <input
                      value={textoDraft}
                      onChange={(e) => setTextoDraft(e.target.value)}
                      onBlur={() => commitText(row, "caminho")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitText(row, "caminho");
                        if (e.key === "Escape") setEditingCaminhoId(null);
                      }}
                      autoFocus
                      aria-label="Caminho"
                      style={{
                        width: "100%",
                        maxWidth: 160,
                        padding: "4px 8px",
                        borderRadius: 8,
                        border: `1px solid ${t.cardBorder}`,
                        background: t.inputBg,
                        color: t.text,
                        fontSize: 13,
                        fontFamily: FONT.body,
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      disabled={!canEditar}
                      style={{
                        ...cellEditable,
                        border: "none",
                        background: "transparent",
                        color: row.caminho ? t.text : t.textMuted,
                        fontFamily: FONT.body,
                        fontSize: 13,
                        cursor: canEditar ? "pointer" : "default",
                      }}
                      onClick={() => startEditText(row, "caminho")}
                    >
                      {row.caminho || "—"}
                    </button>
                  )}
                </td>
                <td style={dataTable.tdCenter}>
                  {editingPamId === row.id ? (
                    <input
                      value={textoDraft}
                      onChange={(e) => setTextoDraft(e.target.value)}
                      onBlur={() => commitText(row, "pam")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitText(row, "pam");
                        if (e.key === "Escape") setEditingPamId(null);
                      }}
                      autoFocus
                      aria-label="PAM"
                      style={{
                        width: "100%",
                        maxWidth: 160,
                        padding: "4px 8px",
                        borderRadius: 8,
                        border: `1px solid ${t.cardBorder}`,
                        background: t.inputBg,
                        color: t.text,
                        fontSize: 13,
                        fontFamily: FONT.body,
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      disabled={!canEditar}
                      style={{
                        ...cellEditable,
                        border: "none",
                        background: "transparent",
                        color: row.pam ? t.text : t.textMuted,
                        fontFamily: FONT.body,
                        fontSize: 13,
                        cursor: canEditar ? "pointer" : "default",
                      }}
                      onClick={() => startEditText(row, "pam")}
                    >
                      {row.pam || "—"}
                    </button>
                  )}
                </td>
                <td style={dataTable.tdCenter}>
                  <button
                    type="button"
                    disabled={!canEditar}
                    style={{
                      ...cellEditable,
                      border: "none",
                      background: "transparent",
                      color: row.agregadora ? t.text : t.textMuted,
                      fontFamily: FONT.body,
                      fontSize: 13,
                      cursor: canEditar ? "pointer" : "default",
                    }}
                    onClick={(e) => openPopover(e, "agregadora", row)}
                  >
                    {row.agregadora || "—"}
                  </button>
                </td>
                <td style={dataTable.tdCenter}>
                  <button
                    type="button"
                    disabled={!canEditar}
                    style={{
                      ...cellEditable,
                      ...badgeIntegracaoStyle(STATUS_INTEGRACAO_COLOR[row.status]),
                      cursor: canEditar ? "pointer" : "default",
                      border: "none",
                      fontFamily: FONT.body,
                    }}
                    onClick={(e) => openPopover(e, "status", row)}
                  >
                    {STATUS_INTEGRACAO_LABEL[row.status]}
                  </button>
                </td>
                <td style={dataTable.tdCenter} title={row.comentario ?? undefined}>
                  <span style={{ color: row.comentario ? t.text : t.textMuted, fontSize: 13 }}>
                    {truncarComentario(row.comentario)}
                  </span>
                </td>
                <td style={dataTable.tdCenter}>
                  <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                    <BtnIconeAcaoLinha
                      label={tooltipAcao("Histórico da Integração")}
                      onClick={() => onHistorico(row)}
                    >
                      <History size={13} aria-hidden />
                    </BtnIconeAcaoLinha>
                    {canEditar ? (
                      <BtnIconeAcaoLinha
                        label={tooltipAcao("Comentar Integração")}
                        onClick={() => onComentar(row)}
                      >
                        <MessageSquare size={13} aria-hidden />
                      </BtnIconeAcaoLinha>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {popover?.kind === "prioridade" ? (
        <CellSelectPopover
          open
          anchorRect={popover.rect}
          options={PRIORIDADE_ORDEM}
          value={popover.row.prioridade}
          onSelect={(v) => onUpdatePrioridade(popover.row, v)}
          onClose={() => setPopover(null)}
          labelOption={(v) => PRIORIDADE_LABEL[v]}
          t={t}
        />
      ) : null}

      {popover?.kind === "status" ? (
        <CellSelectPopover
          open
          anchorRect={popover.rect}
          options={STATUS_INTEGRACAO_ORDEM}
          value={popover.row.status}
          onSelect={(v) => onUpdateStatus(popover.row, v)}
          onClose={() => setPopover(null)}
          labelOption={(v) => STATUS_INTEGRACAO_LABEL[v]}
          t={t}
        />
      ) : null}

      {popover?.kind === "agregadora" ? (
        <CellSelectPopover
          open
          anchorRect={popover.rect}
          options={agregadoraOpts}
          value={popover.row.agregadora ?? ""}
          onSelect={(v) => onUpdateAgregadora(popover.row, v || null)}
          onClose={() => setPopover(null)}
          labelOption={(v) => (v ? v : "—")}
          enableSearch
          searchPlaceholder={placeholderPesquisaFiltro("Agregador")}
          t={t}
        />
      ) : null}
    </>
  );
}
