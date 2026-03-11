import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { Operadora } from "../../../types";

export default function GestaoOperadoras() {
  const { theme: t } = useApp();
  const perm = usePermission("gestao_operadoras");
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Operadora | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("operadoras")
      .select("*")
      .order("nome");
    setOperadoras(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const card: React.CSSProperties = {
    background: t.cardBg, borderRadius: 16, padding: 28,
    border: `1px solid ${t.cardBorder}`,
  };
  const thStyle: React.CSSProperties = {
    fontFamily: FONT.body, fontSize: 11, fontWeight: 700,
    color: t.textMuted, textTransform: "uppercase", letterSpacing: "1px",
    padding: "10px 14px", textAlign: "left",
  };
  const tdStyle: React.CSSProperties = {
    fontFamily: FONT.body, fontSize: 13, color: t.text,
    padding: "12px 14px", borderTop: `1px solid ${t.cardBorder}`,
  };

  const ativas = operadoras.filter(o => o.ativo).length;

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar a Gestão de Operadoras.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontFamily: FONT.title, fontSize: 28, color: t.text, margin: 0 }}>
          🏢 Gestão de Operadoras
        </h1>
        <p style={{ color: t.textMuted, marginTop: 6, fontFamily: FONT.body }}>
          Gerencie as operadoras parceiras da Spin Gaming.
        </p>
      </div>

      {/* Cards de resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { label: "Total", valor: operadoras.length, cor: "#7c3aed" },
          { label: "Ativas", valor: ativas, cor: "#059669" },
          { label: "Inativas", valor: operadoras.length - ativas, cor: "#6b7280" },
        ].map(c => (
          <div key={c.label} style={{ ...card, padding: 20 }}>
            <p style={{ fontFamily: FONT.body, fontSize: 12, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 8px" }}>
              {c.label}
            </p>
            <p style={{ fontFamily: FONT.title, fontSize: 32, color: c.cor, margin: 0, fontWeight: 700 }}>
              {c.valor}
            </p>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontFamily: FONT.body, fontSize: 13, color: t.textMuted }}>
            {operadoras.length} operadora{operadoras.length !== 1 ? "s" : ""} cadastrada{operadoras.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => { setEditando(null); setModalOpen(true); }}
            style={{
              background: "linear-gradient(135deg, #7c3aed, #2563eb)",
              color: "#fff", border: "none", borderRadius: 10,
              padding: "9px 18px", cursor: "pointer",
              fontFamily: FONT.body, fontSize: 13, fontWeight: 600,
            }}
          >
            + Nova Operadora
          </button>
        </div>

        {loading ? (
          <p style={{ color: t.textMuted, fontFamily: FONT.body }}>Carregando...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Slug", "Nome", "Status", "Criada em", "Ações"].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {operadoras.map(op => (
                  <tr key={op.slug}>
                    <td style={tdStyle}>
                      <code style={{
                        background: t.bg, borderRadius: 5,
                        padding: "2px 8px", fontSize: 12,
                        color: "#7c3aed", fontFamily: "monospace",
                      }}>
                        {op.slug}
                      </code>
                    </td>
                    <td style={{ ...tdStyle }}><strong>{op.nome}</strong></td>
                    <td style={tdStyle}>
                      <span style={{
                        background: op.ativo ? "#05966922" : "#6b728022",
                        color: op.ativo ? "#059669" : "#6b7280",
                        borderRadius: 6, padding: "3px 10px",
                        fontSize: 12, fontWeight: 600, fontFamily: FONT.body,
                      }}>
                        {op.ativo ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: t.textMuted, fontSize: 12 }}>
                      {op.criado_em ? new Date(op.criado_em).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => { setEditando(op); setModalOpen(true); }}
                        style={{
                          background: "none", border: `1px solid ${t.cardBorder}`,
                          borderRadius: 7, padding: "5px 12px", cursor: "pointer",
                          fontFamily: FONT.body, fontSize: 12, color: t.text,
                        }}
                      >
                        Editar
                      </button>
                    </td>
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
          editando={editando}
          onClose={() => setModalOpen(false)}
          onSalvo={carregar}
        />
      )}
    </div>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────

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

  // Gera slug automático a partir do nome (só na criação)
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
    if (!slug.trim()) { setErro("Slug é obrigatório."); return; }
    if (!/^[a-z0-9_]+$/.test(slug)) {
      setErro("Slug deve conter apenas letras minúsculas, números e underscore."); return;
    }

    setSalvando(true);
    try {
      if (editando) {
        const { error } = await supabase
          .from("operadoras")
          .update({ nome, ativo })
          .eq("slug", editando.slug);
        if (error) throw error;
      } else {
        // Verifica duplicidade de slug
        const { data: existe } = await supabase
          .from("operadoras")
          .select("slug")
          .eq("slug", slug)
          .maybeSingle();
        if (existe) { setErro("Este slug já está em uso."); setSalvando(false); return; }

        const { error } = await supabase
          .from("operadoras")
          .insert({ slug, nome, ativo: true });
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

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 999, padding: 24,
  };
  const modal: React.CSSProperties = {
    background: t.cardBg, borderRadius: 16, padding: 32,
    width: "100%", maxWidth: 460, border: `1px solid ${t.cardBorder}`,
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontFamily: FONT.body, fontSize: 12,
    fontWeight: 600, color: t.textMuted, marginBottom: 6,
    textTransform: "uppercase", letterSpacing: "0.8px",
  };
  const input: React.CSSProperties = {
    width: "100%", background: t.bg, border: `1px solid ${t.cardBorder}`,
    borderRadius: 8, padding: "10px 12px", color: t.text,
    fontFamily: FONT.body, fontSize: 14, boxSizing: "border-box",
  };
  const field: React.CSSProperties = { marginBottom: 18 };

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        <h2 style={{ fontFamily: FONT.title, fontSize: 20, color: t.text, margin: "0 0 24px" }}>
          {editando ? "Editar Operadora" : "Nova Operadora"}
        </h2>

        <div style={field}>
          <label style={labelStyle}>Nome</label>
          <input
            style={input}
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Ex: Blaze"
          />
        </div>

        <div style={field}>
          <label style={labelStyle}>
            Slug
            {editando && <span style={{ opacity: 0.4, fontWeight: 400, marginLeft: 6 }}>(não editável)</span>}
          </label>
          <input
            style={{
              ...input,
              opacity: editando ? 0.5 : 1,
              cursor: editando ? "not-allowed" : "text",
              fontFamily: "monospace",
              color: "#7c3aed",
            }}
            value={slug}
            onChange={e => !editando && setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            readOnly={!!editando}
            placeholder="ex: minha_operadora"
          />
          {!editando && (
            <p style={{ fontFamily: FONT.body, fontSize: 11, color: t.textMuted, marginTop: 4 }}>
              Gerado automaticamente. Não pode ser alterado após criação.
            </p>
          )}
        </div>

        {editando && (
          <div style={{ ...field, display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ ...labelStyle, margin: 0 }}>Status</label>
            <button
              onClick={() => setAtivo(prev => !prev)}
              style={{
                border: `1px solid ${ativo ? "#059669" : t.cardBorder}`,
                background: ativo ? "#05966922" : "transparent",
                color: ativo ? "#059669" : t.textMuted,
                borderRadius: 8, padding: "6px 16px", cursor: "pointer",
                fontFamily: FONT.body, fontSize: 13, fontWeight: 600,
              }}
            >
              {ativo ? "✓ Ativa" : "Inativa"}
            </button>
            {!ativo && (
              <span style={{ fontFamily: FONT.body, fontSize: 12, color: "#f59e0b" }}>
                ⚠️ Desativar não remove vínculos existentes
              </span>
            )}
          </div>
        )}

        {erro && (
          <p style={{ color: "#ef4444", fontFamily: FONT.body, fontSize: 13, marginBottom: 16 }}>{erro}</p>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <button onClick={onClose} style={{
            background: "none", border: `1px solid ${t.cardBorder}`,
            borderRadius: 8, padding: "9px 18px", cursor: "pointer",
            fontFamily: FONT.body, fontSize: 13, color: t.text,
          }}>
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando} style={{
            background: "linear-gradient(135deg, #7c3aed, #2563eb)",
            color: "#fff", border: "none", borderRadius: 8,
            padding: "9px 20px", cursor: salvando ? "not-allowed" : "pointer",
            fontFamily: FONT.body, fontSize: 13, fontWeight: 600, opacity: salvando ? 0.7 : 1,
          }}>
            {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar operadora"}
          </button>
        </div>
      </div>
    </div>
  );
}
