import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Eye, Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { PageHeader } from "../../../components/PageHeader";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { supabase } from "../../../lib/supabase";
import {
  PRESTADOR_TIPOS,
  roleLabel,
} from "../../../pages/plataforma/GestaoUsuarios/constants";
import type { PrestadorTipoSlug, Role } from "../../../types";
import type { Theme } from "../../../constants/theme";
import {
  filtrarLinhasSimuladorPorRoles,
  roleExigeOperadoraNaSimulacao,
  roleExigePrestadorTipoNaSimulacao,
} from "../../../lib/simuladorLogin";

type OperadoraOpt = { slug: string; nome: string; ativo: boolean };

type ModalOpcaoPerfil = "operadora" | "prestador_tipo";

export default function SimuladorLogin() {
  const { theme: t, simulacaoLogin, simuladorRolesPermitidos, iniciarSimulacaoLogin, encerrarSimulacaoLogin, navigateTo } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("simulador_login");

  const [modalOpcao, setModalOpcao] = useState<ModalOpcaoPerfil | null>(null);
  const [rolePendente, setRolePendente] = useState<Role | null>(null);
  const [operadoras, setOperadoras] = useState<OperadoraOpt[]>([]);
  const [carregandoOperadoras, setCarregandoOperadoras] = useState(false);
  const [operadoraSlug, setOperadoraSlug] = useState("");
  const [prestadorTipo, setPrestadorTipo] = useState<PrestadorTipoSlug | "">("");
  const [err, setErr] = useState("");
  const [iniciando, setIniciando] = useState(false);

  const pageBox = getPageContentBoxStyle(brand, t);

  const linhasPerfis = useMemo(
    () => filtrarLinhasSimuladorPorRoles(simuladorRolesPermitidos),
    [simuladorRolesPermitidos],
  );

  const carregarOperadoras = useCallback(async () => {
    setCarregandoOperadoras(true);
    const { data } = await supabase.from("operadoras").select("slug, nome, ativo").order("nome");
    setOperadoras((data ?? []) as OperadoraOpt[]);
    setCarregandoOperadoras(false);
  }, []);

  useEffect(() => {
    if (modalOpcao === "operadora" && operadoras.length === 0) {
      void carregarOperadoras();
    }
  }, [modalOpcao, operadoras.length, carregarOperadoras]);

  function fecharModal() {
    setModalOpcao(null);
    setRolePendente(null);
    setOperadoraSlug("");
    setPrestadorTipo("");
    setErr("");
  }

  function abrirModalOpcao(role: Role, tipo: ModalOpcaoPerfil) {
    setErr("");
    setRolePendente(role);
    setOperadoraSlug("");
    setPrestadorTipo("");
    setModalOpcao(tipo);
  }

  function selecionarPerfil(role: Role) {
    setErr("");
    if (roleExigeOperadoraNaSimulacao(role)) {
      abrirModalOpcao(role, "operadora");
      return;
    }
    if (roleExigePrestadorTipoNaSimulacao(role)) {
      abrirModalOpcao(role, "prestador_tipo");
      return;
    }
    void confirmarInicio(role);
  }

  async function confirmarInicio(
    role: Role,
    extra?: { operadoraSlug?: string; prestadorTipoSlug?: PrestadorTipoSlug },
  ) {
    setErr("");
    setIniciando(true);
    const erro = await iniciarSimulacaoLogin({
      role,
      operadoraSlug: extra?.operadoraSlug,
      prestadorTipoSlug: extra?.prestadorTipoSlug,
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
    if (modalOpcao === "operadora") {
      void confirmarInicio(rolePendente, { operadoraSlug });
      return;
    }
    if (modalOpcao === "prestador_tipo" && prestadorTipo) {
      void confirmarInicio(rolePendente, { prestadorTipoSlug: prestadorTipo });
    }
  }

  const modalTitulo =
    modalOpcao === "operadora"
      ? "Selecione a operadora"
      : modalOpcao === "prestador_tipo"
        ? "Selecione a área de prestador"
        : "";

  const modalConfirmDisabled =
    iniciando ||
    (modalOpcao === "operadora" && (!operadoraSlug || carregandoOperadoras)) ||
    (modalOpcao === "prestador_tipo" && !prestadorTipo);

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
      <div className="app-page-shell" style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <Loader2 className="app-lucide-spin" size={24} color="var(--brand-primary, #7c3aed)" aria-hidden />
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
        <div style={{ ...pageBox, marginBottom: 14 }}>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: t.text, fontFamily: FONT.body }}>
            Visualização ativa: <strong>{simulacaoLogin.labelExibicao}</strong> (somente leitura).
          </p>
          <button type="button" onClick={() => void encerrarSimulacaoLogin()} style={btnSecundario(t)}>
            Encerrar visualização
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
                  disabled={iniciando}
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
            ) : operadoras.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
                Nenhuma operadora ativa encontrada.
              </p>
            ) : (
              <ListaOpcoesRadio
                t={t}
                name="simulador-operadora"
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
              opcoes={PRESTADOR_TIPOS.map((tipo) => ({ value: tipo.slug, label: tipo.label }))}
              value={prestadorTipo}
              onChange={(v) => setPrestadorTipo(v as PrestadorTipoSlug)}
            />
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
                "Iniciar visualização"
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
  opcoes,
  value,
  onChange,
}: {
  t: Theme;
  name: string;
  opcoes: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Opções"
      style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "min(52dvh, 360px)", overflowY: "auto" }}
    >
      {opcoes.map((op) => (
        <label
          key={op.value}
          style={opcaoRadioStyle(t, value === op.value)}
        >
          <input
            type="radio"
            name={name}
            value={op.value}
            checked={value === op.value}
            onChange={() => onChange(op.value)}
          />
          {op.label}
        </label>
      ))}
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
