import { useState, useEffect, useCallback } from "react";
import { X, Search, AlertCircle } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { FONT } from "../../../constants/theme";
import type { UsuarioCompleto, UserScope, Operadora } from "../../../types";
import type { Role } from "../../../types";
import type { Theme } from "../../../constants/theme";
import { BRAND, roleLabel, roleBadgeColor, GESTOR_TIPOS } from "./constants";
import { ModalUsuario } from "./ModalUsuario";

type FiltroStatus = "todos" | "ativos" | "desativados";

interface AbaUsuariosProps {
  t: Theme;
}

function formatarEscopo(scopes: UserScope[], ops: Operadora[]): string | null {
  if (!scopes || scopes.length === 0) return null;
  type Parte = { texto: string; ordem: number };
  const partes: Parte[] = scopes.map((s) => {
    if (s.scope_type === "operadora") {
      return { texto: ops.find((o) => o.slug === s.scope_ref)?.nome ?? s.scope_ref, ordem: 50 };
    }
    if (s.scope_type === "agencia_par") {
      const [, slug] = s.scope_ref.split(":");
      return { texto: ops.find((o) => o.slug === slug)?.nome ?? slug, ordem: 50 };
    }
    if (s.scope_type === "gestor_tipo") {
      const idx = GESTOR_TIPOS.findIndex((g) => g.slug === s.scope_ref);
      return {
        texto: GESTOR_TIPOS.find((g) => g.slug === s.scope_ref)?.label ?? s.scope_ref,
        ordem: idx >= 0 ? idx : 40,
      };
    }
    return { texto: "Influencer", ordem: 60 };
  });
  const unicos = new Map<string, Parte>();
  for (const p of partes) {
    if (!unicos.has(p.texto) || p.ordem < unicos.get(p.texto)!.ordem) unicos.set(p.texto, p);
  }
  return [...unicos.values()]
    .sort((a, b) => a.ordem - b.ordem || a.texto.localeCompare(b.texto, "pt-BR"))
    .map((p) => p.texto)
    .join(", ");
}

export function AbaUsuarios({ t }: AbaUsuariosProps) {
  const [usuarios, setUsuarios] = useState<UsuarioCompleto[]>([]);
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<UsuarioCompleto | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [modalDesativar, setModalDesativar] = useState<UsuarioCompleto | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [{ data: profiles }, { data: scopes }, { data: ops }] = await Promise.all([
      supabase.from("profiles").select("id, name, email, role, ativo, created_at").order("created_at", { ascending: true }),
      supabase.from("user_scopes").select("*"),
      supabase.from("operadoras").select("*").order("nome"),
    ]);
    const lista: UsuarioCompleto[] = (profiles ?? []).map((p) => ({
      ...p,
      scopes: (scopes ?? []).filter((s) => s.user_id === p.id),
    }));
    setUsuarios(lista);
    setOperadoras(ops ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirNovo = () => {
    setEditando(null);
    setModalOpen(true);
  };
  const abrirEditar = (u: UsuarioCompleto) => {
    setEditando(u);
    setModalOpen(true);
  };

  const usuariosFiltrados = busca.trim()
    ? usuarios.filter(
        (u) =>
          (u.name ?? "").toLowerCase().includes(busca.toLowerCase()) ||
          (u.email ?? "").toLowerCase().includes(busca.toLowerCase())
      )
    : usuarios;

  const usuariosPorStatus = usuariosFiltrados.filter((u: UsuarioCompleto) => {
    const ativo = u.ativo !== false;
    if (filtroStatus === "todos") return true;
    if (filtroStatus === "ativos") return ativo;
    return !ativo;
  });

  const desativarOuReativar = async (u: UsuarioCompleto) => {
    const novoAtivo = u.ativo === false;
    const { error } = await supabase.from("profiles").update({ ativo: novoAtivo }).eq("id", u.id);
    if (!error) {
      setModalDesativar(null);
      carregar();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ position: "relative" }}>
          <Search
            size={14}
            color={t.textMuted}
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 16px 10px 36px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg ?? t.cardBg,
              color: t.text,
              fontSize: 14,
              fontFamily: FONT.body,
              outline: "none",
              transition: "border-color 0.18s",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = BRAND.roxoVivo; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = t.cardBorder; }}
          />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {(["todos", "ativos", "desativados"] as const).map((f) => {
              const ativo = filtroStatus === f;
              return (
                <button
                  key={f}
                  onClick={() => setFiltroStatus(f)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    border: `1px solid ${ativo ? BRAND.roxoVivo : t.cardBorder}`,
                    background: ativo ? `${BRAND.roxoVivo}22` : t.inputBg ?? "transparent",
                    color: ativo ? BRAND.roxoVivo : t.textMuted,
                    fontSize: 13,
                    fontWeight: ativo ? 700 : 400,
                    cursor: "pointer",
                    fontFamily: FONT.body,
                    transition: "all 0.18s",
                  }}
                >
                  {f === "todos" ? "Todos" : f === "ativos" ? "Ativos" : "Desativados"}
                </button>
              );
            })}
          </div>
          <span
            style={{
              background: t.cardBorder,
              borderRadius: 20,
              padding: "2px 10px",
              fontSize: 12,
              color: t.textMuted,
              fontFamily: FONT.body,
            }}
          >
            {usuariosPorStatus.length} usuário{usuariosPorStatus.length !== 1 ? "s" : ""}
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={abrirNovo}
            style={{
              background: BRAND.gradiente,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "9px 18px",
              cursor: "pointer",
              fontFamily: FONT.body,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            + Novo Usuário
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: t.textMuted, fontFamily: FONT.body }}>Carregando...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap: 16 }}>
          {usuariosPorStatus.map((u: UsuarioCompleto) => {
            const escopoTexto = formatarEscopo(u.scopes ?? [], operadoras);
            const ativo = u.ativo !== false;
            const corPerfil = roleBadgeColor(u.role as Role);
            return (
              <div
                key={u.id}
                style={{
                  background: t.cardBg,
                  border: `1px solid ${t.cardBorder}`,
                  borderLeft: `3px solid ${corPerfil}`,
                  borderRadius: 14,
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  opacity: ativo ? 1 : 0.75,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
                  transition: "box-shadow 0.18s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <strong style={{ fontFamily: FONT.body, fontSize: 15, color: t.text, display: "block" }}>
                      {u.name}
                    </strong>
                    <div
                      style={{
                        fontSize: 12,
                        color: t.textMuted,
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "100%",
                      }}
                    >
                      {u.email}
                    </div>
                  </div>
                  <span
                    style={{
                      background: ativo ? "#22c55e22" : t.cardBorder,
                      color: ativo ? BRAND.verde : t.textMuted,
                      border: `1px solid ${ativo ? BRAND.verde : t.cardBorder}`,
                      borderRadius: 20,
                      padding: "3px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: FONT.body,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {ativo ? "Ativo" : "Desativado"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <span
                    style={{
                      background: `${corPerfil}22`,
                      color: corPerfil,
                      border: `1px solid ${corPerfil}`,
                      borderRadius: 20,
                      padding: "3px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: FONT.body,
                      textTransform: "uppercase",
                      letterSpacing: "0.3px",
                    }}
                  >
                    {roleLabel(u.role as Role)}
                  </span>
                  {escopoTexto && <span style={{ fontSize: 12, color: t.textMuted }}>{escopoTexto}</span>}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                  <button
                    onClick={() => abrirEditar(u)}
                    style={{
                      background: `${BRAND.roxoVivo}12`,
                      border: `1px solid ${BRAND.roxoVivo}44`,
                      borderRadius: 8,
                      padding: "6px 14px",
                      cursor: "pointer",
                      fontFamily: FONT.body,
                      fontSize: 12,
                      color: BRAND.roxoVivo,
                      fontWeight: 600,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `${BRAND.roxoVivo}22`;
                      e.currentTarget.style.borderColor = BRAND.roxoVivo;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = `${BRAND.roxoVivo}12`;
                      e.currentTarget.style.borderColor = `${BRAND.roxoVivo}44`;
                    }}
                  >
                    Editar
                  </button>
                  {ativo ? (
                    <button
                      onClick={() => setModalDesativar(u)}
                      style={{
                        background: "none",
                        border: `1px solid ${BRAND.vermelho}`,
                        borderRadius: 8,
                        padding: "6px 14px",
                        cursor: "pointer",
                        fontFamily: FONT.body,
                        fontSize: 12,
                        color: BRAND.vermelho,
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = `${BRAND.vermelho}18`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                    >
                      Desativar
                    </button>
                  ) : (
                    <button
                      onClick={() => desativarOuReativar(u)}
                      style={{
                        background: `${BRAND.verde}22`,
                        border: `1px solid ${BRAND.verde}`,
                        borderRadius: 8,
                        padding: "6px 14px",
                        cursor: "pointer",
                        fontFamily: FONT.body,
                        fontSize: 12,
                        color: BRAND.verde,
                        fontWeight: 600,
                      }}
                    >
                      Reativar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalDesativar && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setModalDesativar(null)}
        >
          <div
            style={{
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 20,
              padding: "28px 32px",
              maxWidth: 400,
              width: "90%",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setModalDesativar(null)}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: t.textMuted,
                display: "flex",
                padding: 4,
              }}
            >
              <X size={18} />
            </button>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                background: `${BRAND.vermelho}18`,
                border: `1px solid ${BRAND.vermelho}44`,
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 20,
              }}
            >
              <AlertCircle size={16} color={BRAND.vermelho} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontFamily: FONT.body, fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 4 }}>
                  Desativar usuário
                </div>
                <p style={{ fontFamily: FONT.body, fontSize: 13, color: t.textMuted, margin: 0 }}>
                  O usuário <strong>{modalDesativar.name}</strong> perderá acesso imediato à plataforma. Deseja continuar?
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setModalDesativar(null)}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: `1px solid ${t.cardBorder}`,
                  background: "transparent",
                  color: t.text,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: FONT.body,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => desativarOuReativar(modalDesativar)}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: BRAND.vermelho,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: FONT.body,
                }}
              >
                Desativar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <ModalUsuario
          t={t}
          editando={editando}
          operadoras={operadoras}
          onClose={() => setModalOpen(false)}
          onSalvo={carregar}
        />
      )}
    </div>
  );
}
