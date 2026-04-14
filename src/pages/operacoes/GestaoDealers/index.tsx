import { useState, useEffect, useCallback, useMemo, type CSSProperties, type ChangeEvent, type ReactNode } from "react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import type { Dealer, DealerGenero, DealerTurno, DealerJogo, Operadora } from "../../../types";
import { Eye, History, Pencil, Send, Upload, Trash2, ChevronLeft, ChevronRight, Search, CircleDot } from "lucide-react";
import { GiCardRandom, GiShield, GiFemale, GiMale, GiCardPick, GiCardAceSpades, GiCrown } from "react-icons/gi";
import OperadoraTag from "../../../components/OperadoraTag";
import { PageHeader } from "../../../components/PageHeader";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { ModalSolicitacao } from "../solicitacoes/ModalSolicitacao";
import { ModalThreadSolicitacao } from "../solicitacoes/ModalThreadSolicitacao";
import { BannerPendencias } from "../solicitacoes/BannerPendencias";
import { corStatusSolicitacao, type SolicitacaoStatus, type SolicitacaoTipo } from "../solicitacoes/solicitacoesUtils";

// ─── BRAND ────────────────────────────────────────────────────────────────────
const BRAND = {
  roxo:     "#4a2082",
  roxoVivo: "#7c3aed",
  azul:     "#1e36f8",
  vermelho: "#e84025",
  verde:    "#22c55e",
  amarelo:  "#f59e0b",
  cinza:    "#6b7280",
  ouroEscuro: "#7c5e10",
  ouroBorda: "#d4af37",
} as const;

// ─── Constantes ───────────────────────────────────────────────────────────────
const GENERO_OPTS: { value: DealerGenero; label: string }[] = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
];

const TURNO_OPTS: { value: DealerTurno; label: string }[] = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
];

const JOGOS_OPTS: { value: DealerJogo; label: string }[] = [
  { value: "blackjack", label: "Blackjack" },
  { value: "roleta", label: "Roleta" },
  { value: "baccarat", label: "Baccarat" },
  { value: "mesa_vip", label: "Mesa VIP" },
];

function passaFiltroOperadora(d: Dealer, filtroOperadora: string): boolean {
  if (filtroOperadora === "nenhuma") return !d.operadora_slug;
  if (filtroOperadora !== "todas" && d.operadora_slug !== filtroOperadora) return false;
  return true;
}

function normalizarBuscaTexto(s: string): string {
  return s.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

const ICONE_GENERO: Record<DealerGenero, ReactNode> = {
  feminino: <GiFemale size={13} aria-hidden />,
  masculino: <GiMale size={13} aria-hidden />,
};

const ICONE_JOGO: Record<DealerJogo, ReactNode> = {
  blackjack: <GiCardPick size={13} aria-hidden />,
  roleta: <CircleDot size={13} aria-hidden strokeWidth={2.2} />,
  baccarat: <GiCardAceSpades size={13} aria-hidden />,
  mesa_vip: <GiCrown size={13} aria-hidden />,
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function GestaoDealers() {
  const { theme: t, user, podeVerOperadora, escoposVisiveis, isDark } = useApp();
  const brand = useDashboardBrand();
  const { showFiltroOperadora, operadoraSlugsForcado } = useDashboardFiltros();
  const perm = usePermission("gestao_dealers");
  const permCentral = usePermission("central_notificacoes");
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalCriar, setModalCriar] = useState(false);
  const [modalVer, setModalVer] = useState<Dealer | null>(null);
  const [modalHistoricoDealer, setModalHistoricoDealer] = useState<Dealer | null>(null);
  const [modalEditar, setModalEditar] = useState<Dealer | null>(null);
  const [modalSolicitacao, setModalSolicitacao] = useState<Dealer | null>(null);
  const [solicitacaoThreadId, setSolicitacaoThreadId] = useState<string | null>(null);

  const [filtroGenero, setFiltroGenero] = useState<string>("todos");
  const [filtroTurno, setFiltroTurno] = useState<string>("todos");
  const [filtroOperadora, setFiltroOperadora] = useState<string>("todas");
  const [filtroJogos, setFiltroJogos] = useState<string>("todos");
  const [buscaDealer, setBuscaDealer] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    let qDealers = supabase.from("dealers").select("*").order("nickname");
    if (user?.role === "operador" && operadoraSlugsForcado?.length) {
      qDealers = qDealers.in("operadora_slug", operadoraSlugsForcado);
    }
    const [dealersRes, operadorasRes] = await Promise.all([
      qDealers,
      supabase.from("operadoras").select("slug, nome, cor_primaria").order("nome").eq("ativo", true),
    ]);
    setDealers((dealersRes.data ?? []) as Dealer[]);
    setOperadoras((operadorasRes.data ?? []) as Operadora[]);
    setLoading(false);
  }, [user?.role, operadoraSlugsForcado]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    if (user?.role === "operador" && operadoraSlugsForcado?.length) {
      setFiltroOperadora(operadoraSlugsForcado[0]);
    }
  }, [user?.role, operadoraSlugsForcado]);

  const opcoesFiltroOperadora = useMemo(
    () => operadoras.filter((o) => podeVerOperadora(o.slug)),
    [operadoras, podeVerOperadora]
  );

  const dealersPorOperadora = useMemo(
    () => dealers.filter((d) => passaFiltroOperadora(d, filtroOperadora)),
    [dealers, filtroOperadora]
  );

  const filtered = useMemo(() => {
    const q = normalizarBuscaTexto(buscaDealer);
    return dealersPorOperadora.filter((d) => {
      if (filtroGenero !== "todos" && d.genero !== filtroGenero) return false;
      if (filtroTurno !== "todos" && d.turno !== filtroTurno) return false;
      if (filtroJogos !== "todos" && !(d.jogos ?? []).includes(filtroJogos as DealerJogo)) return false;
      if (q) {
        const nick = normalizarBuscaTexto(d.nickname ?? "");
        const nome = normalizarBuscaTexto(d.nome_real ?? "");
        if (!nick.includes(q) && !nome.includes(q)) return false;
      }
      return true;
    });
  }, [dealersPorOperadora, filtroGenero, filtroTurno, filtroJogos, buscaDealer]);

  /** Total do consolidado: operadora + turno + gênero + jogo (sem busca por texto). */
  const totalDealersDestaque = useMemo(
    () =>
      dealersPorOperadora.filter((d) => {
        if (filtroTurno !== "todos" && d.turno !== filtroTurno) return false;
        if (filtroGenero !== "todos" && d.genero !== filtroGenero) return false;
        if (filtroJogos !== "todos" && !(d.jogos ?? []).includes(filtroJogos as DealerJogo)) return false;
        return true;
      }).length,
    [dealersPorOperadora, filtroTurno, filtroGenero, filtroJogos]
  );

  /** Contagens por gênero com turno + jogo + operadora aplicados (sem o filtro de gênero). */
  const porGenero = useMemo(() => {
    const acc: Record<string, number> = { feminino: 0, masculino: 0 };
    dealersPorOperadora.forEach((d) => {
      if (filtroTurno !== "todos" && d.turno !== filtroTurno) return;
      if (filtroJogos !== "todos" && !(d.jogos ?? []).includes(filtroJogos as DealerJogo)) return;
      acc[d.genero] = (acc[d.genero] ?? 0) + 1;
    });
    return acc;
  }, [dealersPorOperadora, filtroTurno, filtroJogos]);

  /** Contagens por jogo com turno + gênero + operadora (sem o filtro de jogo). */
  const porJogo = useMemo(() => {
    const acc: Record<string, number> = { blackjack: 0, roleta: 0, baccarat: 0, mesa_vip: 0 };
    dealersPorOperadora.forEach((d) => {
      if (filtroTurno !== "todos" && d.turno !== filtroTurno) return;
      if (filtroGenero !== "todos" && d.genero !== filtroGenero) return;
      (d.jogos ?? []).forEach((j) => {
        if (j in acc) acc[j] = (acc[j] ?? 0) + 1;
      });
    });
    return acc;
  }, [dealersPorOperadora, filtroTurno, filtroGenero]);

  const irTurnoAnterior = () => {
    if (filtroTurno === "todos") {
      setFiltroTurno(TURNO_OPTS[2].value);
      return;
    }
    const i = TURNO_OPTS.findIndex((o) => o.value === filtroTurno);
    const prev = i <= 0 ? 2 : i - 1;
    setFiltroTurno(TURNO_OPTS[prev].value);
  };

  const irTurnoProximo = () => {
    if (filtroTurno === "todos") {
      setFiltroTurno(TURNO_OPTS[0].value);
      return;
    }
    const i = TURNO_OPTS.findIndex((o) => o.value === filtroTurno);
    const next = i < 0 || i >= 2 ? 0 : i + 1;
    setFiltroTurno(TURNO_OPTS[next].value);
  };

  const labelTurnoCarrossel =
    filtroTurno === "todos"
      ? "Todos os turnos"
      : (TURNO_OPTS.find((o) => o.value === filtroTurno)?.label ?? filtroTurno);

  const podeCriarDealer =
    perm.canCriarOk &&
    (perm.canCriar !== "proprios" ||
      escoposVisiveis.semRestricaoEscopo === true ||
      (escoposVisiveis.operadorasVisiveis?.length ?? 0) > 0);

  const podeEditarDealer = (d: Dealer) => {
    if (!perm.canEditarOk) return false;
    if (perm.canEditar !== "proprios") return true;
    const slug = d.operadora_slug;
    if (!slug) return false;
    return podeVerOperadora(slug);
  };

  const operadoraTravadaModal =
    user?.role === "operador" && operadoraSlugsForcado?.length === 1 ? operadoraSlugsForcado[0] : undefined;

  const operadorasModal = useMemo(() => {
    if (user?.role === "operador" && operadoraSlugsForcado?.length)
      return operadoras.filter((o) => operadoraSlugsForcado.includes(o.slug));
    return operadoras.filter((o) => podeVerOperadora(o.slug));
  }, [user?.role, operadoraSlugsForcado, operadoras, podeVerOperadora]);

  /** Slug da operadora para solicitações (operador com escopo). */
  const operadoraSlugAtiva = useMemo(() => {
    if (user?.role !== "operador" || !operadoraSlugsForcado?.length) return null;
    if (operadoraSlugsForcado.length === 1) return operadoraSlugsForcado[0];
    if (filtroOperadora !== "todas" && filtroOperadora !== "nenhuma") return filtroOperadora;
    return operadoraSlugsForcado[0] ?? null;
  }, [user?.role, operadoraSlugsForcado, filtroOperadora]);

  const selectOperadoraStyle: CSSProperties = {
    padding: "6px 14px 6px 30px",
    borderRadius: 999,
    border: `1px solid ${filtroOperadora !== "todas" && filtroOperadora !== "nenhuma" ? brand.accent : t.cardBorder}`,
    background:
      filtroOperadora !== "todas" && filtroOperadora !== "nenhuma"
        ? (brand.useBrand ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)" : `${BRAND.roxo}18`)
        : (t.inputBg ?? t.cardBg),
    color: filtroOperadora !== "todas" && filtroOperadora !== "nenhuma" ? brand.accent : t.text,
    fontSize: 13,
    fontWeight: filtroOperadora !== "todas" && filtroOperadora !== "nenhuma" ? 700 : 400,
    fontFamily: FONT.body,
    cursor: "pointer",
    appearance: "none" as const,
    outline: "none",
  };

  const btnNavTurnoStyle: CSSProperties = {
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
  };

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar a Gestão de Dealers.
      </div>
    );
  }

  return (
    <div className="app-page-shell">

      <PageHeader
        icon={<GiCardRandom size={14} aria-hidden />}
        title="Gestão de Dealers"
        subtitle="Gerencie o elenco de dealers de casino."
        actions={
          podeCriarDealer ? (
            <button
              type="button"
              onClick={() => setModalCriar(true)}
              style={{
                background: brand.useBrand ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" : `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`,
                color: "#fff", border: "none", borderRadius: 10,
                padding: "10px 18px", cursor: "pointer",
                fontFamily: FONT.body, fontSize: 13, fontWeight: 700,
              }}
            >
              + Adicionar Dealer
            </button>
          ) : undefined
        }
      />

      {user?.role === "operador" && operadoraSlugsForcado?.length ? (
        <BannerPendencias operadoraSlugs={operadoraSlugsForcado} operadoras={operadoras} podeInteragir={permCentral.canEditarOk} />
      ) : null}

      {/* ─── Bloco filtros: carrossel turnos (Overview) + operadora ───────────── */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ borderRadius: 14, border: brand.primaryTransparentBorder, background: brand.primaryTransparentBg, padding: "10px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            <button type="button" aria-label="Turno anterior" onClick={irTurnoAnterior} style={btnNavTurnoStyle}>
              <ChevronLeft size={14} />
            </button>
            <span
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: t.text,
                fontFamily: FONT.body,
                minWidth: 160,
                textAlign: "center",
              }}
            >
              {labelTurnoCarrossel}
            </span>
            <button type="button" aria-label="Próximo turno" onClick={irTurnoProximo} style={btnNavTurnoStyle}>
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => setFiltroTurno("todos")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 999,
                cursor: "pointer",
                fontFamily: FONT.body,
                fontSize: 12,
                border:
                  filtroTurno === "todos"
                    ? `1px solid ${brand.accent}`
                    : `1px solid ${t.cardBorder}`,
                background:
                  filtroTurno === "todos"
                    ? (brand.useBrand ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)" : "rgba(124,58,237,0.15)")
                    : "transparent",
                color: filtroTurno === "todos" ? brand.accent : t.textMuted,
                fontWeight: filtroTurno === "todos" ? 700 : 400,
                transition: "all 0.15s",
              }}
            >
              Todos os turnos
            </button>
            {showFiltroOperadora && (
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: 10, display: "flex", alignItems: "center", pointerEvents: "none", color: t.textMuted }}>
                  <GiShield size={13} />
                </span>
                <select value={filtroOperadora} onChange={(e) => setFiltroOperadora(e.target.value)} style={selectOperadoraStyle}>
                  <option value="todas">Todas as operadoras</option>
                  <option value="nenhuma">Nenhuma operadora</option>
                  {[...opcoesFiltroOperadora].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((op) => (
                    <option key={op.slug} value={op.slug}>{op.nome}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Bloco consolidado: metade Dealers + metade filtros / busca ───────── */}
      {!loading && (
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "stretch",
          gap: "20px 28px",
          background: brand.blockBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 16,
          padding: "14px 18px",
          marginBottom: 24,
          boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
        }}>
          <div style={{
            flex: "1 1 220px",
            maxWidth: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            minHeight: 118,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: t.textMuted, fontFamily: FONT.body, marginBottom: 12 }}>
              Dealers
            </div>
            <div style={{ fontSize: 56, fontWeight: 900, color: brand.accent, fontFamily: FONT_TITLE, lineHeight: 1 }}>
              {totalDealersDestaque}
            </div>
          </div>
          <div style={{ flex: "2 1 320px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{
                flexShrink: 0,
                minWidth: 72,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: t.textMuted,
                fontFamily: FONT.body,
              }}>
                Gêneros
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", flex: 1, minWidth: 0 }}>
                {GENERO_OPTS.map((o) => {
                  const ativo = filtroGenero === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => setFiltroGenero(ativo ? "todos" : o.value)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 12px",
                        borderRadius: 999,
                        cursor: "pointer",
                        fontFamily: FONT.body,
                        fontSize: 12,
                        border: ativo ? `1px solid ${BRAND.verde}` : `1px solid ${BRAND.verde}55`,
                        background: ativo ? "rgba(34,197,94,0.15)" : "transparent",
                        color: ativo ? BRAND.verde : t.textMuted,
                        fontWeight: ativo ? 700 : 400,
                        transition: "all 0.15s",
                      }}
                    >
                      {ICONE_GENERO[o.value]}
                      <span>{o.label} · {porGenero[o.value] ?? 0}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{
                flexShrink: 0,
                minWidth: 72,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: t.textMuted,
                fontFamily: FONT.body,
              }}>
                Jogos
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", flex: 1, minWidth: 0 }}>
                {JOGOS_OPTS.map((o) => {
                  const ativo = filtroJogos === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => setFiltroJogos(ativo ? "todos" : o.value)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 12px",
                        borderRadius: 999,
                        cursor: "pointer",
                        fontFamily: FONT.body,
                        fontSize: 12,
                        border: ativo ? `1px solid ${BRAND.amarelo}` : `1px solid ${BRAND.amarelo}55`,
                        background: ativo ? "rgba(245,158,11,0.15)" : `${BRAND.amarelo}11`,
                        color: ativo ? BRAND.amarelo : t.textMuted,
                        fontWeight: ativo ? 700 : 500,
                        transition: "all 0.15s",
                      }}
                    >
                      {ICONE_JOGO[o.value]}
                      <span>{o.label} · {porJogo[o.value] ?? 0}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ position: "relative", width: "100%" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", pointerEvents: "none", color: t.textMuted }}>
                <Search size={14} strokeWidth={2} />
              </span>
              <input
                type="search"
                value={buscaDealer}
                onChange={(e) => setBuscaDealer(e.target.value)}
                placeholder="Buscar por nome ou nickname..."
                aria-label="Buscar dealers por nome ou nickname"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "7px 12px 7px 36px",
                  borderRadius: 999,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg ?? t.cardBg,
                  color: t.text,
                  fontSize: 12,
                  fontFamily: FONT.body,
                  outline: "none",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Bloco 3: Elenco completo ────────────────────────────────────────── */}
      <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginBottom: 14 }}>
        <span style={{ color: brand.accent, fontWeight: 700 }}>{filtered.length}</span> {filtered.length === 1 ? "dealer" : "dealers"}
      </div>
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 20 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, overflow: "hidden" }}>
              <div style={{ aspectRatio: "16/10", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }} />
              <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ height: 18, width: "60%", borderRadius: 6, background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }} />
                <div style={{ height: 12, width: "40%", borderRadius: 6, background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: 48, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>Nenhum dealer encontrado.</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
            gap: 20,
            alignItems: "stretch",
          }}
        >
          {filtered.map((d) => (
            <DealerCard
              key={d.id}
              dealer={d}
              operadoras={operadoras}
              brand={brand}
              onVer={() => setModalVer(d)}
              onEditar={() => setModalEditar(d)}
              onSolicitar={operadoraSlugAtiva && permCentral.canEditarOk ? () => setModalSolicitacao(d) : undefined}
              onHistoricoSolicitacoes={
                !permCentral.loading &&
                (permCentral.canView === "sim" || permCentral.canView === "proprios") &&
                (user?.role !== "operador" || !!operadoraSlugAtiva)
                  ? () => setModalHistoricoDealer(d)
                  : undefined
              }
              podeEditar={podeEditarDealer(d)}
            />
          ))}
        </div>
      )}

      {/* Modais */}
      {modalCriar && (
        <ModalDealer
          operadoras={operadorasModal}
          operadoraTravada={operadoraTravadaModal}
          editando={null}
          onClose={() => setModalCriar(false)}
          onSalvo={() => { setModalCriar(false); carregar(); }}
        />
      )}
      {modalEditar && (
        <ModalDealer
          operadoras={operadorasModal}
          operadoraTravada={operadoraTravadaModal}
          editando={modalEditar}
          onClose={() => setModalEditar(null)}
          onSalvo={() => { setModalEditar(null); carregar(); }}
        />
      )}
      {modalVer && (
        <ModalVer dealer={modalVer} operadoras={operadoras} onClose={() => setModalVer(null)} />
      )}
      {modalHistoricoDealer && (
        <ModalHistoricoSolicitacoesDealer
          dealer={modalHistoricoDealer}
          operadoras={operadoras}
          slugSolicitacaoFiltro={user?.role === "operador" ? operadoraSlugAtiva : null}
          onClose={() => setModalHistoricoDealer(null)}
          onAbrirThread={(id) => {
            setModalHistoricoDealer(null);
            setSolicitacaoThreadId(id);
          }}
        />
      )}
      {modalSolicitacao && operadoraSlugAtiva ? (
        <ModalSolicitacao
          dealer={modalSolicitacao}
          operadoraSlug={operadoraSlugAtiva}
          onClose={() => setModalSolicitacao(null)}
          onEnviado={() => {
            void carregar();
          }}
        />
      ) : null}
      {solicitacaoThreadId ? (
        <ModalThreadSolicitacao
          solicitacaoId={solicitacaoThreadId}
          operadoras={operadoras}
          podeInteragir={permCentral.canEditarOk}
          onClose={() => setSolicitacaoThreadId(null)}
          onResolvido={() => {
            void carregar();
          }}
        />
      ) : null}
    </div>
  );
}

/** Carrossel de fotos (cards e modal ver): setas só quando há mais de uma URL. */
function DealerFotoCarrossel({
  urls,
  alt,
  resetKey,
}: {
  urls: string[];
  alt: string;
  resetKey: string;
}) {
  const n = urls.length;
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [resetKey, urls.join("|")]);

  if (n === 0) return null;

  const cur = ((idx % n) + n) % n;

  const navBtn: CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 4,
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "none",
    background: "rgba(0,0,0,0.45)",
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  };

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <img src={urls[cur]} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      {n > 1 ? (
        <>
          <button
            type="button"
            aria-label="Foto anterior"
            onClick={(e) => {
              e.stopPropagation();
              setIdx((i) => (i - 1 + n) % n);
            }}
            style={{ ...navBtn, left: 6 }}
          >
            <ChevronLeft size={18} strokeWidth={2.2} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Próxima foto"
            onClick={(e) => {
              e.stopPropagation();
              setIdx((i) => (i + 1) % n);
            }}
            style={{ ...navBtn, right: 6 }}
          >
            <ChevronRight size={18} strokeWidth={2.2} aria-hidden />
          </button>
          <div
            style={{
              position: "absolute",
              bottom: 10,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 3,
              background: "rgba(0,0,0,0.55)",
              color: "#fff",
              padding: "2px 10px",
              borderRadius: 20,
              fontSize: 10,
              fontWeight: 700,
              fontFamily: FONT.body,
              pointerEvents: "none",
            }}
            aria-live="polite"
          >
            {cur + 1} / {n}
          </div>
        </>
      ) : null}
    </div>
  );
}

// ─── DealerCard ────────────────────────────────────────────────────────────────
function DealerCard({
  dealer,
  operadoras,
  brand,
  onVer,
  onEditar,
  onSolicitar,
  onHistoricoSolicitacoes,
  podeEditar,
}: {
  dealer: Dealer;
  operadoras: Operadora[];
  brand: ReturnType<typeof useDashboardBrand>;
  onVer: () => void;
  onEditar: () => void;
  /** Só operador com escopo de operadora definido. */
  onSolicitar?: () => void;
  /** Lista de solicitações do dealer (Central); ver permissão na página pai. */
  onHistoricoSolicitacoes?: () => void;
  podeEditar: boolean;
}) {
  const { theme: t, isDark } = useApp();
  const fotosUrls = (dealer.fotos ?? []).filter((u): u is string => typeof u === "string" && u.length > 0);
  const op = operadoras.find((o) => o.slug === dealer.operadora_slug);

  return (
    <article
      aria-label={`Dealer: ${dealer.nickname}`}
      style={{
      background: brand.blockBg,
      border: `1px solid ${t.cardBorder}`,
      borderRadius: 18,
      overflow: "hidden",
      boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      minHeight: 0,
    }}
    >
      {/* Área da foto */}
      <div style={{
        aspectRatio: "16/10",
        background: "linear-gradient(135deg, #1a1a2e 0%, #2d1b4e 100%)",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}>
        {fotosUrls.length > 0 ? (
          <DealerFotoCarrossel urls={fotosUrls} alt={dealer.nickname} resetKey={dealer.id} />
        ) : (
          <div style={{ fontSize: 48, color: "rgba(255,255,255,0.2)", fontWeight: 800, fontFamily: FONT.body }}>
            {(dealer.nickname || "?")[0]?.toUpperCase()}
          </div>
        )}
        {/* Badges sobre a foto */}
        <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {dealer.status === "aprovado" && (
            <span style={{ background: BRAND.verde, color: "#fff", padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, fontFamily: FONT.body }}>APROVADO</span>
          )}
          {dealer.status === "pendente" && (
            <span style={{ background: "#f59e0b", color: "#1a1a2e", padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, fontFamily: FONT.body }}>PENDENTE</span>
          )}
          {dealer.vip && (
            <span style={{ background: BRAND.amarelo, color: "#1a1a2e", padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, fontFamily: FONT.body }}>★ VIP</span>
          )}
        </div>
        <div style={{ position: "absolute", bottom: 10, left: 10 }}>
          <span style={{ background: "rgba(0,0,0,0.6)", color: "#fff", padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, fontFamily: FONT.body, textTransform: "uppercase" }}>
            {TURNO_OPTS.find((o) => o.value === dealer.turno)?.label ?? dealer.turno}
          </span>
        </div>
      </div>
      {/* Corpo do card: flex para empurrar género + ações para o fundo (alinhamento na grelha) */}
      <div
        style={{
          padding: "16px 18px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {dealer.nickname}
        </h3>
        <p style={{ margin: "4px 0 10px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
          {dealer.nome_real}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12, alignItems: "center", alignContent: "flex-start" }}>
          {(dealer.jogos ?? []).map((j) => {
            const isMesaVip = j === "mesa_vip";
            return (
              <span
                key={j}
                style={
                  isMesaVip
                    ? {
                        background: isDark
                          ? "linear-gradient(135deg, rgba(251,191,36,0.22), rgba(180,83,9,0.18))"
                          : "linear-gradient(135deg, rgba(253,230,138,0.55), rgba(251,191,36,0.28))",
                        border: `1px solid ${isDark ? "#eab308" : BRAND.ouroBorda}`,
                        boxShadow: isDark ? "0 0 0 1px rgba(251,191,36,0.12) inset" : "0 1px 2px rgba(180,83,9,0.12)",
                        color: isDark ? "#fde68a" : BRAND.ouroEscuro,
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: FONT.body,
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                        flexShrink: 0,
                      }
                    : {
                        background: `${BRAND.vermelho}22`,
                        border: `1px solid ${BRAND.vermelho}66`,
                        color: BRAND.vermelho,
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: FONT.body,
                        textTransform: "uppercase",
                        flexShrink: 0,
                      }
                }
              >
                {JOGOS_OPTS.find((o) => o.value === j)?.label ?? j}
              </span>
            );
          })}
        </div>
        {dealer.perfil_influencer ? (
          <p
            style={{
              fontSize: 12,
              color: t.textMuted,
              fontFamily: FONT.body,
              lineHeight: 1.4,
              margin: "0 0 12px",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
            }}
          >
            {dealer.perfil_influencer}
          </p>
        ) : null}
        {/* Ocupa o espaço vertical restante para alinhar género e botões entre cards da mesma linha */}
        <div style={{ flex: 1, minHeight: 0 }} aria-hidden />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          <span style={{ background: `${BRAND.roxoVivo}22`, color: BRAND.roxoVivo, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: FONT.body }}>
            {GENERO_OPTS.find((o) => o.value === dealer.genero)?.label ?? dealer.genero}
          </span>
          {op && (
            <OperadoraTag label={op.nome} corPrimaria={op.cor_primaria} />
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={onVer} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.text, fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}>
            <Eye size={13} /> Ver
          </button>
          {podeEditar && (
            <button onClick={onEditar} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`, color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}>
              <Pencil size={13} /> Editar
            </button>
          )}
          {onSolicitar ? (
            <button
              type="button"
              onClick={onSolicitar}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.text, fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}
            >
              <Send size={13} aria-hidden /> Solicitar
            </button>
          ) : null}
          {onHistoricoSolicitacoes ? (
            <button
              type="button"
              onClick={onHistoricoSolicitacoes}
              aria-label={`Histórico de solicitações de ${dealer.nickname}`}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.text, fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}
            >
              <History size={13} aria-hidden /> Histórico
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

// ─── Modal Histórico de solicitações (por dealer) ─────────────────────────────
interface SolicResumo {
  id: string;
  tipo: SolicitacaoTipo;
  status: SolicitacaoStatus;
  titulo: string | null;
  created_at: string;
  aguarda_resposta_de: string | null;
  operadora_slug: string;
}

function ModalHistoricoSolicitacoesDealer({
  dealer,
  operadoras,
  slugSolicitacaoFiltro,
  onClose,
  onAbrirThread,
}: {
  dealer: Dealer;
  operadoras: Operadora[];
  /** Operador: restringe à operadora; gestor/admin: null = todas as solicitações do dealer. */
  slugSolicitacaoFiltro: string | null;
  onClose: () => void;
  onAbrirThread: (solicitacaoId: string) => void;
}) {
  const { theme: t } = useApp();
  const [solicitacoes, setSolicitacoes] = useState<SolicResumo[]>([]);
  const [solLoading, setSolLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    setSolLoading(true);
    void (async () => {
      let q = supabase
        .from("dealer_solicitacoes")
        .select("id, tipo, status, titulo, created_at, aguarda_resposta_de, operadora_slug")
        .eq("dealer_id", dealer.id)
        .order("created_at", { ascending: false })
        .limit(150);
      if (slugSolicitacaoFiltro) q = q.eq("operadora_slug", slugSolicitacaoFiltro);
      const { data } = await q;
      if (!cancel) {
        setSolicitacoes((data ?? []) as SolicResumo[]);
        setSolLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [dealer.id, slugSolicitacaoFiltro]);

  return (
    <ModalBase onClose={onClose} maxWidth={520} zIndex={1050}>
      <ModalHeader title={`Solicitações · ${dealer.nickname}`} onClose={onClose} />
      <p style={{ margin: "0 0 14px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
        Todas as solicitações ligadas a este dealer{slugSolicitacaoFiltro ? " na sua operadora" : ""}.
      </p>
      {solLoading ? (
        <span style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Carregando...</span>
      ) : solicitacoes.length === 0 ? (
        <span style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Nenhuma solicitação registrada.</span>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxHeight: "min(60vh, 420px)",
            overflowY: "auto",
          }}
        >
          {solicitacoes.map((s) => {
            const cor = corStatusSolicitacao(s.status);
            const opRow = operadoras.find((o) => o.slug === s.operadora_slug);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onAbrirThread(s.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `1px solid ${t.cardBorder}`,
                    background: t.inputBg ?? t.cardBg,
                    cursor: "pointer",
                    fontFamily: FONT.body,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{s.titulo ?? s.id}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 20,
                        background: `${cor}22`,
                        color: cor,
                        border: `1px solid ${cor}44`,
                      }}
                    >
                      {s.status}
                    </span>
                    <span style={{ fontSize: 11, color: t.textMuted }}>
                      {new Date(s.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                    {!slugSolicitacaoFiltro ? (
                      <span style={{ fontSize: 11, color: t.textMuted }}>
                        <OperadoraTag label={opRow?.nome ?? s.operadora_slug} corPrimaria={opRow?.cor_primaria} />
                      </span>
                    ) : null}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div style={{ marginTop: 18 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            padding: "10px 18px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: "transparent",
            color: t.text,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Fechar
        </button>
      </div>
    </ModalBase>
  );
}

// ─── Modal Ver ────────────────────────────────────────────────────────────────
function ModalVer({
  dealer,
  operadoras,
  onClose,
}: {
  dealer: Dealer;
  operadoras: Operadora[];
  onClose: () => void;
}) {
  const { theme: t } = useApp();
  const op = operadoras.find((o) => o.slug === dealer.operadora_slug);
  const fotosUrls = (dealer.fotos ?? []).filter((u): u is string => typeof u === "string" && u.length > 0);

  return (
    <ModalBase onClose={onClose} maxWidth={480}>
      <ModalHeader title={dealer.nickname} onClose={onClose} />
      {fotosUrls.length > 0 ? (
        <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", marginBottom: 20, aspectRatio: "16/10" }}>
          <DealerFotoCarrossel urls={fotosUrls} alt={dealer.nickname} resetKey={dealer.id} />
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT.body }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>Nome Real</span>
          <br />
          <span style={{ fontSize: 14, color: t.text }}>{dealer.nome_real}</span>
        </div>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>Gênero</span>
          <br />
          <span style={{ fontSize: 14, color: t.text }}>{GENERO_OPTS.find((o) => o.value === dealer.genero)?.label}</span>
        </div>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>Turno</span>
          <br />
          <span style={{ fontSize: 14, color: t.text }}>{TURNO_OPTS.find((o) => o.value === dealer.turno)?.label}</span>
        </div>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>Jogos</span>
          <br />
          <span style={{ fontSize: 14, color: t.text }}>{(dealer.jogos ?? []).map((j) => JOGOS_OPTS.find((o) => o.value === j)?.label).join(", ") || "—"}</span>
        </div>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>Operadora</span>
          <br />
          {op ? <OperadoraTag label={op.nome} corPrimaria={op.cor_primaria} /> : <span style={{ fontSize: 14, color: t.text }}>Nenhuma</span>}
        </div>
        {dealer.perfil_influencer && (
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>Bio do Dealer</span>
            <br />
            <span style={{ fontSize: 14, color: t.text, whiteSpace: "pre-wrap" }}>{dealer.perfil_influencer}</span>
          </div>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            padding: "10px 18px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: "transparent",
            color: t.text,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Fechar
        </button>
      </div>
    </ModalBase>
  );
}

// ─── Modal Criar/Editar Dealer ─────────────────────────────────────────────────
function ModalDealer({
  operadoras,
  operadoraTravada,
  editando,
  onClose,
  onSalvo,
}: {
  operadoras: Operadora[];
  /** Operador com uma única operadora no escopo: select travado neste slug */
  operadoraTravada?: string;
  editando: Dealer | null;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const { theme: t } = useApp();
  const [nomeReal, setNomeReal] = useState(editando?.nome_real ?? "");
  const [nickname, setNickname] = useState(editando?.nickname ?? "");
  const [fotos, setFotos] = useState<string[]>(editando?.fotos ?? []);
  const [genero, setGenero] = useState<DealerGenero>(editando?.genero ?? "feminino");
  const [turno, setTurno] = useState<DealerTurno>(editando?.turno ?? "noite");
  const [jogos, setJogos] = useState<DealerJogo[]>(editando?.jogos ?? []);
  const [operadoraSlug, setOperadoraSlug] = useState<string>(
    editando?.operadora_slug ?? operadoraTravada ?? ""
  );
  const [perfilInfluencer, setPerfilInfluencer] = useState(editando?.perfil_influencer ?? "");
  const [status, setStatus] = useState<"aprovado" | "pendente">(editando?.status ?? "aprovado");
  const [vip, setVip] = useState(editando?.vip ?? false);
  const [uploading, setUploading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (operadoraTravada) setOperadoraSlug(operadoraTravada);
  }, [operadoraTravada]);

  const toggleJogo = (j: DealerJogo) => {
    setJogos((prev) => (prev.includes(j) ? prev.filter((x) => x !== j) : [...prev, j]));
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    setErro("");
    try {
      const novas: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${editando?.id ?? crypto.randomUUID()}-${crypto.randomUUID()}.${ext}`;
        const { data, error } = await supabase.storage.from("dealer-photos").upload(path, file, { upsert: true });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("dealer-photos").getPublicUrl(data.path);
        novas.push(urlData.publicUrl);
      }
      setFotos((prev) => [...prev, ...novas]);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar foto. Verifique se o bucket dealer-photos existe no Storage.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removerFoto = (idx: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const salvar = async () => {
    setErro("");
    if (!nomeReal.trim()) { setErro("Nome real é obrigatório."); return; }
    if (!nickname.trim()) { setErro("Nickname é obrigatório."); return; }
    if (jogos.length === 0) { setErro("Selecione pelo menos um jogo."); return; }

    setSalvando(true);
    try {
      const payload = {
        nome_real: nomeReal.trim(),
        nickname: nickname.trim(),
        fotos,
        genero,
        turno,
        jogos,
        operadora_slug: (operadoraTravada ?? operadoraSlug) || null,
        perfil_influencer: perfilInfluencer.trim() || null,
        status,
        vip,
      };
      if (editando) {
        const { error } = await supabase.from("dealers").update(payload).eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dealers").insert(payload);
        if (error) throw error;
      }
      onSalvo();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const inputStyle: CSSProperties = {
    width: "100%", background: t.inputBg ?? t.cardBg, border: `1px solid ${t.cardBorder}`,
    borderRadius: 10, padding: "10px 14px", color: t.text, fontFamily: FONT.body, fontSize: 14, boxSizing: "border-box", outline: "none",
  };
  const labelStyle: CSSProperties = { display: "block", fontFamily: FONT.body, fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "1px" };
  const fieldStyle: CSSProperties = { marginBottom: 18 };

  return (
    <ModalBase onClose={() => { if (!salvando) onClose(); }} maxWidth={520}>
      <ModalHeader title={editando ? "Editar Dealer" : "Novo Dealer"} onClose={() => { if (!salvando) onClose(); }} />

        <div style={fieldStyle}>
          <label style={labelStyle}>Nome Real</label>
          <input style={inputStyle} value={nomeReal} onChange={(e) => setNomeReal(e.target.value)} placeholder="Ex: Maria Silva" />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Nickname</label>
          <input style={inputStyle} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Ex: YARA" />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Fotos</label>
          <p style={{ margin: "0 0 10px", fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>
            Você pode enviar várias imagens de uma vez; nos cards da listagem, use as setas para navegar entre elas.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            {fotos.map((url, idx) => (
              <div key={idx} style={{ position: "relative", width: 80, height: 80, borderRadius: 10, overflow: "hidden", border: `1px solid ${t.cardBorder}` }}>
                <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button onClick={() => removerFoto(idx)} style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: "50%", background: BRAND.vermelho, border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, border: `1px dashed ${t.cardBorder}`, cursor: "pointer", fontFamily: FONT.body, fontSize: 13, color: t.textMuted }}>
            <Upload size={16} />
            {uploading ? "Enviando..." : "Adicionar fotos"}
            <input type="file" accept="image/*" multiple hidden onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>

        <div className="app-grid-2-tight" style={{ ...fieldStyle, gap: 12 }}>
          <div>
            <label style={labelStyle}>Gênero</label>
            <select value={genero} onChange={(e) => setGenero(e.target.value as DealerGenero)} style={inputStyle}>
              {[...GENERO_OPTS].sort((a, b) => a.label.localeCompare(b.label, "pt-BR")).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Turno</label>
            <select value={turno} onChange={(e) => setTurno(e.target.value as DealerTurno)} style={inputStyle}>
              {[...TURNO_OPTS].sort((a, b) => a.label.localeCompare(b.label, "pt-BR")).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Jogos</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {JOGOS_OPTS.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={jogos.includes(o.value)}
                onClick={() => toggleJogo(o.value)}
                style={{
                  padding: "8px 14px", borderRadius: 20, border: `1px solid ${jogos.includes(o.value) ? BRAND.roxoVivo : t.cardBorder}`,
                  background: jogos.includes(o.value) ? `${BRAND.roxoVivo}22` : "transparent",
                  color: jogos.includes(o.value) ? BRAND.roxoVivo : t.textMuted,
                  fontSize: 12, fontWeight: 600, fontFamily: FONT.body, cursor: "pointer",
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Operadora</label>
          {operadoraTravada ? (
            <div style={{ ...inputStyle, display: "flex", alignItems: "center", opacity: 0.95 }}>
              {operadoras.find((o) => o.slug === operadoraTravada)?.nome ?? operadoraTravada}
            </div>
          ) : (
            <select value={operadoraSlug} onChange={(e) => setOperadoraSlug(e.target.value)} style={inputStyle}>
              <option value="">Nenhuma</option>
              {[...operadoras].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((op) => (
                <option key={op.slug} value={op.slug}>{op.nome}</option>
              ))}
            </select>
          )}
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Bio do Dealer</label>
          <textarea value={perfilInfluencer} onChange={(e) => setPerfilInfluencer(e.target.value)} placeholder="Descrição, carisma, estilo de jogo..." style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} />
        </div>

        {editando && (
          <div style={{ ...fieldStyle, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ ...labelStyle, margin: 0 }}>Status</label>
            <button type="button" onClick={() => setStatus("aprovado")} style={{ padding: "6px 14px", borderRadius: 10, border: `1px solid ${status === "aprovado" ? BRAND.verde : t.cardBorder}`, background: status === "aprovado" ? `${BRAND.verde}22` : "transparent", color: status === "aprovado" ? BRAND.verde : t.textMuted, fontSize: 12, fontWeight: 600, fontFamily: FONT.body, cursor: "pointer" }}>Aprovado</button>
            <button type="button" onClick={() => setStatus("pendente")} style={{ padding: "6px 14px", borderRadius: 10, border: `1px solid ${status === "pendente" ? BRAND.amarelo : t.cardBorder}`, background: status === "pendente" ? `${BRAND.amarelo}22` : "transparent", color: status === "pendente" ? BRAND.amarelo : t.textMuted, fontSize: 12, fontWeight: 600, fontFamily: FONT.body, cursor: "pointer" }}>Pendente</button>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 12, fontFamily: FONT.body, fontSize: 13, color: t.text, cursor: "pointer" }}>
              <input type="checkbox" checked={vip} onChange={(e) => setVip(e.target.checked)} />
              VIP
            </label>
          </div>
        )}

        {erro && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: `${BRAND.vermelho}18`, border: `1px solid ${BRAND.vermelho}44`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: BRAND.vermelho, marginBottom: 16, fontFamily: FONT.body }}>
            {erro}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <button onClick={() => { if (!salvando) onClose(); }} style={{ background: "transparent", border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: "9px 18px", cursor: "pointer", fontFamily: FONT.body, fontSize: 13, color: t.text }}>
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando} style={{
            background: `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`,
            color: "#fff", border: "none", borderRadius: 10, padding: "9px 20px", cursor: salvando ? "not-allowed" : "pointer",
            fontFamily: FONT.body, fontSize: 13, fontWeight: 700, opacity: salvando ? 0.7 : 1,
          }}>
            {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar dealer"}
          </button>
        </div>
    </ModalBase>
  );
}
