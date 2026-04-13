import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock, Megaphone, MessageSquare, Inbox, Trash2 } from "lucide-react";
import { GiCalendar, GiDiceSixFacesFour, GiRingingBell, GiShield } from "react-icons/gi";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { usePendenciasCount } from "../../../hooks/usePendenciasCount";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import { fmt, getMesesDisponiveis, getDatasDoMes, fmtDia } from "../../../lib/dashboardHelpers";
import type { RoteiroCampanha } from "../../conteudo/RoteiroMesa";
import type { DealerGenero, DealerJogo, DealerTurno, Operadora } from "../../../types";
import OperadoraTag from "../../../components/OperadoraTag";
import { PageHeader } from "../../../components/PageHeader";
import { ModalConfirmDelete } from "../../../components/OperacoesModal";
import { ModalThreadSolicitacao } from "../solicitacoes/ModalThreadSolicitacao";
import { corStatusSolicitacao, tempoRelativo, type SolicitacaoTipo } from "../solicitacoes/solicitacoesUtils";

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

type CampanhaComPerfil = RoteiroCampanha & {
  profiles?: { name: string } | { name: string }[] | null;
};

function nomeCadastroCampanha(c: CampanhaComPerfil): string {
  const p = c.profiles;
  if (!p) return "Usuário não identificado";
  const row = Array.isArray(p) ? p[0] : p;
  const n = row?.name?.trim();
  return n || "Usuário não identificado";
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

function ObservacaoTextoClamp({ texto }: { texto: string }) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [expandido, setExpandido] = useState(false);
  const longo = texto.length > 300;
  return (
    <div>
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
          overflow: expandido ? "visible" : "hidden",
          display: expandido ? "block" : "-webkit-box",
          WebkitLineClamp: expandido ? undefined : 4,
          WebkitBoxOrient: "vertical",
        }}
      >
        {texto}
      </div>
      {longo ? (
        <button
          type="button"
          onClick={() => setExpandido((e) => !e)}
          style={{
            marginTop: 6,
            fontSize: 11,
            color: brand.accent,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: FONT.body,
            padding: 0,
          }}
        >
          {expandido ? "Ver menos" : "Ver mais"}
        </button>
      ) : null}
    </div>
  );
}

type AbaStaff = "troca" | "feedback" | "campanhas7" | "observacoes";

interface DealerSolRow {
  id: string;
  tipo: SolicitacaoTipo;
  status: string;
  titulo: string | null;
  created_at: string;
  aguarda_resposta_de: string | null;
  operadora_slug: string;
  dealers: { nickname: string; nome_real: string; fotos: string[] | null; turno: string } | null;
}

export default function CentralNotificacoes() {
  const { theme: t, podeVerOperadora, user } = useApp();
  const brand = useDashboardBrand();
  const { showFiltroOperadora, operadoraSlugsForcado } = useDashboardFiltros();
  const perm = usePermission("central_notificacoes");
  const pendentesGestor = usePendenciasCount("gestor");
  /** Inbox do estúdio (troca/feedback): não-operador com acesso à Central; permissões em role_permissions. */
  const verInboxEstudio = user?.role !== "operador" && (perm.loading || perm.canView !== "nao");

  const mesesDisponiveis = useMemo(() => getMesesDisponiveis(), []);
  const idxInicial = mesesDisponiveis.findIndex((m) => {
    const now = new Date();
    return m.ano === now.getFullYear() && m.mes === now.getMonth();
  });
  const [idxMes, setIdxMes] = useState(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1);
  const [historico, setHistorico] = useState(false);
  const [filtroOperadora, setFiltroOperadora] = useState<string>("todas");
  const [operadorasList, setOperadorasList] = useState<Operadora[]>([]);
  const [campanhas, setCampanhas] = useState<CampanhaComPerfil[]>([]);
  const [campanhas7, setCampanhas7] = useState<CampanhaComPerfil[]>([]);
  const [observacoes, setObservacoes] = useState<ObsComDealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [abaStaff, setAbaStaff] = useState<AbaStaff>("troca");
  const [solicTroca, setSolicTroca] = useState<DealerSolRow[]>([]);
  const [solicFeedback, setSolicFeedback] = useState<DealerSolRow[]>([]);
  const [solMinhas, setSolMinhas] = useState<DealerSolRow[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [inboxVersion, setInboxVersion] = useState(0);
  const [obsParaExcluir, setObsParaExcluir] = useState<ObsComDealer | null>(null);
  const [obsExcluindo, setObsExcluindo] = useState(false);

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

  const iniCampanhas7 = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }, []);

  useEffect(() => {
    if (perm.canView === "nao" || perm.loading) return;

    async function carregar() {
      setLoading(true);
      const { ini, fim } = periodoTimestamps(periodo);

      let qCamp = supabase
        .from("roteiro_mesa_campanhas")
        .select("*, profiles!created_by(name)")
        .gte("created_at", ini)
        .lte("created_at", fim)
        .order("created_at", { ascending: false });

      if (operadoraSlugsForcado?.length) {
        qCamp = qCamp.in("operadora_slug", operadoraSlugsForcado);
      } else if (filtroOperadora !== "todas") {
        qCamp = qCamp.eq("operadora_slug", filtroOperadora);
      }

      let qCamp7 = supabase
        .from("roteiro_mesa_campanhas")
        .select("*, profiles!created_by(name)")
        .gte("created_at", iniCampanhas7)
        .order("created_at", { ascending: false });
      if (operadoraSlugsForcado?.length) {
        qCamp7 = qCamp7.in("operadora_slug", operadoraSlugsForcado);
      } else if (filtroOperadora !== "todas") {
        qCamp7 = qCamp7.eq("operadora_slug", filtroOperadora);
      }

      const qObs = supabase
        .from("dealer_observacoes")
        .select("id, dealer_id, texto, created_at, dealers(nickname, nome_real, genero, turno, jogos, operadora_slug)")
        .gte("created_at", ini)
        .lte("created_at", fim)
        .order("created_at", { ascending: false });

      const [{ data: dataCamp, error: errCamp }, { data: dataCamp7, error: errCamp7 }, { data: dataObs, error: errObs }] = await Promise.all([
        qCamp,
        qCamp7,
        qObs,
      ]);

      if (errCamp) console.error("[CentralNotificacoes] campanhas:", errCamp);
      if (errCamp7) console.error("[CentralNotificacoes] campanhas7:", errCamp7);
      if (errObs) console.error("[CentralNotificacoes] observações:", errObs);

      const listaCamp = (dataCamp ?? []) as CampanhaComPerfil[];
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
      setCampanhas7((dataCamp7 ?? []) as CampanhaComPerfil[]);
      setObservacoes(listaObs);

      const normSol = (rows: DealerSolRow[] | null | undefined) =>
        (rows ?? []).map((r) => {
          const d = r.dealers as DealerSolRow["dealers"] | DealerSolRow["dealers"][] | null;
          const emb = Array.isArray(d) ? d[0] ?? null : d;
          return { ...r, dealers: emb };
        });

      if (verInboxEstudio) {
        let qTroca = supabase
          .from("dealer_solicitacoes")
          .select("id, tipo, status, titulo, created_at, aguarda_resposta_de, operadora_slug, dealers(nickname, nome_real, fotos, turno)")
          .eq("tipo", "troca_dealer")
          .in("status", ["pendente", "em_andamento"])
          .eq("aguarda_resposta_de", "gestor")
          .order("created_at", { ascending: false })
          .limit(80);
        let qFb = supabase
          .from("dealer_solicitacoes")
          .select("id, tipo, status, titulo, created_at, aguarda_resposta_de, operadora_slug, dealers(nickname, nome_real, fotos, turno)")
          .eq("tipo", "feedback")
          .in("status", ["pendente", "em_andamento"])
          .eq("aguarda_resposta_de", "gestor")
          .order("created_at", { ascending: false })
          .limit(80);
        if (!operadoraSlugsForcado?.length && filtroOperadora !== "todas") {
          qTroca = qTroca.eq("operadora_slug", filtroOperadora);
          qFb = qFb.eq("operadora_slug", filtroOperadora);
        }
        const [{ data: dt }, { data: df }] = await Promise.all([qTroca, qFb]);
        setSolicTroca(normSol(dt as DealerSolRow[] | null));
        setSolicFeedback(normSol(df as DealerSolRow[] | null));
        setSolMinhas([]);
      } else if (user?.role === "operador" && operadoraSlugsForcado?.length) {
        const { data: dMin } = await supabase
          .from("dealer_solicitacoes")
          .select("id, tipo, status, titulo, created_at, aguarda_resposta_de, operadora_slug, dealers(nickname, nome_real, fotos, turno)")
          .in("operadora_slug", operadoraSlugsForcado)
          .in("status", ["pendente", "em_andamento"])
          .order("created_at", { ascending: false })
          .limit(40);
        setSolMinhas(normSol(dMin as DealerSolRow[] | null));
        setSolicTroca([]);
        setSolicFeedback([]);
      } else {
        setSolicTroca([]);
        setSolicFeedback([]);
        setSolMinhas([]);
      }

      setLoading(false);
    }

    void carregar();
  }, [perm.canView, perm.loading, periodo, filtroOperadora, operadoraSlugsForcado, verInboxEstudio, user?.role, iniCampanhas7, inboxVersion]);

  const isPrimeiro = idxMes === 0;
  const isUltimo = idxMes === mesesDisponiveis.length - 1;

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
    boxShadow: t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)",
  };

  const blocoCampanhasEnvelope: React.CSSProperties = {
    borderRadius: 14,
    border: brand.primaryTransparentBorder,
    background: brand.primaryTransparentBg,
    padding: "16px 20px",
  };

  const badgeCampanhas7 = campanhas7.length;
  const badgeTroca = solicTroca.length;
  const badgeFb = solicFeedback.length;

  const chipTab = (ativo: boolean) => ({
    padding: "8px 14px",
    borderRadius: 999,
    border: `1px solid ${ativo ? brand.accent : t.cardBorder}`,
    background: ativo
      ? brand.useBrand
        ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)"
        : "rgba(124,58,237,0.15)"
      : "transparent",
    color: ativo ? brand.accent : t.textMuted,
    fontWeight: ativo ? 700 : 500,
    fontSize: 13,
    fontFamily: FONT.body,
    cursor: "pointer",
  });

  function renderListaSolicitacoes(lista: DealerSolRow[]) {
    if (lista.length === 0 && !loading) {
      return (
        <div style={{ ...cardShell, color: t.textMuted, fontSize: 14, fontFamily: FONT.body }}>
          Nenhuma solicitação em aberto neste filtro.
        </div>
      );
    }
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {lista.map((row) => {
          const op = operadoraBySlug[row.operadora_slug];
          const d = row.dealers;
          const foto = (d?.fotos ?? [])[0] as string | undefined;
          const st = row.status as "pendente" | "em_andamento" | "resolvido" | "cancelado";
          const cor = corStatusSolicitacao(st);
          return (
            <article key={row.id} style={cardShell} aria-label={`Solicitação: ${row.titulo ?? row.id}`}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    overflow: "hidden",
                    flexShrink: 0,
                    background: "linear-gradient(135deg,#1a1a2e,#2d1b4e)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 14,
                    fontFamily: FONT.body,
                  }}
                >
                  {foto ? (
                    <img src={foto} alt="" width={44} height={44} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    (d?.nickname ?? "?")[0]?.toUpperCase()
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: t.text, fontFamily: FONT.body }}>{row.titulo ?? row.id}</div>
                  <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4, fontFamily: FONT.body }}>
                    {d?.nickname ?? "—"} · {tempoRelativo(row.created_at)}
                  </div>
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    <OperadoraTag label={op?.nome ?? row.operadora_slug} corPrimaria={op?.cor_primaria} />
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 20,
                        background: `${cor}22`,
                        color: cor,
                        border: `1px solid ${cor}44`,
                        fontFamily: FONT.body,
                      }}
                    >
                      {row.status}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setThreadId(row.id)}
                    style={{
                      marginTop: 12,
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: "none",
                      background: brand.useBrand
                        ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
                        : "linear-gradient(135deg, #4a2082, #1e36f8)",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 12,
                      fontFamily: FONT.body,
                      cursor: "pointer",
                    }}
                  >
                    {perm.canEditarOk ? "Ver conversa" : "Ver conversa (somente leitura)"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar a Central de Notificações.
      </div>
    );
  }

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body, paddingBottom: 32 }}>
      <PageHeader
        icon={<GiRingingBell size={14} aria-hidden />}
        title="Central de Notificações"
        subtitle={
          verInboxEstudio && pendentesGestor > 0
            ? `${pendentesGestor} solicitaç${pendentesGestor === 1 ? "ão" : "ões"} aguardando sua resposta.`
            : "Campanhas de roteiro, observações de dealers e solicitações ao estúdio."
        }
      />

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
              aria-label="Mês anterior"
            >
              <ChevronLeft size={14} aria-hidden />
            </button>
            <span style={{ fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT.body, minWidth: 180, textAlign: "center" }}>
              {historico ? "Todo o período" : mesSelecionado?.label}
            </span>
            <button
              type="button"
              style={{ ...btnNavStyle, opacity: historico || isUltimo ? 0.35 : 1, cursor: historico || isUltimo ? "not-allowed" : "pointer" }}
              onClick={irMesProximo}
              disabled={historico || isUltimo}
              aria-label="Próximo mês"
            >
              <ChevronRight size={14} aria-hidden />
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
              <GiCalendar size={15} aria-hidden />
              Histórico
            </button>

            {showFiltroOperadora && (
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: 10, display: "flex", alignItems: "center", pointerEvents: "none", color: t.textMuted }}>
                  <GiShield size={15} aria-hidden />
                </span>
                <select
                  value={filtroOperadora}
                  onChange={(e) => setFiltroOperadora(e.target.value)}
                  style={selectStyle}
                  disabled={!!operadoraSlugsForcado?.length}
                  aria-label="Filtrar por operadora"
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
                <Clock size={12} aria-hidden /> Carregando...
              </span>
            )}
          </div>
        </div>
      </div>

      {verInboxEstudio ? (
        <>
          <div role="tablist" aria-label="Inbox da Central" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            <button
              type="button"
              role="tab"
              aria-selected={abaStaff === "troca"}
              id="tab-central-troca"
              aria-controls="panel-central-troca"
              onClick={() => setAbaStaff("troca")}
              style={chipTab(abaStaff === "troca")}
            >
              <Inbox size={14} style={{ marginRight: 6, verticalAlign: "middle" }} aria-hidden />
              Troca de dealer
              {badgeTroca > 0 ? (
                <span
                  style={{
                    marginLeft: 8,
                    background: "#e84025",
                    color: "#fff",
                    borderRadius: 10,
                    padding: "0 6px",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {badgeTroca}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={abaStaff === "feedback"}
              id="tab-central-feedback"
              aria-controls="panel-central-feedback"
              onClick={() => setAbaStaff("feedback")}
              style={chipTab(abaStaff === "feedback")}
            >
              Feedbacks
              {badgeFb > 0 ? (
                <span
                  style={{
                    marginLeft: 8,
                    background: "#e84025",
                    color: "#fff",
                    borderRadius: 10,
                    padding: "0 6px",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {badgeFb}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={abaStaff === "campanhas7"}
              id="tab-central-campanhas7"
              aria-controls="panel-central-campanhas7"
              onClick={() => setAbaStaff("campanhas7")}
              style={chipTab(abaStaff === "campanhas7")}
            >
              Campanhas novas (7d)
              {badgeCampanhas7 > 0 ? (
                <span
                  style={{
                    marginLeft: 8,
                    background: "#6b7fff",
                    color: "#fff",
                    borderRadius: 10,
                    padding: "0 6px",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {badgeCampanhas7}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={abaStaff === "observacoes"}
              id="tab-central-obs"
              aria-controls="panel-central-obs"
              onClick={() => setAbaStaff("observacoes")}
              style={chipTab(abaStaff === "observacoes")}
            >
              Observações
            </button>
          </div>

          {abaStaff === "troca" ? (
            <div role="tabpanel" id="panel-central-troca" aria-labelledby="tab-central-troca">
              {renderListaSolicitacoes(solicTroca)}
            </div>
          ) : null}
          {abaStaff === "feedback" ? (
            <div role="tabpanel" id="panel-central-feedback" aria-labelledby="tab-central-feedback">
              {renderListaSolicitacoes(solicFeedback)}
            </div>
          ) : null}
          {abaStaff === "campanhas7" ? (
            <div role="tabpanel" id="panel-central-campanhas7" aria-labelledby="tab-central-campanhas7">
              <section style={blocoCampanhasEnvelope}>
                {campanhas7.length === 0 && !loading ? (
                  <div style={{ ...cardShell, color: t.textMuted, fontSize: 14 }}>Nenhuma campanha cadastrada nos últimos 7 dias.</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
                    {campanhas7.map((c) => {
                      const op = operadoraBySlug[c.operadora_slug];
                      const dataCadastro =
                        c.created_at != null
                          ? new Date(c.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
                          : null;
                      const hoje = new Date().toISOString().split("T")[0];
                      const vigente = !!(c.data_inicio && c.data_fim && hoje >= c.data_inicio && hoje <= c.data_fim);
                      return (
                        <article key={c.id} style={cardShell} aria-label={`Campanha: ${c.titulo}`}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
                            <OperadoraTag label={op?.nome ?? c.operadora_slug} corPrimaria={op?.cor_primaria} />
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
                              <GiDiceSixFacesFour size={12} aria-hidden />
                              {labelJogosRoteiro(c.jogos as string[] | undefined)}
                            </span>
                          </div>
                          <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: t.text }}>{c.titulo}</h3>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: vigente ? "#22c55e" : t.textMuted,
                                fontFamily: FONT.body,
                              }}
                            >
                              {fmtDia(c.data_inicio ?? "")} → {fmtDia(c.data_fim ?? "")}
                            </span>
                            {vigente ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: 20,
                                  background: "#22c55e22",
                                  color: "#22c55e",
                                  border: "1px solid #22c55e44",
                                }}
                              >
                                VIGENTE
                              </span>
                            ) : null}
                          </div>
                          <p style={{ margin: 0, fontSize: 13, color: t.text, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{c.texto}</p>
                          {dataCadastro ? (
                            <p style={{ margin: "10px 0 0", fontSize: 11, color: t.textMuted }}>
                              Cadastrado por {nomeCadastroCampanha(c)} em {dataCadastro}
                            </p>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          ) : null}
          {abaStaff === "observacoes" ? (
            <div role="tabpanel" id="panel-central-obs" aria-labelledby="tab-central-obs">
              <section>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <MessageSquare size={20} color={brand.accent} aria-hidden />
                  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE }}>Observações de dealers</h2>
                </div>
                {observacoes.length === 0 && !loading ? (
                  <div style={{ ...cardShell, color: t.textMuted, fontSize: 14 }}>Nenhuma observação registrada neste período.</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
                    {observacoes.map((o) => {
                      const d = o.dealers;
                      const op = d?.operadora_slug ? operadoraBySlug[d.operadora_slug] : undefined;
                      return (
                        <article
                          key={o.id}
                          style={cardShell}
                          aria-label={`Observação de dealer: ${d?.nickname ?? "Dealer inativo"}`}
                        >
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                            {d?.operadora_slug ? (
                              <OperadoraTag label={op?.nome ?? d.operadora_slug} corPrimaria={op?.cor_primaria} />
                            ) : (
                              <OperadoraTag label="Sem operadora" corPrimaria={null} />
                            )}
                          </div>
                          {!d ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: 20,
                                  background: `${t.textMuted}22`,
                                  color: t.textMuted,
                                  border: `1px solid ${t.textMuted}44`,
                                }}
                              >
                                DEALER INATIVO
                              </span>
                              ID: {o.dealer_id}
                            </div>
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
                              <ObservacaoTextoClamp texto={o.texto} />
                            </>
                          )}
                          <p style={{ margin: "10px 0 0", fontSize: 11, color: t.textMuted }}>
                            {new Date(o.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                          </p>
                          {perm.canExcluirOk ? (
                            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                              <button
                                type="button"
                                onClick={() => setObsParaExcluir(o)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  padding: "6px 12px",
                                  borderRadius: 8,
                                  border: "1px solid #ef444444",
                                  background: "#ef444415",
                                  color: "#ef4444",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  fontFamily: FONT.body,
                                  cursor: "pointer",
                                }}
                              >
                                <Trash2 size={13} aria-hidden />
                                Excluir observação
                              </button>
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </>
      ) : (
        <>
          {user?.role === "operador" && solMinhas.length > 0 ? (
            <section style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Inbox size={20} color={brand.accent} aria-hidden />
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE }}>Minhas solicitações</h2>
              </div>
              {renderListaSolicitacoes(solMinhas)}
            </section>
          ) : null}

          <section style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Megaphone size={20} color={brand.accent} aria-hidden />
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE }}>Campanhas</h2>
            </div>
            <div style={blocoCampanhasEnvelope}>
              {campanhas.length === 0 && !loading ? (
                <div style={{ ...cardShell, color: t.textMuted, fontSize: 14 }}>Nenhuma campanha cadastrada neste período.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
                  {campanhas.map((c) => {
                    const op = operadoraBySlug[c.operadora_slug];
                    const dataCadastro =
                      c.created_at != null
                        ? new Date(c.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
                        : null;
                    const hoje = new Date().toISOString().split("T")[0];
                    const vigente = !!(c.data_inicio && c.data_fim && hoje >= c.data_inicio && hoje <= c.data_fim);
                    return (
                      <article key={c.id} style={cardShell} aria-label={`Campanha: ${c.titulo}`}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
                          <OperadoraTag label={op?.nome ?? c.operadora_slug} corPrimaria={op?.cor_primaria} />
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
                            <GiDiceSixFacesFour size={12} aria-hidden />
                            {labelJogosRoteiro(c.jogos as string[] | undefined)}
                          </span>
                        </div>
                        <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: t.text }}>{c.titulo}</h3>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: vigente ? "#22c55e" : t.textMuted,
                              fontFamily: FONT.body,
                            }}
                          >
                            {fmtDia(c.data_inicio ?? "")} → {fmtDia(c.data_fim ?? "")}
                          </span>
                          {vigente ? (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 20,
                                background: "#22c55e22",
                                color: "#22c55e",
                                border: "1px solid #22c55e44",
                              }}
                            >
                              VIGENTE
                            </span>
                          ) : null}
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: t.text, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{c.texto}</p>
                        {dataCadastro ? (
                          <p style={{ margin: "10px 0 0", fontSize: 11, color: t.textMuted }}>
                            Cadastrado por {nomeCadastroCampanha(c)} em {dataCadastro}
                          </p>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <MessageSquare size={20} color={brand.accent} aria-hidden />
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE }}>Observações de dealers</h2>
            </div>
            {observacoes.length === 0 && !loading ? (
              <div style={{ ...cardShell, color: t.textMuted, fontSize: 14 }}>Nenhuma observação registrada neste período.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
                {observacoes.map((o) => {
                  const d = o.dealers;
                  const op = d?.operadora_slug ? operadoraBySlug[d.operadora_slug] : undefined;
                  return (
                    <article
                      key={o.id}
                      style={cardShell}
                      aria-label={`Observação de dealer: ${d?.nickname ?? "Dealer inativo"}`}
                    >
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                        {d?.operadora_slug ? (
                          <OperadoraTag label={op?.nome ?? d.operadora_slug} corPrimaria={op?.cor_primaria} />
                        ) : (
                          <OperadoraTag label="Sem operadora" corPrimaria={null} />
                        )}
                      </div>
                      {!d ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 20,
                              background: `${t.textMuted}22`,
                              color: t.textMuted,
                              border: `1px solid ${t.textMuted}44`,
                            }}
                          >
                            DEALER INATIVO
                          </span>
                          ID: {o.dealer_id}
                        </div>
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
                          <ObservacaoTextoClamp texto={o.texto} />
                        </>
                      )}
                      <p style={{ margin: "10px 0 0", fontSize: 11, color: t.textMuted }}>
                        {new Date(o.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                      {perm.canExcluirOk ? (
                        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            onClick={() => setObsParaExcluir(o)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "6px 12px",
                              borderRadius: 8,
                              border: "1px solid #ef444444",
                              background: "#ef444415",
                              color: "#ef4444",
                              fontSize: 11,
                              fontWeight: 700,
                              fontFamily: FONT.body,
                              cursor: "pointer",
                            }}
                          >
                            <Trash2 size={13} aria-hidden />
                            Excluir observação
                          </button>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {threadId ? (
        <ModalThreadSolicitacao
          solicitacaoId={threadId}
          operadoras={operadorasList}
          podeInteragir={perm.canEditarOk}
          onClose={() => setThreadId(null)}
          onResolvido={() => {
            setInboxVersion((v) => v + 1);
            setThreadId(null);
          }}
        />
      ) : null}

      {obsParaExcluir ? (
        <ModalConfirmDelete
          zIndex={1200}
          texto={`Excluir esta observação${obsParaExcluir.dealers?.nickname ? ` sobre ${obsParaExcluir.dealers.nickname}` : ""}? Esta ação é irreversível.`}
          onCancel={() => setObsParaExcluir(null)}
          onConfirm={async () => {
            if (!obsParaExcluir) return;
            setObsExcluindo(true);
            const { error } = await supabase.from("dealer_observacoes").delete().eq("id", obsParaExcluir.id);
            setObsExcluindo(false);
            if (error) {
              console.error("[CentralNotificacoes] excluir observação:", error);
              setObsParaExcluir(null);
              return;
            }
            setObsParaExcluir(null);
            setInboxVersion((v) => v + 1);
          }}
          loading={obsExcluindo}
        />
      ) : null}
    </div>
  );
}
