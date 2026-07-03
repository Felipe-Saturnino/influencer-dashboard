import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  BookOpen,
  Gamepad2,
  GraduationCap,
  Image,
  LayoutGrid,
  Loader2,
  Megaphone,
  MessageCircle,
  Newspaper,
  Settings2,
} from "lucide-react";
import { stripHtmlText, type AcademyPostagemStatus } from "../../../lib/academyPortalWorkflow";
import { normalizarTextoBusca } from "../../../lib/searchText";
import { autorIdPostagem, carregarMetaAutoresPortalAcademy, type AcademyPortalAutorInfo } from "../../../lib/academyPortalAutorMeta";
import { GerenciamentoPostagens, GerenciamentoPostagensFiltrosTipoStatus } from "./GerenciamentoPostagens";
import { buildMesesCarrossel, itemNoMesCarrossel, type MesCarrosselEntry } from "./portalAcademyCarrossel";
import { PortalAcademyBlocoFiltros } from "./PortalAcademyBlocoFiltros";
import { PostagemAcademyCard } from "./PortalAcademyCards";
import { ModalLerConteudo } from "./ModalLerConteudo";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { PAGE_SEARCH } from "../../../lib/searchBarConstants";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { FiltroBarTabButton, onFiltroBarTabsKeyDown } from "../../../components/dashboard";
import { FILTRO_BAR_TAB_ICON_PROPS } from "../../../lib/filterBarStyles";
import { getPageContentBoxStyle, getPageContentBoxShadow } from "../../../lib/pageContentBoxStyles";
import type { AcademyPostagemTipoUi } from "../../../lib/academyPortalWorkflow";

type AbaPortal = "comunicados" | "dicas" | "manuais" | "gerenciamento";

function isPostagemPublica(status: AcademyPostagemStatus | string | null | undefined): boolean {
  return !status || status === "publicado";
}

type AcademyPortalCategoria = {
  id: string;
  slug: string;
  label: string;
  scope: "comunicado" | "dica" | "manual";
  accent_hex: string;
  sort_order: number;
};

type PostagemBase = {
  id: string;
  titulo: string;
  corpo: string;
  categoria_id: string;
  published_at: string | null;
  published_by: string | null;
  created_by?: string | null;
  imagem_storage_path?: string | null;
  anexo_storage_path?: string | null;
  anexo_nome?: string | null;
  status?: AcademyPostagemStatus | null;
  categoria?: AcademyPortalCategoria | null;
};

type ManualRow = PostagemBase & { introducao: string };

type SubtabCategoriaConfig = {
  key: string;
  label: string;
  slugs: string[];
};

const SUBTABS_COMUNICADO: SubtabCategoriaConfig[] = [
  { key: "treinamentos", label: "Treinamentos", slugs: ["treinamentos"] },
  { key: "geral", label: "Geral", slugs: ["geral"] },
];

const SUBTABS_DICA_MANUAL: SubtabCategoriaConfig[] = [
  { key: "jogos", label: "Jogos", slugs: ["jogos"] },
  { key: "imagem", label: "Imagem", slugs: ["imagem"] },
  { key: "comunicacao", label: "Comunicação", slugs: ["comunicacao"] },
  { key: "geral", label: "Geral", slugs: ["geral"] },
];

const SUBTAB_ICONS: Record<string, ReactNode> = {
  todos: <LayoutGrid {...FILTRO_BAR_TAB_ICON_PROPS} />,
  treinamentos: <GraduationCap {...FILTRO_BAR_TAB_ICON_PROPS} />,
  geral: <Megaphone {...FILTRO_BAR_TAB_ICON_PROPS} />,
  jogos: <Gamepad2 {...FILTRO_BAR_TAB_ICON_PROPS} />,
  imagem: <Image {...FILTRO_BAR_TAB_ICON_PROPS} />,
  comunicacao: <MessageCircle {...FILTRO_BAR_TAB_ICON_PROPS} />,
};

const ERRO_CARREGAR =
  "Não foi possível carregar o portal. Se o problema persistir, entre em contato com o suporte.";

function tabsPortalKeys(canEditarOk: boolean): AbaPortal[] {
  const keys: AbaPortal[] = ["comunicados", "dicas", "manuais"];
  if (canEditarOk) keys.push("gerenciamento");
  return keys;
}

function onPortalTabsKeyDown(
  e: KeyboardEvent,
  abaAtiva: AbaPortal,
  setAba: (key: AbaPortal) => void,
  canEditarOk: boolean,
) {
  const tabs = tabsPortalKeys(canEditarOk);
  const idx = tabs.indexOf(abaAtiva);
  if (idx < 0) return;
  if (e.key === "ArrowRight") {
    e.preventDefault();
    const next = tabs[(idx + 1) % tabs.length];
    setAba(next);
    document.getElementById(`tab-academy-portal-${next}`)?.focus();
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
    setAba(prev);
    document.getElementById(`tab-academy-portal-${prev}`)?.focus();
  }
}

function resolveCategoriaTab(cats: AcademyPortalCategoria[], config: SubtabCategoriaConfig): AcademyPortalCategoria | null {
  for (const slug of config.slugs) {
    const found = cats.find((c) => c.slug === slug);
    if (found) return found;
  }
  return cats.find((c) => c.label.toLowerCase() === config.label.toLowerCase()) ?? null;
}

function itemNaSubtabCategoria(categoria: AcademyPortalCategoria | null | undefined, config: SubtabCategoriaConfig): boolean {
  if (!categoria) return false;
  return config.slugs.includes(categoria.slug);
}

function FiltroSubtabPills({
  filtroAtivo,
  onFiltro,
  configs,
  categorias,
  idPrefix,
}: {
  filtroAtivo: string;
  onFiltro: (key: string) => void;
  configs: SubtabCategoriaConfig[];
  categorias: AcademyPortalCategoria[];
  idPrefix: string;
}) {
  const tabKeys = ["todos", ...configs.map((c) => c.key)] as const;

  return (
    <div
      role="tablist"
      aria-label="Filtrar por categoria"
      style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", width: "100%" }}
      onKeyDown={(e) => onFiltroBarTabsKeyDown(e, tabKeys, onFiltro, (k) => `tab-${idPrefix}-${k}`)}
    >
      <FiltroBarTabButton
        id={`tab-${idPrefix}-todos`}
        active={filtroAtivo === "todos"}
        onClick={() => onFiltro("todos")}
        icon={SUBTAB_ICONS.todos}
      >
        Todos
      </FiltroBarTabButton>
      {configs.map((cfg) => {
        const cat = resolveCategoriaTab(categorias, cfg);
        return (
          <FiltroBarTabButton
            key={cfg.key}
            id={`tab-${idPrefix}-${cfg.key}`}
            active={filtroAtivo === cfg.key}
            onClick={() => onFiltro(cfg.key)}
            activeColor={cat?.accent_hex}
            icon={SUBTAB_ICONS[cfg.key] ?? <BookOpen {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            {cfg.label}
          </FiltroBarTabButton>
        );
      })}
    </div>
  );
}

function filtrarListaPortal<T extends PostagemBase>(
  list: T[],
  filtroCat: string,
  configs: SubtabCategoriaConfig[],
  meses: MesCarrosselEntry[],
  idxMes: number,
  modoHistorico: boolean,
  buscaDeb: string,
  hitBuscaTexto: (s: string | null | undefined) => boolean,
  hitBuscaCorpo: (html: string | null | undefined) => boolean,
): T[] {
  let out = list.filter((c) => isPostagemPublica(c.status));
  if (!modoHistorico) {
    const mesSel = meses[idxMes];
    out = out.filter((c) => itemNoMesCarrossel(c.published_at, mesSel));
  }
  if (filtroCat !== "todos") {
    const cfg = configs.find((x) => x.key === filtroCat);
    if (cfg) out = out.filter((c) => itemNaSubtabCategoria(c.categoria, cfg));
  }
  if (buscaDeb) {
    out = out.filter(
      (c) =>
        hitBuscaTexto(c.titulo) ||
        hitBuscaCorpo(c.corpo) ||
        hitBuscaTexto(c.categoria?.label) ||
        hitBuscaTexto((c as { jogo_mesa?: string }).jogo_mesa),
    );
  }
  return [...out].sort(
    (a, b) => new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime(),
  );
}

export default function PortalAcademyPage() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("academy_portal");

  const [aba, setAba] = useRouteTab(
    "academy_portal",
    "comunicados",
    ["comunicados", "dicas", "manuais", "gerenciamento"] as const,
  );
  const [busca, setBusca] = useState("");
  const [buscaDeb, setBuscaDeb] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [categoriasCom, setCategoriasCom] = useState<AcademyPortalCategoria[]>([]);
  const [categoriasDica, setCategoriasDica] = useState<AcademyPortalCategoria[]>([]);
  const [categoriasManual, setCategoriasManual] = useState<AcademyPortalCategoria[]>([]);
  const [comunicados, setComunicados] = useState<PostagemBase[]>([]);
  const [dicas, setDicas] = useState<(PostagemBase & { jogo_mesa?: string | null })[]>([]);
  const [manuais, setManuais] = useState<(ManualRow & { jogo_mesa?: string | null })[]>([]);
  const [metaAutores, setMetaAutores] = useState<Record<string, AcademyPortalAutorInfo>>({});

  const [filtroCatCom, setFiltroCatCom] = useState("todos");
  const [filtroCatDica, setFiltroCatDica] = useState("todos");
  const [filtroCatManual, setFiltroCatManual] = useState("todos");
  const [idxMesCom, setIdxMesCom] = useState(0);
  const [idxMesDica, setIdxMesDica] = useState(0);
  const [idxMesManual, setIdxMesManual] = useState(0);
  const [idxMesGer, setIdxMesGer] = useState(0);
  const [mesesGer, setMesesGer] = useState<MesCarrosselEntry[]>(() => buildMesesCarrossel([]));
  const [filtroTipoGer, setFiltroTipoGer] = useState<"todos" | AcademyPostagemTipoUi>("todos");
  const [filtroStatusGer, setFiltroStatusGer] = useState<"todos" | AcademyPostagemStatus>("todos");
  const [modoHistorico, setModoHistorico] = useState(false);
  const abrirCriarGerenciamentoRef = useRef<(() => void) | null>(null);

  const [modalManual, setModalManual] = useState<ManualRow | null>(null);

  const cardShadow = getPageContentBoxShadow(t.isDark);
  const pageBox = getPageContentBoxStyle(brand, t);

  useEffect(() => {
    const id = window.setTimeout(() => setBuscaDeb(normalizarTextoBusca(busca)), 300);
    return () => window.clearTimeout(id);
  }, [busca]);

  const carregar = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setErro(null);

    const [catRes, comRes, dicaRes, manualRes] = await Promise.all([
      supabase.from("academy_portal_categoria").select("*").order("sort_order", { ascending: true }),
      supabase.from("academy_portal_comunicado").select("*, categoria:academy_portal_categoria(*)").order("published_at", { ascending: false }),
      supabase.from("academy_portal_dica").select("*, categoria:academy_portal_categoria(*)").order("published_at", { ascending: false }),
      supabase.from("academy_portal_manual").select("*, categoria:academy_portal_categoria(*)").order("published_at", { ascending: false }),
    ]);

    if (catRes.error || comRes.error || dicaRes.error || manualRes.error) {
      console.error("[PortalAcademy] carregar:", catRes.error ?? comRes.error ?? dicaRes.error ?? manualRes.error);
      setErro(ERRO_CARREGAR);
      setLoading(false);
      return;
    }

    const cats = (catRes.data ?? []) as AcademyPortalCategoria[];
    setCategoriasCom(cats.filter((c) => c.scope === "comunicado"));
    setCategoriasDica(cats.filter((c) => c.scope === "dica"));
    setCategoriasManual(cats.filter((c) => c.scope === "manual"));

    const visivel = (status: AcademyPostagemStatus | null | undefined) => isPostagemPublica(status);

    const comRows = ((comRes.data ?? []) as PostagemBase[]).filter((c) => visivel(c.status));
    const dicaRows = ((dicaRes.data ?? []) as (PostagemBase & { jogo_mesa?: string | null })[]).filter((d) =>
      visivel(d.status),
    );
    const manualRows = ((manualRes.data ?? []) as (ManualRow & { jogo_mesa?: string | null })[]).filter((m) =>
      visivel(m.status),
    );

    setComunicados(comRows);
    setDicas(dicaRows);
    setManuais(manualRows);

    const userIds = new Set<string>();
    for (const row of [...comRows, ...dicaRows, ...manualRows]) {
      const aid = autorIdPostagem(row);
      if (aid) userIds.add(aid);
    }
    setMetaAutores(await carregarMetaAutoresPortalAcademy([...userIds]));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao" || !user?.id) return;
    void carregar();
  }, [carregar, perm.loading, perm.canView, user?.id]);

  useEffect(() => {
    if (perm.loading) return;
    if (!perm.canEditarOk && aba === "gerenciamento") setAba("comunicados");
  }, [perm.loading, perm.canEditarOk, aba, setAba]);

  useEffect(() => {
    if (aba === "gerenciamento") return;
    setModoHistorico(false);
    setBusca("");
    setBuscaDeb("");
  }, [aba]);

  const hitBuscaTexto = useCallback(
    (s: string | null | undefined) => !buscaDeb || normalizarTextoBusca(s).includes(buscaDeb),
    [buscaDeb],
  );

  const hitBuscaCorpo = useCallback(
    (html: string | null | undefined) =>
      !buscaDeb || normalizarTextoBusca(stripHtmlText(html ?? "")).includes(buscaDeb),
    [buscaDeb],
  );

  const mesesCom = useMemo(() => buildMesesCarrossel(comunicados.map((c) => ({ iso: c.published_at }))), [comunicados]);
  const mesesDica = useMemo(() => buildMesesCarrossel(dicas.map((d) => ({ iso: d.published_at }))), [dicas]);
  const mesesManual = useMemo(() => buildMesesCarrossel(manuais.map((m) => ({ iso: m.published_at }))), [manuais]);

  useEffect(() => {
    setIdxMesCom((i) => Math.min(i, Math.max(0, mesesCom.length - 1)));
  }, [mesesCom.length]);
  useEffect(() => {
    setIdxMesDica((i) => Math.min(i, Math.max(0, mesesDica.length - 1)));
  }, [mesesDica.length]);
  useEffect(() => {
    setIdxMesManual((i) => Math.min(i, Math.max(0, mesesManual.length - 1)));
  }, [mesesManual.length]);

  useEffect(() => {
    if (comunicados.length > 0 && mesesCom.length > 0) setIdxMesCom(mesesCom.length - 1);
  }, [comunicados.length, mesesCom.length]);
  useEffect(() => {
    if (dicas.length > 0 && mesesDica.length > 0) setIdxMesDica(mesesDica.length - 1);
  }, [dicas.length, mesesDica.length]);
  useEffect(() => {
    if (manuais.length > 0 && mesesManual.length > 0) setIdxMesManual(mesesManual.length - 1);
  }, [manuais.length, mesesManual.length]);

  const filtroCarrossel = useMemo(() => {
    switch (aba) {
      case "dicas":
        return { meses: mesesDica, idx: idxMesDica, setIdx: setIdxMesDica };
      case "manuais":
        return { meses: mesesManual, idx: idxMesManual, setIdx: setIdxMesManual };
      case "gerenciamento":
        return { meses: mesesGer, idx: idxMesGer, setIdx: setIdxMesGer };
      default:
        return { meses: mesesCom, idx: idxMesCom, setIdx: setIdxMesCom };
    }
  }, [aba, mesesCom, mesesDica, mesesManual, mesesGer, idxMesCom, idxMesDica, idxMesManual, idxMesGer]);

  const comunicadosLista = useMemo(
    () => filtrarListaPortal(comunicados, filtroCatCom, SUBTABS_COMUNICADO, mesesCom, idxMesCom, modoHistorico, buscaDeb, hitBuscaTexto, hitBuscaCorpo),
    [comunicados, filtroCatCom, modoHistorico, mesesCom, idxMesCom, buscaDeb, hitBuscaTexto, hitBuscaCorpo],
  );

  const dicasLista = useMemo(
    () => filtrarListaPortal(dicas, filtroCatDica, SUBTABS_DICA_MANUAL, mesesDica, idxMesDica, modoHistorico, buscaDeb, hitBuscaTexto, hitBuscaCorpo),
    [dicas, filtroCatDica, modoHistorico, mesesDica, idxMesDica, buscaDeb, hitBuscaTexto, hitBuscaCorpo],
  );

  const manuaisLista = useMemo(
    () => filtrarListaPortal(manuais, filtroCatManual, SUBTABS_DICA_MANUAL, mesesManual, idxMesManual, modoHistorico, buscaDeb, hitBuscaTexto, hitBuscaCorpo),
    [manuais, filtroCatManual, modoHistorico, mesesManual, idxMesManual, buscaDeb, hitBuscaTexto, hitBuscaCorpo],
  );

  const linhaAbas = (
    <div
      role="tablist"
      aria-label="Seções do Portal da Academy"
      style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", width: "100%" }}
      onKeyDown={(e) => onPortalTabsKeyDown(e, aba, setAba, perm.canEditarOk)}
    >
      <FiltroBarTabButton
        id="tab-academy-portal-comunicados"
        active={aba === "comunicados"}
        onClick={() => setAba("comunicados")}
        icon={<Megaphone {...FILTRO_BAR_TAB_ICON_PROPS} />}
      >
        Comunicados
      </FiltroBarTabButton>
      <FiltroBarTabButton
        id="tab-academy-portal-dicas"
        active={aba === "dicas"}
        onClick={() => setAba("dicas")}
        icon={<Newspaper {...FILTRO_BAR_TAB_ICON_PROPS} />}
      >
        Dicas
      </FiltroBarTabButton>
      <FiltroBarTabButton
        id="tab-academy-portal-manuais"
        active={aba === "manuais"}
        onClick={() => setAba("manuais")}
        icon={<BookOpen {...FILTRO_BAR_TAB_ICON_PROPS} />}
      >
        Manuais
      </FiltroBarTabButton>
      {perm.canEditarOk ? (
        <FiltroBarTabButton
          id="tab-academy-portal-gerenciamento"
          active={aba === "gerenciamento"}
          onClick={() => setAba("gerenciamento")}
          icon={<Settings2 {...FILTRO_BAR_TAB_ICON_PROPS} />}
        >
          Gerenciamento
        </FiltroBarTabButton>
      ) : null}
    </div>
  );

  const linhaSubabas = useMemo(() => {
    if (aba === "comunicados") {
      return (
        <FiltroSubtabPills
          filtroAtivo={filtroCatCom}
          onFiltro={setFiltroCatCom}
          configs={SUBTABS_COMUNICADO}
          categorias={categoriasCom}
          idPrefix="academy-com"
        />
      );
    }
    if (aba === "dicas") {
      return (
        <FiltroSubtabPills
          filtroAtivo={filtroCatDica}
          onFiltro={setFiltroCatDica}
          configs={SUBTABS_DICA_MANUAL}
          categorias={categoriasDica}
          idPrefix="academy-dica"
        />
      );
    }
    if (aba === "manuais") {
      return (
        <FiltroSubtabPills
          filtroAtivo={filtroCatManual}
          onFiltro={setFiltroCatManual}
          configs={SUBTABS_DICA_MANUAL}
          categorias={categoriasManual}
          idPrefix="academy-manual"
        />
      );
    }
    if (aba === "gerenciamento" && perm.canEditarOk) {
      return (
        <>
          <GerenciamentoPostagensFiltrosTipoStatus
            filtroTipo={filtroTipoGer}
            onFiltroTipoChange={setFiltroTipoGer}
            filtroStatus={filtroStatusGer}
            onFiltroStatusChange={setFiltroStatusGer}
          />
          <CtaCriarButton type="button" onClick={() => abrirCriarGerenciamentoRef.current?.()}>
            Nova Postagem
          </CtaCriarButton>
        </>
      );
    }
    return null;
  }, [aba, filtroCatCom, filtroCatDica, filtroCatManual, categoriasCom, categoriasDica, categoriasManual, filtroTipoGer, filtroStatusGer, perm.canEditarOk]);

  if (perm.loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
          <Loader2 size={24} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 13 }}>Carregando…</div>
        </div>
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  const renderListaVazia = () => (
    <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
      {modoHistorico || buscaDeb ? "Nenhuma postagem encontrada." : "Sem dados para o período selecionado."}
    </div>
  );

  return (
    <div className="app-page-shell">
      <PageHeader
        icon={<PageMenuIcon pageKey="academy_portal" />}
        title={getPageMenuLabel("academy_portal")}
        subtitle="Comunicados, dicas e manuais de treinamento para a operação."
      />

      <PortalAcademyBlocoFiltros
        meses={filtroCarrossel.meses}
        idxMes={filtroCarrossel.idx}
        onIdxMesChange={(fn) => filtroCarrossel.setIdx(fn)}
        modoHistorico={modoHistorico}
        onModoHistoricoChange={setModoHistorico}
        busca={busca}
        onBuscaChange={setBusca}
        buscaPlaceholder={PAGE_SEARCH.portalAcademy}
        buscaAriaLabel="Pesquisar postagens por palavras-chave"
        linhaAbas={linhaAbas}
        linhaSubabas={linhaSubabas}
      />

      {erro ? (
        <div role="alert" style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body, marginBottom: 14 }}>
          {erro}
        </div>
      ) : null}

      <div
        role="tabpanel"
        id={`panel-academy-portal-${aba}`}
        aria-labelledby={`tab-academy-portal-${aba}`}
        tabIndex={0}
        style={pageBox}
      >
        {loading && aba !== "gerenciamento" ? (
          <div style={{ textAlign: "center", padding: 40, color: t.textMuted, fontFamily: FONT.body }}>
            <Loader2 size={24} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden style={{ marginBottom: 12 }} />
            Carregando…
          </div>
        ) : null}

        {!loading && aba === "comunicados" ? (
          comunicadosLista.length === 0 ? (
            renderListaVazia()
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {comunicadosLista.map((c) => (
                <PostagemAcademyCard
                  key={c.id}
                  titulo={c.titulo}
                  corpo={c.corpo}
                  categoria={c.categoria}
                  imagemStoragePath={c.imagem_storage_path}
                  anexoStoragePath={c.anexo_storage_path}
                  anexoNome={c.anexo_nome}
                  autorInfo={metaAutores[autorIdPostagem(c) ?? ""]}
                  dataPublicacao={c.published_at}
                  cardShadow={cardShadow}
                />
              ))}
            </div>
          )
        ) : null}

        {!loading && aba === "dicas" ? (
          dicasLista.length === 0 ? (
            renderListaVazia()
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {dicasLista.map((d) => (
                <PostagemAcademyCard
                  key={d.id}
                  titulo={d.titulo}
                  corpo={d.corpo}
                  categoria={d.categoria}
                  jogoMesa={d.jogo_mesa}
                  imagemStoragePath={d.imagem_storage_path}
                  anexoStoragePath={d.anexo_storage_path}
                  anexoNome={d.anexo_nome}
                  autorInfo={metaAutores[autorIdPostagem(d) ?? ""]}
                  dataPublicacao={d.published_at}
                  cardShadow={cardShadow}
                />
              ))}
            </div>
          )
        ) : null}

        {!loading && aba === "manuais" ? (
          manuaisLista.length === 0 ? (
            renderListaVazia()
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {manuaisLista.map((m) => (
                <PostagemAcademyCard
                  key={m.id}
                  titulo={m.titulo}
                  corpo={m.corpo}
                  introducao={m.introducao}
                  categoria={m.categoria}
                  jogoMesa={m.jogo_mesa}
                  imagemStoragePath={m.imagem_storage_path}
                  anexoStoragePath={m.anexo_storage_path}
                  anexoNome={m.anexo_nome}
                  autorInfo={metaAutores[autorIdPostagem(m) ?? ""]}
                  dataPublicacao={m.published_at}
                  cardShadow={cardShadow}
                  mostrarBotaoVer
                  onVerCompleto={() => setModalManual(m)}
                />
              ))}
            </div>
          )
        ) : null}

        {aba === "gerenciamento" && perm.canEditarOk ? (
          <GerenciamentoPostagens
            categoriasCom={categoriasCom}
            categoriasDica={categoriasDica}
            categoriasManual={categoriasManual}
            onDadosAlterados={() => void carregar()}
            buscaDeb={buscaDeb}
            modoHistorico={modoHistorico}
            idxMes={idxMesGer}
            mesesDisponiveis={mesesGer}
            filtroTipo={filtroTipoGer}
            filtroStatus={filtroStatusGer}
            onMesesCarrosselChange={setMesesGer}
            onRegisterAbrirCriar={(fn) => {
              abrirCriarGerenciamentoRef.current = fn;
            }}
          />
        ) : null}
      </div>

      {modalManual ? (
        <ModalLerConteudo
          open
          titulo={modalManual.titulo}
          introducao={modalManual.introducao}
          corpo={modalManual.corpo}
          anexoStoragePath={modalManual.anexo_storage_path}
          anexoNome={modalManual.anexo_nome}
          onClose={() => setModalManual(null)}
        />
      ) : null}
    </div>
  );
}
