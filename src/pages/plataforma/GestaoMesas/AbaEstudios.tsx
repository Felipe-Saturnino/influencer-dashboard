import { useCallback, useMemo, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT, FONT_TITLE } from "../../../constants/theme";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles";
import { getPageContentBoxStyle, getPageKpiSectionGapStyle } from "../../../lib/pageContentBoxStyles";
import SectionTitle from "../../../components/dashboard/SectionTitle";
import { SortTableTh, type SortDir } from "../../../components/dashboard";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { SEARCH_PLACEHOLDER_ELLIPSIS } from "../../../lib/searchBarConstants";
import { textoContemBusca } from "../../../lib/searchText";
import { ModalConfirmExcluirPadrao } from "../../../components/OperacoesModal";
import { BtnExcluirLinha } from "../../../components/BtnExcluirLinha";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import {descricaoModalExcluirItem, tooltipExcluir} from "../../../lib/excluirItemUi";
import { compareLocaleTexto, compareNumber } from "../../../lib/classificacaoSort";
import { supabase } from "../../../lib/supabase";
import { OPERADORA_FILTRO_TODAS_VALUE } from "../../../components/FiltroOperadoraSelect";
import { labelEstudioTipo } from "./gestaoEstudiosHelpers";
import { tableRowHoverBg, nomesOperadorasEstudio, type EstudioSpinRow, type MesaSpinCadastroRow } from "./gestaoMesasUi";
import { ModalEstudio } from "./ModalEstudio";
import type { Permissoes } from "../../../hooks/usePermission";

const ERRO_EXCLUIR_ESTUDIO =
  "Não foi possível excluir o estúdio. Verifique se não há mesas vinculadas.";

type EstudioSortCol = "nome" | "tipo" | "qtd" | "operadoras";

export function AbaEstudios({
  filtroOperadora,
  estudios,
  mesas,
  loading,
  perm,
  onRecarregar,
}: {
  filtroOperadora: string;
  estudios: EstudioSpinRow[];
  mesas: MesaSpinCadastroRow[];
  loading: boolean;
  perm: Permissoes;
  onRecarregar: () => void;
}) {
  const { theme: t } = useApp();
  const dashBrand = useDashboardBrand();
  const [busca, setBusca] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<EstudioSpinRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EstudioSpinRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [sort, setSort] = useState<{ col: EstudioSortCol; dir: SortDir }>({ col: "nome", dir: "asc" });

  const mesasPorEstudio = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of mesas) {
      if (!m.estudio_slug) continue;
      map.set(m.estudio_slug, (map.get(m.estudio_slug) ?? 0) + 1);
    }
    return map;
  }, [mesas]);

  const estudioVisivelNoFiltro = useCallback(
    (e: EstudioSpinRow) => {
      if (filtroOperadora === OPERADORA_FILTRO_TODAS_VALUE) return true;
      return (e.estudios_spin_operadoras ?? []).some((j) => j.operadora_slug === filtroOperadora);
    },
    [filtroOperadora],
  );

  const estudiosFiltrados = useMemo(() => {
    const base = estudios.filter(estudioVisivelNoFiltro);
    const q = busca.trim();
    if (!q) return base;
    return base.filter((e) =>
      textoContemBusca(e.nome, q) || textoContemBusca(nomesOperadorasEstudio(e).join(" "), q),
    );
  }, [estudios, busca, estudioVisivelNoFiltro]);

  const contagemMesasPorTipo = useMemo(() => {
    let dedicado = 0;
    let network = 0;
    for (const m of mesas) {
      if (!m.estudio_slug) continue;
      const est = estudios.find((e) => e.slug === m.estudio_slug);
      if (!est) continue;
      if (!estudioVisivelNoFiltro(est)) continue;
      if (est.tipo === "network") network += 1;
      else dedicado += 1;
    }
    return { dedicado, network };
  }, [mesas, estudios, estudioVisivelNoFiltro]);

  const rowsOrdenadas = useMemo(() => {
    const arr = [...estudiosFiltrados];
    const { col, dir } = sort;
    arr.sort((a, b) => {
      let c = 0;
      switch (col) {
        case "nome":
          c = compareLocaleTexto(a.nome, b.nome, dir);
          break;
        case "tipo":
          c = compareLocaleTexto(labelEstudioTipo(a.tipo), labelEstudioTipo(b.tipo), dir);
          break;
        case "qtd":
          c = compareNumber(mesasPorEstudio.get(a.slug) ?? 0, mesasPorEstudio.get(b.slug) ?? 0, dir);
          break;
        case "operadoras":
          c = compareLocaleTexto(
            nomesOperadorasEstudio(a).join(", "),
            nomesOperadorasEstudio(b).join(", "),
            dir,
          );
          break;
        default:
          c = 0;
      }
      if (c !== 0) return c;
      return compareLocaleTexto(a.nome, b.nome, "asc");
    });
    return arr;
  }, [estudiosFiltrados, sort, mesasPorEstudio]);

  const dataTable = useDataTableBlock();
  const contentBox = getPageContentBoxStyle(dashBrand, t);

  return (
    <>
      <div className="app-grid-2" style={getPageKpiSectionGapStyle()}>
        {(
          [
            { label: "Mesas Dedicadas", valor: contagemMesasPorTipo.dedicado, cor: "var(--brand-primary, #7c3aed)" },
            { label: "Mesas Network", valor: contagemMesasPorTipo.network, cor: "var(--brand-accent, #1e36f8)" },
          ] as const
        ).map((k) => (
          <div
            key={k.label}
            style={{
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
              borderLeft: `3px solid ${k.cor}`,
              borderRadius: 18,
              padding: "16px 20px",
              boxShadow: t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "1.4px",
                textTransform: "uppercase",
                color: t.textMuted,
                fontFamily: FONT.body,
                marginBottom: 6,
              }}
            >
              {k.label}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: k.cor,
                fontFamily: FONT_TITLE,
                lineHeight: 1,
              }}
            >
              {loading ? "—" : k.valor}
            </div>
          </div>
        ))}
      </div>

      <div style={contentBox}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          <SectionTitle compact>Estúdios</SectionTitle>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <BarraPesquisaPagina
              value={busca}
              onChange={setBusca}
              placeholder={`Buscar por nome do estúdio ou operadora${SEARCH_PLACEHOLDER_ELLIPSIS}`}
              aria-label="Buscar estúdio por nome ou operadora"
              wrapperStyle={{ flex: "1 1 240px", minWidth: 200, maxWidth: 480 }}
            />
            {perm.canCriarOk ? (
              <CtaCriarButton
                type="button"
                onClick={() => {
                  setEditando(null);
                  setModalOpen(true);
                }}
                style={{ flexShrink: 0 }}
              >
                Novo Estúdio
              </CtaCriarButton>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: t.textMuted,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Loader2 size={20} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
            <span>Carregando…</span>
          </div>
        ) : estudiosFiltrados.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
            {estudios.length === 0
              ? "Nenhum estúdio cadastrado."
              : busca.trim()
                ? "Nenhum estúdio encontrado."
                : "Nenhum estúdio para o filtro selecionado."}
          </div>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle()}>
              <caption style={{ display: "none" }}>Cadastro de estúdios Spin</caption>
              <thead>
                <tr>
                  <SortTableTh<EstudioSortCol>
                    label="Nome do Estúdio"
                    col="nome"
                    sortCol={sort.col}
                    sortDir={sort.dir}
                    thStyle={dataTable.thHeader}
                    align="center"
                    onSort={(c) => setSort((s) => ({ col: c, dir: s.col === c && s.dir === "desc" ? "asc" : "desc" }))}
                  />
                  <SortTableTh<EstudioSortCol>
                    label="Tipo"
                    col="tipo"
                    sortCol={sort.col}
                    sortDir={sort.dir}
                    thStyle={dataTable.thHeader}
                    align="center"
                    onSort={(c) => setSort((s) => ({ col: c, dir: s.col === c && s.dir === "desc" ? "asc" : "desc" }))}
                  />
                  <SortTableTh<EstudioSortCol>
                    label="Quantidade de Mesas"
                    col="qtd"
                    sortCol={sort.col}
                    sortDir={sort.dir}
                    thStyle={dataTable.thHeader}
                    align="center"
                    onSort={(c) => setSort((s) => ({ col: c, dir: s.col === c && s.dir === "desc" ? "asc" : "desc" }))}
                  />
                  <SortTableTh<EstudioSortCol>
                    label="Operadoras"
                    col="operadoras"
                    sortCol={sort.col}
                    sortDir={sort.dir}
                    thStyle={dataTable.thHeader}
                    align="center"
                    onSort={(c) => setSort((s) => ({ col: c, dir: s.col === c && s.dir === "desc" ? "asc" : "desc" }))}
                  />
                  {(perm.canEditarOk || perm.canExcluirOk) && (
                    <th scope="col" style={dataTable.thHeader}>
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rowsOrdenadas.map((r, i) => {
                  const zebra = dataTable.zebraRow(i);
                  const opsLabel = nomesOperadorasEstudio(r).join(", ") || "—";
                  return (
                    <tr
                      key={r.id}
                      style={{ background: zebra }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = tableRowHoverBg(t.isDark);
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = zebra;
                      }}
                    >
                      <td style={{ ...dataTable.tdCenter, fontWeight: 600 }}>{r.nome}</td>
                      <td style={dataTable.tdCenter}>{labelEstudioTipo(r.tipo)}</td>
                      <td style={dataTable.tdCenter}>{mesasPorEstudio.get(r.slug) ?? 0}</td>
                      <td style={{ ...dataTable.tdCenter, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }} title={opsLabel}>
                        {opsLabel}
                      </td>
                      {(perm.canEditarOk || perm.canExcluirOk) && (
                        <td style={dataTable.tdCenter}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                            {perm.canEditarOk && (
                              <BtnIconeAcaoLinha
                                label={tooltipAcao("Editar estúdio")}
                                onClick={() => {
                                  setEditando(r);
                                  setModalOpen(true);
                                }}
                              >
                                <Pencil size={14} aria-hidden="true" />
                              </BtnIconeAcaoLinha>
                            )}
                            {perm.canExcluirOk && (
                              <BtnExcluirLinha
                                labelAcao={tooltipExcluir("estúdio")}
                                onClick={() => {
                                  setDeleteError(null);
                                  setDeleteTarget(r);
                                }}
                              />
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <ModalEstudio
          key={editando?.id ?? "novo"}
          editando={editando}
          onClose={() => setModalOpen(false)}
          onSalvo={onRecarregar}
        />
      )}

      {deleteTarget && (
        <ModalConfirmExcluirPadrao
          zIndex={1100}
          descricaoItem={descricaoModalExcluirItem("o estúdio", deleteTarget.nome)}
          onCancel={() => {
            if (!deleteLoading) setDeleteTarget(null);
          }}
          onConfirm={async () => {
            setDeleteError(null);
            setDeleteLoading(true);
            const { error } = await supabase.from("estudios_spin").delete().eq("id", deleteTarget.id);
            setDeleteLoading(false);
            if (error) {
              console.error(error);
              setDeleteError(ERRO_EXCLUIR_ESTUDIO);
              return;
            }
            setDeleteTarget(null);
            onRecarregar();
          }}
          loading={deleteLoading}
          error={deleteError}
        />
      )}
    </>
  );
}
