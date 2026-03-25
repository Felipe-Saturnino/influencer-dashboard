import { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import { verificarElegibilidadeAgendaLive } from "../../../lib/influencerAgendaGate";
import {
  buildSpinBrandedQrPngBlob,
  buildSpinBrandedQrPreviewDataUrl,
  type SpinQrFrameVariant,
} from "../../../lib/spinQrFrameExport";
import ModalBloqueioAgendaLive from "../../lives/Agenda/ModalBloqueioAgendaLive";
import { Link2, Copy, Check, AlertCircle, QrCode, Download } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { GiShare } from "react-icons/gi";

const TRACKING_BASE = "https://go.aff.casadeapostas.bet.br/lkp84bia?utm_source=";
const PREVIA_QUADRO_MAX_W = 280;
/** Bitmap interno nítido; a escala visual vem do CSS (igual proporção aos PNG 600×760). */
const QR_SOLO_CANVAS_PX = 520;

/**
 * utm_source: só letras sem acento (A–Z, a–z), números e _.
 * Remove acentos (NFD + marcas combinantes), aspas, crase, til, etc.; espaços viram _.
 */
function sanitizarUtm(val: string): string {
  let s = val.normalize("NFD").replace(/\p{M}/gu, "");
  s = s.replace(/[\s\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]+/g, "_");
  s = s.replace(/[^a-zA-Z0-9_]/g, "");
  return s;
}

type ObterUtmEmitidoRpc = { ok: boolean; error?: string; utm_source?: string | null };

/**
 * UTM já emitido para a CDA (Links e Materiais), via RPC SECURITY DEFINER — o SELECT direto em
 * utm_aliases costuma ser bloqueado por RLS, por isso o refresh não restaurava o link.
 */
async function fetchCdaUtmEmitidoParaInfluencer(pInfluencerId: string | null): Promise<string | null> {
  const { data, error } = await supabase.rpc("obter_utm_cda_emitido_para_influencer", {
    p_influencer_id: pInfluencerId,
  });
  if (error) {
    console.error("[LinksMateriais] obter utm emitido:", error.message);
    return null;
  }
  const res = data as ObterUtmEmitidoRpc | null;
  if (!res?.ok) {
    if (res?.error) console.warn("[LinksMateriais] obter utm emitido:", res.error);
    return null;
  }
  const src = typeof res.utm_source === "string" ? res.utm_source.trim() : "";
  return src.length > 0 ? src : null;
}

type RpcResult = { ok: boolean; error?: string; utm_source?: string };

interface InfluencerOpcao {
  id: string;
  nome_artistico: string | null;
}

export default function LinksMateriais() {
  const { theme: t, user, isDark, podeVerInfluencer, setActivePage } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("links_materiais");
  const dark = isDark ?? false;

  const precisaSelecionarInfluencer = !!user && user.role !== "influencer";
  const podeEmitir = perm.canEditarOk && !perm.loading;

  const [nomeArtistico, setNomeArtistico] = useState("");
  const [utmInput, setUtmInput] = useState("");
  const [emitido, setEmitido] = useState(false);
  const [linkCompleto, setLinkCompleto] = useState("");
  const [loadingPerfil, setLoadingPerfil] = useState(true);
  const [loadingAliasInfluencer, setLoadingAliasInfluencer] = useState(false);
  const [loadingInfluenciadores, setLoadingInfluenciadores] = useState(false);
  const [influenciadores, setInfluenciadores] = useState<InfluencerOpcao[]>([]);
  const [influencerSelecionado, setInfluencerSelecionado] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [previewEscuro, setPreviewEscuro] = useState<string | null>(null);
  const [previewClaro, setPreviewClaro] = useState<string | null>(null);
  const [carregandoPreviewsQuadro, setCarregandoPreviewsQuadro] = useState(false);
  type BaixandoQrTipo = null | "plain" | SpinQrFrameVariant;
  const [baixandoQr, setBaixandoQr] = useState<BaixandoQrTipo>(null);
  const [bloqueioEmissao, setBloqueioEmissao] = useState<{
    perfilIncompleto: boolean;
    faltaPlaybook: boolean;
  } | null>(null);
  const [verificandoGateEmissao, setVerificandoGateEmissao] = useState(false);

  const carregarMeuPerfil = useCallback(async () => {
    if (!user?.id || user.role !== "influencer") {
      setLoadingPerfil(false);
      setNomeArtistico("");
      setUtmInput("");
      setEmitido(false);
      setLinkCompleto("");
      return;
    }
    setLoadingPerfil(true);
    const { data, error } = await supabase
      .from("influencer_perfil")
      .select("nome_artistico")
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      console.error("[LinksMateriais] perfil:", error.message);
      setNomeArtistico("");
      setUtmInput("");
      setEmitido(false);
      setLinkCompleto("");
      setLoadingPerfil(false);
      return;
    }
    const nome = (data?.nome_artistico ?? "").trim();
    setNomeArtistico(nome);

    const existente = await fetchCdaUtmEmitidoParaInfluencer(null);
    if (existente) {
      setEmitido(true);
      setUtmInput(existente);
      setLinkCompleto(`${TRACKING_BASE}${encodeURIComponent(existente)}`);
    } else {
      setEmitido(false);
      setLinkCompleto("");
      setUtmInput(sanitizarUtm(nome));
    }
    setLoadingPerfil(false);
  }, [user?.id, user?.role]);

  useEffect(() => {
    void carregarMeuPerfil();
  }, [carregarMeuPerfil]);

  useEffect(() => {
    if (!user || user.role === "influencer" || perm.canView === "nao") {
      setInfluenciadores([]);
      setInfluencerSelecionado("");
      setLoadingInfluenciadores(false);
      return;
    }
    let cancelled = false;
    setLoadingInfluenciadores(true);
    void (async () => {
      const { data, error } = await supabase
        .from("influencer_perfil")
        .select("id, nome_artistico")
        .order("nome_artistico");
      if (cancelled) return;
      if (error) {
        console.error("[LinksMateriais] lista influencers:", error.message);
        setInfluenciadores([]);
        setInfluencerSelecionado("");
        setLoadingInfluenciadores(false);
        return;
      }
      const rows = (data ?? []).filter((r: InfluencerOpcao) => podeVerInfluencer(r.id));
      setInfluenciadores(rows);
      if (rows.length === 1) setInfluencerSelecionado(rows[0].id);
      else setInfluencerSelecionado("");
      setLoadingInfluenciadores(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, perm.canView, podeVerInfluencer]);

  useEffect(() => {
    if (user?.role === "influencer") return;
    if (!influencerSelecionado) {
      setEmitido(false);
      setLinkCompleto("");
      setUtmInput("");
      setLoadingAliasInfluencer(false);
      return;
    }
    let cancelled = false;
    setLoadingAliasInfluencer(true);
    setEmitido(false);
    setLinkCompleto("");
    void (async () => {
      const existente = await fetchCdaUtmEmitidoParaInfluencer(influencerSelecionado);
      if (cancelled) return;
      if (existente) {
        setEmitido(true);
        setUtmInput(existente);
        setLinkCompleto(`${TRACKING_BASE}${encodeURIComponent(existente)}`);
      } else {
        const row = influenciadores.find((i) => i.id === influencerSelecionado);
        setUtmInput(sanitizarUtm((row?.nome_artistico ?? "").trim()));
      }
      setLoadingAliasInfluencer(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [influencerSelecionado, influenciadores, user?.role]);

  useEffect(() => {
    if (!linkCompleto) {
      setPreviewEscuro(null);
      setPreviewClaro(null);
      setCarregandoPreviewsQuadro(false);
      return;
    }
    let cancelled = false;
    setCarregandoPreviewsQuadro(true);
    setPreviewEscuro(null);
    setPreviewClaro(null);
    void (async () => {
      try {
        const [esc, cla] = await Promise.all([
          buildSpinBrandedQrPreviewDataUrl(linkCompleto, "dark", PREVIA_QUADRO_MAX_W),
          buildSpinBrandedQrPreviewDataUrl(linkCompleto, "light", PREVIA_QUADRO_MAX_W),
        ]);
        if (!cancelled) {
          setPreviewEscuro(esc);
          setPreviewClaro(cla);
        }
      } catch (e) {
        console.error("[LinksMateriais] preview quadros:", e);
      } finally {
        if (!cancelled) setCarregandoPreviewsQuadro(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [linkCompleto]);

  const aguardandoOpcoes =
    user?.role === "influencer"
      ? loadingPerfil
      : precisaSelecionarInfluencer &&
          (loadingInfluenciadores || (!!influencerSelecionado && loadingAliasInfluencer));

  async function emitir() {
    if (!podeEmitir || !user?.id) return;
    const raw = sanitizarUtm(utmInput).trim();
    if (!raw) {
      setErro("Preencha o valor do UTM antes de emitir.");
      return;
    }
    if (precisaSelecionarInfluencer && !influencerSelecionado) {
      setErro("Selecione o influencer.");
      return;
    }

    if (user.role === "influencer") {
      setVerificandoGateEmissao(true);
      try {
        const gate = await verificarElegibilidadeAgendaLive(user.id);
        if (gate.perfilIncompleto || gate.faltaPlaybook) {
          setBloqueioEmissao(gate);
          return;
        }
      } finally {
        setVerificandoGateEmissao(false);
      }
    }

    setErro(null);
    setSalvando(true);
    try {
      const payload =
        user.role === "influencer"
          ? { p_utm_source: raw, p_influencer_id: null }
          : { p_utm_source: raw, p_influencer_id: influencerSelecionado };
      const { data, error } = await supabase.rpc("registrar_utm_alias_tracking_casa_apostas", payload);
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

  async function baixarQrPng() {
    if (!linkCompleto) return;
    setErro(null);
    try {
      setBaixandoQr("plain");
      const canvas = document.createElement("canvas");
      await QRCode.toCanvas(canvas, linkCompleto, {
        width: 512,
        margin: 2,
        color: { dark: "#14141a", light: "#ffffff" },
      });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "spin-qrcode-apenas-codigo.png";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      setErro("Não foi possível baixar o QR Code. Tente novamente.");
    } finally {
      setBaixandoQr(null);
    }
  }

  async function baixarQuadroSpin(variant: SpinQrFrameVariant) {
    if (!linkCompleto) return;
    setErro(null);
    try {
      setBaixandoQr(variant);
      const blob = await buildSpinBrandedQrPngBlob(linkCompleto, variant);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        variant === "dark" ? "spin-qrcode-quadro-gradiente-escuro.png" : "spin-qrcode-quadro-gradiente-claro.png";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gerar o PNG com o quadro Spin.");
    } finally {
      setBaixandoQr(null);
    }
  }

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar Links e Materiais.
      </div>
    );
  }

  /** Faixa do link (base + utm): fundo alinhado ao tema / operadora */
  const linkStripOuterBorder = brand.primaryTransparentBorder;
  const linkStripBg = brand.useBrand
    ? "color-mix(in srgb, var(--brand-primary) 6%, transparent)"
    : dark
      ? "rgba(0,0,0,0.22)"
      : "rgba(74,32,130,0.05)";
  const linkStripInputBg = brand.useBrand
    ? "color-mix(in srgb, var(--brand-primary) 10%, transparent)"
    : t.inputBg ?? t.cardBg;
  const linkStripDivider = brand.useBrand
    ? "color-mix(in srgb, var(--brand-primary) 22%, transparent)"
    : t.cardBorder;

  const cardBorder = t.cardBorder;

  const emitirDesabilitado =
    !podeEmitir ||
    aguardandoOpcoes ||
    salvando ||
    verificandoGateEmissao ||
    (precisaSelecionarInfluencer && influenciadores.length === 0);

  return (
    <div className="app-page-shell">
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{
            width: 32, height: 32, borderRadius: 9,
            background: brand.primaryIconBg,
            border: brand.primaryIconBorder,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: brand.primaryIconColor, flexShrink: 0,
          }}>
            <GiShare size={16} />
          </span>
          <h1 style={{
            fontSize: 18, fontWeight: 800, color: brand.primary,
            fontFamily: FONT_TITLE, margin: 0,
            letterSpacing: "0.05em", textTransform: "uppercase",
          }}>
            Links e Materiais
          </h1>
        </div>
        <div style={{
          marginTop: 4,
          paddingLeft: 40,
          maxWidth: "100%",
          boxSizing: "border-box",
          fontFamily: FONT.body,
          fontSize: 13,
          lineHeight: 1.65,
          color: t.textMuted,
        }}>
          <p style={{ margin: 0 }}>
            Gere o link de rastreamento e registre o UTM em Gestão de Links.
          </p>
        </div>
      </div>

      <section
        style={{
          boxSizing: "border-box",
          width: "100%",
          background: brand.blockBg,
          border: brand.primaryTransparentBorder,
          borderRadius: 14,
          padding: "16px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{
            width: 28, height: 28, borderRadius: 8,
            background: brand.primaryIconBg,
            border: brand.primaryIconBorder,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: brand.primaryIconColor, flexShrink: 0,
          }}>
            <Link2 size={14} strokeWidth={2.25} />
          </span>
          <h2 style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            color: brand.primary,
            fontFamily: FONT_TITLE,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}>
            Link de rastreamento
          </h2>
        </div>

        {!perm.loading && !perm.canEditarOk && (
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
              Você pode ver esta página, mas <strong>não tem permissão para emitir</strong> o link. Peça a um administrador para ativar <strong>Editar</strong> em Links e Materiais na Gestão de Usuários.
            </span>
          </div>
        )}

        {precisaSelecionarInfluencer && podeEmitir && !loadingInfluenciadores && influenciadores.length === 0 && (
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
            <span>Nenhum influencer disponível no seu escopo para emitir o link.</span>
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

        {(user?.role === "influencer" && loadingPerfil) ||
        (user?.role !== "influencer" && !!influencerSelecionado && loadingAliasInfluencer) ? (
          <p style={{ margin: 0, fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
            Carregando link salvo…
          </p>
        ) : !emitido ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {precisaSelecionarInfluencer && podeEmitir && influenciadores.length > 0 && (
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Influencer
                </label>
                <select
                  value={influencerSelecionado}
                  onChange={(e) => setInfluencerSelecionado(e.target.value)}
                  disabled={!podeEmitir || loadingInfluenciadores || salvando}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: brand.primaryTransparentBorder,
                    background: brand.primaryTransparentBg,
                    color: t.text,
                    fontSize: 14,
                    fontFamily: FONT.body,
                    cursor: "pointer",
                  }}
                >
                  <option value="">Selecione…</option>
                  {influenciadores.map((inf) => (
                    <option key={inf.id} value={inf.id}>
                      {(inf.nome_artistico ?? "").trim() || inf.id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Link (URL base + utm_source)
              </label>
              <div
                style={{
                  borderRadius: 12,
                  border: linkStripOuterBorder,
                  background: linkStripBg,
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "flex", alignItems: "stretch", minHeight: 44, overflowX: "auto" }}>
                  <span
                    style={{
                      flexShrink: 0,
                      padding: "10px 12px",
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 12,
                      color: t.text,
                      whiteSpace: "nowrap",
                      display: "flex",
                      alignItems: "center",
                      lineHeight: 1.4,
                      background: linkStripBg,
                    }}
                  >
                    {TRACKING_BASE}
                  </span>
                  <div
                    style={{
                      width: 1,
                      flexShrink: 0,
                      background: linkStripDivider,
                      alignSelf: "stretch",
                    }}
                    aria-hidden
                  />
                  <input
                    type="text"
                    value={utmInput}
                    onChange={(e) => setUtmInput(sanitizarUtm(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === " ") e.preventDefault();
                    }}
                    disabled={!podeEmitir || aguardandoOpcoes || salvando}
                    placeholder={sanitizarUtm(nomeArtistico) || "utm_source"}
                    autoComplete="off"
                    aria-label="Valor do utm_source"
                    style={{
                      flex: "1 1 140px",
                      minWidth: 120,
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      border: "none",
                      background: linkStripInputBg,
                      color: t.text,
                      fontSize: 13,
                      fontFamily: "ui-monospace, monospace",
                      outline: "none",
                    }}
                  />
                </div>
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
                O trecho à direita é o utm_source (a partir do nome artístico cadastrado), você pode editar caso deseje, mas este não pode conter espaços (usar _ no lugar) e nem caracteres especiais (~, ^, ç, etc.).
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
              <button
                type="button"
                onClick={() => void emitir()}
                disabled={emitirDesabilitado}
                style={{
                  flexShrink: 0,
                  padding: "12px 22px",
                  borderRadius: 12,
                  border: "none",
                  cursor: emitirDesabilitado ? "not-allowed" : "pointer",
                  opacity: emitirDesabilitado ? 0.55 : 1,
                  fontWeight: 700,
                  fontSize: 14,
                  fontFamily: FONT.body,
                  background: brand.useBrand ? "var(--brand-primary)" : "linear-gradient(135deg, #7c3aed, #1e36f8)",
                  color: "#fff",
                }}
              >
                {salvando ? "Emitindo…" : verificandoGateEmissao ? "Verificando…" : "Emitir"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
              Link gerado. Use este link para a sua divulgação, ele irá gerar o seu rastreamento.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: 10 }}>
              <div style={{
                flex: "1 1 280px",
                minWidth: 0,
                padding: "12px 14px",
                borderRadius: 12,
                border: linkStripOuterBorder,
                background: linkStripBg,
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
                  border: brand.primaryTransparentBorder,
                  background: brand.primaryTransparentBg,
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

            <div
              style={{
                marginTop: 24,
                paddingTop: 20,
                borderTop: `1px solid ${t.cardBorder}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: brand.primaryIconBg,
                  border: brand.primaryIconBorder,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: brand.primaryIconColor,
                  flexShrink: 0,
                }}>
                  <QrCode size={14} strokeWidth={2.25} />
                </span>
                <h3 style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 700,
                  color: brand.primary,
                  fontFamily: FONT_TITLE,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}>
                  QR Code do link
                </h3>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 28,
                  justifyContent: "center",
                  alignItems: "flex-start",
                }}
              >
                {/* 1 — só QR */}
                <div style={{
                  flex: "1 1 240px",
                  maxWidth: 320,
                  minWidth: 200,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: t.textMuted,
                    fontFamily: FONT_TITLE,
                    textAlign: "center",
                  }}>
                    Apenas o QR Code
                  </span>
                  <div style={{
                    width: "100%",
                    aspectRatio: "600 / 760",
                    borderRadius: 14,
                    overflow: "hidden",
                    background: "#ffffff",
                    border: `1px solid ${t.cardBorder}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxSizing: "border-box",
                  }}>
                    <QRCodeCanvas
                      value={linkCompleto}
                      size={QR_SOLO_CANVAS_PX}
                      level="M"
                      marginSize={4}
                      bgColor="#FFFFFF"
                      fgColor="#14141a"
                      title="QR Code do link de rastreamento"
                      style={{
                        width: "76%",
                        height: "auto",
                        maxWidth: "100%",
                        display: "block",
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void baixarQrPng()}
                    disabled={baixandoQr !== null}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 16px",
                      borderRadius: 10,
                      border: brand.useBrand
                        ? "1px solid color-mix(in srgb, var(--brand-primary) 35%, transparent)"
                        : "1px solid rgba(124, 58, 237, 0.35)",
                      background: brand.useBrand
                        ? "color-mix(in srgb, var(--brand-primary) 8%, #fff)"
                        : "rgba(124, 58, 237, 0.06)",
                      color: brand.useBrand ? "var(--brand-primary)" : "#4a2082",
                      fontWeight: 700,
                      fontSize: 12,
                      fontFamily: FONT.body,
                      cursor: baixandoQr !== null ? "wait" : "pointer",
                      opacity: baixandoQr !== null && baixandoQr !== "plain" ? 0.45 : 1,
                    }}
                  >
                    <Download size={16} strokeWidth={2.25} />
                    {baixandoQr === "plain" ? "Gerando…" : "Baixar PNG"}
                  </button>
                </div>

                {/* 2 — gradiente escuro */}
                <div style={{
                  flex: "1 1 240px",
                  maxWidth: 320,
                  minWidth: 200,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: t.textMuted,
                    fontFamily: FONT_TITLE,
                    textAlign: "center",
                  }}>
                    Gradiente escuro
                  </span>
                  <div style={{
                    width: "100%",
                    aspectRatio: "600 / 760",
                    borderRadius: 14,
                    overflow: "hidden",
                    background: t.cardBg,
                    border: `1px solid ${t.cardBorder}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxSizing: "border-box",
                  }}>
                    {carregandoPreviewsQuadro || !previewEscuro ? (
                      <span style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, padding: 24 }}>
                        {carregandoPreviewsQuadro ? "Gerando prévia…" : "—"}
                      </span>
                    ) : (
                      <img
                        src={previewEscuro}
                        alt="Quadro Spin gradiente escuro com QR Code"
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "block",
                          objectFit: "contain",
                        }}
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void baixarQuadroSpin("dark")}
                    disabled={baixandoQr !== null}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid rgba(30, 54, 248, 0.45)",
                      background: "linear-gradient(160deg, rgba(74, 48, 130, 0.2) 0%, rgba(30, 54, 248, 0.15) 100%)",
                      color: dark ? "#e8e9ff" : "#1e2a6e",
                      fontWeight: 700,
                      fontSize: 12,
                      fontFamily: FONT.body,
                      cursor: baixandoQr !== null ? "wait" : "pointer",
                      opacity: baixandoQr !== null && baixandoQr !== "dark" ? 0.45 : 1,
                    }}
                  >
                    <Download size={16} strokeWidth={2.25} />
                    {baixandoQr === "dark" ? "Gerando…" : "Baixar PNG"}
                  </button>
                </div>

                {/* 3 — gradiente claro */}
                <div style={{
                  flex: "1 1 240px",
                  maxWidth: 320,
                  minWidth: 200,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: t.textMuted,
                    fontFamily: FONT_TITLE,
                    textAlign: "center",
                  }}>
                    Gradiente claro
                  </span>
                  <div style={{
                    width: "100%",
                    aspectRatio: "600 / 760",
                    borderRadius: 14,
                    overflow: "hidden",
                    background: t.cardBg,
                    border: `1px solid ${t.cardBorder}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxSizing: "border-box",
                  }}>
                    {carregandoPreviewsQuadro || !previewClaro ? (
                      <span style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, padding: 24 }}>
                        {carregandoPreviewsQuadro ? "Gerando prévia…" : "—"}
                      </span>
                    ) : (
                      <img
                        src={previewClaro}
                        alt="Quadro Spin gradiente claro com QR Code"
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "block",
                          objectFit: "contain",
                        }}
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void baixarQuadroSpin("light")}
                    disabled={baixandoQr !== null}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid rgba(233, 64, 37, 0.4)",
                      background: "linear-gradient(160deg, rgba(74, 48, 130, 0.18) 0%, rgba(233, 64, 37, 0.12) 100%)",
                      color: dark ? "#fde8e4" : "#7c2d12",
                      fontWeight: 700,
                      fontSize: 12,
                      fontFamily: FONT.body,
                      cursor: baixandoQr !== null ? "wait" : "pointer",
                      opacity: baixandoQr !== null && baixandoQr !== "light" ? 0.45 : 1,
                    }}
                  >
                    <Download size={16} strokeWidth={2.25} />
                    {baixandoQr === "light" ? "Gerando…" : "Baixar PNG"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <ModalBloqueioAgendaLive
        open={bloqueioEmissao !== null}
        onClose={() => setBloqueioEmissao(null)}
        perfilIncompleto={bloqueioEmissao?.perfilIncompleto ?? false}
        faltaPlaybook={bloqueioEmissao?.faltaPlaybook ?? false}
        segundaPessoa
        contexto="emitir_link"
        onIrInfluencers={() => {
          setBloqueioEmissao(null);
          setActivePage("influencers");
        }}
        onIrPlaybook={() => {
          setBloqueioEmissao(null);
          setActivePage("playbook_influencers");
        }}
      />
    </div>
  );
}
