import type { CSSProperties } from "react";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { nomeLiderImediatoGerencia, nomeLiderImediatoTime } from "../../../lib/rhOrganogramaLiderImediato";
import type { RhOrgDiretoriaComFilhos, RhOrgGerenciaComFilhos, RhOrgTime } from "../../../types/rhOrganograma";
import { OrgBlocoVagasPlaceholder } from "./OrgBlocoVagasPlaceholder";
import type { OrgTreeVisualAcaoCtx } from "./OrgTreeVisual";

type Theme = { text: string; textMuted: string; cardBorder: string; inputBg: string; isDark: boolean };

function textoOuTraco(s: string): string {
  const x = s.trim();
  return x ? x : "—";
}

const btnAcao = (t: Theme): CSSProperties => ({
  padding: "8px 12px",
  borderRadius: 10,
  border: `1px solid ${t.cardBorder}`,
  background: t.inputBg,
  color: t.text,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
  fontFamily: FONT.body,
});

export function OrgVisualizacaoDiretoriaUnica({
  d,
  t,
  nomeResponsavel,
  countsPorTimeId,
  onAbrirVagas,
  onAbrirEstrutura,
}: {
  d: RhOrgDiretoriaComFilhos;
  t: Theme;
  nomeResponsavel: (funcId: string | null | undefined, nomeLivre: string | null | undefined) => string;
  countsPorTimeId: Record<string, number>;
  onAbrirVagas: (ctx: OrgTreeVisualAcaoCtx) => void;
  onAbrirEstrutura: (ctx: OrgTreeVisualAcaoCtx) => void;
}) {
  const nomeDir = nomeResponsavel(d.diretor_funcionario_id, d.diretor_nome_livre);
  const ctxDir: OrgTreeVisualAcaoCtx = { nivel: "diretoria", id: d.id, nome: d.nome };

  const card: CSSProperties = {
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 14,
    padding: 16,
    background: t.inputBg,
    fontFamily: FONT.body,
  };

  return (
    <div style={{ fontFamily: FONT.body }}>
      <section style={{ marginBottom: 24 }} aria-labelledby="org-dir-detalhe-titulo">
        <h2
          id="org-dir-detalhe-titulo"
          style={{
            margin: "0 0 14px",
            fontSize: 13,
            fontWeight: 800,
            color: t.textMuted,
            fontFamily: FONT_TITLE,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Diretoria
        </h2>
        <div style={{ ...card, marginBottom: 14 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: 14,
                overflow: "hidden",
                flexShrink: 0,
                border: `1px solid ${t.cardBorder}`,
                background: t.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              }}
            >
              {d.diretor_foto_url ? (
                <img src={d.diretor_foto_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: t.textMuted, textAlign: "center", padding: 6 }}>
                  Sem foto
                </div>
              )}
            </div>
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: t.text }}>{textoOuTraco(nomeDir)}</p>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: t.textMuted }}>{d.nome}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                <button type="button" style={btnAcao(t)} onClick={() => onAbrirVagas(ctxDir)}>
                  Vagas
                </button>
                <button type="button" style={btnAcao(t)} onClick={() => onAbrirEstrutura(ctxDir)}>
                  Estrutura
                </button>
              </div>
            </div>
          </div>
        </div>
        <div style={card}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 800, color: t.text }}>Sobre o Diretor(a)</h3>
          <p style={{ margin: 0, fontSize: 14, color: t.text, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
            {d.diretor_sobre.trim() ? d.diretor_sobre : "—"}
          </p>
        </div>
      </section>

      {d.gerencias.length > 0 ? (
        <section style={{ marginBottom: 24 }} aria-labelledby="org-gerencias-heading">
          <h2
            id="org-gerencias-heading"
            style={{
              margin: "0 0 14px",
              fontSize: 13,
              fontWeight: 800,
              color: t.textMuted,
              fontFamily: FONT_TITLE,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Gerências
          </h2>
          {d.gerencias.map((g) => {
            const liderG = nomeLiderImediatoGerencia(d, g, nomeResponsavel);
            const ctxG: OrgTreeVisualAcaoCtx = { nivel: "gerencia", id: g.id, nome: g.nome };
            return (
              <div key={g.id} style={{ ...card, marginBottom: 14 }}>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.text }}>{g.nome}</h3>
                    <p style={{ margin: "8px 0 0", fontSize: 13, color: t.textMuted }}>
                      Líder imediato: <span style={{ color: t.text, fontWeight: 600 }}>{textoOuTraco(liderG)}</span>
                    </p>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <button type="button" style={btnAcao(t)} onClick={() => onAbrirEstrutura(ctxG)}>
                      Estrutura
                    </button>
                  </div>
                </div>
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${t.cardBorder}` }}>
                  <h4 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 800, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Sobre a Gerência
                  </h4>
                  <p style={{ margin: 0, fontSize: 14, color: t.text, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                    {g.sobre_gerencia.trim() ? g.sobre_gerencia : "—"}
                  </p>
                </div>
                <div style={{ marginTop: 14 }}>
                  <h4 style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 800, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Times nesta gerência
                  </h4>
                  {g.times.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 13, color: t.textMuted }}>Nenhum time cadastrado.</p>
                  ) : (
                    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                      {g.times.map((ti: RhOrgTime) => {
                        const lt = nomeLiderImediatoTime(d, g, ti, nomeResponsavel);
                        const q = countsPorTimeId[ti.id] ?? 0;
                        const ctxT: OrgTreeVisualAcaoCtx = { nivel: "time", id: ti.id, nome: ti.nome };
                        return (
                          <li
                            key={ti.id}
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              justifyContent: "space-between",
                              gap: 10,
                              padding: "12px 0",
                              borderBottom: `1px solid color-mix(in srgb, ${t.cardBorder} 60%, transparent)`,
                            }}
                          >
                            <div>
                              <strong style={{ color: t.text }}>{ti.nome}</strong>
                              <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
                                Líder imediato: <span style={{ color: t.text }}>{textoOuTraco(lt)}</span>
                              </div>
                              <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>{q} prestador(es) ativo(s)</div>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button type="button" style={btnAcao(t)} onClick={() => onAbrirEstrutura(ctxT)}>
                                Estrutura
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ) : null}

      <OrgBlocoVagasPlaceholder t={t} />
    </div>
  );
}
