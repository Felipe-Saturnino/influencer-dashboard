import { useState, useEffect, useCallback, useMemo } from "react";
import { KeyRound, Loader2, Pencil, UserCheck, UserX } from "lucide-react";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { PAGE_SEARCH } from "../../../lib/searchBarConstants";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";
import { useApp } from "../../../context/AppContext";
import { supabase } from "../../../lib/supabase";
import { callSupabaseEdgeFunction, isAbortError } from "../../../lib/supabaseEdgeFetch";
import { FONT } from "../../../constants/theme";
import type { UsuarioCompleto, UserScope, Operadora } from "../../../types";
import type { Role } from "../../../types";
import { BRAND, roleLabel, roleBadgeColor, PRESTADOR_TIPOS, ROLES, type FiltroStatusUsuarios } from "./constants";
import { ModalUsuario } from "./ModalUsuario";
import { ModalConfirmDelete } from "../../../components/OperacoesModal";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { TabelaPaginacaoBar } from "../../../components/TabelaPaginacaoBar";
import { SkeletonTableRow, SortTableTh, type SortDir } from "../../../components/dashboard";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { compareLocaleTexto, compareNumber } from "../../../lib/classificacaoSort";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { clampPageIndex, slicePage, TABELA_PAGE_SIZE_USUARIOS } from "../../../lib/tablePagination";
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

type UsuariosSortCol = "nome" | "email" | "perfil" | "escopo" | "ultimoLogin";

/** Linha da tabela — campos derivados calculados uma vez por usuário. */
type LinhaUsuario = {
  usuario: UsuarioCompleto;
  ativo: boolean;
  perfilLabel: string;
  perfilCor: string;
  escopoTexto: string;
  ultimoLoginTexto: string;
  ultimoLoginMs: number;
};

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

function timestampUltimoLogin(iso: string | null | undefined): number {
  if (!iso) return 0;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function compararLinhasUsuario(a: LinhaUsuario, b: LinhaUsuario, col: UsuariosSortCol, dir: SortDir): number {
  switch (col) {
    case "nome":
      return compareLocaleTexto(a.usuario.name ?? "", b.usuario.name ?? "", dir);
    case "email":
      return compareLocaleTexto(a.usuario.email ?? "", b.usuario.email ?? "", dir);
    case "perfil":
      return compareLocaleTexto(a.perfilLabel, b.perfilLabel, dir);
    case "escopo":
      return compareLocaleTexto(a.escopoTexto, b.escopoTexto, dir);
    default:
      return compareNumber(a.ultimoLoginMs, b.ultimoLoginMs, dir);
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
  const dataTable = useDataTableBlock();
  const [usuarios, setUsuarios] = useState<UsuarioCompleto[]>([]);
  const [sortUsuarios, setSortUsuarios] = useState<{ col: UsuariosSortCol; dir: SortDir }>({
    col: "ultimoLogin",
    dir: "desc",
  });
  const [pagina, setPagina] = useState(0);
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<UsuarioCompleto | null>(null);
  const [modalDesativar, setModalDesativar] = useState<UsuarioCompleto | null>(null);
  const [modalResetSenha, setModalResetSenha] = useState<UsuarioCompleto | null>(null);
  const [feedbackAcao, setFeedbackAcao] = useState<{ tipo: "erro" | "ok"; msg: string } | null>(null);
  /** `${userId}:${action}` enquanto a Edge Function processa */
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<string | null>(null);

  const isLinhaBusy = (uid: string) => acaoEmAndamento?.startsWith(`${uid}:`) ?? false;
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
    ? usuarios.filter((u) => textoContemBuscaEmAlgum(busca, u.name, u.email))
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

  const linhasOrdenadas = useMemo(() => {
    const linhas: LinhaUsuario[] = usuariosListaFinal.map((u) => ({
      usuario: u,
      ativo: u.ativo !== false,
      perfilLabel: roleLabel(u.role as Role),
      perfilCor: roleBadgeColor(u.role as Role),
      escopoTexto: formatarEscopo(u.scopes ?? [], operadoras) ?? "—",
      ultimoLoginTexto: formatarUltimoLogin(u.last_sign_in_at),
      ultimoLoginMs: timestampUltimoLogin(u.last_sign_in_at),
    }));
    return linhas.sort((a, b) => compararLinhasUsuario(a, b, sortUsuarios.col, sortUsuarios.dir));
  }, [usuariosListaFinal, operadoras, sortUsuarios.col, sortUsuarios.dir]);

  useEffect(() => {
    setPagina(0);
  }, [busca, filtroStatus, filtroPerfilSet, sortUsuarios.col, sortUsuarios.dir]);

  const paginaSafe = clampPageIndex(pagina, linhasOrdenadas.length, TABELA_PAGE_SIZE_USUARIOS);
  const linhasPagina = useMemo(
    () => slicePage(linhasOrdenadas, paginaSafe, TABELA_PAGE_SIZE_USUARIOS),
    [linhasOrdenadas, paginaSafe],
  );

  const onSortUsuarios = (col: UsuariosSortCol) => {
    setSortUsuarios((prev) =>
      prev.col === col ? { col, dir: prev.dir === "desc" ? "asc" : "desc" } : { col, dir: "desc" },
    );
  };

  const mostrarAcoes = modoAdmin && (podeEditarUsuario || podeExcluirUsuario);
  const colunasTabela = mostrarAcoes ? 6 : 5;

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

      <div>
        <div className="app-table-wrap" style={getDataTableWrapStyle()}>
          <table style={getDataTableStyle({ minWidth: 900 })}>
            <caption style={{ display: "none" }}>Usuários da plataforma</caption>
            <thead>
              <tr>
                <SortTableTh<UsuariosSortCol>
                  label="Nome do Usuário"
                  col="nome"
                  sortCol={sortUsuarios.col}
                  sortDir={sortUsuarios.dir}
                  onSort={onSortUsuarios}
                  thStyle={dataTable.thHeader}
                  align="left"
                />
                <SortTableTh<UsuariosSortCol>
                  label="E-mail"
                  col="email"
                  sortCol={sortUsuarios.col}
                  sortDir={sortUsuarios.dir}
                  onSort={onSortUsuarios}
                  thStyle={dataTable.thHeader}
                  align="left"
                />
                <SortTableTh<UsuariosSortCol>
                  label="Perfil"
                  col="perfil"
                  sortCol={sortUsuarios.col}
                  sortDir={sortUsuarios.dir}
                  onSort={onSortUsuarios}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                <SortTableTh<UsuariosSortCol>
                  label="Escopo"
                  col="escopo"
                  sortCol={sortUsuarios.col}
                  sortDir={sortUsuarios.dir}
                  onSort={onSortUsuarios}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                <SortTableTh<UsuariosSortCol>
                  label="Último Login"
                  col="ultimoLogin"
                  sortCol={sortUsuarios.col}
                  sortDir={sortUsuarios.dir}
                  onSort={onSortUsuarios}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                {mostrarAcoes ? (
                  <th scope="col" style={dataTable.thHeader}>
                    Ações
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonTableRow cols={colunasTabela} />
                  <SkeletonTableRow cols={colunasTabela} />
                  <SkeletonTableRow cols={colunasTabela} />
                </>
              ) : linhasOrdenadas.length === 0 ? (
                <tr>
                  <td
                    colSpan={colunasTabela}
                    style={{ ...dataTable.tdCenter, padding: "40px 16px", color: t.textMuted }}
                  >
                    {usuarios.length === 0
                      ? "Nenhum usuário cadastrado."
                      : "Nenhum usuário corresponde aos filtros ou à busca."}
                  </td>
                </tr>
              ) : (
                linhasPagina.map((linha, i) => {
                  const u = linha.usuario;
                  const zebraBg = dataTable.zebraRow(paginaSafe * TABELA_PAGE_SIZE_USUARIOS + i);
                  const linhaBusy = isLinhaBusy(u.id);
                  return (
                    <tr
                      key={u.id}
                      style={{ background: zebraBg, opacity: linha.ativo ? 1 : 0.7 }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = t.isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(0,0,0,0.02)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = zebraBg;
                      }}
                    >
                      <td style={{ ...dataTable.tdCenter, textAlign: "left", maxWidth: 240 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              minWidth: 0,
                              flex: "1 1 auto",
                            }}
                            title={u.name}
                          >
                            {u.name}
                          </span>
                          {!linha.ativo ? (
                            <span
                              style={{
                                flexShrink: 0,
                                padding: "2px 8px",
                                borderRadius: 999,
                                fontSize: 10,
                                fontWeight: 700,
                                color: t.textMuted,
                                border: `1px solid ${t.cardBorder}`,
                                background: t.inputBg,
                                whiteSpace: "nowrap",
                              }}
                            >
                              Desativado
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td
                        style={{
                          ...dataTable.tdCenter,
                          textAlign: "left",
                          maxWidth: 240,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={u.email}
                      >
                        {u.email}
                      </td>
                      <td style={dataTable.tdCenter}>
                        <span style={{ fontWeight: 700, color: linha.perfilCor }}>{linha.perfilLabel}</span>
                      </td>
                      <td
                        style={{
                          ...dataTable.tdCenter,
                          maxWidth: 220,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={linha.escopoTexto !== "—" ? linha.escopoTexto : undefined}
                      >
                        {linha.escopoTexto}
                      </td>
                      <td style={dataTable.tdCenter}>{linha.ultimoLoginTexto}</td>
                      {mostrarAcoes ? (
                        <td style={dataTable.tdCenter}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                            {podeEditarUsuario ? (
                              <BtnIconeAcaoLinha
                                label={tooltipAcao("Editar Usuário")}
                                disabled={linhaBusy}
                                onClick={() => abrirEditar(u)}
                              >
                                <Pencil size={14} aria-hidden />
                              </BtnIconeAcaoLinha>
                            ) : null}
                            {podeEditarUsuario ? (
                              <BtnIconeAcaoLinha
                                label={tooltipAcao("Redefinir Senha")}
                                disabled={linhaBusy}
                                onClick={() => setModalResetSenha(u)}
                                style={{ color: BRAND.amarelo, borderColor: `${BRAND.amarelo}55` }}
                              >
                                {isEstaAcao(u.id, "reset_senha") ? (
                                  <Loader2 size={14} className="app-lucide-spin" aria-hidden />
                                ) : (
                                  <KeyRound size={14} aria-hidden />
                                )}
                              </BtnIconeAcaoLinha>
                            ) : null}
                            {linha.ativo && podeExcluirUsuario ? (
                              <BtnIconeAcaoLinha
                                label={tooltipAcao("Desativar Usuário")}
                                disabled={linhaBusy}
                                onClick={() => setModalDesativar(u)}
                                style={{ color: BRAND.vermelho, borderColor: `${BRAND.vermelho}55` }}
                              >
                                {isEstaAcao(u.id, "desativar") ? (
                                  <Loader2 size={14} className="app-lucide-spin" aria-hidden />
                                ) : (
                                  <UserX size={14} aria-hidden />
                                )}
                              </BtnIconeAcaoLinha>
                            ) : null}
                            {!linha.ativo && podeEditarUsuario ? (
                              <BtnIconeAcaoLinha
                                label={tooltipAcao("Reativar Usuário")}
                                disabled={linhaBusy}
                                onClick={() => void executarAcaoAdmin(u, "ativar")}
                                style={{ color: BRAND.verde, borderColor: `${BRAND.verde}55` }}
                              >
                                {isEstaAcao(u.id, "ativar") ? (
                                  <Loader2 size={14} className="app-lucide-spin" aria-hidden />
                                ) : (
                                  <UserCheck size={14} aria-hidden />
                                )}
                              </BtnIconeAcaoLinha>
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && linhasOrdenadas.length > 0 ? (
          <TabelaPaginacaoBar
            t={t}
            page={paginaSafe}
            pageSize={TABELA_PAGE_SIZE_USUARIOS}
            totalItems={linhasOrdenadas.length}
            onPageChange={setPagina}
          />
        ) : null}
      </div>

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
