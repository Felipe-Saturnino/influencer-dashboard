import { useState, useEffect, useRef, useCallback } from "react";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { supabase } from "../../../lib/supabase";
import { FONT } from "../../../constants/theme";
import type { Role, PageKey, PermissaoValor, RolePermission } from "../../../types";
import { BRAND, PAGES, PERM_OPCOES, roleLabel } from "./constants";
import { SalvarCtaContent, GestaoUsuariosLoading } from "./gestaoUsuariosUi";
import {
  ctaGradientSalvar,
  MSG_ERRO_CARREGAR_GESTAO,
  MSG_ERRO_SALVAR_GESTAO,
} from "./gestaoUsuariosHelpers";
import { getDataTableWrapStyle } from "../../../lib/dataTableStyles";

interface AbaPermissoesProps {
  roleAtivo: Role;
  onDirtyChange?: (dirty: boolean) => void;
}

/** Verde #22c55e / vermelho #e84025 — paleta semântica global; leve tinte nos selects da matriz. */
function estiloSelectPermissao(val: PermissaoValor | null, isDark: boolean): { background: string; borderColor: string } {
  if (val === "sim") {
    return {
      background: isDark ? "rgba(34, 197, 94, 0.14)" : "rgba(34, 197, 94, 0.11)",
      borderColor: "rgba(34, 197, 94, 0.42)",
    };
  }
  if (val === "nao") {
    return {
      background: isDark ? "rgba(232, 64, 37, 0.14)" : "rgba(232, 64, 37, 0.09)",
      borderColor: "rgba(232, 64, 37, 0.40)",
    };
  }
  return {
    background: "",
    borderColor: "",
  };
}

type PermRow = {
  page_key: string;
  can_view: PermissaoValor | null;
  can_criar: PermissaoValor | null;
  can_editar: PermissaoValor | null;
  can_excluir: PermissaoValor | null;
};

function mapaFromRows(rows: PermRow[]): Record<string, Partial<RolePermission>> {
  const mapa: Record<string, Partial<RolePermission>> = {};
  rows.forEach((r) => {
    mapa[r.page_key] = r as Partial<RolePermission>;
  });
  return mapa;
}

function serializarPerms(mapa: Record<string, Partial<RolePermission>>, role: Role): string {
  return JSON.stringify(
    PAGES.map((p) => ({
      role,
      page_key: p.key,
      can_view: mapa[p.key]?.can_view ?? null,
      can_criar: p.hasCriar ? (mapa[p.key]?.can_criar ?? null) : null,
      can_editar: p.hasEditar ? (mapa[p.key]?.can_editar ?? null) : null,
      can_excluir: p.hasExcluir ? (mapa[p.key]?.can_excluir ?? null) : null,
    })),
  );
}

export function AbaPermissoes({ roleAtivo, onDirtyChange }: AbaPermissoesProps) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const isMobile = useMediaQuery("(max-width: 720px)");
  const [perms, setPerms] = useState<Record<string, Partial<RolePermission>>>({});
  const baselineRef = useRef("");
  const [loading, setLoading] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvoOk, setSalvoOk] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErroCarregar(null);
    setErroSalvar(null);
    const { data, error } = await supabase
      .from("role_permissions")
      .select("page_key, can_view, can_criar, can_editar, can_excluir")
      .eq("role", roleAtivo);
    if (error) {
      console.error("[GestaoUsuarios] carregar permissões:", error);
      setPerms({});
      baselineRef.current = "";
      setErroCarregar(MSG_ERRO_CARREGAR_GESTAO);
      onDirtyChange?.(false);
      setLoading(false);
      return;
    }
    const mapa = mapaFromRows((data ?? []) as PermRow[]);
    setPerms(mapa);
    baselineRef.current = serializarPerms(mapa, roleAtivo);
    onDirtyChange?.(false);
    setLoading(false);
  }, [roleAtivo, onDirtyChange]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const setPerm = (pageKey: string, campo: keyof RolePermission, valor: PermissaoValor) => {
    setPerms((prev) => {
      const next = {
        ...prev,
        [pageKey]: { ...prev[pageKey], role: roleAtivo, page_key: pageKey as PageKey, [campo]: valor },
      };
      onDirtyChange?.(serializarPerms(next, roleAtivo) !== baselineRef.current);
      return next;
    });
  };

  const salvar = async () => {
    setSalvando(true);
    setSalvoOk(false);
    setErroSalvar(null);
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
      setErroSalvar(MSG_ERRO_SALVAR_GESTAO);
      return;
    }
    setErroSalvar(null);
    setSalvoOk(true);
    setTimeout(() => setSalvoOk(false), 2500);
    baselineRef.current = serializarPerms(perms, roleAtivo);
    onDirtyChange?.(false);
    void carregar();
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
    background: t.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
  };

  const tdBase: React.CSSProperties = {
    fontFamily: FONT.body,
    fontSize: 13,
    color: t.text,
    padding: "10px 14px",
  };

  const secoes = [...new Set(PAGES.map((p) => p.secao))];

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

  const linhas: React.ReactNode[] = [];

  secoes.forEach((secao, secaoIdx) => {
    const pagesDaSec = PAGES.filter((p) => p.secao === secao);

    if (secaoIdx > 0) {
      linhas.push(
        <tr key={`sep-${secao}`}>
          <td
            colSpan={6}
            style={{
              padding: 0,
              height: 3,
              background: t.cardBorder,
            }}
          />
        </tr>,
      );
    }

    const zebraOdd = t.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
    const secaoCellBg = t.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";

    pagesDaSec.forEach((page, idx) => {
      const zebra = idx % 2 !== 0 ? zebraOdd : "transparent";

      linhas.push(
        <tr key={page.key} style={{ background: zebra }}>
          {idx === 0 && (
            <td
              rowSpan={pagesDaSec.length}
              style={{
                ...tdBase,
                fontWeight: 700,
                fontSize: 11,
                color: t.textMuted,
                textTransform: "uppercase",
                letterSpacing: "1px",
                verticalAlign: "middle",
                borderLeft: `3px solid ${BRAND.roxo}`,
                borderRight: `1px solid ${t.cardBorder}`,
                background: secaoCellBg,
                paddingLeft: 12,
              }}
            >
              {secao}
            </td>
          )}
          <td style={tdBase}>{page.label}</td>
          {(["can_view", "can_criar", "can_editar", "can_excluir"] as const).map((campo) => {
            const temAcao =
              campo === "can_view"
                ? true
                : campo === "can_criar"
                  ? page.hasCriar
                  : campo === "can_editar"
                    ? page.hasEditar
                    : page.hasExcluir;

            if (!temAcao) {
              return (
                <td key={campo} style={{ ...tdBase, textAlign: "center", color: t.textMuted, opacity: 0.3 }}>
                  —
                </td>
              );
            }

            const val = (perms[page.key]?.[campo] as PermissaoValor) ?? null;
            const tint = estiloSelectPermissao(val, !!t.isDark);
            return (
              <td key={campo} style={{ ...tdBase, textAlign: "center" }}>
                <select
                  value={val ?? ""}
                  aria-label={`${page.label}: ${campo === "can_view" ? "Ver" : campo === "can_criar" ? "Criar" : campo === "can_editar" ? "Editar" : "Excluir"}`}
                  onChange={(e) =>
                    setPerm(page.key, campo, (e.target.value as PermissaoValor) || null)
                  }
                  style={{
                    background: tint.background || (t.inputBg ?? t.cardBg),
                    border: `1px solid ${tint.borderColor || t.cardBorder}`,
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
        </tr>,
      );
    });
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ margin: 0, fontSize: 12, color: t.textMuted, fontFamily: FONT.body, maxWidth: 720 }}>
        Selecione um perfil abaixo para configurar permissões por página. O perfil{" "}
        <strong style={{ color: t.text }}>Administrador</strong> não é configurado aqui: na plataforma mantém acesso total
        (Ver, Criar, Editar e Excluir) a todas as páginas.
      </p>
      {roleAtivo === "prestador" ? (
        <p style={{ margin: 0, fontSize: 12, color: t.textMuted, fontFamily: FONT.body, maxWidth: 720 }}>
          Perfil <strong style={{ color: t.text }}>Prestadores</strong>: nesta aba configuram-se, por página,{" "}
          <strong style={{ color: t.text }}>Ver</strong>, <strong style={{ color: t.text }}>Criar</strong>,{" "}
          <strong style={{ color: t.text }}>Editar</strong> e <strong style={{ color: t.text }}>Excluir</strong> para
          qualquer usuário com este perfil. No cadastro (aba Usuários), cada prestador deve ter pelo menos uma{" "}
          <strong style={{ color: t.text }}>área de atuação</strong>; o menu cruza estas permissões com a união das páginas
          marcadas para essas áreas na aba <strong style={{ color: t.text }}>Prestadores</strong>.{" "}
          <strong style={{ color: t.text }}>Home</strong>, <strong style={{ color: t.text }}>Configurações</strong>,{" "}
          <strong style={{ color: t.text }}>Ajuda</strong> e <strong style={{ color: t.text }}>Versionamento</strong> não
          passam pela aba Prestadores.
        </p>
      ) : null}
      <div
        style={{
          borderRadius: 12,
          border: `1px solid ${t.cardBorder}`,
        }}
      >
        {!isMobile ? (
          <div className="app-table-wrap app-permissoes-table-wrap" style={getDataTableWrapStyle()}>
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 0,
              }}
            >
              <caption style={{ display: "none" }}>
                Matriz de permissões por página — perfil {roleLabel(roleAtivo)}
              </caption>
              <thead>
                <tr>
                  <th scope="col" style={{ ...thStyle, textAlign: "left", borderBottom: `2px solid ${t.cardBorder}` }}>
                    Seção
                  </th>
                  <th scope="col" style={{ ...thStyle, textAlign: "left", borderBottom: `2px solid ${t.cardBorder}` }}>
                    Página
                  </th>
                  <th scope="col" style={{ ...thStyle, borderBottom: `2px solid ${t.cardBorder}` }}>Ver</th>
                  <th scope="col" style={{ ...thStyle, borderBottom: `2px solid ${t.cardBorder}` }}>Criar</th>
                  <th scope="col" style={{ ...thStyle, borderBottom: `2px solid ${t.cardBorder}` }}>Editar</th>
                  <th scope="col" style={{ ...thStyle, borderBottom: `2px solid ${t.cardBorder}` }}>Excluir</th>
                </tr>
              </thead>
              <tbody>{linhas}</tbody>
            </table>
          </div>
        ) : (
          <div
            className="app-permissoes-cards"
            style={{ ["--perm-card-border" as string]: t.cardBorder, display: "flex" }}
          >
            {PAGES.map((page) => (
              <div key={page.key} className="app-permissoes-card">
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {page.secao}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: t.text, fontFamily: FONT.body, marginTop: 4 }}>
                    {page.label}
                  </div>
                </div>
                <div className="app-permissoes-card__acoes">
                  {(["can_view", "can_criar", "can_editar", "can_excluir"] as const).map((campo) => {
                    const temAcao =
                      campo === "can_view"
                        ? true
                        : campo === "can_criar"
                          ? page.hasCriar
                          : campo === "can_editar"
                            ? page.hasEditar
                            : page.hasExcluir;
                    if (!temAcao) return null;
                    const val = (perms[page.key]?.[campo] as PermissaoValor) ?? null;
                    const tint = estiloSelectPermissao(val, !!t.isDark);
                    const labelCampo =
                      campo === "can_view" ? "Ver" : campo === "can_criar" ? "Criar" : campo === "can_editar" ? "Editar" : "Excluir";
                    return (
                      <div key={campo} className="app-permissoes-card__acao">
                        <label htmlFor={`perm-mobile-${page.key}-${campo}`}>{labelCampo}</label>
                        <select
                          id={`perm-mobile-${page.key}-${campo}`}
                          value={val ?? ""}
                          aria-label={`${page.label}: ${labelCampo}`}
                          onChange={(e) =>
                            setPerm(page.key, campo, (e.target.value as PermissaoValor) || null)
                          }
                          style={{
                            background: tint.background || (t.inputBg ?? t.cardBg),
                            border: `1px solid ${tint.borderColor || t.cardBorder}`,
                            borderRadius: 8,
                            color: t.text,
                            fontFamily: FONT.body,
                            cursor: "pointer",
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
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "stretch" }}>
        {erroSalvar && (
          <div
            role="alert"
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
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
          {salvoOk && (
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
              <ShieldCheck size={14} /> Permissões salvas com sucesso
            </span>
          )}
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
              transition: "opacity 0.15s",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <SalvarCtaContent
              salvando={salvando}
              label={`Salvar permissões — ${roleLabel(roleAtivo)}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
