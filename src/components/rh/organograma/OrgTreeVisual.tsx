import { Pencil } from "lucide-react";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import type { RhOrgDiretoriaComFilhos, RhOrgGerenciaComFilhos, RhOrgTime } from "../../../types/rhOrganograma";

type Theme = { text: string; textMuted: string; cardBorder: string; inputBg: string; isDark: boolean };

function badgeSemResp(t: Theme) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 6px",
        borderRadius: 6,
        background: "rgba(245,158,11,0.18)",
        color: "#f59e0b",
        marginLeft: 8,
        fontFamily: FONT.body,
      }}
    >
      Sem responsável
    </span>
  );
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

export function OrgTreeVisual({
  arvore,
  t,
  nomeResponsavel,
  countsPorTimeId,
  podeEditar,
  onEditDiretoria,
  onEditGerencia,
  onEditTime,
}: {
  arvore: RhOrgDiretoriaComFilhos[];
  t: Theme;
  nomeResponsavel: (funcId: string | null | undefined, nomeLivre: string | null | undefined) => string;
  countsPorTimeId: Record<string, number>;
  podeEditar: boolean;
  onEditDiretoria: (d: RhOrgDiretoriaComFilhos) => void;
  onEditGerencia: (g: RhOrgGerenciaComFilhos, diretoria: RhOrgDiretoriaComFilhos) => void;
  onEditTime: (ti: RhOrgTime, gerencia: RhOrgGerenciaComFilhos, diretoria: RhOrgDiretoriaComFilhos) => void;
}) {
  const nodeBox = (inativo: boolean): React.CSSProperties => ({
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 12,
    padding: "10px 12px",
    marginBottom: 8,
    background: inativo ? "color-mix(in srgb, var(--brand-secondary, #4a2082) 4%, transparent)" : t.inputBg,
    opacity: inativo ? 0.72 : 1,
    fontFamily: FONT.body,
  });

  const renderTime = (ti: RhOrgTime, g: RhOrgGerenciaComFilhos, d: RhOrgDiretoriaComFilhos) => {
    const nr = nomeResponsavel(ti.lider_funcionario_id, ti.lider_nome_livre);
    const q = countsPorTimeId[ti.id] ?? 0;
    return (
      <div key={ti.id} style={{ marginLeft: 20, marginTop: 6, borderLeft: `2px solid color-mix(in srgb, ${t.cardBorder} 70%, transparent)`, paddingLeft: 12 }}>
        <div style={nodeBox(ti.status === "inativo")}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <div>
              <span style={{ fontWeight: 700, color: t.text, fontSize: 13 }}>{ti.nome}</span>
              {ti.status === "inativo" ? badgeInativo() : null}
              {!nr ? badgeSemResp(t) : null}
            </div>
            {podeEditar ? (
              <button
                type="button"
                aria-label={`Editar time ${ti.nome}`}
                onClick={() => onEditTime(ti, g, d)}
                style={{
                  padding: 6,
                  borderRadius: 8,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  color: t.text,
                  cursor: "pointer",
                }}
              >
                <Pencil size={14} aria-hidden />
              </button>
            ) : null}
          </div>
          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
            {nr ? `Líder: ${nr}` : null}
            {nr ? " · " : null}
            {q} funcionário(s) ativo(s) neste time
          </div>
        </div>
      </div>
    );
  };

  const renderGerencia = (g: RhOrgGerenciaComFilhos, d: RhOrgDiretoriaComFilhos) => {
    const nr = nomeResponsavel(g.gerente_funcionario_id, g.gerente_nome_livre);
    return (
      <div key={g.id} style={{ marginLeft: 16, marginTop: 8, borderLeft: `2px solid color-mix(in srgb, var(--brand-action, #7c3aed) 35%, transparent)`, paddingLeft: 12 }}>
        <div style={nodeBox(g.status === "inativo")}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <div>
              <span style={{ fontWeight: 700, color: t.text, fontSize: 14 }}>{g.nome}</span>
              {g.status === "inativo" ? badgeInativo() : null}
              {!nr ? badgeSemResp(t) : null}
            </div>
            {podeEditar ? (
              <button
                type="button"
                aria-label={`Editar gerência ${g.nome}`}
                onClick={() => onEditGerencia(g, d)}
                style={{
                  padding: 6,
                  borderRadius: 8,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  color: t.text,
                  cursor: "pointer",
                }}
              >
                <Pencil size={14} aria-hidden />
              </button>
            ) : null}
          </div>
          {nr ? <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>Gerente: {nr}</div> : null}
        </div>
        {g.times.map((ti) => renderTime(ti, g, d))}
      </div>
    );
  };

  if (arvore.length === 0) {
    return (
      <div style={{ padding: "32px 16px", textAlign: "center", color: t.textMuted, fontFamily: FONT.body, fontSize: 14 }}>
        Sem diretorias cadastradas. Use o modo Gerenciamento para criar a primeira diretoria.
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
        Estrutura
      </h2>
      {arvore.map((d) => {
        const nr = nomeResponsavel(d.diretor_funcionario_id, d.diretor_nome_livre);
        return (
          <div key={d.id} style={{ marginBottom: 20 }}>
            <div style={nodeBox(d.status === "inativo")}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <div>
                  <span style={{ fontWeight: 800, color: t.text, fontSize: 15 }}>{d.nome}</span>
                  {d.status === "inativo" ? badgeInativo() : null}
                  {!nr ? badgeSemResp(t) : null}
                </div>
                {podeEditar ? (
                  <button
                    type="button"
                    aria-label={`Editar diretoria ${d.nome}`}
                    onClick={() => onEditDiretoria(d)}
                    style={{
                      padding: 6,
                      borderRadius: 8,
                      border: `1px solid ${t.cardBorder}`,
                      background: t.inputBg,
                      color: t.text,
                      cursor: "pointer",
                    }}
                  >
                    <Pencil size={14} aria-hidden />
                  </button>
                ) : null}
              </div>
              {nr ? <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>Diretor(a): {nr}</div> : null}
            </div>
            {d.gerencias.map((g) => renderGerencia(g, d))}
          </div>
        );
      })}
    </div>
  );
}
