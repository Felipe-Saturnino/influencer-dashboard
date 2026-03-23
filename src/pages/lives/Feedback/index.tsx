import { useState, useEffect, useRef, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { Live, LiveResultado, LiveStatus } from "../../../types";
import { X, Pencil, Trash2, Calendar, User } from "lucide-react";
import {
  GiStarMedal, GiShield, GiPencil,
  GiChatBubble,
} from "react-icons/gi";

// ─── BRAND ────────────────────────────────────────────────────────────────────
const BRAND = {
  roxo:     "#4a2082",
  roxoVivo: "#7c3aed",
  azul:     "#1e36f8",
  vermelho: "#e84025",
  ciano:    "#70cae4",
  verde:    "#22c55e",
  amarelo:  "#f59e0b",
} as const;

const FONT_TITLE = "'NHD Bold', 'nhd-bold', sans-serif";

// ─── LOGOS SVG DAS PLATAFORMAS ────────────────────────────────────────────────
import { PLAT_COLOR, PLAT_LOGO, PLAT_LOGO_DARK } from "../../../constants/platforms";

function PlatLogo({ plataforma, size = 20, isDark }: { plataforma: string; size?: number; isDark: boolean }) {
  const [err, setErr] = useState(false);
  const src = isDark ? (PLAT_LOGO_DARK[plataforma] ?? PLAT_LOGO[plataforma]) : PLAT_LOGO[plataforma];
  if (err || !src) return <span style={{ fontSize: size * 0.65, color: PLAT_COLOR[plataforma] ?? "#fff" }}>●</span>;
  return <img src={src} alt={plataforma} width={size} height={size} onError={() => setErr(true)} style={{ display: "block", flexShrink: 0 }} />;
}

// ─── PERÍODO ──────────────────────────────────────────────────────────────────
type Periodo = "semana" | "mes" | "todos";

function getRange(periodo: Periodo): { start: string; end: string } {
  const now = new Date();
  const toISO = (d: Date) => d.toISOString().split("T")[0];
  const end = toISO(now);
  if (periodo === "semana") {
    const sun = new Date(now); sun.setDate(now.getDate() - now.getDay());
    return { start: toISO(sun), end };
  }
  if (periodo === "mes") {
    return { start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`, end };
  }
  return { start: "2000-01-01", end };
}

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: "semana", label: "Semana" },
  { value: "mes",    label: "Mês"    },
  { value: "todos",  label: "Tudo"   },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmtData(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

// ─── DROPDOWN INFLUENCER ──────────────────────────────────────────────────────
interface DropdownItem { id: string; name: string; }

function InfluencerDropdown({ items, selected, onChange }: {
  items: DropdownItem[]; selected: string[]; onChange: (next: string[]) => void;
}) {
  const { theme: t, isDark } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  }

  const label =
    selected.length === 0 ? "Todos os influencers" :
    selected.length === 1 ? (items.find(i => i.id === selected[0])?.name ?? "1 selecionado") :
    `${selected.length} selecionados`;

  const isActive = selected.length > 0;

  return (
    <div ref={ref} style={{ position: "relative", minWidth: 210 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", padding: "7px 14px", borderRadius: 20,
          border: `1.5px solid ${isActive ? BRAND.azul : t.cardBorder}`,
          background: isActive ? `${BRAND.azul}18` : (t.inputBg ?? t.cardBg),
          color: isActive ? BRAND.azul : t.textMuted,
          fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT.body,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          transition: "all 0.15s",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <GiStarMedal size={13} />
          {label}
        </span>
        <span style={{ fontSize: 9, opacity: 0.7, display: "inline-block", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)",
          left: "50%", transform: "translateX(-50%)",
          width: 230, background: t.cardBg,
          border: `1.5px solid ${t.cardBorder}`, borderRadius: 14,
          boxShadow: isDark ? "0 12px 32px rgba(0,0,0,0.6)" : "0 8px 24px rgba(0,0,0,0.12)",
          zIndex: 100, overflow: "hidden",
        }}>
          <div style={{ padding: "10px 14px 8px", borderBottom: `1px solid ${t.cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: FONT.body }}>
              Influencer
            </span>
            {selected.length > 0 && (
              <button onClick={() => onChange([])} style={{ fontSize: 10, color: BRAND.vermelho, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: FONT.body }}>
                Limpar
              </button>
            )}
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto", padding: "6px 0" }}>
            {items.map(inf => {
              const ativo = selected.includes(inf.id);
              return (
                <div key={inf.id} onClick={() => toggle(inf.id)} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 14px", cursor: "pointer",
                  background: ativo ? `${BRAND.azul}18` : "transparent",
                  transition: "background 0.1s",
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: 5, flexShrink: 0,
                    border: `2px solid ${ativo ? BRAND.azul : t.cardBorder}`,
                    background: ativo ? BRAND.azul : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s",
                  }}>
                    {ativo && <span style={{ fontSize: 9, color: "#fff", fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 13, fontFamily: FONT.body, color: ativo ? t.text : t.textMuted, fontWeight: ativo ? 600 : 400 }}>
                    {inf.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface LiveComObs extends Omit<Live, "observacao"> {
  observacao?: string | null;
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Feedback() {
  const { theme: t, isDark } = useApp();
  const { showFiltroInfluencer, showFiltroOperadora, podeVerInfluencer, escoposVisiveis, operadoraSlugsForcado } = useDashboardFiltros();
  const perm = usePermission("feedback");

  const [periodo,           setPeriodo]           = useState<Periodo>("semana");
  const [statusFiltro,      setStatusFiltro]      = useState<LiveStatus | "todos">("todos");
  const [influencerFiltros, setInfluencerFiltros] = useState<string[]>([]);
  const [filterOperadora,   setFilterOperadora]   = useState<string>("todas");
  const [operadorasList,    setOperadorasList]    = useState<{ slug: string; nome: string }[]>([]);
  const [lives,             setLives]             = useState<LiveComObs[]>([]);
  const [resultados,        setResultados]        = useState<Record<string, LiveResultado>>({});
  const [influencers,       setInfluencers]       = useState<{ id: string; name: string }[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [editando,          setEditando]          = useState<LiveComObs | null>(null);
  const [excluindo,         setExcluindo]         = useState<LiveComObs | null>(null);
  const [livesAll,          setLivesAll]          = useState<LiveComObs[]>([]);
  const [resultadosAll,     setResultadosAll]     = useState<Record<string, LiveResultado>>({});

  async function loadData() {
    setLoading(true);
    const { start, end } = getRange(periodo);

    let baseQuery = supabase
      .from("lives")
      .select("*, profiles!lives_influencer_id_fkey(name)")
      .gte("data", start).lte("data", end)
      .in("status", ["realizada", "nao_realizada"])
      .order("data", { ascending: false })
      .order("horario", { ascending: true });

    if (operadoraSlugsForcado?.length) baseQuery = baseQuery.in("operadora_slug", operadoraSlugsForcado);
    if (influencerFiltros.length > 0) baseQuery = baseQuery.in("influencer_id", influencerFiltros);

    const { data: allData } = await baseQuery;

    if (allData) {
      const mappedAll: LiveComObs[] = allData
        .map((l: { profiles?: { name: string }; [k: string]: unknown }) => ({ ...l, influencer_name: l.profiles?.name })) as LiveComObs[];
      const visiveis = mappedAll.filter((l) => podeVerInfluencer(l.influencer_id));
      setLivesAll(visiveis);

      const unique = Array.from(
        new Map(visiveis.map(l => [l.influencer_id, { id: l.influencer_id, name: l.influencer_name ?? l.influencer_id }])).values()
      ).filter((i) => podeVerInfluencer(i.id)).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "pt-BR"));
      setInfluencers(unique);

      const allIds = visiveis.map(l => l.id);
      let resMapAll: Record<string, LiveResultado> = {};
      if (allIds.length > 0) {
        const { data: resAll } = await supabase.from("live_resultados").select("*").in("live_id", allIds);
        if (resAll) resAll.forEach((r: LiveResultado) => { resMapAll[r.live_id] = r; });
      }
      setResultadosAll(resMapAll);

      const filtered = statusFiltro === "todos" ? visiveis : visiveis.filter(l => l.status === statusFiltro);
      setLives(filtered);

      const filteredIds = filtered.map(l => l.id);
      let resMap: Record<string, LiveResultado> = {};
      if (filteredIds.length > 0) {
        const { data: resData } = await supabase.from("live_resultados").select("*").in("live_id", filteredIds);
        if (resData) resData.forEach((r: LiveResultado) => { resMap[r.live_id] = r; });
      }
      setResultados(resMap);
    }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [periodo, statusFiltro, influencerFiltros, podeVerInfluencer, operadoraSlugsForcado]);

  useEffect(() => {
    supabase.from("operadoras").select("slug, nome").order("nome")
      .then(({ data }) => { if (data) setOperadorasList(data); });
  }, []);

  const livesAllFiltered = useMemo(() => {
    if (operadoraSlugsForcado?.length) return livesAll.filter((l) => l.operadora_slug && operadoraSlugsForcado.includes(l.operadora_slug));
    if (!filterOperadora || filterOperadora === "todas") return livesAll;
    return livesAll.filter((l) => l.operadora_slug === filterOperadora);
  }, [livesAll, filterOperadora, operadoraSlugsForcado]);

  const livesFiltered = useMemo(() => {
    if (operadoraSlugsForcado?.length) return lives.filter((l) => l.operadora_slug && operadoraSlugsForcado.includes(l.operadora_slug));
    if (!filterOperadora || filterOperadora === "todas") return lives;
    return lives.filter((l) => l.operadora_slug === filterOperadora);
  }, [lives, filterOperadora, operadoraSlugsForcado]);

  // ── Cálculos dos quadros ──────────────────────────────────────────────────
  const totalLives         = livesAllFiltered.length;
  const totalRealizadas    = livesAllFiltered.filter(l => l.status === "realizada").length;
  const totalNaoRealizadas = livesAllFiltered.filter(l => l.status === "nao_realizada").length;
  const realizadasComRes   = livesAllFiltered.filter(l => l.status === "realizada" && resultadosAll[l.id]);

  const totalHoras = realizadasComRes.reduce((acc, l) => {
    const r = resultadosAll[l.id];
    return acc + (r.duracao_horas ?? 0) + (r.duracao_min ?? 0) / 60;
  }, 0);
  const horasInt    = Math.floor(totalHoras);
  const minutosRest = Math.round((totalHoras - horasInt) * 60);

  const mediaViews = realizadasComRes.length > 0
    ? Math.round(realizadasComRes.reduce((acc, l) => acc + (resultadosAll[l.id]?.media_views ?? 0), 0) / realizadasComRes.length)
    : 0;

  async function handleExcluir(live: LiveComObs) {
    if (!perm.canExcluirOk || !confirm("Tem certeza que deseja excluir esta live?")) return;
    setExcluindo(live);
    await supabase.from("live_resultados").delete().eq("live_id", live.id);
    const { error } = await supabase.from("lives").delete().eq("id", live.id);
    setExcluindo(null);
    if (!error) loadData();
  }

  // ── Estilos ───────────────────────────────────────────────────────────────
  const filterBtn = (active: boolean, color: string = BRAND.roxoVivo): React.CSSProperties => ({
    padding: "7px 16px", borderRadius: 20,
    border: `1.5px solid ${active ? color : t.cardBorder}`,
    background: active ? `${color}22` : (t.inputBg ?? t.cardBg),
    color: active ? color : t.textMuted,
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: FONT.body, whiteSpace: "nowrap" as const,
    transition: "all 0.15s",
  });

  const statBox = (color: string): React.CSSProperties => ({
    flex: 1, textAlign: "center" as const, padding: "10px 8px",
    borderRadius: 10,
    background: isDark ? `${color}11` : `${color}09`,
    border: `1px solid ${color}33`, minWidth: 0,
  });

  // ── LiveCard ──────────────────────────────────────────────────────────────
  function LiveCard({ live }: { live: LiveComObs }) {
    const res         = resultados[live.id];
    const isRealizada = live.status === "realizada";
    const statusColor = isRealizada ? BRAND.verde : BRAND.vermelho;
    const platColor   = PLAT_COLOR[live.plataforma];
    const podeEditar  = perm.canEditarOk && (perm.canEditar !== "proprios" || podeVerInfluencer(live.influencer_id));
    const podeExcluir = perm.canExcluirOk && (perm.canExcluir !== "proprios" || podeVerInfluencer(live.influencer_id));
    const isExcluindo = excluindo?.id === live.id;

    return (
      <div style={{
        background: t.cardBg, border: `1px solid ${t.cardBorder}`,
        borderRadius: 16, padding: 20, marginBottom: 10,
        borderLeft: `6px solid ${statusColor}`,
      }}>
        {/* Linha principal */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          {/* Ícone da plataforma — SVG oficial */}
          <div style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            background: `${platColor}22`,
            border: `1.5px solid ${platColor}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <PlatLogo plataforma={live.plataforma} size={20} isDark={isDark ?? false} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Data e hora com ícone Lucide */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, color: t.text, fontFamily: FONT.body, marginBottom: 4 }}>
              <Calendar size={13} style={{ color: t.textMuted, flexShrink: 0 }} />
              {fmtData(live.data)} às {live.horario?.slice(0, 5)}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {/* Influencer com ícone Lucide */}
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
                <User size={12} style={{ flexShrink: 0 }} />
                {live.influencer_name}
              </span>
              <span style={{ fontSize: 11, color: t.textMuted }}>·</span>
              {/* Badge plataforma com logo SVG */}
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 11, padding: "3px 9px", borderRadius: 20,
                background: `${platColor}22`, color: platColor,
                fontWeight: 600, fontFamily: FONT.body,
              }}>
                <PlatLogo plataforma={live.plataforma} size={11} isDark={isDark ?? false} />
                {live.plataforma}
              </span>
            </div>
          </div>

          {/* Botões Editar / Excluir com Lucide */}
          {(podeEditar || podeExcluir) && (
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              {podeEditar && (
                <button onClick={() => setEditando(live)} style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", borderRadius: 8,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg ?? t.cardBg, color: t.text,
                  fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: FONT.body,
                }}>
                  <Pencil size={11} /> Editar
                </button>
              )}
              {podeExcluir && (
                <button onClick={() => handleExcluir(live)} disabled={isExcluindo} style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", borderRadius: 8,
                  border: `1px solid ${BRAND.vermelho}50`,
                  background: `${BRAND.vermelho}10`, color: BRAND.vermelho,
                  fontSize: 11, fontWeight: 600,
                  cursor: isExcluindo ? "not-allowed" : "pointer",
                  fontFamily: FONT.body, opacity: isExcluindo ? 0.6 : 1,
                }}>
                  <Trash2 size={11} /> {isExcluindo ? "..." : "Excluir"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Observação */}
        {live.observacao && (
          <div style={{
            marginTop: 14, padding: "10px 14px", borderRadius: 10,
            background: isDark ? "#ffffff08" : "#00000006",
            border: `1px solid ${t.cardBorder}`,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.8px" }}>
              Observação:
            </span>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: t.text, fontFamily: FONT.body, lineHeight: 1.5 }}>
              {live.observacao}
            </p>
          </div>
        )}

        {/* Stats — paleta oficial */}
        {isRealizada && res && (
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <div style={statBox(BRAND.roxoVivo)}>
              <div style={{ fontSize: 16, fontWeight: 800, color: BRAND.roxoVivo, fontFamily: FONT.body }}>
                {res.duracao_horas}h {res.duracao_min}m
              </div>
              <div style={{ fontSize: 10, color: t.textMuted, fontFamily: FONT.body, marginTop: 2 }}>Duração</div>
            </div>
            <div style={statBox(BRAND.azul)}>
              <div style={{ fontSize: 16, fontWeight: 800, color: BRAND.azul, fontFamily: FONT.body }}>
                {res.media_views.toLocaleString("pt-BR")}
              </div>
              <div style={{ fontSize: 10, color: t.textMuted, fontFamily: FONT.body, marginTop: 2 }}>Média Views</div>
            </div>
            <div style={statBox(BRAND.ciano)}>
              <div style={{ fontSize: 16, fontWeight: 800, color: BRAND.ciano, fontFamily: FONT.body }}>
                {(res.max_views ?? 0).toLocaleString("pt-BR")}
              </div>
              <div style={{ fontSize: 10, color: t.textMuted, fontFamily: FONT.body, marginTop: 2 }}>Pico Views</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar o feedback de lives.
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>

      {/* ── HEADER — padrão NHD Bold + ícone container ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
        <span style={{
          width: 32, height: 32, borderRadius: 9,
          background: "rgba(74,32,130,0.18)",
          border: "1px solid rgba(74,32,130,0.30)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: BRAND.ciano, flexShrink: 0,
        }}>
          <GiChatBubble size={16} />
        </span>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, margin: 0, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Feedback de Lives
          </h1>
          <p style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, margin: "2px 0 0" }}>
            Resultado final das lives validadas em Resultados. O Financeiro consome operadora, período e influencer das realizadas para o cálculo de pagamento.
          </p>
        </div>
      </div>

      {/* ── QUADROS DE RESUMO ── */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          {/* Total de lives */}
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: t.text, fontFamily: FONT_TITLE, lineHeight: 1 }}>
              {totalLives}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.8px", marginTop: 4 }}>
              Total de Lives
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, fontFamily: FONT.body, color: BRAND.verde }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: BRAND.verde, display: "inline-block" }} />
                {totalRealizadas} realizadas
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, fontFamily: FONT.body, color: BRAND.vermelho }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: BRAND.vermelho, display: "inline-block" }} />
                {totalNaoRealizadas} não realizadas
              </span>
            </div>
          </div>

          {/* Horas realizadas */}
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: BRAND.roxoVivo, fontFamily: FONT_TITLE, lineHeight: 1 }}>
              {horasInt}h{minutosRest > 0 ? ` ${minutosRest}m` : ""}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.8px", marginTop: 4 }}>
              Horas Realizadas
            </div>
            <div style={{ marginTop: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: FONT.body, color: t.textMuted }}>
                em {realizadasComRes.length} live{realizadasComRes.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Média de views */}
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: BRAND.azul, fontFamily: FONT_TITLE, lineHeight: 1 }}>
              {mediaViews > 0 ? mediaViews.toLocaleString("pt-BR") : "—"}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.8px", marginTop: 4 }}>
              Média de Views
            </div>
            <div style={{ marginTop: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: FONT.body, color: t.textMuted }}>
                média das médias por live
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── FILTROS ──
          Linha 1: Período / Status
          Linha 2: Influencer / Operadoras */}
      <div style={{ marginBottom: 24 }}>
        {/* Linha 1: Período e Status */}
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
          {PERIODOS.map(p => (
            <button key={p.value} onClick={() => setPeriodo(p.value)} style={filterBtn(periodo === p.value)}>
              {p.label}
            </button>
          ))}
          <div style={{ width: 1.5, alignSelf: "stretch", minHeight: 28, background: t.cardBorder, borderRadius: 2, margin: "0 4px", flexShrink: 0 }} />
          <button onClick={() => setStatusFiltro("realizada")} style={filterBtn(statusFiltro === "realizada", BRAND.verde)}>
            Realizada
          </button>
          <button onClick={() => setStatusFiltro("nao_realizada")} style={filterBtn(statusFiltro === "nao_realizada", BRAND.vermelho)}>
            Não Realizada
          </button>
          <button onClick={() => setStatusFiltro("todos")} style={filterBtn(statusFiltro === "todos", BRAND.ciano)}>
            Todos
          </button>
        </div>

        {/* Linha 2: Influencer e Operadoras */}
        {(showFiltroInfluencer && influencers.length > 0) || (showFiltroOperadora && operadorasList.length > 0) ? (
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            {showFiltroInfluencer && influencers.length > 0 && (
              <InfluencerDropdown items={influencers} selected={influencerFiltros} onChange={setInfluencerFiltros} />
            )}
            {showFiltroOperadora && operadorasList.length > 0 && (
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: 10, display: "flex", alignItems: "center", pointerEvents: "none", color: t.textMuted }}>
                  <GiShield size={13} />
                </span>
                <select
                  value={filterOperadora}
                  onChange={(e) => setFilterOperadora(e.target.value)}
                  style={{
                    padding: "7px 14px 7px 30px", borderRadius: 20,
                    border: `1.5px solid ${filterOperadora !== "todas" ? BRAND.roxoVivo : t.cardBorder}`,
                    background: filterOperadora !== "todas" ? `${BRAND.roxoVivo}22` : (t.inputBg ?? t.cardBg),
                    color: filterOperadora !== "todas" ? BRAND.roxoVivo : t.textMuted,
                    fontSize: 12, fontWeight: 600, fontFamily: FONT.body,
                    cursor: "pointer", outline: "none", appearance: "none",
                  }}
                >
                  <option value="todas">Todas as operadoras</option>
                  {operadorasList
                    .filter((o) => escoposVisiveis.operadorasVisiveis.length === 0 || escoposVisiveis.operadorasVisiveis.includes(o.slug))
                    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                    .map((o) => <option key={o.slug} value={o.slug}>{o.nome}</option>)}
                </select>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Contador */}
      {!loading && livesFiltered.length > 0 && (
        <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginBottom: 14 }}>
          {livesFiltered.length} live(s) encontrada(s)
          {influencerFiltros.length > 0 && (
            <span style={{ marginLeft: 8, color: BRAND.azul, fontWeight: 600 }}>
              · {influencerFiltros.length} influencer(s) selecionado(s)
            </span>
          )}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: t.textMuted, fontFamily: FONT.body }}>Carregando...</div>
      ) : livesFiltered.length === 0 ? (
        <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 16, padding: 48, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
          Nenhuma live encontrada para o período selecionado.
        </div>
      ) : (
        livesFiltered.map(l => <LiveCard key={l.id} live={l} />)
      )}

      {/* Modal Editar */}
      {editando && (
        <ModalFeedbackEdit
          live={editando}
          res={resultadosAll[editando.id]}
          operadorasList={operadorasList}
          t={t}
          isDark={isDark ?? false}
          onClose={() => setEditando(null)}
          onSalvo={() => { setEditando(null); loadData(); }}
        />
      )}
    </div>
  );
}

// ─── MODAL EDITAR FEEDBACK ────────────────────────────────────────────────────
function ModalFeedbackEdit({ live, res, operadorasList, t, isDark, onClose, onSalvo }: {
  live: LiveComObs; res?: LiveResultado;
  operadorasList: { slug: string; nome: string }[];
  t: ReturnType<typeof useApp>["theme"]; isDark: boolean;
  onClose: () => void; onSalvo: () => void;
}) {
  const [observacao,   setObservacao]   = useState(live.observacao ?? "");
  const [operadoraSlug, setOperadoraSlug] = useState(live.operadora_slug ?? "");
  const [status,       setStatus]       = useState<LiveStatus>(
    live.status === "agendada" ? "realizada" : (live.status as LiveStatus)
  );
  const [duracaoHoras, setDuracaoHoras] = useState(res?.duracao_horas ?? 0);
  const [duracaoMin,   setDuracaoMin]   = useState(res?.duracao_min   ?? 0);
  const [mediaViews,   setMediaViews]   = useState(res?.media_views   ?? 0);
  const [maxViews,     setMaxViews]     = useState(res?.max_views     ?? 0);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");

  const showResultFields = status === "realizada";

  async function handleSave() {
    setError("");
    if (showResultFields) {
      if (!operadoraSlug?.trim()) {
        setError("Selecione a operadora. É obrigatório para lives realizadas (Financeiro)."); return;
      }
      if (duracaoHoras === 0 && duracaoMin === 0) {
        setError("Informe a duração da live para lives realizadas."); return;
      }
      if ((duracaoHoras > 0 || duracaoMin > 0) && maxViews < mediaViews) {
        setError("Pico de views não pode ser menor que a média."); return;
      }
    }
    setSaving(true);

    const liveUpdate: Record<string, unknown> = { observacao: observacao.trim() || null, status };
    if (operadoraSlug?.trim()) (liveUpdate as Record<string, string>).operadora_slug = operadoraSlug.trim();

    const { error: upErr } = await supabase.from("lives")
      .update(liveUpdate).eq("id", live.id);
    if (upErr) { setError("Erro ao salvar. Tente novamente."); setSaving(false); return; }

    if (showResultFields) {
      const payload = { live_id: live.id, duracao_horas: duracaoHoras, duracao_min: duracaoMin, media_views: mediaViews, max_views: maxViews };
      const { error: resErr } = res
        ? await supabase.from("live_resultados").update(payload).eq("live_id", live.id)
        : await supabase.from("live_resultados").insert(payload);
      if (resErr) { setError("Erro ao salvar resultado. Tente novamente."); setSaving(false); return; }
    }

    setSaving(false);
    onSalvo();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "10px 14px",
    borderRadius: 10, border: `1px solid ${t.inputBorder ?? t.cardBorder}`,
    background: t.inputBg ?? t.cardBg, color: t.inputText ?? t.text,
    fontSize: 13, fontFamily: FONT.body, outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "1.2px",
    textTransform: "uppercase", color: t.textMuted, marginBottom: 5, fontFamily: FONT.body,
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 20, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>

        {/* Cabeçalho */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 8,
              background: "rgba(74,32,130,0.18)", border: "1px solid rgba(74,32,130,0.30)",
              display: "flex", alignItems: "center", justifyContent: "center", color: BRAND.ciano,
            }}>
              <GiPencil size={13} />
            </span>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Editar Feedback
            </h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, display: "flex", alignItems: "center", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body, marginBottom: 20 }}>
          {live.influencer_name} · {fmtData(live.data)} {live.horario?.slice(0, 5)}
        </div>

        {error && (
          <div style={{ background: `${BRAND.vermelho}18`, border: `1px solid ${BRAND.vermelho}44`, color: BRAND.vermelho, borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Status — paleta oficial */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Status</label>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStatus("realizada")} style={{ flex: 1, padding: 10, borderRadius: 10, border: `2px solid ${status === "realizada" ? BRAND.verde : t.cardBorder}`, background: status === "realizada" ? `${BRAND.verde}18` : (t.inputBg ?? t.cardBg), color: status === "realizada" ? BRAND.verde : t.textMuted, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.body, transition: "all 0.15s" }}>
              Realizada
            </button>
            <button onClick={() => setStatus("nao_realizada")} style={{ flex: 1, padding: 10, borderRadius: 10, border: `2px solid ${status === "nao_realizada" ? BRAND.vermelho : t.cardBorder}`, background: status === "nao_realizada" ? `${BRAND.vermelho}18` : (t.inputBg ?? t.cardBg), color: status === "nao_realizada" ? BRAND.vermelho : t.textMuted, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.body, transition: "all 0.15s" }}>
              Não realizada
            </button>
          </div>
        </div>

        {/* Operadora — obrigatória para realizada (Financeiro) */}
        {operadorasList.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>
              Operadora {showResultFields && <span style={{ color: BRAND.vermelho }}>*</span>}
            </label>
            <select
              value={operadoraSlug}
              onChange={e => setOperadoraSlug(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box", padding: "10px 14px",
                borderRadius: 10, border: `1px solid ${t.inputBorder ?? t.cardBorder}`,
                background: t.inputBg ?? t.cardBg, color: t.inputText ?? t.text,
                fontSize: 13, fontFamily: FONT.body, outline: "none", cursor: "pointer",
              }}
            >
              <option value="">Selecione a operadora...</option>
              {[...operadorasList].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map(o => <option key={o.slug} value={o.slug}>{o.nome}</option>)}
            </select>
            {showResultFields && (
              <span style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, marginTop: 4, display: "block" }}>
                Obrigatório para o Financeiro considerar a live no cálculo de pagamentos.
              </span>
            )}
          </div>
        )}

        {/* Observação */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Observação</label>
          <textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="Feedback ou observação sobre a live..." />
        </div>

        {/* Campos de resultado */}
        {showResultFields && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Duração (horas)</label>
                <input type="number" min={0} value={duracaoHoras} onChange={e => setDuracaoHoras(Math.max(0, parseInt(e.target.value, 10) || 0))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Duração (min)</label>
                <input type="number" min={0} max={59} value={duracaoMin} onChange={e => setDuracaoMin(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Média de views</label>
                <input type="number" min={0} value={mediaViews} onChange={e => setMediaViews(Math.max(0, parseInt(e.target.value, 10) || 0))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Pico de views</label>
                <input type="number" min={0} value={maxViews} onChange={e => setMaxViews(Math.max(0, parseInt(e.target.value, 10) || 0))} style={inputStyle} />
              </div>
            </div>
          </>
        )}

        {/* Botões */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: "none", color: t.text, cursor: "pointer", fontFamily: FONT.body, fontSize: 13 }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: "10px 20px", borderRadius: 10, border: "none",
            background: `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`,
            color: "#fff", cursor: saving ? "not-allowed" : "pointer",
            fontFamily: FONT.body, fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1,
          }}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
