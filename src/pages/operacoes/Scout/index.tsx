import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Plataforma = "Twitch" | "YouTube" | "Kick" | "Instagram" | "TikTok";
const PLATAFORMAS: Plataforma[] = ["Twitch", "YouTube", "Kick", "Instagram", "TikTok"];
const PLAT_COLOR: Record<Plataforma, string> = {
  Twitch: "#9146ff", YouTube: "#ff0000", Kick: "#53fc18",
  Instagram: "#e1306c", TikTok: "#010101",
};
const PLAT_ICON: Record<Plataforma, string> = {
  Twitch: "🟣", YouTube: "▶️", Kick: "🟢", Instagram: "📸", TikTok: "🎵",
};

export type StatusScout = "visualizado" | "contato" | "negociacao" | "fechado";
const STATUS_SCOUT_OPTS: StatusScout[] = ["visualizado", "contato", "negociacao", "fechado"];
const STATUS_SCOUT_LABEL: Record<StatusScout, string> = {
  visualizado: "Visualizado", contato: "Contato", negociacao: "Negociação", fechado: "Fechado",
};
const STATUS_SCOUT_COLOR: Record<StatusScout, string> = {
  visualizado: "#6b7280", contato: "#3b82f6", negociacao: "#f59e0b", fechado: "#059669",
};

const CATEGORIAS = ["Vida Real", "Jogos Populares", "Variedades", "Esportes", "Cassino"] as const;
type Categoria = (typeof CATEGORIAS)[number];

const TIPO_CONTATO_OPTS = [
  { value: "agente" as const, label: "Agente" },
  { value: "plataforma" as const, label: "Plataforma" },
  { value: "direto" as const, label: "Direto" },
];

const LIVE_CASSINO_OPTS = [
  { value: "" as const, label: "—" },
  { value: "sim" as const, label: "Sim" },
  { value: "nao" as const, label: "Não" },
];

export interface ScoutInfluencer {
  id: string;
  nome_artistico: string;
  status: StatusScout;
  tipo_contato?: string | null;
  nome_agente?: string | null;
  telefone?: string | null;
  cache_negociado?: number | null;
  live_cassino?: string | null;
  email?: string | null;
  plataformas?: string[];
  link_twitch?: string | null;
  link_youtube?: string | null;
  link_kick?: string | null;
  link_instagram?: string | null;
  link_tiktok?: string | null;
  views_twitch?: number | null;
  views_youtube?: number | null;
  views_kick?: number | null;
  views_instagram?: number | null;
  views_tiktok?: number | null;
  categorias?: string[];
  user_id?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface ScoutAnotacao {
  id: string;
  scout_id: string;
  usuario_id?: string | null;
  texto: string;
  created_at: string;
  usuario_nome?: string;
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getViewsTotal(s: ScoutInfluencer): number {
  const v = (s.views_twitch ?? 0) + (s.views_youtube ?? 0) + (s.views_kick ?? 0) + (s.views_instagram ?? 0) + (s.views_tiktok ?? 0);
  return v || 0;
}

function getPrimaryPlataforma(s: ScoutInfluencer): string {
  const plats = s.plataformas ?? [];
  return plats[0] ?? "—";
}

function getLiveCassinoLabel(v: string | null | undefined): string {
  if (!v) return "—";
  return v === "sim" ? "Sim" : "Não";
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function Scout() {
  const { theme: t, user } = useApp();
  const perm = usePermission("scout");
  const [list, setList] = useState<ScoutInfluencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: "visualizar" | "editar"; scout?: ScoutInfluencer } | null>(null);
  const [modalNovo, setModalNovo] = useState(false);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterPlat, setFilterPlat] = useState<string>("todas");
  const [cacheMin, setCacheMin] = useState(0);
  const [cacheMax, setCacheMax] = useState(10000);
  const [cacheRange, setCacheRange] = useState<[number, number]>([0, 10000]);
  const [viewsMin, setViewsMin] = useState(0);
  const [viewsMax, setViewsMax] = useState(1000000);
  const [viewsRange, setViewsRange] = useState<[number, number]>([0, 1000000]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("scout_influencer")
      .select("*")
      .order("nome_artistico");
    if (error) {
      console.error("[Scout] Erro ao carregar:", error);
      setList([]);
    } else {
      setList((data ?? []) as ScoutInfluencer[]);
      const caches = (data ?? [])
        .map((s: ScoutInfluencer) => s.cache_negociado ?? 0)
        .filter((v: number) => v > 0);
      const views = (data ?? []).map((s: ScoutInfluencer) => getViewsTotal(s)).filter((v: number) => v > 0);
      if (caches.length > 0) {
        setCacheMax(Math.max(...caches, 5000));
        setCacheRange([0, Math.max(...caches, 5000)]);
      }
      if (views.length > 0) {
        setViewsMax(Math.max(...views, 100000));
        setViewsRange([0, Math.max(...views, 100000)]);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const ativos = list.filter((s) => s.status !== "fechado");
  const filtered = ativos.filter((s) => {
    const searchLower = search.toLowerCase();
    if (search && !(s.nome_artistico ?? "").toLowerCase().includes(searchLower)) return false;
    if (filterStatus !== "todos" && s.status !== filterStatus) return false;
    if (filterPlat !== "todas") {
      const plats = s.plataformas ?? [];
      if (!plats.includes(filterPlat)) return false;
    }
    const cache = s.cache_negociado ?? 0;
    if (cache < cacheRange[0] || cache > cacheRange[1]) return false;
    const views = getViewsTotal(s);
    if (views < viewsRange[0] || views > viewsRange[1]) return false;
    return true;
  });

  const porStatus: Record<string, number> = { visualizado: 0, contato: 0, negociacao: 0 };
  const porPlat: Record<string, number> = {};
  ativos.forEach((s) => {
    if (s.status !== "fechado") porStatus[s.status] = (porStatus[s.status] ?? 0) + 1;
    (s.plataformas ?? []).forEach((p) => { porPlat[p] = (porPlat[p] ?? 0) + 1; });
  });

  const cardStyle: React.CSSProperties = {
    background: t.cardBg, border: `1px solid ${t.cardBorder}`,
    borderRadius: "16px", padding: "18px 20px", marginBottom: "10px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: "12px", flexWrap: "wrap",
  };
  const selectStyle: React.CSSProperties = {
    flex: 1, minWidth: 120, padding: "8px 12px", borderRadius: "10px",
    border: `1px solid ${t.inputBorder}`, background: t.inputBg,
    color: t.inputText, fontSize: "12px", fontFamily: FONT.body,
    cursor: "pointer", outline: "none",
  };

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar a página Scout.
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 900, color: t.text, fontFamily: FONT.title, margin: "0 0 6px" }}>
            🔍 Scout
          </h1>
          <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, margin: 0 }}>
            Prospecte e registre informações de influencers para parcerias.
          </p>
        </div>
        <button
          onClick={() => setModalNovo(true)}
          style={{
            padding: "10px 18px", borderRadius: "10px", border: "none", cursor: "pointer",
            background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
            color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: FONT.body,
          }}
        >
          + Adicionar Prospecto
        </button>
      </div>

      {/* Bloco 1: Filtros */}
      <div style={{ marginBottom: "20px" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome do influencer..."
          style={{
            width: "100%", boxSizing: "border-box", padding: "10px 16px",
            borderRadius: "12px", border: `1px solid ${t.inputBorder}`,
            background: t.inputBg, color: t.inputText, fontSize: "13px",
            fontFamily: FONT.body, outline: "none", marginBottom: "10px",
          }}
        />
        <div style={{ display: "flex", gap: "10px", marginBottom: "12px", flexWrap: "wrap" }}>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
            <option value="todos">Todos os status</option>
            {STATUS_SCOUT_OPTS.filter((s) => s !== "fechado").map((s) => (
              <option key={s} value={s}>{STATUS_SCOUT_LABEL[s]}</option>
            ))}
          </select>
          <select value={filterPlat} onChange={(e) => setFilterPlat(e.target.value)} style={selectStyle}>
            <option value="todas">Todas as plataformas</option>
            {PLATAFORMAS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "12px" }}>
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "12px", padding: "14px 18px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: t.label, fontFamily: FONT.body, marginBottom: "8px" }}>💰 Faixa Cachê (R$)</div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input type="number" value={cacheRange[0]} onChange={(e) => setCacheRange(([, m]) => [Number(e.target.value), m])} placeholder="Min" style={{ ...selectStyle, flex: 1, minWidth: 0 }} />
              <span style={{ color: t.textMuted, fontSize: "12px" }}>até</span>
              <input type="number" value={cacheRange[1]} onChange={(e) => setCacheRange(([mi]) => [mi, Number(e.target.value)])} placeholder="Max" style={{ ...selectStyle, flex: 1, minWidth: 0 }} />
            </div>
          </div>
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "12px", padding: "14px 18px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: t.label, fontFamily: FONT.body, marginBottom: "8px" }}>👁️ Faixa Views</div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input type="number" value={viewsRange[0]} onChange={(e) => setViewsRange(([, m]) => [Number(e.target.value), m])} placeholder="Min" style={{ ...selectStyle, flex: 1, minWidth: 0 }} />
              <span style={{ color: t.textMuted, fontSize: "12px" }}>até</span>
              <input type="number" value={viewsRange[1]} onChange={(e) => setViewsRange(([mi]) => [mi, Number(e.target.value)])} placeholder="Max" style={{ ...selectStyle, flex: 1, minWidth: 0 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Bloco 2: Consolidado */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {(["visualizado", "contato", "negociacao"] as const).map((s) => (
          <div key={s} style={{ background: t.cardBg, border: `1px solid ${STATUS_SCOUT_COLOR[s]}44`, borderRadius: "16px", padding: "20px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: STATUS_SCOUT_COLOR[s], letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT.body, marginBottom: "6px" }}>
              {STATUS_SCOUT_LABEL[s]}
            </div>
            <div style={{ fontSize: "32px", fontWeight: 900, color: t.text, fontFamily: FONT.title }}>{porStatus[s] ?? 0}</div>
          </div>
        ))}
        <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "16px", padding: "20px", gridColumn: "1 / -1" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: t.label, letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT.body, marginBottom: "10px" }}>Por Plataforma</div>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {Object.entries(porPlat)
              .sort((a, b) => b[1] - a[1])
              .map(([plat, n]) => (
                <div key={plat} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "13px", color: PLAT_COLOR[plat as Plataforma], fontFamily: FONT.body }}>
                    {PLAT_ICON[plat as Plataforma]} {plat}
                  </span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: t.text, fontFamily: FONT.body }}>{n}</span>
                </div>
              ))}
            {Object.keys(porPlat).length === 0 && (
              <span style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body }}>Nenhuma plataforma cadastrada</span>
            )}
          </div>
        </div>
      </div>

      {/* Bloco 3: Cards */}
      {!loading && <div style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "14px" }}>{filtered.length} prospecto(s)</div>}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: t.textMuted, fontFamily: FONT.body }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "16px", padding: "48px", textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
          Nenhum prospecto encontrado.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
          {filtered.map((s) => (
            <div key={s.id} style={{ ...cardStyle, flexDirection: "column", alignItems: "flex-start" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%", marginBottom: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: t.text, fontFamily: FONT.body }}>{s.nome_artistico}</span>
                    <span style={{ padding: "3px 10px", borderRadius: "20px", background: `${STATUS_SCOUT_COLOR[s.status]}22`, color: STATUS_SCOUT_COLOR[s.status], fontSize: "11px", fontWeight: 700, fontFamily: FONT.body }}>
                      {STATUS_SCOUT_LABEL[s.status]}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body }}>
                    {(s.cache_negociado && s.cache_negociado > 0) ? formatBRL(s.cache_negociado) : "—"} / Live Cassino: {getLiveCassinoLabel(s.live_cassino)}
                  </div>
                  <div style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body, marginTop: "4px" }}>
                    {getPrimaryPlataforma(s)} / {getViewsTotal(s) > 0 ? getViewsTotal(s).toLocaleString("pt-BR") + " views" : "—"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <button onClick={() => setModal({ mode: "visualizar", scout: s })} style={{ padding: "6px 12px", borderRadius: "8px", border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.label, fontSize: "11px", fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}>👁️ Ver</button>
                  <button onClick={() => setModal({ mode: "editar", scout: s })} style={{ padding: "6px 12px", borderRadius: "8px", border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "#fff", fontSize: "11px", fontWeight: 700, fontFamily: FONT.body }}>✏️ Editar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal?.mode === "visualizar" && modal.scout && (
        <ModalVisualizar scout={modal.scout} onClose={() => setModal(null)} />
      )}
      {modal?.mode === "editar" && modal.scout && (
        <ModalEditar scout={modal.scout} onClose={() => setModal(null)} onSaved={() => { setModal(null); loadData(); }} />
      )}
      {modalNovo && (
        <ModalEditar scout={null} onClose={() => setModalNovo(false)} onSaved={() => { setModalNovo(false); loadData(); }} />
      )}
    </div>
  );
}

// ─── Modal Visualizar ─────────────────────────────────────────────────────────
function ModalVisualizar({ scout, onClose }: { scout: ScoutInfluencer; onClose: () => void }) {
  const { theme: t } = useApp();
  const [tab, setTab] = useState<"contato" | "canais" | "anotacoes">("contato");
  const [anotacoes, setAnotacoes] = useState<ScoutAnotacao[]>([]);
  const labelStyle: React.CSSProperties = { display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "1.1px", textTransform: "uppercase", color: t.label, marginBottom: "5px", fontFamily: FONT.body };
  const row: React.CSSProperties = { marginBottom: "14px" };
  const val = (v?: string | number | null) => <span style={{ fontSize: "13px", color: v ? t.text : t.textMuted, fontFamily: FONT.body }}>{v ?? "—"}</span>;

  useEffect(() => {
    if (scout?.id) {
      supabase.from("scout_anotacoes").select("id, scout_id, usuario_id, texto, created_at").eq("scout_id", scout.id).order("created_at", { ascending: false }).then(({ data }) => {
        const lista = (data ?? []) as ScoutAnotacao[];
        if (lista.some((a) => a.usuario_id)) {
          const ids = [...new Set(lista.map((a) => a.usuario_id).filter(Boolean))] as string[];
          if (ids.length > 0) {
            supabase.from("profiles").select("id, name").in("id", ids).then(({ data: profs }) => {
              const map: Record<string, string> = {};
              (profs ?? []).forEach((p: { id: string; name: string }) => { map[p.id] = p.name ?? p.id; });
              setAnotacoes(lista.map((a) => ({ ...a, usuario_nome: a.usuario_id ? map[a.usuario_id] : "—" })));
            });
          } else setAnotacoes(lista);
        } else setAnotacoes(lista);
      });
    } else setAnotacoes([]);
  }, [scout?.id]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "520px", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: t.text, fontFamily: FONT.title }}>{scout.nome_artistico}</h2>
            <span style={{ padding: "4px 12px", borderRadius: "20px", background: `${STATUS_SCOUT_COLOR[scout.status]}22`, color: STATUS_SCOUT_COLOR[scout.status], fontSize: "12px", fontWeight: 700, fontFamily: FONT.body }}>{STATUS_SCOUT_LABEL[scout.status]}</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: t.textMuted }}>✕</button>
        </div>
        <div style={{ background: `${BASE_COLORS.blue}08`, border: `1px solid ${BASE_COLORS.blue}22`, borderRadius: "10px", padding: "8px 14px", fontSize: "12px", color: BASE_COLORS.blue, fontFamily: FONT.body, marginBottom: "18px" }}>👁️ Modo visualização — somente leitura</div>
        <div style={{ display: "flex", gap: "6px", marginBottom: "20px", flexWrap: "wrap" }}>
          {(["contato", "canais", "anotacoes"] as const).map((tb) => (
            <button key={tb} onClick={() => setTab(tb)}
              style={{ padding: "7px 14px", borderRadius: "20px", border: `1px solid ${tab === tb ? BASE_COLORS.purple : t.cardBorder}`, background: tab === tb ? `${BASE_COLORS.purple}22` : t.inputBg, color: tab === tb ? BASE_COLORS.purple : t.textMuted, fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: FONT.body }}>
              {tb === "contato" ? "Contato" : tb === "canais" ? "Canais" : "Anotações"}
            </button>
          ))}
        </div>
        {tab === "contato" && (
          <>
            <div style={row}><label style={labelStyle}>E-mail</label>{val(scout.email)}</div>
            <div style={row}><label style={labelStyle}>Tipo de Contato</label>{val(scout.tipo_contato ? TIPO_CONTATO_OPTS.find((o) => o.value === scout.tipo_contato)?.label : null)}</div>
            {scout.tipo_contato === "agente" && <div style={row}><label style={labelStyle}>Nome do Agente</label>{val(scout.nome_agente)}</div>}
            <div style={row}><label style={labelStyle}>Telefone</label>{val(scout.telefone)}</div>
            <div style={row}><label style={labelStyle}>Cachê Negociado</label>{val(scout.cache_negociado ? formatBRL(scout.cache_negociado) : null)}</div>
            <div style={row}><label style={labelStyle}>Live Cassino</label>{val(getLiveCassinoLabel(scout.live_cassino))}</div>
          </>
        )}
        {tab === "canais" && (
          <>
            <div style={row}><label style={labelStyle}>Plataformas</label>{val((scout.plataformas ?? []).join(", ") || null)}</div>
            {(scout.plataformas ?? []).map((p) => {
              const link = scout[`link_${p.toLowerCase()}` as keyof ScoutInfluencer] as string;
              const views = scout[`views_${p.toLowerCase()}` as keyof ScoutInfluencer] as number;
              return link || views ? (
                <div key={p} style={row}>
                  <label style={labelStyle}>{p}</label>
                  {link && <a href={link.startsWith("http") ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "13px", color: PLAT_COLOR[p as Plataforma], fontFamily: FONT.body }}>{link}</a>}
                  {views != null && views > 0 && <span style={{ marginLeft: "8px", fontSize: "13px", color: t.textMuted }}>{views.toLocaleString("pt-BR")} views</span>}
                </div>
              ) : null;
            })}
            <div style={row}><label style={labelStyle}>Categorias</label>{val((scout.categorias ?? []).join(", ") || null)}</div>
          </>
        )}
        {tab === "anotacoes" && (
          <div style={row}>
            <label style={labelStyle}>Histórico de Anotações</label>
            <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
              {anotacoes.length === 0 ? (
                <span style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body }}>Nenhuma anotação ainda.</span>
              ) : anotacoes.map((a) => (
                <div key={a.id} style={{ padding: "10px 14px", borderRadius: "10px", border: `1px solid ${t.cardBorder}`, background: t.inputBg, fontSize: "12px", fontFamily: FONT.body }}>
                  <div style={{ color: t.text }}>{a.texto}</div>
                  <div style={{ fontSize: "11px", color: t.textMuted, marginTop: "4px" }}>{a.usuario_nome ?? "—"} • {new Date(a.created_at).toLocaleString("pt-BR")}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal Editar ─────────────────────────────────────────────────────────────
function ModalEditar({ scout, onClose, onSaved }: { scout: ScoutInfluencer | null; onClose: () => void; onSaved: () => void }) {
  const { theme: t, user } = useApp();
  const [tab, setTab] = useState<"contato" | "canais" | "anotacoes">("contato");
  const [nomeArtistico, setNomeArtistico] = useState(scout?.nome_artistico ?? "");
  const [status, setStatus] = useState<StatusScout>(scout?.status ?? "visualizado");
  const [tipoContato, setTipoContato] = useState<string>(scout?.tipo_contato ?? "");
  const [nomeAgente, setNomeAgente] = useState(scout?.nome_agente ?? "");
  const [telefone, setTelefone] = useState(scout?.telefone ?? "");
  const [cacheNegociado, setCacheNegociado] = useState<number>(scout?.cache_negociado ?? 0);
  const [liveCassino, setLiveCassino] = useState<string>(scout?.live_cassino ?? "");
  const [email, setEmail] = useState(scout?.email ?? "");
  const [plataformas, setPlataformas] = useState<string[]>(scout?.plataformas ?? []);
  const [categorias, setCategorias] = useState<string[]>(scout?.categorias ?? []);
  const [novoTextoAnotacao, setNovoTextoAnotacao] = useState("");
  const [anotacoes, setAnotacoes] = useState<ScoutAnotacao[]>([]);
  const [links, setLinks] = useState<Record<string, string>>({
    twitch: scout?.link_twitch ?? "", youtube: scout?.link_youtube ?? "", kick: scout?.link_kick ?? "",
    instagram: scout?.link_instagram ?? "", tiktok: scout?.link_tiktok ?? "",
  });
  const [views, setViews] = useState<Record<string, number>>({
    twitch: scout?.views_twitch ?? 0, youtube: scout?.views_youtube ?? 0, kick: scout?.views_kick ?? 0,
    instagram: scout?.views_instagram ?? 0, tiktok: scout?.views_tiktok ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (scout) {
      setNomeArtistico(scout.nome_artistico ?? "");
      setStatus(scout.status ?? "visualizado");
      setTipoContato(scout.tipo_contato ?? "");
      setNomeAgente(scout.nome_agente ?? "");
      setTelefone(scout.telefone ?? "");
      setCacheNegociado(scout.cache_negociado ?? 0);
      setLiveCassino(scout.live_cassino ?? "");
      setEmail(scout.email ?? "");
      setPlataformas(scout.plataformas ?? []);
      setCategorias(scout.categorias ?? []);
      setLinks({ twitch: scout.link_twitch ?? "", youtube: scout.link_youtube ?? "", kick: scout.link_kick ?? "", instagram: scout.link_instagram ?? "", tiktok: scout.link_tiktok ?? "" });
      setViews({ twitch: scout.views_twitch ?? 0, youtube: scout.views_youtube ?? 0, kick: scout.views_kick ?? 0, instagram: scout.views_instagram ?? 0, tiktok: scout.views_tiktok ?? 0 });
    }
  }, [scout]);

  useEffect(() => {
    if (scout?.id) {
      supabase
        .from("scout_anotacoes")
        .select("id, scout_id, usuario_id, texto, created_at")
        .eq("scout_id", scout.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          const lista = (data ?? []) as ScoutAnotacao[];
          if (lista.some((a) => a.usuario_id)) {
            const ids = [...new Set(lista.map((a) => a.usuario_id).filter(Boolean))] as string[];
            if (ids.length > 0) {
              supabase.from("profiles").select("id, name").in("id", ids).then(({ data: profs }) => {
                const map: Record<string, string> = {};
                (profs ?? []).forEach((p: { id: string; name: string }) => { map[p.id] = p.name ?? p.id; });
                setAnotacoes(lista.map((a) => ({ ...a, usuario_nome: a.usuario_id ? map[a.usuario_id] : "—" })));
              });
            } else setAnotacoes(lista);
          } else setAnotacoes(lista);
        });
    } else setAnotacoes([]);
  }, [scout?.id]);

  const togglePlataforma = (p: string) => {
    setPlataformas((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };
  const toggleCategoria = (c: string) => {
    setCategorias((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  function getScoutData(): ScoutInfluencer & { id?: string } {
    return {
      id: scout?.id,
      nome_artistico: (nomeArtistico ?? "").trim(),
      status,
      tipo_contato: tipoContato || null,
      nome_agente: tipoContato === "agente" ? nomeAgente.trim() || null : null,
      telefone: (tipoContato === "agente" || tipoContato === "direto") ? telefone.trim() || null : null,
      cache_negociado: cacheNegociado || null,
      live_cassino: liveCassino || null,
      email: email.trim() || null,
      plataformas,
      categorias,
      link_twitch: links.twitch?.trim() || null,
      link_youtube: links.youtube?.trim() || null,
      link_kick: links.kick?.trim() || null,
      link_instagram: links.instagram?.trim() || null,
      link_tiktok: links.tiktok?.trim() || null,
      views_twitch: views.twitch || null,
      views_youtube: views.youtube || null,
      views_kick: views.kick || null,
      views_instagram: views.instagram || null,
      views_tiktok: views.tiktok || null,
    };
  }

  async function handleSave() {
    setError("");
    if (!nomeArtistico.trim()) return setError("Nome artístico é obrigatório.");
    if (status === "fechado" && !email?.trim()) return setError("Ao definir status Fechado, o e-mail é obrigatório.");
    const temCanalSemLink = plataformas.some((p) => !(links[p.toLowerCase()] ?? "").trim());
    if (temCanalSemLink) return setError("Preencha o link de cada plataforma selecionada.");

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        nome_artistico: nomeArtistico.trim(),
        status,
        tipo_contato: tipoContato || null,
        nome_agente: tipoContato === "agente" ? nomeAgente.trim() || null : null,
        telefone: (tipoContato === "agente" || tipoContato === "direto") ? telefone.trim() || null : null,
        cache_negociado: cacheNegociado || null,
        live_cassino: liveCassino || null,
        email: email.trim() || null,
        plataformas,
        categorias,
        link_twitch: links.twitch?.trim() || null,
        link_youtube: links.youtube?.trim() || null,
        link_kick: links.kick?.trim() || null,
        link_instagram: links.instagram?.trim() || null,
        link_tiktok: links.tiktok?.trim() || null,
        views_twitch: views.twitch || null,
        views_youtube: views.youtube || null,
        views_kick: views.kick || null,
        views_instagram: views.instagram || null,
        views_tiktok: views.tiktok || null,
        updated_at: new Date().toISOString(),
      };
      if (!scout) payload.created_by = user?.id;

      if (scout) {
        const { error: err } = await supabase.from("scout_influencer").update(payload).eq("id", scout.id);
        if (err) throw new Error(err.message);
        if (status === "fechado" && !scout.user_id) {
          await criarUsuarioFechado({ ...getScoutData(), id: scout.id });
        }
      } else {
        const { data: inserted, error: err } = await supabase.from("scout_influencer").insert(payload).select("id").single();
        if (err) throw new Error(err.message);
        if (status === "fechado" && inserted) {
          await criarUsuarioFechado({ ...getScoutData(), id: inserted.id });
        }
      }

      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function criarUsuarioFechado(s: ScoutInfluencer & { id?: string }) {
    const em = (s.email ?? "").trim();
    if (!em) return;
    const nome = (s.nome_artistico ?? "").trim();
    if (!nome) return;

    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: em,
      email_confirm: true,
      user_metadata: { name: nome },
    });
    if (authErr || !authData?.user) throw new Error(authErr?.message ?? "Erro ao criar usuário");
    const uid = authData.user.id;

    await supabase.from("profiles").insert({ id: uid, name: nome, email: em, role: "influencer" });
    const plat = s.plataformas ?? [];
    const primaryLink = plat[0] ? (s[`link_${plat[0].toLowerCase()}` as keyof ScoutInfluencer] as string) ?? "" : "";
    await supabase.from("influencer_perfil").upsert(
      {
        id: uid,
        nome_artistico: nome,
        nome_completo: nome,
        status: "ativo",
        telefone: (s.telefone ?? "").trim() || undefined,
        cache_hora: s.cache_negociado ?? 0,
        link_twitch: plat.includes("Twitch") ? (s.link_twitch ?? "") : undefined,
        link_youtube: plat.includes("YouTube") ? (s.link_youtube ?? "") : undefined,
        link_kick: plat.includes("Kick") ? (s.link_kick ?? "") : undefined,
        link_instagram: plat.includes("Instagram") ? (s.link_instagram ?? "") : undefined,
        link_tiktok: plat.includes("TikTok") ? (s.link_tiktok ?? "") : undefined,
      },
      { onConflict: "id", ignoreDuplicates: false }
    );

    if (s.id) {
      await supabase.from("scout_influencer").update({ user_id: uid, status: "fechado" }).eq("id", s.id);
    }
  }

  async function handleAddAnotacao() {
    if (!novoTextoAnotacao.trim() || !scout?.id) return;
    const texto = novoTextoAnotacao.trim();
    const { data: inserted, error: err } = await supabase.from("scout_anotacoes").insert({
      scout_id: scout.id,
      usuario_id: user?.id,
      texto,
    }).select("id, scout_id, usuario_id, texto, created_at").single();
    if (!err && inserted) {
      setNovoTextoAnotacao("");
      setAnotacoes((prev) => [{ ...inserted, usuario_nome: user?.name } as ScoutAnotacao, ...prev]);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "10px 14px",
    borderRadius: "10px", border: `1px solid ${t.inputBorder}`,
    background: t.inputBg, color: t.inputText,
    fontSize: "13px", fontFamily: FONT.body, outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "1.1px",
    textTransform: "uppercase", color: t.label, marginBottom: "5px", fontFamily: FONT.body,
  };
  const row: React.CSSProperties = { marginBottom: "14px" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "540px", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: t.text, fontFamily: FONT.title }}>{scout ? "Editar" : "Novo"} Prospecto</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: t.textMuted }}>✕</button>
        </div>

        <div style={row}>
          <label style={labelStyle}>Nome Artístico</label>
          <input value={nomeArtistico} onChange={(e) => setNomeArtistico(e.target.value)} style={inputStyle} placeholder="Ex: NeryXLS" />
        </div>
        <div style={row}>
          <label style={labelStyle}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusScout)} style={{ ...inputStyle, cursor: "pointer" }}>
            {STATUS_SCOUT_OPTS.map((s) => (
              <option key={s} value={s}>{STATUS_SCOUT_LABEL[s]}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: "6px", marginBottom: "20px", flexWrap: "wrap" }}>
          {(["contato", "canais", "anotacoes"] as const).map((tb) => (
            <button key={tb} onClick={() => setTab(tb)}
              style={{ padding: "7px 14px", borderRadius: "20px", border: `1px solid ${tab === tb ? BASE_COLORS.purple : t.cardBorder}`, background: tab === tb ? `${BASE_COLORS.purple}22` : t.inputBg, color: tab === tb ? BASE_COLORS.purple : t.textMuted, fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: FONT.body }}>
              {tb === "contato" ? "Contato" : tb === "canais" ? "Canais" : "Anotações"}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: "#e9402518", border: "1px solid #e9402544", color: "#e94025", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", marginBottom: "14px" }}>⚠️ {error}</div>
        )}

        {tab === "contato" && (
          <>
            <div style={row}>
              <label style={labelStyle}>Tipo de Contato</label>
              <select value={tipoContato} onChange={(e) => setTipoContato(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">—</option>
                {TIPO_CONTATO_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            {tipoContato === "agente" && (
              <div style={row}>
                <label style={labelStyle}>Nome do Agente</label>
                <input value={nomeAgente} onChange={(e) => setNomeAgente(e.target.value)} style={inputStyle} placeholder="Nome do agente" />
              </div>
            )}
            {(tipoContato === "agente" || tipoContato === "direto") && (
              <div style={row}>
                <label style={labelStyle}>Telefone</label>
                <input value={telefone} onChange={(e) => setTelefone(e.target.value)} style={inputStyle} placeholder="(11) 99999-9999" />
              </div>
            )}
            <div style={row}>
              <label style={labelStyle}>Cachê Negociado (R$)</label>
              <input type="number" value={cacheNegociado || ""} onChange={(e) => setCacheNegociado(Number(e.target.value) || 0)} style={inputStyle} placeholder="0" min={0} />
            </div>
            <div style={row}>
              <label style={labelStyle}>Live Cassino</label>
              <select value={liveCassino} onChange={(e) => setLiveCassino(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                {LIVE_CASSINO_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div style={row}>
              <label style={labelStyle}>E-mail {status === "fechado" && <span style={{ color: "#e94025" }}>*</span>}</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} type="email" placeholder="email@exemplo.com" />
            </div>
          </>
        )}

        {tab === "canais" && (
          <>
            <div style={row}>
              <label style={labelStyle}>Plataformas</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {PLATAFORMAS.map((p) => {
                  const ativo = plataformas.includes(p);
                  return (
                    <button key={p} onClick={() => togglePlataforma(p)}
                      style={{ padding: "8px 14px", borderRadius: "20px", cursor: "pointer", border: `2px solid ${ativo ? PLAT_COLOR[p] : t.cardBorder}`, background: ativo ? `${PLAT_COLOR[p]}22` : t.inputBg, color: ativo ? PLAT_COLOR[p] : t.textMuted, fontSize: "12px", fontWeight: 700, fontFamily: FONT.body }}>
                      {PLAT_ICON[p]} {p}
                    </button>
                  );
                })}
              </div>
            </div>
            {plataformas.map((p) => {
              const key = p.toLowerCase();
              return (
                <div key={p} style={row}>
                  <label style={labelStyle}>{p} — Link e Views</label>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <input value={links[key] ?? ""} onChange={(e) => setLinks((l) => ({ ...l, [key]: e.target.value }))} style={{ ...inputStyle, flex: 2 }} placeholder={`Link ${p}`} />
                    <input type="number" value={views[key] || ""} onChange={(e) => setViews((v) => ({ ...v, [key]: Number(e.target.value) || 0 }))} style={{ ...inputStyle, flex: 1, minWidth: 80 }} placeholder="Views" min={0} />
                  </div>
                </div>
              );
            })}
            <div style={row}>
              <label style={labelStyle}>Categorias (multi-seleção)</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {CATEGORIAS.map((c) => {
                  const sel = categorias.includes(c);
                  return (
                    <button key={c} onClick={() => toggleCategoria(c)}
                      style={{ padding: "6px 12px", borderRadius: "16px", cursor: "pointer", border: `1px solid ${sel ? BASE_COLORS.purple : t.cardBorder}`, background: sel ? `${BASE_COLORS.purple}22` : t.inputBg, color: sel ? BASE_COLORS.purple : t.textMuted, fontSize: "12px", fontWeight: 600, fontFamily: FONT.body }}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {tab === "anotacoes" && scout && (
          <>
            <div style={row}>
              <label style={labelStyle}>Nova Anotação</label>
              <textarea value={novoTextoAnotacao} onChange={(e) => setNovoTextoAnotacao(e.target.value)} style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} placeholder="Digite sua anotação..." />
              <button onClick={handleAddAnotacao} disabled={!novoTextoAnotacao.trim()} style={{ marginTop: "8px", padding: "8px 16px", borderRadius: "10px", border: "none", cursor: novoTextoAnotacao.trim() ? "pointer" : "not-allowed", background: BASE_COLORS.blue, color: "#fff", fontSize: "12px", fontWeight: 600, fontFamily: FONT.body }}>
                Adicionar Anotação
              </button>
            </div>
            <div style={row}>
              <label style={labelStyle}>Histórico de Anotações</label>
              <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                {anotacoes.length === 0 ? (
                  <span style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body }}>Nenhuma anotação ainda.</span>
                ) : (
                  anotacoes.map((a) => (
                    <div key={a.id} style={{ padding: "10px 14px", borderRadius: "10px", border: `1px solid ${t.cardBorder}`, background: t.inputBg, fontSize: "12px", fontFamily: FONT.body }}>
                      <div style={{ color: t.text }}>{a.texto}</div>
                      <div style={{ fontSize: "11px", color: t.textMuted, marginTop: "4px" }}>{a.usuario_nome ?? "—"} • {new Date(a.created_at).toLocaleString("pt-BR")}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        <button onClick={handleSave} disabled={saving}
          style={{ width: "100%", marginTop: "16px", padding: "13px", borderRadius: "10px", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: FONT.body }}>
          {saving ? "⏳ Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}
