import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import type { Dealer, DealerGenero, DealerTurno, DealerJogo, Operadora } from "../../../types";
import { Eye, Clock } from "lucide-react";
import { GiCardRandom, GiShield } from "react-icons/gi";

// ─── Constantes ───────────────────────────────────────────────────────────────
const BRAND = {
  roxo: "#4a2082",
  roxoVivo: "#7c3aed",
  azul: "#1e36f8",
  vermelho: "#e84025",
  verde: "#22c55e",
  amarelo: "#f59e0b",
  cinza: "#6b7280",
} as const;

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

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function CastingDealers() {
  const { theme: t, setActivePage } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("casting_dealers");
  const { showFiltroOperadora, podeVerOperadora, operadoraSlugsForcado } = useDashboardFiltros();

  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroTurno, setFiltroTurno] = useState<DealerTurno | "todos">("todos");
  const [filtroOperadora, setFiltroOperadora] = useState<string>("todas");
  const [filtroGenero, setFiltroGenero] = useState<string>("todos");

  const carregar = useCallback(async () => {
    setLoading(true);
    const [dealersRes, operadorasRes] = await Promise.all([
      supabase.from("dealers").select("*").order("nickname"),
      supabase.from("operadoras").select("slug, nome").eq("ativo", true).order("nome"),
    ]);
    setDealers((dealersRes.data ?? []) as Dealer[]);
    setOperadoras((operadorasRes.data ?? []) as Operadora[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Dealers filtrados — respeita operadora forçada (perfil operadora) e filtros
  const dealersFiltrados = useMemo(() => {
    let list = dealers;
    if (operadoraSlugsForcado?.length) {
      list = list.filter((d) => d.operadora_slug && operadoraSlugsForcado.includes(d.operadora_slug));
    } else if (filtroOperadora !== "todas") {
      if (filtroOperadora === "nenhuma") {
        list = list.filter((d) => !d.operadora_slug);
      } else {
        list = list.filter((d) => d.operadora_slug === filtroOperadora);
      }
    }
    if (filtroTurno !== "todos") list = list.filter((d) => d.turno === filtroTurno);
    if (filtroGenero !== "todos") list = list.filter((d) => d.genero === filtroGenero);
    return list;
  }, [dealers, filtroOperadora, filtroTurno, filtroGenero, operadoraSlugsForcado]);

  // Consolidados (dos dealers filtrados)
  const totalDealers = dealersFiltrados.length;
  const porGenero: Record<string, number> = { feminino: 0, masculino: 0 };
  const porJogo: Record<string, number> = { blackjack: 0, roleta: 0, baccarat: 0, mesa_vip: 0 };
  dealersFiltrados.forEach((d) => {
    porGenero[d.genero] = (porGenero[d.genero] ?? 0) + 1;
    (d.jogos ?? []).forEach((j) => { porJogo[j] = (porJogo[j] ?? 0) + 1; });
  });

  const selectStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 140,
    padding: "6px 12px 6px 32px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg ?? t.cardBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
    cursor: "pointer",
    outline: "none",
    appearance: "none" as const,
  };

  const card: React.CSSProperties = {
    background: brand.blockBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
  };

  const irParaGestaoDealers = () => setActivePage("gestao_dealers");

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar o Casting de Dealers.
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 24px 48px", background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>

      {/* ══ BLOCO 1: FILTROS (layout Overview) ════════════════════════════════════ */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            borderRadius: 14,
            border: brand.primaryTransparentBorder,
            background: brand.primaryTransparentBg,
            padding: "12px 20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Carrossel de Turnos + TODOS */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => setFiltroTurno("todos")}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  cursor: "pointer",
                  fontFamily: FONT.body,
                  fontSize: 13,
                  border:
                    filtroTurno === "todos"
                      ? `1px solid ${brand.accent}`
                      : `1px solid ${t.cardBorder}`,
                  background:
                    filtroTurno === "todos"
                      ? (brand.useBrand
                          ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)"
                          : "rgba(124,58,237,0.15)")
                      : "transparent",
                  color: filtroTurno === "todos" ? brand.accent : t.textMuted,
                  fontWeight: filtroTurno === "todos" ? 700 : 400,
                  transition: "all 0.15s",
                }}
              >
                TODOS
              </button>
              {TURNO_OPTS.map((o) => {
                const ativo = filtroTurno === o.value;
                return (
                  <button
                    key={o.value}
                    onClick={() => setFiltroTurno(o.value)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 999,
                      cursor: "pointer",
                      fontFamily: FONT.body,
                      fontSize: 13,
                      border:
                        ativo
                          ? `1px solid ${brand.accent}`
                          : `1px solid ${t.cardBorder}`,
                      background:
                        ativo
                          ? (brand.useBrand
                              ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)"
                              : "rgba(124,58,237,0.15)")
                          : "transparent",
                      color: ativo ? brand.accent : t.textMuted,
                      fontWeight: ativo ? 700 : 400,
                      transition: "all 0.15s",
                    }}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>

            {/* Filtro Operadora (oculto para perfil operadora) */}
            {showFiltroOperadora && (
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 10,
                    display: "flex",
                    alignItems: "center",
                    pointerEvents: "none",
                    color: t.textMuted,
                  }}
                >
                  <GiShield size={15} />
                </span>
                <select
                  value={filtroOperadora}
                  onChange={(e) => setFiltroOperadora(e.target.value)}
                  style={selectStyle}
                >
                  <option value="todas">Todas as operadoras</option>
                  <option value="nenhuma">Nenhuma operadora</option>
                  {operadoras
                    .filter((o) => podeVerOperadora(o.slug))
                    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                    .map((op) => (
                      <option key={op.slug} value={op.slug}>
                        {op.nome}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Filtro Gênero */}
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <select
                value={filtroGenero}
                onChange={(e) => setFiltroGenero(e.target.value)}
                style={selectStyle}
              >
                <option value="todos">Todos os gêneros</option>
                {GENERO_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {loading && (
              <span style={{ fontSize: 12, color: t.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={12} /> Carregando...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ══ BLOCO 2: Consolidado de KPIs ════════════════════════════════════════════ */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "1.4px",
            textTransform: "uppercase",
            color: t.textMuted,
            marginBottom: 16,
            fontFamily: FONT.body,
          }}
        >
          Consolidado de KPIs
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <div
            style={{
              background: brand.blockBg,
              border: `1px solid ${t.cardBorder}`,
              borderLeft: `4px solid ${brand.accent}`,
              borderRadius: 14,
              padding: "16px 20px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "1.4px",
                textTransform: "uppercase",
                color: brand.secondary,
                fontFamily: FONT.body,
                marginBottom: 6,
              }}
            >
              Quantidade de Dealers
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: brand.accent, fontFamily: FONT_TITLE, lineHeight: 1 }}>
              {totalDealers}
            </div>
          </div>
          <div
            style={{
              background: brand.blockBg,
              border: `1px solid ${t.cardBorder}`,
              borderLeft: `4px solid ${BRAND.verde}`,
              borderRadius: 14,
              padding: "16px 20px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "1.4px",
                textTransform: "uppercase",
                color: t.textMuted,
                fontFamily: FONT.body,
                marginBottom: 6,
              }}
            >
              Gênero
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              {GENERO_OPTS.map((o) => (
                <span
                  key={o.value}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: BRAND.verde,
                    fontFamily: FONT.body,
                  }}
                >
                  {o.label}: {porGenero[o.value] ?? 0}
                </span>
              ))}
            </div>
          </div>
          <div
            style={{
              background: brand.blockBg,
              border: `1px solid ${t.cardBorder}`,
              borderLeft: `4px solid ${BRAND.amarelo}`,
              borderRadius: 14,
              padding: "16px 20px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "1.4px",
                textTransform: "uppercase",
                color: t.textMuted,
                fontFamily: FONT.body,
                marginBottom: 6,
              }}
            >
              Jogos
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              {JOGOS_OPTS.map((o) => (
                <span
                  key={o.value}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: BRAND.amarelo,
                    fontFamily: FONT.body,
                  }}
                >
                  {o.label}: {porJogo[o.value] ?? 0}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ BLOCO 3: Dealers + Link para Gestão ════════════════════════════════════ */}
      <div style={card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
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
              <GiCardRandom size={14} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 800,
                  color: t.text,
                  fontFamily: FONT_TITLE,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                Dealers
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
                {dealersFiltrados.length} {dealersFiltrados.length === 1 ? "dealer" : "dealers"} — configurados na Gestão de Dealers
              </p>
            </div>
          </div>
          <button
            onClick={irParaGestaoDealers}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 10,
              border: "none",
              background: brand.useBrand
                ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
                : `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: FONT.body,
              cursor: "pointer",
            }}
          >
            Ir para Gestão de Dealers
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
            Carregando...
          </div>
        ) : dealersFiltrados.length === 0 ? (
          <div
            style={{
              padding: 48,
              textAlign: "center",
              color: t.textMuted,
              fontFamily: FONT.body,
              borderRadius: 14,
              border: `1px dashed ${t.cardBorder}`,
              background: "rgba(255,255,255,0.02)",
            }}
          >
            Nenhum dealer encontrado com os filtros selecionados. Acesse a{" "}
            <button
              onClick={irParaGestaoDealers}
              style={{
                background: "none",
                border: "none",
                color: brand.accent,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: FONT.body,
                textDecoration: "underline",
              }}
            >
              Gestão de Dealers
            </button>{" "}
            para cadastrar.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {dealersFiltrados.map((d) => (
              <DealerCardCasting
                key={d.id}
                dealer={d}
                operadoras={operadoras}
                brand={brand}
                onVerGestao={irParaGestaoDealers}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DealerCard (Casting) ─────────────────────────────────────────────────────
function DealerCardCasting({
  dealer,
  operadoras,
  brand,
  onVerGestao,
}: {
  dealer: Dealer;
  operadoras: Operadora[];
  brand: ReturnType<typeof useDashboardBrand>;
  onVerGestao: () => void;
}) {
  const { theme: t } = useApp();
  const fotoUrl = (dealer.fotos ?? [])[0];
  const op = operadoras.find((o) => o.slug === dealer.operadora_slug);

  return (
    <div
      style={{
        background: brand.blockBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
      }}
    >
      <div
        style={{
          aspectRatio: "16/10",
          background: "linear-gradient(135deg, #1a1a2e 0%, #2d1b4e 100%)",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {fotoUrl ? (
          <img src={fotoUrl} alt={dealer.nickname} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ fontSize: 40, color: "rgba(255,255,255,0.2)", fontWeight: 800, fontFamily: FONT.body }}>
            {(dealer.nickname || "?")[0]?.toUpperCase()}
          </div>
        )}
        <div style={{ position: "absolute", bottom: 10, left: 10 }}>
          <span
            style={{
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 700,
              fontFamily: FONT.body,
              textTransform: "uppercase",
            }}
          >
            {TURNO_OPTS.find((o) => o.value === dealer.turno)?.label ?? dealer.turno}
          </span>
        </div>
      </div>
      <div style={{ padding: "14px 16px" }}>
        <h3
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 800,
            color: t.text,
            fontFamily: FONT_TITLE,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {dealer.nickname}
        </h3>
        <p style={{ margin: "4px 0 8px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
          {dealer.nome_real}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {(dealer.jogos ?? []).map((j) => (
            <span
              key={j}
              style={{
                background: `${BRAND.vermelho}22`,
                border: `1px solid ${BRAND.vermelho}66`,
                color: BRAND.vermelho,
                padding: "3px 8px",
                borderRadius: 20,
                fontSize: 10,
                fontWeight: 700,
                fontFamily: FONT.body,
                textTransform: "uppercase",
              }}
            >
              {JOGOS_OPTS.find((o) => o.value === j)?.label ?? j}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          <span
            style={{
              background: `${BRAND.roxoVivo}22`,
              color: BRAND.roxoVivo,
              padding: "3px 10px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: FONT.body,
            }}
          >
            {GENERO_OPTS.find((o) => o.value === dealer.genero)?.label ?? dealer.genero}
          </span>
          {op && (
            <span
              style={{
                background: `${BRAND.azul}22`,
                color: BRAND.azul,
                padding: "3px 10px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: FONT.body,
              }}
            >
              {op.nome}
            </span>
          )}
        </div>
        <button
          onClick={onVerGestao}
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
            width: "100%",
            justifyContent: "center",
          }}
        >
          <Eye size={13} /> Ver na Gestão de Dealers
        </button>
      </div>
    </div>
  );
}
