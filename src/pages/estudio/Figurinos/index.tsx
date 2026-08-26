import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, Loader2, ScanLine } from "lucide-react"
import { supabase } from "../../../lib/supabase"
import { useApp } from "../../../context/AppContext"
import { useDashboardBrand } from "../../../hooks/useDashboardBrand"
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros"
import { usePermission } from "../../../hooks/usePermission"
import { useIdentidadeEfetiva } from "../../../hooks/useIdentidadeEfetiva"
import { useRouteTab } from "../../../hooks/useRouteTab"
import { FONT } from "../../../constants/theme"
import { FONT_TITLE } from "../../../lib/dashboardConstants"
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles"
import { useDataTableBlock } from "../../../hooks/useDataTableBlock"
import { buscarRhFuncionarioIdsPorEmailLogin } from "../../../lib/rhFuncionarioLoginMatch"
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina"
import { PageHeader } from "../../../components/PageHeader"
import { PageMenuIcon } from "../../../components/PageMenuIcon"
import { AjudaContextualAcoes, type AjudaContextualTutorial } from "../../../components/AjudaContextualAcoes"
import { TUTORIAL_FIGURINO_RETIRADA_DEVOLUCAO } from "../../geral/Ajuda/tutoriais/figurinoRetiradaDevolucao"
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu"
import { PAGE_SEARCH } from "../../../lib/searchBarConstants"
import { textoContemBusca } from "../../../lib/searchText"
import { CtaCriarButton } from "../../../components/CtaCriarButton"
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles"
import {
  FiltroFigurinosCategoriaSelect,
  FiltroFigurinosTamanhoSelect,
  FiltroFigurinosCorSelect,
  FiltroFigurinosGeneroSelect,
  FiltroBarTabButton,
  SortTableTh,
  type SortDir,
} from "../../../components/dashboard"
import { FiltroEstudioSelect } from "../../../components/FiltroEstudioSelect"
import {
  buildOperadoraParaEstudioMap,
  FILTRO_STAFF_ESTUDIO_TODOS,
} from "../../rh/GestaoStaff/gestaoStaffEstudioHelpers"
import { onFiltroBarTabsKeyDown } from "../../../lib/filterBarStyles"
import { getPageFilterBoxStyle, getPageKpiSectionGapStyle } from "../../../lib/pageContentBoxStyles"
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal"
import { compareCondicaoPeca, compareLocaleTexto } from "../../../lib/classificacaoSort"
import { type RhFigurinoEmprestimo, type RhFigurinoPeca, type RhFigurinoStatusHist } from "./types"
import { CATEGORIAS, TAMANHOS, CORES, GENEROS, COR_PADRAO, GENERO_PADRAO, emptyMsgAba, labelAba, labelStatusPeca, labelTipoRetirada, pecaPertenceAbaFigurino, FIGURINO_ESTUDIO_CADASTRO_STAFF_LABEL, FIGURINO_FILTRO_STAFF } from "./figurinosConstants";
import { FIGURINOS_ABAS, FIGURINOS_TAB_ICONS } from "./figurinosTabConfig";
import {
  actorLabel,
  ctaButtonContent,
  emprestimoFigurinoEhDoProprioLogin,
  fmtDataHora,
  labelCondicaoPeca,
  labelEmprestadoParaTabela,
  labelEstudiosPeca,
  normNomeParaFiltroPrestadorFig,
  pecaPassaFiltroEstudio,
  tableRowHoverBg,
} from "./figurinosPageHelpers"
import { ModalCadastroPeca } from "./ModalCadastroPeca"
import { ModalDescartarPeca } from "./ModalDescartarPeca"
import { ModalDetalhe } from "./ModalDetalhe"
import { ModalDevolucao } from "./ModalDevolucao"
import { ModalManutencaoPeca } from "./ModalManutencaoPeca"
import { ModalRetirada } from "./ModalRetirada"
import { ModalScanner } from "./ModalScanner"
import { ModalSucessoCadastro } from "./ModalSucessoCadastro"

const TUTORIAL_CTX_FIGURINOS: AjudaContextualTutorial = {
  id: TUTORIAL_FIGURINO_RETIRADA_DEVOLUCAO.id,
  urlSlug: TUTORIAL_FIGURINO_RETIRADA_DEVOLUCAO.urlSlug,
  titulo: TUTORIAL_FIGURINO_RETIRADA_DEVOLUCAO.titulo,
  descricao: "Retirada e devolução manual ou por bipagem, com classificação da peça.",
};

export default function FigurinosPage() {
  const { theme: t, user } = useApp();
  const { email: emailEfetivo, name: nomeEfetivo, role: roleEfetivo } = useIdentidadeEfetiva();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const { operadoraSlugsForcado } = useDashboardFiltros();
  const perm = usePermission("rh_figurinos");

  const [rhPrestadorIdsLogin, setRhPrestadorIdsLogin] = useState<string[]>([]);
  const [loadingRhPrestadorMatch, setLoadingRhPrestadorMatch] = useState(false);

  const [pecas, setPecas] = useState<RhFigurinoPeca[]>([]);
  const [empPorItem, setEmpPorItem] = useState<Record<string, RhFigurinoEmprestimo>>({});
  const [estudios, setEstudios] = useState<{ slug: string; nome: string }[]>([]);
  const [estudiosNome, setEstudiosNome] = useState<Record<string, string>>({});
  const [opParaEstudio, setOpParaEstudio] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useRouteTab(
    "rh_figurinos",
    "available",
    ["available", "borrowed", "fixed", "maintenance", "discarded"] as const,
  );
  const [filtroEstudio, setFiltroEstudio] = useState(FILTRO_STAFF_ESTUDIO_TODOS);
  const [busca, setBusca] = useState("");
  const [filtroCat, setFiltroCat] = useState<string>("todas");
  const [filtroTam, setFiltroTam] = useState<string>("todas");
  const [filtroCor, setFiltroCor] = useState<string>("todas");
  const [filtroGenero, setFiltroGenero] = useState<string>("todas");
  type FigSortCol =
    | "codigo"
    | "estudio"
    | "categoria"
    | "tamanho"
    | "cor"
    | "genero"
    | "data_aqui"
    | "cond"
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

  const estudioSlugsForcado = useMemo(() => {
    if (!operadoraSlugsForcado?.length) return null;
    const set = new Set<string>();
    for (const op of operadoraSlugsForcado) {
      const e = opParaEstudio[op];
      if (e) set.add(e);
    }
    return set.size > 0 ? [...set] : null;
  }, [operadoraSlugsForcado, opParaEstudio]);

  const carregarEstudios = useCallback(async () => {
    const { data } = await supabase
      .from("estudios_spin")
      .select("slug, nome, tipo, estudios_spin_operadoras(operadora_slug)")
      .eq("ativo", true);
    const nomeMap: Record<string, string> = {};
    const opts: { slug: string; nome: string }[] = [];
    const junctionFlat: { operadora_slug: string; estudio_slug: string; tipo: string }[] = [];
    for (const raw of data ?? []) {
      const e = raw as {
        slug: string;
        nome: string;
        tipo: string;
        estudios_spin_operadoras: { operadora_slug: string } | { operadora_slug: string }[] | null;
      };
      nomeMap[e.slug] = e.nome;
      opts.push({ slug: e.slug, nome: e.nome });
      const joins = e.estudios_spin_operadoras;
      const list = joins == null ? [] : Array.isArray(joins) ? joins : [joins];
      for (const j of list) {
        junctionFlat.push({
          operadora_slug: j.operadora_slug,
          estudio_slug: e.slug,
          tipo: e.tipo,
        });
      }
    }
    const opMap = buildOperadoraParaEstudioMap(junctionFlat);
    setEstudiosNome(nomeMap);
    setEstudios(opts.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
    setOpParaEstudio(opMap);
    return opMap;
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErroGlobal(null);
    await carregarEstudios();
    const selEmbed =
      "*, rh_figurino_peca_estudios(estudio_slug), rh_figurino_peca_operadoras(operadora_slug)";
    const q = supabase.from("rh_figurino_pecas").select(selEmbed).order("created_at", { ascending: false });
    const [pr, er] = await Promise.all([
      q,
      supabase.from("rh_figurino_emprestimos").select("*").eq("status", "active").limit(500),
    ]);
    if (pr.error) {
      console.error("[Figurinos] Erro ao carregar inventário:", pr.error);
      setErroGlobal("Não foi possível carregar o inventário. Se o problema persistir, entre em contato com o suporte.");
    }
    setPecas((pr.data ?? []) as RhFigurinoPeca[]);
    const emps = (er.data ?? []) as RhFigurinoEmprestimo[];
    const map: Record<string, RhFigurinoEmprestimo> = {};
    emps.forEach((e) => {
      map[e.item_id] = e;
    });
    setEmpPorItem(map);
    setLoading(false);
  }, [carregarEstudios]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (perm.canView !== "proprios" || !emailEfetivo?.trim()) {
      setRhPrestadorIdsLogin([]);
      setLoadingRhPrestadorMatch(false);
      return;
    }
    let cancelled = false;
    setLoadingRhPrestadorMatch(true);
    void buscarRhFuncionarioIdsPorEmailLogin(emailEfetivo).then((ids) => {
      if (!cancelled) {
        setRhPrestadorIdsLogin(ids);
        setLoadingRhPrestadorMatch(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [perm.canView, emailEfetivo]);

  useEffect(() => {
    if (roleEfetivo === "operador" && estudioSlugsForcado?.length === 1) {
      setFiltroEstudio(estudioSlugsForcado[0]!);
    }
  }, [roleEfetivo, estudioSlugsForcado]);

  const estudioNome = useCallback(
    (slug: string) => estudiosNome[slug] ?? slug,
    [estudiosNome],
  );

  const estudiosVisiveis = useMemo(() => {
    if (estudioSlugsForcado?.length) {
      return estudios.filter((e) => estudioSlugsForcado.includes(e.slug));
    }
    return estudios;
  }, [estudios, estudioSlugsForcado]);

  const passaFiltroBloco = useCallback(
    (p: RhFigurinoPeca) => {
      if (!pecaPassaFiltroEstudio(p, filtroEstudio, FILTRO_STAFF_ESTUDIO_TODOS, opParaEstudio)) {
        return false;
      }
      if (filtroCat !== "todas" && p.category !== filtroCat) return false;
      if (filtroTam !== "todas" && p.size !== filtroTam) return false;
      if (filtroCor !== "todas" && (p.cor ?? COR_PADRAO) !== filtroCor) return false;
      if (filtroGenero !== "todas" && (p.genero ?? GENERO_PADRAO) !== filtroGenero) return false;
      return true;
    },
    [filtroEstudio, filtroCat, filtroTam, filtroCor, filtroGenero, opParaEstudio],
  );

  const pecasComFiltroTopo = useMemo(() => pecas.filter(passaFiltroBloco), [pecas, passaFiltroBloco]);

  const rhPrestadorIdsSet = useMemo(() => new Set(rhPrestadorIdsLogin), [rhPrestadorIdsLogin]);
  const nomeUsuarioFigNorm = useMemo(() => normNomeParaFiltroPrestadorFig(nomeEfetivo), [nomeEfetivo]);

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

  const pecasFiltradas = useMemo(() => {
    return pecasVisiveisPermissao.filter((p) => {
      const emp = empPorItem[p.id];
      if (!pecaPertenceAbaFigurino(p.status, aba, emp?.withdrawal_type)) return false;
      if (!busca.trim()) return true;
      const estNames = labelEstudiosPeca(p, estudioNome, opParaEstudio);
      const hay = `${p.code} ${p.barcode} ${p.category} ${estNames} ${emp?.borrower_name ?? ""} ${emp?.borrower_ref ?? ""} ${labelTipoRetirada(emp?.withdrawal_type)}`;
      return textoContemBusca(hay, busca);
    });
  }, [pecasVisiveisPermissao, aba, busca, empPorItem, estudioNome, opParaEstudio]);

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
        case "estudio":
          c = compareLocaleTexto(
            labelEstudiosPeca(a, estudioNome, opParaEstudio).toLowerCase(),
            labelEstudiosPeca(b, estudioNome, opParaEstudio).toLowerCase(),
            dir,
          );
          break;
        case "categoria":
          c = compareLocaleTexto(a.category, b.category, dir);
          break;
        case "tamanho":
          c = compareLocaleTexto(a.size, b.size, dir);
          break;
        case "cor":
          c = compareLocaleTexto(a.cor ?? COR_PADRAO, b.cor ?? COR_PADRAO, dir);
          break;
        case "genero":
          c = compareLocaleTexto(a.genero ?? GENERO_PADRAO, b.genero ?? GENERO_PADRAO, dir);
          break;
        case "data_aqui":
          c = compareLocaleTexto(a.purchase_date ?? "", b.purchase_date ?? "", dir);
          break;
        case "cond":
          c = compareCondicaoPeca(a.condition, b.condition, dir);
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
  }, [pecasFiltradas, sortFig, empPorItem, estudioNome, opParaEstudio]);

  const pecasNaAbaComFiltroTopo = useMemo(
    () =>
      pecasVisiveisPermissao.filter((p) =>
        pecaPertenceAbaFigurino(p.status, aba, empPorItem[p.id]?.withdrawal_type),
      ),
    [pecasVisiveisPermissao, aba, empPorItem],
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
      setHistErro("Não foi possível carregar o histórico desta peça. Se o problema persistir, entre em contato com o suporte.");
    } else {
      setHistStatus((e2.data ?? []) as RhFigurinoStatusHist[]);
    }
    setLoadingHist(false);
  };

  const resolverCodigo = async (texto: string): Promise<RhFigurinoPeca | null> => {
    const raw = texto.trim();
    if (!raw) return null;
    const emb = "*, rh_figurino_peca_estudios(estudio_slug), rh_figurino_peca_operadoras(operadora_slug)";
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
            <FiltroEstudioSelect
              pill
              minWidth={200}
              value={filtroEstudio}
              onChange={setFiltroEstudio}
              estudios={estudiosVisiveis}
              extraOptions={[{ value: FIGURINO_FILTRO_STAFF, label: FIGURINO_ESTUDIO_CADASTRO_STAFF_LABEL }]}
            />
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
            <FiltroFigurinosCorSelect
              pill
              minWidth={200}
              value={filtroCor}
              onChange={setFiltroCor}
              cores={CORES}
            />
            <FiltroFigurinosGeneroSelect
              pill
              minWidth={200}
              value={filtroGenero}
              onChange={setFiltroGenero}
              generos={GENEROS}
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
            className="app-filter-bar-tabs-cta"
            style={{ paddingTop: 12, marginTop: 4, borderTop: `1px solid ${t.cardBorder}` }}
          >
            <span className="app-filter-bar-tabs-cta__spacer" aria-hidden="true" />
            <div
              role="tablist"
              aria-label="Status do inventário"
              className="app-filter-bar-tabs-cta__tabs"
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
            <div className="app-filter-bar-tabs-cta__actions">
              <AjudaContextualAcoes pageKey="rh_figurinos" tutorial={TUTORIAL_CTX_FIGURINOS} />
            </div>
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
                      {sortHeader("Estúdio", "estudio")}
                      {sortHeader("Categoria", "categoria")}
                      {sortHeader("Tamanho", "tamanho")}
                      {sortHeader("Cor", "cor")}
                      {sortHeader("Gênero", "genero")}
                      {sortHeader("Classificação", "cond")}
                      <th scope="col" style={dataTable.thHeader}>
                        Ações
                      </th>
                    </>
                  ) : null}
                  {aba === "borrowed" || aba === "fixed" ? (
                    <>
                      {sortHeader("Código", "codigo")}
                      {sortHeader("Estúdio", "estudio")}
                      {sortHeader("Categoria", "categoria")}
                      {sortHeader("Tamanho", "tamanho")}
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
                      {sortHeader("Estúdio", "estudio")}
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
                      {sortHeader("Estúdio", "estudio")}
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
                          <td style={{ ...dataTable.tdCenter, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }} title={labelEstudiosPeca(p, estudioNome, opParaEstudio)}>
                            {labelEstudiosPeca(p, estudioNome, opParaEstudio)}
                          </td>
                          <td style={dataTable.tdCenter}>{p.category}</td>
                          <td style={dataTable.tdCenter}>{p.size}</td>
                          <td style={dataTable.tdCenter}>{p.cor ?? COR_PADRAO}</td>
                          <td style={dataTable.tdCenter}>{p.genero ?? GENERO_PADRAO}</td>
                          <td style={dataTable.tdCenter}>{labelCondicaoPeca(p.condition)}</td>
                          <td style={dataTable.tdCenter}>
                            <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 6, whiteSpace: "nowrap" }}>
                            {podeEditar || podeCriar ? (
                              <>
                                {podeEditar ? (
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
                                ) : null}
                                {podeCriar ? (
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
                                ) : null}
                              </>
                            ) : (
                              "—"
                            )}
                            </div>
                          </td>
                        </>
                      ) : null}
                      {aba === "borrowed" || aba === "fixed" ? (
                        <>
                          <td style={dataTable.tdCenter}>{renderCodigoClicavel(p)}</td>
                          <td style={{ ...dataTable.tdCenter, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }} title={labelEstudiosPeca(p, estudioNome, opParaEstudio)}>
                            {labelEstudiosPeca(p, estudioNome, opParaEstudio)}
                          </td>
                          <td style={dataTable.tdCenter}>{p.category}</td>
                          <td style={dataTable.tdCenter}>{p.size}</td>
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
                          <td style={{ ...dataTable.tdCenter, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }} title={labelEstudiosPeca(p, estudioNome, opParaEstudio)}>
                            {labelEstudiosPeca(p, estudioNome, opParaEstudio)}
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
                            {podeCriar ? (
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
                          <td style={{ ...dataTable.tdCenter, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }} title={labelEstudiosPeca(p, estudioNome, opParaEstudio)}>
                            {labelEstudiosPeca(p, estudioNome, opParaEstudio)}
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
          estudios={estudiosVisiveis}
          estudioSlugsForcado={estudioSlugsForcado}
          actor={actorLabel(user)}
          onCreated={async (row) => {
            const { data } = await supabase
              .from("rh_figurino_pecas")
              .select("*, rh_figurino_peca_estudios(estudio_slug), rh_figurino_peca_operadoras(operadora_slug)")
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
          estudiosTexto={labelEstudiosPeca(pecaNova, estudioNome, opParaEstudio)}
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
          resumoEstudios={labelEstudiosPeca(empPeca, estudioNome, opParaEstudio)}
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
          resumoEstudios={labelEstudiosPeca(devPeca, estudioNome, opParaEstudio)}
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

      {manutPeca && podeCriar ? (
        <ModalManutencaoPeca
          peca={manutPeca}
          resumoEstudios={labelEstudiosPeca(manutPeca, estudioNome, opParaEstudio)}
          actor={actorLabel(user)}
          onClose={() => setManutPeca(null)}
          onOk={async () => {
            setManutPeca(null);
            await carregar();
          }}
        />
      ) : null}

      {descPeca && podeCriar ? (
        <ModalDescartarPeca
          peca={descPeca}
          resumoEstudios={labelEstudiosPeca(descPeca, estudioNome, opParaEstudio)}
          actor={actorLabel(user)}
          onClose={() => setDescPeca(null)}
          onOk={async () => {
            setDescPeca(null);
            await carregar();
          }}
        />
      ) : null}

      {concluirManutPeca && podeCriar ? (
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
                  setErroGlobal("Não foi possível disponibilizar a peça. Se o problema persistir, entre em contato com o suporte.");
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
          estudiosTexto={labelEstudiosPeca(detalhe, estudioNome, opParaEstudio)}
          histStatus={histStatus}
          histErro={histErro}
          loadingHist={loadingHist}
          empAtivo={empPorItem[detalhe.id]}
          podeEditar={podeEditar}
          podeCriar={podeCriar}
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
