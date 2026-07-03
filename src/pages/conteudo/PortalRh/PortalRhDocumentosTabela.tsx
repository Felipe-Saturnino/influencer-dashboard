import type { CSSProperties } from "react";
import { Eye } from "lucide-react";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
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

function cellStackCenter(extra?: CSSProperties): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    width: "100%",
    ...extra,
  };
}

export function PortalRhDocumentosTabela({
  rows,
  cienciaPendenteIds,
  cienciaExigidaIds,
  cienciaRegistradaEm,
  mostrarColunaCiencia,
  onAbrir,
  sort,
  onSort,
}: {
  rows: PortalRhDocumentoRow[];
  cienciaPendenteIds: Set<string>;
  cienciaExigidaIds: Set<string>;
  cienciaRegistradaEm: Map<string, string>;
  mostrarColunaCiencia: boolean;
  onAbrir: (id: string) => void;
  sort: { col: SortCol; dir: SortDir };
  onSort: (col: SortCol) => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);

  const tdCell: CSSProperties = {
    ...dataTable.tdCenter,
    verticalAlign: "middle",
  };

  const tdWrap: CSSProperties = {
    ...tdCell,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  };

  const cellStackPrimary: CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: t.text,
    lineHeight: 1.35,
    textAlign: "center",
  };

  const cellStackSecondary: CSSProperties = {
    fontSize: 11,
    color: t.textMuted,
    lineHeight: 1.4,
    textAlign: "center",
  };

  const sorted = [...rows].sort((a, b) => {
    if (mostrarColunaCiencia && sort.col === "ciencia") {
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

  return (
    <div style={pageBox}>
      <SectionTitle sub="PDFs publicados para leitura e aceite">Documentos oficiais</SectionTitle>
      <div className="app-table-wrap app-table-wrap--portal-rh-docs" style={getDataTableWrapStyle()}>
        <table style={getDataTableStyle()}>
          <caption style={{ display: "none" }}>Políticas e normativas publicadas no portal de RH</caption>
          <thead>
            <tr>
              <SortTableTh
                label="Documento"
                col="codigo"
                sortCol={sort.col}
                sortDir={sort.dir}
                onSort={(c) => onSort(c as SortCol)}
                thStyle={dataTable.thHeader}
                align="center"
              />
              <SortTableTh
                label="Versão"
                col="versao"
                sortCol={sort.col}
                sortDir={sort.dir}
                onSort={(c) => onSort(c as SortCol)}
                thStyle={dataTable.thHeader}
                align="center"
              />
              <th scope="col" style={dataTable.thHeader}>
                Tipo
              </th>
              <th scope="col" style={dataTable.thHeader}>
                Aplicável a
              </th>
              {mostrarColunaCiencia ? (
                <SortTableTh
                  label="Sua Ciência"
                  col="ciencia"
                  sortCol={sort.col}
                  sortDir={sort.dir}
                  onSort={(c) => onSort(c as SortCol)}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
              ) : null}
              <th scope="col" style={{ ...dataTable.thHeader, minWidth: 72 }}>
                Ação
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const tagCor = tagTipoDocumentoCor(row.tipo_documento);
              const pendente = cienciaPendenteIds.has(row.id);
              const exigeCiencia = cienciaExigidaIds.has(row.id);
              const cienteEm = cienciaRegistradaEm.get(row.id);
              const dataPub = row.published_at ?? row.updated_at;
              const zebraBg = dataTable.zebraRow(i);

              return (
                <tr
                  key={row.id}
                  style={{ background: zebraBg }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = t.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = zebraBg;
                  }}
                >
                  <td style={{ ...tdWrap, maxWidth: 220 }}>
                    <div style={cellStackCenter()}>
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
                      <div style={cellStackPrimary}>{row.titulo}</div>
                    </div>
                  </td>
                  <td style={tdWrap}>
                    <div style={cellStackCenter()}>
                      <div style={cellStackPrimary}>{row.versao ?? "—"}</div>
                      <div style={cellStackSecondary}>{fmtDataPt(dataPub)}</div>
                    </div>
                  </td>
                  <td style={tdWrap}>
                    <div style={cellStackCenter()}>
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
                          }}
                        >
                          {row.tipo_documento ? labelTipoDocumentoPortal(row.tipo_documento) : row.categoriaLabel ?? "Legado"}
                        </span>
                      </div>
                      <div style={cellStackSecondary}>
                        {row.classificacao ? labelClassificacaoDocumento(row.classificacao) : "—"}
                      </div>
                    </div>
                  </td>
                  <td style={{ ...tdWrap, fontSize: 12 }}>{fmtAplicavelDocumento(row.aplicavel_a)}</td>
                  {mostrarColunaCiencia ? (
                    <td style={tdWrap}>
                      {!exigeCiencia ? (
                        <span style={{ color: t.textMuted, fontSize: 12 }}>—</span>
                      ) : pendente ? (
                        <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 12 }}>Pendente</span>
                      ) : (
                        <span style={{ color: "#22c55e", fontWeight: 700, fontSize: 12, lineHeight: 1.35 }}>
                          Ciente{cienteEm ? ` · ${fmtDataPt(cienteEm)}` : ""}
                        </span>
                      )}
                    </td>
                  ) : null}
                  <td style={tdCell}>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <BtnIconeAcaoLinha
                        label={tooltipAcao("Visualizar documento")}
                        onClick={() => onAbrir(row.id)}
                      >
                        <Eye size={14} aria-hidden />
                      </BtnIconeAcaoLinha>
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
