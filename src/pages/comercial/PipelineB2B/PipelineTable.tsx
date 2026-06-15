import { useMemo, useState, type CSSProperties, type MouseEvent } from "react";
import { Eye, Plus, ScrollText } from "lucide-react";
import { FONT } from "../../../constants/theme";
import {
  SortTableTh,
  type SortDir,
} from "../../../components/dashboard";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles";
import type { ComercialOpcao, ComercialContato, PipelineMarcaRow } from "./types";
import {
  COL_LABEL,
  PIPELINE_COLOR,
  PIPELINE_COMERCIAL_SITE_OFFLINE_COLOR,
  PIPELINE_COMERCIAL_SITE_OFFLINE_LABEL,
  SORTABLE_COLS,
  STATUS_PIPELINE_LABEL,
  STATUS_PRODUTO_LABEL,
  TAB_TABLE_CONFIG,
  badgePipelineStyle,
  badgeProdutoStyle,
  COMERCIAL_FILTRO_NENHUM_LABEL,
  type StatusPipeline,
  type StatusProduto,
  type TableCol,
} from "./constants";
import {
  buildRazaoMerge,
  fmtDataPipeline,
  pipelineComercialDisplayNome,
  pipelineComercialIsSiteOffline,
  pipelineComercialPodeEditar,
  produtoDisplay,
  produtoStatus,
} from "./helpers";
import { COMERCIAL_FILTRO_NENHUM_LABEL } from "./constants";
import { CellSelectPopover } from "./CellSelectPopover";

type PopoverKind = "comercial" | "status" | "dedicada" | "network";

const btnAcaoBase = (t: { cardBorder: string; inputBg: string }): CSSProperties => ({
  width: 32,
  height: 32,
  borderRadius: 10,
  border: `1px solid ${t.cardBorder}`,
  background: t.inputBg,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#6b7280",
  padding: 0,
  margin: "0 2px",
});

const cellEditable: CSSProperties = {
  cursor: "pointer",
  borderRadius: 8,
  minHeight: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
};

const PRODUTO_OPTS: StatusProduto[] = [
  "sem_proposta",
  "em_negociacao",
  "sem_interesse",
  "contrato_enviado",
  "contrato_assinado",
  "ativo",
];

const STATUS_OPTS: StatusPipeline[] = ["disponiveis", "conexao", "negociacao", "fechado"];

export function PipelineTable({
  tab,
  rows,
  comerciais,
  sort,
  onSort,
  canEditar,
  onRegistro,
  onVer,
  onContato,
  onAddContato,
  onUpdateComercial,
  onUpdateStatus,
  onUpdateProduto,
  t,
}: {
  tab: import("./constants").PipelineTab;
  rows: PipelineMarcaRow[];
  comerciais: ComercialOpcao[];
  sort: { col: TableCol; dir: SortDir };
  onSort: (col: TableCol) => void;
  canEditar: boolean;
  onRegistro: (row: PipelineMarcaRow) => void;
  onVer: (row: PipelineMarcaRow) => void;
  onContato: (row: PipelineMarcaRow, contato: ComercialContato) => void;
  onAddContato: (row: PipelineMarcaRow) => void;
  onUpdateComercial: (row: PipelineMarcaRow, userId: string | null) => void;
  onUpdateStatus: (row: PipelineMarcaRow, status: StatusPipeline) => void;
  onUpdateProduto: (row: PipelineMarcaRow, tipo: "mesa_dedicada" | "mesa_network", status: StatusProduto) => void;
  t: {
    text: string;
    textMuted: string;
    cardBorder: string;
    inputBg: string;
    cardBg: string;
  };
}) {
  const dataTable = useDataTableBlock();
  const cfg = TAB_TABLE_CONFIG[tab];
  const merged = buildRazaoMerge(rows);

  const [popover, setPopover] = useState<{
    kind: PopoverKind;
    row: PipelineMarcaRow;
    rect: DOMRect;
    produto?: "mesa_dedicada" | "mesa_network";
  } | null>(null);

  function openPopover(e: MouseEvent<HTMLElement>, kind: PopoverKind, row: PipelineMarcaRow, produto?: "mesa_dedicada" | "mesa_network") {
    if (!canEditar) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopover({ kind, row, rect, produto });
  }

  const comercialOpts = useMemo(
    () => ["", ...comerciais.map((c) => c.id)] as const,
    [comerciais],
  );

  if (rows.length === 0) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
        Nenhuma marca encontrada para os filtros selecionados.
      </div>
    );
  }

  return (
    <>
      <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
        <table style={getDataTableStyle({ minWidth: 960 })}>
          <caption style={{ display: "none" }}>Pipeline B2B — marcas</caption>
          <thead>
            <tr>
              {cfg.cols.map((col) =>
                col === "acao" ? (
                  <th key={col} scope="col" style={dataTable.thHeader}>
                    {COL_LABEL[col]}
                  </th>
                ) : SORTABLE_COLS.includes(col) ? (
                  <SortTableTh
                    key={col}
                    label={COL_LABEL[col]}
                    col={col}
                    sortCol={sort.col}
                    sortDir={sort.dir}
                    thStyle={col === "razao" ? dataTable.thHeaderSticky : dataTable.thHeader}
                    align="center"
                    onSort={onSort}
                  />
                ) : (
                  <th key={col} scope="col" style={dataTable.thHeader}>
                    {COL_LABEL[col]}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {merged.map(({ row, rowSpan, showRazao }, i) => {
              const hoverBg = dataTable.zebraRow(i);
              return (
                <tr
                  key={row.id}
                  style={{ background: hoverBg }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `color-mix(in srgb, var(--brand-primary, #7c3aed) 6%, ${hoverBg})`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = hoverBg;
                  }}
                >
                  {cfg.cols.includes("razao") && showRazao ? (
                    <td
                      rowSpan={rowSpan}
                      style={{
                        ...dataTable.tdCenter,
                        ...dataTable.tdSticky,
                        textAlign: "left",
                        fontWeight: 600,
                        maxWidth: 150,
                        verticalAlign: "middle",
                        borderRight: `1px solid color-mix(in srgb, ${t.cardBorder} 80%, transparent)`,
                      }}
                      title={`${row.empresa.razao_social} — CNPJ ${row.empresa.cnpj}`}
                    >
                      <span
                        style={{
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.empresa.razao_social}
                      </span>
                    </td>
                  ) : null}

                  {cfg.cols.includes("marca") ? (
                    <td style={{ ...dataTable.tdCenter, textAlign: "left" }}>
                      <button
                        type="button"
                        onClick={() => onVer(row)}
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          font: "inherit",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--brand-accent, #1e36f8)",
                          cursor: "pointer",
                          textDecoration: "underline",
                          textUnderlineOffset: 2,
                        }}
                      >
                        {row.nome}
                      </button>
                    </td>
                  ) : null}

                  {cfg.cols.includes("contato") ? (
                    <td style={dataTable.tdCenter}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                        {[...row.contatos]
                          .sort((a, b) => a.ordem - b.ordem)
                          .map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => onContato(row, c)}
                              style={{
                                background: "none",
                                border: "none",
                                padding: 0,
                                font: "inherit",
                                fontSize: 13,
                                color: "var(--brand-accent, #1e36f8)",
                                cursor: "pointer",
                                textDecoration: "underline",
                                textUnderlineOffset: 2,
                              }}
                            >
                              {c.nome}
                            </button>
                          ))}
                        {canEditar ? (
                          <button
                            type="button"
                            aria-label={`Adicionar contato em ${row.nome}`}
                            title={`Adicionar contato em ${row.nome}`}
                            onClick={() => onAddContato(row)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 10,
                              border: `1px dashed color-mix(in srgb, var(--brand-accent, #1e36f8) 45%, ${t.cardBorder})`,
                              background: "transparent",
                              color: "var(--brand-accent, #1e36f8)",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: 0,
                            }}
                          >
                            <Plus size={14} aria-hidden />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}

                  {cfg.cols.includes("comercial") ? (
                    <td style={dataTable.tdCenter}>
                      {(() => {
                        const siteOffline = pipelineComercialIsSiteOffline(row);
                        const comercialEditavel = canEditar && pipelineComercialPodeEditar(row);
                        const conteudo = siteOffline ? (
                          <span
                            style={badgePipelineStyle(PIPELINE_COMERCIAL_SITE_OFFLINE_COLOR)}
                            title="Domínio inativo — atribuição automática"
                          >
                            {PIPELINE_COMERCIAL_SITE_OFFLINE_LABEL}
                          </span>
                        ) : (
                          pipelineComercialDisplayNome(row, comerciais)
                        );
                        if (!comercialEditavel) {
                          return conteudo;
                        }
                        return (
                          <div
                            role="button"
                            tabIndex={0}
                            style={cellEditable}
                            onClick={(e) => openPopover(e, "comercial", row)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                openPopover(e as unknown as MouseEvent<HTMLElement>, "comercial", row);
                              }
                            }}
                          >
                            {conteudo}
                          </div>
                        );
                      })()}
                    </td>
                  ) : null}

                  {cfg.cols.includes("status") ? (
                    <td style={dataTable.tdCenter}>
                      <div
                        role={canEditar ? "button" : undefined}
                        style={canEditar ? cellEditable : undefined}
                        onClick={(e) => openPopover(e, "status", row)}
                      >
                        <span style={badgePipelineStyle(PIPELINE_COLOR[row.status_pipeline])}>
                          {STATUS_PIPELINE_LABEL[row.status_pipeline]}
                        </span>
                      </div>
                    </td>
                  ) : null}

                  {cfg.cols.includes("dedicada") ? (
                    <td style={dataTable.tdCenter}>
                      <div
                        role={canEditar ? "button" : undefined}
                        style={canEditar ? cellEditable : undefined}
                        onClick={(e) => openPopover(e, "dedicada", row, "mesa_dedicada")}
                      >
                        {produtoStatus(row, "mesa_dedicada") ? (
                          <span style={badgeProdutoStyle()}>
                            {produtoDisplay(row, "mesa_dedicada")}
                          </span>
                        ) : (
                          "—"
                        )}
                      </div>
                    </td>
                  ) : null}

                  {cfg.cols.includes("network") ? (
                    <td style={dataTable.tdCenter}>
                      <div
                        role={canEditar ? "button" : undefined}
                        style={canEditar ? cellEditable : undefined}
                        onClick={(e) => openPopover(e, "network", row, "mesa_network")}
                      >
                        {produtoStatus(row, "mesa_network") ? (
                          <span style={badgeProdutoStyle()}>{produtoDisplay(row, "mesa_network")}</span>
                        ) : (
                          "—"
                        )}
                      </div>
                    </td>
                  ) : null}

                  {cfg.cols.includes("ultima") ? (
                    <td style={dataTable.tdCenter}>{fmtDataPipeline(row.ultima_comunicacao)}</td>
                  ) : null}

                  {cfg.cols.includes("acao") ? (
                    <td style={dataTable.tdCenter}>
                      <button
                        type="button"
                        aria-label={`Registro ${row.nome}`}
                        title={`Registro ${row.nome}`}
                        style={btnAcaoBase(t)}
                        onClick={() => onRegistro(row)}
                      >
                        <ScrollText size={13} aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label={`Ver ${row.nome}`}
                        title={`Ver ${row.nome}`}
                        style={btnAcaoBase(t)}
                        onClick={() => onVer(row)}
                      >
                        <Eye size={13} aria-hidden />
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {popover?.kind === "comercial" ? (
        <CellSelectPopover
          open
          anchorRect={popover.rect}
          options={comercialOpts}
          value={popover.row.comercial_user_id ?? ""}
          onSelect={(v) => onUpdateComercial(popover.row, v || null)}
          onClose={() => setPopover(null)}
          labelOption={(v) => {
            if (!v) return COMERCIAL_FILTRO_NENHUM_LABEL;
            return comerciais.find((c) => c.id === v)?.name ?? "—";
          }}
          t={t}
        />
      ) : null}

      {popover?.kind === "status" ? (
        <CellSelectPopover
          open
          anchorRect={popover.rect}
          options={STATUS_OPTS}
          value={popover.row.status_pipeline}
          onSelect={(v) => onUpdateStatus(popover.row, v)}
          onClose={() => setPopover(null)}
          labelOption={(v) => STATUS_PIPELINE_LABEL[v]}
          t={t}
        />
      ) : null}

      {popover?.kind === "dedicada" || popover?.kind === "network" ? (
        <CellSelectPopover
          open
          anchorRect={popover!.rect}
          options={PRODUTO_OPTS}
          value={
            produtoStatus(popover!.row, popover!.produto!) ??
            "sem_proposta"
          }
          onSelect={(v) =>
            onUpdateProduto(popover!.row, popover!.produto!, v)
          }
          onClose={() => setPopover(null)}
          labelOption={(v) => STATUS_PRODUTO_LABEL[v]}
          t={t}
        />
      ) : null}
    </>
  );
}
