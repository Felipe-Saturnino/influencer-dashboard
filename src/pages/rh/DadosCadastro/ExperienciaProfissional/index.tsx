import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { BtnExcluirLinha } from "../../../../components/BtnExcluirLinha";
import { BtnIconeAcaoLinha } from "../../../../components/BtnIconeAcaoLinha";
import { tooltipAcao } from "../../../../lib/iconOnlyButtonA11y";
import { ModalConfirmExcluirPadrao } from "../../../../components/OperacoesModal";
import { supabase } from "../../../../lib/supabase";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { FONT } from "../../../../constants/theme";
import { CtaCriarButton } from "../../../../components/CtaCriarButton";
import SectionTitle from "../../../../components/dashboard/SectionTitle";
import { SortTableTh, SkeletonTableRow } from "../../../../components/dashboard";
import { descricaoModalExcluirItem, tooltipExcluir } from "../../../../lib/excluirItemUi";
import { useDataTableBlock } from "../../../../hooks/useDataTableBlock";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../../lib/dataTableStyles";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { compareLocaleTexto, type SortDir } from "../../../../lib/classificacaoSort";
import { RH_EXPERIENCIA_VAZIO } from "../../../../lib/rhExperienciaProfissionalConstants";
import { formatarPeriodoExperiencia } from "../../../../lib/rhExperienciaDates";
import {
  registrarHistoricoExperienciaProfissional,
  resumoExperienciaHistorico,
} from "../../../../lib/rhExperienciaHistorico";
import type { RhExperienciaPayload, RhFuncionarioExperiencia } from "../../../../types/rhExperienciaProfissional";
import { ModalExperienciaProfissional } from "./ModalExperiencia";
import {
  getExperienciaSectionHeaderStyle,
} from "./sharedStyles";

type Props = {
  funcionarioId: string;
  podeEditar: boolean;
  usuarioLabel: string;
  onHistoricoRefresh?: () => void;
  onCompletudeAlterada?: () => void;
  onErro?: (msg: string) => void;
};

type SortCol = "cargo" | "empresa" | "periodo";

function comparePeriodoExperiencia(a: RhFuncionarioExperiencia, b: RhFuncionarioExperiencia, dir: SortDir): number {
  const fimA = a.mes_ano_fim ?? "";
  const fimB = b.mes_ano_fim ?? "";
  if (!a.mes_ano_fim && b.mes_ano_fim) return dir === "desc" ? -1 : 1;
  if (a.mes_ano_fim && !b.mes_ano_fim) return dir === "desc" ? 1 : -1;
  if (fimA !== fimB) {
    const d = fimA.localeCompare(fimB);
    return dir === "desc" ? -d : d;
  }
  const d = a.mes_ano_inicio.localeCompare(b.mes_ano_inicio);
  return dir === "desc" ? -d : d;
}

function sortExperiencias(rows: RhFuncionarioExperiencia[], col: SortCol, dir: SortDir): RhFuncionarioExperiencia[] {
  return [...rows].sort((a, b) => {
    if (col === "periodo") return comparePeriodoExperiencia(a, b, dir);
    if (col === "empresa") return compareLocaleTexto(a.empresa, b.empresa, dir);
    return compareLocaleTexto(a.cargo, b.cargo, dir);
  });
}

export default function ExperienciaProfissionalPainel({
  funcionarioId,
  podeEditar,
  usuarioLabel,
  onHistoricoRefresh,
  onCompletudeAlterada,
  onErro,
}: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RhFuncionarioExperiencia[]>([]);
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: "periodo", dir: "desc" });
  const [modal, setModal] = useState<RhFuncionarioExperiencia | null | "novo">(null);
  const [deleteRow, setDeleteRow] = useState<RhFuncionarioExperiencia | null>(null);
  const [deleting, setDeleting] = useState(false);

  const notifyErro = useCallback(
    (msg: string) => {
      console.error(msg);
      onErro?.(msg);
    },
    [onErro],
  );

  const logHistorico = useCallback(
    async (acao: "criar" | "editar" | "excluir", cargo: string, empresa: string) => {
      const { error } = await registrarHistoricoExperienciaProfissional({
        rhFuncionarioId: funcionarioId,
        acao,
        resumo: resumoExperienciaHistorico(cargo, empresa),
        usuarioLabel,
      });
      if (error) notifyErro("Registro salvo, mas não foi possível gravar o histórico.");
      else onHistoricoRefresh?.();
    },
    [funcionarioId, usuarioLabel, notifyErro, onHistoricoRefresh],
  );

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rh_funcionario_experiencia")
      .select("*")
      .eq("rh_funcionario_id", funcionarioId)
      .order("mes_ano_fim", { ascending: false, nullsFirst: true })
      .order("mes_ano_inicio", { ascending: false });
    setLoading(false);
    if (error) {
      notifyErro("Não foi possível carregar experiências profissionais.");
      setRows([]);
      return;
    }
    setRows((data ?? []) as RhFuncionarioExperiencia[]);
  }, [funcionarioId, notifyErro]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const rowsSorted = useMemo(() => sortExperiencias(rows, sort.col, sort.dir), [rows, sort]);

  const toggleSort = (col: SortCol) => {
    setSort((s) => ({ col, dir: s.col === col && s.dir === "desc" ? "asc" : "desc" }));
  };

  const salvar = async (payload: RhExperienciaPayload, edit?: RhFuncionarioExperiencia | null) => {
    if (edit) {
      const { error } = await supabase.from("rh_funcionario_experiencia").update(payload).eq("id", edit.id);
      if (error) throw error;
      await logHistorico("editar", payload.cargo, payload.empresa);
    } else {
      const { error } = await supabase.from("rh_funcionario_experiencia").insert({
        rh_funcionario_id: funcionarioId,
        ...payload,
      });
      if (error) throw error;
      await logHistorico("criar", payload.cargo, payload.empresa);
    }
    setModal(null);
    await carregar();
    onCompletudeAlterada?.();
  };

  const confirmarExclusao = async () => {
    if (!deleteRow) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("rh_funcionario_experiencia").delete().eq("id", deleteRow.id);
      if (error) throw error;
      await logHistorico("excluir", deleteRow.cargo, deleteRow.empresa);
      setDeleteRow(null);
      await carregar();
      onCompletudeAlterada?.();
    } catch {
      notifyErro("Não foi possível excluir.");
    } finally {
      setDeleting(false);
    }
  };

  const colCount = podeEditar ? 4 : 3;

  return (
    <div style={pageBox}>
      <div style={getExperienciaSectionHeaderStyle()}>
        <SectionTitle sub="Cargos e empresas onde trabalhou antes">Experiências anteriores</SectionTitle>
        {podeEditar ? <CtaCriarButton onClick={() => setModal("novo")}>Nova Experiência</CtaCriarButton> : null}
      </div>

      {loading ? (
        <div className="app-table-wrap" style={getDataTableWrapStyle()}>
          <table style={getDataTableStyle({ minWidth: 560 })}>
            <caption style={{ display: "none" }}>Experiências profissionais anteriores</caption>
            <tbody>
              <SkeletonTableRow cols={colCount} />
              <SkeletonTableRow cols={colCount} />
              <SkeletonTableRow cols={colCount} />
            </tbody>
          </table>
        </div>
      ) : rowsSorted.length === 0 ? (
        <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          {RH_EXPERIENCIA_VAZIO}
        </div>
      ) : (
        <div className="app-table-wrap" style={getDataTableWrapStyle()}>
          <table style={getDataTableStyle({ minWidth: 560 })}>
            <caption style={{ display: "none" }}>Experiências profissionais anteriores</caption>
            <thead>
              <tr>
                <SortTableTh
                  label="Cargo"
                  col="cargo"
                  sortCol={sort.col}
                  sortDir={sort.dir}
                  onSort={toggleSort}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                <SortTableTh
                  label="Empresa"
                  col="empresa"
                  sortCol={sort.col}
                  sortDir={sort.dir}
                  onSort={toggleSort}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                <SortTableTh
                  label="Período"
                  col="periodo"
                  sortCol={sort.col}
                  sortDir={sort.dir}
                  onSort={toggleSort}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                {podeEditar ? (
                  <th scope="col" style={dataTable.thHeader}>
                    Ações
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rowsSorted.map((row, i) => (
                <tr key={row.id} style={{ background: dataTable.zebraRow(i) }}>
                  <td style={dataTable.tdCenter}>{row.cargo}</td>
                  <td style={dataTable.tdCenter}>{row.empresa}</td>
                  <td style={dataTable.tdCenter}>{formatarPeriodoExperiencia(row.mes_ano_inicio, row.mes_ano_fim)}</td>
                  {podeEditar ? (
                    <td style={dataTable.tdCenter}>
                      <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                        <BtnIconeAcaoLinha label={tooltipAcao("Editar experiência")} onClick={() => setModal(row)}>
                          <Pencil size={13} aria-hidden />
                        </BtnIconeAcaoLinha>
                        <BtnExcluirLinha
                          labelAcao={tooltipExcluir("experiência")}
                          onClick={() => setDeleteRow(row)}
                        />
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal === "novo" ? (
        <ModalExperienciaProfissional onClose={() => setModal(null)} onSave={(p) => salvar(p, null)} />
      ) : modal ? (
        <ModalExperienciaProfissional
          initial={modal}
          onClose={() => setModal(null)}
          onSave={(p) => salvar(p, modal)}
        />
      ) : null}

      {deleteRow ? (
        <ModalConfirmExcluirPadrao
          descricaoItem={descricaoModalExcluirItem(
            "a experiência",
            `${deleteRow.cargo} na ${deleteRow.empresa}`,
          )}
          onCancel={() => setDeleteRow(null)}
          onConfirm={() => void confirmarExclusao()}
          loading={deleting}
        />
      ) : null}
    </div>
  );
}
