import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { UtmAlias } from "../../../types";
import { X, Link2, EyeOff, RotateCcw, AlertCircle } from "lucide-react";
import { GiLinkedRings } from "react-icons/gi";

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

function calcGgr(alias: { total_deposit?: number; total_withdrawal?: number; ggr?: number }): number {
  if (alias.ggr != null) return alias.ggr;
  return (alias.total_deposit ?? 0) - (alias.total_withdrawal ?? 0);
}

function fmt(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

interface InfluencerOpcao { id: string; nome_artistico: string; status: string; }
type Aba = "pendentes" | "mapeados" | "ignorados";

export default function GestaoLinks() {
  const { theme, user, podeVerInfluencer } = useApp();
  const perm = usePermission("gestao_links");
  const { showFiltroOperadora } = useDashboardFiltros();

  const podeMapearAlias   = () => perm.canEditarOk;
  const podeReativarAlias = (alias: UtmAlias) =>
    perm.canEditarOk && (perm.canEditar !== "proprios" || !alias.influencer_id || podeVerInfluencer(alias.influencer_id));

  const [aba, setAba] = useState<Aba>("pendentes");
  const [operadoraFiltro, setOperadoraFiltro] = useState("todas");
  const [operadorasList, setOperadorasList] = useState<{ slug: string; nome: string }[]>([]);
  const [aliases, setAliases] = useState<UtmAlias[]>([]);
  const [loading, setLoading] = useState(true);
  const [influencers, setInfluencers] = useState<InfluencerOpcao[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [aliasSelecionado, setAliasSelecionado] = useState<UtmAlias | null>(null);
  const [influencerSelecionado, setInfluencerSelecionado] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const statusFiltro: Record<Aba, string> = { pendentes: "pendente", mapeados: "mapeado", ignorados: "ignorado" };
    let query = supabase.from("utm_aliases").select("*").eq("status", statusFiltro[aba]).order("total_ftds", { ascending: false });
    if (operadoraFiltro !== "todas") query = query.eq("operadora_slug", operadoraFiltro);
    const { data, error } = await query;
    if (error) { console.error("Erro ao carregar utm_aliases:", error.message); setAliases([]); setLoading(false); return; }
    const aliasData = data ?? [];
    let infNomeMap = new Map<string, string>();
    if (aba === "mapeados") {
      const influencerIds = aliasData.map((r: any) => r.influencer_id).filter(Boolean);
      if (influencerIds.length > 0) {
        const { data: infData } = await supabase.from("influencer_perfil").select("id, nome_artistico").in("id", influencerIds);
        infNomeMap = new Map((infData ?? []).map((i: any) => [i.id, i.nome_artistico]));
      }
    }
    setAliases(aliasData.map((r: any) => ({ ...r, influencer_name: r.influencer_id ? (infNomeMap.get(r.influencer_id) ?? "—") : null })));
    setLoading(false);
  }, [aba, operadoraFiltro]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { supabase.from("operadoras").select("slug, nome").order("nome").then(({ data }) => setOperadorasList(data ?? [])); }, []);
  useEffect(() => { supabase.from("influencer_perfil").select("id, nome_artistico, status").order("nome_artistico").then(({ data }) => setInfluencers(data ?? [])); }, []);

  const [totalPendentes, setTotalPendentes] = useState(0);
  useEffect(() => {
    let q = supabase.from("utm_aliases").select("id", { count: "exact", head: true }).eq("status", "pendente");
    if (operadoraFiltro !== "todas") q = q.eq("operadora_slug", operadoraFiltro);
    q.then(({ count }) => setTotalPendentes(count ?? 0));
  }, [aliases, operadoraFiltro]);

  function abrirModal(alias: UtmAlias) { setAliasSelecionado(alias); setInfluencerSelecionado(""); setErroModal(null); setModalAberto(true); }

  async function confirmarMapeamento() {
    if (!aliasSelecionado || !influencerSelecionado) return;
    if (perm.canEditar === "proprios" && !podeVerInfluencer(influencerSelecionado)) return;
    setSalvando(true); setErroModal(null);
    const { error } = await supabase.from("utm_aliases").update({ influencer_id: influencerSelecionado, status: "mapeado", mapeado_por: user?.id ?? null, mapeado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() }).eq("id", aliasSelecionado.id);
    if (error) { setSalvando(false); setErroModal(`Erro ao salvar: ${error.message}`); return; }

    // RPC: copia utm_metricas_diarias → influencer_metricas (sem chamar API)
    let linhasCopiadas = 0;
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc("aplicar_mapeamento_utm", {
        p_utm_source: aliasSelecionado.utm_source,
        p_influencer_id: influencerSelecionado,
      });
      if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
        const row = rpcData[0] as { linhas_copiadas?: number };
        linhasCopiadas = Number(row?.linhas_copiadas ?? 0);
      }
    } catch (_e) { /* RPC pode não existir ainda */ }

    // Se utm_metricas_diarias estava vazio, dispara sync (fallback)
    if (linhasCopiadas === 0) {
      const dataInicio = (aliasSelecionado.primeiro_visto ?? "2025-12-01").split("T")[0];
      const dataFim = (aliasSelecionado.ultimo_visto ?? new Date().toISOString().split("T")[0]).split("T")[0];
      try {
        await supabase.functions.invoke("sync-metricas", {
          body: { data_inicio: dataInicio, data_fim: dataFim, utm_source: aliasSelecionado.utm_source, skip_orfaos: true },
        });
      } catch (e) {
        console.warn("[GestaoLinks] Sync fallback:", e);
      }
    }

    setSalvando(false);
    setModalAberto(false); setAliasSelecionado(null); setInfluencerSelecionado(""); carregar();
  }

  async function ignorar(alias: UtmAlias) {
    const { error } = await supabase.from("utm_aliases").update({ status: "ignorado", atualizado_em: new Date().toISOString() }).eq("id", alias.id);
    if (!error) carregar();
  }

  async function reativar(alias: UtmAlias) {
    const { error } = await supabase.from("utm_aliases").update({ status: "pendente", influencer_id: null, mapeado_por: null, mapeado_em: null, atualizado_em: new Date().toISOString() }).eq("id", alias.id);
    if (!error) carregar();
  }

  // ─── Estilos ──────────────────────────────────────────────────────────────
  // th e td sem whiteSpace nowrap — cada coluna controla individualmente
  const th: React.CSSProperties = {
    textAlign: "left", padding: "10px 14px", color: theme.textMuted,
    fontWeight: 700, fontSize: 11, textTransform: "uppercase",
    letterSpacing: "0.08em", fontFamily: FONT.body,
    background: "rgba(74,32,130,0.10)", borderBottom: `1px solid ${theme.cardBorder}`,
  };
  const td: React.CSSProperties = {
    padding: "12px 14px", color: theme.text, fontFamily: FONT.body,
    fontSize: 13, verticalAlign: "middle",
    borderBottom: `1px solid ${theme.cardBorder}`,
    whiteSpace: "nowrap", // colunas numéricas e de data não quebram
  };
  const tdMuted: React.CSSProperties = { ...td, color: theme.textMuted, fontSize: 12 };
  // coluna UTM Source: permite quebra, tem maxWidth
  const tdUtm: React.CSSProperties = {
    ...td,
    whiteSpace: "normal",
    wordBreak: "break-all",
    maxWidth: 220,
  };

  const emptyMessages: Record<Aba, string> = {
    pendentes: "Nenhum link pendente. Tudo mapeado!",
    mapeados:  "Nenhum link mapeado ainda.",
    ignorados: "Nenhum link ignorado.",
  };

  if (perm.canView === "nao") {
    return <div style={{ padding: 24, textAlign: "center", color: theme.textMuted, fontFamily: FONT.body }}>Você não tem permissão para visualizar a Gestão de Links.</div>;
  }

  return (
    <div style={{ padding: "24px 32px" }}>

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 6 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: BRAND.roxo, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
          <GiLinkedRings size={14} color="#fff" />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.text, fontFamily: FONT_TITLE, margin: 0, letterSpacing: "0.5px", textTransform: "uppercase" }}>Gestão de Links</h1>
            {totalPendentes > 0 && (
              <span style={{ background: BRAND.vermelho, color: "#fff", borderRadius: 10, padding: "2px 9px", fontSize: 11, fontWeight: 700, fontFamily: FONT.body }}>
                {totalPendentes} pendente{totalPendentes !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: theme.textMuted, fontFamily: FONT.body, margin: "5px 0 0" }}>
            Links de rastreio detectados nas operadoras que não estão associados a nenhum influencer.
          </p>
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: `${BRAND.ciano}15`, border: `1px solid ${BRAND.ciano}40`, fontSize: 12, color: theme.text, fontFamily: FONT.body }}>
            <strong>Dados nos Dashboards:</strong> Ao mapear, o sync é disparado automaticamente e as linhas são criadas em <code>influencer_metricas</code>. Novos dias são incluídos pela automação diária (4h).
          </div>
        </div>
      </div>

      {/* ─── Filtro Operadora ────────────────────────────────────────────────── */}
      {showFiltroOperadora && operadorasList.length > 0 && (
        <div style={{ margin: "20px 0", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "1.2px", fontFamily: FONT.body }}>Operadora</span>
          <select value={operadoraFiltro} onChange={(e) => setOperadoraFiltro(e.target.value)}
            style={{ padding: "8px 14px", background: theme.inputBg ?? theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 10, color: theme.text, fontSize: 13, cursor: "pointer", minWidth: 180, fontFamily: FONT.body, outline: "none" }}>
            <option value="todas">Todas</option>
            {operadorasList.map((op) => (<option key={op.slug} value={op.slug}>{op.nome}</option>))}
          </select>
        </div>
      )}

      {/* ─── Abas ────────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
        {(["pendentes", "mapeados", "ignorados"] as Aba[]).map((a) => {
          const ativa = aba === a;
          return (
            <button key={a} onClick={() => setAba(a)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 20, cursor: "pointer", border: `1px solid ${ativa ? BRAND.roxoVivo : theme.cardBorder}`, background: ativa ? `${BRAND.roxoVivo}22` : (theme.inputBg ?? theme.cardBg), color: ativa ? BRAND.roxoVivo : theme.textMuted, fontSize: 13, fontWeight: ativa ? 700 : 400, fontFamily: FONT.body, transition: "all 0.15s" }}>
              {a.charAt(0).toUpperCase() + a.slice(1)}
              {a === "pendentes" && totalPendentes > 0 && (
                <span style={{ background: BRAND.vermelho, color: "#fff", borderRadius: 10, padding: "0px 6px", fontSize: 10, fontWeight: 700 }}>{totalPendentes}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Tabela ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: theme.textMuted, fontFamily: FONT.body }}>
          Carregando...
        </div>
      ) : aliases.length === 0 ? (
        <div style={{
          background: theme.cardBg, border: `1px solid ${theme.cardBorder}`,
          borderRadius: 18, padding: 60,
          textAlign: "center", color: theme.textMuted,
          fontFamily: FONT.body, fontSize: 14,
          boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
        }}>
          {emptyMessages[aba]}
        </div>
      ) : (
        // sem overflow:hidden no wrapper externo para não forçar scroll
        <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 18, boxShadow: "0 4px 20px rgba(0,0,0,0.18)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed" }}>
            <colgroup>
              {/* UTM Source: largura fixa razoável, vai quebrar internamente */}
              <col style={{ width: "22%" }} />
              {operadoraFiltro === "todas" && operadorasList.length > 1 && <col style={{ width: "12%" }} />}
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "11%" }} />
              {aba === "mapeados" && <col style={{ width: "12%" }} />}
              {/* Ações: espaço restante */}
              <col />
            </colgroup>
            <thead>
              <tr>
                <th style={th}>UTM Source</th>
                {operadoraFiltro === "todas" && operadorasList.length > 1 && <th style={th}>Operadora</th>}
                <th style={th}>1º visto</th>
                <th style={th}>Último</th>
                <th style={{ ...th, textAlign: "right" }}>FTDs</th>
                <th style={{ ...th, textAlign: "right" }}>Depósitos</th>
                <th style={{ ...th, textAlign: "right" }}>GGR</th>
                {aba === "mapeados" && <th style={th}>Influencer</th>}
                <th style={th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {aliases.map((alias, idx) => {
                const ggr = calcGgr(alias);
                const zebraStyle: React.CSSProperties = idx % 2 === 1 ? { background: "rgba(74,32,130,0.06)" } : {};
                return (
                  <tr key={alias.id} style={zebraStyle}>
                    {/* UTM Source: chip com quebra de linha e maxWidth */}
                    <td style={tdUtm}>
                      <span style={{
                        display: "inline-flex", alignItems: "flex-start", gap: 5,
                        background: `${BRAND.roxoVivo}22`, color: BRAND.roxoVivo,
                        border: `1px solid ${BRAND.roxoVivo}44`,
                        borderRadius: 6, padding: "3px 9px",
                        fontSize: 12, fontWeight: 600, fontFamily: "monospace",
                        wordBreak: "break-all", maxWidth: "100%",
                      }}>
                        <Link2 size={11} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{alias.utm_source}</span>
                      </span>
                    </td>
                    {operadoraFiltro === "todas" && operadorasList.length > 1 && (
                      <td style={td}>{operadorasList.find((o) => o.slug === alias.operadora_slug)?.nome ?? alias.operadora_slug ?? "—"}</td>
                    )}
                    <td style={tdMuted}>{fmtData(alias.primeiro_visto)}</td>
                    <td style={tdMuted}>{fmtData(alias.ultimo_visto)}</td>
                    <td style={{ ...td, textAlign: "right" }}>{alias.total_ftds}</td>
                    <td style={{ ...td, textAlign: "right" }}>{fmt(alias.total_deposit)}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <span style={ggr >= 0 ? { color: BRAND.verde, fontWeight: 600 } : { color: BRAND.vermelho, fontWeight: 600 }}>{fmt(ggr)}</span>
                    </td>
                    {aba === "mapeados" && <td style={td}>{alias.influencer_name ?? "—"}</td>}
                    <td style={td}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        {aba === "pendentes" && podeMapearAlias() && (
                          <>
                            <button onClick={() => abrirModal(alias)}
                              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`, color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer", whiteSpace: "nowrap" }}>
                              <Link2 size={12} /> Mapear
                            </button>
                            <button onClick={() => ignorar(alias)}
                              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 10, border: `1px solid ${theme.cardBorder}`, background: "transparent", color: theme.textMuted, fontSize: 12, fontFamily: FONT.body, cursor: "pointer", whiteSpace: "nowrap" }}>
                              <EyeOff size={12} /> Ignorar
                            </button>
                          </>
                        )}
                        {(aba === "mapeados" || aba === "ignorados") && podeReativarAlias(alias) && (
                          <button onClick={() => reativar(alias)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 10, border: `1px solid ${theme.cardBorder}`, background: "transparent", color: theme.text, fontSize: 12, fontFamily: FONT.body, cursor: "pointer", whiteSpace: "nowrap" }}>
                            <RotateCcw size={12} /> Reabrir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Modal ───────────────────────────────────────────────────────────── */}
      {modalAberto && aliasSelecionado && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => { if (!salvando) setModalAberto(false); }}>
          <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 20, padding: "28px 32px", width: 440, maxWidth: "90vw" }}
            onClick={(e) => e.stopPropagation()}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: theme.text, fontFamily: FONT_TITLE, letterSpacing: "0.03em" }}>Mapear link órfão</h2>
              <button onClick={() => { if (!salvando) setModalAberto(false); }} style={{ background: "none", border: "none", cursor: salvando ? "not-allowed" : "pointer", color: theme.textMuted, display: "flex", alignItems: "center", padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 12, color: theme.textMuted, marginBottom: 22, fontFamily: FONT.body }}>
              Associe o UTM <strong style={{ color: BRAND.roxoVivo }}>{aliasSelecionado.utm_source}</strong> ao influencer correto.
            </p>

            <div style={{ background: theme.inputBg ?? theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { label: "FTDs",      value: String(aliasSelecionado.total_ftds) },
                { label: "Depósitos", value: fmt(aliasSelecionado.total_deposit) },
                { label: "GGR",       value: fmt(calcGgr(aliasSelecionado)) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: FONT.body }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: theme.text, fontFamily: FONT.body }}>{value}</div>
                </div>
              ))}
            </div>

            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "1.1px", marginBottom: 6, fontFamily: FONT.body }}>Influencer</label>
            <select value={influencerSelecionado} onChange={(e) => setInfluencerSelecionado(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", background: theme.inputBg ?? theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 10, color: theme.text, fontSize: 14, marginBottom: 16, outline: "none", fontFamily: FONT.body, cursor: "pointer" }}>
              <option value="">Selecione o influencer...</option>
              {(perm.canEditar === "proprios" ? influencers.filter((inf) => podeVerInfluencer(inf.id)) : influencers).map((inf) => (
                <option key={inf.id} value={inf.id}>{inf.nome_artistico}{inf.status !== "ativo" ? ` (${inf.status})` : ""}</option>
              ))}
            </select>

            {erroModal && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: `${BRAND.vermelho}18`, border: `1px solid ${BRAND.vermelho}44`, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: BRAND.vermelho, marginBottom: 16, fontFamily: FONT.body }}>
                <AlertCircle size={14} /> {erroModal}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => { if (!salvando) setModalAberto(false); }}
                style={{ padding: "9px 20px", background: "transparent", border: `1px solid ${theme.cardBorder}`, borderRadius: 10, color: theme.text, fontSize: 13, fontFamily: FONT.body, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={confirmarMapeamento} disabled={!influencerSelecionado || salvando}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 20px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: FONT.body, cursor: influencerSelecionado && !salvando ? "pointer" : "not-allowed", opacity: influencerSelecionado && !salvando ? 1 : 0.5 }}>
                <Link2 size={13} />{salvando ? "Salvando..." : "Confirmar mapeamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
