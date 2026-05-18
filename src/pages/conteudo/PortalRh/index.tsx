import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Lock,
  Megaphone,
  MessagesSquare,
  Pin,
  Search,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT, FONT_TITLE } from "../../../constants/theme";
import { PageHeader } from "../../../components/PageHeader";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";

type AbaPortal = "comunicados" | "politicas" | "rhtalks";

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
  published_at: string;
  published_by: string | null;
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
  categoria?: RhPortalCategoria | null;
};

type RhPortalRhTalk = {
  id: string;
  numero: number;
  titulo: string;
  data_reuniao: string;
  duracao_min: number;
  resumo: string | null;
  storage_path: string | null;
};

type ReadReceiptRow = {
  content_type: string;
  content_id: string;
  read_at: string | null;
  acknowledged_at: string | null;
};

const PREVIEW_LEN = 200;

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

function fmtMesAnoCarrossel(ano: number, mes: number): string {
  const raw = new Date(ano, mes, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function truncPreview(s: string, max = PREVIEW_LEN): string {
  const t = (s ?? "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

function fmtDataPublicacao(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function isNovo(iso: string): boolean {
  const d = new Date(iso).getTime();
  return Date.now() - d < 7 * 24 * 60 * 60 * 1000;
}

function docAtualizadoNos30Dias(iso: string): boolean {
  const d = new Date(iso).getTime();
  return Date.now() - d < 30 * 24 * 60 * 60 * 1000;
}

function ctaGradient(brand: ReturnType<typeof useDashboardBrand>): string {
  return brand.useBrand
    ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
    : "linear-gradient(135deg, var(--brand-action, #7c3aed), var(--brand-contrast, #1e36f8))";
}

function receiptKey(ct: string, id: string): string {
  return `${ct}:${id}`;
}

function FiltroSubtabPills({
  filtroAtivo,
  onFiltro,
  configs,
  categorias,
  t,
}: {
  filtroAtivo: string;
  onFiltro: (key: string) => void;
  configs: SubtabCategoriaConfig[];
  categorias: RhPortalCategoria[];
  t: ReturnType<typeof useApp>["theme"];
}) {
  const pillBase = (ativo: boolean, accent?: string) => ({
    padding: "8px 14px",
    borderRadius: 999,
    border: ativo
      ? accent
        ? `1px solid ${accent}`
        : "1px solid var(--brand-primary, #7c3aed)"
      : `1px solid ${t.cardBorder}`,
    background: ativo
      ? accent
        ? `${accent}22`
        : "color-mix(in srgb, var(--brand-primary, #7c3aed) 14%, transparent)"
      : t.cardBg,
    color: t.text,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: FONT.body,
  });

  return (
    <div
      role="group"
      aria-label="Filtrar por categoria"
      style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}
    >
      <button type="button" aria-pressed={filtroAtivo === "todos"} onClick={() => onFiltro("todos")} style={pillBase(filtroAtivo === "todos")}>
        Todos
      </button>
      {configs.map((cfg) => {
        const cat = resolveCategoriaTab(categorias, cfg);
        const ativo = filtroAtivo === cfg.key;
        return (
          <button
            key={cfg.key}
            type="button"
            aria-pressed={ativo}
            onClick={() => onFiltro(cfg.key)}
            style={pillBase(ativo, cat?.accent_hex)}
          >
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}

export default function PortalRhPage() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("rh_portal");

  const [aba, setAba] = useState<AbaPortal>("comunicados");
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
  const [nomeAutores, setNomeAutores] = useState<Record<string, string>>({});

  const [filtroCatCom, setFiltroCatCom] = useState<string>("todos");
  const [filtroCatPol, setFiltroCatPol] = useState<string>("todos");
  const [idxMesTalk, setIdxMesTalk] = useState(0);

  const [modalCom, setModalCom] = useState<RhPortalComunicado | null>(null);
  const [modalDoc, setModalDoc] = useState<RhPortalDocumento | null>(null);
  const [modalTalk, setModalTalk] = useState<RhPortalRhTalk | null>(null);

  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";

  useEffect(() => {
    const id = window.setTimeout(() => setBuscaDeb(busca.trim().toLowerCase()), 300);
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

    if (catRes.error) setErro(catRes.error.message);
    else if (comRes.error) setErro(comRes.error.message);
    else if (docRes.error) setErro(docRes.error.message);
    else if (talkRes.error) setErro(talkRes.error.message);

    const cats = (catRes.data ?? []) as RhPortalCategoria[];
    setCategoriasCom(cats.filter((c) => c.scope === "comunicado"));
    setCategoriasPol(cats.filter((c) => c.scope === "politica"));

    const comRows = (comRes.data ?? []) as RhPortalComunicado[];
    setComunicados(comRows);
    setDocumentos((docRes.data ?? []) as RhPortalDocumento[]);
    const talkRows = (talkRes.data ?? []) as RhPortalRhTalk[];
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

    const autorIds = [...new Set(comRows.map((c) => c.published_by).filter(Boolean))] as string[];
    if (autorIds.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, name").in("id", autorIds);
      const nm: Record<string, string> = {};
      for (const p of profs ?? []) {
        const row = p as { id: string; name: string };
        nm[row.id] = row.name ?? "";
      }
      setNomeAutores(nm);
    } else {
      setNomeAutores({});
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao" || !user?.id) return;
    void carregar();
  }, [carregar, perm.loading, perm.canView, user?.id]);

  const comunicadoPinned = useMemo(
    () => comunicados.find((c) => c.is_pinned) ?? null,
    [comunicados],
  );

  const comunicadosLista = useMemo(() => {
    let list = comunicados.filter((c) => !c.is_pinned);
    if (filtroCatCom !== "todos") {
      const cfg = SUBTABS_COMUNICADO.find((x) => x.key === filtroCatCom);
      if (cfg) list = list.filter((c) => itemNaSubtabCategoria(c.categoria, cfg));
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
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    });
    return list;
  }, [comunicados, filtroCatCom, receipts, user?.id]);

  const documentosFiltrados = useMemo(() => {
    let list = documentos;
    if (filtroCatPol !== "todos") {
      const cfg = SUBTABS_POLITICA.find((x) => x.key === filtroCatPol);
      if (cfg) list = list.filter((d) => itemNaSubtabCategoria(d.categoria, cfg));
    }
    return list;
  }, [documentos, filtroCatPol]);

  const mesesTalksDisponiveis = useMemo(() => {
    const keys = new Set<string>();
    for (const tk of talks) {
      const d = new Date(tk.data_reuniao);
      keys.add(`${d.getFullYear()}-${d.getMonth()}`);
    }
    const entries = [...keys].map((k) => {
      const [ano, mes] = k.split("-").map(Number);
      return { ano, mes, label: fmtMesAnoCarrossel(ano, mes) };
    });
    entries.sort((a, b) => a.ano - b.ano || a.mes - b.mes);
    if (entries.length) return entries;
    const hoje = new Date();
    return [{ ano: hoje.getFullYear(), mes: hoje.getMonth(), label: fmtMesAnoCarrossel(hoje.getFullYear(), hoje.getMonth()) }];
  }, [talks]);

  useEffect(() => {
    if (mesesTalksDisponiveis.length === 0) return;
    setIdxMesTalk((i) => Math.min(i, mesesTalksDisponiveis.length - 1));
  }, [mesesTalksDisponiveis]);

  useEffect(() => {
    if (talks.length > 0 && mesesTalksDisponiveis.length > 0) {
      setIdxMesTalk(mesesTalksDisponiveis.length - 1);
    }
  }, [talks.length, mesesTalksDisponiveis.length]);

  const talksFiltrados = useMemo(() => {
    const mesSel = mesesTalksDisponiveis[idxMesTalk];
    if (!mesSel) return [];
    return talks.filter((tk) => {
      const d = new Date(tk.data_reuniao);
      return d.getFullYear() === mesSel.ano && d.getMonth() === mesSel.mes;
    });
  }, [talks, mesesTalksDisponiveis, idxMesTalk]);

  const buscaAtiva = buscaDeb.length > 0;

  const resultadosBusca = useMemo(() => {
    if (!buscaAtiva) return { com: [] as RhPortalComunicado[], doc: [] as RhPortalDocumento[], tk: [] as RhPortalRhTalk[] };
    const hit = (s: string | null | undefined) => (s ?? "").toLowerCase().includes(buscaDeb);
    const com = comunicados.filter(
      (c) =>
        hit(c.titulo) ||
        hit(c.corpo) ||
        hit(c.categoria?.label) ||
        hit(c.categoria?.slug),
    );
    const doc = documentos.filter(
      (d) =>
        hit(d.titulo) ||
        hit(d.corpo) ||
        hit(d.categoria?.label) ||
        hit(d.categoria?.slug),
    );
    const tk = talks.filter((x) => hit(x.titulo) || hit(x.resumo) || String(x.numero).includes(buscaDeb));
    return { com, doc, tk };
  }, [buscaAtiva, buscaDeb, comunicados, documentos, talks]);

  async function confirmarCiencia(contentType: "comunicado" | "documento" | "rh_talk", contentId: string) {
    if (!user?.id) return;
    const key = receiptKey(contentType, contentId);
    const now = new Date().toISOString();
    const existing = receipts.get(key);
    if (existing) {
      const { error } = await supabase
        .from("rh_portal_read_receipt")
        .update({ acknowledged_at: now })
        .eq("content_type", contentType)
        .eq("content_id", contentId)
        .eq("user_id", user.id);
      if (!error) {
        setReceipts((prev) => {
          const n = new Map(prev);
          const cur = n.get(key);
          n.set(key, { ...(cur ?? existing), acknowledged_at: now });
          return n;
        });
      }
    } else {
      const { error } = await supabase.from("rh_portal_read_receipt").insert({
        content_type: contentType,
        content_id: contentId,
        user_id: user.id,
        read_at: now,
        acknowledged_at: now,
      });
      if (!error) {
        setReceipts((prev) => {
          const n = new Map(prev);
          n.set(key, { content_type: contentType, content_id: contentId, read_at: now, acknowledged_at: now });
          return n;
        });
      }
    }
  }

  function podeVerAta(tk: RhPortalRhTalk): boolean {
    const n = talkCounts[tk.id] ?? 0;
    if (n === 0) return true;
    return talkParticipantTalkIds.has(tk.id);
  }

  useEffect(() => {
    if (!modalCom?.id || !user?.id) return;
    let cancelled = false;
    const id = modalCom.id;
    void (async () => {
      const { data: ex } = await supabase
        .from("rh_portal_read_receipt")
        .select("content_type, content_id, read_at, acknowledged_at")
        .eq("content_type", "comunicado")
        .eq("content_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const key = receiptKey("comunicado", id);
      if (ex) {
        setReceipts((prev) => new Map(prev).set(key, ex as ReadReceiptRow));
        return;
      }
      const now = new Date().toISOString();
      const { data: ins, error } = await supabase
        .from("rh_portal_read_receipt")
        .insert({ content_type: "comunicado", content_id: id, user_id: user.id, read_at: now })
        .select("content_type, content_id, read_at, acknowledged_at")
        .single();
      if (cancelled || error) return;
      setReceipts((prev) => new Map(prev).set(key, ins as ReadReceiptRow));
    })();
    return () => {
      cancelled = true;
    };
  }, [modalCom?.id, user?.id]);

  useEffect(() => {
    if (!modalDoc?.id || !user?.id) return;
    let cancelled = false;
    const id = modalDoc.id;
    void (async () => {
      const { data: ex } = await supabase
        .from("rh_portal_read_receipt")
        .select("content_type, content_id, read_at, acknowledged_at")
        .eq("content_type", "documento")
        .eq("content_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const key = receiptKey("documento", id);
      if (ex) {
        setReceipts((prev) => new Map(prev).set(key, ex as ReadReceiptRow));
        return;
      }
      const now = new Date().toISOString();
      const { data: ins, error } = await supabase
        .from("rh_portal_read_receipt")
        .insert({ content_type: "documento", content_id: id, user_id: user.id, read_at: now })
        .select("content_type, content_id, read_at, acknowledged_at")
        .single();
      if (cancelled || error) return;
      setReceipts((prev) => new Map(prev).set(key, ins as ReadReceiptRow));
    })();
    return () => {
      cancelled = true;
    };
  }, [modalDoc?.id, user?.id]);

  useEffect(() => {
    const tid = modalTalk?.id;
    if (!tid || !user?.id) return;
    const n = talkCounts[tid] ?? 0;
    const pode = n === 0 || talkParticipantTalkIds.has(tid);
    if (!pode) return;
    let cancelled = false;
    const id = tid;
    void (async () => {
      const { data: ex } = await supabase
        .from("rh_portal_read_receipt")
        .select("content_type, content_id, read_at, acknowledged_at")
        .eq("content_type", "rh_talk")
        .eq("content_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const key = receiptKey("rh_talk", id);
      if (ex) {
        setReceipts((prev) => new Map(prev).set(key, ex as ReadReceiptRow));
        return;
      }
      const now = new Date().toISOString();
      const { data: ins, error } = await supabase
        .from("rh_portal_read_receipt")
        .insert({ content_type: "rh_talk", content_id: id, user_id: user.id, read_at: now })
        .select("content_type, content_id, read_at, acknowledged_at")
        .single();
      if (cancelled || error) return;
      setReceipts((prev) => new Map(prev).set(key, ins as ReadReceiptRow));
    })();
    return () => {
      cancelled = true;
    };
  }, [modalTalk?.id, user?.id, talkCounts, talkParticipantTalkIds]);

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
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  const mesTalkSel = mesesTalksDisponiveis[idxMesTalk];
  const talkCarouselPrimeiro = idxMesTalk <= 0;
  const talkCarouselUltimo = idxMesTalk >= mesesTalksDisponiveis.length - 1;
  const btnNavTalk = {
    width: 30,
    height: 30,
    borderRadius: "50%",
    border: `1px solid ${t.cardBorder}`,
    background: "transparent",
    color: t.text,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as const;

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body, paddingBottom: 32 }}>
      <PageHeader
        icon={<Megaphone size={14} aria-hidden strokeWidth={2.2} />}
        title="Portal de RH"
        subtitle="Comunicados oficiais, políticas internas e atas das RH Talks."
      />

      <div style={{ marginBottom: 18 }}>
        <label htmlFor="rh-portal-busca" className="sr-only">
          Buscar no portal de RH
        </label>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderRadius: 12,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg ?? t.cardBg,
            padding: "10px 14px",
            maxWidth: 480,
          }}
        >
          <Search size={18} color={t.textMuted} aria-hidden />
          <input
            id="rh-portal-busca"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar comunicados, políticas, RH Talks…"
            aria-label="Buscar comunicados, políticas e RH Talks"
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              color: t.text,
              fontSize: 14,
              outline: "none",
              fontFamily: FONT.body,
            }}
          />
        </div>
      </div>

      <div role="tablist" aria-label="Seções do portal de RH" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {(
          [
            { key: "comunicados" as const, label: "Comunicados", Icon: Megaphone },
            { key: "politicas" as const, label: "Políticas e normativas", Icon: FileText },
            { key: "rhtalks" as const, label: "RH Talks", Icon: MessagesSquare },
          ] as const
        ).map(({ key, label, Icon }) => {
          const ativa = aba === key && !buscaAtiva;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              id={`tab-rh-portal-${key}`}
              aria-selected={ativa}
              aria-controls={`panel-rh-portal-${key}`}
              onClick={() => {
                setAba(key);
                setBusca("");
                setBuscaDeb("");
              }}
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                border: ativa ? `1px solid color-mix(in srgb, var(--brand-primary, #7c3aed) 45%, transparent)` : `1px solid ${t.cardBorder}`,
                background: ativa ? "color-mix(in srgb, var(--brand-primary, #7c3aed) 12%, transparent)" : t.cardBg,
                color: ativa ? t.text : t.textMuted,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: FONT.body,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Icon size={16} aria-hidden />
              {label}
            </button>
          );
        })}
      </div>

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
      ) : buscaAtiva ? (
        <div style={{ marginTop: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, marginBottom: 14 }}>Resultados da busca</h2>
          {resultadosBusca.com.length === 0 && resultadosBusca.doc.length === 0 && resultadosBusca.tk.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center", color: t.textMuted, fontSize: 13 }}>
              Nenhum resultado para os termos pesquisados.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {resultadosBusca.com.length > 0 ? (
                <section aria-labelledby="rh-busca-com">
                  <h3 id="rh-busca-com" style={{ fontSize: 12, fontWeight: 800, color: t.textMuted, marginBottom: 8, fontFamily: FONT.body }}>
                    Comunicados
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {resultadosBusca.com.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setModalCom(c)}
                        style={{
                          textAlign: "left",
                          padding: 14,
                          borderRadius: 12,
                          border: `1px solid ${t.cardBorder}`,
                          background: t.cardBg,
                          boxShadow: cardShadow,
                          cursor: "pointer",
                          fontFamily: FONT.body,
                        }}
                      >
                        <span style={{ fontWeight: 800, color: t.text }}>{c.titulo}</span>
                        <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>{truncPreview(c.corpo)}</div>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
              {resultadosBusca.doc.length > 0 ? (
                <section aria-labelledby="rh-busca-doc">
                  <h3 id="rh-busca-doc" style={{ fontSize: 12, fontWeight: 800, color: t.textMuted, marginBottom: 8, fontFamily: FONT.body }}>
                    Políticas e normativas
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {resultadosBusca.doc.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setModalDoc(d)}
                        style={{
                          textAlign: "left",
                          padding: 14,
                          borderRadius: 12,
                          border: `1px solid ${t.cardBorder}`,
                          background: t.cardBg,
                          boxShadow: cardShadow,
                          cursor: "pointer",
                          fontFamily: FONT.body,
                        }}
                      >
                        <span style={{ fontWeight: 800, color: t.text }}>{d.titulo}</span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
              {resultadosBusca.tk.length > 0 ? (
                <section aria-labelledby="rh-busca-tk">
                  <h3 id="rh-busca-tk" style={{ fontSize: 12, fontWeight: 800, color: t.textMuted, marginBottom: 8, fontFamily: FONT.body }}>
                    RH Talks
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {resultadosBusca.tk.map((tk) => (
                      <button
                        key={tk.id}
                        type="button"
                        onClick={() => setModalTalk(tk)}
                        style={{
                          textAlign: "left",
                          padding: 14,
                          borderRadius: 12,
                          border: `1px solid ${t.cardBorder}`,
                          background: t.cardBg,
                          boxShadow: cardShadow,
                          cursor: "pointer",
                          fontFamily: FONT.body,
                        }}
                      >
                        <span style={{ fontWeight: 800, color: t.text }}>
                          RH Talk #{tk.numero} — {tk.titulo}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </div>
      ) : (
        <>
          <div
            role="tabpanel"
            id={`panel-rh-portal-${aba}`}
            aria-labelledby={`tab-rh-portal-${aba}`}
            style={{ marginTop: 4 }}
          >
            {aba === "comunicados" ? (
              <div>
                {comunicadoPinned ? (
                  <div
                    style={{
                      marginBottom: 20,
                      padding: 16,
                      borderRadius: 14,
                      background: "rgba(245,158,11,0.12)",
                      border: "1px solid rgba(245,158,11,0.35)",
                      boxShadow: cardShadow,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <Pin size={16} color="#b45309" aria-hidden />
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#b45309", fontFamily: FONT.body }}>Fixado</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalCom(comunicadoPinned)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        fontFamily: FONT.body,
                      }}
                    >
                      <div style={{ fontSize: 16, fontWeight: 900, color: t.text, fontFamily: FONT_TITLE }}>{comunicadoPinned.titulo}</div>
                      <div style={{ fontSize: 13, color: t.textMuted, marginTop: 6 }}>{truncPreview(comunicadoPinned.corpo)}</div>
                    </button>
                  </div>
                ) : null}

                <FiltroSubtabPills
                  filtroAtivo={filtroCatCom}
                  onFiltro={setFiltroCatCom}
                  configs={SUBTABS_COMUNICADO}
                  categorias={categoriasCom}
                  t={t}
                />
                {comunicadosLista.length === 0 && !comunicadoPinned ? (
                  <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13 }}>
                    Sem comunicados publicados.
                  </div>
                ) : comunicadosLista.length === 0 ? (
                  <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13 }}>
                    Nenhum outro comunicado neste filtro.
                  </div>
                ) : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                    {comunicadosLista.map((c) => {
                      const cat = c.categoria;
                      const accent = cat?.accent_hex ?? "#7c3aed";
                      const rec = user?.id ? receipts.get(receiptKey("comunicado", c.id)) : undefined;
                      const lido = Boolean(rec?.read_at);
                      const ackOk = Boolean(rec?.acknowledged_at);
                      const pendAck = c.requires_acknowledgment && !ackOk;
                      const bordaEsquerda = pendAck ? "3px solid #e84025" : !lido ? `3px solid ${accent}` : "none";

                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => setModalCom(c)}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              padding: 16,
                              borderRadius: 14,
                              border: `1px solid ${t.cardBorder}`,
                              borderLeft: bordaEsquerda,
                              background: t.cardBg,
                              boxShadow: cardShadow,
                              cursor: "pointer",
                              fontFamily: FONT.body,
                            }}
                          >
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}>
                              {cat ? (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    padding: "3px 8px",
                                    borderRadius: 6,
                                    background: `${accent}22`,
                                    color: accent,
                                  }}
                                >
                                  {cat.label}
                                </span>
                              ) : null}
                              {isNovo(c.published_at) ? (
                                <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6, background: "#a78bfa33", color: "#a78bfa" }}>Novo</span>
                              ) : null}
                              {c.is_pinned ? (
                                <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6, background: "rgba(245,158,11,0.2)", color: "#b45309" }}>Fixado</span>
                              ) : null}
                              {pendAck ? (
                                <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6, background: "rgba(232,64,37,0.15)", color: "#e84025" }}>
                                  Confirmação pendente
                                </span>
                              ) : null}
                              {c.requires_acknowledgment && ackOk ? (
                                <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6, background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>Ciente</span>
                              ) : null}
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 900, color: t.text, fontFamily: FONT_TITLE }}>{c.titulo}</div>
                            <div style={{ fontSize: 13, color: t.textMuted, marginTop: 6 }}>{truncPreview(c.corpo)}</div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, flexWrap: "wrap", gap: 8 }}>
                              <span style={{ fontSize: 12, color: t.textMuted }}>
                                {(c.published_by && nomeAutores[c.published_by]) || "Equipe"} · RH · {fmtDataPublicacao(c.published_at)}
                              </span>
                              {lido ? <Check size={16} color={t.textMuted} aria-label="Lido" /> : null}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : aba === "politicas" ? (
              <div>
                <FiltroSubtabPills
                  filtroAtivo={filtroCatPol}
                  onFiltro={setFiltroCatPol}
                  configs={SUBTABS_POLITICA}
                  categorias={categoriasPol}
                  t={t}
                />
                {documentosFiltrados.length === 0 ? (
                  <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13 }}>Sem políticas publicadas.</div>
                ) : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                    {documentosFiltrados.map((d) => {
                      const cat = d.categoria;
                      const accent = cat?.accent_hex ?? "#7c3aed";
                      const rec = user?.id ? receipts.get(receiptKey("documento", d.id)) : undefined;
                      const atualizado = docAtualizadoNos30Dias(d.updated_at);
                      const ackOk = Boolean(rec?.acknowledged_at);
                      const pendAck = d.requires_acknowledgment && !ackOk;
                      return (
                        <li key={d.id}>
                          <div
                            style={{
                              padding: 16,
                              borderRadius: 14,
                              border: `1px solid ${t.cardBorder}`,
                              borderLeft: pendAck ? "3px solid #e84025" : `3px solid ${accent}`,
                              background: t.cardBg,
                              boxShadow: cardShadow,
                              fontFamily: FONT.body,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                              <div
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 10,
                                  background: `${accent}22`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <FileText size={20} color={accent} aria-hidden />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 16, fontWeight: 900, color: t.text, fontFamily: FONT_TITLE }}>{d.titulo}</div>
                                <div style={{ fontSize: 12, color: t.textMuted, marginTop: 6 }}>
                                  Atualizado em {fmtDataPublicacao(d.updated_at)}
                                  {d.paginas != null ? ` · ${d.paginas} páginas` : ""}
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                                  {atualizado ? (
                                    <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6, background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>Atualizado</span>
                                  ) : null}
                                  {pendAck ? (
                                    <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6, background: "rgba(232,64,37,0.15)", color: "#e84025" }}>
                                      Confirmação pendente
                                    </span>
                                  ) : null}
                                  {d.requires_acknowledgment && ackOk ? (
                                    <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6, background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>Ciente</span>
                                  ) : null}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setModalDoc(d)}
                                  style={{
                                    marginTop: 12,
                                    padding: "8px 14px",
                                    borderRadius: 10,
                                    border: `1px solid color-mix(in srgb, var(--brand-primary, #7c3aed) 35%, transparent)`,
                                    background: "color-mix(in srgb, var(--brand-primary, #7c3aed) 10%, transparent)",
                                    color: t.text,
                                    fontWeight: 700,
                                    fontSize: 12,
                                    cursor: "pointer",
                                    fontFamily: FONT.body,
                                  }}
                                >
                                  Visualizar
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : (
              <div>
                <div
                  style={{
                    marginBottom: 16,
                    borderRadius: 14,
                    border: `1px solid ${t.cardBorder}`,
                    background: t.cardBg,
                    padding: "12px 20px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      aria-label="Mês anterior"
                      style={{ ...btnNavTalk, opacity: talkCarouselPrimeiro ? 0.35 : 1, cursor: talkCarouselPrimeiro ? "not-allowed" : "pointer" }}
                      onClick={() => setIdxMesTalk((i) => Math.max(0, i - 1))}
                      disabled={talkCarouselPrimeiro}
                    >
                      <ChevronLeft size={14} aria-hidden="true" />
                    </button>
                    <span style={{ fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT.body, minWidth: "min(100%, 180px)", textAlign: "center" }}>
                      {mesTalkSel?.label ?? "—"}
                    </span>
                    <button
                      type="button"
                      aria-label="Próximo mês"
                      style={{ ...btnNavTalk, opacity: talkCarouselUltimo ? 0.35 : 1, cursor: talkCarouselUltimo ? "not-allowed" : "pointer" }}
                      onClick={() => setIdxMesTalk((i) => Math.min(mesesTalksDisponiveis.length - 1, i + 1))}
                      disabled={talkCarouselUltimo}
                    >
                      <ChevronRight size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                {talksFiltrados.length === 0 ? (
                  <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13 }}>Sem atas neste período.</div>
                ) : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                    {talksFiltrados.map((tk) => {
                      const n = talkCounts[tk.id] ?? 0;
                      const restrito = n > 0 && !talkParticipantTalkIds.has(tk.id);
                      return (
                        <li key={tk.id}>
                          <div
                            style={{
                              padding: 16,
                              borderRadius: 14,
                              border: `1px solid ${t.cardBorder}`,
                              borderLeft: "3px solid #a78bfa",
                              background: t.cardBg,
                              boxShadow: cardShadow,
                              fontFamily: FONT.body,
                            }}
                          >
                            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 8 }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  padding: "4px 10px",
                                  borderRadius: 8,
                                  background: "color-mix(in srgb, #a78bfa 18%, transparent)",
                                  color: "#a78bfa",
                                }}
                              >
                                {new Date(tk.data_reuniao).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                              </span>
                              {restrito ? (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: t.textMuted }}>
                                  <Lock size={14} aria-hidden />
                                  Acesso restrito a participantes
                                </span>
                              ) : null}
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 900, color: t.text, fontFamily: FONT_TITLE }}>
                              RH Talk #{tk.numero} — {tk.titulo}
                            </div>
                            <div style={{ fontSize: 12, color: t.textMuted, marginTop: 6 }}>
                              {n > 0 ? `${n} participante${n === 1 ? "" : "s"}` : "Todos"} · {tk.duracao_min} min
                            </div>
                            <button
                              type="button"
                              onClick={() => setModalTalk(tk)}
                              style={{
                                marginTop: 12,
                                padding: "8px 14px",
                                borderRadius: 10,
                                border: `1px solid color-mix(in srgb, var(--brand-primary, #7c3aed) 35%, transparent)`,
                                background: "color-mix(in srgb, var(--brand-primary, #7c3aed) 10%, transparent)",
                                color: t.text,
                                fontWeight: 700,
                                fontSize: 12,
                                cursor: "pointer",
                                fontFamily: FONT.body,
                              }}
                            >
                              Ver ata
                            </button>
                          </div>
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

      {modalCom ? (
        <ModalComunicado
          c={modalCom}
          t={t}
          brand={brand}
          nomeAutor={(modalCom.published_by && nomeAutores[modalCom.published_by]) || "Equipe"}
          receipt={user?.id ? receipts.get(receiptKey("comunicado", modalCom.id)) : undefined}
          onClose={() => setModalCom(null)}
          onAck={() => void confirmarCiencia("comunicado", modalCom.id)}
        />
      ) : null}

      {modalDoc ? (
        <ModalDocumento
          d={modalDoc}
          t={t}
          brand={brand}
          receipt={user?.id ? receipts.get(receiptKey("documento", modalDoc.id)) : undefined}
          onClose={() => setModalDoc(null)}
          onAck={() => void confirmarCiencia("documento", modalDoc.id)}
        />
      ) : null}

      {modalTalk ? (
        <ModalRhTalk
          tk={modalTalk}
          t={t}
          podeVer={podeVerAta(modalTalk)}
          onClose={() => setModalTalk(null)}
        />
      ) : null}

      <style>{`
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `}</style>
    </div>
  );
}

function ModalComunicado({
  c,
  t,
  brand,
  nomeAutor,
  receipt,
  onClose,
  onAck,
}: {
  c: RhPortalComunicado;
  t: ReturnType<typeof useApp>["theme"];
  brand: ReturnType<typeof useDashboardBrand>;
  nomeAutor: string;
  receipt: ReadReceiptRow | undefined;
  onClose: () => void;
  onAck: () => void;
}) {
  const ack = Boolean(receipt?.acknowledged_at);
  const precisa = c.requires_acknowledgment;
  return (
    <ModalBase onClose={onClose} maxWidth={560}>
      <ModalHeader title={c.titulo} onClose={onClose} />
      <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 16, fontFamily: FONT.body }}>
        {nomeAutor} · RH · {fmtDataPublicacao(c.published_at)}
      </div>
      <div style={{ fontSize: 14, color: t.text, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: FONT.body }}>{c.corpo}</div>
      {precisa && !ack ? (
        <div
          style={{
            marginTop: 22,
            padding: 16,
            borderRadius: 12,
            border: "1px solid rgba(245,158,11,0.4)",
            background: "rgba(245,158,11,0.1)",
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
            <AlertTriangle size={18} color="#f59e0b" aria-hidden />
            <div style={{ fontSize: 13, color: t.text, fontFamily: FONT.body }}>
              Este comunicado requer a sua confirmação de ciência. Ao confirmar, declara ter lido e compreendido o conteúdo acima.
            </div>
          </div>
          <button
            type="button"
            onClick={onAck}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              background: ctaGradient(brand),
              color: "#fff",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: FONT.body,
            }}
          >
            Li e estou ciente
          </button>
        </div>
      ) : precisa && ack && receipt?.acknowledged_at ? (
        <div style={{ marginTop: 18, fontSize: 13, color: "#22c55e", display: "flex", alignItems: "center", gap: 8, fontFamily: FONT.body }}>
          <Check size={18} aria-hidden />
          Ciência confirmada em{" "}
          {new Date(receipt.acknowledged_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </div>
      ) : null}
    </ModalBase>
  );
}

function ModalDocumento({
  d,
  t,
  brand,
  receipt,
  onClose,
  onAck,
}: {
  d: RhPortalDocumento;
  t: ReturnType<typeof useApp>["theme"];
  brand: ReturnType<typeof useDashboardBrand>;
  receipt: ReadReceiptRow | undefined;
  onClose: () => void;
  onAck: () => void;
}) {
  const ack = Boolean(receipt?.acknowledged_at);
  const precisa = d.requires_acknowledgment;
  const texto = (d.corpo ?? "").trim();
  return (
    <ModalBase onClose={onClose} maxWidth={560}>
      <ModalHeader title={d.titulo} onClose={onClose} />
      {texto ? (
        <div style={{ fontSize: 14, color: t.text, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: FONT.body }}>{texto}</div>
      ) : (
        <div style={{ fontSize: 14, color: t.textMuted, fontFamily: FONT.body }}>
          Conteúdo disponível em breve. Não há ficheiro anexado para visualização neste registo.
        </div>
      )}
      {d.storage_path ? (
        <p style={{ fontSize: 12, color: t.textMuted, marginTop: 12, fontFamily: FONT.body }}>
          Documento com anexo no armazenamento — a visualização integrada será ligada numa próxima etapa. Sem botão de download nesta interface.
        </p>
      ) : null}
      {precisa && !ack ? (
        <div style={{ marginTop: 22, padding: 16, borderRadius: 12, border: "1px solid rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.1)" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
            <AlertTriangle size={18} color="#f59e0b" aria-hidden />
            <div style={{ fontSize: 13, color: t.text, fontFamily: FONT.body }}>Esta política requer confirmação de ciência.</div>
          </div>
          <button
            type="button"
            onClick={onAck}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              background: ctaGradient(brand),
              color: "#fff",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: FONT.body,
            }}
          >
            Li e estou ciente
          </button>
        </div>
      ) : precisa && ack && receipt?.acknowledged_at ? (
        <div style={{ marginTop: 18, fontSize: 13, color: "#22c55e", display: "flex", alignItems: "center", gap: 8, fontFamily: FONT.body }}>
          <Check size={18} aria-hidden />
          Ciência confirmada em{" "}
          {new Date(receipt.acknowledged_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </div>
      ) : null}
    </ModalBase>
  );
}

function ModalRhTalk({
  tk,
  t,
  podeVer,
  onClose,
}: {
  tk: RhPortalRhTalk;
  t: ReturnType<typeof useApp>["theme"];
  podeVer: boolean;
  onClose: () => void;
}) {
  return (
    <ModalBase onClose={onClose} maxWidth={520}>
      <ModalHeader title={`RH Talk #${tk.numero} — ${tk.titulo}`} onClose={onClose} />
      {!podeVer ? (
        <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 14, color: t.textMuted, fontFamily: FONT.body }}>
          <Lock size={20} color={t.textMuted} aria-hidden />
          Acesso restrito a participantes desta reunião.
        </div>
      ) : (
        <>
          {tk.resumo ? (
            <div style={{ fontSize: 14, color: t.text, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: FONT.body }}>{tk.resumo}</div>
          ) : (
            <div style={{ fontSize: 14, color: t.textMuted, fontFamily: FONT.body }}>Sem resumo registado para esta ata.</div>
          )}
          {tk.storage_path ? (
            <p style={{ fontSize: 12, color: t.textMuted, marginTop: 12, fontFamily: FONT.body }}>Anexo no armazenamento — sem download nesta interface.</p>
          ) : null}
        </>
      )}
    </ModalBase>
  );
}
