import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useApp } from "../../../context/AppContext";
import { verificarElegibilidadeAgendaLive } from "../../../lib/influencerAgendaGate";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { BRAND } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import { Live } from "../../../types";
import ModalLive from "./ModalLive";
import ModalBloqueioAgendaLive from "./ModalBloqueioAgendaLive";
import { ViewMes, ViewSemana, ViewDia, type ViewMode } from "./AgendaCalendarViews";
// Dívida técnica (B5): migrar para InfluencerDropdown em refatoração de filtros.
import InfluencerMultiSelect from "../../../components/InfluencerMultiSelect";
import { PlatLogo } from "../../../components/PlatLogo";
import {
  CalendarDays,
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  X,
  Loader2,
  Plus,
  Shield,
} from "lucide-react";

import { PLAT_COLOR } from "../../../constants/platforms";
import { ROLES_PARIDADE_INFLUENCER, roleParidadeInfluencer } from "../../../lib/staffRoles";
import { DashboardPageHeader, SelectComIcone } from "../../../components/dashboard";

// ─── STATUS ───────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  agendada:      BRAND.azul,
  realizada:     BRAND.verde,
  nao_realizada: BRAND.vermelho,
};

const STATUS_LABEL: Record<string, string> = {
  agendada:      "Agendada",
  realizada:     "Realizada",
  nao_realizada: "Não Realizada",
};

// ─── CALENDÁRIO ───────────────────────────────────────────────────────────────
const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function getWeekDays(date: Date): Date[] {
  const day = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function toISO(d: Date) {
  return d.toISOString().split("T")[0];
}

// ─── SINGLE DROPDOWN (Visualização) ──────────────────────────────────────────
interface SingleDropdownTheme {
  cardBg: string;
  cardBorder: string;
  text: string;
}

interface SingleDropdownProps {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  icon?: React.ReactNode;
  t: SingleDropdownTheme;
}

function SingleDropdown({ value, options, onChange, icon, t, accent }: SingleDropdownProps & { accent?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const accentColor = accent ?? BRAND.roxoVivo;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const current = options.find(o => o.value === value);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Modo de visualização: ${current?.label ?? value}`}
        style={{
          padding: "6px 14px", borderRadius: 999,
          border: `1px solid ${accentColor}`,
          background: accentColor.startsWith("var(") ? "color-mix(in srgb, var(--brand-accent, #7c3aed) 15%, transparent)" : `${accentColor}22`,
          color: accentColor,
          fontSize: 13, fontWeight: 600, fontFamily: FONT.body,
          cursor: "pointer", outline: "none",
          display: "flex", alignItems: "center", gap: 6,
          whiteSpace: "nowrap" as const,
          lineHeight: 1,
        }}
      >
        {icon && <span style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}>{icon}</span>}
        <span style={{ display: "inline-flex", alignItems: "center" }}>{current?.label}</span>
        {open ? <ChevronUp size={9} style={{ opacity: 0.7 }} aria-hidden="true" /> : <ChevronDown size={9} style={{ opacity: 0.7 }} aria-hidden="true" />}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200,
            background: t.cardBg, border: `1px solid ${t.cardBorder}`,
            borderRadius: 12, padding: 8, minWidth: 130,
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          {options.map(opt => {
            const selected = opt.value === value;
            return (
              <button
                type="button"
                role="menuitem"
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 8,
                  border: "none",
                  background: selected ? (accentColor.startsWith("var(") ? "color-mix(in srgb, var(--brand-accent, #7c3aed) 15%, transparent)" : `${accentColor}22`) : "transparent",
                  color: selected ? accentColor : t.text,
                  fontSize: 12, fontFamily: FONT.body,
                  cursor: "pointer", textAlign: "left",
                  display: "flex", alignItems: "center", gap: 8,
                  fontWeight: selected ? 700 : 400,
                }}
              >
                <span style={{
                  width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                  border: `1.5px solid ${selected ? accentColor : t.cardBorder}`,
                  background: selected ? accentColor : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {selected ? <Check size={9} color="#fff" aria-hidden="true" /> : null}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Agenda() {
  const { theme: t, isDark, user, setActivePage } = useApp();
  const brand = useDashboardBrand();
  const { showFiltroInfluencer, showFiltroOperadora, podeVerInfluencer, podeVerOperadora, escoposVisiveis: _escoposVisiveis, operadoraSlugsForcado } = useDashboardFiltros();
  const perm = usePermission("agenda");

  const [view,    setView]    = useState<ViewMode>("mes");
  const [current, setCurrent] = useState(new Date());
  const [lives,   setLives]   = useState<Live[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<{ open: boolean; live?: Live }>({ open: false });
  const [bloqueioNovaLive, setBloqueioNovaLive] = useState<{
    perfilIncompleto: boolean;
    faltaPlaybook: boolean;
  } | null>(null);
  const [checandoNovaLive, setChecandoNovaLive] = useState(false);

  const [filterStatus,      setFilterStatus]      = useState<string | null>(null);
  const [filterPlat,        setFilterPlat]        = useState<string | null>(null);
  const [filterInfluencers, setFilterInfluencers] = useState<string[]>([]);
  const [filterOperadora,   setFilterOperadora]   = useState<string>("todas");
  const [influencerList,    setInfluencerList]    = useState<{ id: string; name: string }[]>([]);
  const [operadorasList,    setOperadorasList]    = useState<{ slug: string; nome: string }[]>([]);

  const hasActiveFilters = filterStatus !== null || filterPlat !== null || filterInfluencers.length > 0 || filterOperadora !== "todas";

  const influencerListVisiveis = useMemo(
    () => influencerList.filter((i) => podeVerInfluencer(i.id)),
    [influencerList, podeVerInfluencer]
  );
  const loadLives = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("lives").select("*, profiles!lives_influencer_id_fkey(name)").order("data", { ascending: true }).order("horario", { ascending: true });
    if (operadoraSlugsForcado?.length) q = q.in("operadora_slug", operadoraSlugsForcado);
    const { data, error } = await q;
    if (!error && data) {
      type LiveRowDb = Live & { profiles?: { name?: string | null } | null };
      const mapped = (data as LiveRowDb[]).map((l) => ({ ...l, influencer_name: l.profiles?.name ?? undefined }));
      setLives(mapped.filter((l) => podeVerInfluencer(l.influencer_id)));
    }
    setLoading(false);
  }, [podeVerInfluencer, operadoraSlugsForcado]);

  useEffect(() => { void loadLives(); }, [loadLives]);

  useEffect(() => {
    if (showFiltroInfluencer || showFiltroOperadora) {
      Promise.all([
        showFiltroInfluencer ? supabase.from("profiles").select("id, name").in("role", [...ROLES_PARIDADE_INFLUENCER]).order("name") : Promise.resolve({ data: [] }),
        showFiltroOperadora  ? supabase.from("operadoras").select("slug, nome").order("nome") : Promise.resolve({ data: [] }),
      ]).then(([profRes, opsRes]) => {
        if (showFiltroInfluencer && profRes.data) setInfluencerList(profRes.data);
        if (showFiltroOperadora)  setOperadorasList((opsRes.data ?? []) as { slug: string; nome: string }[]);
      });
    }
  }, [showFiltroInfluencer, showFiltroOperadora]);

  const operadoraEfetiva = operadoraSlugsForcado ?? (filterOperadora !== "todas" ? [filterOperadora] : null);
  function livesForDay(date: Date): Live[] {
    const iso = toISO(date);
    return lives.filter(l => {
      if (l.data !== iso) return false;
      if (filterStatus && l.status !== filterStatus) return false;
      if (filterPlat   && l.plataforma !== filterPlat) return false;
      if (filterInfluencers.length > 0 && !filterInfluencers.includes(l.influencer_id)) return false;
      if (operadoraEfetiva && (!l.operadora_slug || !operadoraEfetiva.includes(l.operadora_slug))) return false;
      return true;
    });
  }

  function prev() {
    const d = new Date(current);
    if (view === "mes")    d.setMonth(d.getMonth() - 1);
    if (view === "semana") d.setDate(d.getDate() - 7);
    if (view === "dia")    d.setDate(d.getDate() - 1);
    setCurrent(d);
  }
  function next() {
    const d = new Date(current);
    if (view === "mes")    d.setMonth(d.getMonth() + 1);
    if (view === "semana") d.setDate(d.getDate() + 7);
    if (view === "dia")    d.setDate(d.getDate() + 1);
    setCurrent(d);
  }
  function goToday() { setCurrent(new Date()); }

  function headerTitle() {
    if (view === "mes")    return `${MONTHS[current.getMonth()]} ${current.getFullYear()}`;
    if (view === "semana") {
      const w = getWeekDays(current);
      return `${w[0].getDate()} – ${w[6].getDate()} ${MONTHS[w[6].getMonth()]} ${w[6].getFullYear()}`;
    }
    return `${current.getDate()} ${MONTHS[current.getMonth()]} ${current.getFullYear()}`;
  }

  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";
  const card: React.CSSProperties = {
    background: brand.blockBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 18,
    padding: 20,
    boxShadow: cardShadow,
  };

  const DEFAULT_CHIP_COLOR = "var(--brand-primary, #7c3aed)";
  const calendarViewProps = {
    current,
    livesForDay,
    t,
    brand,
    isDark,
    setCurrent,
    setView,
    onOpenLive: (live: Live) => setModal({ open: true, live }),
  };
  function chipActiveBg(color: string): string {
    if (color.startsWith("var(")) return `color-mix(in srgb, ${color} 14%, transparent)`;
    return `${color}22`;
  }

  const btnNav: React.CSSProperties = {
    width: 30, height: 30, borderRadius: "50%",
    border: `1px solid ${t.cardBorder}`,
    background: "transparent", color: t.text, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  const chipBase = (active: boolean, color: string = DEFAULT_CHIP_COLOR): React.CSSProperties => ({
    padding: "6px 14px", borderRadius: 999, fontSize: 13,
    cursor: "pointer", border: `1px solid ${active ? color : t.cardBorder}`,
    background: active ? chipActiveBg(color) : "transparent",
    color: active ? color : t.textMuted,
    fontFamily: FONT.body, fontWeight: active ? 700 : 400,
    transition: "all 0.15s",
    display: "flex", alignItems: "center", gap: 6,
    lineHeight: 1,
  });

  const VIEW_OPTIONS = [
    { value: "mes",    label: "Mês"    },
    { value: "semana", label: "Semana" },
    { value: "dia",    label: "Dia"    },
  ];

  async function tentarAbrirNovaLive() {
    if (!user) return;
    if (roleParidadeInfluencer(user.role)) {
      setChecandoNovaLive(true);
      try {
        const gate = await verificarElegibilidadeAgendaLive(user.id);
        if (gate.perfilIncompleto || gate.faltaPlaybook) {
          setBloqueioNovaLive(gate);
          return;
        }
      } finally {
        setChecandoNovaLive(false);
      }
    }
    setModal({ open: true });
  }

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>

      <DashboardPageHeader
        icon={<CalendarRange size={14} aria-hidden="true" />}
        title="Agenda de Lives"
        subtitle="Calendário central de lives — visualize, agende e acompanhe lives de todos os influencers."
        brand={brand}
        t={t}
        right={
          perm.canCriarOk ? (
            <button
              type="button"
              onClick={() => void tentarAbrirNovaLive()}
              disabled={checandoNovaLive}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "10px 20px", borderRadius: 10, border: "none",
                cursor: checandoNovaLive ? "not-allowed" : "pointer",
                opacity: checandoNovaLive ? 0.75 : 1,
                background: brand.useBrand
                  ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
                  : "linear-gradient(135deg, #4a2082, #1e36f8)",
                color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: FONT.body,
              }}
            >
              {checandoNovaLive ? (
                <>
                  <Loader2 size={14} className="app-lucide-spin" aria-hidden="true" />
                  Verificando...
                </>
              ) : (
                <>
                  <Plus size={14} aria-hidden="true" />
                  Nova Live
                </>
              )}
            </button>
          ) : undefined
        }
      />

      {/* ── BLOCO DE FILTROS (padrão Dashboards) ── */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          borderRadius: 14,
          border: brand.primaryTransparentBorder,
          background: brand.primaryTransparentBg,
          padding: "12px 20px",
        }}>
          {/* Linha principal — centralizada */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, flexWrap: "wrap" }}>
            <button type="button" onClick={prev} style={btnNav} aria-label="Período anterior">
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <span style={{ fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT.body, minWidth: 180, textAlign: "center" }}>
              {headerTitle()}
            </span>
            <button type="button" onClick={next} style={btnNav} aria-label="Próximo período">
              <ChevronRight size={14} aria-hidden="true" />
            </button>

            <button type="button" onClick={goToday} style={chipBase(false)}>Hoje</button>

            <SingleDropdown
              value={view}
              options={VIEW_OPTIONS}
              onChange={v => setView(v as ViewMode)}
              icon={<CalendarDays size={13} aria-hidden="true" />}
              t={t}
              accent={brand.accent}
            />

            {showFiltroInfluencer && influencerListVisiveis.length > 0 && (
              <InfluencerMultiSelect
                selected={filterInfluencers}
                onChange={setFilterInfluencers}
                influencers={influencerListVisiveis}
                t={t}
              />
            )}

            {showFiltroOperadora && operadorasList.length > 0 && (
              <SelectComIcone
                pill
                icon={<Shield size={13} aria-hidden="true" />}
                label="Filtrar por operadora"
                value={filterOperadora}
                onChange={setFilterOperadora}
                minWidth={200}
                style={{
                  border: `1px solid ${filterOperadora !== "todas" ? brand.accent : t.cardBorder}`,
                  background:
                    filterOperadora !== "todas"
                      ? "color-mix(in srgb, var(--brand-accent, #7c3aed) 15%, transparent)"
                      : (t.inputBg ?? t.cardBg),
                  color: filterOperadora !== "todas" ? brand.accent : t.textMuted,
                  fontWeight: filterOperadora !== "todas" ? 700 : 400,
                }}
              >
                <option value="todas">Todas as operadoras</option>
                {operadorasList
                  .filter((o) => podeVerOperadora(o.slug))
                  .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                  .map((o) => <option key={o.slug} value={o.slug}>{o.nome}</option>)}
              </SelectComIcone>
            )}
          </div>

          {/* Status e Plataforma */}
          <div style={{ paddingTop: 12, marginTop: 12, borderTop: `1px solid ${t.cardBorder}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.1em" }}>Status</span>
              {Object.entries(STATUS_COLOR).map(([status, color]) => {
                const active = filterStatus === status;
                return (
                  <button
                    type="button"
                    key={status}
                    aria-pressed={active}
                    onClick={() => setFilterStatus(prev => prev === status ? null : status)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "5px 12px", borderRadius: 999, cursor: "pointer",
                      border: `1px solid ${active ? color : color + "55"}`,
                      background: active ? `${color}22` : "transparent",
                      color: active ? color : t.textMuted, fontSize: 12, fontWeight: active ? 700 : 400,
                      fontFamily: FONT.body, transition: "all 0.15s",
                      lineHeight: 1,
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0, alignSelf: "center" }} />
                    <span style={{ display: "inline-flex", alignItems: "center" }}>{STATUS_LABEL[status]}</span>
                    {active && <span style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}><X size={9} aria-hidden="true" /></span>}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.1em" }}>Plataforma</span>
              {Object.entries(PLAT_COLOR).map(([plat, color]) => {
                const active = filterPlat === plat;
                return (
                  <button
                    type="button"
                    key={plat}
                    aria-pressed={active}
                    onClick={() => setFilterPlat(prev => prev === plat ? null : plat)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "5px 12px", borderRadius: 999, cursor: "pointer",
                      border: `1px solid ${active ? color : color + "55"}`,
                      background: active ? `${color}22` : `${color}11`,
                      color: active ? color : color + "cc",
                      fontSize: 12, fontWeight: active ? 700 : 500,
                      fontFamily: FONT.body, transition: "all 0.15s",
                      lineHeight: 1,
                    }}
                  >
                    <PlatLogo plataforma={plat} size={13} isDark={isDark ?? false} />
                    <span style={{ display: "inline-flex", alignItems: "center" }}>{plat}</span>
                    {active && <span style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}><X size={9} aria-hidden="true" /></span>}
                  </button>
                );
              })}
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => { setFilterStatus(null); setFilterPlat(null); setFilterInfluencers([]); setFilterOperadora("todas"); }}
                style={{
                  padding: "5px 14px", borderRadius: 999,
                  border: `1px solid ${BRAND.vermelho}44`,
                  background: `${BRAND.vermelho}11`,
                  color: BRAND.vermelho, fontSize: 12, fontWeight: 600,
                  fontFamily: FONT.body, cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <X size={12} aria-hidden="true" /> Limpar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── CALENDÁRIO ── */}
      <div style={card}>
        {loading ? (
          <div
            role="status"
            aria-label="Carregando agenda de lives"
            style={{ textAlign: "center", padding: 60, color: t.textMuted, fontFamily: FONT.body, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Loader2 size={20} className="app-lucide-spin" style={{ color: "var(--brand-primary, #7c3aed)" }} aria-hidden="true" />
          </div>
        ) : view === "mes" ? (
          <ViewMes {...calendarViewProps} />
        ) : view === "semana" ? (
          <ViewSemana {...calendarViewProps} />
        ) : (
          <ViewDia {...calendarViewProps} />
        )}
      </div>

      {/* ── MODAL ── */}
      {modal.open && (
        <ModalLive
          live={modal.live}
          onClose={() => setModal({ open: false })}
          onSave={() => { setModal({ open: false }); void loadLives(); }}
        />
      )}

      <ModalBloqueioAgendaLive
        open={bloqueioNovaLive !== null}
        onClose={() => setBloqueioNovaLive(null)}
        perfilIncompleto={bloqueioNovaLive?.perfilIncompleto ?? false}
        faltaPlaybook={bloqueioNovaLive?.faltaPlaybook ?? false}
        segundaPessoa
        onIrInfluencers={() => {
          setBloqueioNovaLive(null);
          setActivePage("influencers");
        }}
        onIrPlaybook={() => {
          setBloqueioNovaLive(null);
          setActivePage("playbook_influencers");
        }}
      />
    </div>
  );
}
