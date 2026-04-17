import type { CSSProperties } from "react";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { nomeLiderImediatoGerencia } from "../../../lib/rhOrganogramaLiderImediato";
import type { RhOrgDiretoriaComFilhos, RhOrgGerenciaComFilhos } from "../../../types/rhOrganograma";
import type { OrgTreeVisualAcaoCtx } from "./OrgTreeVisual";

type Theme = { text: string; textMuted: string; cardBorder: string; inputBg: string; isDark: boolean };

function textoOuTraco(s: string): string {
  const x = s.trim();
  return x ? x : "—";
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

/** Nó executivo (CEO + diretorias + gerências), estilo organograma clássico em colunas. */
export function OrgChartHierarquico({
  arvore,
  t,
  nomeResponsavel,
  onAbrirVagas,
  onAbrirEstrutura,
}: {
  arvore: RhOrgDiretoriaComFilhos[];
  t: Theme;
  nomeResponsavel: (funcId: string | null | undefined, nomeLivre: string | null | undefined) => string;
  onAbrirVagas: (ctx: OrgTreeVisualAcaoCtx) => void;
  onAbrirEstrutura: (ctx: OrgTreeVisualAcaoCtx) => void;
}) {
  const linhaConectora: CSSProperties = {
    width: 2,
    minHeight: 18,
    background: `color-mix(in srgb, ${t.cardBorder} 85%, ${t.text} 15%)`,
    borderRadius: 1,
    flexShrink: 0,
  };

  const btnAcao: CSSProperties = {
    padding: "8px 12px",
    borderRadius: 10,
    border: `1px solid rgba(255,255,255,0.35)`,
    background: "rgba(255,255,255,0.12)",
    color: "#fff",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    fontFamily: FONT.body,
  };

  const cardCeo: CSSProperties = {
    padding: "14px 28px",
    borderRadius: 14,
    background: "var(--brand-action, #7c3aed)",
    color: "#fff",
    fontFamily: FONT.body,
    fontWeight: 800,
    fontSize: 16,
    letterSpacing: "0.04em",
    textAlign: "center",
    boxShadow: t.isDark ? "0 4px 14px rgba(0,0,0,0.35)" : "0 4px 14px color-mix(in srgb, var(--brand-action, #7c3aed) 35%, transparent)",
    border: "1px solid color-mix(in srgb, #fff 22%, transparent)",
  };

  const cardDir = (inativo: boolean): CSSProperties => ({
    padding: "12px 16px",
    borderRadius: 12,
    background: "var(--brand-action, #7c3aed)",
    color: "#fff",
    fontFamily: FONT.body,
    minWidth: 160,
    maxWidth: 280,
    textAlign: "center",
    opacity: inativo ? 0.75 : 1,
    border: "1px solid color-mix(in srgb, #fff 20%, transparent)",
    boxShadow: t.isDark ? "0 2px 10px rgba(0,0,0,0.25)" : "0 2px 10px color-mix(in srgb, var(--brand-action, #7c3aed) 28%, transparent)",
  });

  const cardGer = (inativo: boolean): CSSProperties => ({
    padding: "10px 12px",
    borderRadius: 10,
    background: "color-mix(in srgb, var(--brand-contrast, #1e36f8) 88%, #000 12%)",
    color: "#fff",
    fontFamily: FONT.body,
    minWidth: 120,
    maxWidth: 200,
    textAlign: "center",
    fontSize: 13,
    opacity: inativo ? 0.72 : 1,
    border: "1px solid color-mix(in srgb, #fff 18%, transparent)",
  });

  if (arvore.length === 0) {
    return (
      <div style={{ padding: "32px 16px", textAlign: "center", color: t.textMuted, fontFamily: FONT.body, fontSize: 14 }}>
        Sem diretorias cadastradas. Use o modo Gerenciamento para criar a primeira diretoria.
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT.body }}>
      <section aria-labelledby="org-hierarquia-titulo">
        <h2
          id="org-hierarquia-titulo"
          style={{
            margin: "0 0 6px",
            fontSize: 13,
            fontWeight: 800,
            color: t.textMuted,
            fontFamily: FONT_TITLE,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Organograma hierárquico
        </h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: t.textMuted, lineHeight: 1.45 }}>
          Visão em colunas: CEO, diretorias e gerências (nível de times omitido nesta vista).
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
            padding: "8px 0 24px",
          }}
        >
          <div style={cardCeo} role="group" aria-label="Nível executivo">
            CEO
          </div>
          <div style={{ ...linhaConectora, marginTop: 10, marginBottom: 10 }} aria-hidden />

          <div
            role="list"
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "flex-start",
              gap: 28,
              width: "100%",
            }}
          >
            {arvore.map((d) => {
              const diretor = nomeResponsavel(d.diretor_funcionario_id, d.diretor_nome_livre);
              const ctxD: OrgTreeVisualAcaoCtx = { nivel: "diretoria", id: d.id, nome: d.nome };
              return (
                <div
                  key={d.id}
                  role="listitem"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 0,
                    maxWidth: 340,
                  }}
                >
                  <div style={{ ...linhaConectora, marginBottom: 10 }} aria-hidden />
                  <div style={cardDir(d.status === "inativo")}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: 14 }}>{d.nome}</span>
                      {d.status === "inativo" ? badgeInativo() : null}
                    </div>
                    <p style={{ margin: "8px 0 0", fontSize: 12, fontWeight: 500, opacity: 0.95, lineHeight: 1.45 }}>
                      {`Diretor(a): ${textoOuTraco(diretor)}\nCC ${d.centro_custos}`}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, justifyContent: "center" }}>
                      <button type="button" style={btnAcao} onClick={() => onAbrirVagas(ctxD)}>
                        Vagas
                      </button>
                      <button type="button" style={btnAcao} onClick={() => onAbrirEstrutura(ctxD)}>
                        Estrutura
                      </button>
                    </div>
                  </div>

                  <div style={{ ...linhaConectora, marginTop: 12, marginBottom: 10 }} aria-hidden />

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                      justifyContent: "center",
                      width: "100%",
                    }}
                  >
                    {d.gerencias.length === 0 ? (
                      <span style={{ fontSize: 12, color: t.textMuted }}>Nenhuma gerência.</span>
                    ) : (
                      d.gerencias.map((g: RhOrgGerenciaComFilhos) => {
                        const lider = nomeLiderImediatoGerencia(d, g, nomeResponsavel);
                        const ctxG: OrgTreeVisualAcaoCtx = { nivel: "gerencia", id: g.id, nome: g.nome };
                        return (
                          <div key={g.id} style={cardGer(g.status === "inativo")}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 6 }}>
                              <span style={{ fontWeight: 700 }}>{g.nome}</span>
                              {g.status === "inativo" ? badgeInativo() : null}
                            </div>
                            <p style={{ margin: "6px 0 0", fontSize: 11, fontWeight: 500, opacity: 0.92, lineHeight: 1.4 }}>
                              {`Líder: ${textoOuTraco(lider)}\nCC ${g.centro_custos}`}
                            </p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, justifyContent: "center" }}>
                              <button type="button" style={btnAcao} onClick={() => onAbrirEstrutura(ctxG)}>
                                Estrutura
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
