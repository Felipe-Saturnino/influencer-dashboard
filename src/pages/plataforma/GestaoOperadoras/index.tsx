import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../../lib/supabase";
import { validarBrandguide } from "../../../lib/brandguideValidation";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { BRAND_SEMANTIC as BRAND, FONT, FONT_TITLE } from "../../../constants/theme";
import { Operadora } from "../../../types";
import { Pencil, AlertCircle, Upload, Check } from "lucide-react";
import { GiShield } from "react-icons/gi";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { SortTableTh, type SortDir } from "../../../components/dashboard";
import { compareAtivoBoolean, compareLocaleTexto } from "../../../lib/classificacaoSort";

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function GestaoOperadoras() {
  const { theme: t } = useApp();
  const dashBrand = useDashboardBrand();
  const perm = usePermission("gestao_operadoras");
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Operadora | null>(null);
  type OpSortCol = "slug" | "nome" | "status" | "criada";
  const [sortOp, setSortOp] = useState<{ col: OpSortCol; dir: SortDir }>({ col: "status", dir: "asc" });

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("operadoras").select("*").order("nome");
    setOperadoras(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const operadorasOrdenadas = useMemo(() => {
    const arr = [...operadoras];
    const { col, dir } = sortOp;
    arr.sort((a, b) => {
      let c = 0;
      switch (col) {
        case "slug":
          c = compareLocaleTexto(a.slug, b.slug, dir);
          break;
        case "nome":
          c = compareLocaleTexto(a.nome ?? "", b.nome ?? "", dir);
          break;
        case "status":
          c = compareAtivoBoolean(!!a.ativo, !!b.ativo, dir);
          break;
        case "criada":
          c = compareLocaleTexto(a.criado_em ?? "", b.criado_em ?? "", dir);
          break;
        default:
          c = 0;
      }
      if (c !== 0) return c;
      return compareLocaleTexto(a.nome ?? "", b.nome ?? "", "asc");
    });
    return arr;
  }, [operadoras, sortOp]);
  const ativas = operadoras.filter((o) => o.ativo).length;
  const contadorLabel = operadoras.length === 1 ? "1 operadora cadastrada" : `${operadoras.length} operadoras cadastradas`;

  // ─── Estilos de tabela ───────────────────────────────────────────────────
  const th: React.CSSProperties = {
    textAlign: "left", padding: "10px 16px", color: t.textMuted,
    fontWeight: 700, fontSize: 11, textTransform: "uppercase",
    letterSpacing: "0.08em", fontFamily: FONT.body,
    background: t.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    borderBottom: `1px solid ${t.cardBorder}`,
    whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = {
    padding: "12px 16px", color: t.text, fontFamily: FONT.body,
    fontSize: 13, verticalAlign: "middle",
    borderBottom: `1px solid ${t.cardBorder}`,
  };

  if (perm.canView === "nao") {
    return <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>Você não tem permissão para visualizar a Gestão de Operadoras.</div>;
  }

  return (
    <div className="app-page-shell">

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 24 }}>
        <span style={{
          width: 28, height: 28, borderRadius: 8,
          background: dashBrand.primaryIconBg,
          border: dashBrand.primaryIconBorder,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: dashBrand.primaryIconColor,
          flexShrink: 0, marginTop: 3,
        }}>
          <GiShield size={14} />
        </span>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: dashBrand.primary, fontFamily: FONT_TITLE, margin: 0, letterSpacing: "0.5px", textTransform: "uppercase" }}>
            Gestão de Operadoras
          </h1>
          <p style={{ color: t.textMuted, marginTop: 5, fontFamily: FONT.body, fontSize: 13, margin: "5px 0 0" }}>
            Gerencie as operadoras parceiras da Spin Gaming.
          </p>
        </div>
      </div>

      {/* ─── Cards de resumo ─────────────────────────────────────────────────── */}
      <div className="app-grid-kpi-3" style={{ marginBottom: 24 }}>
        {[
          { label: "Total",    valor: operadoras.length,            cor: BRAND.roxoVivo },
          { label: "Ativas",   valor: ativas,                       cor: "#059669"      },
          { label: "Inativas", valor: operadoras.length - ativas,   cor: BRAND.cinza    },
        ].map((c) => (
          <div key={c.label} style={{
            background: t.cardBg, border: `1px solid ${t.cardBorder}`,
            borderLeft: `3px solid ${c.cor}`,
            borderRadius: 18, padding: "16px 20px",
            boxShadow: t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: t.textMuted, fontFamily: FONT.body, marginBottom: 6 }}>
              {c.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: c.cor, fontFamily: FONT_TITLE, lineHeight: 1 }}>
              {c.valor}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Tabela ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: t.cardBg, border: `1px solid ${t.cardBorder}`,
        borderRadius: 18,
        boxShadow: t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)",
        overflow: "hidden",
      }}>
        {/* Header da tabela */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 16px" }}>
          <span style={{ fontFamily: FONT.body, fontSize: 13, color: t.textMuted }}>{contadorLabel}</span>
          {perm.canCriarOk && (
            <button
              type="button"
              onClick={() => { setEditando(null); setModalOpen(true); }}
              style={{
                background: dashBrand.useBrand ? "var(--brand-action, #7c3aed)" : `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`,
                color: "#fff", border: "none", borderRadius: 10,
                padding: "9px 18px", cursor: "pointer",
                fontFamily: FONT.body, fontSize: 13, fontWeight: 700,
              }}
            >
              + Nova Operadora
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: "40px 20px", color: t.textMuted, fontFamily: FONT.body, textAlign: "center" }}>Carregando...</div>
        ) : operadoras.length === 0 ? (
          <div style={{ padding: "48px 20px", color: t.textMuted, fontFamily: FONT.body, textAlign: "center" }}>Nenhuma operadora cadastrada.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                <SortTableTh<OpSortCol>
                  label="Slug"
                  col="slug"
                  sortCol={sortOp.col}
                  sortDir={sortOp.dir}
                  thStyle={th}
                  align="left"
                  onSort={(c) =>
                    setSortOp((s) => ({
                      col: c,
                      dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                    }))
                  }
                />
                <SortTableTh<OpSortCol>
                  label="Nome"
                  col="nome"
                  sortCol={sortOp.col}
                  sortDir={sortOp.dir}
                  thStyle={th}
                  align="left"
                  onSort={(c) =>
                    setSortOp((s) => ({
                      col: c,
                      dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                    }))
                  }
                />
                <SortTableTh<OpSortCol>
                  label="Status"
                  col="status"
                  sortCol={sortOp.col}
                  sortDir={sortOp.dir}
                  thStyle={th}
                  align="left"
                  onSort={(col) =>
                    setSortOp((s) => ({
                      col,
                      dir: s.col === col && s.dir === "desc" ? "asc" : "desc",
                    }))
                  }
                />
                <SortTableTh<OpSortCol>
                  label="Criada em"
                  col="criada"
                  sortCol={sortOp.col}
                  sortDir={sortOp.dir}
                  thStyle={th}
                  align="left"
                  onSort={(c) =>
                    setSortOp((s) => ({
                      col: c,
                      dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                    }))
                  }
                />
                {perm.canEditarOk && <th style={th}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {operadorasOrdenadas.map((op, idx) => (
                <tr key={op.slug} style={{ background: idx % 2 === 1 ? (t.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)") : "transparent" }}>
                  <td style={td}>
                    <code style={{
                      background: `${BRAND.roxoVivo}18`, borderRadius: 6,
                      padding: "3px 9px", fontSize: 12,
                      color: BRAND.roxoVivo, fontFamily: "monospace",
                      border: `1px solid ${BRAND.roxoVivo}33`,
                    }}>
                      {op.slug}
                    </code>
                  </td>
                  <td style={{ ...td, fontWeight: 600 }}>{op.nome}</td>
                  <td style={td}>
                    <span style={{
                      background: op.ativo ? "#05966922" : "#6b728022",
                      color: op.ativo ? "#059669" : "#6b7280",
                      border: `1px solid ${op.ativo ? "#05966944" : "#6b728044"}`,
                      borderRadius: 6, padding: "3px 10px",
                      fontSize: 12, fontWeight: 600, fontFamily: FONT.body,
                    }}>
                      {op.ativo ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td style={{ ...td, color: t.textMuted, fontSize: 12 }}>
                    {op.criado_em ? new Date(op.criado_em).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  {perm.canEditarOk && (
                    <td style={td}>
                      <button
                        type="button"
                        onClick={() => { setEditando(op); setModalOpen(true); }}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          background: "transparent", border: `1px solid ${t.cardBorder}`,
                          borderRadius: 10, padding: "6px 14px", cursor: "pointer",
                          fontFamily: FONT.body, fontSize: 12, color: t.text, fontWeight: 600,
                        }}
                      >
                        <Pencil size={13} /> Editar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <ModalOperadora
          t={t}
          dashBrand={dashBrand}
          editando={editando}
          onClose={() => setModalOpen(false)}
          onSalvo={carregar}
        />
      )}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps {
  t: ReturnType<typeof useApp>["theme"];
  dashBrand: ReturnType<typeof useDashboardBrand>;
  editando: Operadora | null;
  onClose: () => void;
  onSalvo: () => void;
}

function ModalOperadora({ t, dashBrand, editando, onClose, onSalvo }: ModalProps) {
  const [nome, setNome] = useState(editando?.nome ?? "");
  const [slug, setSlug] = useState(editando?.slug ?? "");
  const [ativo, setAtivo] = useState(editando?.ativo ?? true);
  const [brandAction, setBrandAction] = useState(editando?.brand_action ?? "");
  const [brandContrast, setBrandContrast] = useState(editando?.brand_contrast ?? "");
  const [brandBg, setBrandBg] = useState(editando?.brand_bg ?? "");
  const [brandText, setBrandText] = useState(editando?.brand_text ?? "");
  const [brandAvisos, setBrandAvisos] = useState<string[]>([]);
  const [logoUrl, setLogoUrl] = useState(editando?.logo_url ?? "");
  const [fontUrl, setFontUrl] = useState(editando?.font_url ?? "");
  const [salvando, setSalvando] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFont, setUploadingFont] = useState(false);
  const [erro, setErro] = useState("");

  // Gera slug automaticamente a partir do nome — invisível ao usuário na criação
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

  // Sincroniza campos de brand quando abre para outra operadora
  useEffect(() => {
    if (editando) {
      setBrandAction(editando.brand_action ?? "");
      setBrandContrast(editando.brand_contrast ?? "");
      setBrandBg(editando.brand_bg ?? "");
      setBrandText(editando.brand_text ?? "");
      setBrandAvisos([]);
      setLogoUrl(editando.logo_url ?? "");
      setFontUrl(editando.font_url ?? "");
    }
  }, [editando]);

  const BUCKET = "operadoras-brand";

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editando?.slug) return;
    setUploadingLogo(true);
    setErro("");
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${editando.slug}/logo.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
      // Cache-busting: evita que o navegador sirva logo antigo após novo upload
      setLogoUrl(`${publicUrl}?v=${Date.now()}`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar logo.");
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
    if (!file || !editando?.slug) return;
    setUploadingFont(true);
    setErro("");
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "woff2";
      const path = `${editando.slug}/font.${ext}`;
      const contentType = FONT_MIME[ext] ?? "font/woff2";
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
      setFontUrl(publicUrl);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar fonte.");
    } finally {
      setUploadingFont(false);
      e.target.value = "";
    }
  };

  const salvar = async () => {
    setErro("");
    if (!nome.trim()) { setErro("Nome é obrigatório."); return; }
    if (!slug.trim()) { setErro("Slug inválido. Verifique o nome informado."); return; }
    if (!/^[a-z0-9_]+$/.test(slug)) { setErro("Slug inválido. Use apenas letras minúsculas, números e underscore."); return; }

    setSalvando(true);
    try {
      const brandPayload: Record<string, string | null> = {
        logo_url: logoUrl.trim() || null,
        font_url: fontUrl.trim() || null,
      };
      if (editando) {
        const v = validarBrandguide({
          action: brandAction.trim() || null,
          contrast: brandContrast.trim() || null,
          bg: brandBg.trim() || null,
          text: brandText.trim() || null,
        });
        setBrandAvisos(v.warnings);
        brandPayload.brand_action = v.action;
        brandPayload.brand_contrast = v.contrast;
        brandPayload.brand_bg = v.bg;
        brandPayload.brand_text = v.text;
      }
      if (editando) {
        const { error } = await supabase.from("operadoras").update({ nome, ativo, ...brandPayload }).eq("slug", editando.slug);
        if (error) throw error;
      } else {
        const { data: existe } = await supabase.from("operadoras").select("slug").eq("slug", slug).maybeSingle();
        if (existe) { setErro("Este slug já está em uso. Tente um nome diferente."); setSalvando(false); return; }
        const { error } = await supabase.from("operadoras").insert({ slug, nome, ativo: true, ...brandPayload });
        if (error) throw error;
      }
      onSalvo();
      onClose();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
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

  return (
    <ModalBase maxWidth={460} onClose={tryClose}>
        <ModalHeader
          title={editando ? "Editar Operadora" : "Nova Operadora"}
          onClose={tryClose}
        />

        {/* Campo Nome */}
        <div style={fieldStyle}>
          <label style={labelStyle}>
            Nome
            <CampoObrigatorioMark />
          </label>
          <input
            style={inputStyle}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Blaze"
            autoFocus
          />
        </div>

        {/* Slug — apenas visível na edição, como referência somente leitura */}
        {editando && (
          <div style={fieldStyle}>
            <label style={labelStyle}>
              Identificador interno
              <span style={{ opacity: 0.5, fontWeight: 400, marginLeft: 6, fontSize: 10 }}>(não editável)</span>
            </label>
            <input
              style={{
                ...inputStyle,
                opacity: 0.5,
                cursor: "not-allowed",
                fontFamily: "monospace",
                color: BRAND.roxoVivo,
                fontSize: 13,
              }}
              value={slug}
              readOnly
            />
          </div>
        )}

        {/* Brandguide — cores exibidas para operadores desta operadora */}
        {editando && (
          <div style={{ ...fieldStyle, padding: 16, background: t.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", borderRadius: 12, border: `1px solid ${t.cardBorder}`, maxHeight: 420, overflowY: "auto" }}>
            <div style={{ ...labelStyle, marginBottom: 12 }}>Brandguide (operadores)</div>
            <div className="app-grid-2-tight">
              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>Cor de ação</label>
                <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body, lineHeight: 1.35 }}>
                  CTAs, títulos, item ativo no menu. Alto contraste sobre o fundo.
                </div>
                <input type="color" value={brandAction || "#7c3aed"} onChange={(e) => setBrandAction(e.target.value)}
                  style={{ width: "100%", height: 36, border: `1px solid ${t.cardBorder}`, borderRadius: 8, cursor: "pointer" }} />
                <input type="text" value={brandAction} onChange={(e) => setBrandAction(e.target.value)} placeholder="#7c3aed"
                  style={{ ...inputStyle, marginTop: 6, fontSize: 12 }} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>Cor de contraste</label>
                <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body, lineHeight: 1.35 }}>
                  Comparativos e destaque secundário — deve ser distinta da cor de ação.
                </div>
                <input type="color" value={brandContrast || "#1e36f8"} onChange={(e) => setBrandContrast(e.target.value)}
                  style={{ width: "100%", height: 36, border: `1px solid ${t.cardBorder}`, borderRadius: 8, cursor: "pointer" }} />
                <input type="text" value={brandContrast} onChange={(e) => setBrandContrast(e.target.value)} placeholder="#1e36f8"
                  style={{ ...inputStyle, marginTop: 6, fontSize: 12 }} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>Fundo</label>
                <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body, lineHeight: 1.35 }}>
                  Background da aplicação (modo operador escuro).
                </div>
                <input type="color" value={brandBg || "#0f0f1a"} onChange={(e) => setBrandBg(e.target.value)}
                  style={{ width: "100%", height: 36, border: `1px solid ${t.cardBorder}`, borderRadius: 8, cursor: "pointer" }} />
                <input type="text" value={brandBg} onChange={(e) => setBrandBg(e.target.value)} placeholder="#0f0f1a"
                  style={{ ...inputStyle, marginTop: 6, fontSize: 12 }} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>Texto</label>
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
                <label style={{ ...labelStyle, fontSize: 10 }}>Logo (opcional)</label>
                <input type="url" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="URL ou envie um arquivo"
                  style={inputStyle} />
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <label style={{
                    display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px",
                    background: t.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", border: `1px solid ${t.cardBorder}`,
                    borderRadius: 8, cursor: uploadingLogo ? "not-allowed" : "pointer",
                    fontSize: 12, fontFamily: FONT.body, color: t.text,
                  }}>
                    <Upload size={14} />
                    {uploadingLogo ? "Enviando..." : "Enviar logo (PNG, JPG, SVG)"}
                    <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden disabled={uploadingLogo} onChange={handleUploadLogo} />
                  </label>
                  {logoUrl && (
                    <a href={logoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: BRAND.roxoVivo }}>Ver</a>
                  )}
                </div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ ...labelStyle, fontSize: 10 }}>Fonte customizada (opcional)</label>
                <input type="url" value={fontUrl} onChange={e => setFontUrl(e.target.value)} placeholder="URL ou envie .woff2, .woff, .ttf, .otf"
                  style={inputStyle} />
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <label style={{
                    display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px",
                    background: t.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", border: `1px solid ${t.cardBorder}`,
                    borderRadius: 8, cursor: uploadingFont ? "not-allowed" : "pointer",
                    fontSize: 12, fontFamily: FONT.body, color: t.text,
                  }}>
                    <Upload size={14} />
                    {uploadingFont ? "Enviando..." : "Enviar fonte (WOFF2, WOFF, TTF, OTF)"}
                    <input type="file" accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf" hidden disabled={uploadingFont} onChange={handleUploadFont} />
                  </label>
                  {fontUrl && (
                    <a href={fontUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: BRAND.roxoVivo }}>Ver</a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status — apenas na edição */}
        {editando && (
          <div style={{ ...fieldStyle, display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ ...labelStyle, margin: 0 }}>Status</label>
            <button
              type="button"
              aria-pressed={ativo}
              onClick={() => setAtivo((prev) => !prev)}
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
                <AlertCircle size={13} /> Vínculos existentes não são removidos
              </div>
            )}
          </div>
        )}

        {/* Erro */}
        {erro && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: `${BRAND.vermelho}18`, border: `1px solid ${BRAND.vermelho}44`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: BRAND.vermelho, marginBottom: 16, fontFamily: FONT.body }}>
            <AlertCircle size={14} /> {erro}
          </div>
        )}

        {/* Botões */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
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
              background: dashBrand.useBrand ? "var(--brand-action, #7c3aed)" : `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`,
              color: "#fff", border: "none", borderRadius: 10,
              padding: "9px 20px", cursor: salvando ? "not-allowed" : "pointer",
              fontFamily: FONT.body, fontSize: 13, fontWeight: 700, opacity: salvando ? 0.7 : 1,
            }}
          >
            {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar operadora"}
          </button>
        </div>
    </ModalBase>
  );
}
