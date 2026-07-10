import { useState, useEffect, useCallback } from "react";
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
import { brandTintBg, ctaGradientSalvar } from "./gestaoUsuariosHelpers";
import type { Role } from "../../../types";

interface Props {
  viewerRole: Role;
}

export function AbaSimuladorLogin({ viewerRole }: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [marcados, setMarcados] = useState<Set<Role>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvoOk, setSalvoOk] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErroSalvar(null);
    const { data, error } = await supabase
      .from("simulador_login_roles")
      .select("simulavel_role")
      .eq("viewer_role", viewerRole);
    if (error) {
      console.error("Erro ao carregar simulador_login_roles:", error);
      setMarcados(new Set());
      setLoading(false);
      return;
    }
    const set = new Set<Role>();
    (data ?? []).forEach((row: { simulavel_role: string }) => {
      const role = row.simulavel_role as Role;
      if (ROLES_SIMULAVEIS.includes(role)) set.add(role);
    });
    setMarcados(set);
    setLoading(false);
  }, [viewerRole]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const toggleRole = (simulavel: Role) => {
    setMarcados((prev) => {
      const next = new Set(prev);
      if (next.has(simulavel)) next.delete(simulavel);
      else next.add(simulavel);
      return next;
    });
  };

  const salvar = async () => {
    setSalvando(true);
    setSalvoOk(false);
    setErroSalvar(null);

    const { error: delErr } = await supabase
      .from("simulador_login_roles")
      .delete()
      .eq("viewer_role", viewerRole);
    if (delErr) {
      setSalvando(false);
      setErroSalvar("Não foi possível salvar. Se o problema persistir, entre em contato com o suporte.");
      return;
    }

    const toInsert = [...marcados].map((simulavel_role) => ({
      viewer_role: viewerRole,
      simulavel_role,
    }));

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase.from("simulador_login_roles").insert(toInsert);
      if (insErr) {
        setSalvando(false);
        setErroSalvar("Não foi possível salvar. Recarregue a página para verificar o estado atual.");
        return;
      }
    }

    setSalvando(false);
    setSalvoOk(true);
    setTimeout(() => setSalvoOk(false), 2500);
  };

  if (loading) {
    return <GestaoUsuariosLoading />;
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
            disabled={salvando}
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
