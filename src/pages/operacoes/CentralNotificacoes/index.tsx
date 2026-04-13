import { useState, useEffect, useMemo } from "react";
import { CheckCircle, ChevronLeft, ChevronRight, Clock, Megaphone, Inbox } from "lucide-react";
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
import type { Operadora } from "../../../types";
import OperadoraTag from "../../../components/OperadoraTag";
import { PageHeader } from "../../../components/PageHeader";
import { ModalThreadSolicitacao, type ThreadSolicitacaoOrigem } from "../solicitacoes/ModalThreadSolicitacao";
import { corStatusSolicitacao, labelTipoSolicitacao, tempoRelativo, type SolicitacaoTipo } from "../solicitacoes/solicitacoesUtils";

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

function periodoTimestamps(periodo: { inicio: string; fim: string }): { ini: string; fim: string } {
  return {
    ini: `${periodo.inicio}T00:00:00.000Z`,
    fim: `${periodo.fim}T23:59:59.999Z`,
  };
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

type AbaStaff = "troca" | "feedback" | "campanha_roteiro";

interface DealerSolRow {
  id: string;
  tipo: SolicitacaoTipo;
  status: string;
  titulo: string | null;
  created_at: string;
  resolvido_em?: string | null;
  aguarda_resposta_de: string | null;
  operadora_slug: string;
  dealers: { nickname: string; nome_real: string; fotos: string[] | null; turno: string } | null;
}

interface CampanhaRoteiroSolRow {
  id: string;
  status: string;
  titulo: string | null;
  created_at: string;
  aguarda_resposta_de: string | null;
  operadora_slug: string;
  roteiro_mesa_campanhas: { titulo: string } | null;
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
  const [solicCampRoteiroPorCampanhaId, setSolicCampRoteiroPorCampanhaId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [abaStaff, setAbaStaff] = useState<AbaStaff>("troca");
  const [solicTroca, setSolicTroca] = useState<DealerSolRow[]>([]);
  const [solicFeedback, setSolicFeedback] = useState<DealerSolRow[]>([]);
  const [solMinhas, setSolMinhas] = useState<DealerSolRow[]>([]);
  const [solicConcluidas, setSolicConcluidas] = useState<DealerSolRow[]>([]);
  const [solicCampRoteiroGestor, setSolicCampRoteiroGestor] = useState<CampanhaRoteiroSolRow[]>([]);
  const [threadCtx, setThreadCtx] = useState<{ id: string; origem: ThreadSolicitacaoOrigem } | null>(null);
  const [inboxVersion, setInboxVersion] = useState(0);

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

      if (verInboxEstudio) {
        setCampanhas([]);
        setSolicCampRoteiroPorCampanhaId({});
      } else {
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

        const { data: dataCamp, error: errCamp } = await qCamp;
        if (errCamp) console.error("[CentralNotificacoes] campanhas:", errCamp);

        const listaCamp = (dataCamp ?? []) as CampanhaComPerfil[];
        const mapSol: Record<string, string> = {};
        if (listaCamp.length > 0) {
          const idsCamp = listaCamp.map((c) => c.id);
          const { data: solRows, error: errSolMap } = await supabase
            .from("roteiro_campanha_solicitacoes")
            .select("id, campanha_id")
            .in("campanha_id", idsCamp);
          if (errSolMap) console.error("[CentralNotificacoes] solicitações campanha roteiro:", errSolMap.message);
          for (const r of solRows ?? []) {
            const row = r as { id: string; campanha_id: string };
            mapSol[row.campanha_id] = row.id;
          }
        }
        setCampanhas(listaCamp);
        setSolicCampRoteiroPorCampanhaId(mapSol);
      }

      const normSol = (rows: DealerSolRow[] | null | undefined) =>
        (rows ?? []).map((r) => {
          const d = r.dealers as DealerSolRow["dealers"] | DealerSolRow["dealers"][] | null;
          const emb = Array.isArray(d) ? d[0] ?? null : d;
          return { ...r, dealers: emb };
        });

      const normCampSol = (rows: CampanhaRoteiroSolRow[] | null | undefined) =>
        (rows ?? []).map((r) => {
          const c = r.roteiro_mesa_campanhas as CampanhaRoteiroSolRow["roteiro_mesa_campanhas"] | { titulo?: string }[] | null;
          const emb = Array.isArray(c) ? c[0] ?? null : c;
          const tituloCamp =
            emb && typeof emb === "object" && "titulo" in emb ? String((emb as { titulo: string }).titulo ?? "") : null;
          return { ...r, roteiro_mesa_campanhas: tituloCamp ? { titulo: tituloCamp } : null };
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
        let qCampRt = supabase
          .from("roteiro_campanha_solicitacoes")
          .select("id, status, titulo, created_at, aguarda_resposta_de, operadora_slug, roteiro_mesa_campanhas(titulo)")
          .in("status", ["pendente", "em_andamento"])
          .eq("aguarda_resposta_de", "gestor")
          .order("created_at", { ascending: false })
          .limit(80);
        if (!operadoraSlugsForcado?.length && filtroOperadora !== "todas") {
          qTroca = qTroca.eq("operadora_slug", filtroOperadora);
          qFb = qFb.eq("operadora_slug", filtroOperadora);
          qCampRt = qCampRt.eq("operadora_slug", filtroOperadora);
        }
        const [{ data: dt }, { data: df }, { data: dcr }] = await Promise.all([qTroca, qFb, qCampRt]);
        setSolicTroca(normSol(dt as DealerSolRow[] | null));
        setSolicFeedback(normSol(df as DealerSolRow[] | null));
        setSolicCampRoteiroGestor(normCampSol(dcr as CampanhaRoteiroSolRow[] | null));
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
        setSolicCampRoteiroGestor([]);
      } else {
        setSolicTroca([]);
        setSolicFeedback([]);
        setSolMinhas([]);
        setSolicCampRoteiroGestor([]);
      }

      if (user?.role === "operador" && !operadoraSlugsForcado?.length) {
        setSolicConcluidas([]);
      } else {
        let qConc = supabase
          .from("dealer_solicitacoes")
          .select(
            "id, tipo, status, titulo, created_at, resolvido_em, aguarda_resposta_de, operadora_slug, dealers(nickname, nome_real, fotos, turno)",
          )
          .eq("status", "resolvido")
          .gte("resolvido_em", ini)
          .lte("resolvido_em", fim)
          .order("resolvido_em", { ascending: false })
          .limit(120);

        if (user?.role === "operador" && operadoraSlugsForcado?.length) {
          qConc = qConc.in("operadora_slug", operadoraSlugsForcado);
        } else if (verInboxEstudio && !operadoraSlugsForcado?.length && filtroOperadora !== "todas") {
          qConc = qConc.eq("operadora_slug", filtroOperadora);
        }

        const { data: dConc, error: errConc } = await qConc;
        if (errConc) console.error("[CentralNotificacoes] solicitações concluídas:", errConc);
        setSolicConcluidas(normSol(dConc as DealerSolRow[] | null));
      }

      setLoading(false);
    }

    void carregar();
  }, [perm.canView, perm.loading, periodo, filtroOperadora, operadoraSlugsForcado, verInboxEstudio, user?.role, inboxVersion]);

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

  const badgeTroca = solicTroca.length;
  const badgeFb = solicFeedback.length;
  const badgeCampRoteiro = solicCampRoteiroGestor.length;

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

  function renderListaCampanhaRoteiroSolic(lista: CampanhaRoteiroSolRow[]) {
    if (lista.length === 0 && !loading) {
      return (
        <div style={{ ...cardShell, color: t.textMuted, fontSize: 14, fontFamily: FONT.body }}>
          Nenhuma conversa de campanha de roteiro em aberto neste filtro.
        </div>
      );
    }
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {lista.map((row) => {
          const op = operadoraBySlug[row.operadora_slug];
          const st = row.status as "pendente" | "em_andamento" | "resolvido" | "cancelado";
          const cor = corStatusSolicitacao(st);
          const titCamp = row.roteiro_mesa_campanhas?.titulo ?? "—";
          return (
            <article key={row.id} style={cardShell} aria-label={`Solicitação de campanha: ${row.titulo ?? row.id}`}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    flexShrink: 0,
                    background: "rgba(112,202,228,0.12)",
                    border: "1px solid rgba(112,202,228,0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#70cae4",
                  }}
                >
                  <Megaphone size={20} aria-hidden />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: t.text, fontFamily: FONT.body }}>{row.titulo ?? row.id}</div>
                  <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4, fontFamily: FONT.body }}>
                    Campanha: {titCamp} · {tempoRelativo(row.created_at)}
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
                    onClick={() => setThreadCtx({ id: row.id, origem: "campanha_roteiro" })}
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

  function renderListaSolicitacoes(lista: DealerSolRow[], modo: "abertas" | "concluidas" = "abertas") {
    if (lista.length === 0 && !loading) {
      return (
        <div style={{ ...cardShell, color: t.textMuted, fontSize: 14, fontFamily: FONT.body }}>
          {modo === "concluidas" ? "Sem dados para o período selecionado." : "Nenhuma solicitação em aberto neste filtro."}
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
                  {modo === "concluidas" ? (
                    <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4, fontFamily: FONT.body }}>
                      {labelTipoSolicitacao(row.tipo)} · {d?.nickname ?? "—"}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4, fontFamily: FONT.body }}>
                      {d?.nickname ?? "—"} · {tempoRelativo(row.created_at)}
                    </div>
                  )}
                  {modo === "concluidas" ? (
                    <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6, fontFamily: FONT.body }}>
                      Concluída em{" "}
                      {row.resolvido_em
                        ? new Date(row.resolvido_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
                        : "—"}
                    </div>
                  ) : null}
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
                    onClick={() => setThreadCtx({ id: row.id, origem: "dealer" })}
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
            : "Campanhas de roteiro e solicitações ao estúdio."
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
              aria-selected={abaStaff === "campanha_roteiro"}
              id="tab-central-campanha-roteiro"
              aria-controls="panel-central-campanha-roteiro"
              onClick={() => setAbaStaff("campanha_roteiro")}
              style={chipTab(abaStaff === "campanha_roteiro")}
            >
              <Megaphone size={14} style={{ marginRight: 6, verticalAlign: "middle" }} aria-hidden />
              Campanhas (roteiro)
              {badgeCampRoteiro > 0 ? (
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
                  {badgeCampRoteiro}
                </span>
              ) : null}
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
          {abaStaff === "campanha_roteiro" ? (
            <div role="tabpanel" id="panel-central-campanha-roteiro" aria-labelledby="tab-central-campanha-roteiro">
              {renderListaCampanhaRoteiroSolic(solicCampRoteiroGestor)}
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
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE }}>
                {user?.role === "operador" ? "Minhas Campanhas" : "Campanhas"}
              </h2>
            </div>
            <div style={blocoCampanhasEnvelope}>
              {campanhas.length === 0 && !loading ? (
                <div style={{ ...cardShell, color: t.textMuted, fontSize: 14 }}>Nenhuma campanha cadastrada neste período.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
                  {campanhas.map((c) => {
                    const op = operadoraBySlug[c.operadora_slug];
                    const sidCampSol = solicCampRoteiroPorCampanhaId[c.id];
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
                        {sidCampSol ? (
                          <button
                            type="button"
                            onClick={() => setThreadCtx({ id: sidCampSol, origem: "campanha_roteiro" })}
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
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      <section style={{ marginTop: 36 }} aria-labelledby="heading-solic-concluidas">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <CheckCircle size={20} color="#22c55e" aria-hidden />
          <h2 id="heading-solic-concluidas" style={{ margin: 0, fontSize: 17, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE }}>
            Solicitações concluídas
          </h2>
        </div>
        <p style={{ margin: "0 0 16px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body, maxWidth: 640 }}>
          Listagem das solicitações marcadas como resolvidas no período selecionado.
        </p>
        {renderListaSolicitacoes(solicConcluidas, "concluidas")}
      </section>

      {threadCtx ? (
        <ModalThreadSolicitacao
          solicitacaoId={threadCtx.id}
          operadoras={operadorasList}
          origem={threadCtx.origem}
          podeInteragir={perm.canEditarOk}
          onClose={() => setThreadCtx(null)}
          onResolvido={() => {
            setInboxVersion((v) => v + 1);
            setThreadCtx(null);
          }}
        />
      ) : null}
    </div>
  );
}
