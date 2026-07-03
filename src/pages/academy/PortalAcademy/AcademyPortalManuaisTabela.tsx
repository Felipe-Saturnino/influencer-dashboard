import type { CSSProperties } from "react";
import { Eye } from "lucide-react";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { useApp } from "../../../context/AppContext";
import { SectionTitle } from "../../../components/dashboard";
import { SortTableTh } from "../../../components/dashboard/SortTableTh";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { compareLocaleTexto } from "../../../lib/classificacaoSort";
import { fmtDataPt } from "../../../lib/portalRhWorkflow";
import { fmtJogosManualColuna } from "../../../lib/academyPortalCiencia";
import { normalizarJogosMesa } from "../../../lib/academyPortalJogosMesa";

export type AcademyPortalManualRow = {
  id: string;
  codigo: string | null;
  versao: string | null;
  titulo: string;
  categoriaLabel: string | null;
  categoriaAccent: string | null;
  jogosMesa: string[] | null;
  published_at: string | null;
  updated_at: string;
  requires_acknowledgment: boolean;
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

export function AcademyPortalManuaisTabela({
  rows,
  cienciaPendenteIds,
  cienciaExigidaIds,
  cienciaRegistradaEm,
  mostrarColunaCiencia,
  onAbrir,
  sort,
  onSort,
}: {
  rows: AcademyPortalManualRow[];
  cienciaPendenteIds: Set<string>;
  cienciaExigidaIds: Set<string>;
  cienciaRegistradaEm: Map<string, string>;
  mostrarColunaCiencia: boolean;
  onAbrir: (id: string) => void;
  sort: { col: SortCol; dir: SortDir };
  onSort: (col: SortCol) => void;
}) {
  const { theme: t } = useApp();
  const dataTable = useDataTableBlock();

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
    <div>
      <SectionTitle sub="Publicados para leitura e aceite">Manuais de treinamento</SectionTitle>
      <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
        <table style={getDataTableStyle({ minWidth: 720 })}>
          <caption style={{ display: "none" }}>Manuais publicados no Portal da Academy</caption>
          <thead>
            <tr>
              <SortTableTh
                label="Manual"
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
                Jogos
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
              const tagCor = row.categoriaAccent ?? "#7c3aed";
              const pendente = cienciaPendenteIds.has(row.id);
              const exigeCiencia = cienciaExigidaIds.has(row.id);
              const cienteEm = cienciaRegistradaEm.get(row.id);
              const dataPub = row.published_at ?? row.updated_at;
              const jogos = normalizarJogosMesa(row.jogosMesa);
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
                          {row.categoriaLabel ?? "—"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...tdWrap, fontSize: 12 }}>{fmtJogosManualColuna(jogos)}</td>
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
                        label={tooltipAcao("Visualizar manual")}
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
