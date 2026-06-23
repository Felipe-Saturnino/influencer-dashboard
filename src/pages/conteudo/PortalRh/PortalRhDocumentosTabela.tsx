import type { CSSProperties } from "react";
import { Eye } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { SectionTitle } from "../../../components/dashboard";
import { SortTableTh } from "../../../components/dashboard/SortTableTh";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { compareLocaleTexto } from "../../../lib/classificacaoSort";
import { fmtDataPt } from "../../../lib/portalRhWorkflow";
import {
  fmtAplicavelDocumento,
  labelClassificacaoDocumento,
  labelTipoDocumentoPortal,
  tagTipoDocumentoCor,
  type RhDocumentoClassificacao,
  type RhDocumentoTipo,
} from "../../../lib/portalRhDocumentoNormativo";
import type { RhPostagemStatus } from "../../../lib/portalRhWorkflow";

export type PortalRhDocumentoRow = {
  id: string;
  codigo: string | null;
  versao: string | null;
  titulo: string;
  tipo_documento: RhDocumentoTipo | null;
  resumo: string | null;
  aplicavel_a: string[] | null;
  classificacao: RhDocumentoClassificacao | null;
  published_at: string | null;
  updated_at: string;
  requires_acknowledgment: boolean;
  status?: RhPostagemStatus | null;
  introducao?: string | null;
  categoriaLabel?: string | null;
};

type SortCol = "codigo" | "titulo" | "versao" | "ciencia";
type SortDir = "asc" | "desc";

export function PortalRhDocumentosTabela({
  rows,
  cienciaPendenteIds,
  cienciaRegistradaEm,
  onAbrir,
  sort,
  onSort,
}: {
  rows: PortalRhDocumentoRow[];
  cienciaPendenteIds: Set<string>;
  cienciaRegistradaEm: Map<string, string>;
  onAbrir: (id: string) => void;
  sort: { col: SortCol; dir: SortDir };
  onSort: (col: SortCol) => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);

  const sorted = [...rows].sort((a, b) => {
    if (sort.col === "ciencia") {
      const pendA = cienciaPendenteIds.has(a.id) ? 0 : 1;
      const pendB = cienciaPendenteIds.has(b.id) ? 0 : 1;
      if (pendA !== pendB) return sort.dir === "asc" ? pendA - pendB : pendB - pendA;
    }
    if (sort.col === "codigo") {
      return compareLocaleTexto(a.codigo ?? a.titulo, b.codigo ?? b.titulo, sort.dir);
    }
    if (sort.col === "versao") {
      return compareLocaleTexto(a.versao ?? "", b.versao ?? "", sort.dir);
    }
    return compareLocaleTexto(a.titulo, b.titulo, sort.dir);
  });

  const cellStackPrimary: CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: t.text,
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  };
  const cellStackSecondary: CSSProperties = {
    fontSize: 11,
    color: t.textMuted,
    marginTop: 4,
    lineHeight: 1.4,
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  };
  const cellWrap: CSSProperties = {
    textAlign: "left",
    verticalAlign: "top",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  };

  return (
    <div style={pageBox}>
      <SectionTitle sub="PDFs publicados para leitura e aceite">Documentos oficiais</SectionTitle>
      <div className="app-table-wrap" style={getDataTableWrapStyle()}>
        <table style={getDataTableStyle({ minWidth: 880, tableLayout: "fixed", width: "100%" })}>
          <caption style={{ display: "none" }}>Políticas e normativas publicadas no portal de RH</caption>
          <thead>
            <tr>
              <SortTableTh
                label="Documento"
                col="codigo"
                sortCol={sort.col}
                sortDir={sort.dir}
                onSort={(c) => onSort(c as SortCol)}
                thStyle={{ ...dataTable.thHeader, width: "28%" }}
                align="center"
              />
              <SortTableTh
                label="Versão"
                col="versao"
                sortCol={sort.col}
                sortDir={sort.dir}
                onSort={(c) => onSort(c as SortCol)}
                thStyle={{ ...dataTable.thHeader, width: "14%" }}
                align="center"
              />
              <th scope="col" style={{ ...dataTable.thHeader, width: "18%" }}>
                Tipo
              </th>
              <th scope="col" style={{ ...dataTable.thHeader, width: "16%" }}>
                Aplicável a
              </th>
              <SortTableTh
                label="Sua Ciência"
                col="ciencia"
                sortCol={sort.col}
                sortDir={sort.dir}
                onSort={(c) => onSort(c as SortCol)}
                thStyle={{ ...dataTable.thHeader, width: "14%" }}
                align="center"
              />
              <th scope="col" style={dataTable.thHeader}>
                Ação
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const tagCor = tagTipoDocumentoCor(row.tipo_documento);
              const pendente = cienciaPendenteIds.has(row.id);
              const cienteEm = cienciaRegistradaEm.get(row.id);
              const dataPub = row.published_at ?? row.updated_at;
              return (
                <tr key={row.id} style={{ background: dataTable.zebraRow(i) }}>
                  <td
                    style={{
                      ...dataTable.tdCenter,
                      ...cellWrap,
                      width: "28%",
                      maxWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "ui-monospace, monospace",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--brand-primary, #7c3aed)",
                      }}
                    >
                      {row.codigo ?? "—"}
                    </div>
                    <div style={{ ...cellStackPrimary, marginTop: 4 }}>{row.titulo}</div>
                  </td>
                  <td
                    style={{
                      ...dataTable.tdCenter,
                      ...cellWrap,
                      textAlign: "center",
                      width: "14%",
                      maxWidth: 0,
                    }}
                  >
                    <div style={{ ...cellStackPrimary, textAlign: "center" }}>{row.versao ?? "—"}</div>
                    <div style={{ ...cellStackSecondary, textAlign: "center" }}>{fmtDataPt(dataPub)}</div>
                  </td>
                  <td
                    style={{
                      ...dataTable.tdCenter,
                      ...cellWrap,
                      textAlign: "center",
                      width: "18%",
                      maxWidth: 0,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          padding: "3px 9px",
                          borderRadius: 20,
                          fontSize: 10,
                          fontWeight: 700,
                          background: `${tagCor}22`,
                          color: tagCor,
                          border: `1px solid ${tagCor}44`,
                          whiteSpace: "normal",
                          textAlign: "center",
                          maxWidth: "100%",
                        }}
                      >
                        {row.tipo_documento ? labelTipoDocumentoPortal(row.tipo_documento) : row.categoriaLabel ?? "Legado"}
                      </span>
                    </div>
                    <div style={{ ...cellStackSecondary, textAlign: "center" }}>
                      {row.classificacao ? labelClassificacaoDocumento(row.classificacao) : "—"}
                    </div>
                  </td>
                  <td style={{ ...dataTable.tdCenter, fontSize: 12, overflowWrap: "anywhere", wordBreak: "break-word" }}>
                    {fmtAplicavelDocumento(row.aplicavel_a)}
                  </td>
                  <td style={dataTable.tdCenter}>
                    {row.requires_acknowledgment ? (
                      pendente ? (
                        <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 12 }}>Pendente</span>
                      ) : (
                        <span style={{ color: "#22c55e", fontWeight: 700, fontSize: 12 }}>
                          Ciente{cienteEm ? ` · ${fmtDataPt(cienteEm)}` : ""}
                        </span>
                      )
                    ) : (
                      <span style={{ color: t.textMuted, fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td style={dataTable.tdCenter}>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <button
                        type="button"
                        aria-label={`Abrir documento ${row.codigo ?? row.titulo}`}
                        title={`Abrir ${row.codigo ?? row.titulo}`}
                        onClick={() => onAbrir(row.id)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          border: `1px solid ${t.cardBorder}`,
                          background: t.inputBg,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: t.text,
                        }}
                      >
                        <Eye size={14} aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
