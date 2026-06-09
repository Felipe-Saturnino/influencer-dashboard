import { useState, useEffect, useCallback } from "react";
import { KeyRound } from "lucide-react";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { PAGE_SEARCH } from "../../../lib/searchBarConstants";
import { useApp } from "../../../context/AppContext";
import { supabase } from "../../../lib/supabase";
import { callSupabaseEdgeFunction, isAbortError } from "../../../lib/supabaseEdgeFetch";
import { FONT } from "../../../constants/theme";
import type { UsuarioCompleto, UserScope, Operadora } from "../../../types";
import type { Role } from "../../../types";
import { BRAND, roleLabel, roleBadgeColor, GESTOR_TIPOS, PRESTADOR_TIPOS, ROLES, type FiltroStatusUsuarios } from "./constants";
import { ModalUsuario } from "./ModalUsuario";
import { ModalConfirmDelete } from "../../../components/OperacoesModal";
import { AcaoCardSpinner, GestaoUsuariosLoading } from "./gestaoUsuariosUi";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import type { ContagensFiltroUsuarios } from "./GestaoUsuariosFiltroBar";

interface AbaUsuariosProps {
  /** Atalhos administrativos (criar/editar/desativar) só quando o utilizador é admin na app. */
  modoAdmin: boolean;
  /** Criar: botão «+ Novo Usuário» (matriz Gestão de Usuários / Criar). */
  podeCriarUsuario: boolean;
  /** Editar: modal Editar, reset senha, reativar. */
  podeEditarUsuario: boolean;
  /** Excluir: desativar utilizador. */
  podeExcluirUsuario: boolean;
  busca: string;
  onBuscaChange: (v: string) => void;
  filtroStatus: FiltroStatusUsuarios;
  filtroPerfilSet: Set<Role>;
  onContagensChange: (c: ContagensFiltroUsuarios) => void;
}

function formatarUltimoLogin(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function passaFiltroStatus(u: UsuarioCompleto, modo: FiltroStatusUsuarios): boolean {
  if (modo === "todos") return true;
  const ok = u.ativo !== false;
  return modo === "ativo" ? ok : !ok;
}

function passaFiltroPerfil(u: UsuarioCompleto, set: Set<Role>): boolean {
  if (set.size === 0) return true;
  return set.has(u.role);
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
    if (s.scope_type === "prestador_tipo") {
      const idx = PRESTADOR_TIPOS.findIndex((p) => p.slug === s.scope_ref);
      return {
        texto: PRESTADOR_TIPOS.find((p) => p.slug === s.scope_ref)?.label ?? s.scope_ref,
        ordem: idx >= 0 ? idx : 35,
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

export function AbaUsuarios({
  modoAdmin,
  podeCriarUsuario,
  podeEditarUsuario,
  podeExcluirUsuario,
  busca,
  onBuscaChange,
  filtroStatus,
  filtroPerfilSet,
  onContagensChange,
}: AbaUsuariosProps) {
  const { theme: t } = useApp();
  const [usuarios, setUsuarios] = useState<UsuarioCompleto[]>([]);
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<UsuarioCompleto | null>(null);
  const [modalDesativar, setModalDesativar] = useState<UsuarioCompleto | null>(null);
  const [modalResetSenha, setModalResetSenha] = useState<UsuarioCompleto | null>(null);
  const [feedbackAcao, setFeedbackAcao] = useState<{ tipo: "erro" | "ok"; msg: string } | null>(null);
  /** `${userId}:${action}` enquanto a Edge Function processa */
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<string | null>(null);

  const isCardBusy = (uid: string) => acaoEmAndamento?.startsWith(`${uid}:`) ?? false;
  const isEstaAcao = (uid: string, action: string) => acaoEmAndamento === `${uid}:${action}`;

  const carregar = useCallback(async () => {
    setLoading(true);
    const [{ data: profiles }, { data: scopes }, { data: ops }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, name, email, role, ativo, created_at, last_sign_in_at")
        .order("created_at", { ascending: true }),
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

  const executarAcaoAdmin = useCallback(
    async (u: UsuarioCompleto, action: "desativar" | "ativar" | "reset_senha") => {
      setFeedbackAcao(null);
      setAcaoEmAndamento(`${u.id}:${action}`);
      try {
        const loginUrl = typeof window !== "undefined" ? window.location.origin : "";
        const res = await callSupabaseEdgeFunction<{
          success?: boolean;
          emailEnviado?: boolean;
          emailErro?: string;
        }>("admin-usuario-acao", { userId: u.id, action, loginUrl });
        setModalDesativar(null);
        setModalResetSenha(null);
        if (action === "reset_senha") {
          if (res.emailEnviado === false) {
            setFeedbackAcao({
              tipo: "erro",
              msg:
                res.emailErro ??
                "Senha redefinida, mas não foi possível enviar o e-mail ao usuário. Verifique a configuração de e-mail no Supabase.",
            });
          } else {
            setFeedbackAcao({
              tipo: "ok",
              msg: "Senha redefinida para a padrão e e-mail enviado ao usuário. No próximo login será obrigatório definir uma nova senha.",
            });
          }
        } else {
          const okMsg =
            action === "desativar"
              ? "Usuário desativado. O acesso à plataforma foi bloqueado."
              : "Usuário ativado novamente.";
          setFeedbackAcao({ tipo: "ok", msg: okMsg });
        }
        await carregar();
      } catch (e) {
        console.error("[GestaoUsuarios] admin-usuario-acao:", e);
        const msg = isAbortError(e)
          ? "Tempo esgotado ou rede indisponível. Confira se a função admin-usuario-acao está deployada no Supabase."
          : "Não foi possível concluir a operação. Tente novamente.";
        setFeedbackAcao({ tipo: "erro", msg });
      } finally {
        setAcaoEmAndamento(null);
      }
    },
    [carregar]
  );

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

  const porBusca = busca.trim()
    ? usuarios.filter(
        (u) =>
          (u.name ?? "").toLowerCase().includes(busca.toLowerCase()) ||
          (u.email ?? "").toLowerCase().includes(busca.toLowerCase())
      )
    : usuarios;

  const baseContagemStatus = porBusca.filter((u) => passaFiltroPerfil(u, filtroPerfilSet));
  const qtdAtivos = baseContagemStatus.filter((u) => u.ativo !== false).length;
  const qtdDesativados = baseContagemStatus.length - qtdAtivos;

  const baseContagemPerfil = porBusca.filter((u) => passaFiltroStatus(u, filtroStatus));
  const qtdPorPerfil = Object.fromEntries(
    ROLES.map((r) => [r.value, baseContagemPerfil.filter((u) => u.role === r.value).length])
  ) as Record<Role, number>;

  const usuariosListaFinal = porBusca.filter(
    (u) => passaFiltroStatus(u, filtroStatus) && passaFiltroPerfil(u, filtroPerfilSet)
  );

  const contagensPerfilKey = ROLES.map((r) => qtdPorPerfil[r.value]).join(",");

  useEffect(
    () => {
      onContagensChange({ qtdAtivos, qtdDesativados, qtdPorPerfil });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- contagensPerfilKey resume qtdPorPerfil
    [qtdAtivos, qtdDesativados, contagensPerfilKey, onContagensChange],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <BarraPesquisaPagina
          value={busca}
          onChange={onBuscaChange}
          placeholder={PAGE_SEARCH.nomeEmail}
          aria-label="Buscar usuários por nome ou e-mail"
          wrapperStyle={{ flex: "1 1 240px", minWidth: 200, maxWidth: 480 }}
          inputStyle={{ fontSize: 14 }}
        />
        {modoAdmin && podeCriarUsuario ? (
          <CtaCriarButton type="button" onClick={abrirNovo} style={{ flexShrink: 0 }}>
            Novo Usuário
          </CtaCriarButton>
        ) : null}
      </div>

      {feedbackAcao && (
        <div
          role="alert"
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            fontSize: 13,
            fontFamily: FONT.body,
            border: `1px solid ${feedbackAcao.tipo === "ok" ? BRAND.verde : BRAND.vermelho}`,
            background: feedbackAcao.tipo === "ok" ? `${BRAND.verde}18` : `${BRAND.vermelho}14`,
            color: feedbackAcao.tipo === "ok" ? BRAND.verde : BRAND.vermelho,
          }}
        >
          {feedbackAcao.msg}
        </div>
      )}

      {loading ? (
        <GestaoUsuariosLoading />
      ) : usuariosListaFinal.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: t.textMuted,
            fontSize: 14,
            fontFamily: FONT.body,
            border: `1px dashed ${t.cardBorder}`,
            borderRadius: 14,
          }}
        >
          {usuarios.length === 0 ? "Nenhum usuário cadastrado." : "Nenhum usuário corresponde aos filtros ou à busca."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap: 16 }}>
          {usuariosListaFinal.map((u: UsuarioCompleto) => {
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
                  boxShadow: t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)",
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
                <div
                  style={{
                    fontSize: 12,
                    color: t.textMuted,
                    fontFamily: FONT.body,
                    lineHeight: 1.4,
                  }}
                >
                  <span style={{ fontWeight: 600, color: t.textMuted }}>Último login:</span>{" "}
                  <span style={{ color: t.text }}>{formatarUltimoLogin(u.last_sign_in_at)}</span>
                </div>
                {modoAdmin && (podeEditarUsuario || podeExcluirUsuario) ? (
                  <div style={{ display: "flex", gap: 8, marginTop: "auto", flexWrap: "wrap" }}>
                    {podeEditarUsuario ? (
                      <button
                        type="button"
                        disabled={isCardBusy(u.id)}
                        onClick={() => abrirEditar(u)}
                        style={{
                          background: `${BRAND.roxoVivo}12`,
                          border: `1px solid ${BRAND.roxoVivo}44`,
                          borderRadius: 8,
                          padding: "6px 14px",
                          cursor: isCardBusy(u.id) ? "not-allowed" : "pointer",
                          opacity: isCardBusy(u.id) ? 0.55 : 1,
                          fontFamily: FONT.body,
                          fontSize: 12,
                          color: BRAND.roxoVivo,
                          fontWeight: 600,
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          if (isCardBusy(u.id)) return;
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
                    ) : null}
                    {podeEditarUsuario ? (
                      <button
                        type="button"
                        disabled={isCardBusy(u.id)}
                        onClick={() => setModalResetSenha(u)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: `${BRAND.amarelo}18`,
                          border: `1px solid ${BRAND.amarelo}`,
                          borderRadius: 8,
                          padding: "6px 14px",
                          cursor: isCardBusy(u.id) ? "not-allowed" : "pointer",
                          opacity: isCardBusy(u.id) ? 0.55 : 1,
                          fontFamily: FONT.body,
                          fontSize: 12,
                          color: BRAND.amarelo,
                          fontWeight: 600,
                        }}
                      >
                        <KeyRound size={14} aria-hidden="true" />
                        {isEstaAcao(u.id, "reset_senha") ? (
                          <>
                            <AcaoCardSpinner color={BRAND.amarelo} />
                            Reset senha
                          </>
                        ) : (
                          "Reset senha"
                        )}
                      </button>
                    ) : null}
                    {ativo && podeExcluirUsuario ? (
                      <button
                        type="button"
                        disabled={isCardBusy(u.id)}
                        onClick={() => setModalDesativar(u)}
                        style={{
                          background: "none",
                          border: `1px solid ${BRAND.vermelho}`,
                          borderRadius: 8,
                          padding: "6px 14px",
                          cursor: isCardBusy(u.id) ? "not-allowed" : "pointer",
                          opacity: isCardBusy(u.id) ? 0.55 : 1,
                          fontFamily: FONT.body,
                          fontSize: 12,
                          color: BRAND.vermelho,
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          if (isCardBusy(u.id)) return;
                          e.currentTarget.style.background = `${BRAND.vermelho}18`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "none";
                        }}
                      >
                        {isEstaAcao(u.id, "desativar") ? (
                          <>
                            <AcaoCardSpinner color={BRAND.vermelho} />
                            Desativar
                          </>
                        ) : (
                          "Desativar"
                        )}
                      </button>
                    ) : null}
                    {!ativo && podeEditarUsuario ? (
                      <button
                        type="button"
                        disabled={isCardBusy(u.id)}
                        onClick={() => executarAcaoAdmin(u, "ativar")}
                        style={{
                          background: `${BRAND.verde}22`,
                          border: `1px solid ${BRAND.verde}`,
                          borderRadius: 8,
                          padding: "6px 14px",
                          cursor: isCardBusy(u.id) ? "not-allowed" : "pointer",
                          opacity: isCardBusy(u.id) ? 0.55 : 1,
                          fontFamily: FONT.body,
                          fontSize: 12,
                          color: BRAND.verde,
                          fontWeight: 600,
                        }}
                      >
                        {isEstaAcao(u.id, "ativar") ? (
                          <>
                            <AcaoCardSpinner color={BRAND.verde} />
                            Reativar
                          </>
                        ) : (
                          "Reativar"
                        )}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {modoAdmin && podeExcluirUsuario && modalDesativar && (
        <ModalConfirmDelete
          title="Desativar usuário"
          texto={`O usuário ${modalDesativar.name} perderá acesso imediato à plataforma. Deseja continuar?`}
          onCancel={() => {
            if (!acaoEmAndamento) setModalDesativar(null);
          }}
          onConfirm={() => {
            void executarAcaoAdmin(modalDesativar, "desativar");
          }}
          loading={isEstaAcao(modalDesativar.id, "desativar")}
          confirmLabel="Desativar"
        />
      )}

      {modoAdmin && podeEditarUsuario && modalResetSenha && (
        <ModalConfirmDelete
          title="Redefinir senha"
          texto={`A senha de ${modalResetSenha.name} voltará à senha padrão (mesma do cadastro de novos usuários). Enviaremos um e-mail com os dados de acesso. No próximo login será obrigatório definir uma nova senha.`}
          onCancel={() => {
            if (!acaoEmAndamento) setModalResetSenha(null);
          }}
          onConfirm={() => {
            void executarAcaoAdmin(modalResetSenha, "reset_senha");
          }}
          loading={isEstaAcao(modalResetSenha.id, "reset_senha")}
          confirmLabel="Confirmar reset"
          destructive={false}
        />
      )}

      {modoAdmin &&
        modalOpen &&
        ((!editando && podeCriarUsuario) || (!!editando && podeEditarUsuario)) && (
        <ModalUsuario
          key={editando?.id ?? "novo"}
          editando={editando}
          operadoras={operadoras}
          onClose={() => setModalOpen(false)}
          onSalvo={(aviso) => {
            void carregar();
            if (aviso) setFeedbackAcao({ tipo: "erro", msg: aviso });
          }}
        />
      )}
    </div>
  );
}
