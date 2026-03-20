import { useState, useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { FONT } from "../../../constants/theme";
import type { Role, PageKey, PermissaoValor, RolePermission } from "../../../types";
import type { Theme } from "../../../constants/theme";
import { BRAND, PAGES, ROLES_PERMISSOES, PERM_OPCOES, roleLabel, roleBadgeColor } from "./constants";

interface AbaPermissoesProps {
  t: Theme;
}

export function AbaPermissoes({ t }: AbaPermissoesProps) {
  const [roleAtivo, setRoleAtivo] = useState<Role>("gestor");
  const [perms, setPerms] = useState<Record<string, Partial<RolePermission>>>({});
  const [salvando, setSalvando] = useState(false);
  const [salvoOk, setSalvoOk] = useState(false);

  useEffect(() => {
    supabase.from("role_permissions").select("*").eq("role", roleAtivo).then(({ data }) => {
      const mapa: Record<string, Partial<RolePermission>> = {};
      (data ?? []).forEach((r) => {
        mapa[r.page_key] = r;
      });
      setPerms(mapa);
    });
  }, [roleAtivo]);

  const setPerm = (pageKey: string, campo: keyof RolePermission, valor: PermissaoValor) => {
    setPerms((prev) => ({
      ...prev,
      [pageKey]: { ...prev[pageKey], role: roleAtivo, page_key: pageKey as PageKey, [campo]: valor },
    }));
  };

  const salvar = async () => {
    setSalvando(true);
    setSalvoOk(false);
    const rows = PAGES.map((p) => ({
      role: roleAtivo,
      page_key: p.key,
      can_view: perms[p.key]?.can_view ?? null,
      can_criar: p.hasCriar ? (perms[p.key]?.can_criar ?? null) : null,
      can_editar: p.hasEditar ? (perms[p.key]?.can_editar ?? null) : null,
      can_excluir: p.hasExcluir ? (perms[p.key]?.can_excluir ?? null) : null,
    }));
    const { error } = await supabase
      .from("role_permissions")
      .upsert(rows, { onConflict: "role,page_key", ignoreDuplicates: false });
    setSalvando(false);
    if (error) {
      console.error("[GestaoUsuarios] Erro ao salvar permissões:", error);
      alert(`Erro ao salvar permissões: ${error.message}`);
      return;
    }
    setSalvoOk(true);
    setTimeout(() => setSalvoOk(false), 2500);
    supabase.from("role_permissions").select("*").eq("role", roleAtivo).then(({ data }) => {
      const mapa: Record<string, Partial<RolePermission>> = {};
      (data ?? []).forEach((r) => {
        mapa[r.page_key] = r;
      });
      setPerms(mapa);
    });
  };

  const thStyle: React.CSSProperties = {
    fontFamily: FONT.body,
    fontSize: 11,
    fontWeight: 700,
    color: t.textMuted,
    textTransform: "uppercase",
    letterSpacing: "1px",
    padding: "12px 14px",
    textAlign: "center",
    background: "rgba(74,32,130,0.10)",
    borderBottom: `1px solid ${t.cardBorder}`,
  };
  const tdStyle: React.CSSProperties = {
    fontFamily: FONT.body,
    fontSize: 13,
    color: t.text,
    padding: "10px 14px",
    borderTop: `1px solid ${t.cardBorder}`,
  };
  const secoes = [...new Set(PAGES.map((p) => p.secao))].sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {ROLES_PERMISSOES.map((r) => {
          const ativo = roleAtivo === r;
          const cor = roleBadgeColor(r);
          return (
            <button
              key={r}
              onClick={() => setRoleAtivo(r)}
              style={{
                border: `${ativo ? "1.5px" : "1px"} solid ${ativo ? cor : t.cardBorder}`,
                background: ativo ? `${cor}30` : t.inputBg ?? "transparent",
                color: ativo ? cor : t.textMuted,
                borderRadius: 20,
                padding: "7px 16px",
                cursor: "pointer",
                fontFamily: FONT.body,
                fontSize: 13,
                fontWeight: ativo ? 700 : 400,
                transition: "all 0.18s",
              }}
            >
              {roleLabel(r)}
            </button>
          );
        })}
      </div>

      <div style={{ overflowX: "auto", borderRadius: 12, border: `1px solid ${t.cardBorder}`, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "left" }}>Seção</th>
              <th style={{ ...thStyle, textAlign: "left" }}>Página</th>
              <th style={thStyle}>Ver</th>
              <th style={thStyle}>Criar</th>
              <th style={thStyle}>Editar</th>
              <th style={thStyle}>Excluir</th>
            </tr>
          </thead>
          <tbody>
            {secoes.map((secao) => {
              const pagesDaSec = PAGES.filter((p) => p.secao === secao).sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
              return pagesDaSec.map((page, idx) => (
                <tr key={page.key} style={{ background: idx % 2 !== 0 ? "rgba(74,32,130,0.06)" : "transparent" }}>
                  {idx === 0 && (
                    <td
                      rowSpan={pagesDaSec.length}
                      style={{
                        ...tdStyle,
                        fontWeight: 700,
                        fontSize: 11,
                        color: t.textMuted,
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        verticalAlign: "middle",
                        borderRight: `1px solid ${t.cardBorder}`,
                        borderLeft: `3px solid ${BRAND.roxo}`,
                        background: "rgba(74,32,130,0.10)",
                        paddingLeft: 12,
                      }}
                    >
                      {secao}
                    </td>
                  )}
                  <td style={tdStyle}>{page.label}</td>
                  {(["can_view", "can_criar", "can_editar", "can_excluir"] as const).map((campo) => {
                    const temAcao =
                      campo === "can_view"
                        ? true
                        : campo === "can_criar"
                          ? page.hasCriar
                          : campo === "can_editar"
                            ? page.hasEditar
                            : page.hasExcluir;
                    if (!temAcao)
                      return (
                        <td key={campo} style={{ ...tdStyle, textAlign: "center", color: t.textMuted, opacity: 0.3 }}>
                          —
                        </td>
                      );
                    const val = (perms[page.key]?.[campo] as PermissaoValor) ?? null;
                    return (
                      <td key={campo} style={{ ...tdStyle, textAlign: "center" }}>
                        <select
                          value={val ?? ""}
                          onChange={(e) => setPerm(page.key, campo, (e.target.value as PermissaoValor) || null)}
                          style={{
                            background: t.inputBg ?? t.cardBg,
                            border: `1px solid ${t.cardBorder}`,
                            borderRadius: 6,
                            padding: "4px 8px",
                            color: t.text,
                            fontFamily: FONT.body,
                            fontSize: 12,
                            cursor: "pointer",
                            minWidth: 100,
                          }}
                        >
                          <option value="">—</option>
                          {[...PERM_OPCOES]
                            .sort((a, b) => (a.label ?? "").localeCompare(b.label ?? "", "pt-BR"))
                            .map((o) => (
                              <option key={o.value} value={o.value ?? ""}>
                                {o.label}
                              </option>
                            ))}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
        {salvoOk && (
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: BRAND.verde, fontFamily: FONT.body, fontSize: 13 }}>
            <ShieldCheck size={14} /> Permissões salvas com sucesso
          </span>
        )}
        <button
          onClick={salvar}
          disabled={salvando}
          style={{
            background: salvando ? BRAND.cinza : BRAND.gradiente,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "10px 22px",
            cursor: salvando ? "not-allowed" : "pointer",
            fontFamily: FONT.body,
            fontSize: 13,
            fontWeight: 600,
            opacity: salvando ? 0.7 : 1,
            transition: "opacity 0.15s",
          }}
        >
          {salvando ? "Salvando..." : `Salvar permissões — ${roleLabel(roleAtivo)}`}
        </button>
      </div>
    </div>
  );
}
