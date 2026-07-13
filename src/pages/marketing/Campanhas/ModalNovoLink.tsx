import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Copy, Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";

const SLUG_CASA_APOSTAS = "casa_apostas";

/** URL base de afiliado CDA para Geração de Links (Campanhas) — distinta de Links e Materiais. */
export const CAMPANHA_LINK_BASE_CASA_APOSTAS =
  "https://go.aff.casadeapostas.bet.br/290td2jz?utm_source=";

const MSG_ERRO_GERAR =
  "Não foi possível gerar o link. Se o problema persistir, entre em contato com o suporte.";
const MSG_ERRO_DUPLICADO = "Já existe um link com esta UTM para a operadora selecionada.";
const MSG_ERRO_OPERADORA = "Selecione a operadora.";
const MSG_ERRO_UTM = "Informe o utm_source do link.";
const MSG_OPERADORA_EM_BREVE =
  "A geração de links para esta operadora estará disponível em breve.";

/**
 * utm_source: só letras sem acento (A–Z, a–z), números e _.
 * Espelha a regra de Links e Materiais.
 */
export function sanitizarUtmCampanha(val: string): string {
  let s = val.normalize("NFD").replace(/\p{M}/gu, "");
  s = s.replace(/[\s\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]+/g, "_");
  s = s.replace(/[^a-zA-Z0-9_]/g, "");
  return s;
}

interface ModalNovoLinkProps {
  operadoras: { slug: string; nome: string }[];
  /** Pré-seleciona operadora quando o filtro da página não está em «Todas». */
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
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const [operadoraSlug, setOperadoraSlug] = useState(() => {
    if (operadoraInicial && operadoras.some((o) => o.slug === operadoraInicial)) {
      return operadoraInicial;
    }
    return "";
  });
  const [utmInput, setUtmInput] = useState("");
  const [linkCompleto, setLinkCompleto] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  const isCasaApostas = operadoraSlug === SLUG_CASA_APOSTAS;
  const gerado = linkCompleto != null;

  useEffect(() => {
    const id = window.setTimeout(() => selectRef.current?.focus(), 100);
    return () => window.clearTimeout(id);
  }, []);

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
  const linkStripDivider = t.cardBorder;
  const linkStripInputBg = t.inputBg ?? t.cardBg;

  const gerar = async () => {
    setErro("");
    setCopiado(false);
    if (!operadoraSlug) {
      setErro(MSG_ERRO_OPERADORA);
      return;
    }
    if (!isCasaApostas) {
      setErro(MSG_OPERADORA_EM_BREVE);
      return;
    }
    const raw = sanitizarUtmCampanha(utmInput).trim();
    if (!raw) {
      setErro(MSG_ERRO_UTM);
      return;
    }

    setGerando(true);
    try {
      const { data, error } = await supabase
        .from("campanha_links")
        .insert({
          utm_source: raw,
          operadora_slug: operadoraSlug,
          created_by: user?.id ?? null,
        })
        .select("id, utm_source")
        .single();

      if (error) {
        if (error.code === "23505") {
          setErro(MSG_ERRO_DUPLICADO);
          return;
        }
        throw error;
      }

      const utmFinal = (data?.utm_source as string | undefined)?.trim() || raw;
      setLinkCompleto(`${CAMPANHA_LINK_BASE_CASA_APOSTAS}${encodeURIComponent(utmFinal)}`);
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

          {operadoraSlug && !isCasaApostas ? (
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

          {isCasaApostas ? (
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>
                Link (URL base + utm_source)
                <CampoObrigatorioMark />
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
                    {CAMPANHA_LINK_BASE_CASA_APOSTAS}
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
                    onChange={(e) => setUtmInput(sanitizarUtmCampanha(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === " ") e.preventDefault();
                    }}
                    disabled={gerando}
                    placeholder="utm_source"
                    autoComplete="off"
                    aria-label="Valor do utm_source"
                    style={{
                      flex: "1 1 140px",
                      minWidth: 100,
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
                O trecho à direita é o utm_source — construa do zero. Não use espaços (use _) nem caracteres
                especiais (~, ^, ç, etc.).
              </p>
            </div>
          ) : null}
        </>
      ) : (
        <div style={{ marginBottom: 18 }} aria-live="polite">
          <p style={{ margin: "0 0 10px", fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
            Link gerado. Copie a URL completa para divulgação.
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
            disabled={gerando || !operadoraSlug || (isCasaApostas ? !sanitizarUtmCampanha(utmInput).trim() : true)}
            style={{
              background: getCtaCriarGradient(brand),
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "9px 20px",
              cursor:
                gerando || !operadoraSlug || (isCasaApostas ? !sanitizarUtmCampanha(utmInput).trim() : true)
                  ? "not-allowed"
                  : "pointer",
              fontFamily: FONT.body,
              fontSize: 13,
              fontWeight: 700,
              opacity:
                gerando || !operadoraSlug || (isCasaApostas ? !sanitizarUtmCampanha(utmInput).trim() : true)
                  ? 0.7
                  : 1,
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
