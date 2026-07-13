import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, Copy, Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";

type LinkGeracaoConfig = {
  urlBase: string;
  /** Nome do parâmetro na URL (utm_source | utm_campaign). */
  paramLabel: string;
};

/** Operadoras com geração de link habilitada — valor ainda grava em utm_aliases.utm_source. */
const LINK_GERACAO_POR_OPERADORA: Record<string, LinkGeracaoConfig> = {
  casa_apostas: {
    urlBase: "https://go.aff.casadeapostas.bet.br/290td2jz?utm_source=",
    paramLabel: "utm_source",
  },
  blaze: {
    urlBase: "https://blaze.cxclick.com/visit/?bta=52546&brand=blaze&utm_campaign=",
    paramLabel: "utm_campaign",
  },
};

const MSG_ERRO_GERAR =
  "Não foi possível gerar o link. Se o problema persistir, entre em contato com o suporte.";
const MSG_ERRO_OPERADORA = "Selecione a operadora.";
const MSG_ERRO_CAMPANHA = "Selecione a campanha.";
const MSG_ERRO_UTM = "Informe o valor do parâmetro UTM do link.";
const MSG_OPERADORA_EM_BREVE =
  "A geração de links para esta operadora estará disponível em breve.";
const MSG_SEM_CAMPANHAS =
  "Não há campanhas ativas para esta operadora. Cadastre uma campanha na aba Campanhas antes de gerar o link.";

const ERRO_RPC: Record<string, string> = {
  duplicado: "Já existe um link com esta UTM para a operadora selecionada.",
  utm_influencer: "Esta UTM já está vinculada a um influencer.",
  utm_outra_campanha: "Esta UTM já está vinculada a outra campanha.",
  utm_outra_operadora: "Esta UTM já está vinculada a outra operadora.",
  utm_indisponivel: "Esta UTM não está disponível.",
  campanha_inativa: "A campanha selecionada não está ativa.",
  campanha_operadora: "A campanha selecionada não pertence a esta operadora.",
  campanha: "Selecione a campanha.",
  operadora: MSG_OPERADORA_EM_BREVE,
  utm: MSG_ERRO_UTM,
  utm_invalido: "Use apenas letras, números e underscore (_) no parâmetro UTM.",
  utm_longo: "O parâmetro UTM deve ter no máximo 200 caracteres.",
  permissao: "Você não tem permissão para gerar links.",
};

function sanitizarUtmCampanha(val: string): string {
  let s = val.normalize("NFD").replace(/\p{M}/gu, "");
  s = s.replace(/[\s\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]+/g, "_");
  s = s.replace(/[^a-zA-Z0-9_]/g, "");
  return s;
}

type CampanhaOpcao = { id: string; nome: string; operadora_slug: string | null };

interface ModalNovoLinkProps {
  operadoras: { slug: string; nome: string }[];
  operadoraInicial?: string;
  onClose: () => void;
  onGerado: () => void | Promise<void>;
}

export function ModalNovoLink({
  operadoras,
  operadoraInicial,
  onClose,
  onGerado,
}: ModalNovoLinkProps) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [operadoraSlug, setOperadoraSlug] = useState(() => {
    if (operadoraInicial && operadoras.some((o) => o.slug === operadoraInicial)) {
      return operadoraInicial;
    }
    return "";
  });
  const [campanhaId, setCampanhaId] = useState("");
  const [campanhas, setCampanhas] = useState<CampanhaOpcao[]>([]);
  const [loadingCampanhas, setLoadingCampanhas] = useState(false);
  const [utmInput, setUtmInput] = useState("");
  const [linkCompleto, setLinkCompleto] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  const linkCfg = operadoraSlug ? LINK_GERACAO_POR_OPERADORA[operadoraSlug] : undefined;
  const geracaoHabilitada = !!linkCfg;
  const gerado = linkCompleto != null;

  const campanhasDaOperadora = useMemo(() => {
    if (!operadoraSlug) return [];
    return campanhas
      .filter((c) => c.operadora_slug === operadoraSlug)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [campanhas, operadoraSlug]);

  useEffect(() => {
    const id = window.setTimeout(() => selectRef.current?.focus(), 100);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!geracaoHabilitada || !operadoraSlug) {
      setCampanhas([]);
      setCampanhaId("");
      return;
    }
    let cancelled = false;
    setLoadingCampanhas(true);
    void supabase
      .from("campanhas")
      .select("id, nome, operadora_slug")
      .eq("ativo", true)
      .eq("operadora_slug", operadoraSlug)
      .order("nome")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("[Campanhas] Erro ao carregar campanhas do modal:", error.message);
          setCampanhas([]);
        } else {
          setCampanhas((data ?? []) as CampanhaOpcao[]);
        }
        setLoadingCampanhas(false);
      });
    return () => {
      cancelled = true;
    };
  }, [geracaoHabilitada, operadoraSlug]);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: t.inputBg ?? t.cardBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 10,
    padding: "10px 14px",
    color: t.text,
    fontFamily: FONT.body,
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontFamily: FONT.body,
    fontSize: 11,
    fontWeight: 700,
    color: t.textMuted,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "1px",
  };

  const linkStripOuterBorder = brand.primaryTransparentBorder;
  const linkStripBg = brand.primaryTransparentBg;

  const utmOk = sanitizarUtmCampanha(utmInput).trim().length > 0;
  const podeGerar =
    geracaoHabilitada &&
    !!campanhaId &&
    utmOk &&
    !loadingCampanhas &&
    campanhasDaOperadora.length > 0;

  const gerar = async () => {
    setErro("");
    setCopiado(false);
    if (!operadoraSlug) {
      setErro(MSG_ERRO_OPERADORA);
      return;
    }
    if (!linkCfg) {
      setErro(MSG_OPERADORA_EM_BREVE);
      return;
    }
    if (!campanhaId) {
      setErro(MSG_ERRO_CAMPANHA);
      return;
    }
    const raw = sanitizarUtmCampanha(utmInput).trim();
    if (!raw) {
      setErro(MSG_ERRO_UTM);
      return;
    }

    setGerando(true);
    try {
      const { data, error } = await supabase.rpc("gerar_campanha_link", {
        p_utm_source: raw,
        p_campanha_id: campanhaId,
        p_operadora_slug: operadoraSlug,
      });

      if (error) {
        console.error("[Campanhas] RPC gerar link:", error.message);
        setErro(MSG_ERRO_GERAR);
        return;
      }

      const res = data as { ok?: boolean; error?: string; utm_source?: string } | null;
      if (!res?.ok) {
        const code = res?.error ?? "interno";
        console.error("[Campanhas] gerar link:", code);
        setErro(ERRO_RPC[code] ?? MSG_ERRO_GERAR);
        return;
      }

      const utmFinal = (res.utm_source ?? raw).trim();
      setLinkCompleto(`${linkCfg.urlBase}${encodeURIComponent(utmFinal)}`);
      await onGerado();
    } catch (e: unknown) {
      console.error("[Campanhas] Erro ao gerar link:", e);
      setErro(MSG_ERRO_GERAR);
    } finally {
      setGerando(false);
    }
  };

  const copiar = async () => {
    if (!linkCompleto) return;
    try {
      await navigator.clipboard.writeText(linkCompleto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch (e: unknown) {
      console.error("[Campanhas] Erro ao copiar link:", e);
      setErro("Não foi possível copiar o link. Se o problema persistir, entre em contato com o suporte.");
    }
  };

  const paramLabel = linkCfg?.paramLabel ?? "utm_source";

  return (
    <ModalBase
      onClose={() => {
        if (!gerando) onClose();
      }}
      maxWidth={560}
    >
      <ModalHeader
        title="Novo Link"
        onClose={() => {
          if (!gerando) onClose();
        }}
      />

      {!gerado ? (
        <>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>
              Operadora
              <CampoObrigatorioMark />
            </label>
            <select
              ref={selectRef}
              value={operadoraSlug}
              onChange={(e) => {
                setOperadoraSlug(e.target.value);
                setCampanhaId("");
                setUtmInput("");
                setErro("");
              }}
              disabled={gerando}
              aria-label="Operadora"
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">Selecione…</option>
              {[...operadoras]
                .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                .map((op) => (
                  <option key={op.slug} value={op.slug}>
                    {op.nome}
                  </option>
                ))}
            </select>
          </div>

          {operadoraSlug && !geracaoHabilitada ? (
            <div
              role="status"
              style={{
                marginBottom: 18,
                padding: "12px 14px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg ?? t.cardBg,
                fontSize: 13,
                color: t.textMuted,
                fontFamily: FONT.body,
              }}
            >
              {MSG_OPERADORA_EM_BREVE}
            </div>
          ) : null}

          {geracaoHabilitada && linkCfg ? (
            <>
              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>
                  Campanha
                  <CampoObrigatorioMark />
                </label>
                {loadingCampanhas ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: t.textMuted,
                      fontFamily: FONT.body,
                      fontSize: 13,
                      padding: "10px 0",
                    }}
                  >
                    <Loader2
                      size={14}
                      className="app-lucide-spin"
                      color="var(--brand-primary, #7c3aed)"
                      aria-hidden
                    />
                    Carregando…
                  </div>
                ) : campanhasDaOperadora.length === 0 ? (
                  <div
                    role="status"
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: `1px solid ${t.cardBorder}`,
                      background: t.inputBg ?? t.cardBg,
                      fontSize: 13,
                      color: t.textMuted,
                      fontFamily: FONT.body,
                    }}
                  >
                    {MSG_SEM_CAMPANHAS}
                  </div>
                ) : (
                  <select
                    value={campanhaId}
                    onChange={(e) => {
                      setCampanhaId(e.target.value);
                      setErro("");
                    }}
                    disabled={gerando}
                    aria-label="Campanha"
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    <option value="">Selecione…</option>
                    {campanhasDaOperadora.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>
                  UTM
                  <CampoObrigatorioMark />
                </label>
                <input
                  type="text"
                  value={utmInput}
                  onChange={(e) => setUtmInput(sanitizarUtmCampanha(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === " ") e.preventDefault();
                  }}
                  disabled={gerando}
                  placeholder={paramLabel}
                  autoComplete="off"
                  aria-label={`Valor do ${paramLabel}`}
                  style={{
                    ...inputStyle,
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 13,
                  }}
                />
                <p style={{ margin: "8px 0 0", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
                  Informe o {paramLabel} — construa do zero. Não use espaços (use _) nem caracteres especiais (~, ^,
                  ç, etc.). Ao gerar, a URL completa é montada e o link é mapeado automaticamente à campanha
                  selecionada.
                </p>
              </div>
            </>
          ) : null}
        </>
      ) : (
        <div style={{ marginBottom: 18 }} aria-live="polite">
          <p style={{ margin: "0 0 10px", fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
            Link gerado e mapeado à campanha. Copie a URL completa para divulgação.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: 10 }}>
            <div
              style={{
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
              }}
            >
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
              {copiado ? <Check size={18} color="#22c55e" aria-hidden /> : <Copy size={18} aria-hidden />}
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      )}

      {erro ? (
        <div
          role="alert"
          aria-live="polite"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(232,64,37,0.1)",
            border: "1px solid rgba(232,64,37,0.27)",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 13,
            color: "#e84025",
            marginBottom: 16,
            fontFamily: FONT.body,
          }}
        >
          <AlertCircle size={14} aria-hidden /> {erro}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
        <button
          type="button"
          onClick={() => {
            if (!gerando) onClose();
          }}
          style={{
            background: "transparent",
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 10,
            padding: "9px 18px",
            cursor: gerando ? "not-allowed" : "pointer",
            fontFamily: FONT.body,
            fontSize: 13,
            color: t.text,
          }}
        >
          {gerado ? "Fechar" : "Cancelar"}
        </button>
        {!gerado ? (
          <button
            type="button"
            onClick={() => void gerar()}
            disabled={gerando || !podeGerar}
            style={{
              background: getCtaCriarGradient(brand),
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "9px 20px",
              cursor: gerando || !podeGerar ? "not-allowed" : "pointer",
              fontFamily: FONT.body,
              fontSize: 13,
              fontWeight: 700,
              opacity: gerando || !podeGerar ? 0.7 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {gerando ? (
              <>
                <Loader2 size={14} className="app-lucide-spin" color="#fff" aria-hidden />
                Gerando…
              </>
            ) : (
              "Gerar Link"
            )}
          </button>
        ) : null}
      </div>
    </ModalBase>
  );
}
