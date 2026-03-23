import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { Operadora } from "../../../types";
import { X, Pencil, AlertCircle, Upload } from "lucide-react";
import { GiShield } from "react-icons/gi";

// ─── BRAND ────────────────────────────────────────────────────────────────────
const BRAND = {
  roxo:     "#4a2082",
  roxoVivo: "#7c3aed",
  azul:     "#1e36f8",
  vermelho: "#e84025",
  verde:    "#22c55e",
  cinza:    "#6b7280",
} as const;

const FONT_TITLE = "'NHD Bold', 'nhd-bold', sans-serif";

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function GestaoOperadoras() {
  const { theme: t } = useApp();
  const perm = usePermission("gestao_operadoras");
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Operadora | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("operadoras").select("*").order("nome");
    setOperadoras(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const ativas = operadoras.filter((o) => o.ativo).length;
  const contadorLabel = operadoras.length === 1 ? "1 operadora cadastrada" : `${operadoras.length} operadoras cadastradas`;

  // ─── Estilos de tabela ───────────────────────────────────────────────────
  const th: React.CSSProperties = {
    textAlign: "left", padding: "10px 16px", color: t.textMuted,
    fontWeight: 700, fontSize: 11, textTransform: "uppercase",
    letterSpacing: "0.08em", fontFamily: FONT.body,
    background: "rgba(74,32,130,0.10)",
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
    <div style={{ padding: "20px 24px 48px" }}>

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 24 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: BRAND.roxo,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, marginTop: 3,
        }}>
          <GiShield size={14} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, margin: 0, letterSpacing: "0.5px", textTransform: "uppercase" }}>
            Gestão de Operadoras
          </h1>
          <p style={{ color: t.textMuted, marginTop: 5, fontFamily: FONT.body, fontSize: 13, margin: "5px 0 0" }}>
            Gerencie as operadoras parceiras da Spin Gaming.
          </p>
        </div>
      </div>

      {/* ─── Cards de resumo ─────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total",    valor: operadoras.length,            cor: BRAND.roxoVivo },
          { label: "Ativas",   valor: ativas,                       cor: "#059669"      },
          { label: "Inativas", valor: operadoras.length - ativas,   cor: BRAND.cinza    },
        ].map((c) => (
          <div key={c.label} style={{
            background: t.cardBg, border: `1px solid ${t.cardBorder}`,
            borderLeft: `3px solid ${c.cor}`,
            borderRadius: 18, padding: "16px 20px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
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
        borderRadius: 18, boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
        overflow: "hidden",
      }}>
        {/* Header da tabela */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 16px" }}>
          <span style={{ fontFamily: FONT.body, fontSize: 13, color: t.textMuted }}>{contadorLabel}</span>
          {perm.canCriarOk && (
            <button
              onClick={() => { setEditando(null); setModalOpen(true); }}
              style={{
                background: `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`,
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
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Slug</th>
                <th style={th}>Nome</th>
                <th style={th}>Status</th>
                <th style={th}>Criada em</th>
                {perm.canEditarOk && <th style={th}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {operadoras.map((op, idx) => (
                <tr key={op.slug} style={{ background: idx % 2 === 1 ? "rgba(74,32,130,0.06)" : "transparent" }}>
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
        )}
      </div>

      {modalOpen && (
        <ModalOperadora
          t={t}
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
  editando: Operadora | null;
  onClose: () => void;
  onSalvo: () => void;
}

function ModalOperadora({ t, editando, onClose, onSalvo }: ModalProps) {
  const [nome, setNome] = useState(editando?.nome ?? "");
  const [slug, setSlug] = useState(editando?.slug ?? "");
  const [ativo, setAtivo] = useState(editando?.ativo ?? true);
  const [corPrimaria, setCorPrimaria] = useState(editando?.cor_primaria ?? "");
  const [corSecundaria, setCorSecundaria] = useState(editando?.cor_secundaria ?? "");
  const [corAccent, setCorAccent] = useState(editando?.cor_accent ?? "");
  const [corBackground, setCorBackground] = useState(editando?.cor_background ?? "");
  const [corTextos, setCorTextos] = useState(editando?.cor_textos ?? "");
  const [corIcones, setCorIcones] = useState(editando?.cor_icones ?? "");
  const [corAdicional1, setCorAdicional1] = useState(editando?.cor_adicional_1 ?? "");
  const [corAdicional2, setCorAdicional2] = useState(editando?.cor_adicional_2 ?? "");
  const [corAdicional3, setCorAdicional3] = useState(editando?.cor_adicional_3 ?? "");
  const [corAdicional4, setCorAdicional4] = useState(editando?.cor_adicional_4 ?? "");
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
      setCorPrimaria(editando.cor_primaria ?? "");
      setCorSecundaria(editando.cor_secundaria ?? "");
      setCorAccent(editando.cor_accent ?? "");
      setCorBackground(editando.cor_background ?? "");
      setCorTextos(editando.cor_textos ?? "");
      setCorIcones(editando.cor_icones ?? "");
      setCorAdicional1(editando.cor_adicional_1 ?? "");
      setCorAdicional2(editando.cor_adicional_2 ?? "");
      setCorAdicional3(editando.cor_adicional_3 ?? "");
      setCorAdicional4(editando.cor_adicional_4 ?? "");
      setLogoUrl(editando.logo_url ?? "");
      setFontUrl(editando.font_url ?? "");
    }
  }, [editando?.slug]);

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

  const handleUploadFont = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editando?.slug) return;
    setUploadingFont(true);
    setErro("");
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "woff2";
      const path = `${editando.slug}/font.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
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
      const brand = {
        cor_primaria:     corPrimaria.trim() || null,
        cor_secundaria:   corSecundaria.trim() || null,
        cor_accent:       corAccent.trim() || null,
        cor_background:   corBackground.trim() || null,
        cor_textos:       corTextos.trim() || null,
        cor_icones:       corIcones.trim() || null,
        cor_adicional_1:  corAdicional1.trim() || null,
        cor_adicional_2:  corAdicional2.trim() || null,
        cor_adicional_3:  corAdicional3.trim() || null,
        cor_adicional_4:  corAdicional4.trim() || null,
        logo_url:         logoUrl.trim() || null,
        font_url:         fontUrl.trim() || null,
      };
      if (editando) {
        const { error } = await supabase.from("operadoras").update({ nome, ativo, ...brand }).eq("slug", editando.slug);
        if (error) throw error;
      } else {
        const { data: existe } = await supabase.from("operadoras").select("slug").eq("slug", slug).maybeSingle();
        if (existe) { setErro("Este slug já está em uso. Tente um nome diferente."); setSalvando(false); return; }
        const { error } = await supabase.from("operadoras").insert({ slug, nome, ativo: true, ...brand });
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

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget && !salvando) onClose(); }}
    >
      <div style={{ background: t.cardBg, borderRadius: 20, padding: "28px 32px", width: "100%", maxWidth: 460, border: `1px solid ${t.cardBorder}` }}>

        {/* Header do modal */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <h2 style={{ fontFamily: FONT_TITLE, fontSize: 18, fontWeight: 800, color: t.text, margin: 0, letterSpacing: "0.03em" }}>
            {editando ? "Editar Operadora" : "Nova Operadora"}
          </h2>
          <button
            onClick={() => { if (!salvando) onClose(); }}
            style={{ background: "none", border: "none", cursor: salvando ? "not-allowed" : "pointer", color: t.textMuted, display: "flex", alignItems: "center", padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Campo Nome */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Nome</label>
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
          <div style={{ ...fieldStyle, padding: 16, background: "rgba(74,32,130,0.08)", borderRadius: 12, border: `1px solid ${t.cardBorder}`, maxHeight: 420, overflowY: "auto" }}>
            <div style={{ ...labelStyle, marginBottom: 12 }}>Brandguide (operadores)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>Primária</label>
                <input type="color" value={corPrimaria || "#7c3aed"} onChange={e => setCorPrimaria(e.target.value)}
                  style={{ width: "100%", height: 36, border: `1px solid ${t.cardBorder}`, borderRadius: 8, cursor: "pointer" }} />
                <input type="text" value={corPrimaria} onChange={e => setCorPrimaria(e.target.value)} placeholder="#7c3aed"
                  style={{ ...inputStyle, marginTop: 6, fontSize: 12 }} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>Secundária</label>
                <input type="color" value={corSecundaria || "#4a2082"} onChange={e => setCorSecundaria(e.target.value)}
                  style={{ width: "100%", height: 36, border: `1px solid ${t.cardBorder}`, borderRadius: 8, cursor: "pointer" }} />
                <input type="text" value={corSecundaria} onChange={e => setCorSecundaria(e.target.value)} placeholder="#4a2082"
                  style={{ ...inputStyle, marginTop: 6, fontSize: 12 }} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>Accent</label>
                <input type="color" value={corAccent || "#1e36f8"} onChange={e => setCorAccent(e.target.value)}
                  style={{ width: "100%", height: 36, border: `1px solid ${t.cardBorder}`, borderRadius: 8, cursor: "pointer" }} />
                <input type="text" value={corAccent} onChange={e => setCorAccent(e.target.value)} placeholder="#1e36f8"
                  style={{ ...inputStyle, marginTop: 6, fontSize: 12 }} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>Background</label>
                <input type="color" value={corBackground || "#0f0f1a"} onChange={e => setCorBackground(e.target.value)}
                  style={{ width: "100%", height: 36, border: `1px solid ${t.cardBorder}`, borderRadius: 8, cursor: "pointer" }} />
                <input type="text" value={corBackground} onChange={e => setCorBackground(e.target.value)} placeholder="#0f0f1a"
                  style={{ ...inputStyle, marginTop: 6, fontSize: 12 }} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>Textos</label>
                <input type="color" value={corTextos || "#ffffff"} onChange={e => setCorTextos(e.target.value)}
                  style={{ width: "100%", height: 36, border: `1px solid ${t.cardBorder}`, borderRadius: 8, cursor: "pointer" }} />
                <input type="text" value={corTextos} onChange={e => setCorTextos(e.target.value)} placeholder="#ffffff"
                  style={{ ...inputStyle, marginTop: 6, fontSize: 12 }} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>Ícones</label>
                <input type="color" value={corIcones || "#70cae4"} onChange={e => setCorIcones(e.target.value)}
                  style={{ width: "100%", height: 36, border: `1px solid ${t.cardBorder}`, borderRadius: 8, cursor: "pointer" }} />
                <input type="text" value={corIcones} onChange={e => setCorIcones(e.target.value)} placeholder="#70cae4"
                  style={{ ...inputStyle, marginTop: 6, fontSize: 12 }} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>Adicional 1</label>
                <input type="color" value={corAdicional1 || "#1e36f8"} onChange={e => setCorAdicional1(e.target.value)}
                  style={{ width: "100%", height: 36, border: `1px solid ${t.cardBorder}`, borderRadius: 8, cursor: "pointer" }} />
                <input type="text" value={corAdicional1} onChange={e => setCorAdicional1(e.target.value)} placeholder="#1e36f8"
                  style={{ ...inputStyle, marginTop: 6, fontSize: 12 }} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>Adicional 2</label>
                <input type="color" value={corAdicional2 || "#22c55e"} onChange={e => setCorAdicional2(e.target.value)}
                  style={{ width: "100%", height: 36, border: `1px solid ${t.cardBorder}`, borderRadius: 8, cursor: "pointer" }} />
                <input type="text" value={corAdicional2} onChange={e => setCorAdicional2(e.target.value)} placeholder="#22c55e"
                  style={{ ...inputStyle, marginTop: 6, fontSize: 12 }} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>Adicional 3</label>
                <input type="color" value={corAdicional3 || "#f59e0b"} onChange={e => setCorAdicional3(e.target.value)}
                  style={{ width: "100%", height: 36, border: `1px solid ${t.cardBorder}`, borderRadius: 8, cursor: "pointer" }} />
                <input type="text" value={corAdicional3} onChange={e => setCorAdicional3(e.target.value)} placeholder="#f59e0b"
                  style={{ ...inputStyle, marginTop: 6, fontSize: 12 }} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>Adicional 4</label>
                <input type="color" value={corAdicional4 || "#e84025"} onChange={e => setCorAdicional4(e.target.value)}
                  style={{ width: "100%", height: 36, border: `1px solid ${t.cardBorder}`, borderRadius: 8, cursor: "pointer" }} />
                <input type="text" value={corAdicional4} onChange={e => setCorAdicional4(e.target.value)} placeholder="#e84025"
                  style={{ ...inputStyle, marginTop: 6, fontSize: 12 }} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ ...labelStyle, fontSize: 10 }}>Logo (opcional)</label>
                <input type="url" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="URL ou envie um arquivo"
                  style={inputStyle} />
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <label style={{
                    display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px",
                    background: "rgba(74,32,130,0.15)", border: `1px solid ${t.cardBorder}`,
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
                    background: "rgba(74,32,130,0.15)", border: `1px solid ${t.cardBorder}`,
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
              onClick={() => setAtivo((prev) => !prev)}
              style={{
                border: `1px solid ${ativo ? "#05966966" : t.cardBorder}`,
                background: ativo ? "#05966922" : "transparent",
                color: ativo ? "#059669" : t.textMuted,
                borderRadius: 10, padding: "6px 16px", cursor: "pointer",
                fontFamily: FONT.body, fontSize: 13, fontWeight: 600,
              }}
            >
              {ativo ? "✓ Ativa" : "Inativa"}
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
            onClick={() => { if (!salvando) onClose(); }}
            style={{ background: "transparent", border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: "9px 18px", cursor: "pointer", fontFamily: FONT.body, fontSize: 13, color: t.text }}
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            style={{
              background: `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`,
              color: "#fff", border: "none", borderRadius: 10,
              padding: "9px 20px", cursor: salvando ? "not-allowed" : "pointer",
              fontFamily: FONT.body, fontSize: 13, fontWeight: 700, opacity: salvando ? 0.7 : 1,
            }}
          >
            {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar operadora"}
          </button>
        </div>
      </div>
    </div>
  );
}
