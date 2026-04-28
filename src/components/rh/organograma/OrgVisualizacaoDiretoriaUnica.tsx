import { useCallback, useState, type CSSProperties } from "react";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { nomeLiderImediatoGerencia, nomeLiderImediatoTime } from "../../../lib/rhOrganogramaLiderImediato";
import type { RhOrgDiretoriaComFilhos, RhOrgTime } from "../../../types/rhOrganograma";

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

const chipTime: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 44,
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  fontFamily: FONT.body,
  cursor: "pointer",
  border: "1px solid var(--brand-contrast-30, rgba(30,54,248,0.3))",
  background: "var(--brand-contrast-12, rgba(30,54,248,0.12))",
  color: "var(--brand-contrast, #1e36f8)",
};

export function OrgVisualizacaoDiretoriaUnica({
  d,
  t,
  nomeResponsavel,
  countsPorTimeId,
  membrosPorTimeId,
}: {
  d: RhOrgDiretoriaComFilhos;
  t: Theme;
  nomeResponsavel: (funcId: string | null | undefined, nomeLivre: string | null | undefined) => string;
  countsPorTimeId: Record<string, number>;
  membrosPorTimeId: Record<string, string[]>;
}) {
  const nomeDir = nomeResponsavel(d.diretor_funcionario_id, d.diretor_nome_livre);
  const altFoto = `Foto de ${nomeDir}`;
  const sobreDir = d.diretor_sobre.trim();
  const [timesExpandidos, setTimesExpandidos] = useState<Record<string, boolean>>({});

  const toggleTime = useCallback((timeId: string) => {
    setTimesExpandidos((prev) => ({ ...prev, [timeId]: !prev[timeId] }));
  }, []);

  const heroCard: CSSProperties = {
    border: "2px solid var(--brand-action, #7c3aed)",
    borderRadius: 16,
    padding: 20,
    background: "var(--brand-action-20, color-mix(in srgb, #7c3aed 20%, transparent))",
    fontFamily: FONT.body,
    color: "var(--brand-action, #7c3aed)",
  };

  const cardGerencia: CSSProperties = {
    border: "1px solid var(--brand-contrast-30, rgba(30,54,248,0.3))",
    borderRadius: 14,
    padding: 16,
    background: "var(--brand-contrast-12, color-mix(in srgb, #1e36f8 12%, transparent))",
    fontFamily: FONT.body,
    color: "var(--brand-contrast, #1e36f8)",
    minWidth: 0,
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
        <div style={heroCard}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-start" }}>
            <div
              style={{
                width: 80,
                height: 80,
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
                <span
                  aria-hidden="true"
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    fontFamily: FONT_TITLE,
                    color: "var(--brand-action, #7c3aed)",
                  }}
                >
                  {iniciaisNome(nomeDir)}
                </span>
              )}
            </div>
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 800,
                  color: t.text,
                  fontFamily: FONT_TITLE,
                  letterSpacing: "0.02em",
                }}
              >
                {textoOuTraco(nomeDir)}
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>{d.nome}</p>
              {sobreDir ? (
                <p
                  style={{
                    margin: "12px 0 0",
                    fontSize: 14,
                    color: t.text,
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    fontFamily: FONT.body,
                  }}
                >
                  {sobreDir}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        {sobreDir ? (
          <div
            style={{
              marginTop: 14,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 14,
              padding: 16,
              background: t.inputBg,
            }}
          >
            <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE }}>Sobre o Diretor(a)</h3>
            <p style={{ margin: 0, fontSize: 14, color: t.text, lineHeight: 1.55, whiteSpace: "pre-wrap", fontFamily: FONT.body }}>{sobreDir}</p>
          </div>
        ) : null}
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
          <div className="app-org-gerencias-kanban">
            {d.gerencias.map((g) => {
              const liderG = nomeLiderImediatoGerencia(d, g, nomeResponsavel);
              const sobreG = g.sobre_gerencia.trim();
              return (
                <article key={g.id} style={cardGerencia}>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--brand-contrast, #1e36f8)", fontFamily: FONT_TITLE }}>
                    {g.nome}
                  </h3>
                  <p style={{ margin: "10px 0 0", fontSize: 13, fontFamily: FONT.body, color: "var(--brand-contrast, #1e36f8)", opacity: 0.95 }}>
                    Líder imediato: <span style={{ fontWeight: 700 }}>{textoOuTraco(liderG)}</span>
                  </p>
                  <div style={{ marginTop: 12 }}>
                    <h4
                      style={{
                        margin: "0 0 6px",
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        fontFamily: FONT.body,
                        color: "var(--brand-contrast, #1e36f8)",
                        opacity: 0.85,
                      }}
                    >
                      Sobre a Gerência
                    </h4>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap", fontFamily: FONT.body, color: t.text }}>
                      {sobreG ? g.sobre_gerencia : "—"}
                    </p>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <h4
                      style={{
                        margin: "0 0 8px",
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        fontFamily: FONT.body,
                        color: "var(--brand-contrast, #1e36f8)",
                        opacity: 0.85,
                      }}
                    >
                      Times
                    </h4>
                    {g.times.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>Sem dados para o período selecionado.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {g.times.map((ti: RhOrgTime) => {
                          const lt = nomeLiderImediatoTime(d, g, ti, nomeResponsavel);
                          const q = countsPorTimeId[ti.id] ?? 0;
                          const exp = Boolean(timesExpandidos[ti.id]);
                          const membros = membrosPorTimeId[ti.id] ?? [];
                          return (
                            <div key={ti.id} style={{ minWidth: 0 }}>
                              <button
                                type="button"
                                aria-expanded={exp}
                                aria-controls={`org-time-membros-${ti.id}`}
                                id={`org-time-chip-${ti.id}`}
                                onClick={() => toggleTime(ti.id)}
                                style={{
                                  ...chipTime,
                                  width: "100%",
                                  justifyContent: "space-between",
                                  textAlign: "left",
                                  background: t.cardBg,
                                  border: `1px solid ${t.cardBorder}`,
                                  color: t.text,
                                  fontWeight: 600,
                                }}
                              >
                                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                                  <span>{ti.nome}</span>
                                  <span style={{ fontSize: 11, fontWeight: 500, color: t.textMuted }}>
                                    Líder: {textoOuTraco(lt)} · {q} prestador(es)
                                  </span>
                                </span>
                              </button>
                              {exp ? (
                                <div
                                  id={`org-time-membros-${ti.id}`}
                                  role="region"
                                  aria-labelledby={`org-time-chip-${ti.id}`}
                                  style={{
                                    marginTop: 8,
                                    padding: 10,
                                    borderRadius: 10,
                                    border: `1px solid ${t.cardBorder}`,
                                    background: t.inputBg,
                                  }}
                                >
                                  {membros.length === 0 ? (
                                    <p style={{ margin: 0, fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
                                      Sem dados para o período selecionado.
                                    </p>
                                  ) : (
                                    <ul style={{ margin: 0, paddingLeft: 18, color: t.text, fontSize: 13, fontFamily: FONT.body, lineHeight: 1.5 }}>
                                      {membros.map((n) => (
                                        <li key={n}>{n}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : (
        <p style={{ margin: "0 0 24px", fontSize: 14, color: t.textMuted, fontFamily: FONT.body }}>Sem dados para o período selecionado.</p>
      )}
    </div>
  );
}
