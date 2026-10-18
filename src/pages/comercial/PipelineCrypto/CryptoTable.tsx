import { useMemo, useState, type CSSProperties, type MouseEvent } from "react";
import { Eye, Plus, ScrollText } from "lucide-react";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { propsBotaoIcone, tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { FONT } from "../../../constants/theme";
import { SortTableTh, type SortDir } from "../../../components/dashboard";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import {
  STATUS_PIPELINE_LABEL,
  STATUS_PRODUTO_LABEL,
  STATUS_PRODUTO_ORDEM,
  badgePipelineStyle,
  badgeProdutoStyle,
  PIPELINE_COLOR,
  type StatusPipeline,
  type StatusProduto,
} from "../PipelineB2B/constants";
import {
  buildPipelineComercialPopoverOptions,
  buildRazaoMerge,
  fmtDataNascimento,
  pipelineComercialDisplayNome,
  pipelineComercialIsMissingOptionValue,
  pipelineComercialPopoverLabel,
  pipelineComercialPopoverUserId,
  toDateInputValue,
} from "../PipelineB2B/helpers";
import { CellSelectPopover } from "../PipelineB2B/CellSelectPopover";
import type { ComercialContato, ComercialOpcao } from "../PipelineB2B/types";
import { cnpjEhSolo } from "./mapRow";
import type { CryptoMarcaRow, CryptoTableCol, PossuiCrypto } from "./types";

type PopoverKind = "comercial" | "status" | "possui" | "retorno";

const COLS: CryptoTableCol[] = [
  "razao",
  "marca",
  "contato",
  "comercial",
  "status",
  "possui_crypto",
  "retorno",
  "ultima_comunicacao",
  "acao",
];

const COL_LABEL: Record<CryptoTableCol, string> = {
  razao: "Razão Social",
  marca: "Marca",
  contato: "Contato",
  comercial: "Comercial",
  status: "Status",
  possui_crypto: "Possui Crypto",
  retorno: "Retorno",
  ultima_comunicacao: "Última Comunicação",
  acao: "Ação",
};

const SORTABLE: CryptoTableCol[] = ["razao", "possui_crypto", "retorno", "ultima_comunicacao"];

const STATUS_OPTS: StatusPipeline[] = ["disponiveis", "conexao", "negociacao", "fechado"];
const POSSUI_OPTS = ["", "sim", "nao"] as const;
const RETORNO_OPTS = ["", ...STATUS_PRODUTO_ORDEM] as const;

const cellEditable: CSSProperties = {
  cursor: "pointer",
  borderRadius: 8,
  minHeight: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
};

function possuiLabel(v: string): string {
  if (v === "sim") return "Sim";
  if (v === "nao") return "Não";
  return "—";
}

function retornoLabel(v: string): string {
  if (!v) return "—";
  return STATUS_PRODUTO_LABEL[v as StatusProduto] ?? v;
}

export function CryptoTable({
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
  onUpdatePossui,
  onUpdateRetorno,
  onUpdateUltima,
  t,
}: {
  rows: CryptoMarcaRow[];
  comerciais: ComercialOpcao[];
  sort: { col: CryptoTableCol; dir: SortDir };
  onSort: (col: CryptoTableCol) => void;
  canEditar: boolean;
  onRegistro: (row: CryptoMarcaRow) => void;
  onVer: (row: CryptoMarcaRow) => void;
  onContato: (row: CryptoMarcaRow, contato: ComercialContato) => void;
  onAddContato: (row: CryptoMarcaRow) => void;
  onUpdateComercial: (row: CryptoMarcaRow, userId: string | null) => void;
  onUpdateStatus: (row: CryptoMarcaRow, status: StatusPipeline) => void;
  onUpdatePossui: (row: CryptoMarcaRow, valor: PossuiCrypto | null) => void;
  onUpdateRetorno: (row: CryptoMarcaRow, valor: StatusProduto | null) => void;
  onUpdateUltima: (row: CryptoMarcaRow, date: string | null) => void;
  t: {
    text: string;
    textMuted: string;
    cardBorder: string;
    inputBg: string;
    cardBg: string;
  };
}) {
  const dataTable = useDataTableBlock();
  const merged = buildRazaoMerge(rows);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [popover, setPopover] = useState<{
    kind: PopoverKind;
    row: CryptoMarcaRow;
    rect: DOMRect;
  } | null>(null);

  const comercialOpts = useMemo(
    () => buildPipelineComercialPopoverOptions(comerciais),
    [comerciais],
  );

  function openPopover(e: MouseEvent<HTMLElement>, kind: PopoverKind, row: CryptoMarcaRow) {
    if (!canEditar) return;
    setPopover({ kind, row, rect: e.currentTarget.getBoundingClientRect() });
  }

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
        <table style={getDataTableStyle({ minWidth: 1100 })}>
          <caption style={{ display: "none" }}>Pipeline Crypto — marcas</caption>
          <thead>
            <tr>
              {COLS.map((col) =>
                col === "acao" ? (
                  <th key={col} scope="col" style={dataTable.thHeader}>
                    {COL_LABEL[col]}
                  </th>
                ) : SORTABLE.includes(col) ? (
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
            {merged.map(({ row, rowSpan, showRazao, razaoStripeIndex }) => {
              const crypto = row as CryptoMarcaRow;
              const hoverBg = dataTable.zebraRow(razaoStripeIndex);
              const cnpjLabel = cnpjEhSolo(crypto.empresa.cnpj) ? "—" : crypto.empresa.cnpj;
              return (
                <tr
                  key={crypto.id}
                  style={{ background: hoverBg }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `color-mix(in srgb, var(--brand-primary, #7c3aed) 6%, ${hoverBg})`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = hoverBg;
                  }}
                >
                  {showRazao ? (
                    <td
                      rowSpan={rowSpan}
                      style={{
                        ...dataTable.tdCenter,
                        ...dataTable.tdSticky,
                        textAlign: "left",
                        borderRight: `1px solid color-mix(in srgb, ${t.cardBorder} 80%, transparent)`,
                        background: hoverBg,
                      }}
                      title={`${crypto.empresa.razao_social} — CNPJ ${cnpjLabel}`}
                    >
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {crypto.empresa.razao_social}
                      </span>
                    </td>
                  ) : null}
                  <td style={{ ...dataTable.tdCenter, textAlign: "left" }}>
                    <button
                      type="button"
                      onClick={() => onVer(crypto)}
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
                      {crypto.nome}
                    </button>
                  </td>
                  <td style={dataTable.tdCenter}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                      {[...crypto.contatos]
                        .sort((a, b) => a.ordem - b.ordem)
                        .map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => onContato(crypto, c)}
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
                          {...propsBotaoIcone(tooltipAcao("Adicionar contato"))}
                          onClick={() => onAddContato(crypto)}
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
                          }}
                        >
                          <Plus size={14} aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  </td>
                  <td style={dataTable.tdCenter}>
                    <div
                      role={canEditar ? "button" : undefined}
                      style={canEditar ? cellEditable : undefined}
                      onClick={(e) => openPopover(e, "comercial", crypto)}
                    >
                      {pipelineComercialDisplayNome(crypto, comerciais)}
                    </div>
                  </td>
                  <td style={dataTable.tdCenter}>
                    <div
                      role={canEditar ? "button" : undefined}
                      style={canEditar ? cellEditable : undefined}
                      onClick={(e) => openPopover(e, "status", crypto)}
                    >
                      <span style={badgePipelineStyle(PIPELINE_COLOR[crypto.status_pipeline])}>
                        {STATUS_PIPELINE_LABEL[crypto.status_pipeline]}
                      </span>
                    </div>
                  </td>
                  <td style={dataTable.tdCenter}>
                    <div
                      role={canEditar ? "button" : undefined}
                      style={canEditar ? cellEditable : undefined}
                      onClick={(e) => openPopover(e, "possui", crypto)}
                    >
                      {crypto.possui_crypto === "sim" ? (
                        <span style={badgeProdutoStyle("ativo")}>Sim</span>
                      ) : crypto.possui_crypto === "nao" ? (
                        <span style={badgePipelineStyle("#6b7280")}>Não</span>
                      ) : (
                        "—"
                      )}
                    </div>
                  </td>
                  <td style={dataTable.tdCenter}>
                    <div
                      role={canEditar ? "button" : undefined}
                      style={canEditar ? cellEditable : undefined}
                      onClick={(e) => openPopover(e, "retorno", crypto)}
                    >
                      {crypto.retorno ? (
                        <span style={badgeProdutoStyle(crypto.retorno)}>{STATUS_PRODUTO_LABEL[crypto.retorno]}</span>
                      ) : (
                        "—"
                      )}
                    </div>
                  </td>
                  <td style={dataTable.tdCenter}>
                    {canEditar && editingId === crypto.id ? (
                      <input
                        type="date"
                        autoFocus
                        value={toDateInputValue(crypto.ultima_comunicacao)}
                        aria-label={`Última comunicação — ${crypto.nome}`}
                        style={{
                          fontSize: 13,
                          fontFamily: FONT.body,
                          border: `1px solid ${t.cardBorder}`,
                          borderRadius: 8,
                          background: t.inputBg,
                          color: t.text,
                          padding: "4px 8px",
                          maxWidth: "100%",
                        }}
                        onChange={(e) => {
                          onUpdateUltima(crypto, e.target.value || null);
                          setEditingId(null);
                        }}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                    ) : (
                      <div
                        role={canEditar ? "button" : undefined}
                        tabIndex={canEditar ? 0 : undefined}
                        style={canEditar ? cellEditable : undefined}
                        onClick={() => canEditar && setEditingId(crypto.id)}
                        onKeyDown={(e) => {
                          if (canEditar && (e.key === "Enter" || e.key === " ")) {
                            e.preventDefault();
                            setEditingId(crypto.id);
                          }
                        }}
                      >
                        {fmtDataNascimento(crypto.ultima_comunicacao)}
                      </div>
                    )}
                  </td>
                  <td style={dataTable.tdCenter}>
                    <BtnIconeAcaoLinha label={tooltipAcao("Registro da marca")} onClick={() => onRegistro(crypto)}>
                      <ScrollText size={13} aria-hidden />
                    </BtnIconeAcaoLinha>
                    <BtnIconeAcaoLinha label={tooltipAcao("Ver marca")} onClick={() => onVer(crypto)}>
                      <Eye size={13} aria-hidden />
                    </BtnIconeAcaoLinha>
                  </td>
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
          onSelect={(v) => {
            if (pipelineComercialIsMissingOptionValue(v)) return;
            onUpdateComercial(popover.row, pipelineComercialPopoverUserId(v));
          }}
          onClose={() => setPopover(null)}
          labelOption={(v) => pipelineComercialPopoverLabel(v, comerciais)}
          isOptionDisabled={pipelineComercialIsMissingOptionValue}
          disabledOptionTitle="Usuário não encontrado no cadastro — crie o perfil com este nome em Gestão de Usuários."
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

      {popover?.kind === "possui" ? (
        <CellSelectPopover
          open
          anchorRect={popover.rect}
          options={POSSUI_OPTS}
          value={popover.row.possui_crypto ?? ""}
          onSelect={(v) => onUpdatePossui(popover.row, v === "sim" || v === "nao" ? v : null)}
          onClose={() => setPopover(null)}
          labelOption={possuiLabel}
          enableSearch={false}
          t={t}
        />
      ) : null}

      {popover?.kind === "retorno" ? (
        <CellSelectPopover
          open
          anchorRect={popover.rect}
          options={RETORNO_OPTS}
          value={popover.row.retorno ?? ""}
          onSelect={(v) => onUpdateRetorno(popover.row, v ? (v as StatusProduto) : null)}
          onClose={() => setPopover(null)}
          labelOption={retornoLabel}
          t={t}
        />
      ) : null}
    </>
  );
}
