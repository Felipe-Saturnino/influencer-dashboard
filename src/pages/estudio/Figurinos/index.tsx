import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, FileText, HandHelping, History, Loader2, Package, ScanLine, Trash2, Wrench, XCircle } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { baixarEtiquetaFigurinoPdf } from "../../../lib/rhFigurinoEtiquetaPdf";
import { buscarRhFuncionarioIdsPorEmailLogin } from "../../../lib/rhFuncionarioLoginMatch";
import { primeiroUltimoNome } from "../../../lib/rhGamePresenterDealerSync";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { FILTER_SEARCH_STAFF, PAGE_SEARCH } from "../../../lib/searchBarConstants";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import {
  FiltroFigurinosCategoriaSelect,
  FiltroFigurinosTamanhoSelect,
  FiltroBarTabButton,
  FiltroOperadoraSelect,
  SortTableTh,
  type SortDir,
} from "../../../components/dashboard";
import { FILTRO_BAR_TAB_ICON_PROPS, onFiltroBarTabsKeyDown } from "../../../lib/filterBarStyles";
import { getPageFilterBoxStyle, getPageKpiSectionGapStyle } from "../../../lib/pageContentBoxStyles";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { compareCondicaoPeca, compareLocaleTexto } from "../../../lib/classificacaoSort";
import type { Operadora } from "../../../types";
import type { RhFuncionario } from "../../../types/rhFuncionario";
import type {
  RhFigurinoCondition,
  RhFigurinoEmprestimo,
  RhFigurinoPeca,
  RhFigurinoStatus,
  RhFigurinoStatusHist,
  RhWithdrawalType,
} from "./types";
import { BarcodeBlock } from "./BarcodeBlock";
import { ScannerPanel } from "./ScannerPanel";

import {
  CATEGORIAS,
  TAMANHOS,
  emptyMsgAba,
  labelAba,
  labelStatusHistorico,
  labelStatusPeca,
  labelTipoRetirada,
  TIPOS_MANUTENCAO,
  type RhFigurinoTipoManutencao,
} from "./figurinosConstants";

type Aba = RhFigurinoStatus;

const FIGURINOS_ABAS: Aba[] = ["available", "borrowed", "maintenance", "discarded"];

const FIGURINOS_TAB_ICONS: Record<Aba, ReactNode> = {
  available: <Package {...FILTRO_BAR_TAB_ICON_PROPS} />,
  borrowed: <HandHelping {...FILTRO_BAR_TAB_ICON_PROPS} />,
  maintenance: <Wrench {...FILTRO_BAR_TAB_ICON_PROPS} />,
  discarded: <Trash2 {...FILTRO_BAR_TAB_ICON_PROPS} />,
};

function tableRowHoverBg(isDark: boolean): string {
  return isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)";
}

function ctaButtonContent(loading: boolean, idle: ReactNode, busy: string): ReactNode {
  if (!loading) return idle;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <Loader2 size={14} className="app-lucide-spin" color="#fff" aria-hidden />
      {busy}
    </span>
  );
}

/** Alinha nome do perfil com o texto gravado em «Emprestado para» / retirada (borrower_name). */
function normNomeParaFiltroPrestadorFig(s: string | null | undefined): string {
  return (s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Nome exibido na coluna «Emprestado para» — primeiro e último token. */
function labelEmprestadoParaTabela(emp: RhFigurinoEmprestimo | undefined): string {
  const nome = (emp?.borrower_name ?? "").trim();
  if (!nome) return "—";
  return primeiroUltimoNome(nome) || "—";
}

/** Retirada via Gestão de Prestadores grava `borrower_ref` = id de `rh_funcionarios`; login casa por e-mail como em Dados de Cadastro. */
function emprestimoFigurinoEhDoProprioLogin(
  emp: RhFigurinoEmprestimo | undefined,
  rhPrestadorIds: Set<string>,
  nomePerfilNorm: string,
): boolean {
  if (!emp) return false;
  const ref = (emp.borrower_ref ?? "").trim();
  if (ref.length > 0 && rhPrestadorIds.has(ref)) return true;
  const nb = normNomeParaFiltroPrestadorFig(emp.borrower_name);
  return nb.length > 0 && nomePerfilNorm.length > 0 && nb === nomePerfilNorm;
}

function fmtDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function fmtDataSóDia(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

function labelCondicaoPeca(c: RhFigurinoCondition): string {
  if (c === "good") return "Boa";
  if (c === "damaged") return "Avariada";
  return "Limpeza";
}

function actorLabel(user: { name: string; email: string } | null): string {
  if (!user) return "—";
  return (user.name || "").trim() || user.email;
}

function pecaSlugsOperadoras(p: RhFigurinoPeca): string[] {
  const r = p.rh_figurino_peca_operadoras;
  if (!r || !Array.isArray(r)) return [];
  return [...new Set(r.map((x) => x.operadora_slug))];
}

function labelOperadorasPeca(p: RhFigurinoPeca, slugParaNome: (slug: string) => string): string {
  const slugs = pecaSlugsOperadoras(p);
  if (slugs.length === 0) return "—";
  return slugs.map(slugParaNome).join(" · ");
}

function BlocoResumoPecaBasico({
  peca,
  operadorasTexto,
  t,
}: {
  peca: RhFigurinoPeca;
  operadorasTexto: string;
  t: ReturnType<typeof useApp>["theme"];
}) {
  const row = (label: string, value: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderBottom: `1px solid ${t.cardBorder}` }}>
      <span style={{ color: t.textMuted, fontSize: 12 }}>{label}</span>
      <span style={{ color: t.text, fontSize: 13, fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 12,
        border: `1px solid ${t.cardBorder}`,
        marginBottom: 14,
        fontFamily: FONT.body,
      }}
    >
      {row("Código", peca.code)}
      {row("Operadora", operadorasTexto)}
      {row("Categoria", peca.category)}
      {row("Tamanho", peca.size)}
      {row("Data de aquisição", fmtDataSóDia(peca.purchase_date))}
      {row("Condição", labelCondicaoPeca(peca.condition))}
    </div>
  );
}

export default function FigurinosPage() {
  const { theme: t, user, podeVerOperadora } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const { operadoraSlugsForcado } = useDashboardFiltros();
  const perm = usePermission("rh_figurinos");

  const [rhPrestadorIdsLogin, setRhPrestadorIdsLogin] = useState<string[]>([]);
  const [loadingRhPrestadorMatch, setLoadingRhPrestadorMatch] = useState(false);

  const [pecas, setPecas] = useState<RhFigurinoPeca[]>([]);
  const [empPorItem, setEmpPorItem] = useState<Record<string, RhFigurinoEmprestimo>>({});
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState<Aba>("available");
  const [filtroOp, setFiltroOp] = useState<string>("todas");
  const [busca, setBusca] = useState("");
  const [filtroCat, setFiltroCat] = useState<string>("todas");
  const [filtroTam, setFiltroTam] = useState<string>("todas");
  type FigSortCol =
    | "codigo"
    | "operadora"
    | "categoria"
    | "tamanho"
    | "data_aqui"
    | "cond"
    | "tipo_ret"
    | "loaned_at"
    | "borrower"
    | "loaned_by"
    | "motivo"
    | "sent_at"
    | "entered_by"
    | "disc_motivo"
    | "disc_at"
    | "disc_by";
  const [sortFig, setSortFig] = useState<{ col: FigSortCol; dir: SortDir }>({ col: "codigo", dir: "asc" });

  useEffect(() => {
    setSortFig({ col: "codigo", dir: "asc" });
  }, [aba]);

  const [modalCadastro, setModalCadastro] = useState(false);
  const [modalScanner, setModalScanner] = useState(false);
  const [pecaNova, setPecaNova] = useState<RhFigurinoPeca | null>(null);
  const [detalhe, setDetalhe] = useState<RhFigurinoPeca | null>(null);
  const [histStatus, setHistStatus] = useState<RhFigurinoStatusHist[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);

  const [empPeca, setEmpPeca] = useState<RhFigurinoPeca | null>(null);
  const [devPeca, setDevPeca] = useState<RhFigurinoPeca | null>(null);
  const [avisoPeca, setAvisoPeca] = useState<RhFigurinoPeca | null>(null);

  const [manutPeca, setManutPeca] = useState<RhFigurinoPeca | null>(null);
  const [descPeca, setDescPeca] = useState<RhFigurinoPeca | null>(null);
  const [concluirManutPeca, setConcluirManutPeca] = useState<RhFigurinoPeca | null>(null);
  const [concluindoManut, setConcluindoManut] = useState(false);

  const [erroGlobal, setErroGlobal] = useState<string | null>(null);
  const [histErro, setHistErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErroGlobal(null);
    const selEmbed =
      user?.role === "operador" && operadoraSlugsForcado?.length
        ? "*, rh_figurino_peca_operadoras!inner(operadora_slug)"
        : "*, rh_figurino_peca_operadoras(operadora_slug)";
    let q = supabase.from("rh_figurino_pecas").select(selEmbed).order("created_at", { ascending: false });
    if (user?.role === "operador" && operadoraSlugsForcado?.length) {
      q = q.or(
        operadoraSlugsForcado.map((s) => `operadora_slug.eq.${s}`).join(","),
        { foreignTable: "rh_figurino_peca_operadoras" },
      );
    }
    const [pr, er, or] = await Promise.all([
      q,
      supabase.from("rh_figurino_emprestimos").select("*").eq("status", "active").limit(500),
      supabase.from("operadoras").select("slug, nome, brand_action").order("nome").eq("ativo", true),
    ]);
    if (pr.error) {
      console.error("[Figurinos] Erro ao carregar inventário:", pr.error);
      setErroGlobal("Não foi possível carregar o inventário. Se o problema persistir, contate o suporte.");
    }
    setPecas((pr.data ?? []) as RhFigurinoPeca[]);
    const emps = (er.data ?? []) as RhFigurinoEmprestimo[];
    const map: Record<string, RhFigurinoEmprestimo> = {};
    emps.forEach((e) => {
      map[e.item_id] = e;
    });
    setEmpPorItem(map);
    setOperadoras((or.data ?? []) as Operadora[]);
    setLoading(false);
  }, [user?.role, operadoraSlugsForcado]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (perm.canView !== "proprios" || !user?.email?.trim()) {
      setRhPrestadorIdsLogin([]);
      setLoadingRhPrestadorMatch(false);
      return;
    }
    let cancelled = false;
    setLoadingRhPrestadorMatch(true);
    void buscarRhFuncionarioIdsPorEmailLogin(user.email).then((ids) => {
      if (!cancelled) {
        setRhPrestadorIdsLogin(ids);
        setLoadingRhPrestadorMatch(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [perm.canView, user?.email]);

  useEffect(() => {
    if (user?.role === "operador" && operadoraSlugsForcado?.length === 1) {
      setFiltroOp(operadoraSlugsForcado[0]);
    }
  }, [user?.role, operadoraSlugsForcado]);

  const operadoraNome = useCallback(
    (slug: string) => operadoras.find((o) => o.slug === slug)?.nome ?? slug,
    [operadoras],
  );

  const operadorasVisiveis = useMemo(() => operadoras.filter((o) => podeVerOperadora(o.slug)), [operadoras, podeVerOperadora]);

  const passaFiltroBloco = useCallback(
    (p: RhFigurinoPeca) => {
      if (filtroOp !== "todas" && !pecaSlugsOperadoras(p).includes(filtroOp)) return false;
      if (filtroCat !== "todas" && p.category !== filtroCat) return false;
      if (filtroTam !== "todas" && p.size !== filtroTam) return false;
      return true;
    },
    [filtroOp, filtroCat, filtroTam],
  );

  const pecasComFiltroTopo = useMemo(() => pecas.filter(passaFiltroBloco), [pecas, passaFiltroBloco]);

  const rhPrestadorIdsSet = useMemo(() => new Set(rhPrestadorIdsLogin), [rhPrestadorIdsLogin]);
  const nomeUsuarioFigNorm = useMemo(() => normNomeParaFiltroPrestadorFig(user?.name), [user?.name]);

  /** Gestão de Usuários — permissão Figurinos «Próprios»: retiradas do próprio cadastro RH (`borrower_ref`) ou, em legado, nome igual ao perfil. */
  const pecasVisiveisPermissao = useMemo(() => {
    if (perm.loading || perm.canView !== "proprios") return pecasComFiltroTopo;
    return pecasComFiltroTopo.filter((p) =>
      emprestimoFigurinoEhDoProprioLogin(empPorItem[p.id], rhPrestadorIdsSet, nomeUsuarioFigNorm),
    );
  }, [pecasComFiltroTopo, perm.loading, perm.canView, empPorItem, rhPrestadorIdsSet, nomeUsuarioFigNorm]);

  const kpis = useMemo(() => {
    const tot = pecasVisiveisPermissao.length;
    const av = pecasVisiveisPermissao.filter((p) => p.status === "available").length;
    const emprestadas = pecasVisiveisPermissao.filter((p) => {
      if (p.status !== "borrowed") return false;
      const w = empPorItem[p.id]?.withdrawal_type ?? "emprestar";
      return w === "emprestar";
    }).length;
    const fixos = pecasVisiveisPermissao.filter((p) => {
      if (p.status !== "borrowed") return false;
      return empPorItem[p.id]?.withdrawal_type === "fixo";
    }).length;
    const ma = pecasVisiveisPermissao.filter((p) => p.status === "maintenance").length;
    return { tot, av, bo: emprestadas, fx: fixos, ma };
  }, [pecasVisiveisPermissao, empPorItem]);

  const buscaNorm = useMemo(
    () => busca.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, ""),
    [busca],
  );

  const pecasFiltradas = useMemo(() => {
    return pecasVisiveisPermissao.filter((p) => {
      if (p.status !== aba) return false;
      if (!buscaNorm) return true;
      const emp = empPorItem[p.id];
      const opNames = labelOperadorasPeca(p, operadoraNome);
      const hay = `${p.code} ${p.category} ${opNames} ${emp?.borrower_name ?? ""} ${emp?.borrower_ref ?? ""} ${labelTipoRetirada(emp?.withdrawal_type)}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "");
      return hay.includes(buscaNorm);
    });
  }, [pecasVisiveisPermissao, aba, buscaNorm, empPorItem, operadoraNome]);

  const pecasOrdenadas = useMemo(() => {
    const arr = [...pecasFiltradas];
    const { col, dir } = sortFig;
    const borrowerKey = (p: RhFigurinoPeca) => labelEmprestadoParaTabela(empPorItem[p.id]);
    arr.sort((a, b) => {
      let c = 0;
      switch (col) {
        case "codigo":
          c = compareLocaleTexto(a.code, b.code, dir);
          break;
        case "operadora":
          c = compareLocaleTexto(
            labelOperadorasPeca(a, operadoraNome).toLowerCase(),
            labelOperadorasPeca(b, operadoraNome).toLowerCase(),
            dir,
          );
          break;
        case "categoria":
          c = compareLocaleTexto(a.category, b.category, dir);
          break;
        case "tamanho":
          c = compareLocaleTexto(a.size, b.size, dir);
          break;
        case "data_aqui":
          c = compareLocaleTexto(a.purchase_date ?? "", b.purchase_date ?? "", dir);
          break;
        case "cond":
          c = compareCondicaoPeca(a.condition, b.condition, dir);
          break;
        case "tipo_ret":
          c = compareLocaleTexto(
            labelTipoRetirada(empPorItem[a.id]?.withdrawal_type),
            labelTipoRetirada(empPorItem[b.id]?.withdrawal_type),
            dir,
          );
          break;
        case "loaned_at":
          c = compareLocaleTexto(empPorItem[a.id]?.loaned_at ?? "", empPorItem[b.id]?.loaned_at ?? "", dir);
          break;
        case "borrower":
          c = compareLocaleTexto(borrowerKey(a), borrowerKey(b), dir);
          break;
        case "loaned_by":
          c = compareLocaleTexto(empPorItem[a.id]?.loaned_by?.trim() ?? "", empPorItem[b.id]?.loaned_by?.trim() ?? "", dir);
          break;
        case "motivo":
          c = compareLocaleTexto(a.maintenance_reason ?? "", b.maintenance_reason ?? "", dir);
          break;
        case "sent_at":
          c = compareLocaleTexto(a.maintenance_entered_at ?? "", b.maintenance_entered_at ?? "", dir);
          break;
        case "entered_by":
          c = compareLocaleTexto(a.maintenance_entered_by?.trim() ?? "", b.maintenance_entered_by?.trim() ?? "", dir);
          break;
        case "disc_motivo":
          c = compareLocaleTexto(a.discard_reason ?? "", b.discard_reason ?? "", dir);
          break;
        case "disc_at":
          c = compareLocaleTexto(a.discarded_at ?? "", b.discarded_at ?? "", dir);
          break;
        case "disc_by":
          c = compareLocaleTexto(a.discarded_by?.trim() ?? "", b.discarded_by?.trim() ?? "", dir);
          break;
        default:
          c = 0;
      }
      if (c !== 0) return c;
      return compareLocaleTexto(a.code, b.code, "asc");
    });
    return arr;
  }, [pecasFiltradas, sortFig, empPorItem, operadoraNome]);

  const pecasNaAbaComFiltroTopo = useMemo(
    () => pecasVisiveisPermissao.filter((p) => p.status === aba),
    [pecasVisiveisPermissao, aba],
  );

  const sortHeader = useCallback(
    (label: string, col: FigSortCol) => (
      <SortTableTh<FigSortCol>
        label={label}
        col={col}
        sortCol={sortFig.col}
        sortDir={sortFig.dir}
        thStyle={dataTable.thHeader}
        align="center"
        onSort={(c) =>
          setSortFig((s) => ({
            col: c,
            dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
          }))
        }
      />
    ),
    [sortFig, dataTable],
  );

  const abrirDetalhe = async (p: RhFigurinoPeca) => {
    setDetalhe(p);
    setHistErro(null);
    setLoadingHist(true);
    const e2 = await supabase
      .from("rh_figurino_status_history")
      .select("*")
      .eq("item_id", p.id)
      .order("changed_at", { ascending: false })
      .limit(80);
    if (e2.error) {
      console.error("[Figurinos] Erro ao carregar histórico da peça:", e2.error);
      setHistStatus([]);
      setHistErro("Não foi possível carregar o histórico desta peça. Se o problema persistir, contate o suporte.");
    } else {
      setHistStatus((e2.data ?? []) as RhFigurinoStatusHist[]);
    }
    setLoadingHist(false);
  };

  const resolverCodigo = async (texto: string): Promise<RhFigurinoPeca | null> => {
    const raw = texto.trim();
    if (!raw) return null;
    const emb = "*, rh_figurino_peca_operadoras(operadora_slug)";
    const byBar = await supabase.from("rh_figurino_pecas").select(emb).eq("barcode", raw).maybeSingle();
    if (byBar.data) return byBar.data as RhFigurinoPeca;
    const upper = raw.toUpperCase();
    const byCode = await supabase.from("rh_figurino_pecas").select(emb).eq("code", upper).maybeSingle();
    if (byCode.data) return byCode.data as RhFigurinoPeca;
    return null;
  };

  const onScanOuManual = async (texto: string) => {
    setErroGlobal(null);
    const p = await resolverCodigo(texto);
    if (!p) {
      setErroGlobal("Código não reconhecido. Verifique se a peça foi cadastrada ou tente digitar o código manualmente.");
      return;
    }
    if (p.status === "maintenance" || p.status === "discarded") {
      setAvisoPeca(p);
      return;
    }
    if (p.status === "available") {
      setEmpPeca(p);
      setModalScanner(false);
      return;
    }
    if (p.status === "borrowed") {
      if (perm.canView === "proprios") {
        const emp = empPorItem[p.id];
        if (!emprestimoFigurinoEhDoProprioLogin(emp, rhPrestadorIdsSet, nomeUsuarioFigNorm)) {
          setErroGlobal(
            "Esta peça não está associada ao seu cadastro de prestador (retirada). Só pode abrir devolução das suas próprias retiradas.",
          );
          return;
        }
      }
      setDevPeca(p);
      setModalScanner(false);
    }
  };

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  const podeCriar = perm.canCriarOk;
  const podeEditar = perm.canEditarOk;

  const renderCodigoClicavel = (p: RhFigurinoPeca) => (
    <button
      type="button"
      onClick={() => void abrirDetalhe(p)}
      aria-label={`Ver detalhes da peça ${p.code}`}
      style={{
        fontWeight: 700,
        color: brand.accent,
        textDecoration: "underline",
        background: "none",
        border: "none",
        cursor: "pointer",
        fontFamily: FONT.body,
        padding: 0,
        textAlign: "left",
      }}
    >
      {p.code}
    </button>
  );

  return (
    <div className="app-page-shell">
      <PageHeader
        icon={<PageMenuIcon pageKey="rh_figurinos" />}
        title={getPageMenuLabel("rh_figurinos")}
        subtitle="Controle o inventário de peças com retiradas, devoluções e manutenções."
      />

      {erroGlobal ? (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 10,
            marginBottom: 14,
            background: "rgba(232,64,37,0.12)",
            border: "1px solid rgba(232,64,37,0.35)",
            color: "#e84025",
            fontSize: 13,
            fontFamily: FONT.body,
          }}
        >
          <AlertCircle size={14} aria-hidden />
          {erroGlobal}
        </div>
      ) : null}

      {/* Bloco 1: Consolidado (KPIs — formato Financeiro) */}
      <div className="app-grid-kpi-5" style={{ ...getPageKpiSectionGapStyle(), width: "100%", gap: 14 }}>
        {[
          { label: "TOTAL DE PEÇAS", value: kpis.tot, cor: "var(--brand-primary, #7c3aed)" },
          { label: "DISPONÍVEIS", value: kpis.av, cor: "#22c55e" },
          { label: "EMPRESTADAS", value: kpis.bo, cor: "#f59e0b" },
          { label: "FIXOS", value: kpis.fx, cor: "#0ea5e9" },
          { label: "EM MANUTENÇÃO", value: kpis.ma, cor: "#a78bfa" },
        ].map((k) => (
          <div
            key={k.label}
            aria-label={`${k.label}: ${k.value}`}
            style={{
              borderRadius: 14,
              border: `1px solid ${t.cardBorder}`,
              borderLeft: `3px solid ${k.cor}`,
              background: brand.blockBg,
              padding: "16px 18px",
              boxShadow: t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: t.textMuted,
                fontFamily: FONT.body,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {k.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.cor, fontFamily: FONT_TITLE, marginTop: 6 }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Bloco 2: Filtros */}
      <div
        style={getPageFilterBoxStyle(brand, t, {
          display: "flex",
          flexDirection: "column",
          gap: 12,
        })}
      >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              flexWrap: "wrap",
              width: "100%",
            }}
          >
            {operadorasVisiveis.length > 0 ? (
              <FiltroOperadoraSelect
                pill
                minWidth={200}
                value={filtroOp}
                onChange={setFiltroOp}
                operadoras={operadorasVisiveis}
              />
            ) : null}
            <FiltroFigurinosCategoriaSelect
              pill
              minWidth={200}
              value={filtroCat}
              onChange={setFiltroCat}
              categorias={CATEGORIAS}
            />
            <FiltroFigurinosTamanhoSelect
              pill
              minWidth={200}
              value={filtroTam}
              onChange={setFiltroTam}
              tamanhos={TAMANHOS}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              width: "100%",
            }}
          >
            <BarraPesquisaPagina
              value={busca}
              onChange={setBusca}
              placeholder={PAGE_SEARCH.figurinos}
              aria-label="Buscar peças na aba atual"
              wrapperStyle={{ flex: "1 1 200px", minWidth: 0 }}
            />
            <button
              type="button"
              onClick={() => {
                setErroGlobal(null);
                setModalScanner(true);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                flexShrink: 0,
                padding: "10px 16px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg ?? t.cardBg,
                color: t.text,
                fontFamily: FONT.body,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <ScanLine size={16} aria-hidden />
              Bipar código
            </button>
            {podeCriar ? (
              <CtaCriarButton
                type="button"
                onClick={() => {
                  setErroGlobal(null);
                  setModalCadastro(true);
                }}
              >
                Cadastrar peça
              </CtaCriarButton>
            ) : null}
          </div>

          <div
            role="tablist"
            aria-label="Status do inventário"
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: "center",
              width: "100%",
              paddingTop: 12,
              marginTop: 4,
              borderTop: `1px solid ${t.cardBorder}`,
            }}
            onKeyDown={(e) => onFiltroBarTabsKeyDown(e, FIGURINOS_ABAS, setAba, (a) => `tab-fig-${a}`)}
          >
            {FIGURINOS_ABAS.map((a) => (
              <FiltroBarTabButton
                key={a}
                id={`tab-fig-${a}`}
                active={aba === a}
                aria-controls={`panel-fig-${a}`}
                onClick={() => setAba(a)}
                icon={FIGURINOS_TAB_ICONS[a]}
              >
                {labelAba(a)}
              </FiltroBarTabButton>
            ))}
          </div>
      </div>

      {/* Bloco 3: Tabela */}
      <div role="tabpanel" id={`panel-fig-${aba}`} aria-labelledby={`tab-fig-${aba}`} tabIndex={0}>
        {loading || (perm.canView === "proprios" && loadingRhPrestadorMatch) ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 280, gap: 10, color: t.textMuted }}>
            <Loader2 size={22} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
            <span style={{ fontFamily: FONT.body, fontSize: 13 }}>Carregando…</span>
          </div>
        ) : pecasFiltradas.length === 0 ? (
          <div style={{ padding: "36px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            {pecasNaAbaComFiltroTopo.length > 0
              ? "Nenhuma peça corresponde à pesquisa nesta aba."
              : emptyMsgAba(aba)}
          </div>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 900 })}>
              <caption style={{ display: "none" }}>Inventário de figurinos — {labelAba(aba)}</caption>
              <thead>
                <tr>
                  {aba === "available" ? (
                    <>
                      {sortHeader("Código", "codigo")}
                      {sortHeader("Operadora", "operadora")}
                      {sortHeader("Categoria", "categoria")}
                      {sortHeader("Tamanho", "tamanho")}
                      {sortHeader("Data de aquisição", "data_aqui")}
                      {sortHeader("Classificação", "cond")}
                      <th scope="col" style={dataTable.thHeader}>
                        Ações
                      </th>
                    </>
                  ) : null}
                  {aba === "borrowed" ? (
                    <>
                      {sortHeader("Código", "codigo")}
                      {sortHeader("Operadora", "operadora")}
                      {sortHeader("Categoria", "categoria")}
                      {sortHeader("Tamanho", "tamanho")}
                      {sortHeader("Tipo de retirada", "tipo_ret")}
                      {sortHeader("Data de empréstimo", "loaned_at")}
                      {sortHeader("Emprestado para", "borrower")}
                      {sortHeader("Registrado por", "loaned_by")}
                      <th scope="col" style={dataTable.thHeader}>
                        Ação
                      </th>
                    </>
                  ) : null}
                  {aba === "maintenance" ? (
                    <>
                      {sortHeader("Código", "codigo")}
                      {sortHeader("Operadora", "operadora")}
                      {sortHeader("Categoria", "categoria")}
                      {sortHeader("Tamanho", "tamanho")}
                      {sortHeader("Motivo", "motivo")}
                      {sortHeader("Data de envio", "sent_at")}
                      {sortHeader("Registrado por", "entered_by")}
                      <th scope="col" style={dataTable.thHeader}>
                        Ações
                      </th>
                    </>
                  ) : null}
                  {aba === "discarded" ? (
                    <>
                      {sortHeader("Código", "codigo")}
                      {sortHeader("Operadora", "operadora")}
                      {sortHeader("Categoria", "categoria")}
                      {sortHeader("Tamanho", "tamanho")}
                      {sortHeader("Motivo", "disc_motivo")}
                      {sortHeader("Data de descarte", "disc_at")}
                      {sortHeader("Registrado por", "disc_by")}
                    </>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {pecasOrdenadas.map((p, i) => {
                  const emp = empPorItem[p.id];
                  const zebra = dataTable.zebraRow(i);
                  const emprestadoPara = labelEmprestadoParaTabela(emp);
                  const emprestadoParaCompleto = (emp?.borrower_name ?? "").trim() || "—";
                  return (
                    <tr
                      key={p.id}
                      style={{ background: zebra }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = tableRowHoverBg(t.isDark);
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = zebra;
                      }}
                    >
                      {aba === "available" ? (
                        <>
                          <td style={dataTable.tdCenter}>{renderCodigoClicavel(p)}</td>
                          <td style={{ ...dataTable.tdCenter, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }} title={labelOperadorasPeca(p, operadoraNome)}>
                            {labelOperadorasPeca(p, operadoraNome)}
                          </td>
                          <td style={dataTable.tdCenter}>{p.category}</td>
                          <td style={dataTable.tdCenter}>{p.size}</td>
                          <td style={dataTable.tdCenter}>{fmtDataSóDia(p.purchase_date)}</td>
                          <td style={dataTable.tdCenter}>{labelCondicaoPeca(p.condition)}</td>
                          <td style={dataTable.tdCenter}>
                            <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 6, whiteSpace: "nowrap" }}>
                            {podeEditar ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setEmpPeca(p)}
                                  style={{
                                    padding: "4px 10px",
                                    borderRadius: 8,
                                    border: `1px solid rgba(34,197,94,0.35)`,
                                    background: "rgba(34,197,94,0.12)",
                                    color: "#22c55e",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    fontFamily: FONT.body,
                                  }}
                                >
                                  Retirada
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setManutPeca(p)}
                                  style={{
                                    padding: "4px 10px",
                                    borderRadius: 8,
                                    border: `1px solid rgba(167,139,250,0.4)`,
                                    background: "rgba(167,139,250,0.12)",
                                    color: "#a78bfa",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    fontFamily: FONT.body,
                                  }}
                                >
                                  Manutenção
                                </button>
                              </>
                            ) : (
                              "—"
                            )}
                            </div>
                          </td>
                        </>
                      ) : null}
                      {aba === "borrowed" ? (
                        <>
                          <td style={dataTable.tdCenter}>{renderCodigoClicavel(p)}</td>
                          <td style={{ ...dataTable.tdCenter, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }} title={labelOperadorasPeca(p, operadoraNome)}>
                            {labelOperadorasPeca(p, operadoraNome)}
                          </td>
                          <td style={dataTable.tdCenter}>{p.category}</td>
                          <td style={dataTable.tdCenter}>{p.size}</td>
                          <td style={dataTable.tdCenter}>{labelTipoRetirada(emp?.withdrawal_type)}</td>
                          <td style={dataTable.tdCenter}>{fmtDataHora(emp?.loaned_at)}</td>
                          <td
                            style={{ ...dataTable.tdCenter, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}
                            title={emprestadoParaCompleto !== emprestadoPara ? emprestadoParaCompleto : emprestadoPara}
                          >
                            {emprestadoPara}
                          </td>
                          <td style={dataTable.tdCenter}>{emp?.loaned_by?.trim() ? emp.loaned_by : "—"}</td>
                          <td style={dataTable.tdCenter}>
                            <div style={{ display: "flex", justifyContent: "center", whiteSpace: "nowrap" }}>
                            {podeEditar ? (
                              <button
                                type="button"
                                onClick={() => setDevPeca(p)}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 8,
                                  border: `1px solid rgba(245,158,11,0.4)`,
                                  background: "rgba(245,158,11,0.12)",
                                  color: "#f59e0b",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  fontFamily: FONT.body,
                                }}
                              >
                                Devolução
                              </button>
                            ) : (
                              "—"
                            )}
                            </div>
                          </td>
                        </>
                      ) : null}
                      {aba === "maintenance" ? (
                        <>
                          <td style={dataTable.tdCenter}>{renderCodigoClicavel(p)}</td>
                          <td style={{ ...dataTable.tdCenter, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }} title={labelOperadorasPeca(p, operadoraNome)}>
                            {labelOperadorasPeca(p, operadoraNome)}
                          </td>
                          <td style={dataTable.tdCenter}>{p.category}</td>
                          <td style={dataTable.tdCenter}>{p.size}</td>
                          <td style={{ ...dataTable.tdCenter, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }} title={p.maintenance_reason ?? ""}>
                            {p.maintenance_reason ?? "—"}
                          </td>
                          <td style={dataTable.tdCenter}>{fmtDataHora(p.maintenance_entered_at)}</td>
                          <td style={dataTable.tdCenter}>{p.maintenance_entered_by?.trim() ? p.maintenance_entered_by : "—"}</td>
                          <td style={dataTable.tdCenter}>
                            <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 6, whiteSpace: "nowrap" }}>
                            {podeEditar ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setConcluirManutPeca(p)}
                                  style={{
                                    padding: "4px 10px",
                                    borderRadius: 8,
                                    border: `1px solid rgba(34,197,94,0.35)`,
                                    background: "rgba(34,197,94,0.12)",
                                    color: "#22c55e",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    fontFamily: FONT.body,
                                  }}
                                >
                                  Disponibilizar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDescPeca(p)}
                                  style={{
                                    padding: "4px 10px",
                                    borderRadius: 8,
                                    border: "1px solid rgba(107,114,128,0.45)",
                                    background: "rgba(107,114,128,0.1)",
                                    color: "#6b7280",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    fontFamily: FONT.body,
                                  }}
                                >
                                  Descartar
                                </button>
                              </>
                            ) : (
                              "—"
                            )}
                            </div>
                          </td>
                        </>
                      ) : null}
                      {aba === "discarded" ? (
                        <>
                          <td style={dataTable.tdCenter}>{renderCodigoClicavel(p)}</td>
                          <td style={{ ...dataTable.tdCenter, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }} title={labelOperadorasPeca(p, operadoraNome)}>
                            {labelOperadorasPeca(p, operadoraNome)}
                          </td>
                          <td style={dataTable.tdCenter}>{p.category}</td>
                          <td style={dataTable.tdCenter}>{p.size}</td>
                          <td style={{ ...dataTable.tdCenter, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }} title={p.discard_reason ?? ""}>
                            {p.discard_reason ?? "—"}
                          </td>
                          <td style={dataTable.tdCenter}>{fmtDataHora(p.discarded_at)}</td>
                          <td style={dataTable.tdCenter}>{p.discarded_by?.trim() ? p.discarded_by : "—"}</td>
                        </>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalCadastro ? (
        <ModalCadastroPeca
          onClose={() => setModalCadastro(false)}
          operadoras={operadoras}
          podeVerOperadora={podeVerOperadora}
          operadoraSlugsForcado={operadoraSlugsForcado}
          actor={actorLabel(user)}
          onCreated={async (row) => {
            const { data } = await supabase
              .from("rh_figurino_pecas")
              .select("*, rh_figurino_peca_operadoras(operadora_slug)")
              .eq("id", row.id)
              .maybeSingle();
            setPecaNova((data ?? row) as RhFigurinoPeca);
            setModalCadastro(false);
            void carregar();
          }}
        />
      ) : null}

      {pecaNova ? (
        <ModalSucessoCadastro
          peca={pecaNova}
          operadorasTexto={labelOperadorasPeca(pecaNova, operadoraNome)}
          onClose={() => setPecaNova(null)}
        />
      ) : null}

      {modalScanner ? (
        <ModalScanner
          onClose={() => setModalScanner(false)}
          onSubmitManual={onScanOuManual}
          onDetect={onScanOuManual}
        />
      ) : null}

      {empPeca ? (
        <ModalRetirada
          peca={empPeca}
          resumoOperadoras={labelOperadorasPeca(empPeca, operadoraNome)}
          actor={actorLabel(user)}
          onClose={() => setEmpPeca(null)}
          onOk={async () => {
            setEmpPeca(null);
            await carregar();
          }}
        />
      ) : null}

      {devPeca ? (
        <ModalDevolucao
          peca={devPeca}
          resumoOperadoras={labelOperadorasPeca(devPeca, operadoraNome)}
          emprestimo={empPorItem[devPeca.id]}
          actor={actorLabel(user)}
          onClose={() => setDevPeca(null)}
          onOk={async () => {
            setDevPeca(null);
            await carregar();
          }}
        />
      ) : null}

      {avisoPeca ? (
        <ModalBase onClose={() => setAvisoPeca(null)} maxWidth={420}>
          <ModalHeader title="Peça indisponível para empréstimo/devolução" onClose={() => setAvisoPeca(null)} />
          <p style={{ fontFamily: FONT.body, fontSize: 14, color: t.text, lineHeight: 1.5, margin: "0 0 12px" }}>
            {avisoPeca.category} · {avisoPeca.size} ({avisoPeca.code}) está como <strong>{labelStatusPeca(avisoPeca.status)}</strong>.
          </p>
          <button
            type="button"
            onClick={() => {
              setAvisoPeca(null);
              void abrirDetalhe(avisoPeca);
            }}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: getCtaCriarGradient(brand),
              color: "#fff",
              fontWeight: 700,
              fontFamily: FONT.body,
              cursor: "pointer",
            }}
          >
            Ver detalhes
          </button>
        </ModalBase>
      ) : null}

      {manutPeca ? (
        <ModalManutencaoPeca
          peca={manutPeca}
          resumoOperadoras={labelOperadorasPeca(manutPeca, operadoraNome)}
          actor={actorLabel(user)}
          onClose={() => setManutPeca(null)}
          onOk={async () => {
            setManutPeca(null);
            await carregar();
          }}
        />
      ) : null}

      {descPeca ? (
        <ModalDescartarPeca
          peca={descPeca}
          resumoOperadoras={labelOperadorasPeca(descPeca, operadoraNome)}
          actor={actorLabel(user)}
          onClose={() => setDescPeca(null)}
          onOk={async () => {
            setDescPeca(null);
            await carregar();
          }}
        />
      ) : null}

      {concluirManutPeca ? (
        <ModalBase onClose={() => setConcluirManutPeca(null)} maxWidth={400}>
          <ModalHeader title="Disponibilizar peça" onClose={() => setConcluirManutPeca(null)} />
          <p style={{ fontFamily: FONT.body, fontSize: 14, color: t.text, marginBottom: 16 }}>
            Confirma que a manutenção de <strong>{concluirManutPeca.code}</strong> foi concluída e a peça volta ao estoque disponível?
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => setConcluirManutPeca(null)}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg,
                color: t.textMuted,
                fontWeight: 700,
                fontFamily: FONT.body,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={concluindoManut}
              onClick={async () => {
                setConcluindoManut(true);
                setErroGlobal(null);
                const { error } = await supabase.rpc("rh_figurino_concluir_manutencao", {
                  p_item_id: concluirManutPeca.id,
                  p_actor: actorLabel(user),
                });
                setConcluindoManut(false);
                if (error) {
                  console.error("[Figurinos] Erro ao concluir manutenção:", error);
                  setErroGlobal("Não foi possível disponibilizar a peça. Se o problema persistir, contate o suporte.");
                } else {
                  setConcluirManutPeca(null);
                  await carregar();
                }
              }}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 10,
                border: "none",
                background: getCtaCriarGradient(brand),
                color: "#fff",
                fontWeight: 700,
                fontFamily: FONT.body,
                cursor: concluindoManut ? "not-allowed" : "pointer",
                opacity: concluindoManut ? 0.75 : 1,
              }}
            >
              {ctaButtonContent(concluindoManut, "Confirmar", "Salvando…")}
            </button>
          </div>
        </ModalBase>
      ) : null}

      {detalhe ? (
        <ModalDetalhe
          peca={detalhe}
          operadorasTexto={labelOperadorasPeca(detalhe, operadoraNome)}
          histStatus={histStatus}
          histErro={histErro}
          loadingHist={loadingHist}
          empAtivo={empPorItem[detalhe.id]}
          podeEditar={podeEditar}
          onClose={() => setDetalhe(null)}
          onRetirada={() => {
            setDetalhe(null);
            setEmpPeca(detalhe);
          }}
          onDevolver={() => {
            setDetalhe(null);
            setDevPeca(detalhe);
          }}
          onManutencao={() => {
            setDetalhe(null);
            setManutPeca(detalhe);
          }}
          onConcluirManut={() => {
            setDetalhe(null);
            setConcluirManutPeca(detalhe);
          }}
          onDescartar={() => {
            setDetalhe(null);
            setDescPeca(detalhe);
          }}
        />
      ) : null}
    </div>
  );
}

function ModalCadastroPeca({
  onClose,
  operadoras,
  podeVerOperadora,
  operadoraSlugsForcado,
  actor,
  onCreated,
}: {
  onClose: () => void;
  operadoras: Operadora[];
  podeVerOperadora: (s: string) => boolean;
  operadoraSlugsForcado: string[] | null;
  actor: string;
  onCreated: (row: RhFigurinoPeca) => void | Promise<void>;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [previewCode, setPreviewCode] = useState<string>("…");
  const [slugsSel, setSlugsSel] = useState<Set<string>>(() => {
    if (operadoraSlugsForcado?.length) return new Set(operadoraSlugsForcado);
    return new Set();
  });
  const [cat, setCat] = useState<string>(CATEGORIAS[0]);
  const [tam, setTam] = useState<string>(TAMANHOS[3]);
  const [desc, setDesc] = useState("");
  const [dataEntrada, setDataEntrada] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data, error } = await supabase.rpc("rh_figurino_preview_proximo_code");
      if (!cancel && !error && typeof data === "string") setPreviewCode(data);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const toggleSlug = (slug: string) => {
    setSlugsSel((prev) => {
      const n = new Set(prev);
      if (n.has(slug)) n.delete(slug);
      else n.add(slug);
      return n;
    });
  };

  const salvar = async () => {
    setErr(null);
    if (slugsSel.size === 0) {
      setErr("Selecione ao menos uma operadora.");
      return;
    }
    if (!dataEntrada.trim()) {
      setErr("Informe a data de entrada.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("rh_figurino_criar_peca", {
      p_operadora_slugs: [...slugsSel],
      p_category: cat,
      p_size: tam,
      p_purchase_date: dataEntrada,
      p_description: desc,
      p_actor: actor,
    });
    setLoading(false);
    if (error) {
      console.error("[Figurinos] Erro ao cadastrar peça:", error);
      setErr("Não foi possível cadastrar a peça. Se o problema persistir, contate o suporte.");
      return;
    }
    await onCreated(data as RhFigurinoPeca);
  };

  const opsVis = operadoras.filter((o) => podeVerOperadora(o.slug));

  return (
    <ModalBase onClose={onClose} maxWidth={480}>
      <ModalHeader title="Cadastrar peça" onClose={onClose} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
          Código (pré-visualização)
          <input
            readOnly
            value={previewCode}
            aria-readonly="true"
            style={{
              display: "block",
              width: "100%",
              marginTop: 6,
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
              color: t.text,
              fontFamily: FONT.body,
              fontWeight: 700,
            }}
          />
        </label>
        <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
          <legend style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginBottom: 8 }}>
            Operadoras
            <CampoObrigatorioMark />
            <span style={{ fontWeight: 400 }}> (pode marcar várias)</span>
          </legend>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              maxHeight: 200,
              overflowY: "auto",
              padding: "4px 0",
            }}
          >
            {opsVis.map((o) => {
              const ativo = slugsSel.has(o.slug);
              return (
                <button
                  key={o.slug}
                  type="button"
                  role="checkbox"
                  aria-checked={ativo}
                  aria-label={`Operadora ${o.nome}`}
                  onClick={() => toggleSlug(o.slug)}
                  style={{
                    textAlign: "left",
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: `1px solid ${ativo ? brand.accent : t.cardBorder}`,
                    background: ativo
                      ? brand.useBrand
                        ? "color-mix(in srgb, var(--brand-accent) 12%, transparent)"
                        : "rgba(124,58,237,0.12)"
                      : (t.inputBg ?? t.cardBg),
                    color: ativo ? brand.accent : t.text,
                    fontFamily: FONT.body,
                    fontSize: 13,
                    fontWeight: ativo ? 700 : 500,
                    cursor: "pointer",
                  }}
                >
                  {o.nome}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
            Categoria
            <CampoObrigatorioMark />
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              style={{
                display: "block",
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg ?? t.cardBg,
                color: t.text,
                fontFamily: FONT.body,
              }}
            >
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
            Tamanho
            <CampoObrigatorioMark />
            <select
              value={tam}
              onChange={(e) => setTam(e.target.value)}
              style={{
                display: "block",
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg ?? t.cardBg,
                color: t.text,
                fontFamily: FONT.body,
              }}
            >
              {TAMANHOS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
          Data de entrada
          <CampoObrigatorioMark />
          <span style={{ fontWeight: 400, color: t.textMuted }}> (data de aquisição)</span>
          <input
            type="date"
            required
            value={dataEntrada}
            onChange={(e) => setDataEntrada(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              marginTop: 6,
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg ?? t.cardBg,
              color: t.text,
              fontFamily: FONT.body,
            }}
          />
        </label>
        <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
          Observações
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
            style={{
              display: "block",
              width: "100%",
              marginTop: 6,
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg ?? t.cardBg,
              color: t.text,
              fontFamily: FONT.body,
              resize: "vertical",
            }}
          />
        </label>
        {err ? (
          <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body }}>
            {err}
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg,
              color: t.textMuted,
              fontWeight: 700,
              fontFamily: FONT.body,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void salvar()}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 10,
              border: "none",
              background: getCtaCriarGradient(brand),
              color: "#fff",
              fontWeight: 700,
              fontFamily: FONT.body,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.75 : 1,
            }}
          >
            {ctaButtonContent(loading, "Salvar", "Salvando…")}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}

function ModalSucessoCadastro({
  peca,
  operadorasTexto,
  onClose,
}: {
  peca: RhFigurinoPeca;
  operadorasTexto: string;
  onClose: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [pdfLoading, setPdfLoading] = useState(false);

  return (
    <ModalBase onClose={onClose} maxWidth={480}>
      <ModalHeader title="Peça cadastrada" onClose={onClose} />
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            padding: "12px 16px",
            borderRadius: 12,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg ?? t.cardBg,
            marginBottom: 14,
          }}
        >
          <BarcodeBlock value={peca.barcode} />
        </div>
        <p style={{ fontFamily: FONT_TITLE, fontSize: 20, fontWeight: 800, color: brand.primary, margin: "8px 0" }}>{peca.code}</p>
        <p style={{ fontFamily: FONT.body, fontSize: 14, color: t.text, margin: "4px 0 16px" }}>
          {peca.category} · {peca.size} · {operadorasTexto}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            disabled={pdfLoading}
            onClick={async () => {
              setPdfLoading(true);
              try {
                await baixarEtiquetaFigurinoPdf(peca, operadorasTexto);
              } finally {
                setPdfLoading(false);
              }
            }}
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              border: "none",
              background: getCtaCriarGradient(brand),
              color: "#fff",
              fontWeight: 700,
              fontFamily: FONT.body,
              cursor: pdfLoading ? "not-allowed" : "pointer",
            }}
          >
            {ctaButtonContent(pdfLoading, "Baixar etiqueta (PDF)", "Gerando PDF…")}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: "transparent",
              color: t.textMuted,
              fontWeight: 700,
              fontFamily: FONT.body,
              cursor: "pointer",
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </ModalBase>
  );
}

function ModalScanner({
  onClose,
  onSubmitManual,
  onDetect,
}: {
  onClose: () => void;
  onSubmitManual: (t: string) => void | Promise<void>;
  onDetect: (t: string) => void | Promise<void>;
}) {
  const { theme: t } = useApp();
  const [manual, setManual] = useState("");

  return (
    <ModalBase onClose={onClose} maxWidth={520}>
      <ModalHeader title="Bipar código" onClose={onClose} />
      <ScannerPanel onDetect={(txt) => void onDetect(txt)} />
      <form
        style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmitManual(manual);
        }}
      >
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Digite o código ou barcode"
          aria-label="Digite o código manualmente"
          style={{
            flex: "1 1 200px",
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg ?? t.cardBg,
            color: t.text,
            fontFamily: FONT.body,
          }}
        />
        <button
          type="submit"
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.text,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Buscar
        </button>
      </form>
    </ModalBase>
  );
}

type PrestadorRetiradaRow = Pick<RhFuncionario, "id" | "nome" | "setor" | "status">;

function ModalRetirada({
  peca,
  resumoOperadoras,
  actor,
  onClose,
  onOk,
}: {
  peca: RhFigurinoPeca;
  resumoOperadoras: string;
  actor: string;
  onClose: () => void;
  onOk: () => void | Promise<void>;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [prestadores, setPrestadores] = useState<PrestadorRetiradaRow[]>([]);
  const [loadingPrestadores, setLoadingPrestadores] = useState(true);
  const [erroCargaPrestadores, setErroCargaPrestadores] = useState<string | null>(null);
  const [buscaPrestador, setBuscaPrestador] = useState("");
  const [prestadorSelecionadoId, setPrestadorSelecionadoId] = useState<string | null>(null);
  const [tipoRetirada, setTipoRetirada] = useState<RhWithdrawalType>("emprestar");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const buscaRef = useRef<HTMLInputElement>(null);
  const agoraIso = useMemo(() => new Date().toISOString(), []);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoadingPrestadores(true);
      setErroCargaPrestadores(null);
      const { data, error } = await supabase
        .from("rh_funcionarios")
        .select("id, nome, setor, status")
        .in("status", ["ativo", "indisponivel"])
        .order("nome", { ascending: true })
        .limit(5000);
      if (cancelado) return;
      if (error) {
        console.error("[Figurinos] Erro ao carregar prestadores:", error);
        setErroCargaPrestadores("Não foi possível carregar a lista de prestadores. Tente novamente ou contate o suporte.");
        setPrestadores([]);
      } else {
        setPrestadores((data ?? []) as PrestadorRetiradaRow[]);
      }
      setLoadingPrestadores(false);
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => buscaRef.current?.focus(), 100);
    return () => window.clearTimeout(id);
  }, []);

  const prestadorSelecionado = useMemo(
    () => (prestadorSelecionadoId ? prestadores.find((p) => p.id === prestadorSelecionadoId) : undefined),
    [prestadores, prestadorSelecionadoId],
  );

  const prestadoresFiltrados = useMemo(() => {
    const q = buscaPrestador.trim().toLowerCase();
    if (!q) return prestadores;
    return prestadores.filter((p) => {
      const nome = (p.nome ?? "").toLowerCase();
      const setor = (p.setor ?? "").toLowerCase();
      return nome.includes(q) || setor.includes(q);
    });
  }, [prestadores, buscaPrestador]);

  const confirmar = async () => {
    setErr(null);
    const row = prestadorSelecionado;
    if (!row?.id || !(row.nome ?? "").trim()) {
      setErr("Selecione um prestador na lista (cadastro da Gestão de Prestadores).");
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc("rh_figurino_registrar_emprestimo", {
      p_item_id: peca.id,
      p_borrower_name: row.nome.trim(),
      p_borrower_ref: row.id,
      p_withdrawal_type: tipoRetirada,
      p_actor: actor,
    });
    setLoading(false);
    if (error) {
      console.error("[Figurinos] Erro ao registrar retirada:", error);
      setErr("Não foi possível registrar a retirada. Se o problema persistir, contate o suporte.");
      return;
    }
    await onOk();
  };

  const confirmarDesabilitado =
    loading ||
    loadingPrestadores ||
    !prestadorSelecionadoId ||
    !!erroCargaPrestadores ||
    prestadores.length === 0;

  return (
    <ModalBase onClose={onClose} maxWidth={480}>
      <ModalHeader title="Retirada" onClose={onClose} />
      <BlocoResumoPecaBasico peca={peca} operadorasTexto={resumoOperadoras} t={t} />
      <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span>
            Prestador <span style={{ color: "#e84025" }}>*</span>
          </span>
          {loadingPrestadores ? <Loader2 size={14} className="app-lucide-spin" style={{ color: t.textMuted }} aria-hidden /> : null}
        </div>
        <p style={{ margin: "0 0 8px", fontSize: 11, lineHeight: 1.45, opacity: 0.92 }}>
          Mesma base da página Gestão de Prestadores (ativos e indisponíveis). Pesquise por nome ou setor e escolha na lista.
        </p>
        {erroCargaPrestadores ? (
          <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, marginBottom: 8 }}>
            {erroCargaPrestadores}
          </div>
        ) : null}
        {!loadingPrestadores && !erroCargaPrestadores && prestadores.length === 0 ? (
          <div style={{ color: t.textMuted, fontSize: 12, marginBottom: 8 }}>
            Sem prestadores ativos ou indisponíveis cadastrados na Gestão de Prestadores.
          </div>
        ) : null}
        {prestadorSelecionado ? (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg ?? t.cardBg,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ color: t.text, fontSize: 13, fontWeight: 600 }}>{prestadorSelecionado.nome}</div>
            <div style={{ color: t.textMuted, fontSize: 11 }}>
              {(prestadorSelecionado.setor ?? "").trim() || "—"}
              {" · "}
              {prestadorSelecionado.status === "indisponivel" ? "Indisponível" : "Ativo"}
            </div>
            <button
              type="button"
              onClick={() => {
                setPrestadorSelecionadoId(null);
                setBuscaPrestador("");
                window.setTimeout(() => buscaRef.current?.focus(), 50);
              }}
              style={{
                alignSelf: "flex-start",
                padding: "6px 12px",
                borderRadius: 8,
                border: `1px solid ${t.cardBorder}`,
                background: "transparent",
                color: t.text,
                fontSize: 12,
                fontFamily: FONT.body,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Trocar prestador
            </button>
          </div>
        ) : (
          <>
            <BarraPesquisaPagina
              inputRef={buscaRef}
              value={buscaPrestador}
              onChange={setBuscaPrestador}
              disabled={loadingPrestadores || !!erroCargaPrestadores || prestadores.length === 0}
              placeholder={FILTER_SEARCH_STAFF}
              aria-label="Filtrar prestadores por nome ou setor"
              wrapperStyle={{ width: "100%", marginBottom: 8 }}
            />
            <div
              role="listbox"
              aria-label="Prestadores da Gestão de Prestadores"
              style={{
                maxHeight: 200,
                overflowY: "auto",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg ?? t.cardBg,
              }}
            >
              {prestadoresFiltrados.length === 0 ? (
                <div style={{ padding: 12, fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
                  Nenhum resultado para a pesquisa.
                </div>
              ) : (
                prestadoresFiltrados.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={prestadorSelecionadoId === p.id}
                    onClick={() => {
                      setPrestadorSelecionadoId(p.id);
                      setBuscaPrestador("");
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      border: "none",
                      borderBottom:
                        i === prestadoresFiltrados.length - 1 ? "none" : `1px solid ${t.cardBorder}`,
                      background: "transparent",
                      cursor: "pointer",
                      fontFamily: FONT.body,
                    }}
                  >
                    <span style={{ display: "block", color: t.text, fontSize: 13, fontWeight: 600 }}>{p.nome}</span>
                    <span style={{ display: "block", color: t.textMuted, fontSize: 11, marginTop: 2 }}>
                      {(p.setor ?? "").trim() || "—"}
                      {p.status === "indisponivel" ? " · Indisponível" : ""}
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
      <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, display: "block", marginBottom: 10 }}>
        Tipo de retirada *
        <select
          value={tipoRetirada}
          onChange={(e) => setTipoRetirada(e.target.value as RhWithdrawalType)}
          aria-label="Tipo de retirada"
          style={{
            display: "block",
            width: "100%",
            marginTop: 6,
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg ?? t.cardBg,
            color: t.text,
            fontFamily: FONT.body,
          }}
        >
          <option value="emprestar">Emprestar</option>
          <option value="fixo">Fixo</option>
        </select>
      </label>
      <div
        style={{
          fontSize: 12,
          color: t.textMuted,
          marginBottom: 12,
          fontFamily: FONT.body,
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px dashed ${t.cardBorder}`,
          background: t.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
        }}
      >
        Registrado por: <strong style={{ color: t.text }}>{actor}</strong>
        <br />
        Data/hora do registro: <strong style={{ color: t.text }}>{fmtDataHora(agoraIso)}</strong>
      </div>
      {err ? (
        <div role="alert" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 10 }}>
          {err}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.textMuted,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={confirmarDesabilitado}
          onClick={() => void confirmar()}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: "none",
            background: getCtaCriarGradient(brand),
            color: "#fff",
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: confirmarDesabilitado ? "not-allowed" : "pointer",
            opacity: confirmarDesabilitado ? 0.55 : 1,
          }}
        >
          {ctaButtonContent(loading, "Confirmar Retirada", "Salvando…")}
        </button>
      </div>
    </ModalBase>
  );
}

type FluxoDevolucaoUi = "boa" | "possivel_descarte" | "manutencao";

function ModalDevolucao({
  peca,
  resumoOperadoras,
  emprestimo,
  actor,
  onClose,
  onOk,
}: {
  peca: RhFigurinoPeca;
  resumoOperadoras: string;
  emprestimo: RhFigurinoEmprestimo | undefined;
  actor: string;
  onClose: () => void;
  onOk: () => void | Promise<void>;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [fluxo, setFluxo] = useState<FluxoDevolucaoUi | null>(null);
  const [observacoes, setObservacoes] = useState("");
  const [tipoManut, setTipoManut] = useState<RhFigurinoTipoManutencao | "">("");
  const [motivoManut, setMotivoManut] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const agoraIso = useMemo(() => new Date().toISOString(), []);

  const confirmar = async () => {
    setErr(null);
    if (!fluxo) {
      setErr("Selecione a condição da devolução.");
      return;
    }
    if (fluxo === "manutencao") {
      if (!tipoManut || !motivoManut.trim()) {
        setErr("Informe o tipo e o motivo.");
        return;
      }
    }
    let pFluxo: string;
    if (fluxo === "boa") pFluxo = "disponivel_bom";
    else if (fluxo === "possivel_descarte") pFluxo = "disponivel_possivel_descarte";
    else pFluxo = "manutencao";

    setLoading(true);
    const { error } = await supabase.rpc("rh_figurino_registrar_devolucao", {
      p_item_id: peca.id,
      p_fluxo: pFluxo,
      p_observacoes: observacoes.trim(),
      p_manut_tipo: fluxo === "manutencao" ? tipoManut : "",
      p_manut_motivo: fluxo === "manutencao" ? motivoManut.trim() : "",
      p_actor: actor,
    });
    setLoading(false);
    if (error) {
      console.error("[Figurinos] Erro ao registrar devolução:", error);
      setErr("Não foi possível registrar a devolução. Se o problema persistir, contate o suporte.");
      return;
    }
    await onOk();
  };

  const opts: { key: FluxoDevolucaoUi; label: string; cor: string; Icon: typeof CheckCircle2 }[] = [
    { key: "boa", label: "Boa condição", cor: "#22c55e", Icon: CheckCircle2 },
    { key: "possivel_descarte", label: "Possível descarte", cor: "#f59e0b", Icon: Wrench },
    { key: "manutencao", label: "Manutenção", cor: "#a78bfa", Icon: XCircle },
  ];

  return (
    <ModalBase onClose={onClose} maxWidth={500}>
      <ModalHeader title="Devolução" onClose={onClose} />
      <BlocoResumoPecaBasico peca={peca} operadorasTexto={resumoOperadoras} t={t} />
      {emprestimo ? (
        <p style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, margin: "0 0 12px" }}>
          Retirada ativa ({labelTipoRetirada(emprestimo.withdrawal_type)}):{" "}
          <strong style={{ color: t.text }}>{emprestimo.borrower_name}</strong> desde {fmtDataHora(emprestimo.loaned_at)}
        </p>
      ) : (
        <p style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, margin: "0 0 12px" }}>Dados do empréstimo não encontrados.</p>
      )}
      <div style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 8, fontFamily: FONT.body }}>Condição da devolução</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {opts.map((o) => (
          <button
            key={o.key}
            type="button"
            aria-pressed={fluxo === o.key}
            onClick={() => setFluxo(o.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${fluxo === o.key ? o.cor : t.cardBorder}`,
              background: fluxo === o.key ? `${o.cor}18` : "transparent",
              color: fluxo === o.key ? o.cor : t.textMuted,
              fontWeight: fluxo === o.key ? 700 : 500,
              fontFamily: FONT.body,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <o.Icon size={16} aria-hidden />
            {o.label}
          </button>
        ))}
      </div>
      {fluxo === "boa" || fluxo === "possivel_descarte" ? (
        <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, display: "block", marginBottom: 12 }}>
          Observações
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={3}
            style={{
              display: "block",
              width: "100%",
              marginTop: 6,
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg ?? t.cardBg,
              color: t.text,
              fontFamily: FONT.body,
              resize: "vertical",
            }}
          />
        </label>
      ) : null}
      {fluxo === "manutencao" ? (
        <>
          <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, display: "block", marginBottom: 10 }}>
            Tipo *
            <select
              value={tipoManut}
              onChange={(e) => setTipoManut(e.target.value as RhFigurinoTipoManutencao | "")}
              aria-label="Tipo de manutenção ou destino"
              style={{
                display: "block",
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg ?? t.cardBg,
                color: t.text,
                fontFamily: FONT.body,
              }}
            >
              <option value="">Selecione…</option>
              {TIPOS_MANUTENCAO.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, display: "block", marginBottom: 12 }}>
            Motivo *
            <textarea
              value={motivoManut}
              onChange={(e) => setMotivoManut(e.target.value)}
              rows={3}
              style={{
                display: "block",
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg ?? t.cardBg,
                color: t.text,
                fontFamily: FONT.body,
                resize: "vertical",
              }}
            />
          </label>
        </>
      ) : null}
      <div
        style={{
          fontSize: 12,
          color: t.textMuted,
          marginBottom: 12,
          fontFamily: FONT.body,
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px dashed ${t.cardBorder}`,
          background: t.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
        }}
      >
        Registrado por: <strong style={{ color: t.text }}>{actor}</strong>
        <br />
        Data/hora: <strong style={{ color: t.text }}>{fmtDataHora(agoraIso)}</strong>
      </div>
      {err ? (
        <div role="alert" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 10 }}>
          {err}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.textMuted,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void confirmar()}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: "none",
            background: getCtaCriarGradient(brand),
            color: "#fff",
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.8 : 1,
          }}
        >
          {ctaButtonContent(loading, "Confirmar devolução", "Salvando…")}
        </button>
      </div>
    </ModalBase>
  );
}

function ModalManutencaoPeca({
  peca,
  resumoOperadoras,
  actor,
  onClose,
  onOk,
}: {
  peca: RhFigurinoPeca;
  resumoOperadoras: string;
  actor: string;
  onClose: () => void;
  onOk: () => void | Promise<void>;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [tipo, setTipo] = useState<RhFigurinoTipoManutencao | "">("");
  const [motivo, setMotivo] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const agoraIso = useMemo(() => new Date().toISOString(), []);

  const confirmar = async () => {
    setErr(null);
    if (!tipo) {
      setErr("Selecione o tipo.");
      return;
    }
    if (!motivo.trim()) {
      setErr("Informe o motivo.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc("rh_figurino_enviar_manutencao", {
      p_item_id: peca.id,
      p_tipo: tipo,
      p_motivo: motivo.trim(),
      p_actor: actor,
    });
    setLoading(false);
    if (error) {
      console.error("[Figurinos] Erro ao enviar para manutenção:", error);
      setErr("Não foi possível enviar a peça para manutenção. Se o problema persistir, contate o suporte.");
      return;
    }
    await onOk();
  };

  return (
    <ModalBase onClose={onClose} maxWidth={500}>
      <ModalHeader title="Manutenção" onClose={onClose} />
      <BlocoResumoPecaBasico peca={peca} operadorasTexto={resumoOperadoras} t={t} />
      <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, display: "block", marginBottom: 10 }}>
        Tipo *
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as RhFigurinoTipoManutencao | "")}
          aria-label="Tipo"
          style={{
            display: "block",
            width: "100%",
            marginTop: 6,
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg ?? t.cardBg,
            color: t.text,
            fontFamily: FONT.body,
          }}
        >
          <option value="">Selecione…</option>
          {TIPOS_MANUTENCAO.map((x) => (
            <option key={x.value} value={x.value}>
              {x.label}
            </option>
          ))}
        </select>
      </label>
      <p style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, margin: "0 0 10px", lineHeight: 1.45 }}>
        Costura ou Lavagem enviam a peça para manutenção. Perda ou Descarte alteram o status para descartada.
      </p>
      <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, display: "block", marginBottom: 12 }}>
        Motivo *
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          style={{
            display: "block",
            width: "100%",
            marginTop: 6,
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg ?? t.cardBg,
            color: t.text,
            fontFamily: FONT.body,
            resize: "vertical",
          }}
        />
      </label>
      <div
        style={{
          fontSize: 12,
          color: t.textMuted,
          marginBottom: 12,
          fontFamily: FONT.body,
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px dashed ${t.cardBorder}`,
          background: t.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
        }}
      >
        Registrado por: <strong style={{ color: t.text }}>{actor}</strong>
        <br />
        Data/hora: <strong style={{ color: t.text }}>{fmtDataHora(agoraIso)}</strong>
      </div>
      {err ? (
        <div role="alert" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 10 }}>
          {err}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.textMuted,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void confirmar()}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: "none",
            background: getCtaCriarGradient(brand),
            color: "#fff",
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.8 : 1,
          }}
        >
          {ctaButtonContent(loading, "Confirmar", "Salvando…")}
        </button>
      </div>
    </ModalBase>
  );
}

function ModalDescartarPeca({
  peca,
  resumoOperadoras,
  actor,
  onClose,
  onOk,
}: {
  peca: RhFigurinoPeca;
  resumoOperadoras: string;
  actor: string;
  onClose: () => void;
  onOk: () => void | Promise<void>;
}) {
  const { theme: t } = useApp();
  const [motivo, setMotivo] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const agoraIso = useMemo(() => new Date().toISOString(), []);

  const confirmar = async () => {
    setErr(null);
    if (!motivo.trim()) {
      setErr("Informe o motivo do descarte.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc("rh_figurino_descartar", {
      p_item_id: peca.id,
      p_motivo: motivo.trim(),
      p_actor: actor,
    });
    setLoading(false);
    if (error) {
      console.error("[Figurinos] Erro ao descartar peça:", error);
      setErr("Não foi possível descartar a peça. Se o problema persistir, contate o suporte.");
      return;
    }
    await onOk();
  };

  return (
    <ModalBase onClose={onClose} maxWidth={500}>
      <ModalHeader title="Descartar peça" onClose={onClose} />
      <BlocoResumoPecaBasico peca={peca} operadorasTexto={resumoOperadoras} t={t} />
      <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, display: "block", marginBottom: 12 }}>
        Motivo *
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          style={{
            display: "block",
            width: "100%",
            marginTop: 6,
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg ?? t.cardBg,
            color: t.text,
            fontFamily: FONT.body,
            resize: "vertical",
          }}
        />
      </label>
      <div
        style={{
          fontSize: 12,
          color: t.textMuted,
          marginBottom: 12,
          fontFamily: FONT.body,
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px dashed ${t.cardBorder}`,
          background: t.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
        }}
      >
        Registrado por: <strong style={{ color: t.text }}>{actor}</strong>
        <br />
        Data/hora: <strong style={{ color: t.text }}>{fmtDataHora(agoraIso)}</strong>
      </div>
      {err ? (
        <div role="alert" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 10 }}>
          {err}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.textMuted,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void confirmar()}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: "none",
            background: "#ef4444",
            color: "#fff",
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.8 : 1,
          }}
        >
          {ctaButtonContent(loading, "Confirmar descarte", "Salvando…")}
        </button>
      </div>
    </ModalBase>
  );
}

type AbaDetalheFig = "detalhes" | "historico";

const DETALHE_ABAS: AbaDetalheFig[] = ["detalhes", "historico"];

const DETALHE_TAB_ICONS: Record<AbaDetalheFig, ReactNode> = {
  detalhes: <FileText {...FILTRO_BAR_TAB_ICON_PROPS} />,
  historico: <History {...FILTRO_BAR_TAB_ICON_PROPS} />,
};

const DETALHE_TAB_LABELS: Record<AbaDetalheFig, string> = {
  detalhes: "Detalhes",
  historico: "Histórico",
};

function ModalDetalhe({
  peca,
  operadorasTexto,
  histStatus,
  histErro,
  loadingHist,
  empAtivo,
  podeEditar,
  onClose,
  onRetirada,
  onDevolver,
  onManutencao,
  onConcluirManut,
  onDescartar,
}: {
  peca: RhFigurinoPeca;
  operadorasTexto: string;
  histStatus: RhFigurinoStatusHist[];
  histErro: string | null;
  loadingHist: boolean;
  empAtivo: RhFigurinoEmprestimo | undefined;
  podeEditar: boolean;
  onClose: () => void;
  onRetirada: () => void;
  onDevolver: () => void;
  onManutencao: () => void;
  onConcluirManut: () => void;
  onDescartar: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [abaDet, setAbaDet] = useState<AbaDetalheFig>("detalhes");

  const registroCadastro = useMemo(() => {
    if (!histStatus.length) return null;
    const asc = [...histStatus].sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());
    return asc.find((h) => h.previous_status == null) ?? asc[0] ?? null;
  }, [histStatus]);

  const linhaLeitura = (label: string, value: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "8px 0", borderBottom: `1px solid ${t.cardBorder}` }}>
      <span style={{ color: t.textMuted, fontSize: 12, fontFamily: FONT.body }}>{label}</span>
      <span style={{ color: t.text, fontSize: 13, fontWeight: 600, textAlign: "right", fontFamily: FONT.body }}>{value}</span>
    </div>
  );

  return (
    <ModalBase onClose={onClose} maxWidth={640}>
      <ModalHeader title={peca.code} onClose={onClose} />
      <div
        role="tablist"
        aria-label="Seções do detalhe"
        style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}
        onKeyDown={(e) => onFiltroBarTabsKeyDown(e, DETALHE_ABAS, setAbaDet, (a) => `tab-fig-detalhe-${a}`)}
      >
        {DETALHE_ABAS.map((a) => (
          <FiltroBarTabButton
            key={a}
            id={`tab-fig-detalhe-${a}`}
            active={abaDet === a}
            aria-controls={`panel-fig-detalhe-${a}`}
            onClick={() => setAbaDet(a)}
            icon={DETALHE_TAB_ICONS[a]}
          >
            {DETALHE_TAB_LABELS[a]}
          </FiltroBarTabButton>
        ))}
      </div>

      {abaDet === "detalhes" ? (
        <div role="tabpanel" id="panel-fig-detalhe-detalhes" aria-labelledby="tab-fig-detalhe-detalhes" tabIndex={0}>
          <div style={{ marginBottom: 16 }}>
            {linhaLeitura("Operadora", operadorasTexto)}
            {linhaLeitura("Categoria", peca.category)}
            {linhaLeitura("Tamanho", peca.size)}
            {linhaLeitura("Data de aquisição", fmtDataSóDia(peca.purchase_date))}
            {linhaLeitura("Condição", labelCondicaoPeca(peca.condition))}
            {linhaLeitura("Status", labelStatusPeca(peca.status))}
          </div>
          {empAtivo ? (
            <p style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, margin: "0 0 14px" }}>
              Retirada ativa ({labelTipoRetirada(empAtivo.withdrawal_type)}):{" "}
              <strong style={{ color: t.text }}>{empAtivo.borrower_name}</strong> desde {fmtDataHora(empAtivo.loaned_at)}
            </p>
          ) : null}
          <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <BarcodeBlock value={peca.barcode} />
            <button
              type="button"
              disabled={pdfLoading}
              onClick={async () => {
                setPdfLoading(true);
                try {
                  await baixarEtiquetaFigurinoPdf(peca, operadorasTexto);
                } finally {
                  setPdfLoading(false);
                }
              }}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: getCtaCriarGradient(brand),
                color: "#fff",
                fontWeight: 700,
                fontFamily: FONT.body,
                cursor: pdfLoading ? "not-allowed" : "pointer",
              }}
            >
              {ctaButtonContent(pdfLoading, "Baixar etiqueta", "Gerando…")}
            </button>
          </div>
          <div
            style={{
              fontSize: 12,
              color: t.textMuted,
              fontFamily: FONT.body,
              paddingTop: 12,
              borderTop: `1px solid ${t.cardBorder}`,
            }}
          >
            Cadastrado por <strong style={{ color: t.text }}>{registroCadastro?.changed_by ?? "—"}</strong>
            {" · "}
            {registroCadastro ? fmtDataHora(registroCadastro.changed_at) : fmtDataHora(peca.created_at)}
          </div>
          {podeEditar ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
              {peca.status === "available" ? (
                <>
                  <button
                    type="button"
                    onClick={onRetirada}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: `1px solid rgba(34,197,94,0.35)`,
                      background: "rgba(34,197,94,0.12)",
                      color: "#22c55e",
                      fontWeight: 700,
                      fontFamily: FONT.body,
                      cursor: "pointer",
                    }}
                  >
                    Retirada
                  </button>
                  <button
                    type="button"
                    onClick={onManutencao}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: `1px solid rgba(167,139,250,0.4)`,
                      background: "rgba(167,139,250,0.12)",
                      color: "#a78bfa",
                      fontWeight: 700,
                      fontFamily: FONT.body,
                      cursor: "pointer",
                    }}
                  >
                    Manutenção
                  </button>
                </>
              ) : null}
              {peca.status === "borrowed" ? (
                <button
                  type="button"
                  onClick={onDevolver}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: `1px solid rgba(245,158,11,0.4)`,
                    background: "rgba(245,158,11,0.12)",
                    color: "#f59e0b",
                    fontWeight: 700,
                    fontFamily: FONT.body,
                    cursor: "pointer",
                  }}
                >
                  Devolução
                </button>
              ) : null}
              {peca.status === "maintenance" ? (
                <>
                  <button
                    type="button"
                    onClick={onConcluirManut}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: `1px solid rgba(34,197,94,0.35)`,
                      background: "rgba(34,197,94,0.12)",
                      color: "#22c55e",
                      fontWeight: 700,
                      fontFamily: FONT.body,
                      cursor: "pointer",
                    }}
                  >
                    Disponibilizar
                  </button>
                  <button
                    type="button"
                    onClick={onDescartar}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: "1px solid rgba(107,114,128,0.45)",
                      background: "rgba(107,114,128,0.1)",
                      color: "#6b7280",
                      fontWeight: 700,
                      fontFamily: FONT.body,
                      cursor: "pointer",
                    }}
                  >
                    Descartar
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div role="tabpanel" id="panel-fig-detalhe-historico" aria-labelledby="tab-fig-detalhe-historico" tabIndex={0}>
          {loadingHist ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "24px 0", color: t.textMuted }}>
              <Loader2 className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" size={18} aria-hidden />
              <span style={{ fontFamily: FONT.body, fontSize: 13 }}>Carregando histórico…</span>
            </div>
          ) : histErro ? (
            <div role="alert" aria-live="polite" style={{ padding: "24px 0", textAlign: "center", color: "#e84025", fontSize: 13, fontFamily: FONT.body }}>
              {histErro}
            </div>
          ) : histStatus.length === 0 ? (
            <div style={{ padding: "28px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
              Sem histórico de alterações de status.
            </div>
          ) : (
            <div className="app-table-wrap" style={getDataTableWrapStyle()}>
              <table style={getDataTableStyle()}>
                <caption style={{ display: "none" }}>Histórico de alterações de status da peça</caption>
                <thead>
                  <tr>
                    <th scope="col" style={dataTable.thHeader}>
                      Data/Hora
                    </th>
                    <th scope="col" style={dataTable.thHeader}>
                      Status
                    </th>
                    <th scope="col" style={dataTable.thHeader}>
                      Registrado por
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...histStatus]
                    .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())
                    .map((h, i) => {
                      const zebra = dataTable.zebraRow(i);
                      return (
                      <tr
                        key={h.id}
                        style={{ background: zebra }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = tableRowHoverBg(t.isDark);
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = zebra;
                        }}
                      >
                        <td style={dataTable.tdCenter}>{fmtDataHora(h.changed_at)}</td>
                        <td style={dataTable.tdCenter}>
                          {labelStatusHistorico(h.previous_status)} → {labelStatusHistorico(h.new_status)}
                        </td>
                        <td style={dataTable.tdCenter}>{h.changed_by}</td>
                      </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </ModalBase>
  );
}
