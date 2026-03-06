import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../../context/AppContext";
import { supabase } from "../../../lib/supabase";
import { UtmAlias } from "../../../types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface InfluencerOpcao {
  id:            string;
  nome_artistico: string;
}

type Aba = "pendentes" | "mapeados" | "ignorados";

// ─── Componente principal ─────────────────────────────────────────────────────

export default function GestaoLinks() {
  const { theme, user } = useApp();

  const [aba, setAba] = useState<Aba>("pendentes");
  const [aliases, setAliases] = useState<UtmAlias[]>([]);
  const [loading, setLoading] = useState(true);
  const [influencers, setInfluencers] = useState<InfluencerOpcao[]>([]);

  // Modal de mapeamento
  const [modalAberto, setModalAberto] = useState(false);
  const [aliasSelecionado, setAliasSelecionado] = useState<UtmAlias | null>(null);
  const [influencerSelecionado, setInfluencerSelecionado] = useState("");
  const [salvando, setSalvando] = useState(false);

  // ── Carrega dados ──────────────────────────────────────────────────────────

  const carregar = useCallback(async () => {
    setLoading(true);

    const statusFiltro: Record<Aba, string> = {
      pendentes: "pendente",
      mapeados:  "mapeado",
      ignorados: "ignorado",
    };

    const { data, error } = await supabase
      .from("utm_aliases")
      .select(`
        *,
        influencer_perfil:influencer_id (
          nome_artistico
        )
      `)
      .eq("status", statusFiltro[aba])
      .order("total_ftds", { ascending: false });

    if (error) {
      console.error("Erro ao carregar utm_aliases:", error.message);
      setAliases([]);
    } else {
      const mapped = (data ?? []).map((r: any) => ({
        ...r,
        influencer_name: r.influencer_perfil?.nome_artistico ?? null,
      }));
      setAliases(mapped);
    }

    setLoading(false);
  }, [aba]);

  useEffect(() => { carregar(); }, [carregar]);

  // Carrega lista de influencers para o modal
  useEffect(() => {
    supabase
      .from("influencer_perfil")
      .select("id, nome_artistico")
      .eq("status", "ativo")
      .order("nome_artistico")
      .then(({ data }) => setInfluencers(data ?? []));
  }, []);

  // ── Contagem de pendentes para badge ───────────────────────────────────────

  const [totalPendentes, setTotalPendentes] = useState(0);
  useEffect(() => {
    supabase
      .from("utm_aliases")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendente")
      .then(({ count }) => setTotalPendentes(count ?? 0));
  }, [aliases]);

  // ── Ações ──────────────────────────────────────────────────────────────────

  function abrirModal(alias: UtmAlias) {
    setAliasSelecionado(alias);
    setInfluencerSelecionado("");
    setModalAberto(true);
  }

  async function confirmarMapeamento() {
    if (!aliasSelecionado || !influencerSelecionado) return;
    setSalvando(true);

    const { error } = await supabase
      .from("utm_aliases")
      .update({
        influencer_id: influencerSelecionado,
        status:        "mapeado",
        mapeado_por:   user?.id ?? null,
        mapeado_em:    new Date().toISOString(),
      })
      .eq("id", aliasSelecionado.id);

    setSalvando(false);
    setModalAberto(false);

    if (!error) carregar();
    else console.error("Erro ao mapear:", error.message);
  }

  async function ignorar(alias: UtmAlias) {
    const { error } = await supabase
      .from("utm_aliases")
      .update({ status: "ignorado" })
      .eq("id", alias.id);

    if (!error) carregar();
    else console.error("Erro ao ignorar:", error.message);
  }

  async function reativar(alias: UtmAlias) {
    const { error } = await supabase
      .from("utm_aliases")
      .update({ status: "pendente", influencer_id: null, mapeado_por: null, mapeado_em: null })
      .eq("id", alias.id);

    if (!error) carregar();
    else console.error("Erro ao reativar:", error.message);
  }

  // ─── Estilos ───────────────────────────────────────────────────────────────

  const s = {
    page: {
      padding: "32px",
      maxWidth: "1100px",
    } as React.CSSProperties,

    title: {
      fontSize: "22px",
      fontWeight: 700,
      color: theme.text,
      marginBottom: "4px",
    } as React.CSSProperties,

    subtitle: {
      fontSize: "13px",
      color: theme.textMuted,
      marginBottom: "28px",
    } as React.CSSProperties,

    abas: {
      display: "flex",
      gap: "4px",
      borderBottom: `1px solid ${theme.border}`,
      marginBottom: "24px",
    } as React.CSSProperties,

    aba: (ativa: boolean): React.CSSProperties => ({
      padding: "8px 18px",
      fontSize: "13px",
      fontWeight: ativa ? 600 : 400,
      color: ativa ? theme.accent : theme.textMuted,
      borderBottom: ativa ? `2px solid ${theme.accent}` : "2px solid transparent",
      cursor: "pointer",
      background: "none",
      border: "none",
      borderRadius: "4px 4px 0 0",
      transition: "all 0.15s",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    }),

    badge: {
      background: "#ef4444",
      color: "#fff",
      borderRadius: "10px",
      padding: "1px 7px",
      fontSize: "11px",
      fontWeight: 700,
    } as React.CSSProperties,

    tabela: {
      width: "100%",
      borderCollapse: "collapse" as const,
      fontSize: "13px",
    } as React.CSSProperties,

    th: {
      textAlign: "left" as const,
      padding: "10px 14px",
      color: theme.textMuted,
      fontWeight: 600,
      fontSize: "11px",
      textTransform: "uppercase" as const,
      borderBottom: `1px solid ${theme.border}`,
      letterSpacing: "0.05em",
    } as React.CSSProperties,

    td: {
      padding: "12px 14px",
      color: theme.text,
      borderBottom: `1px solid ${theme.border}`,
      verticalAlign: "middle" as const,
    } as React.CSSProperties,

    tdMuted: {
      padding: "12px 14px",
      color: theme.textMuted,
      borderBottom: `1px solid ${theme.border}`,
      verticalAlign: "middle" as const,
      fontSize: "12px",
    } as React.CSSProperties,

    btnMapear: {
      padding: "5px 14px",
      background: theme.accent,
      color: "#fff",
      border: "none",
      borderRadius: "6px",
      fontSize: "12px",
      fontWeight: 600,
      cursor: "pointer",
      marginRight: "6px",
    } as React.CSSProperties,

    btnIgnorar: {
      padding: "5px 14px",
      background: "transparent",
      color: theme.textMuted,
      border: `1px solid ${theme.border}`,
      borderRadius: "6px",
      fontSize: "12px",
      cursor: "pointer",
    } as React.CSSProperties,

    btnReativar: {
      padding: "5px 14px",
      background: "transparent",
      color: theme.textMuted,
      border: `1px solid ${theme.border}`,
      borderRadius: "6px",
      fontSize: "12px",
      cursor: "pointer",
    } as React.CSSProperties,

    empty: {
      textAlign: "center" as const,
      padding: "60px 0",
      color: theme.textMuted,
      fontSize: "14px",
    } as React.CSSProperties,

    ggrPositivo: { color: "#22c55e", fontWeight: 600 } as React.CSSProperties,
    ggrNegativo: { color: "#ef4444", fontWeight: 600 } as React.CSSProperties,

    // Modal
    overlay: {
      position: "fixed" as const,
      inset: 0,
      background: "rgba(0,0,0,0.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    } as React.CSSProperties,

    modal: {
      background: theme.cardBg,
      border: `1px solid ${theme.border}`,
      borderRadius: "12px",
      padding: "28px 32px",
      width: "420px",
      maxWidth: "90vw",
    } as React.CSSProperties,

    modalTitle: {
      fontSize: "16px",
      fontWeight: 700,
      color: theme.text,
      marginBottom: "6px",
    } as React.CSSProperties,

    modalSub: {
      fontSize: "12px",
      color: theme.textMuted,
      marginBottom: "22px",
    } as React.CSSProperties,

    label: {
      fontSize: "12px",
      fontWeight: 600,
      color: theme.textMuted,
      display: "block",
      marginBottom: "6px",
      textTransform: "uppercase" as const,
      letterSpacing: "0.05em",
    } as React.CSSProperties,

    select: {
      width: "100%",
      padding: "10px 12px",
      background: theme.inputBg,
      border: `1px solid ${theme.border}`,
      borderRadius: "8px",
      color: theme.text,
      fontSize: "14px",
      marginBottom: "22px",
      outline: "none",
    } as React.CSSProperties,

    modalBtns: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "10px",
    } as React.CSSProperties,

    btnCancelar: {
      padding: "9px 20px",
      background: "transparent",
      border: `1px solid ${theme.border}`,
      borderRadius: "8px",
      color: theme.textMuted,
      fontSize: "13px",
      cursor: "pointer",
    } as React.CSSProperties,

    btnConfirmar: {
      padding: "9px 20px",
      background: theme.accent,
      border: "none",
      borderRadius: "8px",
      color: "#fff",
      fontSize: "13px",
      fontWeight: 600,
      cursor: influencerSelecionado && !salvando ? "pointer" : "not-allowed",
      opacity: influencerSelecionado && !salvando ? 1 : 0.5,
    } as React.CSSProperties,

    utmTag: {
      display: "inline-block",
      background: theme.accent + "22",
      color: theme.accent,
      border: `1px solid ${theme.accent}44`,
      borderRadius: "6px",
      padding: "2px 8px",
      fontSize: "12px",
      fontWeight: 600,
      fontFamily: "monospace",
    } as React.CSSProperties,
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const emptyMessages: Record<Aba, string> = {
    pendentes: "Nenhum link órfão pendente. Tudo mapeado! 🎉",
    mapeados:  "Nenhum link mapeado ainda.",
    ignorados: "Nenhum link ignorado.",
  };

  return (
    <div style={s.page}>
      {/* Cabeçalho */}
      <div style={s.title}>
        🔗 Gestão de Links
        {totalPendentes > 0 && (
          <span style={{ ...s.badge, marginLeft: "10px", fontSize: "12px" }}>
            {totalPendentes} pendente{totalPendentes !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div style={s.subtitle}>
        Links de rastreio detectados na Casa de Apostas que não estão associados a nenhum influencer.
      </div>

      {/* Abas */}
      <div style={s.abas}>
        <button style={s.aba(aba === "pendentes")} onClick={() => setAba("pendentes")}>
          Pendentes
          {totalPendentes > 0 && <span style={s.badge}>{totalPendentes}</span>}
        </button>
        <button style={s.aba(aba === "mapeados")} onClick={() => setAba("mapeados")}>
          Mapeados
        </button>
        <button style={s.aba(aba === "ignorados")} onClick={() => setAba("ignorados")}>
          Ignorados
        </button>
      </div>

      {/* Tabela */}
      {loading ? (
        <div style={s.empty}>Carregando...</div>
      ) : aliases.length === 0 ? (
        <div style={s.empty}>{emptyMessages[aba]}</div>
      ) : (
        <table style={s.tabela}>
          <thead>
            <tr>
              <th style={s.th}>UTM Source</th>
              <th style={s.th}>Primeiro visto</th>
              <th style={s.th}>Último visto</th>
              <th style={{ ...s.th, textAlign: "right" }}>FTDs</th>
              <th style={{ ...s.th, textAlign: "right" }}>Depósitos</th>
              <th style={{ ...s.th, textAlign: "right" }}>GGR</th>
              {aba === "mapeados" && <th style={s.th}>Influencer</th>}
              <th style={s.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {aliases.map((alias) => (
              <tr key={alias.id}>
                <td style={s.td}>
                  <span style={s.utmTag}>{alias.utm_source}</span>
                </td>
                <td style={s.tdMuted}>{fmtData(alias.primeiro_visto)}</td>
                <td style={s.tdMuted}>{fmtData(alias.ultimo_visto)}</td>
                <td style={{ ...s.td, textAlign: "right" }}>{alias.total_ftds}</td>
                <td style={{ ...s.td, textAlign: "right" }}>{fmt(alias.total_deposit)}</td>
                <td style={{ ...s.td, textAlign: "right" }}>
                  <span style={alias.ggr >= 0 ? s.ggrPositivo : s.ggrNegativo}>
                    {fmt(alias.ggr)}
                  </span>
                </td>
                {aba === "mapeados" && (
                  <td style={s.td}>{alias.influencer_name ?? "—"}</td>
                )}
                <td style={s.td}>
                  {aba === "pendentes" && (
                    <>
                      <button style={s.btnMapear} onClick={() => abrirModal(alias)}>
                        Mapear
                      </button>
                      <button style={s.btnIgnorar} onClick={() => ignorar(alias)}>
                        Ignorar
                      </button>
                    </>
                  )}
                  {(aba === "mapeados" || aba === "ignorados") && (
                    <button style={s.btnReativar} onClick={() => reativar(alias)}>
                      Reabrir
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal de mapeamento */}
      {modalAberto && aliasSelecionado && (
        <div style={s.overlay} onClick={() => setModalAberto(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalTitle}>Mapear link órfão</div>
            <div style={s.modalSub}>
              Associe o UTM <strong>{aliasSelecionado.utm_source}</strong> ao influencer correto.
              O sync automático passará a incluir os dados deste link no influencer selecionado.
            </div>

            {/* Info resumida do alias */}
            <div style={{
              background: theme.inputBg,
              border: `1px solid ${theme.border}`,
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "20px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "8px",
            }}>
              {[
                { label: "FTDs", value: aliasSelecionado.total_ftds },
                { label: "Depósitos", value: fmt(aliasSelecionado.total_deposit) },
                { label: "GGR", value: fmt(aliasSelecionado.ggr) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: "10px", color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: theme.text }}>{value}</div>
                </div>
              ))}
            </div>

            <label style={s.label}>Influencer</label>
            <select
              style={s.select}
              value={influencerSelecionado}
              onChange={(e) => setInfluencerSelecionado(e.target.value)}
            >
              <option value="">Selecione o influencer...</option>
              {influencers.map((inf) => (
                <option key={inf.id} value={inf.id}>
                  {inf.nome_artistico}
                </option>
              ))}
            </select>

            <div style={s.modalBtns}>
              <button style={s.btnCancelar} onClick={() => setModalAberto(false)}>
                Cancelar
              </button>
              <button
                style={s.btnConfirmar}
                onClick={confirmarMapeamento}
                disabled={!influencerSelecionado || salvando}
              >
                {salvando ? "Salvando..." : "Confirmar mapeamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
