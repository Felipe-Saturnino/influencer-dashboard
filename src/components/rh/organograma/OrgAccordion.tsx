import type { CSSProperties } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2, UserX } from "lucide-react";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { nomeLiderImediatoGerencia, nomeLiderImediatoTime } from "../../../lib/rhOrganogramaLiderImediato";
import type { RhOrgDiretoriaComFilhos, RhOrgGerenciaComFilhos, RhOrgTime } from "../../../types/rhOrganograma";

type Theme = { text: string; textMuted: string; cardBorder: string; inputBg: string };

export function OrgAccordion({
  arvore,
  t,
  expanded,
  toggle,
  nomeResponsavel,
  countsPorTimeId,
  podeEditar,
  podeExcluir,
  onEditDiretoria,
  onEditGerencia,
  onEditTime,
  onAddGerencia,
  onAddTime,
  onDeactivateDiretoria,
  onDeactivateGerencia,
  onDeactivateTime,
  onExcluirDiretoria,
  onExcluirGerencia,
  onExcluirTime,
}: {
  arvore: RhOrgDiretoriaComFilhos[];
  t: Theme;
  expanded: Record<string, boolean>;
  toggle: (key: string) => void;
  nomeResponsavel: (funcId: string | null | undefined, nomeLivre: string | null | undefined) => string;
  countsPorTimeId: Record<string, number>;
  podeEditar: boolean;
  podeExcluir: boolean;
  onEditDiretoria: (d: RhOrgDiretoriaComFilhos) => void;
  onEditGerencia: (g: RhOrgGerenciaComFilhos) => void;
  onEditTime: (ti: RhOrgTime) => void;
  onAddGerencia: (diretoriaId: string) => void;
  onAddTime: (gerenciaId: string) => void;
  onDeactivateDiretoria: (d: RhOrgDiretoriaComFilhos) => void;
  onDeactivateGerencia: (g: RhOrgGerenciaComFilhos) => void;
  onDeactivateTime: (ti: RhOrgTime) => void;
  onExcluirDiretoria: (d: RhOrgDiretoriaComFilhos) => void;
  onExcluirGerencia: (g: RhOrgGerenciaComFilhos) => void;
  onExcluirTime: (ti: RhOrgTime) => void;
}) {
  const rowBtn: CSSProperties = {
    padding: "6px 10px",
    borderRadius: 8,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: FONT.body,
  };

  const rowBtnExcluir: CSSProperties = {
    ...rowBtn,
    borderColor: "rgba(232,64,37,0.45)",
    color: "#e84025",
  };

  if (arvore.length === 0) {
    return (
      <div style={{ padding: "32px 16px", textAlign: "center", color: t.textMuted, fontFamily: FONT.body, fontSize: 14 }}>
        Nenhuma diretoria cadastrada.
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT.body }}>
      <h2
        style={{
          margin: "0 0 16px",
          fontSize: 13,
          fontWeight: 800,
          color: t.textMuted,
          fontFamily: FONT_TITLE,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Gerenciamento
      </h2>
      {arvore.map((d) => {
        const kd = `d-${d.id}`;
        const openD = !!expanded[kd];
        const respD = nomeResponsavel(d.diretor_funcionario_id, d.diretor_nome_livre);
        return (
          <div
            key={d.id}
            style={{
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 12,
              marginBottom: 10,
              overflow: "hidden",
              opacity: d.status === "inativo" ? 0.75 : 1,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "12px 14px",
                background: "color-mix(in srgb, var(--brand-action, #7c3aed) 8%, transparent)",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                id={kd}
                aria-expanded={openD}
                aria-controls={`panel-${kd}`}
                onClick={() => toggle(kd)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  border: "none",
                  background: "transparent",
                  color: t.text,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 14,
                  fontFamily: FONT.body,
                  textAlign: "left",
                }}
              >
                {openD ? <ChevronDown size={18} aria-hidden /> : <ChevronRight size={18} aria-hidden />}
                {d.nome}
                {d.status === "inativo" ? <span style={{ fontSize: 11, color: t.textMuted }}>(inativa)</span> : null}
              </button>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {podeEditar && d.status === "ativo" ? (
                  <>
                    <button type="button" style={rowBtn} onClick={() => onAddGerencia(d.id)}>
                      <Plus size={14} style={{ verticalAlign: "middle" }} aria-hidden /> Gerência
                    </button>
                    <button type="button" style={rowBtn} aria-label={`Editar ${d.nome}`} onClick={() => onEditDiretoria(d)}>
                      <Pencil size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      style={{ ...rowBtn, borderColor: "rgba(232,64,37,0.35)", color: "#e84025" }}
                      aria-label={`Desativar ${d.nome}`}
                      onClick={() => onDeactivateDiretoria(d)}
                    >
                      <UserX size={14} aria-hidden />
                    </button>
                  </>
                ) : null}
                {podeExcluir ? (
                  <button
                    type="button"
                    style={rowBtnExcluir}
                    aria-label={`Excluir definitivamente a diretoria ${d.nome}`}
                    onClick={() => onExcluirDiretoria(d)}
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                ) : null}
              </div>
            </div>
            <div style={{ padding: "6px 14px 0", fontSize: 12, color: t.textMuted }}>
              {respD ? `Diretor(a): ${respD}` : `Diretor(a): —`}
              <br />
              Centro de Custos: {d.centro_custos}
            </div>
            {openD ? (
              <div id={`panel-${kd}`} role="region" aria-labelledby={kd} style={{ padding: "10px 12px 12px" }}>
                {d.gerencias.length === 0 ? (
                  <div style={{ fontSize: 13, color: t.textMuted, padding: 8 }}>Nenhuma gerência nesta diretoria.</div>
                ) : (
                  d.gerencias.map((g) => {
                    const kg = `g-${g.id}`;
                    const openG = !!expanded[kg];
                    const respG = nomeLiderImediatoGerencia(d, g, nomeResponsavel);
                    return (
                      <div
                        key={g.id}
                        style={{
                          border: `1px solid ${t.cardBorder}`,
                          borderRadius: 10,
                          marginTop: 10,
                          overflow: "hidden",
                          opacity: g.status === "inativo" ? 0.75 : 1,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            padding: "10px 12px",
                            background: t.inputBg,
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            type="button"
                            id={kg}
                            aria-expanded={openG}
                            aria-controls={`panel-${kg}`}
                            onClick={() => toggle(kg)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              border: "none",
                              background: "transparent",
                              color: t.text,
                              cursor: "pointer",
                              fontWeight: 600,
                              fontSize: 13,
                              fontFamily: FONT.body,
                            }}
                          >
                            {openG ? <ChevronDown size={16} aria-hidden /> : <ChevronRight size={16} aria-hidden />}
                            {g.nome}
                            {g.status === "inativo" ? <span style={{ fontSize: 11, color: t.textMuted }}>(inativa)</span> : null}
                          </button>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {podeEditar && g.status === "ativo" ? (
                              <>
                                <button type="button" style={rowBtn} onClick={() => onAddTime(g.id)}>
                                  <Plus size={14} aria-hidden /> Time
                                </button>
                                <button type="button" style={rowBtn} aria-label={`Editar ${g.nome}`} onClick={() => onEditGerencia(g)}>
                                  <Pencil size={14} aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  style={{ ...rowBtn, borderColor: "rgba(232,64,37,0.35)", color: "#e84025" }}
                                  aria-label={`Desativar ${g.nome}`}
                                  onClick={() => onDeactivateGerencia(g)}
                                >
                                  <UserX size={14} aria-hidden />
                                </button>
                              </>
                            ) : null}
                            {podeExcluir ? (
                              <button
                                type="button"
                                style={rowBtnExcluir}
                                aria-label={`Excluir definitivamente a gerência ${g.nome}`}
                                onClick={() => onExcluirGerencia(g)}
                              >
                                <Trash2 size={14} aria-hidden />
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <div style={{ padding: "4px 12px 0", fontSize: 12, color: t.textMuted }}>
                          Líder imediato: {respG.trim() ? respG : "—"}
                          <br />
                          Centro de Custos: {g.centro_custos}
                        </div>
                        {openG ? (
                          <div id={`panel-${kg}`} role="region" aria-labelledby={kg} style={{ padding: "8px 10px 10px" }}>
                            {g.times.length === 0 ? (
                              <div style={{ fontSize: 12, color: t.textMuted, padding: 6 }}>Nenhum time nesta gerência.</div>
                            ) : (
                              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                                {g.times.map((ti) => {
                                  const respT = nomeLiderImediatoTime(d, g, ti, nomeResponsavel);
                                  const q = countsPorTimeId[ti.id] ?? 0;
                                  return (
                                    <li
                                      key={ti.id}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 8,
                                        padding: "8px 10px",
                                        borderBottom: `1px solid color-mix(in srgb, ${t.cardBorder} 50%, transparent)`,
                                        fontSize: 13,
                                        opacity: ti.status === "inativo" ? 0.75 : 1,
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      <div>
                                        <strong style={{ color: t.text }}>{ti.nome}</strong>
                                        {ti.status === "inativo" ? <span style={{ color: t.textMuted, fontSize: 11 }}> (inativo)</span> : null}
                                        <div style={{ fontSize: 11, color: t.textMuted }}>
                                          Líder imediato: {respT.trim() ? respT : "—"}
                                          <br />
                                          Centro de Custos: {ti.centro_custos}
                                          {q > 0 ? (
                                            <>
                                              <br />
                                              {q} funcionário(s) ativo(s)
                                            </>
                                          ) : null}
                                        </div>
                                      </div>
                                      {(podeEditar && ti.status === "ativo") || podeExcluir ? (
                                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                          {podeEditar && ti.status === "ativo" ? (
                                            <>
                                              <button type="button" style={rowBtn} aria-label={`Editar ${ti.nome}`} onClick={() => onEditTime(ti)}>
                                                <Pencil size={14} aria-hidden />
                                              </button>
                                              <button
                                                type="button"
                                                style={{ ...rowBtn, borderColor: "rgba(232,64,37,0.35)", color: "#e84025" }}
                                                aria-label={`Desativar ${ti.nome}`}
                                                onClick={() => onDeactivateTime(ti)}
                                              >
                                                <UserX size={14} aria-hidden />
                                              </button>
                                            </>
                                          ) : null}
                                          {podeExcluir ? (
                                            <button
                                              type="button"
                                              style={rowBtnExcluir}
                                              aria-label={`Excluir definitivamente o time ${ti.nome}`}
                                              onClick={() => onExcluirTime(ti)}
                                            >
                                              <Trash2 size={14} aria-hidden />
                                            </button>
                                          ) : null}
                                        </div>
                                      ) : null}
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
