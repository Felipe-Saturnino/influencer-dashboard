import { useEffect, useState, useCallback, useRef } from "react";
import { FileText, Loader2, Megaphone, Send } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import OperadoraTag from "../../../components/OperadoraTag";
import type { OperadoraTagDados } from "./BannerPendencias";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { corStatusSolicitacao, labelTipoSolicitacao, tempoRelativo, type SolicitacaoStatus, type SolicitacaoTipo } from "./solicitacoesUtils";

export type ThreadSolicitacaoOrigem = "dealer" | "campanha_roteiro" | "roteiro_mesa";

export interface ModalThreadSolicitacaoProps {
  solicitacaoId: string;
  operadoras: OperadoraTagDados[];
  onClose: () => void;
  onResolvido?: () => void;
  /** Quando false: só leitura (sem enviar mensagem / resolver). Controlado por role_permissions.can_editar da página. */
  podeInteragir?: boolean;
  /** Default: solicitação de dealer; `campanha_roteiro` / `roteiro_mesa` usam tabelas de thread de roteiro de mesa. */
  origem?: ThreadSolicitacaoOrigem;
}

interface MensagemRow {
  id: string;
  solicitacao_id: string;
  autor: "operadora" | "gestor";
  usuario_id: string | null;
  texto: string;
  visto: boolean;
  created_at: string;
}

interface MensagemComNome extends MensagemRow {
  nomeRemetente: string;
}

interface SolicitacaoCabecalhoDealer {
  origem: "dealer";
  id: string;
  dealer_id: string;
  operadora_slug: string;
  tipo: SolicitacaoTipo;
  status: SolicitacaoStatus;
  aguarda_resposta_de: "operadora" | "gestor" | null;
  titulo: string | null;
  created_at: string;
  dealers: { nickname: string; nome_real: string; fotos: string[] | null; turno: string } | null;
}

interface SolicitacaoCabecalhoCampanha {
  origem: "campanha_roteiro";
  id: string;
  campanha_id: string;
  operadora_slug: string;
  status: SolicitacaoStatus;
  aguarda_resposta_de: "operadora" | "gestor" | null;
  titulo: string | null;
  created_at: string;
  campanha: { titulo: string; texto: string; jogos: string[] | null } | null;
}

interface SolicitacaoCabecalhoMesa {
  origem: "roteiro_mesa";
  id: string;
  sugestao_id: string;
  operadora_slug: string;
  status: SolicitacaoStatus;
  aguarda_resposta_de: "operadora" | "gestor" | null;
  titulo: string | null;
  created_at: string;
  sugestao: { bloco: string; tipo: string | null; texto: string; jogos: string[] | null } | null;
}

type CabecalhoThread = SolicitacaoCabecalhoDealer | SolicitacaoCabecalhoCampanha | SolicitacaoCabecalhoMesa;

function tabelas(origem: ThreadSolicitacaoOrigem) {
  if (origem === "campanha_roteiro") {
    return {
      solicitacoes: "roteiro_campanha_solicitacoes" as const,
      mensagens: "roteiro_campanha_solicitacao_mensagens" as const,
    };
  }
  if (origem === "roteiro_mesa") {
    return {
      solicitacoes: "roteiro_mesa_solicitacoes" as const,
      mensagens: "roteiro_mesa_solicitacao_mensagens" as const,
    };
  }
  return {
    solicitacoes: "dealer_solicitacoes" as const,
    mensagens: "solicitacao_mensagens" as const,
  };
}

function papelMensagemFromUser(role: string | undefined): "operadora" | "gestor" {
  return role === "operador" ? "operadora" : "gestor";
}

function isStaff(role: string | undefined): boolean {
  return role === "admin" || role === "gestor" || role === "executivo";
}

export function ModalThreadSolicitacao({
  solicitacaoId,
  operadoras,
  onClose,
  onResolvido,
  podeInteragir = true,
  origem = "dealer",
}: ModalThreadSolicitacaoProps) {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const { solicitacoes: tabSol, mensagens: tabMsg } = tabelas(origem);
  const [cab, setCab] = useState<CabecalhoThread | null>(null);
  const [mensagens, setMensagens] = useState<MensagemComNome[]>([]);
  const [texto, setTexto] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [resolvendo, setResolvendo] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const staff = isStaff(user?.role);
  const meuPapel = papelMensagemFromUser(user?.role);

  const aplicarMensagensComNomes = useCallback(async (rows: MensagemRow[] | null | undefined) => {
    if (!rows?.length) {
      setMensagens([]);
      return;
    }
    const ids = [...new Set(rows.map((m) => m.usuario_id).filter(Boolean))] as string[];
    const nomeById: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, name").in("id", ids);
      for (const p of profs ?? []) {
        const row = p as { id: string; name: string | null };
        const n = row.name?.trim();
        nomeById[row.id] = n || "Usuário";
      }
    }
    setMensagens(
      rows.map((m) => {
        let nomeRemetente: string;
        if (m.usuario_id) {
          nomeRemetente = nomeById[m.usuario_id] ?? "Usuário";
        } else {
          nomeRemetente = m.autor === "operadora" ? "Operadora" : "Estúdio";
        }
        return { ...m, nomeRemetente };
      }),
    );
  }, []);

  const carregar = useCallback(async () => {
    const papelMsg = papelMensagemFromUser(user?.role);

    if (origem === "campanha_roteiro") {
      const { data: s, error: e1 } = await supabase
        .from(tabSol)
        .select(
          "id, campanha_id, operadora_slug, status, aguarda_resposta_de, titulo, created_at, roteiro_mesa_campanhas(titulo, texto, jogos)",
        )
        .eq("id", solicitacaoId)
        .maybeSingle();

      if (e1 || !s) {
        setCab(null);
        setLoading(false);
        return;
      }

      const rawCamp = (s as { roteiro_mesa_campanhas?: unknown }).roteiro_mesa_campanhas;
      const campRow = Array.isArray(rawCamp) ? rawCamp[0] : rawCamp;
      const campanha =
        campRow && typeof campRow === "object"
          ? {
              titulo: String((campRow as { titulo?: string }).titulo ?? ""),
              texto: String((campRow as { texto?: string }).texto ?? ""),
              jogos: ((campRow as { jogos?: string[] | null }).jogos ?? null) as string[] | null,
            }
          : null;

      setCab({
        origem: "campanha_roteiro",
        id: s.id as string,
        campanha_id: s.campanha_id as string,
        operadora_slug: s.operadora_slug as string,
        status: s.status as SolicitacaoStatus,
        aguarda_resposta_de: s.aguarda_resposta_de as SolicitacaoCabecalhoCampanha["aguarda_resposta_de"],
        titulo: s.titulo as string | null,
        created_at: s.created_at as string,
        campanha,
      });
    } else if (origem === "roteiro_mesa") {
      const { data: s, error: e1 } = await supabase
        .from(tabSol)
        .select(
          "id, sugestao_id, operadora_slug, status, aguarda_resposta_de, titulo, created_at, roteiro_mesa_sugestoes(bloco, tipo, texto, jogos)",
        )
        .eq("id", solicitacaoId)
        .maybeSingle();

      if (e1 || !s) {
        setCab(null);
        setLoading(false);
        return;
      }

      const rawSug = (s as { roteiro_mesa_sugestoes?: unknown }).roteiro_mesa_sugestoes;
      const sugRow = Array.isArray(rawSug) ? rawSug[0] : rawSug;
      const sugestao =
        sugRow && typeof sugRow === "object"
          ? {
              bloco: String((sugRow as { bloco?: string }).bloco ?? ""),
              tipo: ((sugRow as { tipo?: string | null }).tipo ?? null) as string | null,
              texto: String((sugRow as { texto?: string }).texto ?? ""),
              jogos: ((sugRow as { jogos?: string[] | null }).jogos ?? null) as string[] | null,
            }
          : null;

      setCab({
        origem: "roteiro_mesa",
        id: s.id as string,
        sugestao_id: s.sugestao_id as string,
        operadora_slug: s.operadora_slug as string,
        status: s.status as SolicitacaoStatus,
        aguarda_resposta_de: s.aguarda_resposta_de as SolicitacaoCabecalhoMesa["aguarda_resposta_de"],
        titulo: s.titulo as string | null,
        created_at: s.created_at as string,
        sugestao,
      });
    } else {
      const { data: s, error: e1 } = await supabase
        .from(tabSol)
        .select("id, dealer_id, operadora_slug, tipo, status, aguarda_resposta_de, titulo, created_at, dealers(nickname, nome_real, fotos, turno)")
        .eq("id", solicitacaoId)
        .maybeSingle();

      if (e1 || !s) {
        setCab(null);
        setLoading(false);
        return;
      }

      const d = s.dealers as SolicitacaoCabecalhoDealer["dealers"] | SolicitacaoCabecalhoDealer["dealers"][] | null;
      const dealerEmb = Array.isArray(d) ? d[0] ?? null : d;

      setCab({
        origem: "dealer",
        id: s.id as string,
        dealer_id: s.dealer_id as string,
        operadora_slug: s.operadora_slug as string,
        tipo: s.tipo as SolicitacaoTipo,
        status: s.status as SolicitacaoStatus,
        aguarda_resposta_de: s.aguarda_resposta_de as SolicitacaoCabecalhoDealer["aguarda_resposta_de"],
        titulo: s.titulo as string | null,
        created_at: s.created_at as string,
        dealers: dealerEmb,
      });
    }

    const { data: msgs, error: e2 } = await supabase
      .from(tabMsg)
      .select("id, solicitacao_id, autor, usuario_id, texto, visto, created_at")
      .eq("solicitacao_id", solicitacaoId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (e2) setMensagens([]);
    else await aplicarMensagensComNomes(msgs as MensagemRow[] | null);

    const outro = papelMsg === "gestor" ? "operadora" : "gestor";
    await supabase.from(tabMsg).update({ visto: true }).eq("solicitacao_id", solicitacaoId).eq("autor", outro);

    setLoading(false);
  }, [solicitacaoId, user?.role, aplicarMensagensComNomes, origem, tabSol, tabMsg]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    const ch = supabase
      .channel(`thread_${origem}_${solicitacaoId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: tabMsg,
          filter: `solicitacao_id=eq.${solicitacaoId}`,
        },
        () => {
          void (async () => {
            const { data: msgs } = await supabase
              .from(tabMsg)
              .select("id, solicitacao_id, autor, usuario_id, texto, visto, created_at")
              .eq("solicitacao_id", solicitacaoId)
              .order("created_at", { ascending: true })
              .limit(50);
            await aplicarMensagensComNomes(msgs as MensagemRow[] | null);
          })();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [solicitacaoId, aplicarMensagensComNomes, tabMsg, origem]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensagens.length]);

  async function enviarMensagem() {
    if (!podeInteragir) return;
    setErr("");
    const tx = texto.trim();
    if (!tx || !user?.id) return;
    setSending(true);
    try {
      const proximoAguarda = meuPapel === "gestor" ? "operadora" : "gestor";
      const { error: e1 } = await supabase.from(tabMsg).insert({
        solicitacao_id: solicitacaoId,
        autor: meuPapel,
        usuario_id: user.id,
        texto: tx,
      });
      if (e1) {
        setErr(e1.message ?? "Erro ao enviar.");
        return;
      }
      const { error: e2 } = await supabase
        .from(tabSol)
        .update({
          status: "em_andamento",
          aguarda_resposta_de: proximoAguarda,
        })
        .eq("id", solicitacaoId);
      if (e2) setErr(e2.message ?? "Mensagem enviada, mas falhou ao atualizar status.");
      setTexto("");
      await carregar();
    } finally {
      setSending(false);
    }
  }

  async function resolver() {
    if (!podeInteragir || !staff) return;
    setResolvendo(true);
    setErr("");
    try {
      const { error } = await supabase
        .from(tabSol)
        .update({
          status: "resolvido",
          aguarda_resposta_de: null,
          resolvido_em: new Date().toISOString(),
        })
        .eq("id", solicitacaoId);
      if (error) {
        setErr(error.message ?? "Erro ao resolver.");
        return;
      }
      onResolvido?.();
      onClose();
    } finally {
      setResolvendo(false);
    }
  }

  const op = operadoras.find((o) => o.slug === cab?.operadora_slug);
  const isCampanha = cab?.origem === "campanha_roteiro";
  const isMesaRoteiro = cab?.origem === "roteiro_mesa";
  const foto = !isCampanha && !isMesaRoteiro ? ((cab as SolicitacaoCabecalhoDealer | null)?.dealers?.fotos ?? [])[0] as string | undefined : undefined;
  const nick = isCampanha
    ? (cab as SolicitacaoCabecalhoCampanha).campanha?.titulo?.trim() || (cab as SolicitacaoCabecalhoCampanha).titulo?.trim() || "Campanha"
    : isMesaRoteiro
      ? (cab as SolicitacaoCabecalhoMesa).titulo?.trim() ||
        (cab as SolicitacaoCabecalhoMesa).sugestao?.texto?.trim()?.slice(0, 72) ||
        "Roteiro de mesa"
      : (cab as SolicitacaoCabecalhoDealer)?.dealers?.nickname ?? "Dealer";
  const statusCor = cab ? corStatusSolicitacao(cab.status) : "#6b7280";
  const tituloModal =
    cab?.origem === "campanha_roteiro"
      ? (cab.titulo ?? (cab as SolicitacaoCabecalhoCampanha).campanha?.titulo ?? "Campanha — roteiro")
      : cab?.origem === "roteiro_mesa"
        ? ((cab as SolicitacaoCabecalhoMesa).titulo ?? "Roteiro de mesa")
        : cab?.titulo ?? "Solicitação";

  return (
    <ModalBase onClose={() => { if (!sending && !resolvendo) onClose(); }} maxWidth={560} zIndex={1100}>
      <ModalHeader title={tituloModal} onClose={() => { if (!sending && !resolvendo) onClose(); }} />
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
          <Loader2 size={28} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
        </div>
      ) : !cab ? (
        <p style={{ color: t.textMuted, fontFamily: FONT.body }}>Solicitação não encontrada ou sem permissão.</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "flex-start" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                overflow: "hidden",
                flexShrink: 0,
                background: "linear-gradient(135deg, #1a1a2e, #2d1b4e)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 800,
                fontFamily: FONT.body,
                fontSize: 18,
              }}
            >
              {isCampanha ? (
                <Megaphone size={22} aria-hidden style={{ opacity: 0.95 }} />
              ) : isMesaRoteiro ? (
                <FileText size={22} aria-hidden style={{ opacity: 0.95 }} />
              ) : foto ? (
                <img src={foto} alt="" width={48} height={48} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                nick[0]?.toUpperCase()
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: t.text, fontFamily: FONT.body }}>
                {isCampanha
                  ? `${nick} · Roteiro de mesa`
                  : isMesaRoteiro
                    ? `${nick} · Sugestão de roteiro`
                    : `${nick} · ${labelTipoSolicitacao((cab as SolicitacaoCabecalhoDealer).tipo)}`}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 6 }}>
                <OperadoraTag label={op?.nome ?? cab.operadora_slug} corPrimaria={op?.brand_action} />
                <span style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>{tempoRelativo(cab.created_at)}</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "3px 9px",
                    borderRadius: 20,
                    background: `${statusCor}22`,
                    color: statusCor,
                    border: `1px solid ${statusCor}44`,
                    fontFamily: FONT.body,
                  }}
                >
                  {cab.status === "pendente" ? "Pendente" : cab.status === "em_andamento" ? "Em andamento" : cab.status === "resolvido" ? "Resolvido" : cab.status}
                </span>
              </div>
            </div>
          </div>

          <div
            ref={listRef}
            style={{
              maxHeight: 280,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: "12px 4px",
              marginBottom: 12,
              borderTop: `1px solid ${t.cardBorder}`,
              borderBottom: `1px solid ${t.cardBorder}`,
            }}
          >
            {mensagens.map((m) => {
              const daOperadora = m.autor === "operadora";
              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: daOperadora ? "flex-end" : "flex-start",
                    maxWidth: "88%",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      background: daOperadora
                        ? brand.useBrand
                          ? "color-mix(in srgb, var(--brand-accent) 18%, transparent)"
                          : "rgba(30,54,248,0.12)"
                        : "rgba(74,32,130,0.1)",
                      border: `1px solid ${
                        daOperadora
                          ? brand.useBrand
                            ? "color-mix(in srgb, var(--brand-accent) 35%, transparent)"
                            : "rgba(30,54,248,0.28)"
                          : "var(--brand-secondary, #4a2082)55"
                      }`,
                      color: t.text,
                      fontSize: 13,
                      fontFamily: FONT.body,
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.45,
                    }}
                  >
                    {m.texto}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: t.textMuted,
                      marginTop: 4,
                      textAlign: daOperadora ? "right" : "left",
                      fontFamily: FONT.body,
                      lineHeight: 1.35,
                    }}
                  >
                    <div>{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                    <div style={{ marginTop: 2, fontWeight: 600, color: t.textMuted }}>{m.nomeRemetente}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {cab.status !== "resolvido" && cab.status !== "cancelado" && podeInteragir ? (
            <>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Escrever mensagem..."
                  disabled={sending}
                  rows={2}
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 10,
                    border: `1px solid ${t.cardBorder}`,
                    background: t.inputBg ?? t.cardBg,
                    color: t.text,
                    fontFamily: FONT.body,
                    fontSize: 13,
                    resize: "none",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  aria-label="Enviar mensagem"
                  disabled={sending || !texto.trim()}
                  onClick={() => void enviarMensagem()}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    border: "none",
                    background: brand.useBrand
                      ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
                      : "linear-gradient(135deg, #4a2082, #1e36f8)",
                    color: "#fff",
                    cursor: sending || !texto.trim() ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    opacity: sending || !texto.trim() ? 0.5 : 1,
                  }}
                >
                  {sending ? <Loader2 size={18} className="app-lucide-spin" color="#fff" aria-hidden /> : <Send size={18} aria-hidden />}
                </button>
              </div>
              {err ? (
                <div role="alert" style={{ color: "#ef4444", fontSize: 12, marginTop: 10, fontFamily: FONT.body }}>
                  {err}
                </div>
              ) : null}
              {staff ? (
                <button
                  type="button"
                  disabled={resolvendo}
                  onClick={() => void resolver()}
                  style={{
                    marginTop: 14,
                    width: "100%",
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: `1px solid #22c55e55`,
                    background: "rgba(34,197,94,0.12)",
                    color: "#22c55e",
                    fontWeight: 700,
                    fontFamily: FONT.body,
                    cursor: resolvendo ? "not-allowed" : "pointer",
                  }}
                >
                  {resolvendo ? "Salvando..." : "Marcar como resolvido"}
                </button>
              ) : null}
            </>
          ) : cab.status !== "resolvido" && cab.status !== "cancelado" && !podeInteragir ? (
            <p style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, margin: 0, fontStyle: "italic" }}>
              Sem permissão para responder nesta página. Apenas visualização.
            </p>
          ) : (
            <p style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body, margin: 0 }}>Esta solicitação está encerrada.</p>
          )}
        </>
      )}
    </ModalBase>
  );
}
