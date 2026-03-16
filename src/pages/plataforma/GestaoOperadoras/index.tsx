import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { Operadora } from "../../../types";
import { X, Pencil, AlertCircle } from "lucide-react";
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
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>

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
  const [salvando, setSalvando] = useState(false);
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

  const salvar = async () => {
    setErro("");
    if (!nome.trim()) { setErro("Nome é obrigatório."); return; }
    if (!slug.trim()) { setErro("Slug inválido. Verifique o nome informado."); return; }
    if (!/^[a-z0-9_]+$/.test(slug)) { setErro("Slug inválido. Use apenas letras minúsculas, números e underscore."); return; }

    setSalvando(true);
    try {
      if (editando) {
        const { error } = await supabase.from("operadoras").update({ nome, ativo }).eq("slug", editando.slug);
        if (error) throw error;
      } else {
        const { data: existe } = await supabase.from("operadoras").select("slug").eq("slug", slug).maybeSingle();
        if (existe) { setErro("Este slug já está em uso. Tente um nome diferente."); setSalvando(false); return; }
        const { error } = await supabase.from("operadoras").insert({ slug, nome, ativo: true });
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
