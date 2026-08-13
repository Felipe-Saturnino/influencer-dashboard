import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Eye, Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { PageHeader } from "../../../components/PageHeader";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { BarraPesquisaFiltroPainel } from "../../../components/BarraPesquisaFiltroPainel";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { FILTER_SEARCH_OPERADORA, FILTER_SEARCH_USUARIO } from "../../../lib/searchBarConstants";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";
import {
  PRESTADOR_TIPOS,
  roleLabel,
} from "../../../pages/plataforma/GestaoUsuarios/constants";
import type { PrestadorTipoSlug, Role } from "../../../types";
import type { Theme } from "../../../constants/theme";
import {
  carregarOperadorasParaSimulacao,
  carregarUsuariosAtivosParaSimulacao,
  filtrarLinhasSimuladorPorRoles,
  mensagemVazioUsuariosSimulacao,
  MSG_NENHUMA_OPERADORA_ENCONTRADA,
  roleExigeOperadoraNaSimulacao,
  roleExigePrestadorTipoNaSimulacao,
  type OperadoraSimulacaoOpt,
  type UsuarioSimulavelOpt,
} from "../../../lib/simuladorLogin";

type ModalOpcaoPerfil = "confirmar_troca" | "operadora" | "prestador_tipo" | "usuario";

export default function SimuladorLogin() {
  const {
    theme: t,
    user,
    simulacaoLogin,
    simuladorRolesPermitidos,
    iniciarSimulacaoLogin,
    encerrarSimulacaoLogin,
    navigateTo,
  } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("simulador_login");

  const [modalOpcao, setModalOpcao] = useState<ModalOpcaoPerfil | null>(null);
  const [rolePendente, setRolePendente] = useState<Role | null>(null);
  const [operadoras, setOperadoras] = useState<OperadoraSimulacaoOpt[]>([]);
  const [carregandoOperadoras, setCarregandoOperadoras] = useState(false);
  const [erroOperadoras, setErroOperadoras] = useState("");
  const [operadoraSlug, setOperadoraSlug] = useState("");
  const [prestadorTipo, setPrestadorTipo] = useState<PrestadorTipoSlug | "">("");
  const [usuarios, setUsuarios] = useState<UsuarioSimulavelOpt[]>([]);
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(false);
  const [erroUsuarios, setErroUsuarios] = useState("");
  const [usuarioId, setUsuarioId] = useState("");
  const [err, setErr] = useState("");
  const [iniciando, setIniciando] = useState(false);
  const [encerrando, setEncerrando] = useState(false);

  const pageBox = getPageContentBoxStyle(brand, t);

  const linhasPerfis = useMemo(
    () => filtrarLinhasSimuladorPorRoles(simuladorRolesPermitidos),
    [simuladorRolesPermitidos],
  );

  const carregarOperadoras = useCallback(async () => {
    setCarregandoOperadoras(true);
    setErroOperadoras("");
    const { operadoras: lista, erro } = await carregarOperadorasParaSimulacao();
    setOperadoras(lista);
    setErroOperadoras(erro ?? "");
    setCarregandoOperadoras(false);
  }, []);

  const carregarUsuarios = useCallback(
    async (role: Role, extra?: { operadoraSlug?: string; prestadorTipoSlug?: PrestadorTipoSlug }) => {
      if (!user?.id) return;
      setCarregandoUsuarios(true);
      setErroUsuarios("");
      setUsuarios([]);
      setUsuarioId("");
      const { usuarios: lista, erro } = await carregarUsuariosAtivosParaSimulacao({
        role,
        viewerUserId: user.id,
        operadoraSlug: extra?.operadoraSlug,
        prestadorTipoSlug: extra?.prestadorTipoSlug,
      });
      setUsuarios(lista);
      setErroUsuarios(erro ?? "");
      if (!erro && lista[0]) setUsuarioId(lista[0].id);
      setCarregandoUsuarios(false);
    },
    [user?.id],
  );

  useEffect(() => {
    if (modalOpcao === "operadora") {
      void carregarOperadoras();
    }
  }, [modalOpcao, carregarOperadoras]);

  useEffect(() => {
    if (modalOpcao !== "usuario" || !rolePendente) return;
    void carregarUsuarios(rolePendente, {
      operadoraSlug: operadoraSlug || undefined,
      prestadorTipoSlug: prestadorTipo || undefined,
    });
  }, [modalOpcao, rolePendente, operadoraSlug, prestadorTipo, carregarUsuarios]);

  function fecharModal() {
    setModalOpcao(null);
    setRolePendente(null);
    setOperadoraSlug("");
    setPrestadorTipo("");
    setUsuarios([]);
    setUsuarioId("");
    setErr("");
    setErroOperadoras("");
    setErroUsuarios("");
  }

  function abrirFluxo(role: Role) {
    setErr("");
    setRolePendente(role);
    setOperadoraSlug("");
    setPrestadorTipo("");
    setUsuarioId("");
    setUsuarios([]);
    if (roleExigeOperadoraNaSimulacao(role)) {
      setModalOpcao("operadora");
      return;
    }
    if (roleExigePrestadorTipoNaSimulacao(role)) {
      setModalOpcao("prestador_tipo");
      return;
    }
    setModalOpcao("usuario");
  }

  function selecionarPerfil(role: Role) {
    setErr("");
    setRolePendente(role);
    if (simulacaoLogin) {
      setModalOpcao("confirmar_troca");
      return;
    }
    abrirFluxo(role);
  }

  async function confirmarInicio(
    role: Role,
    extra: { userId: string; operadoraSlug?: string; prestadorTipoSlug?: PrestadorTipoSlug },
  ) {
    setErr("");
    setIniciando(true);
    const erro = await iniciarSimulacaoLogin({
      role,
      userId: extra.userId,
      operadoraSlug: extra.operadoraSlug,
      prestadorTipoSlug: extra.prestadorTipoSlug,
    });
    setIniciando(false);
    if (erro) {
      setErr(erro);
      return;
    }
    fecharModal();
    navigateTo("home");
  }

  function confirmarModal() {
    if (!rolePendente || !modalOpcao) return;
    if (modalOpcao === "confirmar_troca") {
      abrirFluxo(rolePendente);
      return;
    }
    if (modalOpcao === "operadora") {
      setModalOpcao("usuario");
      return;
    }
    if (modalOpcao === "prestador_tipo" && prestadorTipo) {
      setModalOpcao("usuario");
      return;
    }
    if (modalOpcao === "usuario" && usuarioId) {
      void confirmarInicio(rolePendente, {
        userId: usuarioId,
        operadoraSlug: operadoraSlug || undefined,
        prestadorTipoSlug: prestadorTipo || undefined,
      });
    }
  }

  async function encerrar() {
    if (encerrando) return;
    setErr("");
    setEncerrando(true);
    const falha = await encerrarSimulacaoLogin();
    setEncerrando(false);
    if (falha) setErr(falha);
  }

  const modalTitulo =
    modalOpcao === "confirmar_troca"
      ? "Substituir visualização"
      : modalOpcao === "operadora"
        ? "Selecione a operadora"
        : modalOpcao === "prestador_tipo"
          ? "Selecione a área de prestador"
          : modalOpcao === "usuario"
            ? "Selecione o usuário ativo"
            : "";

  const modalConfirmLabel =
    modalOpcao === "confirmar_troca"
      ? "Substituir"
      : modalOpcao === "usuario"
        ? "Iniciar visualização"
        : "Continuar";

  const modalConfirmDisabled =
    iniciando ||
    (modalOpcao === "operadora" && (!operadoraSlug || carregandoOperadoras || !!erroOperadoras)) ||
    (modalOpcao === "prestador_tipo" && !prestadorTipo) ||
    (modalOpcao === "usuario" && (!usuarioId || carregandoUsuarios || !!erroUsuarios));

  if (perm.canView === "nao") {
    return (
      <div
        className="app-page-shell"
        style={{ padding: 48, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}
      >
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  if (perm.loading) {
    return (
      <div
        className="app-page-shell"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 400,
          color: t.textMuted,
          fontFamily: FONT.body,
        }}
      >
        <Loader2 className="app-lucide-spin" size={24} color="var(--brand-primary, #7c3aed)" aria-hidden />
        <div style={{ fontSize: 13, marginTop: 12 }}>Carregando…</div>
      </div>
    );
  }

  return (
    <div className="app-page-shell">
      <PageHeader
        icon={<Eye size={16} aria-hidden />}
        title="Simulador de Login"
        subtitle="Visualize a plataforma com o menu e a identidade de outro perfil, sem trocar sua conta."
      />

      {simulacaoLogin ? (
        <div style={pageBox}>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: t.text, fontFamily: FONT.body }}>
            Visualização ativa: <strong>{simulacaoLogin.labelExibicao}</strong> (somente leitura). Sua conta não
            muda.
          </p>
          <button type="button" onClick={() => void encerrar()} disabled={encerrando} style={btnSecundario(t)}>
            {encerrando ? "Encerrando…" : "Encerrar visualização"}
          </button>
        </div>
      ) : null}

      {!modalOpcao && err ? (
        <div role="alert" aria-live="polite" style={{ ...alertErro, marginBottom: 14 }}>
          {err}
        </div>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {linhasPerfis.length === 0 ? (
          <div style={{ ...pageBox, padding: "40px 20px", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Nenhum perfil liberado para visualização. Peça ao administrador para configurar em Gestão de Usuários → Simulador de Login.
          </div>
        ) : (
          linhasPerfis.map((linha) => (
          <div key={linha.titulo} style={pageBox}>
            <h2
              style={{
                margin: "0 0 12px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: t.textMuted,
                fontFamily: FONT.body,
              }}
            >
              {linha.titulo}
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", width: "100%" }}>
              {linha.roles.map((role) => (
                <button
                  key={role}
                  type="button"
                  disabled={iniciando || encerrando}
                  onClick={() => selecionarPerfil(role)}
                  style={btnPerfil(t, brand)}
                >
                  {roleLabel(role)}
                </button>
              ))}
            </div>
          </div>
        ))
        )}
      </div>

      {modalOpcao && rolePendente ? (
        <ModalBase maxWidth={480} onClose={fecharModal}>
          <ModalHeader title={modalTitulo} onClose={fecharModal} />
          <p style={{ margin: "0 0 16px", fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
            Perfil: <strong style={{ color: t.text }}>{roleLabel(rolePendente)}</strong>
          </p>

          {modalOpcao === "confirmar_troca" ? (
            <p style={{ margin: "0 0 8px", fontSize: 13, color: t.text, fontFamily: FONT.body, lineHeight: 1.55 }}>
              Já há uma visualização ativa: <strong>{simulacaoLogin?.labelExibicao}</strong>. Deseja substituir?
            </p>
          ) : null}

          {err ? (
            <div role="alert" aria-live="polite" style={{ ...alertErro, marginBottom: 14 }}>
              {err}
            </div>
          ) : null}

          {modalOpcao === "operadora" ? (
            carregandoOperadoras ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: t.textMuted, fontSize: 13 }}>
                <Loader2 className="app-lucide-spin" size={14} aria-hidden />
                Carregando…
              </div>
            ) : erroOperadoras ? (
              <p style={{ margin: 0, fontSize: 13, color: "#e84025", fontFamily: FONT.body }}>{erroOperadoras}</p>
            ) : operadoras.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
                {MSG_NENHUMA_OPERADORA_ENCONTRADA}
              </p>
            ) : (
              <ListaOpcoesRadio
                t={t}
                name="simulador-operadora"
                ariaLabel="Operadoras"
                buscaPlaceholder={FILTER_SEARCH_OPERADORA}
                opcoes={operadoras.map((op) => ({
                  value: op.slug,
                  label: op.ativo ? op.nome : `${op.nome} (inativa)`,
                }))}
                value={operadoraSlug}
                onChange={setOperadoraSlug}
              />
            )
          ) : null}

          {modalOpcao === "prestador_tipo" ? (
            <ListaOpcoesRadio
              t={t}
              name="simulador-prestador-tipo"
              ariaLabel="Áreas de prestador"
              opcoes={PRESTADOR_TIPOS.map((tipo) => ({ value: tipo.slug, label: tipo.label }))}
              value={prestadorTipo}
              onChange={(v) => setPrestadorTipo(v as PrestadorTipoSlug)}
            />
          ) : null}

          {modalOpcao === "usuario" ? (
            carregandoUsuarios ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: t.textMuted, fontSize: 13 }}>
                <Loader2 className="app-lucide-spin" size={14} aria-hidden />
                Carregando…
              </div>
            ) : erroUsuarios ? (
              <p style={{ margin: 0, fontSize: 13, color: "#e84025", fontFamily: FONT.body }}>{erroUsuarios}</p>
            ) : usuarios.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
                {mensagemVazioUsuariosSimulacao({
                  operadoraSlug: operadoraSlug || undefined,
                  prestadorTipoSlug: prestadorTipo || undefined,
                })}
              </p>
            ) : (
              <ListaOpcoesRadio
                t={t}
                name="simulador-usuario"
                ariaLabel="Usuários ativos"
                buscaPlaceholder={FILTER_SEARCH_USUARIO}
                opcoes={usuarios.map((u) => ({
                  value: u.id,
                  label: u.email ? `${u.name} — ${u.email}` : u.name,
                }))}
                value={usuarioId}
                onChange={setUsuarioId}
              />
            )
          ) : null}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              justifyContent: "flex-end",
              marginTop: 24,
            }}
          >
            <button
              type="button"
              disabled={modalConfirmDisabled}
              onClick={confirmarModal}
              aria-busy={iniciando}
              style={{
                ...btnPrimario,
                opacity: modalConfirmDisabled ? 0.6 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {iniciando ? (
                <>
                  <Loader2 className="app-lucide-spin" size={14} color="#fff" aria-hidden />
                  Iniciando…
                </>
              ) : (
                modalConfirmLabel
              )}
            </button>
          </div>
        </ModalBase>
      ) : null}
    </div>
  );
}

function ListaOpcoesRadio({
  t,
  name,
  ariaLabel,
  opcoes,
  value,
  onChange,
  buscaPlaceholder,
}: {
  t: Theme;
  name: string;
  ariaLabel: string;
  opcoes: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  buscaPlaceholder?: string;
}) {
  const [busca, setBusca] = useState("");
  const mostrarBusca = opcoes.length > 5;
  const filtradas = mostrarBusca
    ? opcoes.filter((op) => textoContemBuscaEmAlgum(busca, op.label))
    : opcoes;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {mostrarBusca && buscaPlaceholder ? (
        <BarraPesquisaFiltroPainel
          value={busca}
          onChange={setBusca}
          placeholder={buscaPlaceholder}
          aria-label={buscaPlaceholder.replace(/\.{3}$/, "")}
        />
      ) : null}
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "min(52dvh, 360px)", overflowY: "auto" }}
      >
        {filtradas.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
            Nenhum resultado para a busca.
          </p>
        ) : (
          filtradas.map((op) => (
            <label key={op.value} style={opcaoRadioStyle(t, value === op.value)}>
              <input
                type="radio"
                name={name}
                value={op.value}
                checked={value === op.value}
                onChange={() => onChange(op.value)}
              />
              {op.label}
            </label>
          ))
        )}
      </div>
    </div>
  );
}

function opcaoRadioStyle(t: Theme, ativo: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    borderRadius: 10,
    border: `1px solid ${ativo ? "var(--brand-primary, #7c3aed)" : t.cardBorder}`,
    background: ativo ? "color-mix(in srgb, var(--brand-primary, #7c3aed) 10%, transparent)" : t.inputBg,
    cursor: "pointer",
    fontFamily: FONT.body,
    fontSize: 13,
    color: t.text,
  };
}

const btnPrimario: CSSProperties = {
  border: "none",
  borderRadius: 10,
  padding: "10px 20px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  color: "#fff",
  background: "linear-gradient(135deg, var(--brand-primary, #4a2082), var(--brand-accent, #1e36f8))",
};

const alertErro: CSSProperties = {
  color: "#e84025",
  fontSize: 12,
  fontFamily: FONT.body,
  padding: "12px 16px",
  borderRadius: 10,
  background: "rgba(232,64,37,0.12)",
  border: "1px solid rgba(232,64,37,0.35)",
};

function btnPerfil(
  t: { text: string; cardBorder: string; inputBg?: string },
  brand: { primary: string },
): CSSProperties {
  return {
    padding: "10px 18px",
    borderRadius: 10,
    minHeight: 44,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: brand.primary,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT.body,
  };
}

function btnSecundario(t: { text: string; cardBorder: string; inputBg?: string }): CSSProperties {
  return {
    padding: "10px 18px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT.body,
  };
}
