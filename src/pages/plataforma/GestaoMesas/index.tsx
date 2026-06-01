import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT, FONT_TITLE, BRAND_SEMANTIC as BRAND } from "../../../constants/theme";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles";
import { Pencil, Trash2, Loader2, AlertCircle, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import SectionTitle from "../../../components/dashboard/SectionTitle";
import { SortTableTh, type SortDir } from "../../../components/dashboard";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { ModalBase, ModalHeader, ModalConfirmDelete } from "../../../components/OperacoesModal";
import { compareLocaleTexto } from "../../../lib/classificacaoSort";
import { GAME_IDENTITY_HEX, GAME_IDENTITY_LABEL } from "../../../lib/gameIdentityColors";
import type { Role } from "../../../types";
import { ROLES_STAFF_OPERACOES_LIVES } from "../../../lib/staffRoles";
import { GestaoUsuariosLoading, SalvarCtaContent } from "../GestaoUsuarios/gestaoUsuariosUi";
import { ctaGradientSalvar } from "../GestaoUsuarios/gestaoUsuariosHelpers";
import {
  getPageContentBoxStyle,
  getPageFilterBoxStyle,
  getPageKpiSectionGapStyle,
} from "../../../lib/pageContentBoxStyles";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { getFilterBarRowStyle, getFiltroBarTabButtonStyle } from "../../../lib/filterBarStyles";
import {
  OPERADORA_FILTRO_TODAS_LABEL,
  OPERADORA_FILTRO_TODAS_VALUE,
} from "../../../components/FiltroOperadoraSelect";

const MSG_SEM_PERMISSAO = "Você não tem permissão para visualizar esta página.";
const ERRO_EXCLUIR_MESA = "Não foi possível excluir a mesa. Verifique se não há registros vinculados.";
const ERRO_SALVAR_MESA = "Não foi possível salvar a mesa. Verifique os dados e tente novamente.";
const ERRO_MESA_DUPLICADA =
  "Já existe uma mesa com este ID Spin ou ID da operadora para esta operadora.";

const TIPOS_JOGO = ["Blackjack", "Roleta", "Baccarat", "Futebol Brasileiro", "Poker", "Outro"] as const;

const KPI_TIPOS_JOGO_MESAS = (
  ["baccarat", "blackjack", "roleta", "futebol_brasileiro"] as const
).map((key) => ({
  label: GAME_IDENTITY_LABEL[key],
  cor: GAME_IDENTITY_HEX[key],
}));

function tableRowHoverBg(isDark: boolean): string {
  return isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
}

type MesaSpinCadastroRow = {
  id: string;
  operadora_slug: string;
  nome_mesa: string;
  tipo_jogo: string;
  numero_mesa: string | null;
  mesa_identificacao: string;
  mesa_identificacao_operadora: string | null;
  created_at: string;
  updated_at: string;
  /** PostgREST pode devolver objeto ou array de 1 elemento conforme hint da FK. */
  operadoras: { nome: string } | { nome: string }[] | null;
};

function nomeOperadoraJoin(row: MesaSpinCadastroRow): string | undefined {
  const o = row.operadoras;
  if (o == null) return undefined;
  if (Array.isArray(o)) return o[0]?.nome;
  return o.nome;
}

export default function GestaoMesas() {
  const { theme: t } = useApp();
  const dashBrand = useDashboardBrand();
  const perm = usePermission("gestao_mesas");
  const [rows, setRows] = useState<MesaSpinCadastroRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<MesaSpinCadastroRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MesaSpinCadastroRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [filtroOperadora, setFiltroOperadora] = useState<string>(OPERADORA_FILTRO_TODAS_VALUE);
  type MesaSortCol = "operadora" | "nome" | "tipo" | "numero" | "ident" | "identOp";
  const [sortMesa, setSortMesa] = useState<{ col: MesaSortCol; dir: SortDir }>({ col: "tipo", dir: "asc" });

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("mesas_spin_cadastro")
      .select("id, operadora_slug, nome_mesa, tipo_jogo, numero_mesa, mesa_identificacao, mesa_identificacao_operadora, created_at, updated_at, operadoras(nome)")
      .order("operadora_slug", { ascending: true })
      .order("nome_mesa", { ascending: true });
    if (error) {
      setRows([]);
    } else {
      setRows((data ?? []) as unknown as MesaSpinCadastroRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const operadorasOpcoes = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) {
      const nome = nomeOperadoraJoin(r) ?? r.operadora_slug;
      m.set(r.operadora_slug, nome);
    }
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [rows]);

  /** Carrossel: «Todas Operadoras» sempre na primeira posição (default). */
  const operadorasCarrossel = useMemo(
    () => [
      { slug: OPERADORA_FILTRO_TODAS_VALUE, nome: OPERADORA_FILTRO_TODAS_LABEL },
      ...operadorasOpcoes.map(([slug, nome]) => ({ slug, nome })),
    ],
    [operadorasOpcoes],
  );

  const rowsFiltradas = useMemo(() => {
    let out = rows;
    if (filtroOperadora !== OPERADORA_FILTRO_TODAS_VALUE) {
      out = out.filter((r) => r.operadora_slug === filtroOperadora);
    }
    return out;
  }, [rows, filtroOperadora]);

  const contagemPorJogo = useMemo(() => {
    const map = new Map<string, number>(
      KPI_TIPOS_JOGO_MESAS.map((k) => [k.label, 0]),
    );
    for (const r of rowsFiltradas) {
      const tipo = (r.tipo_jogo ?? "").trim();
      if (map.has(tipo)) map.set(tipo, (map.get(tipo) ?? 0) + 1);
    }
    return map;
  }, [rowsFiltradas]);

  const labelCarrosselOperadora = useMemo(() => {
    return (
      operadorasCarrossel.find((o) => o.slug === filtroOperadora)?.nome ?? OPERADORA_FILTRO_TODAS_LABEL
    );
  }, [filtroOperadora, operadorasCarrossel]);

  const indiceCarrosselOperadora = useMemo(() => {
    const idx = operadorasCarrossel.findIndex((o) => o.slug === filtroOperadora);
    return idx >= 0 ? idx : 0;
  }, [filtroOperadora, operadorasCarrossel]);

  useEffect(() => {
    if (!operadorasCarrossel.some((o) => o.slug === filtroOperadora)) {
      setFiltroOperadora(OPERADORA_FILTRO_TODAS_VALUE);
    }
  }, [operadorasCarrossel, filtroOperadora]);

  const avancarOperadoraCarrossel = useCallback(() => {
    if (operadorasCarrossel.length <= 1) return;
    const next = operadorasCarrossel[(indiceCarrosselOperadora + 1) % operadorasCarrossel.length]!;
    setFiltroOperadora(next.slug);
  }, [indiceCarrosselOperadora, operadorasCarrossel]);

  const retrocederOperadoraCarrossel = useCallback(() => {
    if (operadorasCarrossel.length <= 1) return;
    const prev =
      operadorasCarrossel[
        (indiceCarrosselOperadora - 1 + operadorasCarrossel.length) % operadorasCarrossel.length
      ]!;
    setFiltroOperadora(prev.slug);
  }, [indiceCarrosselOperadora, operadorasCarrossel]);

  const rowsOrdenadas = useMemo(() => {
    const arr = [...rowsFiltradas];
    const { col, dir } = sortMesa;
    const nomeOp = (r: MesaSpinCadastroRow) => (nomeOperadoraJoin(r) ?? r.operadora_slug ?? "").toLowerCase();
    arr.sort((a, b) => {
      let c = 0;
      switch (col) {
        case "operadora":
          c = compareLocaleTexto(nomeOp(a), nomeOp(b), dir);
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
        case "identOp":
          c = compareLocaleTexto(
            (a.mesa_identificacao_operadora ?? "").trim(),
            (b.mesa_identificacao_operadora ?? "").trim(),
            dir,
          );
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

  if (perm.loading) {
    return (
      <div className="app-page-shell">
        <GestaoUsuariosLoading />
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ fontFamily: FONT.body, color: t.textMuted, textAlign: "center", padding: 24 }}>
        {MSG_SEM_PERMISSAO}
      </div>
    );
  }

  const contentBox = getPageContentBoxStyle(dashBrand, t);
  const todasOperadorasAtivo = filtroOperadora === OPERADORA_FILTRO_TODAS_VALUE;
  const carrosselOperadoraDesabilitado = operadorasCarrossel.length <= 1;

  return (
    <div className="app-page-shell">
      <PageHeader
        icon={<PageMenuIcon pageKey="gestao_mesas" />}
        title={getPageMenuLabel("gestao_mesas")}
        subtitle="Cadastre e gerencie as mesas disponíveis por operadora."
      />

      <div style={getPageFilterBoxStyle(dashBrand, t)}>
        <div style={getFilterBarRowStyle({ width: "100%" })}>
          <button
            type="button"
            aria-label="Operadora anterior"
            disabled={carrosselOperadoraDesabilitado}
            onClick={retrocederOperadoraCarrossel}
            style={getCarouselBtnNavStyle(t, carrosselOperadoraDesabilitado)}
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
          <span style={getCarouselPeriodLabelStyle(t, { minWidth: 160 })}>
            {labelCarrosselOperadora}
          </span>
          <button
            type="button"
            aria-label="Próxima operadora"
            disabled={carrosselOperadoraDesabilitado}
            onClick={avancarOperadoraCarrossel}
            style={getCarouselBtnNavStyle(t, carrosselOperadoraDesabilitado)}
          >
            <ChevronRight size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-pressed={todasOperadorasAtivo}
            onClick={() => setFiltroOperadora(OPERADORA_FILTRO_TODAS_VALUE)}
            style={{
              ...getFiltroBarTabButtonStyle(t, dashBrand, todasOperadorasAtivo),
              fontFamily: FONT.body,
              transition: "all 0.15s",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Shield size={16} strokeWidth={2} aria-hidden="true" />
            {OPERADORA_FILTRO_TODAS_LABEL}
          </button>
        </div>
      </div>

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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <SectionTitle compact>Mesas</SectionTitle>
          {perm.canCriarOk ? (
            <CtaCriarButton
              type="button"
              onClick={() => {
                setEditando(null);
                setModalOpen(true);
              }}
            >
              Nova Mesa
            </CtaCriarButton>
          ) : null}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: t.textMuted, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <Loader2 size={20} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
            <span>Carregando…</span>
          </div>
        ) : rowsFiltradas.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>
            {rows.length === 0
              ? "Nenhuma mesa cadastrada."
              : filtroOperadora !== OPERADORA_FILTRO_TODAS_VALUE
                ? "Nenhuma mesa para o filtro selecionado."
                : "Nenhuma mesa cadastrada."}
          </div>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle()}>
              <caption style={{ display: "none" }}>Cadastro de mesas por operadora</caption>
              <thead>
                <tr>
                  <SortTableTh<MesaSortCol>
                    label="Operadora"
                    col="operadora"
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
                  <SortTableTh<MesaSortCol>
                    label="ID operadora"
                    col="identOp"
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
                    <td style={dataTable.tdCenter} title={r.operadora_slug}>
                      {nomeOperadoraJoin(r) ?? r.operadora_slug}
                    </td>
                    <td style={{ ...dataTable.tdCenter, fontWeight: 600 }}>{r.nome_mesa}</td>
                    <td style={dataTable.tdCenter}>{r.tipo_jogo}</td>
                    <td style={dataTable.tdCenter}>
                      {r.numero_mesa?.trim() ? r.numero_mesa : "—"}
                    </td>
                    <td style={{ ...dataTable.tdCenter, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", fontFamily: "monospace", fontSize: 12 }} title={r.mesa_identificacao}>
                      {r.mesa_identificacao}
                    </td>
                    <td style={{ ...dataTable.tdCenter, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", fontFamily: "monospace", fontSize: 12 }} title={r.mesa_identificacao_operadora ?? undefined}>
                      {r.mesa_identificacao_operadora?.trim() ? r.mesa_identificacao_operadora : "—"}
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
                            <button
                              type="button"
                              aria-label={`Excluir mesa ${r.nome_mesa}`}
                              title={`Excluir mesa ${r.nome_mesa}`}
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteTarget(r);
                              }}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 32,
                                height: 32,
                                background: "transparent",
                                border: `1px solid rgba(232,64,37,0.35)`,
                                borderRadius: 10,
                                cursor: "pointer",
                                color: BRAND.vermelho,
                              }}
                            >
                              <Trash2 size={14} aria-hidden="true" />
                            </button>
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
          onClose={() => setModalOpen(false)}
          onSalvo={() => {
            void carregar();
          }}
        />
      )}

      {deleteTarget && (
        <ModalConfirmDelete
          zIndex={1100}
          texto={`Remover a mesa «${deleteTarget.nome_mesa}» (ID Spin: ${deleteTarget.mesa_identificacao})? Esta ação não pode ser desfeita.`}
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
            void carregar();
          }}
          loading={deleteLoading}
          error={deleteError}
        />
      )}
    </div>
  );
}

function tipoJogoInitial(edit: MesaSpinCadastroRow | null): { preset: string; outro: string } {
  if (!edit?.tipo_jogo) return { preset: "Blackjack", outro: "" };
  const tj = edit.tipo_jogo.trim();
  if ((TIPOS_JOGO as readonly string[]).includes(tj)) return { preset: tj, outro: "" };
  return { preset: "Outro", outro: tj };
}

function ModalMesa({
  editando,
  onClose,
  onSalvo,
}: {
  editando: MesaSpinCadastroRow | null;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const { theme: t, user } = useApp();
  const dashBrand = useDashboardBrand();
  const userRole = user?.role ?? null;
  const baseId = useId();
  const ini = tipoJogoInitial(editando);
  const [operadoras, setOperadoras] = useState<{ slug: string; nome: string }[]>([]);
  const [operadoraSlug, setOperadoraSlug] = useState(editando?.operadora_slug ?? "");
  const [nomeMesa, setNomeMesa] = useState(editando?.nome_mesa ?? "");
  const [tipoJogo, setTipoJogo] = useState(ini.preset);
  const [tipoJogoOutro, setTipoJogoOutro] = useState(ini.outro);
  const [numeroMesa, setNumeroMesa] = useState(editando?.numero_mesa ?? "");
  const [mesaIdentificacao, setMesaIdentificacao] = useState(editando?.mesa_identificacao ?? "");
  const [mesaIdentificacaoOperadora, setMesaIdentificacaoOperadora] = useState(
    editando?.mesa_identificacao_operadora ?? "",
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void supabase
      .from("operadoras")
      .select("slug, nome")
      .order("nome")
      .then(({ data }) => {
        if (!cancelled) setOperadoras(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tipoJogoEfetivo = tipoJogo === "Outro" ? tipoJogoOutro.trim() : tipoJogo;

  const salvar = async () => {
    setErro(null);
    if (!operadoraSlug.trim()) {
      setErro("Selecione a operadora.");
      return;
    }
    if (!nomeMesa.trim()) {
      setErro("Informe o nome da mesa.");
      return;
    }
    if (!tipoJogoEfetivo) {
      setErro("Informe o tipo de jogo.");
      return;
    }
    if (!numeroMesa.trim()) {
      setErro("Informe o número da mesa.");
      return;
    }
    if (!mesaIdentificacao.trim()) {
      setErro("Informe o ID interno Spin da mesa.");
      return;
    }
    if (!mesaIdentificacaoOperadora.trim()) {
      setErro("Informe o ID da mesa no catálogo da operadora.");
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        operadora_slug: operadoraSlug.trim(),
        nome_mesa: nomeMesa.trim(),
        tipo_jogo: tipoJogoEfetivo,
        numero_mesa: numeroMesa.trim(),
        mesa_identificacao: mesaIdentificacao.trim(),
        mesa_identificacao_operadora: mesaIdentificacaoOperadora.trim(),
      };
      if (editando) {
        const { error } = await supabase.from("mesas_spin_cadastro").update(payload).eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("mesas_spin_cadastro").insert(payload);
        if (error) throw error;
      }
      onSalvo();
      onClose();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "";
      if (msg.includes("duplicate") || msg.includes("ux_mesas")) {
        setErro(ERRO_MESA_DUPLICADA);
      } else {
        console.error(e);
        setErro(ERRO_SALVAR_MESA);
      }
    } finally {
      setSalvando(false);
    }
  };

  const tryClose = () => {
    if (!salvando) onClose();
  };

  const desabilitaOperadora =
    Boolean(editando) && (!userRole || !ROLES_STAFF_OPERACOES_LIVES.includes(userRole as Role));

  return (
    <ModalBase maxWidth={480} onClose={tryClose}>
      <ModalHeader title={editando ? "Editar mesa" : "Nova mesa"} onClose={tryClose} />
      {erro && (
        <div
          role="alert"
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            marginBottom: 12,
            background: "rgba(232,64,37,0.12)",
            border: "1px solid rgba(232,64,37,0.35)",
            color: "#e84025",
            fontSize: 13,
            fontFamily: FONT.body,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertCircle size={14} color="#e84025" aria-hidden />
          {erro}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label htmlFor={`${baseId}-op`} style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>
            Operadora
            <CampoObrigatorioMark />
          </label>
          <select
            id={`${baseId}-op`}
            aria-label="Operadora (obrigatório)"
            value={operadoraSlug}
            disabled={desabilitaOperadora}
            onChange={(e) => setOperadoraSlug(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: desabilitaOperadora ? t.cardBg : t.inputBg,
              color: t.text,
              fontFamily: FONT.body,
              fontSize: 13,
            }}
          >
            <option value="">Selecione…</option>
            {operadoras.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${baseId}-nome`} style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>
            Nome da mesa
            <CampoObrigatorioMark />
          </label>
          <input
            id={`${baseId}-nome`}
            type="text"
            value={nomeMesa}
            onChange={(e) => setNomeMesa(e.target.value)}
            placeholder="Ex.: Blackjack VIP"
            aria-label="Nome da mesa (obrigatório)"
            autoComplete="off"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg,
              color: t.text,
              fontFamily: FONT.body,
              fontSize: 13,
            }}
          />
        </div>
        <div>
          <label htmlFor={`${baseId}-tipo`} style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>
            Tipo de jogo
            <CampoObrigatorioMark />
          </label>
          <select
            id={`${baseId}-tipo`}
            aria-label="Tipo de jogo (obrigatório)"
            value={(TIPOS_JOGO as readonly string[]).includes(tipoJogo) ? tipoJogo : "Outro"}
            onChange={(e) => setTipoJogo(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg,
              color: t.text,
              fontFamily: FONT.body,
              fontSize: 13,
            }}
          >
            {TIPOS_JOGO.map((tj) => (
              <option key={tj} value={tj}>
                {tj}
              </option>
            ))}
          </select>
          {tipoJogo === "Outro" && (
            <>
              <label htmlFor={`${baseId}-tipo-outro`} style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted, marginTop: 10, marginBottom: 6 }}>
                Especificar tipo
                <CampoObrigatorioMark />
              </label>
              <input
                id={`${baseId}-tipo-outro`}
                type="text"
                value={tipoJogoOutro}
                onChange={(e) => {
                  setTipoJogoOutro(e.target.value);
                }}
                placeholder="Descreva o tipo de jogo"
                aria-label="Especificar tipo de jogo (obrigatório)"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  color: t.text,
                  fontFamily: FONT.body,
                  fontSize: 13,
                }}
              />
            </>
          )}
        </div>
        <div>
          <label htmlFor={`${baseId}-num`} style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>
            Número da mesa
            <CampoObrigatorioMark />
          </label>
          <input
            id={`${baseId}-num`}
            type="text"
            value={numeroMesa}
            onChange={(e) => setNumeroMesa(e.target.value)}
            placeholder="Ex.: 01"
            aria-label="Número da mesa (obrigatório)"
            autoComplete="off"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg,
              color: t.text,
              fontFamily: FONT.body,
              fontSize: 13,
            }}
          />
        </div>
        <div>
          <label htmlFor={`${baseId}-id`} style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>
            ID interno Spin
            <CampoObrigatorioMark />
          </label>
          <input
            id={`${baseId}-id`}
            type="text"
            value={mesaIdentificacao}
            onChange={(e) => setMesaIdentificacao(e.target.value)}
            disabled={Boolean(editando)}
            placeholder="Identificador Spin (estúdio)"
            aria-label="ID interno Spin (obrigatório)"
            autoComplete="off"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: editando ? t.cardBg : t.inputBg,
              color: t.text,
              fontFamily: FONT.body,
              fontSize: 13,
            }}
          />
          {editando && (
            <p style={{ margin: "8px 0 0", fontSize: 11, color: t.textMuted, fontFamily: FONT.body, lineHeight: 1.4 }}>
              O ID Spin não pode ser alterado. Exclua e crie novamente se estiver incorreto.
            </p>
          )}
        </div>
        <div>
          <label htmlFor={`${baseId}-id-op`} style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>
            ID na operadora
            <CampoObrigatorioMark />
          </label>
          <input
            id={`${baseId}-id-op`}
            type="text"
            value={mesaIdentificacaoOperadora}
            onChange={(e) => setMesaIdentificacaoOperadora(e.target.value)}
            placeholder="Ex.: 500617 (game id na Blaze)"
            aria-label="ID da mesa no catálogo da operadora (obrigatório)"
            autoComplete="off"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg,
              color: t.text,
              fontFamily: FONT.body,
              fontSize: 13,
            }}
          />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
        <button
          type="button"
          onClick={tryClose}
          disabled={salvando}
          style={{
            padding: "9px 18px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: "transparent",
            color: t.text,
            fontFamily: FONT.body,
            fontSize: 13,
            fontWeight: 600,
            cursor: salvando ? "not-allowed" : "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void salvar()}
          disabled={salvando}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 20px",
            borderRadius: 10,
            border: "none",
            background: ctaGradientSalvar(dashBrand, salvando, BRAND.cinza),
            color: "#fff",
            fontFamily: FONT.body,
            fontSize: 13,
            fontWeight: 700,
            cursor: salvando ? "not-allowed" : "pointer",
            opacity: salvando ? 0.85 : 1,
          }}
        >
          <SalvarCtaContent salvando={salvando} label={editando ? "Salvar" : "Cadastrar"} labelSalvando="Salvando…" />
        </button>
      </div>
    </ModalBase>
  );
}
