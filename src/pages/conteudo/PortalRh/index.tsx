import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  Banknote,
  CalendarDays,
  FileText,
  Gift,
  LayoutGrid,
  Loader2,
  Megaphone,
  MessagesSquare,
  Pin,
  Scale,
  Shield,
  SlidersHorizontal,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { stripHtmlText, type RhPostagemStatus, type RhPostagemTipoUi } from "../../../lib/portalRhWorkflow";
import { normalizarTextoBusca } from "../../../lib/searchText";
import { autorIdPostagem, carregarMetaAutoresPortalRh, type PortalRhAutorInfo } from "../../../lib/portalRhAutorMeta";
import { GerenciamentoPostagens, GerenciamentoPostagensFiltrosTipoStatus } from "./GerenciamentoPostagens";
import { buildMesesCarrossel, itemNoMesCarrossel, type MesCarrosselEntry } from "./portalRhCarrossel";
import { PortalRhBlocoFiltros } from "./PortalRhBlocoFiltros";
import { ComunicadoCard, PoliticaCard, RhTalkCard } from "./PortalRhCards";
import { ModalLerPolitica, ModalVerAta } from "./PortalRhModaisLeitura";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { FONT } from "../../../constants/theme";
import { PAGE_SEARCH } from "../../../lib/searchBarConstants";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { FiltroBarTabButton, onFiltroBarTabsKeyDown } from "../../../components/dashboard";
import { FILTRO_BAR_TAB_ICON_PROPS } from "../../../lib/filterBarStyles";
import { getPageContentBoxShadow } from "../../../lib/pageContentBoxStyles";

type AbaPortal = "comunicados" | "politicas" | "rhtalks" | "gerenciamento";

function isPostagemPublica(status: RhPostagemStatus | string | null | undefined): boolean {
  return !status || status === "publicado";
}

type RhPortalCategoria = {
  id: string;
  slug: string;
  label: string;
  scope: "comunicado" | "politica";
  accent_hex: string;
  sort_order: number;
};

type RhPortalComunicado = {
  id: string;
  titulo: string;
  corpo: string;
  categoria_id: string;
  is_pinned: boolean;
  requires_acknowledgment: boolean;
  published_at: string | null;
  published_by: string | null;
  created_by?: string | null;
  imagem_storage_path?: string | null;
  anexo_storage_path?: string | null;
  anexo_nome?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  status?: RhPostagemStatus | null;
  categoria?: RhPortalCategoria | null;
};

type RhPortalDocumento = {
  id: string;
  titulo: string;
  corpo: string | null;
  categoria_id: string;
  paginas: number | null;
  requires_acknowledgment: boolean;
  storage_path: string | null;
  updated_at: string;
  status?: RhPostagemStatus | null;
  published_at?: string | null;
  introducao?: string | null;
  imagem_storage_path?: string | null;
  anexo_storage_path?: string | null;
  anexo_nome?: string | null;
  created_by?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  categoria?: RhPortalCategoria | null;
};

type RhPortalRhTalk = {
  id: string;
  numero: number | null;
  titulo: string;
  data_reuniao: string | null;
  duracao_min: number;
  resumo: string | null;
  corpo?: string | null;
  introducao?: string | null;
  storage_path: string | null;
  imagem_storage_path?: string | null;
  anexo_storage_path?: string | null;
  anexo_nome?: string | null;
  created_by?: string | null;
  status?: RhPostagemStatus | null;
  published_at?: string | null;
};

type ReadReceiptRow = {
  content_type: string;
  content_id: string;
  read_at: string | null;
  acknowledged_at: string | null;
};

type SubtabCategoriaConfig = {
  key: string;
  label: string;
  slugs: string[];
};

/** Ordem fixa das sub-abas de Comunicados (após «Todos»). */
const SUBTABS_COMUNICADO: SubtabCategoriaConfig[] = [
  { key: "urgente", label: "Urgente", slugs: ["urgente"] },
  { key: "geral", label: "Geral", slugs: ["geral"] },
  { key: "pagamento", label: "Pagamento", slugs: ["pagamento"] },
  { key: "eventos", label: "Eventos", slugs: ["eventos"] },
];

/** Ordem fixa das sub-abas de Políticas (após «Todos»). */
const SUBTABS_POLITICA: SubtabCategoriaConfig[] = [
  { key: "conduta", label: "Conduta", slugs: ["conduta"] },
  { key: "seguranca", label: "Segurança", slugs: ["seguranca"] },
  { key: "bonificacao", label: "Bonificação", slugs: ["bonificacao", "beneficios_pol"] },
  { key: "folha_pagamento", label: "Folha de Pagamento", slugs: ["folha_pagamento", "operacional"] },
];

function resolveCategoriaTab(
  cats: RhPortalCategoria[],
  config: SubtabCategoriaConfig,
): RhPortalCategoria | null {
  for (const slug of config.slugs) {
    const found = cats.find((c) => c.slug === slug);
    if (found) return found;
  }
  return cats.find((c) => c.label.toLowerCase() === config.label.toLowerCase()) ?? null;
}

function itemNaSubtabCategoria(
  categoria: RhPortalCategoria | null | undefined,
  config: SubtabCategoriaConfig,
): boolean {
  if (!categoria) return false;
  return config.slugs.includes(categoria.slug);
}

function receiptKey(ct: string, id: string): string {
  return `${ct}:${id}`;
}

const ERRO_CARREGAR_PORTAL =
  "Não foi possível carregar o portal. Se o problema persistir, entre em contato com o suporte.";

function tabsPortalRhKeys(canEditarOk: boolean): AbaPortal[] {
  const keys: AbaPortal[] = ["comunicados", "politicas", "rhtalks"];
  if (canEditarOk) keys.push("gerenciamento");
  return keys;
}

function onPortalRhTabsKeyDown(
  e: KeyboardEvent,
  abaAtiva: AbaPortal,
  setAba: (key: AbaPortal) => void,
  canEditarOk: boolean,
) {
  const tabs = tabsPortalRhKeys(canEditarOk);
  const idx = tabs.indexOf(abaAtiva);
  if (idx < 0) return;
  if (e.key === "ArrowRight") {
    e.preventDefault();
    const next = tabs[(idx + 1) % tabs.length];
    setAba(next);
    document.getElementById(`tab-rh-portal-${next}`)?.focus();
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
    setAba(prev);
    document.getElementById(`tab-rh-portal-${prev}`)?.focus();
  }
}

const SUBTAB_ICONS: Record<string, ReactNode> = {
  todos: <LayoutGrid {...FILTRO_BAR_TAB_ICON_PROPS} />,
  urgente: <TriangleAlert {...FILTRO_BAR_TAB_ICON_PROPS} />,
  geral: <Megaphone {...FILTRO_BAR_TAB_ICON_PROPS} />,
  pagamento: <Wallet {...FILTRO_BAR_TAB_ICON_PROPS} />,
  eventos: <CalendarDays {...FILTRO_BAR_TAB_ICON_PROPS} />,
  conduta: <Scale {...FILTRO_BAR_TAB_ICON_PROPS} />,
  seguranca: <Shield {...FILTRO_BAR_TAB_ICON_PROPS} />,
  bonificacao: <Gift {...FILTRO_BAR_TAB_ICON_PROPS} />,
  folha_pagamento: <Banknote {...FILTRO_BAR_TAB_ICON_PROPS} />,
};

function FiltroSubtabPills({
  filtroAtivo,
  onFiltro,
  configs,
  categorias,
}: {
  filtroAtivo: string;
  onFiltro: (key: string) => void;
  configs: SubtabCategoriaConfig[];
  categorias: RhPortalCategoria[];
}) {
  const tabKeys = ["todos", ...configs.map((c) => c.key)] as const;

  return (
    <div
      role="tablist"
      aria-label="Filtrar por categoria"
      style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", width: "100%" }}
      onKeyDown={(e) => onFiltroBarTabsKeyDown(e, tabKeys, onFiltro, (k) => `tab-rh-portal-cat-${k}`)}
    >
      <FiltroBarTabButton
        id="tab-rh-portal-cat-todos"
        active={filtroAtivo === "todos"}
        onClick={() => onFiltro("todos")}
        icon={SUBTAB_ICONS.todos}
      >
        Todos
      </FiltroBarTabButton>
      {configs.map((cfg) => {
        const cat = resolveCategoriaTab(categorias, cfg);
        const ativo = filtroAtivo === cfg.key;
        return (
          <FiltroBarTabButton
            key={cfg.key}
            id={`tab-rh-portal-cat-${cfg.key}`}
            active={ativo}
            onClick={() => onFiltro(cfg.key)}
            activeColor={cat?.accent_hex}
            icon={SUBTAB_ICONS[cfg.key] ?? <FileText {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            {cfg.label}
          </FiltroBarTabButton>
        );
      })}
    </div>
  );
}

export default function PortalRhPage() {
  const { theme: t, user } = useApp();
  const perm = usePermission("rh_portal");

  const [aba, setAba] = useRouteTab(
    "rh_portal",
    "comunicados",
    ["comunicados", "politicas", "rhtalks", "gerenciamento"] as const,
  );
  const [busca, setBusca] = useState("");
  const [buscaDeb, setBuscaDeb] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [categoriasCom, setCategoriasCom] = useState<RhPortalCategoria[]>([]);
  const [categoriasPol, setCategoriasPol] = useState<RhPortalCategoria[]>([]);
  const [comunicados, setComunicados] = useState<RhPortalComunicado[]>([]);
  const [documentos, setDocumentos] = useState<RhPortalDocumento[]>([]);
  const [talks, setTalks] = useState<RhPortalRhTalk[]>([]);
  const [talkParticipantTalkIds, setTalkParticipantTalkIds] = useState<Set<string>>(new Set());
  const [talkCounts, setTalkCounts] = useState<Record<string, number>>({});
  const [receipts, setReceipts] = useState<Map<string, ReadReceiptRow>>(new Map());
  const [metaAutores, setMetaAutores] = useState<Record<string, PortalRhAutorInfo>>({});

  const [filtroCatCom, setFiltroCatCom] = useState<string>("todos");
  const [filtroCatPol, setFiltroCatPol] = useState<string>("todos");
  const [idxMesCom, setIdxMesCom] = useState(0);
  const [idxMesPol, setIdxMesPol] = useState(0);
  const [idxMesTalk, setIdxMesTalk] = useState(0);
  const [idxMesGer, setIdxMesGer] = useState(0);
  const [mesesGer, setMesesGer] = useState<MesCarrosselEntry[]>(() => buildMesesCarrossel([]));
  const [filtroTipoGer, setFiltroTipoGer] = useState<"todos" | RhPostagemTipoUi>("todos");
  const [filtroStatusGer, setFiltroStatusGer] = useState<"todos" | RhPostagemStatus>("todos");
  const [modoHistorico, setModoHistorico] = useState(false);
  const abrirCriarGerenciamentoRef = useRef<(() => void) | null>(null);

  const [modalDoc, setModalDoc] = useState<RhPortalDocumento | null>(null);
  const [modalTalk, setModalTalk] = useState<RhPortalRhTalk | null>(null);

  const cardShadow = getPageContentBoxShadow(t.isDark);

  useEffect(() => {
    const id = window.setTimeout(() => setBuscaDeb(normalizarTextoBusca(busca)), 300);
    return () => window.clearTimeout(id);
  }, [busca]);

  const carregar = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setErro(null);

    const [catRes, comRes, docRes, talkRes] = await Promise.all([
      supabase.from("rh_portal_categoria").select("*").order("sort_order", { ascending: true }),
      supabase
        .from("rh_portal_comunicado")
        .select("*, categoria:rh_portal_categoria(*)")
        .order("published_at", { ascending: false }),
      supabase
        .from("rh_portal_documento")
        .select("*, categoria:rh_portal_categoria(*)")
        .order("updated_at", { ascending: false }),
      supabase.from("rh_portal_rh_talk").select("*").order("data_reuniao", { ascending: false }),
    ]);

    if (catRes.error || comRes.error || docRes.error || talkRes.error) {
      const err = catRes.error ?? comRes.error ?? docRes.error ?? talkRes.error;
      console.error("[PortalRh] carregar:", err);
      setErro(ERRO_CARREGAR_PORTAL);
      setLoading(false);
      return;
    }

    const cats = (catRes.data ?? []) as RhPortalCategoria[];
    setCategoriasCom(cats.filter((c) => c.scope === "comunicado"));
    setCategoriasPol(cats.filter((c) => c.scope === "politica"));

    /** Abas de leitura: nunca exibir arquivados — só conteúdo publicado. */
    const visivelPortal = (status: RhPostagemStatus | null | undefined) => isPostagemPublica(status);

    const comRows = ((comRes.data ?? []) as RhPortalComunicado[]).filter((c) => visivelPortal(c.status));
    setComunicados(comRows);
    setDocumentos(((docRes.data ?? []) as RhPortalDocumento[]).filter((d) => visivelPortal(d.status)));
    const talkRows = ((talkRes.data ?? []) as RhPortalRhTalk[]).filter((tk) => visivelPortal(tk.status));
    setTalks(talkRows);

    const talkIds = talkRows.map((x) => x.id);
    if (talkIds.length > 0) {
      const { data: parts } = await supabase
        .from("rh_portal_rh_talk_participant")
        .select("talk_id, user_id")
        .in("talk_id", talkIds);
      const mySet = new Set<string>();
      const counts: Record<string, number> = {};
      for (const p of parts ?? []) {
        const row = p as { talk_id: string; user_id: string };
        counts[row.talk_id] = (counts[row.talk_id] ?? 0) + 1;
        if (row.user_id === user.id) mySet.add(row.talk_id);
      }
      setTalkParticipantTalkIds(mySet);
      setTalkCounts(counts);
    } else {
      setTalkParticipantTalkIds(new Set());
      setTalkCounts({});
    }

    const { data: recData } = await supabase
      .from("rh_portal_read_receipt")
      .select("content_type, content_id, read_at, acknowledged_at")
      .eq("user_id", user.id);

    const map = new Map<string, ReadReceiptRow>();
    for (const r of recData ?? []) {
      const row = r as ReadReceiptRow;
      map.set(receiptKey(row.content_type, row.content_id), row);
    }
    setReceipts(map);

    const docRows = (docRes.data ?? []) as RhPortalDocumento[];
    const userIds = new Set<string>();
    for (const c of comRows) {
      const aid = autorIdPostagem(c);
      if (aid) userIds.add(aid);
      if (c.approved_by) userIds.add(c.approved_by);
    }
    for (const d of docRows) {
      const aid = autorIdPostagem(d);
      if (aid) userIds.add(aid);
      if (d.approved_by) userIds.add(d.approved_by);
    }
    for (const tk of talkRows) {
      const aid = autorIdPostagem(tk);
      if (aid) userIds.add(aid);
    }
    setMetaAutores(await carregarMetaAutoresPortalRh([...userIds]));

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

  const mesesCom = useMemo(
    () => buildMesesCarrossel(comunicados.map((c) => ({ iso: c.published_at }))),
    [comunicados],
  );
  const mesesPol = useMemo(
    () => buildMesesCarrossel(documentos.map((d) => ({ iso: d.published_at }))),
    [documentos],
  );
  const mesesTalksDisponiveis = useMemo(
    () => buildMesesCarrossel(talks.map((tk) => ({ iso: tk.published_at }))),
    [talks],
  );

  useEffect(() => {
    setIdxMesCom((i) => Math.min(i, Math.max(0, mesesCom.length - 1)));
  }, [mesesCom.length]);
  useEffect(() => {
    setIdxMesPol((i) => Math.min(i, Math.max(0, mesesPol.length - 1)));
  }, [mesesPol.length]);
  useEffect(() => {
    setIdxMesTalk((i) => Math.min(i, Math.max(0, mesesTalksDisponiveis.length - 1)));
  }, [mesesTalksDisponiveis.length]);
  useEffect(() => {
    setIdxMesGer((i) => Math.min(i, Math.max(0, mesesGer.length - 1)));
  }, [mesesGer.length]);

  const handleRegisterAbrirCriar = useCallback((fn: () => void) => {
    abrirCriarGerenciamentoRef.current = fn;
  }, []);

  const handleMesesGerChange = useCallback((meses: MesCarrosselEntry[]) => {
    setMesesGer(meses);
  }, []);

  const filtroCarrossel = useMemo(() => {
    switch (aba) {
      case "politicas":
        return { meses: mesesPol, idx: idxMesPol, setIdx: setIdxMesPol };
      case "rhtalks":
        return { meses: mesesTalksDisponiveis, idx: idxMesTalk, setIdx: setIdxMesTalk };
      case "gerenciamento":
        return { meses: mesesGer, idx: idxMesGer, setIdx: setIdxMesGer };
      default:
        return { meses: mesesCom, idx: idxMesCom, setIdx: setIdxMesCom };
    }
  }, [aba, mesesCom, mesesPol, mesesTalksDisponiveis, mesesGer, idxMesCom, idxMesPol, idxMesTalk, idxMesGer]);

  const buscaFiltroMeta = useMemo(() => {
    switch (aba) {
      case "politicas":
        return {
          placeholder: PAGE_SEARCH.portalRh,
          ariaLabel: "Pesquisar políticas por assunto ou descrição",
        };
      case "rhtalks":
        return {
          placeholder: PAGE_SEARCH.portalRh,
          ariaLabel: "Pesquisar RH Talks por assunto ou descrição",
        };
      case "gerenciamento":
        return {
          placeholder: PAGE_SEARCH.portalRh,
          ariaLabel: "Pesquisar postagens por palavras-chave",
        };
      default:
        return {
          placeholder: PAGE_SEARCH.portalRh,
          ariaLabel: "Pesquisar comunicados por assunto ou descrição",
        };
    }
  }, [aba]);

  const linhaSubabasFiltro = useMemo(() => {
    if (aba === "comunicados") {
      return (
        <FiltroSubtabPills
          filtroAtivo={filtroCatCom}
          onFiltro={setFiltroCatCom}
          configs={SUBTABS_COMUNICADO}
          categorias={categoriasCom}
        />
      );
    }
    if (aba === "politicas") {
      return (
        <FiltroSubtabPills
          filtroAtivo={filtroCatPol}
          onFiltro={setFiltroCatPol}
          configs={SUBTABS_POLITICA}
          categorias={categoriasPol}
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
  }, [aba, filtroCatCom, filtroCatPol, categoriasCom, categoriasPol, filtroTipoGer, filtroStatusGer, perm.canEditarOk]);

  useEffect(() => {
    if (comunicados.length > 0 && mesesCom.length > 0) setIdxMesCom(mesesCom.length - 1);
  }, [comunicados.length, mesesCom.length]);
  useEffect(() => {
    if (documentos.length > 0 && mesesPol.length > 0) setIdxMesPol(mesesPol.length - 1);
  }, [documentos.length, mesesPol.length]);
  useEffect(() => {
    if (talks.length > 0 && mesesTalksDisponiveis.length > 0) setIdxMesTalk(mesesTalksDisponiveis.length - 1);
  }, [talks.length, mesesTalksDisponiveis.length]);

  const comunicadoPinned = useMemo(() => {
    if (modoHistorico || buscaDeb) return null;
    const mesSel = mesesCom[idxMesCom];
    const pin = comunicados.find((c) => c.is_pinned && isPostagemPublica(c.status));
    if (!pin || !itemNoMesCarrossel(pin.published_at, mesSel)) return null;
    return pin;
  }, [comunicados, modoHistorico, buscaDeb, mesesCom, idxMesCom]);

  const comunicadosLista = useMemo(() => {
    let list = comunicados.filter((c) => !c.is_pinned);
    list = list.filter((c) => isPostagemPublica(c.status));
    if (!modoHistorico) {
      const mesSel = mesesCom[idxMesCom];
      list = list.filter((c) => itemNoMesCarrossel(c.published_at, mesSel));
    }
    if (filtroCatCom !== "todos") {
      const cfg = SUBTABS_COMUNICADO.find((x) => x.key === filtroCatCom);
      if (cfg) list = list.filter((c) => itemNaSubtabCategoria(c.categoria, cfg));
    }
    if (buscaDeb) {
      list = list.filter(
        (c) =>
          hitBuscaTexto(c.titulo) ||
          hitBuscaCorpo(c.corpo) ||
          hitBuscaTexto(c.categoria?.label) ||
          hitBuscaTexto(c.categoria?.slug),
      );
    }
    const recMap = receipts;
    const uid = user?.id;
    list = [...list].sort((a, b) => {
      const pendA =
        a.requires_acknowledgment &&
        uid &&
        !recMap.get(receiptKey("comunicado", a.id))?.acknowledged_at;
      const pendB =
        b.requires_acknowledgment &&
        uid &&
        !recMap.get(receiptKey("comunicado", b.id))?.acknowledged_at;
      if (pendA !== pendB) return pendA ? -1 : 1;
      return new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime();
    });
    return list;
  }, [
    comunicados,
    filtroCatCom,
    receipts,
    user?.id,
    modoHistorico,
    mesesCom,
    idxMesCom,
    buscaDeb,
    hitBuscaTexto,
    hitBuscaCorpo,
  ]);

  const documentosFiltrados = useMemo(() => {
    let list = documentos.filter((d) => isPostagemPublica(d.status));
    if (!modoHistorico) {
      const mesSel = mesesPol[idxMesPol];
      list = list.filter((d) => itemNoMesCarrossel(d.published_at, mesSel));
    }
    if (filtroCatPol !== "todos") {
      const cfg = SUBTABS_POLITICA.find((x) => x.key === filtroCatPol);
      if (cfg) list = list.filter((d) => itemNaSubtabCategoria(d.categoria, cfg));
    }
    if (buscaDeb) {
      list = list.filter(
        (d) =>
          hitBuscaTexto(d.titulo) ||
          hitBuscaCorpo(d.corpo) ||
          hitBuscaTexto(d.introducao) ||
          hitBuscaTexto(d.categoria?.label) ||
          hitBuscaTexto(d.categoria?.slug),
      );
    }
    return list;
  }, [documentos, filtroCatPol, modoHistorico, mesesPol, idxMesPol, buscaDeb, hitBuscaTexto, hitBuscaCorpo]);

  const talksFiltrados = useMemo(() => {
    let list = talks.filter((tk) => isPostagemPublica(tk.status));
    if (!modoHistorico) {
      const mesSel = mesesTalksDisponiveis[idxMesTalk];
      list = list.filter((tk) => itemNoMesCarrossel(tk.published_at, mesSel));
    }
    if (buscaDeb) {
      list = list.filter(
        (x) =>
          hitBuscaTexto(x.titulo) ||
          hitBuscaTexto(x.resumo) ||
          hitBuscaCorpo(x.corpo) ||
          hitBuscaTexto(x.introducao) ||
          String(x.numero).includes(buscaDeb),
      );
    }
    return list;
  }, [talks, modoHistorico, mesesTalksDisponiveis, idxMesTalk, buscaDeb, hitBuscaTexto, hitBuscaCorpo]);

  async function marcarLidoComunicado(contentId: string) {
    if (!user?.id) return;
    const key = receiptKey("comunicado", contentId);
    const now = new Date().toISOString();
    const existing = receipts.get(key);
    if (existing?.read_at) return;
    if (existing) {
      const { error } = await supabase
        .from("rh_portal_read_receipt")
        .update({ read_at: now })
        .eq("content_type", "comunicado")
        .eq("content_id", contentId)
        .eq("user_id", user.id);
      if (!error) {
        setReceipts((prev) => {
          const n = new Map(prev);
          n.set(key, { ...existing, read_at: now });
          return n;
        });
      }
    } else {
      const { error } = await supabase.from("rh_portal_read_receipt").insert({
        content_type: "comunicado",
        content_id: contentId,
        user_id: user.id,
        read_at: now,
      });
      if (!error) {
        setReceipts((prev) => {
          const n = new Map(prev);
          n.set(key, { content_type: "comunicado", content_id: contentId, read_at: now, acknowledged_at: null });
          return n;
        });
      }
    }
  }

  async function marcarLidoECienteDocumento(contentId: string) {
    if (!user?.id) return;
    const key = receiptKey("documento", contentId);
    const now = new Date().toISOString();
    const existing = receipts.get(key);
    if (existing?.acknowledged_at) return;
    if (existing) {
      const { error } = await supabase
        .from("rh_portal_read_receipt")
        .update({ read_at: existing.read_at ?? now, acknowledged_at: now })
        .eq("content_type", "documento")
        .eq("content_id", contentId)
        .eq("user_id", user.id);
      if (!error) {
        setReceipts((prev) => {
          const n = new Map(prev);
          n.set(key, { ...existing, read_at: existing.read_at ?? now, acknowledged_at: now });
          return n;
        });
      }
    } else {
      const { error } = await supabase.from("rh_portal_read_receipt").insert({
        content_type: "documento",
        content_id: contentId,
        user_id: user.id,
        read_at: now,
        acknowledged_at: now,
      });
      if (!error) {
        setReceipts((prev) => {
          const n = new Map(prev);
          n.set(key, { content_type: "documento", content_id: contentId, read_at: now, acknowledged_at: now });
          return n;
        });
      }
    }
  }

  function metaAutor(uid: string | null | undefined): PortalRhAutorInfo | undefined {
    if (!uid) return undefined;
    return metaAutores[uid];
  }

  function podeVerAta(tk: RhPortalRhTalk): boolean {
    const n = talkCounts[tk.id] ?? 0;
    if (n === 0) return true;
    return talkParticipantTalkIds.has(tk.id);
  }

  if (perm.loading) {
    return (
      <div className="app-page-shell" style={{ background: t.bg, fontFamily: FONT.body, color: t.textMuted }}>
        <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden style={{ display: "block", margin: "48px auto" }} />
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body, background: t.bg }}>
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body, paddingBottom: 32 }}>
      <PageHeader
        icon={<PageMenuIcon pageKey="rh_portal" />}
        title={getPageMenuLabel("rh_portal")}
        subtitle="Comunicados oficiais, políticas internas e atas das RH Talks."
      />

      <PortalRhBlocoFiltros
        meses={filtroCarrossel.meses}
        idxMes={filtroCarrossel.idx}
        onIdxMesChange={filtroCarrossel.setIdx}
        modoHistorico={modoHistorico}
        onModoHistoricoChange={setModoHistorico}
        busca={busca}
        onBuscaChange={setBusca}
        buscaPlaceholder={buscaFiltroMeta.placeholder}
        buscaAriaLabel={buscaFiltroMeta.ariaLabel}
        linhaAbas={
          <div
            role="tablist"
            aria-label="Seções do portal de RH"
            style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}
            onKeyDown={(e) => onPortalRhTabsKeyDown(e, aba, setAba, perm.canEditarOk)}
          >
            {(
              [
                { key: "comunicados" as const, label: "Comunicados", Icon: Megaphone },
                { key: "politicas" as const, label: "Políticas e normativas", Icon: FileText },
                { key: "rhtalks" as const, label: "RH Talks", Icon: MessagesSquare },
                ...(perm.canEditarOk
                  ? [{ key: "gerenciamento" as const, label: "Gerenciamento de Postagens", Icon: SlidersHorizontal }]
                  : []),
              ] as const
            ).map(({ key, label, Icon }) => (
              <FiltroBarTabButton
                key={key}
                id={`tab-rh-portal-${key}`}
                active={aba === key}
                aria-controls={`panel-rh-portal-${key}`}
                onClick={() => setAba(key)}
                icon={<Icon {...FILTRO_BAR_TAB_ICON_PROPS} />}
              >
                {label}
              </FiltroBarTabButton>
            ))}
          </div>
        }
        linhaSubabas={linhaSubabasFiltro ?? undefined}
      />

      {erro ? (
        <div role="alert" style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: "rgba(232,64,37,0.12)", color: "#e84025", fontSize: 13 }}>
          {erro}
        </div>
      ) : null}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: t.textMuted }}>
          <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden style={{ verticalAlign: "middle", marginRight: 8 }} />
          Carregando…
        </div>
      ) : aba === "gerenciamento" && perm.canEditarOk ? (
        <GerenciamentoPostagens
          categoriasCom={categoriasCom}
          categoriasPol={categoriasPol}
          onDadosAlterados={() => void carregar()}
          buscaDeb={buscaDeb}
          modoHistorico={modoHistorico}
          idxMes={idxMesGer}
          mesesDisponiveis={mesesGer}
          filtroTipo={filtroTipoGer}
          filtroStatus={filtroStatusGer}
          onMesesCarrosselChange={handleMesesGerChange}
          onRegisterAbrirCriar={handleRegisterAbrirCriar}
        />
      ) : (
        <>
          <div
            role="tabpanel"
            id={`panel-rh-portal-${aba}`}
            aria-labelledby={`tab-rh-portal-${aba}`}
            tabIndex={0}
            style={{ marginTop: 4 }}
          >
            {aba === "comunicados" ? (
              <div>
                {comunicadoPinned ? (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <Pin size={16} color="#b45309" aria-hidden />
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#b45309", fontFamily: FONT.body }}>Fixado</span>
                    </div>
                    <ComunicadoCard
                      titulo={comunicadoPinned.titulo}
                      corpo={comunicadoPinned.corpo}
                      categoria={comunicadoPinned.categoria}
                      imagemStoragePath={comunicadoPinned.imagem_storage_path}
                      anexoStoragePath={comunicadoPinned.anexo_storage_path}
                      anexoNome={comunicadoPinned.anexo_nome}
                      autorInfo={metaAutor(autorIdPostagem(comunicadoPinned))}
                      dataPublicacao={comunicadoPinned.published_at}
                      isNovo={!receipts.get(receiptKey("comunicado", comunicadoPinned.id))?.read_at}
                      onMarcarLido={() => void marcarLidoComunicado(comunicadoPinned.id)}
                      cardShadow={cardShadow}
                    />
                  </div>
                ) : null}

                {comunicadosLista.length === 0 && !comunicadoPinned ? (
                  <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                    {buscaDeb
                      ? "Nenhum resultado para os termos pesquisados."
                      : "Sem dados para o período selecionado."}
                  </div>
                ) : comunicadosLista.length === 0 ? (
                  <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                    Nenhum outro comunicado neste filtro.
                  </div>
                ) : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                    {comunicadosLista.map((c) => {
                      const rec = user?.id ? receipts.get(receiptKey("comunicado", c.id)) : undefined;
                      const isNovoCard = !rec?.read_at;
                      return (
                        <li key={c.id}>
                          <ComunicadoCard
                            titulo={c.titulo}
                            corpo={c.corpo}
                            categoria={c.categoria}
                            imagemStoragePath={c.imagem_storage_path}
                            anexoStoragePath={c.anexo_storage_path}
                            anexoNome={c.anexo_nome}
                            autorInfo={metaAutor(autorIdPostagem(c))}
                            dataPublicacao={c.published_at}
                            isNovo={isNovoCard}
                            onMarcarLido={() => void marcarLidoComunicado(c.id)}
                            cardShadow={cardShadow}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : aba === "politicas" ? (
              <div>
                {documentosFiltrados.length === 0 ? (
                  <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                    {buscaDeb
                      ? "Nenhum resultado para os termos pesquisados."
                      : "Sem dados para o período selecionado."}
                  </div>
                ) : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                    {documentosFiltrados.map((d) => {
                      const rec = user?.id ? receipts.get(receiptKey("documento", d.id)) : undefined;
                      const isNovoCard = !rec?.acknowledged_at;
                      const dataPub = d.published_at ?? d.updated_at;
                      return (
                        <li key={d.id}>
                          <PoliticaCard
                            titulo={d.titulo}
                            introducao={d.introducao}
                            categoria={d.categoria}
                            autorInfo={metaAutor(autorIdPostagem(d))}
                            dataPublicacao={dataPub}
                            isNovo={isNovoCard}
                            onAbrirLeitura={() => setModalDoc(d)}
                            cardShadow={cardShadow}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : (
              <div>
                {talksFiltrados.length === 0 ? (
                  <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                    {buscaDeb
                      ? "Nenhum resultado para os termos pesquisados."
                      : "Sem dados para o período selecionado."}
                  </div>
                ) : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                    {talksFiltrados.map((tk) => {
                      const n = talkCounts[tk.id] ?? 0;
                      const restrito = n > 0 && !talkParticipantTalkIds.has(tk.id);
                      const dataPub = tk.published_at;
                      return (
                        <li key={tk.id}>
                          <RhTalkCard
                            titulo={tk.titulo}
                            introducao={tk.introducao ?? tk.resumo}
                            numero={tk.numero}
                            autorInfo={metaAutor(autorIdPostagem(tk))}
                            dataPublicacao={dataPub}
                            restrito={restrito}
                            onAbrirAta={() => setModalTalk(tk)}
                            cardShadow={cardShadow}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {modalDoc ? (
        <ModalLerPolitica
          titulo={modalDoc.titulo}
          introducao={modalDoc.introducao}
          corpo={modalDoc.corpo}
          imagemPath={modalDoc.imagem_storage_path}
          anexoPath={modalDoc.anexo_storage_path ?? modalDoc.storage_path}
          anexoNome={modalDoc.anexo_nome}
          autorInfo={metaAutor(autorIdPostagem(modalDoc))}
          dataPublicacao={modalDoc.published_at ?? modalDoc.updated_at}
          aprovadorInfo={metaAutor(modalDoc.approved_by)}
          dataAprovacao={modalDoc.approved_at}
          temAprovador={Boolean(modalDoc.approved_by && modalDoc.approved_at)}
          jaCiente={Boolean(receipts.get(receiptKey("documento", modalDoc.id))?.acknowledged_at)}
          onClose={() => setModalDoc(null)}
          onLidoECiente={() => void marcarLidoECienteDocumento(modalDoc.id)}
        />
      ) : null}

      {modalTalk ? (
        <ModalVerAta
          titulo={modalTalk.numero != null ? `RH Talk #${modalTalk.numero} — ${modalTalk.titulo}` : modalTalk.titulo}
          introducao={modalTalk.introducao ?? modalTalk.resumo}
          corpo={modalTalk.corpo ?? modalTalk.resumo}
          imagemPath={modalTalk.imagem_storage_path}
          anexoPath={modalTalk.anexo_storage_path ?? modalTalk.storage_path}
          anexoNome={modalTalk.anexo_nome}
          autorInfo={metaAutor(autorIdPostagem(modalTalk))}
          dataPublicacao={modalTalk.published_at ?? modalTalk.data_reuniao}
          podeVer={podeVerAta(modalTalk)}
          onClose={() => setModalTalk(null)}
        />
      ) : null}

    </div>
  );
}
