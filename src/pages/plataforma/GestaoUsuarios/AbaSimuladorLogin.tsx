import { useState, useEffect, useCallback, useRef } from "react";
import { ShieldCheck, AlertCircle } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { supabase } from "../../../lib/supabase";
import { FONT } from "../../../constants/theme";
import {
  BRAND,
  FILTROS_PERFIL_LINHAS_SIMULADOR,
  ROLES_SIMULAVEIS,
  roleLabel,
} from "./constants";
import { Checkbox } from "./Checkbox";
import { GestaoUsuariosLoading, SalvarCtaContent } from "./gestaoUsuariosUi";
import {
  brandTintBg,
  ctaGradientSalvar,
  MSG_ERRO_CARREGAR_GESTAO,
  MSG_ERRO_SALVAR_GESTAO,
  MSG_ERRO_SALVAR_RECARREGAR,
  sincronizarLinhasTabela,
} from "./gestaoUsuariosHelpers";
import type { Role } from "../../../types";

interface Props {
  viewerRole: Role;
  onDirtyChange?: (dirty: boolean) => void;
}

type SimRow = { viewer_role: string; simulavel_role: string };

function setFromRoles(roles: Iterable<Role>): Set<Role> {
  return new Set(roles);
}

function sameRoleSet(a: Set<Role>, b: Set<Role>): boolean {
  if (a.size !== b.size) return false;
  for (const r of a) if (!b.has(r)) return false;
  return true;
}

export function AbaSimuladorLogin({ viewerRole, onDirtyChange }: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [marcados, setMarcados] = useState<Set<Role>>(() => new Set());
  const baselineRef = useRef<Set<Role>>(new Set());
  const [loading, setLoading] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvoOk, setSalvoOk] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErroSalvar(null);
    setErroCarregar(null);
    const { data, error } = await supabase
      .from("simulador_login_roles")
      .select("simulavel_role")
      .eq("viewer_role", viewerRole);
    if (error) {
      console.error("Erro ao carregar simulador_login_roles:", error);
      setMarcados(new Set());
      baselineRef.current = new Set();
      setErroCarregar(MSG_ERRO_CARREGAR_GESTAO);
      onDirtyChange?.(false);
      setLoading(false);
      return;
    }
    const set = new Set<Role>();
    (data ?? []).forEach((row: { simulavel_role: string }) => {
      const role = row.simulavel_role as Role;
      if (ROLES_SIMULAVEIS.includes(role)) set.add(role);
    });
    setMarcados(set);
    baselineRef.current = setFromRoles(set);
    onDirtyChange?.(false);
    setLoading(false);
  }, [viewerRole, onDirtyChange]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const toggleRole = (simulavel: Role) => {
    setMarcados((prev) => {
      const next = new Set(prev);
      if (next.has(simulavel)) next.delete(simulavel);
      else next.add(simulavel);
      onDirtyChange?.(!sameRoleSet(next, baselineRef.current));
      return next;
    });
  };

  const salvar = async () => {
    if (erroCarregar) return;
    setSalvando(true);
    setSalvoOk(false);
    setErroSalvar(null);

    const desired: SimRow[] = [...marcados].map((simulavel_role) => ({
      viewer_role: viewerRole,
      simulavel_role,
    }));

    try {
      const { data: existingRaw, error: loadErr } = await supabase
        .from("simulador_login_roles")
        .select("viewer_role, simulavel_role")
        .eq("viewer_role", viewerRole);
      if (loadErr) {
        setErroSalvar(MSG_ERRO_SALVAR_GESTAO);
        setSalvando(false);
        return;
      }
      const existing = (existingRaw ?? []) as SimRow[];

      const result = await sincronizarLinhasTabela({
        table: "simulador_login_roles",
        existing,
        desired,
        keyOf: (r) => `${r.viewer_role}::${r.simulavel_role}`,
        deleteEq: (r) =>
          supabase
            .from("simulador_login_roles")
            .delete()
            .eq("viewer_role", r.viewer_role)
            .eq("simulavel_role", r.simulavel_role),
      });

      if (result === "insert") {
        setErroSalvar(MSG_ERRO_SALVAR_GESTAO);
        setSalvando(false);
        return;
      }
      if (result === "delete") {
        setErroSalvar(MSG_ERRO_SALVAR_RECARREGAR);
        setSalvando(false);
        return;
      }

      baselineRef.current = setFromRoles(marcados);
      onDirtyChange?.(false);
      setSalvoOk(true);
      setTimeout(() => setSalvoOk(false), 2500);
    } catch (err) {
      console.error("[GestaoUsuarios] salvar Simulador de Login:", err);
      setErroSalvar(MSG_ERRO_SALVAR_GESTAO);
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return <GestaoUsuariosLoading />;
  }

  if (erroCarregar) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", padding: 24 }}>
        <div role="alert" style={{ color: "#e84025", fontFamily: FONT.body, fontSize: 13, textAlign: "center" }}>
          {erroCarregar}
        </div>
        <button
          type="button"
          onClick={() => void carregar()}
          style={{
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.text,
            borderRadius: 10,
            padding: "8px 16px",
            cursor: "pointer",
            fontFamily: FONT.body,
            fontSize: 13,
          }}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ fontFamily: FONT.body, fontSize: 12, color: t.textMuted, margin: 0 }}>
        Para o perfil <strong style={{ color: t.text }}>{roleLabel(viewerRole)}</strong>, marque quais perfis
        aparecem na página <strong style={{ color: t.text }}>Simulador de Login</strong>. Isso só vale para quem
        também tiver permissão de <strong style={{ color: t.text }}>Ver</strong> em Simulador de Login na aba{" "}
        <strong style={{ color: t.text }}>Permissões</strong>. Administrador sempre vê todos os perfis simuláveis.
        Alterações podem exigir novo login ou atualização da página do simulador.
      </p>

      <div
        style={{
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 12,
          overflow: "hidden",
          borderLeft: `4px solid ${BRAND.roxo}`,
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            background: brandTintBg("12", "var(--brand-primary, #7c3aed)"),
            fontFamily: FONT.body,
            fontWeight: 700,
            fontSize: 14,
            color: t.text,
          }}
        >
          Perfis disponíveis para {roleLabel(viewerRole)}
        </div>

        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {FILTROS_PERFIL_LINHAS_SIMULADOR.map((linha) => (
            <div key={linha.titulo}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: t.textMuted,
                  fontFamily: FONT.body,
                  marginBottom: 10,
                }}
              >
                {linha.titulo}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {linha.roles.map((simulavel) => (
                  <label
                    key={simulavel}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      fontFamily: FONT.body,
                      fontSize: 13,
                      color: t.text,
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: `1px solid ${marcados.has(simulavel) ? "var(--brand-primary, #7c3aed)" : t.cardBorder}`,
                      background: marcados.has(simulavel)
                        ? "color-mix(in srgb, var(--brand-primary, #7c3aed) 10%, transparent)"
                        : t.inputBg,
                    }}
                  >
                    <Checkbox
                      checked={marcados.has(simulavel)}
                      onChange={() => toggleRole(simulavel)}
                      label={`Simular perfil ${roleLabel(simulavel)}`}
                    />
                    {roleLabel(simulavel)}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "stretch" }}>
        {erroSalvar ? (
          <div
            role="alert"
            aria-live="polite"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(232,64,37,0.12)",
              border: "1px solid rgba(232,64,37,0.35)",
              color: "#e84025",
              fontSize: 13,
              fontFamily: FONT.body,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertCircle size={14} color="#e84025" aria-hidden />
            {erroSalvar}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 12,
          }}
        >
          {salvoOk ? (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: BRAND.verde,
                fontFamily: FONT.body,
                fontSize: 13,
              }}
            >
              <ShieldCheck size={14} aria-hidden /> Configuração salva com sucesso
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void salvar()}
            disabled={salvando || !!erroCarregar}
            style={{
              background: ctaGradientSalvar(brand, salvando, BRAND.cinza),
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "10px 22px",
              cursor: salvando ? "not-allowed" : "pointer",
              fontFamily: FONT.body,
              fontSize: 13,
              fontWeight: 600,
              opacity: salvando ? 0.7 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <SalvarCtaContent salvando={salvando} label="Salvar configuração" />
          </button>
        </div>
      </div>
    </div>
  );
}
