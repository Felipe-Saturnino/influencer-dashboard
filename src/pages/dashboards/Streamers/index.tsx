import { useState, Suspense, lazy, type CSSProperties } from "react";
import { Calendar, Loader2, ChevronLeft, ChevronRight, Clock, Shield, User } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { SelectComIcone } from "../../../components/dashboard";
import { GiTv } from "react-icons/gi";
import { StreamersFiltrosProvider, useStreamersFiltros } from "./StreamersFiltrosContext";

const DashboardOverview = lazy(() => import("./DashboardOverview"));
const DashboardConversao = lazy(() => import("./DashboardConversao"));
const DashboardFinanceiro = lazy(() => import("./DashboardFinanceiro"));

type StreamersTab = "overview" | "conversao" | "financeiro";

const TAB_LABELS: Record<StreamersTab, string> = {
  overview: "Overview",
  conversao: "Conversão",
  financeiro: "Financeiro",
};

function StreamersFiltrosEUAbas({
  aba,
  setAba,
}: {
  aba: StreamersTab;
  setAba: (t: StreamersTab) => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const { showFiltroInfluencer, showFiltroOperadora, podeVerOperadora } = useDashboardFiltros();
  const sf = useStreamersFiltros();

  const btnNavStyle: CSSProperties = {
    minWidth: 44,
    minHeight: 44,
    width: 44,
    height: 44,
    borderRadius: "50%",
    border: `1px solid ${t.cardBorder}`,
    background: "transparent",
    color: t.text,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const tabIds: StreamersTab[] = ["overview", "conversao", "financeiro"];

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          borderRadius: 14,
          border: brand.primaryTransparentBorder,
          background: brand.primaryTransparentBg,
          padding: "12px 20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <button
              type="button"
              aria-label="Mês anterior"
              style={{
                ...btnNavStyle,
                opacity: sf.historico || sf.isPrimeiro ? 0.35 : 1,
                cursor: sf.historico || sf.isPrimeiro ? "not-allowed" : "pointer",
              }}
              onClick={sf.irMesAnterior}
              disabled={sf.historico || sf.isPrimeiro}
            >
              <ChevronLeft size={14} aria-hidden />
            </button>

            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: t.text,
                fontFamily: FONT.body,
                minWidth: "clamp(120px, 40vw, 180px)",
                textAlign: "center",
              }}
            >
              {sf.historico ? "Todo o período" : sf.mesSelecionado?.label}
            </span>

            <button
              type="button"
              aria-label="Próximo mês"
              style={{
                ...btnNavStyle,
                opacity: sf.historico || sf.isUltimo ? 0.35 : 1,
                cursor: sf.historico || sf.isUltimo ? "not-allowed" : "pointer",
              }}
              onClick={sf.irMesProximo}
              disabled={sf.historico || sf.isUltimo}
            >
              <ChevronRight size={14} aria-hidden />
            </button>
          </div>

          <button
            type="button"
            aria-label={
              sf.historico ? "Desativar modo histórico" : "Ativar modo histórico — ver todo o período"
            }
            aria-pressed={sf.historico}
            onClick={sf.toggleHistorico}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              minHeight: 44,
              borderRadius: 999,
              cursor: "pointer",
              fontFamily: FONT.body,
              fontSize: 13,
              border: sf.historico ? `1px solid ${brand.accent}` : `1px solid ${t.cardBorder}`,
              background: sf.historico
                ? brand.useBrand
                  ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)"
                  : "rgba(124,58,237,0.15)"
                : "transparent",
              color: sf.historico ? brand.accent : t.textMuted,
              fontWeight: sf.historico ? 700 : 400,
              transition: "all 0.15s",
            }}
          >
            <Calendar size={15} aria-hidden />
            Histórico
          </button>

          {showFiltroInfluencer && (
            <SelectComIcone
              icon={<User size={15} aria-hidden />}
              label="Filtrar por influencer"
              value={sf.filtroInfluencer}
              onChange={sf.setFiltroInfluencer}
            >
              <option value="todos">Todos os influencers</option>
              {sf.influencerOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </SelectComIcone>
          )}

          {showFiltroOperadora && (
            <SelectComIcone
              icon={<Shield size={15} aria-hidden />}
              label="Filtrar por operadora"
              value={sf.filtroOperadora}
              onChange={sf.setFiltroOperadora}
            >
              <option value="todas">Todas as operadoras</option>
              {sf.operadorasList
                .filter((o) => podeVerOperadora(o.slug))
                .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                .map((o) => (
                  <option key={o.slug} value={o.slug}>
                    {o.nome}
                  </option>
                ))}
            </SelectComIcone>
          )}
          {sf.isLoading && (
            <span
              style={{
                fontSize: 12,
                color: t.textMuted,
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
              }}
              aria-live="polite"
            >
              <Clock size={14} aria-hidden />
              Carregando…
            </span>
          )}
        </div>

        <div
          role="tablist"
          aria-label="Seções Streamers"
          style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}
        >
          {tabIds.map((key) => {
            const ativo = aba === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                id={`tab-streamers-${key}`}
                tabIndex={ativo ? 0 : -1}
                aria-selected={ativo}
                aria-controls={`panel-streamers-${key}`}
                onClick={() => setAba(key)}
                onKeyDown={(e) => {
                  const tabs: StreamersTab[] = ["overview", "conversao", "financeiro"];
                  const current = tabs.indexOf(key);
                  if (e.key === "ArrowRight") {
                    e.preventDefault();
                    const next = tabs[(current + 1) % tabs.length];
                    setAba(next);
                    requestAnimationFrame(() => {
                      document.getElementById(`tab-streamers-${next}`)?.focus();
                    });
                  }
                  if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    const next = tabs[(current - 1 + tabs.length) % tabs.length];
                    setAba(next);
                    requestAnimationFrame(() => {
                      document.getElementById(`tab-streamers-${next}`)?.focus();
                    });
                  }
                }}
                style={{
                  padding: "10px 18px",
                  minHeight: 44,
                  borderRadius: 10,
                  border: `1px solid ${ativo ? brand.accent : t.cardBorder}`,
                  background: ativo
                    ? brand.useBrand
                      ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)"
                      : "rgba(124,58,237,0.15)"
                    : (t.inputBg ?? t.cardBg),
                  color: ativo ? brand.accent : t.textMuted,
                  fontWeight: ativo ? 700 : 500,
                  fontSize: 13,
                  fontFamily: FONT.body,
                  cursor: "pointer",
                }}
              >
                {TAB_LABELS[key]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StreamersAutorizado() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [aba, setAba] = useState<StreamersTab>("overview");

  return (
    <StreamersFiltrosProvider>
      <div style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>
        <div className="app-page-shell" style={{ paddingBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: brand.primaryIconBg,
                  border: brand.primaryIconBorder,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: brand.primaryIconColor,
                }}
              >
                <GiTv size={14} aria-hidden="true" />
              </div>
              <div>
                <h1
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: brand.primary,
                    fontFamily: FONT_TITLE,
                    margin: 0,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  Streamers
                </h1>
                <p style={{ color: t.textMuted, fontFamily: FONT.body, fontSize: 13, margin: "5px 0 0" }}>
                  Performance do canal de influencers — financeiro, conversão e operação.
                </p>
              </div>
            </div>
          </div>

          <StreamersFiltrosEUAbas aba={aba} setAba={setAba} />
        </div>

        <div role="tabpanel" id={`panel-streamers-${aba}`} aria-labelledby={`tab-streamers-${aba}`}>
          <Suspense
            fallback={
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 48,
                  color: t.textMuted,
                  gap: 8,
                  fontFamily: FONT.body,
                  fontSize: 13,
                }}
              >
                <Loader2
                  size={20}
                  className="app-lucide-spin"
                  color="var(--brand-primary, #7c3aed)"
                  aria-hidden="true"
                />
                Carregando…
              </div>
            }
          >
            {aba === "overview" && <DashboardOverview />}
            {aba === "conversao" && <DashboardConversao />}
            {aba === "financeiro" && <DashboardFinanceiro />}
          </Suspense>
        </div>
      </div>
    </StreamersFiltrosProvider>
  );
}

export default function Streamers() {
  const { theme: t } = useApp();
  const perm = usePermission("streamers");

  if (perm.loading) {
    return (
      <div
        className="app-page-shell"
        style={{
          background: t.bg,
          minHeight: "100vh",
          fontFamily: FONT.body,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader2
          size={24}
          className="app-lucide-spin"
          color="var(--brand-primary, #7c3aed)"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div
        className="app-page-shell"
        style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body, background: t.bg }}
      >
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  return <StreamersAutorizado />;
}
