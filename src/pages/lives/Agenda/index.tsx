import { useState, useEffect, useMemo, useCallback } from "react";
import { useApp } from "../../../context/AppContext";
import { verificarElegibilidadeAgendaLive } from "../../../lib/influencerAgendaGate";
import { useIdentidadeEfetiva } from "../../../hooks/useIdentidadeEfetiva";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { getFilterBarRowStyle, getFilterBarWrapperStyle } from "../../../lib/filterBarStyles";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { BRAND } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import { fetchAllPages } from "../../../lib/supabasePaginate";
import { Live } from "../../../types";
import ModalLive from "./ModalLive";
import ModalBloqueioAgendaLive from "./ModalBloqueioAgendaLive";
import { ViewMes, ViewSemana, ViewDia, type ViewMode } from "./AgendaCalendarViews";
import {
  FiltroHojeButton,
  FiltroInfluencerSelect,
  FiltroModoVisualizacaoSelect,
} from "../../../components/dashboard";
import { ChevronLeft, ChevronRight, X, Loader2 } from "lucide-react";
import { CtaCriarButton } from "../../../components/CtaCriarButton";

import { PLAT_COLOR } from "../../../constants/platforms";
import { ROLES_PARIDADE_INFLUENCER, roleParidadeInfluencer } from "../../../lib/staffRoles";
import {
  DashboardPageHeader,
  FiltroOperadoraSelect,
  FiltroPlataformaSemanticoPill,
  FiltroStatusSemanticoPill,
  SectionTitle,
} from "../../../components/dashboard";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { AjudaContextualAcoes } from "../../../components/AjudaContextualAcoes";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { getPageCanonicalSubtitle } from "../../../lib/pageCanonicalCopy";

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

/** Data civil local (YYYY-MM-DD) — evita deslocar o dia via UTC (`toISOString`). */
function dateToISOLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Janela de datas do calendário visível (mês inclui células do grid adjacente). */
function agendaJanelaDatas(current: Date, view: ViewMode): { start: string; end: string } {
  if (view === "dia") {
    const iso = dateToISOLocal(current);
    return { start: iso, end: iso };
  }
  if (view === "semana") {
    const w = getWeekDays(current);
    return { start: dateToISOLocal(w[0]), end: dateToISOLocal(w[6]) };
  }
  const y = current.getFullYear();
  const m = current.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const end = new Date(last);
  end.setDate(last.getDate() + (6 - last.getDay()));
  return { start: dateToISOLocal(start), end: dateToISOLocal(end) };
}

const AGENDA_MODO_VISUALIZACAO_OPTIONS = [
  { value: "mes", label: "Mês" },
  { value: "semana", label: "Semana" },
  { value: "dia", label: "Dia" },
] as const;

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Agenda() {
  const { theme: t, isDark, user, setActivePage } = useApp();
  const { userId: userIdEfetivo, role: roleEfetivo } = useIdentidadeEfetiva();
  const brand = useDashboardBrand();
  const { showFiltroInfluencer, showFiltroOperadora, podeVerInfluencer, podeVerOperadora, escoposVisiveis, operadoraSlugsForcado } = useDashboardFiltros();
  const perm = usePermission("agenda");

  const [view,    setView]    = useState<ViewMode>("mes");
  const [current, setCurrent] = useState(new Date());
  const [lives,   setLives]   = useState<Live[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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
    setLoadError(null);
    const { start, end } = agendaJanelaDatas(current, view);
    type LiveRowDb = Live & { profiles?: { name?: string | null } | null };
    try {
      const data = await fetchAllPages<LiveRowDb>(async (from, to) => {
        let q = supabase
          .from("lives")
          .select("*, profiles!lives_influencer_id_fkey(name)")
          .gte("data", start)
          .lte("data", end)
          .order("data", { ascending: true })
          .order("horario", { ascending: true })
          .range(from, to);
        if (operadoraSlugsForcado?.length) q = q.in("operadora_slug", operadoraSlugsForcado);
        // Influencer/agência: restringir no servidor (evita truncar ~1000 lives globais antigas)
        if (
          !escoposVisiveis.semRestricaoEscopo &&
          !escoposVisiveis.vêTodosInfluencers &&
          escoposVisiveis.influencersVisiveis.length > 0
        ) {
          q = q.in("influencer_id", escoposVisiveis.influencersVisiveis);
        }
        return await q;
      });
      const mapped = data.map((l) => ({ ...l, influencer_name: l.profiles?.name ?? undefined }));
      setLives(mapped.filter((l) => podeVerInfluencer(l.influencer_id)));
    } catch (err) {
      console.error("Agenda loadLives:", err);
      setLoadError(
        "Não foi possível carregar as lives. Se o problema persistir, entre em contato com o suporte.",
      );
    } finally {
      setLoading(false);
    }
  }, [podeVerInfluencer, operadoraSlugsForcado, current, view, escoposVisiveis]);

  useEffect(() => { void loadLives(); }, [loadLives]);

  useEffect(() => {
    if (showFiltroInfluencer || showFiltroOperadora) {
      Promise.all([
        showFiltroInfluencer ? supabase.from("profiles").select("id, name").in("role", [...ROLES_PARIDADE_INFLUENCER]).order("name") : Promise.resolve({ data: [] }),
        showFiltroOperadora  ? supabase.from("operadoras").select("slug, nome").eq("ativo", true).order("nome") : Promise.resolve({ data: [] }),
      ]).then(([profRes, opsRes]) => {
        if (showFiltroInfluencer && profRes.data) setInfluencerList(profRes.data);
        if (showFiltroOperadora)  setOperadorasList((opsRes.data ?? []) as { slug: string; nome: string }[]);
      });
    }
  }, [showFiltroInfluencer, showFiltroOperadora]);

  const operadoraEfetiva = operadoraSlugsForcado ?? (filterOperadora !== "todas" ? [filterOperadora] : null);
  function livesForDay(date: Date): Live[] {
    const iso = dateToISOLocal(date);
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
  const filtroHojeAtivo = view === "dia" && isSameCalendarDay(current, new Date());

  function aplicarFiltroHoje() {
    setCurrent(new Date());
    setView("dia");
  }

  function headerTitle() {
    if (view === "mes")    return `${MONTHS[current.getMonth()]} ${current.getFullYear()}`;
    if (view === "semana") {
      const w = getWeekDays(current);
      return `${w[0].getDate()} – ${w[6].getDate()} ${MONTHS[w[6].getMonth()]} ${w[6].getFullYear()}`;
    }
    return `${current.getDate()} ${MONTHS[current.getMonth()]} ${current.getFullYear()}`;
  }


  const contentBox = getPageContentBoxStyle(brand, t);

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

  async function tentarAbrirNovaLive() {
    if (!user) return;
    if (roleParidadeInfluencer(roleEfetivo ?? user?.role)) {
      setChecandoNovaLive(true);
      try {
        const gate = await verificarElegibilidadeAgendaLive(userIdEfetivo ?? user.id);
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
        icon={<PageMenuIcon pageKey="agenda" />}
        title={getPageMenuLabel("agenda")}
        subtitle={getPageCanonicalSubtitle("agenda")}
        brand={brand}
        t={t}
      />

      {loadError ? (
        <div
          role="alert"
          aria-live="polite"
          style={{
            marginBottom: 14,
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid rgba(232,64,37,0.35)",
            background: "rgba(232,64,37,0.08)",
            color: "#e84025",
            fontSize: 13,
            fontFamily: FONT.body,
          }}
        >
          {loadError}
        </div>
      ) : null}

      {/* ── BLOCO DE FILTROS (padrão Dashboards) ── */}
      <div style={getFilterBarWrapperStyle(brand, t)}>
          <div className="app-filter-bar-tabs-cta">
          <span className="app-filter-bar-tabs-cta__spacer" aria-hidden />
          <div className="app-filter-bar-tabs-cta__tabs" style={getFilterBarRowStyle()}>
            <button
              type="button"
              onClick={prev}
              style={getCarouselBtnNavStyle(t, false)}
              aria-label="Período anterior"
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <span style={getCarouselPeriodLabelStyle(t)}>{headerTitle()}</span>
            <button
              type="button"
              onClick={next}
              style={getCarouselBtnNavStyle(t, false)}
              aria-label="Próximo período"
            >
              <ChevronRight size={14} aria-hidden="true" />
            </button>

            <FiltroHojeButton active={filtroHojeAtivo} onClick={aplicarFiltroHoje} />

            <FiltroModoVisualizacaoSelect
              value={view}
              defaultValue="mes"
              options={AGENDA_MODO_VISUALIZACAO_OPTIONS}
              onChange={(v) => setView(v as ViewMode)}
            />

            {showFiltroInfluencer && influencerListVisiveis.length > 0 && (
              <FiltroInfluencerSelect
                mode="multiple"
                value={filterInfluencers}
                onChange={setFilterInfluencers}
                influencers={influencerListVisiveis}
              />
            )}

            {showFiltroOperadora && operadorasList.length > 0 && (
              <FiltroOperadoraSelect
                value={filterOperadora}
                onChange={setFilterOperadora}
                operadoras={operadorasList}
                podeVerOperadora={podeVerOperadora}
              />
            )}
          </div>
          <div className="app-filter-bar-tabs-cta__actions">
            <AjudaContextualAcoes pageKey="agenda" />
          </div>
          </div>

          {/* Status e Plataforma */}
          <div style={{ paddingTop: 12, marginTop: 12, borderTop: `1px solid ${t.cardBorder}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.1em" }}>Status</span>
              {Object.entries(STATUS_COLOR).map(([status, color]) => (
                <FiltroStatusSemanticoPill
                  key={status}
                  label={STATUS_LABEL[status]}
                  semanticColor={color}
                  active={filterStatus === status}
                  onClick={() => setFilterStatus((prev) => (prev === status ? null : status))}
                />
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.1em" }}>Plataforma</span>
              {Object.entries(PLAT_COLOR).map(([plat, color]) => (
                <FiltroPlataformaSemanticoPill
                  key={plat}
                  plataforma={plat}
                  semanticColor={color}
                  active={filterPlat === plat}
                  isDark={isDark ?? false}
                  onClick={() => setFilterPlat((prev) => (prev === plat ? null : plat))}
                />
              ))}
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

      {/* ── CALENDÁRIO ── */}
      <div style={contentBox}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <SectionTitle compact sub="Data e hora das lives dos influencers">
            Calendário
          </SectionTitle>
          {perm.canCriarOk && (
            <CtaCriarButton
              onClick={() => void tentarAbrirNovaLive()}
              loading={checandoNovaLive}
              loadingLabel="Verificando..."
            >
              Nova Live
            </CtaCriarButton>
          )}
        </div>
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
