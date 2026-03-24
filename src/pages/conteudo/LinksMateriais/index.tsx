import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import { Link2, Copy, Check, AlertCircle } from "lucide-react";
import { GiShare } from "react-icons/gi";

const TRACKING_BASE = "https://go.aff.casadeapostas.bet.br/lkp84bia?utm_source=";

type RpcResult = { ok: boolean; error?: string; utm_source?: string };

export default function LinksMateriais() {
  const { theme: t, user, isDark } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("links_materiais");
  const dark = isDark ?? false;

  const [nomeArtistico, setNomeArtistico] = useState("");
  const [utmInput, setUtmInput] = useState("");
  const [emitido, setEmitido] = useState(false);
  const [linkCompleto, setLinkCompleto] = useState("");
  const [loadingPerfil, setLoadingPerfil] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const podeEmitir = user?.role === "influencer";

  const carregarPerfil = useCallback(async () => {
    if (!user?.id || user.role !== "influencer") {
      setLoadingPerfil(false);
      setNomeArtistico("");
      setUtmInput("");
      return;
    }
    setLoadingPerfil(true);
    const { data, error } = await supabase
      .from("influencer_perfil")
      .select("nome_artistico")
      .eq("id", user.id)
      .maybeSingle();
    setLoadingPerfil(false);
    if (error) {
      console.error("[LinksMateriais] perfil:", error.message);
      setNomeArtistico("");
      setUtmInput("");
      return;
    }
    const nome = (data?.nome_artistico ?? "").trim();
    setNomeArtistico(nome);
    setUtmInput(nome);
  }, [user?.id, user?.role]);

  useEffect(() => {
    void carregarPerfil();
  }, [carregarPerfil]);

  async function emitir() {
    if (!podeEmitir || !user?.id) return;
    const raw = utmInput.trim();
    if (!raw) {
      setErro("Preencha o valor do UTM antes de emitir.");
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      const { data, error } = await supabase.rpc("registrar_utm_alias_tracking_casa_apostas", {
        p_utm_source: raw,
      });
      if (error) {
        setErro(error.message || "Não foi possível registrar o UTM.");
        setSalvando(false);
        return;
      }
      const res = data as RpcResult | null;
      if (!res?.ok) {
        setErro(res?.error ?? "Não foi possível registrar o UTM.");
        setSalvando(false);
        return;
      }
      const finalSource = (res.utm_source ?? raw).trim();
      setLinkCompleto(`${TRACKING_BASE}${encodeURIComponent(finalSource)}`);
      setEmitido(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    }
    setSalvando(false);
  }

  async function copiar() {
    if (!linkCompleto) return;
    try {
      await navigator.clipboard.writeText(linkCompleto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  }

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar Links e Materiais.
      </div>
    );
  }

  const cardBg = brand.useBrand
    ? "color-mix(in srgb, var(--brand-secondary) 8%, transparent)"
    : dark
      ? "rgba(255,255,255,0.04)"
      : "rgba(74,32,130,0.06)";
  const cardBorder = t.cardBorder;

  return (
    <div className="app-page-shell">
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 44, height: 44, borderRadius: 12,
            background: brand.useBrand
              ? "color-mix(in srgb, var(--brand-primary) 18%, transparent)"
              : "rgba(124,58,237,0.15)",
            color: brand.useBrand ? "var(--brand-icon)" : "#a78bfa",
          }}>
            <GiShare size={22} />
          </span>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              color: t.text,
              fontFamily: FONT_TITLE,
              letterSpacing: "-0.02em",
            }}>
              Links e Materiais
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
              Gere seu link de rastreamento e mantenha o UTM alinhado à Gestão de Links.
            </p>
          </div>
        </div>
      </div>

      <section
        style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 16,
          padding: 20,
          maxWidth: 960,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Link2 size={18} color={brand.useBrand ? "var(--brand-accent)" : "#1e36f8"} />
          <h2 style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 700,
            color: t.text,
            fontFamily: FONT_TITLE,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}>
            Link de rastreamento
          </h2>
        </div>

        {!podeEmitir && (
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: 12,
            borderRadius: 12,
            background: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.35)",
            color: t.text,
            fontSize: 13,
            fontFamily: FONT.body,
            marginBottom: 16,
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2, color: "#f59e0b" }} />
            <span>
              A emissão do link com registro automático no UTM está disponível para o perfil <strong>influencer</strong>.
              Com outro tipo de conta você pode usar o link abaixo manualmente; o mapeamento em Gestão de Links deve ser feito pela equipe.
            </span>
          </div>
        )}

        {erro && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(232,64,37,0.12)",
            border: "1px solid rgba(232,64,37,0.35)",
            color: t.text,
            fontSize: 13,
            fontFamily: FONT.body,
            marginBottom: 14,
          }}>
            <AlertCircle size={16} color="#e84025" />
            {erro}
          </div>
        )}

        {!emitido ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                URL base
              </label>
              <div style={{
                padding: "12px 14px",
                borderRadius: 12,
                background: dark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.04)",
                border: `1px solid ${cardBorder}`,
                fontFamily: "ui-monospace, monospace",
                fontSize: 12,
                color: t.text,
                wordBreak: "break-all",
                lineHeight: 1.5,
              }}>
                {TRACKING_BASE}
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 12 }}>
              <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Valor do utm_source
                </label>
                <input
                  type="text"
                  value={utmInput}
                  onChange={(e) => setUtmInput(e.target.value)}
                  disabled={!podeEmitir || loadingPerfil || salvando}
                  placeholder={nomeArtistico || "Ex.: seu nome artístico"}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: `1px solid ${cardBorder}`,
                    background: t.cardBg,
                    color: t.text,
                    fontSize: 14,
                    fontFamily: FONT.body,
                    outline: "none",
                  }}
                />
                <p style={{ margin: "8px 0 0", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
                  Pré-preenchido com seu nome artístico quando disponível; você pode ajustar antes de emitir.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void emitir()}
                disabled={!podeEmitir || loadingPerfil || salvando}
                style={{
                  flexShrink: 0,
                  padding: "12px 22px",
                  borderRadius: 12,
                  border: "none",
                  cursor: (!podeEmitir || loadingPerfil || salvando) ? "not-allowed" : "pointer",
                  opacity: (!podeEmitir || loadingPerfil || salvando) ? 0.55 : 1,
                  fontWeight: 700,
                  fontSize: 14,
                  fontFamily: FONT.body,
                  background: brand.useBrand ? "var(--brand-primary)" : "linear-gradient(135deg, #7c3aed, #1e36f8)",
                  color: "#fff",
                }}
              >
                {salvando ? "Emitindo…" : "Emitir"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
              Link gerado. Ele já está associado ao seu perfil em <strong>utm_aliases</strong> para rastreio na operação.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: 10 }}>
              <div style={{
                flex: "1 1 280px",
                minWidth: 0,
                padding: "12px 14px",
                borderRadius: 12,
                background: dark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.04)",
                border: `1px solid ${cardBorder}`,
                fontFamily: "ui-monospace, monospace",
                fontSize: 12,
                color: t.text,
                wordBreak: "break-all",
                lineHeight: 1.5,
                display: "flex",
                alignItems: "center",
              }}>
                {linkCompleto}
              </div>
              <button
                type="button"
                onClick={() => void copiar()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 18px",
                  borderRadius: 12,
                  border: `1px solid ${cardBorder}`,
                  background: t.cardBg,
                  color: t.text,
                  fontWeight: 600,
                  fontSize: 13,
                  fontFamily: FONT.body,
                  cursor: "pointer",
                }}
              >
                {copiado ? <Check size={18} color="#22c55e" /> : <Copy size={18} />}
                {copiado ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
