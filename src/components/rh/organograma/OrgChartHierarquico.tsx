import { useMemo, useState, type CSSProperties } from "react";
import { Search, Users } from "lucide-react";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { nomeLiderImediatoGerencia, nomeLiderImediatoTime } from "../../../lib/rhOrganogramaLiderImediato";
import type { RhOrgDiretoriaComFilhos, RhOrgGerenciaComFilhos } from "../../../types/rhOrganograma";

function normalizarBusca(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function textoContemBusca(haystack: string, needleRaw: string): boolean {
  const needle = normalizarBusca(needleRaw);
  if (!needle) return true;
  return normalizarBusca(haystack).includes(needle);
}

type NomeResp = (funcId: string | null | undefined, nomeLivre: string | null | undefined) => string;

function gerenciaCombinaBusca(
  d: RhOrgDiretoriaComFilhos,
  g: RhOrgGerenciaComFilhos,
  q: string,
  nomeResponsavel: NomeResp,
): boolean {
  if (!q.trim()) return true;
  const liderG = nomeLiderImediatoGerencia(d, g, nomeResponsavel);
  if (textoContemBusca(g.nome, q) || textoContemBusca(liderG, q)) return true;
  return g.times.some((ti) => {
    const lt = nomeLiderImediatoTime(d, g, ti, nomeResponsavel);
    return textoContemBusca(ti.nome, q) || textoContemBusca(lt, q);
  });
}

function filtrarArvoreOrganogramaVisual(
  arvore: RhOrgDiretoriaComFilhos[],
  q: string,
  nomeResponsavel: NomeResp,
): RhOrgDiretoriaComFilhos[] {
  const needle = q.trim();
  if (!needle) return arvore;
  return arvore
    .map((d) => {
      const diretor = nomeResponsavel(d.diretor_funcionario_id, d.diretor_nome_livre);
      const matchD = textoContemBusca(d.nome, needle) || textoContemBusca(diretor, needle);
      const gerenciasFiltradas = d.gerencias.filter((g) => gerenciaCombinaBusca(d, g, needle, nomeResponsavel));
      if (matchD) return { ...d, gerencias: d.gerencias };
      if (gerenciasFiltradas.length > 0) return { ...d, gerencias: gerenciasFiltradas };
      return null;
    })
    .filter((x): x is RhOrgDiretoriaComFilhos => x !== null);
}

type Theme = { text: string; textMuted: string; cardBorder: string; inputBg: string; cardBg: string; isDark: boolean };

function textoOuTraco(s: string): string {
  const x = s.trim();
  return x ? x : "—";
}

function iniciaisNome(nome: string): string {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase();
  return (p[0]![0]! + p[p.length - 1]![0]!).toUpperCase();
}

function badgeInativo() {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 6px",
        borderRadius: 6,
        background: "rgba(107,114,128,0.2)",
        color: "#6b7280",
        marginLeft: 8,
        fontFamily: FONT.body,
      }}
    >
      Inativo
    </span>
  );
}

/** Visão geral: grid de cards de diretoria (foto, diretor, contagens). */
export function OrgChartHierarquico({
  arvore,
  t,
  nomeResponsavel,
  prestadoresCountPorDiretoriaId,
  onSelectDiretoria,
}: {
  arvore: RhOrgDiretoriaComFilhos[];
  t: Theme;
  nomeResponsavel: (funcId: string | null | undefined, nomeLivre: string | null | undefined) => string;
  prestadoresCountPorDiretoriaId: Record<string, number>;
  onSelectDiretoria: (diretoriaId: string) => void;
}) {
  const [busca, setBusca] = useState("");
  const arvoreFiltrada = useMemo(
    () => filtrarArvoreOrganogramaVisual(arvore, busca, nomeResponsavel),
    [arvore, busca, nomeResponsavel],
  );

  if (arvore.length === 0) {
    return (
      <div style={{ padding: "32px 16px", textAlign: "center", color: t.textMuted, fontFamily: FONT.body, fontSize: 14 }}>
        Sem dados para o período selecionado.
      </div>
    );
  }

  const buscaTrim = busca.trim();
  const semResultadosBusca = buscaTrim.length > 0 && arvoreFiltrada.length === 0;

  const cardShell: CSSProperties = {
    width: "100%",
    minHeight: 44,
    textAlign: "left",
    padding: 0,
    margin: 0,
    border: "none",
    cursor: "pointer",
    borderRadius: 14,
    background: "var(--brand-action-20, color-mix(in srgb, #7c3aed 20%, transparent))",
    boxShadow: t.isDark ? "0 2px 10px rgba(0,0,0,0.2)" : "0 2px 8px rgba(0,0,0,0.06)",
    fontFamily: FONT.body,
    display: "block",
  };

  return (
    <div style={{ fontFamily: FONT.body }}>
      <section aria-labelledby="org-hierarquia-titulo">
        <h2
          id="org-hierarquia-titulo"
          style={{
            margin: "0 0 6px",
            fontSize: 18,
            fontWeight: 800,
            color: t.text,
            fontFamily: FONT_TITLE,
            letterSpacing: "0.02em",
          }}
        >
          Diretorias
        </h2>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: t.textMuted, lineHeight: 1.45 }}>
          Selecione uma diretoria para ver gerências, times e equipe.
        </p>
        <label htmlFor="org-hierarquia-busca" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}>
          Pesquisar por nome de funcionário, diretoria, gerência ou time
        </label>
        <div style={{ position: "relative", maxWidth: 520, marginBottom: 20 }}>
          <Search
            size={16}
            strokeWidth={2}
            aria-hidden
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: t.textMuted,
              pointerEvents: "none",
            }}
          />
          <input
            id="org-hierarquia-busca"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Ex.: Maria, Comercial, CX…"
            autoComplete="off"
            aria-label="Pesquisar organograma por funcionário, diretoria, gerência ou time"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px 10px 38px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg,
              color: t.text,
              fontSize: 14,
              fontFamily: FONT.body,
              outline: "none",
            }}
          />
        </div>

        {semResultadosBusca ? (
          <div
            role="status"
            style={{
              padding: "24px 16px",
              textAlign: "center",
              color: t.textMuted,
              fontSize: 14,
              maxWidth: 420,
              lineHeight: 1.5,
            }}
          >
            Sem dados para o período selecionado.
          </div>
        ) : (
          <ul className="app-org-dir-cards" aria-label="Lista de diretorias" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {arvoreFiltrada.map((d) => {
              const diretor = nomeResponsavel(d.diretor_funcionario_id, d.diretor_nome_livre);
              const nPrest = prestadoresCountPorDiretoriaId[d.id] ?? 0;
              const inativo = d.status === "inativo";
              const altFoto = `Foto de ${diretor}`;
              return (
                <li key={d.id} style={{ minWidth: 0 }}>
                  <button
                    type="button"
                    aria-label={`Ver estrutura da diretoria ${d.nome}`}
                    onClick={() => onSelectDiretoria(d.id)}
                    style={cardShell}
                  >
                  <div
                    style={{
                      borderTop: "4px solid var(--brand-action, #7c3aed)",
                      borderRadius: "14px 14px 0 0",
                      borderLeft: "2px solid var(--brand-action, #7c3aed)",
                      borderRight: "2px solid var(--brand-action, #7c3aed)",
                      borderBottom: "2px solid var(--brand-action, #7c3aed)",
                      padding: 16,
                      color: "var(--brand-action, #7c3aed)",
                    }}
                  >
                    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: "50%",
                          overflow: "hidden",
                          flexShrink: 0,
                          border: "2px solid var(--brand-action, #7c3aed)",
                          background: "var(--brand-action-20, color-mix(in srgb, #7c3aed 20%, transparent))",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {d.diretor_foto_url ? (
                          <img src={d.diretor_foto_url} alt={altFoto} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span aria-hidden="true" style={{ fontSize: 16, fontWeight: 800, fontFamily: FONT_TITLE, color: "var(--brand-action, #7c3aed)" }}>
                            {iniciaisNome(diretor)}
                          </span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE }}>{d.nome}</span>
                          {inativo ? badgeInativo() : null}
                        </div>
                        <p style={{ margin: "6px 0 0", fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>Diretor(a): {textoOuTraco(diretor)}</p>
                        <div
                          style={{
                            marginTop: 10,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--brand-action, #7c3aed)",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "4px 10px",
                              borderRadius: 8,
                              border: "1px solid var(--brand-action-border, color-mix(in srgb, #7c3aed 35%, transparent))",
                              background: "var(--brand-action-20, color-mix(in srgb, #7c3aed 20%, transparent))",
                            }}
                          >
                            <Users size={14} strokeWidth={2} aria-hidden />
                            {nPrest} prestador(es) na estrutura
                          </span>
                        </div>
                        <p style={{ margin: "12px 0 0", fontSize: 12, fontWeight: 700, color: "var(--brand-action, #7c3aed)" }}>Ver estrutura →</p>
                      </div>
                    </div>
                  </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
