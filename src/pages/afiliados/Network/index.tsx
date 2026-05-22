import { useState, useEffect, useCallback, useRef, type CSSProperties } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useModalEscape } from "../../../hooks/useModalEscape";
import { usePermission, type Permissoes } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE, BRAND } from "../../../lib/dashboardConstants";
import { supabase, supabaseAnonKey } from "../../../lib/supabase";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { DashboardPageHeader } from "../../../components/dashboard";
import { Network, X, Eye, Pencil, Trash2, Loader2, Plus } from "lucide-react";

export type OperadoraOpt = { slug: string; nome: string };

export type StatusAfiliado = "visualizado" | "contato" | "negociacao" | "fechado";
const STATUS_OPTS: StatusAfiliado[] = ["visualizado", "contato", "negociacao", "fechado"];
const STATUS_LABEL: Record<StatusAfiliado, string> = {
  visualizado: "Visualizado",
  contato: "Contato",
  negociacao: "Negociação",
  fechado: "Fechado",
};
const STATUS_COLOR: Record<StatusAfiliado, string> = {
  visualizado: "#6b7280",
  contato: BRAND.azul,
  negociacao: BRAND.amarelo,
  fechado: BRAND.verde,
};

const TIPO_CONTATO_OPTS = [
  { value: "direto" as const, label: "Direto" },
  { value: "agencia" as const, label: "Agência" },
  { value: "site_spin" as const, label: "Site Spin" },
];

const LIVE_CASSINO_OPTS = [
  { value: "" as const, label: "—" },
  { value: "sim" as const, label: "Sim" },
  { value: "nao" as const, label: "Não" },
];

export interface AfiliadoNetworkRow {
  id: string;
  nome: string;
  status: StatusAfiliado;
  email?: string | null;
  tipo_contato?: string | null;
  telefone?: string | null;
  live_cassino?: string | null;
  operadora_slug?: string | null;
  operacao?: string | null;
  /** Definido após criar utilizador Afiliado + cadastro em influencer_perfil (Edge criar-afiliado-network). */
  afiliado_user_id?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

async function criarAfiliadoDesdeNetwork(networkId: string): Promise<void> {
  const res = await fetch("/api/criar-afiliado-network", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
      Apikey: supabaseAnonKey,
    },
    body: JSON.stringify({
      network_id: networkId,
      ...(typeof window !== "undefined" ? { loginUrl: window.location.origin } : {}),
    }),
  });
  const fnData = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(fnData.error ?? `Erro ${res.status}`);
}

interface AfiliadoAnotacao {
  id: string;
  afiliado_id: string;
  usuario_id?: string | null;
  texto: string;
  created_at: string;
  usuario_nome?: string;
}

function getLiveCassinoLabel(v: string | null | undefined): string {
  if (!v) return "—";
  return v === "sim" ? "Sim" : "Não";
}

function StatusAfiliadoBadge({ value }: { value: StatusAfiliado }) {
  const color = STATUS_COLOR[value] ?? "#888";
  return (
    <span
      style={{
        padding: "4px 12px",
        borderRadius: 20,
        border: `1.5px solid ${color}`,
        background: `${color}18`,
        color,
        fontSize: 12,
        fontWeight: 700,
        fontFamily: FONT.body,
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {STATUS_LABEL[value]}
    </span>
  );
}

export default function AfiliadosNetwork() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const ctaGradient = brand.useBrand
    ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
    : "linear-gradient(135deg, #4a2082, #1e36f8)";
  const funnelCardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";
  const perm = usePermission("afiliados_network");
  const [list, setList] = useState<AfiliadoNetworkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: "visualizar" | "editar"; row?: AfiliadoNetworkRow } | null>(null);
  const [modalNovo, setModalNovo] = useState(false);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [operadorasOpt, setOperadorasOpt] = useState<OperadoraOpt[]>([]);

  useEffect(() => {
    supabase.from("operadoras").select("slug, nome").order("nome").then(({ data }) => {
      setOperadorasOpt((data ?? []) as OperadoraOpt[]);
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("afiliados_network").select("*").order("nome");
    if (error) {
      console.error("[Afiliados Network] Erro ao carregar:", error);
      setList([]);
    } else {
      setList((data ?? []) as AfiliadoNetworkRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = list.filter((row) => {
    const q = search.trim().toLowerCase();
    if (q && !row.nome.toLowerCase().includes(q) && !(row.email ?? "").toLowerCase().includes(q)) return false;
    if (filterStatus === "todos") {
      if (row.status === "fechado") return false;
    } else if (row.status !== filterStatus) {
      return false;
    }
    return true;
  });

  const porStatus: Record<string, number> = { visualizado: 0, contato: 0, negociacao: 0, fechado: 0 };
  list.forEach((row) => {
    porStatus[row.status] = (porStatus[row.status] ?? 0) + 1;
  });

  const podeEditar = (r: AfiliadoNetworkRow) => perm.canEditarOk && (perm.canEditar !== "proprios" || r.created_by === user?.id);

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  const hasFilters = filterStatus !== "todos" || !!search.trim();

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>
      <DashboardPageHeader
        icon={<Network size={14} aria-hidden="true" />}
        title="Network"
        subtitle="Funil de prospecção e conversão de prospectos em afiliados cadastrados."
        brand={brand}
        t={t}
      />

      {!loading && (
        <div style={{ marginBottom: 24, width: "100%" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: t.textMuted, fontFamily: FONT.body, marginBottom: 10, paddingLeft: 2 }}>
            Funil de Prospecção
          </div>
          <div className="app-grid-kpi-4" style={{ width: "100%" }}>
            {STATUS_OPTS.map((s) => {
              const cor = STATUS_COLOR[s];
              return (
                <div
                  key={s}
                  style={{
                    background: brand.blockBg,
                    border: `1px solid ${t.cardBorder}`,
                    borderLeft: `3px solid ${cor}`,
                    borderRadius: 18,
                    padding: "16px 20px",
                    boxShadow: funnelCardShadow,
                    minWidth: 0,
                  }}
                >
                  <div style={{ fontSize: 28, fontWeight: 900, color: brand.accent, fontFamily: FONT_TITLE, lineHeight: 1 }}>{porStatus[s] ?? 0}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: brand.secondary, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.8px", marginTop: 6 }}>{STATUS_LABEL[s]}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            borderRadius: 14,
            border: brand.primaryTransparentBorder,
            background: brand.primaryTransparentBg,
            padding: "12px 20px",
          }}
        >
          {/* Linha 1: Status */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.1em", marginRight: 4 }}>Status</span>
            {STATUS_OPTS.map((s) => {
              const active = filterStatus === s;
              const color = STATUS_COLOR[s];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilterStatus(active ? "todos" : s)}
                  aria-pressed={active}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 12px",
                    borderRadius: 999,
                    cursor: "pointer",
                    border: `1px solid ${active ? color : color + "55"}`,
                    background: active ? `${color}22` : "transparent",
                    color: active ? color : t.textMuted,
                    fontSize: 12,
                    fontWeight: active ? 700 : 400,
                    fontFamily: FONT.body,
                    transition: "all 0.15s",
                    lineHeight: 1,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0, alignSelf: "center" }} />
                  <span style={{ display: "inline-flex", alignItems: "center" }}>{STATUS_LABEL[s]}</span>
                  {active && <span style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}><X size={9} aria-hidden="true" /></span>}
                </button>
              );
            })}
          </div>

          {/* Linha 2: Busca + Adicionar */}
          <div
            style={{
              paddingTop: 12,
              marginTop: 12,
              borderTop: `1px solid ${t.cardBorder}`,
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              aria-label="Buscar afiliado por nome ou e-mail"
              style={{
                flex: "1 1 200px",
                minWidth: 0,
                boxSizing: "border-box",
                padding: "10px 16px",
                borderRadius: 12,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg ?? t.cardBg,
                color: t.text,
                fontSize: 13,
                fontFamily: FONT.body,
                outline: "none",
              }}
            />
            {perm.canCriarOk && (
              <button
                type="button"
                onClick={() => setModalNovo(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexShrink: 0,
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  background: ctaGradient,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: FONT.body,
                }}
              >
                <Plus size={14} aria-hidden="true" />
                Adicionar
              </button>
            )}
          </div>

          {hasFilters && (
            <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => {
                  setFilterStatus("todos");
                  setSearch("");
                }}
                style={{
                  padding: "5px 14px",
                  borderRadius: 999,
                  border: `1px solid ${BRAND.vermelho}44`,
                  background: `${BRAND.vermelho}11`,
                  color: BRAND.vermelho,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: FONT.body,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <X size={12} aria-hidden="true" /> Limpar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {!loading && (
        <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginBottom: 14 }}>
          <span style={{ color: brand.accent, fontWeight: 700 }}>{filtered.length}</span> {filtered.length === 1 ? "afiliado" : "afiliados"}
        </div>
      )}

      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px",
            color: t.textMuted,
            fontFamily: FONT.body,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Loader2 size={16} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-label="Carregando..." />
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            background: brand.blockBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 18,
            padding: 48,
            textAlign: "center",
            color: t.textMuted,
            fontFamily: FONT.body,
          }}
        >
          Nenhum afiliado encontrado.
        </div>
      ) : (
        filtered.map((r) => (
          <div
            key={r.id}
            style={{
              background: brand.blockBg,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 18,
              padding: "18px 20px",
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              boxShadow: t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: ctaGradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 16,
                  fontFamily: FONT.body,
                }}
              >
                {(r.nome || "?")[0]?.toUpperCase()}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: t.text, fontFamily: FONT.body }}>{r.nome}</span>
                  <StatusAfiliadoBadge value={r.status} />
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: t.textMuted,
                    fontFamily: FONT.body,
                    whiteSpace: "pre-wrap",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical" as const,
                    overflow: "hidden",
                    wordBreak: "break-word",
                  }}
                  title={(r.operacao ?? "").trim() || undefined}
                >
                  {(r.operacao ?? "").trim() ? r.operacao : "—"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setModal({ mode: "visualizar", row: r })}
                aria-label={`Ver afiliado ${r.nome}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: "transparent",
                  color: t.text,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: FONT.body,
                  cursor: "pointer",
                }}
              >
                <Eye size={13} aria-hidden="true" /> Ver
              </button>
              {podeEditar(r) && (
                <button
                  type="button"
                  onClick={() => setModal({ mode: "editar", row: r })}
                  aria-label={`Editar afiliado ${r.nome}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: "none",
                    cursor: "pointer",
                    background: ctaGradient,
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: FONT.body,
                  }}
                >
                  <Pencil size={13} aria-hidden="true" /> Editar
                </button>
              )}
            </div>
          </div>
        ))
      )}

      {modal?.mode === "visualizar" && modal.row && (
        <ModalVisualizar row={modal.row} operadorasList={operadorasOpt} onClose={() => setModal(null)} />
      )}
      {modal?.mode === "editar" && modal.row && (
        <ModalEditar
          row={modal.row}
          operadorasList={operadorasOpt}
          perm={perm}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            void loadData();
          }}
        />
      )}
      {modalNovo && (
        <ModalEditar
          row={null}
          operadorasList={operadorasOpt}
          perm={perm}
          onClose={() => setModalNovo(false)}
          onSaved={() => {
            setModalNovo(false);
            void loadData();
          }}
        />
      )}
    </div>
  );
}

function ModalVisualizar({ row, operadorasList, onClose }: { row: AfiliadoNetworkRow; operadorasList: OperadoraOpt[]; onClose: () => void }) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const containerRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"contato" | "operacao" | "anotacoes">("contato");
  const [anotacoes, setAnotacoes] = useState<AfiliadoAnotacao[]>([]);
  useModalEscape(onClose, true);

  const labelStyle: CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "1.1px", textTransform: "uppercase", color: t.textMuted, marginBottom: 5, fontFamily: FONT.body };
  const rowS: CSSProperties = { marginBottom: 14 };
  const val = (v?: string | null) => <span style={{ fontSize: 13, color: v ? t.text : t.textMuted, fontFamily: FONT.body }}>{v ?? "—"}</span>;
  const tabActiveBg = brand.useBrand
    ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)"
    : "rgba(124,58,237,0.15)";

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  useEffect(() => {
    supabase
      .from("afiliados_network_anotacoes")
      .select("id, afiliado_id, usuario_id, texto, created_at")
      .eq("afiliado_id", row.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const lista = (data ?? []) as AfiliadoAnotacao[];
        const ids = [...new Set(lista.map((a) => a.usuario_id).filter(Boolean))] as string[];
        if (ids.length === 0) {
          setAnotacoes(lista);
          return;
        }
        supabase
          .from("profiles")
          .select("id, name")
          .in("id", ids)
          .then(({ data: profs }) => {
            const map: Record<string, string> = {};
            (profs ?? []).forEach((p: { id: string; name: string }) => {
              map[p.id] = p.name ?? p.id;
            });
            setAnotacoes(lista.map((a) => ({ ...a, usuario_nome: a.usuario_id ? map[a.usuario_id] : "—" })));
          });
      });
  }, [row.id]);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-af-net-viz-title"
        style={{
          background: brand.blockBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: "20px",
          padding: "28px",
          width: "100%",
          maxWidth: "520px",
          maxHeight: "min(92vh, 90dvh)",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h2 id="modal-af-net-viz-title" style={{ margin: 0, fontSize: 17, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, letterSpacing: "0.03em" }}>
              {row.nome}
            </h2>
            <StatusAfiliadoBadge value={row.status} />
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, display: "flex", alignItems: "center", padding: 4 }}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 10,
            background: brand.useBrand ? "color-mix(in srgb, var(--brand-accent) 8%, transparent)" : `${BRAND.azul}0d`,
            border: brand.useBrand ? `1px solid color-mix(in srgb, var(--brand-accent) 30%, transparent)` : `1px solid ${BRAND.azul}30`,
            fontSize: 12,
            color: t.textMuted,
            fontFamily: FONT.body,
            marginBottom: 18,
          }}
        >
          <Eye size={13} aria-hidden="true" style={{ color: brand.primary, flexShrink: 0 }} />
          <span>Modo visualização — somente leitura.</span>
        </div>
        <div role="tablist" aria-label="Secções do afiliado" style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "nowrap", overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 2 }}>
          {(["contato", "operacao", "anotacoes"] as const).map((tb) => (
            <button
              key={tb}
              type="button"
              role="tab"
              id={`tab-af-viz-${tb}`}
              aria-selected={tab === tb}
              aria-controls={`panel-af-viz-${tb}`}
              tabIndex={tab === tb ? 0 : -1}
              onClick={() => setTab(tb)}
              onKeyDown={(e) => {
                const keys = ["contato", "operacao", "anotacoes"] as const;
                const idx = keys.indexOf(tb);
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  e.preventDefault();
                  if (e.key === "ArrowRight") setTab(keys[(idx + 1) % keys.length]);
                  else setTab(keys[(idx - 1 + keys.length) % keys.length]);
                }
              }}
              style={{
                padding: "7px 14px",
                borderRadius: 20,
                flexShrink: 0,
                border: `1px solid ${tab === tb ? brand.primary : t.cardBorder}`,
                background: tab === tb ? tabActiveBg : (t.inputBg ?? t.cardBg),
                color: tab === tb ? brand.primary : t.textMuted,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: FONT.body,
              }}
            >
              {tb === "contato" ? "Contato" : tb === "operacao" ? "Operação" : "Anotações"}
            </button>
          ))}
        </div>
        {tab === "contato" && (
          <div role="tabpanel" id="panel-af-viz-contato" aria-labelledby="tab-af-viz-contato">
            <div style={rowS}>
              <label style={labelStyle}>E-mail</label>
              {val(row.email)}
            </div>
            <div style={rowS}>
              <label style={labelStyle}>Tipo de Contato</label>
              {val(row.tipo_contato ? TIPO_CONTATO_OPTS.find((o) => o.value === row.tipo_contato)?.label ?? row.tipo_contato : null)}
            </div>
            <div style={rowS}>
              <label style={labelStyle}>Telefone</label>
              {val(row.telefone)}
            </div>
            <div style={rowS}>
              <label style={labelStyle}>Live Cassino</label>
              {val(getLiveCassinoLabel(row.live_cassino))}
            </div>
            <div style={rowS}>
              <label style={labelStyle}>Operadora</label>
              {val(row.operadora_slug ? operadorasList.find((o) => o.slug === row.operadora_slug)?.nome ?? row.operadora_slug : null)}
            </div>
          </div>
        )}
        {tab === "operacao" && (
          <div role="tabpanel" id="panel-af-viz-operacao" aria-labelledby="tab-af-viz-operacao">
            <label style={labelStyle}>Operação</label>
            <div style={{ fontSize: 13, color: (row.operacao ?? "").trim() ? t.text : t.textMuted, fontFamily: FONT.body, whiteSpace: "pre-wrap" }}>{(row.operacao ?? "").trim() || "—"}</div>
          </div>
        )}
        {tab === "anotacoes" && (
          <div role="tabpanel" id="panel-af-viz-anotacoes" aria-labelledby="tab-af-viz-anotacoes">
            <label style={labelStyle}>Histórico de Anotações</label>
            <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {anotacoes.length === 0 ? (
                <span style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>Nenhuma anotação ainda.</span>
              ) : (
                anotacoes.map((a) => (
                  <div key={a.id} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.inputBg ?? t.cardBg, fontSize: 12, fontFamily: FONT.body }}>
                    <div style={{ fontSize: "11px", color: t.textMuted, marginBottom: 6 }}>
                      {a.usuario_nome ?? "—"} · {new Date(a.created_at).toLocaleString("pt-BR")}
                    </div>
                    <div style={{ color: t.text }}>{a.texto}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ModalEditar({
  row,
  operadorasList,
  perm,
  onClose,
  onSaved,
}: {
  row: AfiliadoNetworkRow | null;
  operadorasList: OperadoraOpt[];
  perm: Permissoes;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const containerRef = useRef<HTMLDivElement>(null);
  const tabActiveBg = brand.useBrand
    ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)"
    : "rgba(124,58,237,0.15)";
  const ctaGradient = brand.useBrand
    ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
    : "linear-gradient(135deg, #4a2082, #1e36f8)";
  const [tab, setTab] = useState<"contato" | "operacao" | "anotacoes">("contato");
  const [nome, setNome] = useState(row?.nome ?? "");
  const [status, setStatus] = useState<StatusAfiliado>(row?.status ?? "visualizado");
  const [email, setEmail] = useState(row?.email ?? "");
  const [tipoContato, setTipoContato] = useState<string>(row?.tipo_contato ?? "");
  const [telefone, setTelefone] = useState(row?.telefone ?? "");
  const [liveCassino, setLiveCassino] = useState<string>(row?.live_cassino ?? "");
  const [operadoraSlug, setOperadoraSlug] = useState<string>(row?.operadora_slug ?? "");
  const [operacao, setOperacao] = useState(row?.operacao ?? "");
  const [novoTextoAnotacao, setNovoTextoAnotacao] = useState("");
  const [anotacoes, setAnotacoes] = useState<AfiliadoAnotacao[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmExcluir, setConfirmExcluir] = useState(false);
  useModalEscape(onClose, true);

  useEffect(() => {
    if (row) {
      setNome(row.nome ?? "");
      setStatus(row.status ?? "visualizado");
      setEmail(row.email ?? "");
      setTipoContato(row.tipo_contato ?? "");
      setTelefone(row.telefone ?? "");
      setLiveCassino(row.live_cassino ?? "");
      setOperadoraSlug(row.operadora_slug ?? "");
      setOperacao(row.operacao ?? "");
    } else {
      setNome("");
      setStatus("visualizado");
      setEmail("");
      setTipoContato("");
      setTelefone("");
      setLiveCassino("");
      setOperadoraSlug("");
      setOperacao("");
    }
  }, [row]);

  useEffect(() => {
    if (!row?.id) {
      setAnotacoes([]);
      return;
    }
    supabase
      .from("afiliados_network_anotacoes")
      .select("id, afiliado_id, usuario_id, texto, created_at")
      .eq("afiliado_id", row.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const lista = (data ?? []) as AfiliadoAnotacao[];
        const ids = [...new Set(lista.map((a) => a.usuario_id).filter(Boolean))] as string[];
        if (ids.length === 0) {
          setAnotacoes(lista);
          return;
        }
        supabase
          .from("profiles")
          .select("id, name")
          .in("id", ids)
          .then(({ data: profs }) => {
            const map: Record<string, string> = {};
            (profs ?? []).forEach((p: { id: string; name: string }) => {
              map[p.id] = p.name ?? p.id;
            });
            setAnotacoes(lista.map((a) => ({ ...a, usuario_nome: a.usuario_id ? map[a.usuario_id] : "—" })));
          });
      });
  }, [row?.id]);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  async function handleSave() {
    setError("");
    if (!nome.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    const aindaSemAfiliado = !row?.afiliado_user_id;
    if (aindaSemAfiliado) {
      if (!email.trim()) {
        setError("E-mail é obrigatório para criar o cadastro de afiliado na plataforma.");
        return;
      }
      if (!operadoraSlug.trim()) {
        setError("Operadora é obrigatória para criar o vínculo do afiliado.");
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        nome: nome.trim(),
        status,
        email: email.trim() || null,
        tipo_contato: tipoContato || null,
        telefone: telefone.trim() || null,
        live_cassino: liveCassino || null,
        operadora_slug: operadoraSlug.trim() || null,
        operacao: operacao.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (row) {
        const { error: err } = await supabase.from("afiliados_network").update(payload).eq("id", row.id);
        if (err) throw new Error(err.message);
        if (!row.afiliado_user_id) {
          await criarAfiliadoDesdeNetwork(row.id);
        }
      } else {
        const ins = { ...payload, created_by: user?.id ?? null };
        const { data: inserted, error: err } = await supabase.from("afiliados_network").insert(ins).select("id").single();
        if (err) throw new Error(err.message);
        await criarAfiliadoDesdeNetwork(inserted.id);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleExcluir() {
    if (!row?.id || !perm.canExcluirOk) return;
    if (perm.canExcluir === "proprios" && row.created_by !== user?.id) return;
    if (!confirmExcluir) {
      setConfirmExcluir(true);
      return;
    }
    const { error: e1 } = await supabase.from("afiliados_network_anotacoes").delete().eq("afiliado_id", row.id);
    if (e1) {
      setError(e1.message);
      setConfirmExcluir(false);
      return;
    }
    const { error: e2 } = await supabase.from("afiliados_network").delete().eq("id", row.id);
    if (e2) {
      setError(e2.message);
      setConfirmExcluir(false);
      return;
    }
    onSaved();
  }

  async function handleAddAnotacao() {
    if (!novoTextoAnotacao.trim() || !row?.id) return;
    const texto = novoTextoAnotacao.trim();
    const { data: inserted, error: err } = await supabase
      .from("afiliados_network_anotacoes")
      .insert({ afiliado_id: row.id, usuario_id: user?.id, texto })
      .select("id, afiliado_id, usuario_id, texto, created_at")
      .single();
    if (!err && inserted) {
      setNovoTextoAnotacao("");
      setAnotacoes((prev) => [{ ...inserted, usuario_nome: user?.name } as AfiliadoAnotacao, ...prev]);
    }
  }

  const inputStyle: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg ?? t.cardBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
    outline: "none",
  };
  const labelStyle: CSSProperties = {
    display: "block",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "1.1px",
    textTransform: "uppercase",
    color: t.textMuted,
    marginBottom: 5,
    fontFamily: FONT.body,
  };
  const rowS: CSSProperties = { marginBottom: 14 };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-af-net-edit-title"
        style={{
          background: brand.blockBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 20,
          padding: 28,
          width: "100%",
          maxWidth: 540,
          maxHeight: "min(92vh, 90dvh)",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <h2 id="modal-af-net-edit-title" style={{ margin: 0, fontSize: 17, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, letterSpacing: "0.03em" }}>
            {row ? "Editar afiliado" : "Novo afiliado"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Fechar" style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, display: "flex", alignItems: "center", padding: 4 }}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {row?.afiliado_user_id ? (
          <p style={{ fontSize: 12, color: t.textMuted, margin: "0 0 16px", fontFamily: FONT.body }}>
            Cadastro de afiliado já criado na plataforma; e-mail e operadora não podem ser alterados aqui.
          </p>
        ) : (
          <p style={{ fontSize: 12, color: t.textMuted, margin: "0 0 16px", fontFamily: FONT.body, lineHeight: 1.45 }}>
            Ao salvar, e-mail e operadora são obrigatórios. O sistema cria o usuário afiliado na plataforma neste momento — independentemente do status do funil (não é preciso marcar Fechado antes).
          </p>
        )}

        <div style={rowS}>
          <label style={labelStyle}>
            Nome
            <CampoObrigatorioMark />
          </label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} style={inputStyle} placeholder="Nome do afiliado" />
        </div>
        <div style={rowS}>
          <label style={labelStyle}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusAfiliado)} style={{ ...inputStyle, cursor: "pointer" }} aria-label="Status do funil">
            {[...STATUS_OPTS].sort((a, b) => STATUS_LABEL[a].localeCompare(STATUS_LABEL[b], "pt-BR")).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        <div role="tablist" aria-label="Secções do cadastro" style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "nowrap", overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 2 }}>
          {(["contato", "operacao", "anotacoes"] as const).map((tb) => (
            <button
              key={tb}
              type="button"
              role="tab"
              id={`tab-af-ed-${tb}`}
              aria-selected={tab === tb}
              aria-controls={`panel-af-ed-${tb}`}
              tabIndex={tab === tb ? 0 : -1}
              onClick={() => setTab(tb)}
              onKeyDown={(e) => {
                const keys = ["contato", "operacao", "anotacoes"] as const;
                const idx = keys.indexOf(tb);
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  e.preventDefault();
                  if (e.key === "ArrowRight") setTab(keys[(idx + 1) % keys.length]);
                  else setTab(keys[(idx - 1 + keys.length) % keys.length]);
                }
              }}
              style={{
                padding: "7px 14px",
                borderRadius: 20,
                flexShrink: 0,
                border: `1px solid ${tab === tb ? brand.primary : t.cardBorder}`,
                background: tab === tb ? tabActiveBg : (t.inputBg ?? t.cardBg),
                color: tab === tb ? brand.primary : t.textMuted,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: FONT.body,
              }}
            >
              {tb === "contato" ? "Contato" : tb === "operacao" ? "Operação" : "Anotações"}
            </button>
          ))}
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            style={{
              background: `${BRAND.vermelho}18`,
              border: `1px solid ${BRAND.vermelho}44`,
              color: BRAND.vermelho,
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 13,
              marginBottom: 14,
              fontFamily: FONT.body,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} aria-label="Fechar erro" style={{ background: "none", border: "none", cursor: "pointer", color: BRAND.vermelho, display: "flex", flexShrink: 0 }}>
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}

        {tab === "contato" && (
          <div role="tabpanel" id="panel-af-ed-contato" aria-labelledby="tab-af-ed-contato">
        <div style={rowS}>
          <label style={labelStyle}>
            E-mail
            {(!row || !row.afiliado_user_id) && <CampoObrigatorioMark />}
          </label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} type="email" placeholder="email@exemplo.com" disabled={!!row?.afiliado_user_id} aria-required={!row?.afiliado_user_id} />
        </div>
            <div style={rowS}>
              <label style={labelStyle}>Tipo de Contato</label>
              <select value={tipoContato} onChange={(e) => setTipoContato(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }} aria-label="Tipo de contato">
                <option value="">—</option>
                {[...TIPO_CONTATO_OPTS].sort((a, b) => a.label.localeCompare(b.label, "pt-BR")).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={rowS}>
              <label style={labelStyle}>Telefone</label>
              <input value={telefone} onChange={(e) => setTelefone(e.target.value)} style={inputStyle} placeholder="(11) 99999-9999" />
            </div>
            <div style={rowS}>
              <label style={labelStyle}>Live Cassino</label>
              <select value={liveCassino} onChange={(e) => setLiveCassino(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }} aria-label="Live Cassino">
                {LIVE_CASSINO_OPTS.map((o) => (
                  <option key={o.value || "unset"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={rowS}>
              <label style={labelStyle}>
                Operadora
                {(!row || !row.afiliado_user_id) && <CampoObrigatorioMark />}
              </label>
              {operadorasList.length === 0 ? (
                <p style={{ fontSize: 12, color: t.textMuted, margin: 0, fontFamily: FONT.body }}>Cadastre operadoras em Gestão de Operadoras.</p>
              ) : (
                <select value={operadoraSlug} onChange={(e) => setOperadoraSlug(e.target.value)} style={{ ...inputStyle, cursor: "pointer", opacity: row?.afiliado_user_id ? 0.75 : 1 }} aria-label="Operadora" disabled={!!row?.afiliado_user_id}>
                  <option value="">—</option>
                  {[...operadorasList].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((o) => (
                    <option key={o.slug} value={o.slug}>
                      {o.nome}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {tab === "operacao" && (
          <div role="tabpanel" id="panel-af-ed-operacao" aria-labelledby="tab-af-ed-operacao">
            <label style={labelStyle}>Operação</label>
            <textarea value={operacao} onChange={(e) => setOperacao(e.target.value)} style={{ ...inputStyle, minHeight: 160, resize: "vertical" }} placeholder="Detalhes da operação..." />
          </div>
        )}

        {tab === "anotacoes" && row && (
          <div role="tabpanel" id="panel-af-ed-anotacoes" aria-labelledby="tab-af-ed-anotacoes">
            <div style={rowS}>
              <label style={labelStyle}>Nova Anotação</label>
              <textarea value={novoTextoAnotacao} onChange={(e) => setNovoTextoAnotacao(e.target.value)} style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} placeholder="Digite sua anotação..." />
              <button
                type="button"
                onClick={() => void handleAddAnotacao()}
                disabled={!novoTextoAnotacao.trim()}
                style={{
                  marginTop: 8,
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "none",
                  cursor: novoTextoAnotacao.trim() ? "pointer" : "not-allowed",
                  background: brand.useBrand ? "var(--brand-secondary)" : "#1e36f8",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: FONT.body,
                }}
              >
                Adicionar Anotação
              </button>
            </div>
            <div style={rowS}>
              <label style={labelStyle}>Histórico de Anotações</label>
              <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                {anotacoes.length === 0 ? (
                  <span style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>Nenhuma anotação ainda.</span>
                ) : (
                  anotacoes.map((a) => (
                    <div key={a.id} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.inputBg ?? t.cardBg, fontSize: 12, fontFamily: FONT.body }}>
                      <div style={{ fontSize: "11px", color: t.textMuted, marginBottom: 6 }}>
                        {a.usuario_nome ?? "—"} · {new Date(a.created_at).toLocaleString("pt-BR")}
                      </div>
                      <div style={{ color: t.text }}>{a.texto}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "anotacoes" && !row && (
          <div role="tabpanel" style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body, marginBottom: 16 }}>
            Salve o cadastro para adicionar e ver anotações.
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          {row && perm.canExcluirOk && (perm.canExcluir !== "proprios" || row.created_by === user?.id) && (
            <button
              type="button"
              onClick={() => void handleExcluir()}
              disabled={saving}
              onBlur={() => setConfirmExcluir(false)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 18px",
                borderRadius: 10,
                border: `1px solid ${confirmExcluir ? BRAND.vermelho : `${BRAND.vermelho}80`}`,
                background: confirmExcluir ? BRAND.vermelho : `${BRAND.vermelho}18`,
                color: confirmExcluir ? "#fff" : BRAND.vermelho,
                fontSize: 13,
                fontWeight: 700,
                fontFamily: FONT.body,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
                transition: "all 0.15s",
              }}
            >
              <Trash2 size={14} aria-hidden="true" />
              {confirmExcluir ? "Confirmar exclusão?" : "Excluir"}
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0 }} />
          <button type="button" onClick={onClose} style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.text, fontSize: 13, fontWeight: 600, fontFamily: FONT.body, cursor: "pointer" }}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
              background: ctaGradient,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: FONT.body,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {saving ? (
              <>
                <Loader2 size={14} className="app-lucide-spin" aria-hidden="true" color="#fff" />
                Salvando...
              </>
            ) : (
              "Salvar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
