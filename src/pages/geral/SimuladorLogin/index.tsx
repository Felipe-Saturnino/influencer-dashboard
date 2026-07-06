import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowLeft, Eye, Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { PageHeader } from "../../../components/PageHeader";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { supabase } from "../../../lib/supabase";
import {
  FILTROS_PERFIL_LINHAS,
  GESTOR_TIPOS,
  PRESTADOR_TIPOS,
  roleLabel,
} from "../../../pages/plataforma/GestaoUsuarios/constants";
import type { GestorTipoSlug, PrestadorTipoSlug, Role } from "../../../types";
import {
  ROLES_SIMULAVEIS,
  roleExigeGestorTipoNaSimulacao,
  roleExigeOperadoraNaSimulacao,
  roleExigePrestadorTipoNaSimulacao,
} from "../../../lib/simuladorLogin";

type OperadoraOpt = { slug: string; nome: string };

type Etapa = "perfis" | "operadora" | "gestor_tipo" | "prestador_tipo";

export default function SimuladorLogin() {
  const { theme: t, simulacaoLogin, iniciarSimulacaoLogin, encerrarSimulacaoLogin, navigateTo } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("simulador_login");

  const [etapa, setEtapa] = useState<Etapa>("perfis");
  const [rolePendente, setRolePendente] = useState<Role | null>(null);
  const [operadoras, setOperadoras] = useState<OperadoraOpt[]>([]);
  const [carregandoOperadoras, setCarregandoOperadoras] = useState(false);
  const [operadoraSlug, setOperadoraSlug] = useState("");
  const [gestorTipo, setGestorTipo] = useState<GestorTipoSlug | "">("");
  const [prestadorTipo, setPrestadorTipo] = useState<PrestadorTipoSlug | "">("");
  const [err, setErr] = useState("");
  const [iniciando, setIniciando] = useState(false);

  const pageBox = getPageContentBoxStyle(brand, t);

  const linhasPerfis = useMemo(
    () =>
      FILTROS_PERFIL_LINHAS.map((linha) => ({
        titulo: linha.titulo,
        roles: linha.roles.filter((r) => ROLES_SIMULAVEIS.includes(r)),
      })).filter((l) => l.roles.length > 0),
    [],
  );

  const carregarOperadoras = useCallback(async () => {
    setCarregandoOperadoras(true);
    const { data } = await supabase
      .from("operadoras")
      .select("slug, nome")
      .eq("ativo", true)
      .order("nome");
    setOperadoras((data ?? []) as OperadoraOpt[]);
    setCarregandoOperadoras(false);
  }, []);

  useEffect(() => {
    if (etapa === "operadora" && operadoras.length === 0) {
      void carregarOperadoras();
    }
  }, [etapa, operadoras.length, carregarOperadoras]);

  function voltarPerfis() {
    setEtapa("perfis");
    setRolePendente(null);
    setOperadoraSlug("");
    setGestorTipo("");
    setPrestadorTipo("");
    setErr("");
  }

  function selecionarPerfil(role: Role) {
    setErr("");
    setRolePendente(role);
    if (roleExigeOperadoraNaSimulacao(role)) {
      setEtapa("operadora");
      return;
    }
    if (roleExigeGestorTipoNaSimulacao(role)) {
      setEtapa("gestor_tipo");
      return;
    }
    if (roleExigePrestadorTipoNaSimulacao(role)) {
      setEtapa("prestador_tipo");
      return;
    }
    void confirmarInicio(role);
  }

  async function confirmarInicio(
    role: Role,
    extra?: { operadoraSlug?: string; gestorTipoSlug?: GestorTipoSlug; prestadorTipoSlug?: PrestadorTipoSlug },
  ) {
    setErr("");
    setIniciando(true);
    const erro = await iniciarSimulacaoLogin({
      role,
      operadoraSlug: extra?.operadoraSlug,
      gestorTipoSlug: extra?.gestorTipoSlug,
      prestadorTipoSlug: extra?.prestadorTipoSlug,
    });
    setIniciando(false);
    if (erro) {
      setErr(erro);
      return;
    }
    navigateTo("home");
  }

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
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button type="button" onClick={voltarPerfis} style={btnSecundario(t)}>
              Alterar perfil
            </button>
            <button type="button" onClick={() => void encerrarSimulacaoLogin()} style={btnSecundario(t)}>
              Encerrar visualização
            </button>
          </div>
        </div>
      ) : null}

      {etapa !== "perfis" ? (
        <button
          type="button"
          onClick={voltarPerfis}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 14,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: t.textMuted,
            fontSize: 13,
            fontFamily: FONT.body,
            padding: 0,
          }}
        >
          <ArrowLeft size={14} aria-hidden />
          Voltar aos perfis
        </button>
      ) : null}

      {err ? (
        <div role="alert" aria-live="polite" style={{ ...alertErro, marginBottom: 14 }}>
          {err}
        </div>
      ) : null}

      {etapa === "perfis" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {linhasPerfis.map((linha) => (
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
          ))}
        </div>
      ) : null}

      {etapa === "operadora" && rolePendente === "operador" ? (
        <div style={pageBox}>
          <h2 style={tituloEtapa(t)}>Selecione a operadora</h2>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
            Perfil: {roleLabel("operador")}
          </p>
          {carregandoOperadoras ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: t.textMuted, fontSize: 13 }}>
              <Loader2 className="app-lucide-spin" size={14} aria-hidden />
              Carregando…
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
              {operadoras.map((op) => (
                <label
                  key={op.slug}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: `1px solid ${operadoraSlug === op.slug ? "var(--brand-primary, #7c3aed)" : t.cardBorder}`,
                    background:
                      operadoraSlug === op.slug
                        ? "color-mix(in srgb, var(--brand-primary, #7c3aed) 10%, transparent)"
                        : t.inputBg,
                    cursor: "pointer",
                    fontFamily: FONT.body,
                    fontSize: 13,
                    color: t.text,
                  }}
                >
                  <input
                    type="radio"
                    name="simulador-operadora"
                    value={op.slug}
                    checked={operadoraSlug === op.slug}
                    onChange={() => setOperadoraSlug(op.slug)}
                  />
                  {op.nome}
                </label>
              ))}
            </div>
          )}
          <button
            type="button"
            disabled={!operadoraSlug || iniciando || carregandoOperadoras}
            onClick={() => void confirmarInicio("operador", { operadoraSlug })}
            style={{ ...btnPrimario, marginTop: 20, opacity: !operadoraSlug || iniciando ? 0.6 : 1 }}
          >
            {iniciando ? "Iniciando…" : "Iniciar visualização"}
          </button>
        </div>
      ) : null}

      {etapa === "gestor_tipo" && rolePendente === "gestor" ? (
        <div style={pageBox}>
          <h2 style={tituloEtapa(t)}>Selecione o tipo de gestor</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
            {GESTOR_TIPOS.map((tipo) => (
              <label
                key={tipo.slug}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `1px solid ${gestorTipo === tipo.slug ? "var(--brand-primary, #7c3aed)" : t.cardBorder}`,
                  background:
                    gestorTipo === tipo.slug
                      ? "color-mix(in srgb, var(--brand-primary, #7c3aed) 10%, transparent)"
                      : t.inputBg,
                  cursor: "pointer",
                  fontFamily: FONT.body,
                  fontSize: 13,
                  color: t.text,
                }}
              >
                <input
                  type="radio"
                  name="simulador-gestor-tipo"
                  value={tipo.slug}
                  checked={gestorTipo === tipo.slug}
                  onChange={() => setGestorTipo(tipo.slug)}
                />
                {tipo.label}
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={!gestorTipo || iniciando}
            onClick={() => void confirmarInicio("gestor", { gestorTipoSlug: gestorTipo as GestorTipoSlug })}
            style={{ ...btnPrimario, marginTop: 20, opacity: !gestorTipo || iniciando ? 0.6 : 1 }}
          >
            {iniciando ? "Iniciando…" : "Iniciar visualização"}
          </button>
        </div>
      ) : null}

      {etapa === "prestador_tipo" && rolePendente === "prestador" ? (
        <div style={pageBox}>
          <h2 style={tituloEtapa(t)}>Selecione a área de prestador</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
            {PRESTADOR_TIPOS.map((tipo) => (
              <label
                key={tipo.slug}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `1px solid ${prestadorTipo === tipo.slug ? "var(--brand-primary, #7c3aed)" : t.cardBorder}`,
                  background:
                    prestadorTipo === tipo.slug
                      ? "color-mix(in srgb, var(--brand-primary, #7c3aed) 10%, transparent)"
                      : t.inputBg,
                  cursor: "pointer",
                  fontFamily: FONT.body,
                  fontSize: 13,
                  color: t.text,
                }}
              >
                <input
                  type="radio"
                  name="simulador-prestador-tipo"
                  value={tipo.slug}
                  checked={prestadorTipo === tipo.slug}
                  onChange={() => setPrestadorTipo(tipo.slug)}
                />
                {tipo.label}
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={!prestadorTipo || iniciando}
            onClick={() =>
              void confirmarInicio("prestador", {
                prestadorTipoSlug: prestadorTipo as PrestadorTipoSlug,
              })
            }
            style={{ ...btnPrimario, marginTop: 20, opacity: !prestadorTipo || iniciando ? 0.6 : 1 }}
          >
            {iniciando ? "Iniciando…" : "Iniciar visualização"}
          </button>
        </div>
      ) : null}
    </div>
  );
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

function tituloEtapa(t: { text: string }) {
  return {
    margin: "0 0 8px",
    fontSize: 14,
    fontWeight: 800,
    color: t.text,
    fontFamily: FONT.body,
  } as const;
}

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
