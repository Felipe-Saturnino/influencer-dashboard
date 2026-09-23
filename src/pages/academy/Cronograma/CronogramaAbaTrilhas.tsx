import { Eye, Pencil } from "lucide-react";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { TabelaPaginacaoBar } from "../../../components/TabelaPaginacaoBar";
import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { useTabelaPaginacao } from "../../../hooks/useTabelaPaginacao";
import {
  ACADEMY_CRONOGRAMA_TRILHA_TIPO_LABEL,
} from "../../../lib/academyCronogramaConstants";
import type {
  AcademyCronograma,
  AcademyCronogramaItem,
  AcademyMaterial,
  AcademyProva,
  AcademyTrilha,
} from "../../../lib/academyCronogramaTypes";
import { cronogramasDaTrilha, materiaisDaTrilha, nomesVinculados, provasDaTrilha } from "../../../lib/academyCronogramaUi";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import type { useDashboardBrand } from "../../../hooks/useDashboardBrand";

type Brand = ReturnType<typeof useDashboardBrand>;

type Props = {
  brand: Brand;
  t: Theme;
  rows: AcademyTrilha[];
  cronogramas: AcademyCronograma[];
  itens: AcademyCronogramaItem[];
  materiais: AcademyMaterial[];
  provas: AcademyProva[];
  trilhaMateriais: { trilha_id: string; material_id: string }[];
  trilhaProvas: { trilha_id: string; prova_id: string }[];
  resetKey: string;
  canEditar: boolean;
  onVer: (id: string) => void;
  onEditar: (id: string) => void;
};

export function CronogramaAbaTrilhas({
  brand,
  t,
  rows,
  cronogramas,
  itens,
  materiais,
  provas,
  trilhaMateriais,
  trilhaProvas,
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
        Catálogo de trilhas{" "}
        <span style={{ fontSize: 11, fontWeight: 400, color: t.textMuted, textTransform: "none", letterSpacing: 0 }}>
          — módulos reutilizáveis no onboarding e no retreinamento
        </span>
      </h2>
      <div className="app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
        <table style={getDataTableStyle()}>
          <caption className="sr-only">Trilhas de treinamento</caption>
          <thead>
            <tr>
              <th scope="col" style={dt.thHeaderSticky}>Trilha</th>
              <th scope="col" style={dt.thHeader}>Tipo</th>
              <th scope="col" style={dt.thHeader}>Usada em</th>
              <th scope="col" style={dt.thHeader}>Materiais</th>
              <th scope="col" style={dt.thHeader}>Provas</th>
              <th scope="col" style={dt.thHeader}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {linhasPagina.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ ...dt.tdCenter, textAlign: "center", color: t.textMuted }}>
                  Nenhuma trilha neste status.
                </td>
              </tr>
            ) : (
              linhasPagina.map((row, i) => (
                <tr key={row.id} style={{ background: dt.zebraRow(zebraIdx(i)) }}>
                  <td style={dt.tdSticky({ rowIndex: zebraIdx(i) })}>{row.nome}</td>
                  <td style={dt.tdCenter}>{ACADEMY_CRONOGRAMA_TRILHA_TIPO_LABEL[row.tipo]}</td>
                  <td style={dt.tdCenter}>{nomesVinculados(cronogramasDaTrilha(row.id, cronogramas, itens).map((c) => c.nome))}</td>
                  <td style={dt.tdCenter}>{materiaisDaTrilha(row.id, materiais, trilhaMateriais).length}</td>
                  <td style={dt.tdCenter}>{provasDaTrilha(row.id, provas, trilhaProvas).length}</td>
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
