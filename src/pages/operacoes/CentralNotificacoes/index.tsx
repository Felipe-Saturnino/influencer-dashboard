import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock, Megaphone, MessageSquare } from "lucide-react";
import { GiCalendar, GiDiceSixFacesFour, GiRingingBell, GiShield } from "react-icons/gi";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { FONT, DARK_THEME } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import { fmt, getMesesDisponiveis, getDatasDoMes, fmtDia } from "../../../lib/dashboardHelpers";
import type { RoteiroCampanha } from "../../conteudo/RoteiroMesa";
import type { DealerGenero, DealerJogo, DealerTurno, Operadora } from "../../../types";
import OperadoraTag from "../../../components/OperadoraTag";

const GENERO_LABEL: Record<DealerGenero, string> = {
  feminino: "Feminino",
  masculino: "Masculino",
};

const TURNO_LABEL: Record<DealerTurno, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

const JOGO_DEALER_LABEL: Record<DealerJogo, string> = {
  blackjack: "Blackjack",
  roleta: "Roleta",
  baccarat: "Baccarat",
  mesa_vip: "Mesa VIP",
};

const JOGO_ROTEIRO_LABEL: Record<string, string> = {
  todos: "Todos os Jogos",
  blackjack: "BlackJack",
  roleta: "Roleta",
  baccarat: "Baccarat",
};

function labelJogosRoteiro(jogos: string[] | undefined): string {
  const list = (jogos ?? []).map((k) => JOGO_ROTEIRO_LABEL[k] ?? k);
  return list.length ? list.join(", ") : "—";
}

function labelJogosDealer(jogos: string[] | null | undefined): string {
  const list = (jogos ?? []).map((k) => JOGO_DEALER_LABEL[k as DealerJogo] ?? k);
  return list.length ? list.join(", ") : "—";
}

function periodoTimestamps(periodo: { inicio: string; fim: string }): { ini: string; fim: string } {
  return {
    ini: `${periodo.inicio}T00:00:00.000Z`,
    fim: `${periodo.fim}T23:59:59.999Z`,
  };
}

interface DealerObsEmbed {
  nickname: string;
  nome_real: string | null;
  genero: DealerGenero;
  turno: DealerTurno;
  jogos: DealerJogo[] | null;
  operadora_slug: string | null;
}

interface ObsComDealer {
  id: string;
  dealer_id: string;
  texto: string;
  created_at: string;
  dealers: DealerObsEmbed | null;
}

function normalizaObsRow(raw: {
  id: string;
  dealer_id: string;
  texto: string;
  created_at: string;
  dealers: DealerObsEmbed | DealerObsEmbed[] | null;
}): ObsComDealer {
  const d = raw.dealers;
  const embed = Array.isArray(d) ? d[0] ?? null : d;
  return { id: raw.id, dealer_id: raw.dealer_id, texto: raw.texto, created_at: raw.created_at, dealers: embed };
}

export default function CentralNotificacoes() {
  const { theme: t, podeVerOperadora, user } = useApp();
  const brand = useDashboardBrand();
  const { showFiltroOperadora, operadoraSlugsForcado } = useDashboardFiltros();
  const perm = usePermission("central_notificacoes");

  const mesesDisponiveis = useMemo(() => getMesesDisponiveis(), []);
  const idxInicial = mesesDisponiveis.findIndex((m) => {
    const now = new Date();
    return m.ano === now.getFullYear() && m.mes === now.getMonth();
  });
  const [idxMes, setIdxMes] = useState(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1);
  const [historico, setHistorico] = useState(false);
  const [filtroOperadora, setFiltroOperadora] = useState<string>("todas");
  const [operadorasList, setOperadorasList] = useState<Operadora[]>([]);
  const [campanhas, setCampanhas] = useState<RoteiroCampanha[]>([]);
  const [observacoes, setObservacoes] = useState<ObsComDealer[]>([]);
  const [loading, setLoading] = useState(true);

  const mesSelecionado = mesesDisponiveis[idxMes];

  function irMesAnterior() {
    setHistorico(false);
    setIdxMes((i) => Math.max(0, i - 1));
  }
  function irMesProximo() {
    setHistorico(false);
    setIdxMes((i) => Math.min(mesesDisponiveis.length - 1, i + 1));
  }
  function toggleHistorico() {
    if (historico) {
      setHistorico(false);
      setIdxMes(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1);
    } else setHistorico(true);
  }

  useEffect(() => {
    if (user?.role === "operador" && operadoraSlugsForcado?.length) {
      setFiltroOperadora(operadoraSlugsForcado[0]);
    }
  }, [user?.role, operadoraSlugsForcado]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("operadoras").select("slug, nome, cor_primaria").order("nome").eq("ativo", true);
      setOperadorasList((data ?? []) as Operadora[]);
    })();
  }, []);

  const operadoraBySlug = useMemo(() => {
    const m: Record<string, Operadora> = {};
    operadorasList.forEach((o) => {
      m[o.slug] = o;
    });
    return m;
  }, [operadorasList]);

  const periodo = useMemo(() => {
    if (historico) return { inicio: "2020-01-01", fim: fmt(new Date()) };
    if (!mesSelecionado) {
      const now = new Date();
      return getDatasDoMes(now.getFullYear(), now.getMonth());
    }
    return getDatasDoMes(mesSelecionado.ano, mesSelecionado.mes);
  }, [historico, mesSelecionado]);

  useEffect(() => {
    if (perm.canView === "nao" || perm.loading) return;

    async function carregar() {
      setLoading(true);
      const { ini, fim } = periodoTimestamps(periodo);

      let qCamp = supabase
        .from("roteiro_mesa_campanhas")
        .select("*")
        .gte("created_at", ini)
        .lte("created_at", fim)
        .order("created_at", { ascending: false });

      if (operadoraSlugsForcado?.length) {
        qCamp = qCamp.in("operadora_slug", operadoraSlugsForcado);
      } else if (filtroOperadora !== "todas") {
        qCamp = qCamp.eq("operadora_slug", filtroOperadora);
      }

      let qObs = supabase
        .from("dealer_observacoes")
        .select("id, dealer_id, texto, created_at, dealers(nickname, nome_real, genero, turno, jogos, operadora_slug)")
        .gte("created_at", ini)
        .lte("created_at", fim)
        .order("created_at", { ascending: false });

      const [{ data: dataCamp, error: errCamp }, { data: dataObs, error: errObs }] = await Promise.all([qCamp, qObs]);

      if (errCamp) console.error("[CentralNotificacoes] campanhas:", errCamp);
      if (errObs) console.error("[CentralNotificacoes] observações:", errObs);

      let listaCamp = (dataCamp ?? []) as RoteiroCampanha[];
      let listaObs = (dataObs ?? []).map((row) => normalizaObsRow(row as Parameters<typeof normalizaObsRow>[0]));

      if (operadoraSlugsForcado?.length) {
        listaObs = listaObs.filter((o) => {
          const slug = o.dealers?.operadora_slug;
          return slug && operadoraSlugsForcado.includes(slug);
        });
      } else if (filtroOperadora !== "todas") {
        listaObs = listaObs.filter((o) => o.dealers?.operadora_slug === filtroOperadora);
      }

      setCampanhas(listaCamp);
      setObservacoes(listaObs);
      setLoading(false);
    }

    void carregar();
  }, [perm.canView, perm.loading, periodo, filtroOperadora, operadoraSlugsForcado]);

  const isPrimeiro = idxMes === 0;
  const isUltimo = idxMes === mesesDisponiveis.length - 1;
  const tagDark = t.bg === DARK_THEME.bg;

  const selectStyle: React.CSSProperties = {
    padding: "6px 12px 6px 32px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg ?? t.cardBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
    cursor: "pointer",
    appearance: "none" as const,
    outline: "none",
  };

  const btnNavStyle: React.CSSProperties = {
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

  const cardShell: React.CSSProperties = {
    background: brand.blockBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
  };

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar a Central de Notificações.
      </div>
    );
  }

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body, paddingBottom: 32 }}>
      <div style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <GiRingingBell size={28} color={brand.accent} aria-hidden />
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE }}>Central de Notificações</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: t.textMuted }}>
            Campanhas novas no Roteiro de Mesa e observações registradas na Gestão de Dealers, por período e operadora.
          </p>
        </div>
      </div>

      {/* Bloco 1: filtros (mesmo padrão do Overview) */}
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            borderRadius: 14,
            border: brand.primaryTransparentBorder,
            background: brand.primaryTransparentBg,
            padding: "12px 20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              style={{ ...btnNavStyle, opacity: historico || isPrimeiro ? 0.35 : 1, cursor: historico || isPrimeiro ? "not-allowed" : "pointer" }}
              onClick={irMesAnterior}
              disabled={historico || isPrimeiro}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT.body, minWidth: 180, textAlign: "center" }}>
              {historico ? "Todo o período" : mesSelecionado?.label}
            </span>
            <button
              type="button"
              style={{ ...btnNavStyle, opacity: historico || isUltimo ? 0.35 : 1, cursor: historico || isUltimo ? "not-allowed" : "pointer" }}
              onClick={irMesProximo}
              disabled={historico || isUltimo}
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              onClick={toggleHistorico}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 999,
                cursor: "pointer",
                fontFamily: FONT.body,
                fontSize: 13,
                border: historico ? `1px solid ${brand.accent}` : `1px solid ${t.cardBorder}`,
                background: historico
                  ? brand.useBrand
                    ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)"
                    : "rgba(124,58,237,0.15)"
                  : "transparent",
                color: historico ? brand.accent : t.textMuted,
                fontWeight: historico ? 700 : 400,
                transition: "all 0.15s",
              }}
            >
              <GiCalendar size={15} />
              Histórico
            </button>

            {showFiltroOperadora && (
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: 10, display: "flex", alignItems: "center", pointerEvents: "none", color: t.textMuted }}>
                  <GiShield size={15} />
                </span>
                <select
                  value={filtroOperadora}
                  onChange={(e) => setFiltroOperadora(e.target.value)}
                  style={selectStyle}
                  disabled={!!operadoraSlugsForcado?.length}
                >
                  <option value="todas">Todas as operadoras</option>
                  {operadorasList
                    .filter((o) => podeVerOperadora(o.slug))
                    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                    .map((o) => (
                      <option key={o.slug} value={o.slug}>
                        {o.nome}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {loading && (
              <span style={{ fontSize: 12, color: t.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={12} /> Carregando...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bloco 2: campanhas */}
      <section style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Megaphone size={20} color={brand.accent} />
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE }}>Campanhas</h2>
          <span style={{ fontSize: 12, color: t.textMuted }}>(cadastro no Roteiro de Mesa)</span>
        </div>
        {campanhas.length === 0 && !loading ? (
          <div style={{ ...cardShell, color: t.textMuted, fontSize: 14 }}>Nenhuma campanha cadastrada neste período.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {campanhas.map((c) => {
              const op = operadoraBySlug[c.operadora_slug];
              return (
                <article key={c.id} style={cardShell}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
                    <OperadoraTag label={op?.nome ?? c.operadora_slug} corPrimaria={op?.cor_primaria} dark={tagDark} />
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        padding: "3px 9px",
                        borderRadius: 20,
                        background: "rgba(112,202,228,0.12)",
                        color: "#70cae4",
                        border: "1px solid rgba(112,202,228,0.28)",
                        fontWeight: 600,
                      }}
                    >
                      <GiDiceSixFacesFour size={12} />
                      {labelJogosRoteiro(c.jogos as string[] | undefined)}
                    </span>
                  </div>
                  <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: t.text }}>{c.titulo}</h3>
                  <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 8 }}>
                    <strong style={{ color: t.text }}>Início:</strong> {c.data_inicio ? fmtDia(c.data_inicio) : "—"} ·{" "}
                    <strong style={{ color: t.text }}>Fim:</strong> {c.data_fim ? fmtDia(c.data_fim) : "—"}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: t.text, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{c.texto}</p>
                  {c.created_at && (
                    <p style={{ margin: "10px 0 0", fontSize: 11, color: t.textMuted }}>
                      Cadastrado em {new Date(c.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Bloco 3: observações de dealers */}
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <MessageSquare size={20} color={brand.accent} />
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE }}>Observações de dealers</h2>
          <span style={{ fontSize: 12, color: t.textMuted }}>(Gestão de Dealers)</span>
        </div>
        {observacoes.length === 0 && !loading ? (
          <div style={{ ...cardShell, color: t.textMuted, fontSize: 14 }}>Nenhuma observação registrada neste período.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {observacoes.map((o) => {
              const d = o.dealers;
              const op = d?.operadora_slug ? operadoraBySlug[d.operadora_slug] : undefined;
              return (
                <article key={o.id} style={cardShell}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                    {d?.operadora_slug ? (
                      <OperadoraTag label={op?.nome ?? d.operadora_slug} corPrimaria={op?.cor_primaria} dark={tagDark} />
                    ) : (
                      <OperadoraTag label="Sem operadora" corPrimaria={null} dark={tagDark} />
                    )}
                  </div>
                  {!d ? (
                    <p style={{ margin: 0, fontSize: 13, color: t.textMuted }}>Dealer removido ou indisponível.</p>
                  ) : (
                    <>
                      <div style={{ fontSize: 13, color: t.text, marginBottom: 6 }}>
                        <strong>{d.nome_real ?? "—"}</strong>
                        {d.nickname ? <span style={{ color: t.textMuted }}> · {d.nickname}</span> : null}
                      </div>
                      <dl style={{ margin: "0 0 10px", fontSize: 12, color: t.textMuted, display: "grid", gap: 4 }}>
                        <div>
                          <dt style={{ display: "inline", fontWeight: 600, color: t.text }}>Gênero: </dt>
                          <dd style={{ display: "inline", margin: 0 }}>{GENERO_LABEL[d.genero] ?? d.genero}</dd>
                        </div>
                        <div>
                          <dt style={{ display: "inline", fontWeight: 600, color: t.text }}>Turno: </dt>
                          <dd style={{ display: "inline", margin: 0 }}>{TURNO_LABEL[d.turno] ?? d.turno}</dd>
                        </div>
                        <div>
                          <dt style={{ display: "inline", fontWeight: 600, color: t.text }}>Jogos: </dt>
                          <dd style={{ display: "inline", margin: 0 }}>{labelJogosDealer(d.jogos)}</dd>
                        </div>
                      </dl>
                      <div
                        style={{
                          padding: 12,
                          borderRadius: 10,
                          background: "rgba(74,32,130,0.08)",
                          border: `1px solid ${t.cardBorder}`,
                          fontSize: 13,
                          color: t.text,
                          lineHeight: 1.45,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {o.texto}
                      </div>
                    </>
                  )}
                  <p style={{ margin: "10px 0 0", fontSize: 11, color: t.textMuted }}>
                    {new Date(o.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
