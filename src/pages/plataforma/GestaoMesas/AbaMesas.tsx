import { useMemo, useState } from "react";
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
import { PAGE_SEARCH } from "../../../lib/searchBarConstants";
import { ModalConfirmExcluirPadrao } from "../../../components/OperacoesModal";
import { BtnExcluirLinha } from "../../../components/BtnExcluirLinha";
import { descricaoBotaoExcluir, descricaoModalExcluirItem } from "../../../lib/excluirItemUi";
import { compareLocaleTexto } from "../../../lib/classificacaoSort";
import { GAME_IDENTITY_HEX, GAME_IDENTITY_LABEL } from "../../../lib/gameIdentityColors";
import { supabase } from "../../../lib/supabase";
import { OPERADORA_FILTRO_TODAS_VALUE } from "../../../components/FiltroOperadoraSelect";
import type { Permissoes } from "../../../hooks/usePermission";
import {
  nomeEstudioJoin,
  tableRowHoverBg,
  type EstudioSpinRow,
  type MesaSpinCadastroRow,
} from "./gestaoMesasUi";
import { ModalMesa } from "./ModalMesa";

const ERRO_EXCLUIR_MESA = "Não foi possível excluir a mesa. Verifique se não há registros vinculados.";

const KPI_TIPOS_JOGO_MESAS = (
  ["baccarat", "blackjack", "roleta", "futebol_brasileiro"] as const
).map((key) => ({
  label: GAME_IDENTITY_LABEL[key],
  cor: GAME_IDENTITY_HEX[key],
}));

type MesaSortCol = "estudio" | "nome" | "tipo" | "numero" | "ident";

function mesaNoFiltroOperadora(
  m: MesaSpinCadastroRow,
  filtroOperadora: string,
  estudios: EstudioSpinRow[],
): boolean {
  if (filtroOperadora === OPERADORA_FILTRO_TODAS_VALUE) return true;
  if (m.operadora_slug === filtroOperadora) return true;
  if (!m.estudio_slug) return false;
  const est = estudios.find((e) => e.slug === m.estudio_slug);
  return (est?.estudios_spin_operadoras ?? []).some((j) => j.operadora_slug === filtroOperadora);
}

export function AbaMesas({
  filtroOperadora,
  rows,
  estudios,
  loading,
  perm,
  onRecarregar,
}: {
  filtroOperadora: string;
  rows: MesaSpinCadastroRow[];
  estudios: EstudioSpinRow[];
  loading: boolean;
  perm: Permissoes;
  onRecarregar: () => void;
}) {
  const { theme: t } = useApp();
  const dashBrand = useDashboardBrand();
  const [buscaMesa, setBuscaMesa] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<MesaSpinCadastroRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MesaSpinCadastroRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [sortMesa, setSortMesa] = useState<{ col: MesaSortCol; dir: SortDir }>({ col: "tipo", dir: "asc" });

  const rowsPorOperadora = useMemo(
    () => rows.filter((r) => mesaNoFiltroOperadora(r, filtroOperadora, estudios)),
    [rows, filtroOperadora, estudios],
  );

  const rowsFiltradas = useMemo(() => {
    const q = buscaMesa.trim().toLowerCase();
    if (!q) return rowsPorOperadora;
    return rowsPorOperadora.filter((r) => {
      const nome = (r.nome_mesa ?? "").toLowerCase();
      const idSpin = (r.mesa_identificacao ?? "").toLowerCase();
      const numero = (r.numero_mesa ?? "").toLowerCase();
      const estudio = (nomeEstudioJoin(r) ?? "").toLowerCase();
      return nome.includes(q) || idSpin.includes(q) || numero.includes(q) || estudio.includes(q);
    });
  }, [rowsPorOperadora, buscaMesa]);

  const contagemPorJogo = useMemo(() => {
    const map = new Map<string, number>(KPI_TIPOS_JOGO_MESAS.map((k) => [k.label, 0]));
    for (const r of rowsPorOperadora) {
      const tipo = (r.tipo_jogo ?? "").trim();
      if (map.has(tipo)) map.set(tipo, (map.get(tipo) ?? 0) + 1);
    }
    return map;
  }, [rowsPorOperadora]);

  const rowsOrdenadas = useMemo(() => {
    const arr = [...rowsFiltradas];
    const { col, dir } = sortMesa;
    const nomeEst = (r: MesaSpinCadastroRow) => (nomeEstudioJoin(r) ?? "").toLowerCase();
    arr.sort((a, b) => {
      let c = 0;
      switch (col) {
        case "estudio":
          c = compareLocaleTexto(nomeEst(a), nomeEst(b), dir);
          break;
        case "nome":
          c = compareLocaleTexto((a.nome_mesa ?? "").trim(), (b.nome_mesa ?? "").trim(), dir);
          break;
        case "tipo":
          c = compareLocaleTexto((a.tipo_jogo ?? "").trim(), (b.tipo_jogo ?? "").trim(), dir);
          break;
        case "numero":
          c = compareLocaleTexto((a.numero_mesa ?? "").trim(), (b.numero_mesa ?? "").trim(), dir);
          break;
        case "ident":
          c = compareLocaleTexto((a.mesa_identificacao ?? "").trim(), (b.mesa_identificacao ?? "").trim(), dir);
          break;
        default:
          c = 0;
      }
      if (c !== 0) return c;
      return compareLocaleTexto((a.nome_mesa ?? "").trim(), (b.nome_mesa ?? "").trim(), "asc");
    });
    return arr;
  }, [rowsFiltradas, sortMesa]);

  const dataTable = useDataTableBlock();
  const contentBox = getPageContentBoxStyle(dashBrand, t);

  return (
    <>
      <div className="app-grid-kpi-4" style={getPageKpiSectionGapStyle()}>
        {KPI_TIPOS_JOGO_MESAS.map((k) => (
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
              {loading ? "—" : (contagemPorJogo.get(k.label) ?? 0)}
            </div>
          </div>
        ))}
      </div>

      <div style={contentBox}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          <SectionTitle compact>Mesas</SectionTitle>
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
              value={buscaMesa}
              onChange={setBuscaMesa}
              placeholder={PAGE_SEARCH.mesaNomeOuId}
              aria-label="Buscar por nome da mesa, estúdio, ID Spin ou número da mesa"
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
                Nova Mesa
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
        ) : rowsFiltradas.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
            {rows.length === 0
              ? "Nenhuma mesa cadastrada."
              : buscaMesa.trim()
                ? "Nenhuma mesa encontrada."
                : filtroOperadora !== OPERADORA_FILTRO_TODAS_VALUE
                  ? "Nenhuma mesa para o filtro selecionado."
                  : "Nenhuma mesa cadastrada."}
          </div>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle()}>
              <caption style={{ display: "none" }}>Cadastro de mesas por estúdio</caption>
              <thead>
                <tr>
                  <SortTableTh<MesaSortCol>
                    label="Nome do Estúdio"
                    col="estudio"
                    sortCol={sortMesa.col}
                    sortDir={sortMesa.dir}
                    thStyle={dataTable.thHeader}
                    align="center"
                    onSort={(c) =>
                      setSortMesa((s) => ({
                        col: c,
                        dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                      }))
                    }
                  />
                  <SortTableTh<MesaSortCol>
                    label="Nome da mesa"
                    col="nome"
                    sortCol={sortMesa.col}
                    sortDir={sortMesa.dir}
                    thStyle={dataTable.thHeader}
                    align="center"
                    onSort={(c) =>
                      setSortMesa((s) => ({
                        col: c,
                        dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                      }))
                    }
                  />
                  <SortTableTh<MesaSortCol>
                    label="Jogo"
                    col="tipo"
                    sortCol={sortMesa.col}
                    sortDir={sortMesa.dir}
                    thStyle={dataTable.thHeader}
                    align="center"
                    onSort={(col) =>
                      setSortMesa((s) => ({
                        col,
                        dir: s.col === col && s.dir === "desc" ? "asc" : "desc",
                      }))
                    }
                  />
                  <SortTableTh<MesaSortCol>
                    label="Nº mesa"
                    col="numero"
                    sortCol={sortMesa.col}
                    sortDir={sortMesa.dir}
                    thStyle={dataTable.thHeader}
                    align="center"
                    onSort={(c) =>
                      setSortMesa((s) => ({
                        col: c,
                        dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                      }))
                    }
                  />
                  <SortTableTh<MesaSortCol>
                    label="ID Spin"
                    col="ident"
                    sortCol={sortMesa.col}
                    sortDir={sortMesa.dir}
                    thStyle={dataTable.thHeader}
                    align="center"
                    onSort={(c) =>
                      setSortMesa((s) => ({
                        col: c,
                        dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                      }))
                    }
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
                  const estudioNome = nomeEstudioJoin(r);
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
                      <td style={dataTable.tdCenter} title={r.estudio_slug ?? undefined}>
                        {estudioNome ?? "—"}
                      </td>
                      <td style={{ ...dataTable.tdCenter, fontWeight: 600 }}>{r.nome_mesa}</td>
                      <td style={dataTable.tdCenter}>{r.tipo_jogo}</td>
                      <td style={dataTable.tdCenter}>{r.numero_mesa?.trim() ? r.numero_mesa : "—"}</td>
                      <td
                        style={{
                          ...dataTable.tdCenter,
                          maxWidth: 160,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontFamily: "monospace",
                          fontSize: 12,
                        }}
                        title={r.mesa_identificacao}
                      >
                        {r.mesa_identificacao}
                      </td>
                      {(perm.canEditarOk || perm.canExcluirOk) && (
                        <td style={dataTable.tdCenter}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                            {perm.canEditarOk && (
                              <button
                                type="button"
                                aria-label={`Editar mesa ${r.nome_mesa}`}
                                title={`Editar mesa ${r.nome_mesa}`}
                                onClick={() => {
                                  setEditando(r);
                                  setModalOpen(true);
                                }}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: 32,
                                  height: 32,
                                  background: "transparent",
                                  border: `1px solid ${t.cardBorder}`,
                                  borderRadius: 10,
                                  cursor: "pointer",
                                  color: t.text,
                                }}
                              >
                                <Pencil size={14} aria-hidden="true" />
                              </button>
                            )}
                            {perm.canExcluirOk && (
                              <BtnExcluirLinha
                                descricaoItem={descricaoBotaoExcluir("mesa", r.nome_mesa)}
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
        <ModalMesa
          key={editando?.id ?? "nova"}
          editando={editando}
          estudios={estudios}
          onClose={() => setModalOpen(false)}
          onSalvo={onRecarregar}
        />
      )}

      {deleteTarget && (
        <ModalConfirmExcluirPadrao
          zIndex={1100}
          descricaoItem={descricaoModalExcluirItem(
            "a mesa",
            deleteTarget.nome_mesa,
            `(ID Spin: ${deleteTarget.mesa_identificacao})`,
          )}
          onCancel={() => {
            if (!deleteLoading) setDeleteTarget(null);
          }}
          onConfirm={async () => {
            setDeleteError(null);
            setDeleteLoading(true);
            const { error } = await supabase.from("mesas_spin_cadastro").delete().eq("id", deleteTarget.id);
            setDeleteLoading(false);
            if (error) {
              console.error(error);
              setDeleteError(ERRO_EXCLUIR_MESA);
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
