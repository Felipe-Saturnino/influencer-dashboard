import { Eye, Pencil } from "lucide-react";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { TabelaPaginacaoBar } from "../../../components/TabelaPaginacaoBar";
import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import type { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useTabelaPaginacao } from "../../../hooks/useTabelaPaginacao";
import type { AcademyMaterial, AcademyTrilha } from "../../../lib/academyCronogramaTypes";
import { fmtDataCatalogo, nomesVinculados, trilhasDoMaterial } from "../../../lib/academyCronogramaUi";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";

type Brand = ReturnType<typeof useDashboardBrand>;

type Props = {
  brand: Brand;
  t: Theme;
  rows: AcademyMaterial[];
  trilhas: AcademyTrilha[];
  trilhaMateriais: { trilha_id: string; material_id: string }[];
  resetKey: string;
  canEditar: boolean;
  onVer: (id: string) => void;
  onEditar: (id: string) => void;
};

export function CronogramaAbaMateriais({
  brand,
  t,
  rows,
  trilhas,
  trilhaMateriais,
  resetKey,
  canEditar,
  onVer,
  onEditar,
}: Props) {
  const dt = useDataTableBlock();
  const { paginaSafe, linhasPagina, pageSize, setPagina, totalItems, zebraIdx } = useTabelaPaginacao(rows, resetKey);

  return (
    <div style={getPageContentBoxStyle(brand, t)}>
      <h2 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--brand-primary, #7c3aed)", fontFamily: FONT.body }}>
        Materiais das aulas{" "}
        <span style={{ fontSize: 11, fontWeight: 400, color: t.textMuted, textTransform: "none", letterSpacing: 0 }}>
          — conteúdo para ser usado nas trilhas
        </span>
      </h2>
      <div className="app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
        <table style={getDataTableStyle()}>
          <caption className="sr-only">Materiais de aula</caption>
          <thead>
            <tr>
              <th scope="col" style={dt.thHeaderSticky}>Material</th>
              <th scope="col" style={dt.thHeader}>Trilha</th>
              <th scope="col" style={dt.thHeader}>Criado em</th>
              <th scope="col" style={dt.thHeader}>Versão</th>
              <th scope="col" style={dt.thHeader}>Atualizado em</th>
              <th scope="col" style={dt.thHeader}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {linhasPagina.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ ...dt.tdCenter, textAlign: "center", color: t.textMuted }}>
                  Nenhum material neste status.
                </td>
              </tr>
            ) : (
              linhasPagina.map((row, i) => (
                <tr key={row.id} style={{ background: dt.zebraRow(zebraIdx(i)) }}>
                  <td style={dt.tdSticky({ rowIndex: zebraIdx(i) })}>{row.titulo}</td>
                  <td style={dt.tdCenter}>{nomesVinculados(trilhasDoMaterial(row.id, trilhas, trilhaMateriais).map((tr) => tr.nome))}</td>
                  <td style={dt.tdCenter}>{fmtDataCatalogo(row.created_at)}</td>
                  <td style={dt.tdCenter}>{row.versao}</td>
                  <td style={dt.tdCenter}>{fmtDataCatalogo(row.updated_at)}</td>
                  <td style={dt.tdCenter}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <BtnIconeAcaoLinha label={tooltipAcao("Ver")} onClick={() => onVer(row.id)}>
                        <Eye size={14} aria-hidden />
                      </BtnIconeAcaoLinha>
                      {canEditar ? (
                        <BtnIconeAcaoLinha label={tooltipAcao("Editar")} onClick={() => onEditar(row.id)}>
                          <Pencil size={14} aria-hidden />
                        </BtnIconeAcaoLinha>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <TabelaPaginacaoBar t={t} page={paginaSafe} pageSize={pageSize} totalItems={totalItems} onPageChange={setPagina} />
    </div>
  );
}
