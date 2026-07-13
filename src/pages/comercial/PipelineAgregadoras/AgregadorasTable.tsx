import { useMemo, useState, type CSSProperties, type MouseEvent } from "react";
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
import type { AgregadoraRow, ComercialOpcao } from "./types";
import { CellSelectPopover } from "../PipelineB2B/CellSelectPopover";
import {
  buildPipelineComercialPopoverOptions,
  comercialDisplayAgregadora,
  fmtDataNascimento,
  fmtJogos,
  parseJogosInput,
  pipelineComercialIsMissingOptionValue,
  pipelineComercialPopoverLabel,
  pipelineComercialPopoverUserId,
  toDateInputValue,
} from "./helpers";

const cellEditable: CSSProperties = {
  cursor: "pointer",
  borderRadius: 8,
  minHeight: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
};

type PopoverKind = "status" | "comercial";

export function AgregadorasTable({
  rows,
  comerciais,
  sort,
  onSort,
  canEditar,
  onVer,
  onHistorico,
  onUpdateStatus,
  onUpdateComercial,
  onUpdateJogos,
  onUpdateUltimoContato,
  t,
}: {
  rows: AgregadoraRow[];
  comerciais: ComercialOpcao[];
  sort: { col: TableColAgregadora; dir: SortDir };
  onSort: (col: TableColAgregadora) => void;
  canEditar: boolean;
  onVer: (row: AgregadoraRow) => void;
  onHistorico: (row: AgregadoraRow) => void;
  onUpdateStatus: (row: AgregadoraRow, status: StatusPipelineAgregadora) => void;
  onUpdateComercial: (row: AgregadoraRow, userId: string | null) => void;
  onUpdateJogos: (row: AgregadoraRow, jogos: number | null) => void;
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
  const [popover, setPopover] = useState<{
    kind: PopoverKind;
    row: AgregadoraRow;
    rect: DOMRect;
  } | null>(null);
  const [editingUltimoContatoId, setEditingUltimoContatoId] = useState<string | null>(null);
  const [editingJogosId, setEditingJogosId] = useState<string | null>(null);
  const [jogosDraft, setJogosDraft] = useState("");
  const [hoverId, setHoverId] = useState<string | null>(null);

  const comercialOpts = useMemo(
    () => buildPipelineComercialPopoverOptions(comerciais),
    [comerciais],
  );

  function openPopover(e: MouseEvent<HTMLElement>, kind: PopoverKind, row: AgregadoraRow) {
    if (!canEditar) return;
    setPopover({ kind, row, rect: e.currentTarget.getBoundingClientRect() });
  }

  function startEditJogos(row: AgregadoraRow) {
    if (!canEditar) return;
    setEditingJogosId(row.id);
    setJogosDraft(row.jogos == null ? "" : String(row.jogos));
  }

  function commitJogos(row: AgregadoraRow) {
    const parsed = parseJogosInput(jogosDraft);
    if (parsed.error) {
      setEditingJogosId(null);
      return;
    }
    void onUpdateJogos(row, parsed.value);
    setEditingJogosId(null);
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
        Nenhuma agregadora encontrada para os filtros selecionados.
      </div>
    );
  }

  const inputInlineStyle: CSSProperties = {
    fontSize: 13,
    fontFamily: FONT.body,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 8,
    background: t.inputBg,
    color: t.text,
    padding: "4px 8px",
    maxWidth: "100%",
    textAlign: "center",
  };

  return (
    <>
      <div className="app-table-wrap" style={getDataTableWrapStyle()}>
        <table style={getDataTableStyle({ minWidth: 860 })}>
          <caption style={{ display: "none" }}>Lista de agregadoras do pipeline</caption>
          <thead>
            <tr>
              {AGREGADORA_TABLE_COLS.map((col) => {
                const sortable =
                  col === "nome" ||
                  col === "site" ||
                  col === "jogos" ||
                  col === "status" ||
                  col === "comercial" ||
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
                <td style={{ ...dataTable.tdCenter, fontWeight: 600 }}>{row.nome}</td>
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
                <td style={dataTable.tdCenter}>
                  {canEditar && editingJogosId === row.id ? (
                    <input
                      type="text"
                      inputMode="numeric"
                      autoFocus
                      value={jogosDraft}
                      aria-label={`Jogos — ${row.nome}`}
                      style={inputInlineStyle}
                      onChange={(e) => setJogosDraft(e.target.value)}
                      onBlur={() => commitJogos(row)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitJogos(row);
                        }
                        if (e.key === "Escape") setEditingJogosId(null);
                      }}
                    />
                  ) : (
                    <div
                      role={canEditar ? "button" : undefined}
                      tabIndex={canEditar ? 0 : undefined}
                      style={canEditar ? cellEditable : undefined}
                      onClick={() => startEditJogos(row)}
                      onKeyDown={(e) => {
                        if (canEditar && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          startEditJogos(row);
                        }
                      }}
                    >
                      {fmtJogos(row.jogos)}
                    </div>
                  )}
                </td>
                <td style={dataTable.tdCenter}>
                  <div
                    role={canEditar ? "button" : undefined}
                    tabIndex={canEditar ? 0 : undefined}
                    style={canEditar ? cellEditable : undefined}
                    onClick={(e) => openPopover(e, "status", row)}
                    onKeyDown={(e) => {
                      if (canEditar && (e.key === "Enter" || e.key === " ")) {
                        openPopover(e as unknown as MouseEvent<HTMLElement>, "status", row);
                      }
                    }}
                  >
                    <span
                      style={{
                        ...badgePipelineAgregadoraStyle(
                          STATUS_PIPELINE_AGREGADORA_COLOR[row.status_pipeline],
                        ),
                        fontFamily: FONT.body,
                      }}
                    >
                      {STATUS_PIPELINE_AGREGADORA_LABEL[row.status_pipeline]}
                    </span>
                  </div>
                </td>
                <td style={dataTable.tdCenter}>
                  <div
                    role={canEditar ? "button" : undefined}
                    tabIndex={canEditar ? 0 : undefined}
                    style={canEditar ? cellEditable : undefined}
                    onClick={(e) => openPopover(e, "comercial", row)}
                    onKeyDown={(e) => {
                      if (canEditar && (e.key === "Enter" || e.key === " ")) {
                        openPopover(e as unknown as MouseEvent<HTMLElement>, "comercial", row);
                      }
                    }}
                  >
                    {comercialDisplayAgregadora(row)}
                  </div>
                </td>
                <td style={dataTable.tdCenter}>
                  {canEditar && editingUltimoContatoId === row.id ? (
                    <input
                      type="date"
                      autoFocus
                      value={toDateInputValue(row.ultimo_contato)}
                      aria-label={`Último contato — ${row.nome}`}
                      style={inputInlineStyle}
                      onChange={(e) => {
                        const v = e.target.value || null;
                        void onUpdateUltimoContato(row, v);
                        setEditingUltimoContatoId(null);
                      }}
                      onBlur={() => setEditingUltimoContatoId(null)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setEditingUltimoContatoId(null);
                      }}
                    />
                  ) : (
                    <div
                      role={canEditar ? "button" : undefined}
                      tabIndex={canEditar ? 0 : undefined}
                      style={canEditar ? cellEditable : undefined}
                      onClick={() => canEditar && setEditingUltimoContatoId(row.id)}
                      onKeyDown={(e) => {
                        if (canEditar && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          setEditingUltimoContatoId(row.id);
                        }
                      }}
                    >
                      {fmtDataNascimento(row.ultimo_contato)}
                    </div>
                  )}
                </td>
                <td style={dataTable.tdCenter}>
                  <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
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
        open={popover?.kind === "status"}
        anchorRect={popover?.kind === "status" ? popover.rect : null}
        options={STATUS_PIPELINE_AGREGADORA_ORDEM}
        value={popover?.row.status_pipeline ?? "conexao"}
        onSelect={(v) => {
          if (popover) void onUpdateStatus(popover.row, v);
          setPopover(null);
        }}
        onClose={() => setPopover(null)}
        labelOption={(v) => STATUS_PIPELINE_AGREGADORA_LABEL[v]}
        t={t}
      />

      <CellSelectPopover
        open={popover?.kind === "comercial"}
        anchorRect={popover?.kind === "comercial" ? popover.rect : null}
        options={comercialOpts}
        value={popover?.row.comercial_user_id ?? ""}
        onSelect={(v) => {
          if (!popover) return;
          if (pipelineComercialIsMissingOptionValue(v)) return;
          void onUpdateComercial(popover.row, pipelineComercialPopoverUserId(v));
          setPopover(null);
        }}
        onClose={() => setPopover(null)}
        labelOption={(v) => pipelineComercialPopoverLabel(v, comerciais)}
        isOptionDisabled={pipelineComercialIsMissingOptionValue}
        disabledOptionTitle="Perfil do comercial ainda não encontrado"
        t={t}
      />
    </>
  );
}
