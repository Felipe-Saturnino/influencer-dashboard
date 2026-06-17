import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import { supabase } from "../../../lib/supabase";
import { validarBrandguide } from "../../../lib/brandguideValidation";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { BRAND_SEMANTIC as BRAND, FONT } from "../../../constants/theme";
import { Operadora } from "../../../types";
import { AlertCircle, Upload, Check, Palette, Layers, Building2 } from "lucide-react";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { FiltroBarTabButton, FILTRO_BAR_TAB_ICON_PROPS } from "../../../components/dashboard";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { SalvarCtaContent } from "../GestaoUsuarios/gestaoUsuariosUi";
import { ctaGradientSalvar, handleGestaoTabsArrowKeyDown } from "../GestaoUsuarios/gestaoUsuariosHelpers";
import {
  HOME_OPERADOR_TEMPLATE_PADRAO,
  HOME_OPERADOR_TEMPLATE_SELECT_OPTIONS,
  HOME_OPERADOR_TEMPLATES_DEDICADOS,
  getRegisteredHomeOperadorTemplateKeys,
  isHomeOperadorTemplatePadrao,
} from "../../../lib/homeOperadoraTemplate";
import {
  type MesaCadastroResumo,
  type ModalTabId,
} from "./gestaoOperadorasUi";

const ERRO_SALVAR_OPERADORA = "Não foi possível salvar. Verifique os dados e tente novamente.";
const ERRO_UPLOAD_LOGO = "Não foi possível enviar o logo.";
const ERRO_UPLOAD_FONTE = "Não foi possível enviar a fonte.";

function normHex6(s: string): string | null {
  const x = s.trim();
  if (!x) return null;
  return /^#[0-9a-fA-F]{6}$/.test(x) ? x.toLowerCase() : null;
}

export function ModalOperadora({
  editando,
  onClose,
  onSalvo,
}: {
  editando: Operadora | null;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const { theme: t } = useApp();
  const dashBrand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const nomeInputRef = useRef<HTMLInputElement>(null);
  const isNova = !editando;
  const [aba, setAba] = useState<ModalTabId>("dados");
  const [nome, setNome] = useState(editando?.nome ?? "");
  const [slug, setSlug] = useState(editando?.slug ?? "");
  const [ativo, setAtivo] = useState(editando?.ativo ?? false);
  const [brandAction, setBrandAction] = useState(editando?.brand_action ?? "");
  const [brandContrast, setBrandContrast] = useState(editando?.brand_contrast ?? "");
  const [brandBg, setBrandBg] = useState(editando?.brand_bg ?? "");
  const [brandText, setBrandText] = useState(editando?.brand_text ?? "");
  const [brandAvisos, setBrandAvisos] = useState<string[]>([]);
  const [logoUrl, setLogoUrl] = useState(editando?.logo_url ?? "");
  const [fontUrl, setFontUrl] = useState(editando?.font_url ?? "");
  const [homeTemplate, setHomeTemplate] = useState(() =>
    isHomeOperadorTemplatePadrao(editando?.home_template) ? HOME_OPERADOR_TEMPLATE_PADRAO : (editando?.home_template?.trim() ?? HOME_OPERADOR_TEMPLATE_PADRAO),
  );
  const [mesas, setMesas] = useState<MesaCadastroResumo[]>([]);
  const [mesasLoading, setMesasLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFont, setUploadingFont] = useState(false);
  const [erro, setErro] = useState("");

  const brandObrigatorio = isNova || ativo;
  const storageSlug = (editando?.slug ?? slug).trim();

  useEffect(() => {
    const id = window.setTimeout(() => nomeInputRef.current?.focus(), 100);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!editando) {
      setSlug(
        nome
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, "")
      );
    }
  }, [nome, editando]);

  useEffect(() => {
    if (!editando?.slug) {
      setMesas([]);
      return;
    }
    let cancelled = false;
    setMesasLoading(true);
    void supabase
      .from("mesas_spin_cadastro")
      .select("tipo_jogo, nome_mesa, numero_mesa, mesa_identificacao, mesa_identificacao_operadora")
      .eq("operadora_slug", editando.slug)
      .order("nome_mesa")
      .then(({ data, error }) => {
        if (cancelled) return;
        setMesasLoading(false);
        if (error || !data) setMesas([]);
        else setMesas(data as MesaCadastroResumo[]);
      });
    return () => {
      cancelled = true;
    };
  }, [editando?.slug]);

  const BUCKET = "operadoras-brand";

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storageSlug) {
      setErro("Informe o nome para gerar o identificador antes de enviar o logo.");
      e.target.value = "";
      return;
    }
    setUploadingLogo(true);
    setErro("");
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${storageSlug}/logo.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
      setLogoUrl(`${publicUrl}?v=${Date.now()}`);
    } catch (err) {
      console.error(err);
      setErro(ERRO_UPLOAD_LOGO);
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  const FONT_MIME: Record<string, string> = {
    woff2: "font/woff2",
    woff: "font/woff",
    ttf: "font/ttf",
    otf: "font/otf",
  };

  const handleUploadFont = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storageSlug) {
      setErro("Informe o nome para gerar o identificador antes de enviar a fonte.");
      e.target.value = "";
      return;
    }
    setUploadingFont(true);
    setErro("");
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "woff2";
      const path = `${storageSlug}/font.${ext}`;
      const contentType = FONT_MIME[ext] ?? "font/woff2";
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
      setFontUrl(publicUrl);
    } catch (err) {
      console.error(err);
      setErro(ERRO_UPLOAD_FONTE);
    } finally {
      setUploadingFont(false);
      e.target.value = "";
    }
  };

  const salvar = async () => {
    setErro("");
    if (!nome.trim()) {
      setErro("Nome é obrigatório.");
      return;
    }
    if (!slug.trim()) {
      setErro("Informe um nome para gerar o identificador interno.");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(slug)) {
      setErro("Identificador inválido. Use apenas letras minúsculas, números e underscore.");
      return;
    }

    const logoTrim = logoUrl.trim();
    const fontTrim = fontUrl.trim();

    setSalvando(true);
    try {
      if (isNova) {
        const ha = normHex6(brandAction);
        const hc = normHex6(brandContrast);
        const hb = normHex6(brandBg);
        const ht = normHex6(brandText);
        if (!ha || !hc || !hb || !ht) {
          setErro("Preencha as quatro cores do brandguide em formato #RRGGBB.");
          setSalvando(false);
          return;
        }
        if (!logoTrim) {
          setErro("Logo é obrigatório.");
          setSalvando(false);
          return;
        }
        const v = validarBrandguide({
          action: ha,
          contrast: hc,
          bg: hb,
          text: ht,
        });
        setBrandAvisos(v.warnings);
        const { data: existe } = await supabase.from("operadoras").select("slug").eq("slug", slug).maybeSingle();
        if (existe) {
          setErro("Este identificador já está em uso. Tente um nome diferente.");
          setSalvando(false);
          return;
        }
        const { error } = await supabase.from("operadoras").insert({
          slug,
          nome: nome.trim(),
          ativo: false,
          brand_action: v.action,
          brand_contrast: v.contrast,
          brand_bg: v.bg,
          brand_text: v.text,
          logo_url: logoTrim,
          font_url: fontTrim || null,
        });
        if (error) throw error;
      } else {
        let brandPayload: Record<string, string | null>;
        if (ativo) {
          const ha = normHex6(brandAction);
          const hc = normHex6(brandContrast);
          const hb = normHex6(brandBg);
          const ht = normHex6(brandText);
          if (!ha || !hc || !hb || !ht) {
            setErro("Com status Ativa, todas as cores do brandguide são obrigatórias (#RRGGBB).");
            setSalvando(false);
            return;
          }
          if (!logoTrim) {
            setErro("Com status Ativa, o logo é obrigatório.");
            setSalvando(false);
            return;
          }
          const v = validarBrandguide({
            action: ha,
            contrast: hc,
            bg: hb,
            text: ht,
          });
          setBrandAvisos(v.warnings);
          brandPayload = {
            brand_action: v.action,
            brand_contrast: v.contrast,
            brand_bg: v.bg,
            brand_text: v.text,
            logo_url: logoTrim,
            font_url: fontTrim || null,
          };
        } else {
          setBrandAvisos([]);
          const nullable = (s: string) => {
            const x = s.trim();
            if (!x) return null;
            const h = normHex6(x);
            return h === null ? "bad" : h;
          };
          const a = nullable(brandAction);
          const c = nullable(brandContrast);
          const b = nullable(brandBg);
          const tx = nullable(brandText);
          if (a === "bad" || c === "bad" || b === "bad" || tx === "bad") {
            setErro("Use #RRGGBB para as cores preenchidas ou deixe em branco com operadora inativa.");
            setSalvando(false);
            return;
          }
          brandPayload = {
            brand_action: a,
            brand_contrast: c,
            brand_bg: b,
            brand_text: tx,
            logo_url: logoTrim || null,
            font_url: fontTrim || null,
          };
        }

        const dedicatedKeys = new Set([
          ...HOME_OPERADOR_TEMPLATES_DEDICADOS.map((x) => x.key),
          ...getRegisteredHomeOperadorTemplateKeys(),
        ]);
        if (homeTemplate !== HOME_OPERADOR_TEMPLATE_PADRAO && !dedicatedKeys.has(homeTemplate)) {
          setErro("Template de Home inválido. Selecione Home Operador Padrão ou um template dedicado registrado.");
          setSalvando(false);
          return;
        }
        const homeTemplatePayload = {
          home_template: homeTemplate === HOME_OPERADOR_TEMPLATE_PADRAO ? null : homeTemplate,
        };

        const { error } = await supabase
          .from("operadoras")
          .update({ nome: nome.trim(), ativo, ...brandPayload, ...homeTemplatePayload })
          .eq("slug", editando.slug);
        if (error) throw error;
      }
      onSalvo();
      onClose();
    } catch (e: unknown) {
      console.error(e);
      setErro(ERRO_SALVAR_OPERADORA);
    } finally {
      setSalvando(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: t.inputBg ?? t.cardBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 10, padding: "10px 14px", color: t.text,
    fontFamily: FONT.body, fontSize: 14, boxSizing: "border-box",
    outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontFamily: FONT.body, fontSize: 11,
    fontWeight: 700, color: t.textMuted, marginBottom: 6,
    textTransform: "uppercase", letterSpacing: "1px",
  };
  const fieldStyle: React.CSSProperties = { marginBottom: 18 };
  const tryClose = () => { if (!salvando) onClose(); };

  const tabs = useMemo(
    (): { id: ModalTabId; label: string }[] =>
      isNova
        ? [
            { id: "dados", label: "Dados cadastrais" },
            { id: "brand", label: "Brandguide" },
          ]
        : [
            { id: "dados", label: "Dados cadastrais" },
            { id: "brand", label: "Brandguide" },
            { id: "operacoes", label: "Operações" },
          ],
    [isNova],
  );

  const tabIds = useMemo(() => tabs.map((x) => x.id), [tabs]);

  const modalTabIcons: Record<ModalTabId, ReactNode> = {
    dados: <Building2 {...FILTRO_BAR_TAB_ICON_PROPS} />,
    brand: <Palette {...FILTRO_BAR_TAB_ICON_PROPS} />,
    operacoes: <Layers {...FILTRO_BAR_TAB_ICON_PROPS} />,
  };

  const slugInputStyle: React.CSSProperties = {
    ...inputStyle,
    opacity: 0.85,
    cursor: "not-allowed",
    fontFamily: "monospace",
    color: BRAND.roxoVivo,
    fontSize: 13,
  };

  const brandGrid = (
    <div style={{ ...fieldStyle, marginBottom: 0, padding: 16, background: t.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", borderRadius: 12, border: `1px solid ${t.cardBorder}`, maxHeight: 420, overflowY: "auto" }}>
      <div className="app-grid-2-tight">
        <div>
          <label style={{ ...labelStyle, fontSize: 10 }}>
            Cor de ação
            {brandObrigatorio ? <CampoObrigatorioMark /> : null}
          </label>
          <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body, lineHeight: 1.35 }}>
            CTAs, títulos, item ativo no menu. Alto contraste sobre o fundo.
          </div>
          <input type="color" value={brandAction || "#7c3aed"} onChange={(e) => setBrandAction(e.target.value)}
            style={{ width: "100%", height: 36, border: `1px solid ${t.cardBorder}`, borderRadius: 8, cursor: "pointer" }} />
          <input type="text" value={brandAction} onChange={(e) => setBrandAction(e.target.value)} placeholder="#7c3aed"
            style={{ ...inputStyle, marginTop: 6, fontSize: 12 }} />
        </div>
        <div>
          <label style={{ ...labelStyle, fontSize: 10 }}>
            Cor de contraste
            {brandObrigatorio ? <CampoObrigatorioMark /> : null}
          </label>
          <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body, lineHeight: 1.35 }}>
            Comparativos e destaque secundário — deve ser distinta da cor de ação.
          </div>
          <input type="color" value={brandContrast || "#1e36f8"} onChange={(e) => setBrandContrast(e.target.value)}
            style={{ width: "100%", height: 36, border: `1px solid ${t.cardBorder}`, borderRadius: 8, cursor: "pointer" }} />
          <input type="text" value={brandContrast} onChange={(e) => setBrandContrast(e.target.value)} placeholder="#1e36f8"
            style={{ ...inputStyle, marginTop: 6, fontSize: 12 }} />
        </div>
        <div>
          <label style={{ ...labelStyle, fontSize: 10 }}>
            Fundo
            {brandObrigatorio ? <CampoObrigatorioMark /> : null}
          </label>
          <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body, lineHeight: 1.35 }}>
            Background da aplicação (modo operador escuro).
          </div>
          <input type="color" value={brandBg || "#0f0f1a"} onChange={(e) => setBrandBg(e.target.value)}
            style={{ width: "100%", height: 36, border: `1px solid ${t.cardBorder}`, borderRadius: 8, cursor: "pointer" }} />
          <input type="text" value={brandBg} onChange={(e) => setBrandBg(e.target.value)} placeholder="#0f0f1a"
            style={{ ...inputStyle, marginTop: 6, fontSize: 12 }} />
        </div>
        <div>
          <label style={{ ...labelStyle, fontSize: 10 }}>
            Texto
            {brandObrigatorio ? <CampoObrigatorioMark /> : null}
          </label>
          <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body, lineHeight: 1.35 }}>
            Texto principal e ícones estruturais (derivados de contraste no app).
          </div>
          <input type="color" value={brandText || "#ffffff"} onChange={(e) => setBrandText(e.target.value)}
            style={{ width: "100%", height: 36, border: `1px solid ${t.cardBorder}`, borderRadius: 8, cursor: "pointer" }} />
          <input type="text" value={brandText} onChange={(e) => setBrandText(e.target.value)} placeholder="#ffffff"
            style={{ ...inputStyle, marginTop: 6, fontSize: 12 }} />
        </div>
        {brandAvisos.length > 0 && (
          <div style={{ gridColumn: "1 / -1", fontSize: 11, color: BRAND.amarelo, fontFamily: FONT.body, lineHeight: 1.45, padding: "8px 10px", borderRadius: 8, border: `1px solid ${BRAND.amarelo}55`, background: `${BRAND.amarelo}14` }}>
            {brandAvisos.map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </div>
        )}
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ ...labelStyle, fontSize: 10 }}>
            Logo
            {brandObrigatorio ? <CampoObrigatorioMark /> : null}
          </label>
          <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="URL ou envie um arquivo"
            style={inputStyle} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <label style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px",
              background: t.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", border: `1px solid ${t.cardBorder}`,
              borderRadius: 8, cursor: uploadingLogo ? "not-allowed" : "pointer",
              fontSize: 12, fontFamily: FONT.body, color: t.text,
            }}>
              <Upload size={14} aria-hidden="true" />
              {uploadingLogo ? "Enviando..." : "Enviar logo (PNG, JPG, SVG)"}
              <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden disabled={uploadingLogo} onChange={handleUploadLogo} />
            </label>
            {logoUrl ? (
              <a href={logoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: BRAND.roxoVivo }}>Ver</a>
            ) : null}
          </div>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ ...labelStyle, fontSize: 10 }}>Fonte customizada</label>
          <input type="url" value={fontUrl} onChange={(e) => setFontUrl(e.target.value)} placeholder="URL ou envie .woff2, .woff, .ttf, .otf"
            style={inputStyle} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <label style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px",
              background: t.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", border: `1px solid ${t.cardBorder}`,
              borderRadius: 8, cursor: uploadingFont ? "not-allowed" : "pointer",
              fontSize: 12, fontFamily: FONT.body, color: t.text,
            }}>
              <Upload size={14} aria-hidden="true" />
              {uploadingFont ? "Enviando..." : "Enviar fonte (WOFF2, WOFF, TTF, OTF)"}
              <input type="file" accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf" hidden disabled={uploadingFont} onChange={handleUploadFont} />
            </label>
            {fontUrl ? (
              <a href={fontUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: BRAND.roxoVivo }}>Ver</a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ModalBase maxWidth={isNova ? 520 : 720} onClose={tryClose}>
      <ModalHeader
        title={editando ? "Editar Operadora" : "Nova Operadora"}
        onClose={tryClose}
      />

      <div role="tablist" aria-label="Seções do cadastro da operadora" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {tabs.map((x) => (
          <FiltroBarTabButton
            key={x.id}
            id={`tab-op-${x.id}`}
            active={aba === x.id}
            aria-controls={`panel-op-${x.id}`}
            onClick={() => setAba(x.id)}
            onKeyDown={(e) => handleGestaoTabsArrowKeyDown(e, tabIds, x.id, setAba, "tab-op-")}
            icon={modalTabIcons[x.id]}
          >
            {x.label}
          </FiltroBarTabButton>
        ))}
      </div>

      {aba === "dados" && (
        <div role="tabpanel" id="panel-op-dados" aria-labelledby="tab-op-dados" tabIndex={0}>
          <div style={fieldStyle}>
            <label style={labelStyle}>
              Nome
              <CampoObrigatorioMark />
            </label>
            <input
              ref={nomeInputRef}
              style={inputStyle}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Blaze"
              aria-label="Nome da operadora"
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Identificador interno
              <span style={{ opacity: 0.5, fontWeight: 400, marginLeft: 6, fontSize: 10 }}>(não editável)</span>
            </label>
            <input
              style={slugInputStyle}
              value={slug}
              readOnly
              placeholder="Será gerado a partir do nome"
              aria-label="Identificador interno gerado automaticamente"
            />
          </div>

          {isNova ? (
            <div style={{ ...fieldStyle, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ ...labelStyle, margin: 0 }}>Status</span>
              <span
                style={{
                  border: `1px solid #6b728044`,
                  background: "#6b728022",
                  color: "#6b7280",
                  borderRadius: 10, padding: "6px 16px",
                  fontFamily: FONT.body, fontSize: 13, fontWeight: 600,
                }}
              >
                Inativa
              </span>
              <span style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
                Novas operadoras são criadas como inativas. Ative quando estiver pronta para operação.
              </span>
            </div>
          ) : (
            <div style={{ ...fieldStyle, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <label style={{ ...labelStyle, margin: 0 }}>Status</label>
              <button
                type="button"
                aria-pressed={ativo}
                onClick={() => {
                  setErro("");
                  setAtivo(!ativo);
                }}
                style={{
                  border: `1px solid ${ativo ? "#05966966" : t.cardBorder}`,
                  background: ativo ? "#05966922" : "transparent",
                  color: ativo ? "#059669" : t.textMuted,
                  borderRadius: 10, padding: "6px 16px", cursor: "pointer",
                  fontFamily: FONT.body, fontSize: 13, fontWeight: 600,
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                {ativo && <Check size={13} aria-hidden="true" />}
                {ativo ? "Ativa" : "Inativa"}
              </button>
              {!ativo && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: BRAND.roxoVivo, fontFamily: FONT.body }}>
                  <AlertCircle size={13} aria-hidden="true" /> Vínculos existentes não são removidos
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {aba === "brand" && (
        <div role="tabpanel" id="panel-op-brand" aria-labelledby="tab-op-brand" tabIndex={0}>
          {brandGrid}
        </div>
      )}

      {!isNova && aba === "operacoes" && (
        <div role="tabpanel" id="panel-op-operacoes" aria-labelledby="tab-op-operacoes" tabIndex={0}>
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="op-home-template">
              Home do operador
            </label>
            <select
              id="op-home-template"
              value={homeTemplate}
              onChange={(e) => setHomeTemplate(e.target.value)}
              style={inputStyle}
              aria-label="Template de Home para usuários operador desta operadora"
            >
              {HOME_OPERADOR_TEMPLATE_SELECT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: t.textMuted, fontFamily: FONT.body, lineHeight: 1.5 }}>
              Operadores com escopo nesta operadora veem o template selecionado ao entrar na Home. Sem template dedicado,
              usa-se a Home Operador Padrão.
            </p>
          </div>

          <div style={{ ...labelStyle, marginBottom: 10, textTransform: "none", letterSpacing: "0.04em", fontSize: 12, color: t.text }}>
            Mesas em operação
          </div>
          {mesasLoading ? (
            <div style={{ padding: 20, color: t.textMuted, fontFamily: FONT.body, fontSize: 13 }}>Carregando mesas...</div>
          ) : mesas.length === 0 ? (
            <div style={{ padding: "16px 0", color: t.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
              Nenhuma mesa cadastrada para esta operadora.
            </div>
          ) : (
            <div className="app-table-wrap" style={getDataTableWrapStyle()}>
              <table style={getDataTableStyle()}>
                <caption style={{ display: "none" }}>
                  Mesas em operação cadastradas para esta operadora
                </caption>
                <thead>
                  <tr>
                    <th scope="col" style={dataTable.thHeader}>
                      Jogo
                    </th>
                    <th scope="col" style={dataTable.thHeader}>
                      Nome da mesa
                    </th>
                    <th scope="col" style={dataTable.thHeader}>
                      Nº mesa
                    </th>
                    <th scope="col" style={dataTable.thHeader}>
                      ID Spin
                    </th>
                    <th scope="col" style={dataTable.thHeader}>
                      ID operadora
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mesas.map((m, i) => {
                    const zebraBg = dataTable.zebraRow(i);
                    return (
                      <tr
                        key={`${m.mesa_identificacao}-${i}`}
                        style={{ background: zebraBg }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = t.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = zebraBg;
                        }}
                      >
                        <td style={dataTable.tdCenter}>{m.tipo_jogo}</td>
                        <td style={{ ...dataTable.tdCenter, fontWeight: 600 }}>{m.nome_mesa}</td>
                        <td style={dataTable.tdCenter}>{m.numero_mesa ?? "—"}</td>
                        <td style={{ ...dataTable.tdCenter, fontFamily: "monospace", fontSize: 12 }}>{m.mesa_identificacao}</td>
                        <td style={{ ...dataTable.tdCenter, fontFamily: "monospace", fontSize: 12 }}>
                          {m.mesa_identificacao_operadora?.trim() ? m.mesa_identificacao_operadora : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {erro && (
        <div role="alert" style={{ display: "flex", alignItems: "center", gap: 8, background: `${BRAND.vermelho}18`, border: `1px solid ${BRAND.vermelho}44`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: BRAND.vermelho, marginTop: 16, marginBottom: 8, fontFamily: FONT.body }}>
          <AlertCircle size={14} aria-hidden="true" /> {erro}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
        <button
          type="button"
          onClick={tryClose}
          style={{ background: "transparent", border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: "9px 18px", cursor: "pointer", fontFamily: FONT.body, fontSize: 13, color: t.text }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: ctaGradientSalvar(dashBrand, salvando, BRAND.cinza),
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "9px 20px",
            cursor: salvando ? "not-allowed" : "pointer",
            fontFamily: FONT.body,
            fontSize: 13,
            fontWeight: 700,
            opacity: salvando ? 0.85 : 1,
          }}
        >
          <SalvarCtaContent
            salvando={salvando}
            label={editando ? "Salvar alterações" : "Criar operadora"}
          />
        </button>
      </div>
    </ModalBase>
  );
}
