import type { CSSProperties } from "react";
import { FONT } from "../../../constants/theme";
import { nomeLiderImediatoGerencia, nomeLiderImediatoTime } from "../../../lib/rhOrganogramaLiderImediato";
import type { RhOrgDiretoriaComFilhos, RhOrgGerenciaComFilhos, RhOrgTime } from "../../../types/rhOrganograma";

type Theme = { text: string; textMuted: string; cardBorder: string; inputBg: string; isDark: boolean };

export type OrgTreeVisualAcaoCtx =
  | { nivel: "diretoria"; id: string; nome: string }
  | { nivel: "gerencia"; id: string; nome: string }
  | { nivel: "time"; id: string; nome: string };

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

function textoOuTraco(s: string): string {
  const t = s.trim();
  return t ? t : "—";
}

export function OrgTreeVisual({
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
  const nodeBox = (inativo: boolean): CSSProperties => ({
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 12,
    padding: "12px 14px",
    marginBottom: 10,
    background: inativo ? "color-mix(in srgb, var(--brand-secondary, #4a2082) 4%, transparent)" : t.inputBg,
    opacity: inativo ? 0.72 : 1,
    fontFamily: FONT.body,
  });

  const btnAcao: CSSProperties = {
    padding: "8px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    fontFamily: FONT.body,
  };

  const linhasMeta: CSSProperties = {
    margin: "8px 0 0",
    fontSize: 13,
    fontWeight: 600,
    color: t.text,
    lineHeight: 1.5,
    whiteSpace: "pre-line",
  };

  const tituloBloco: CSSProperties = {
    margin: 0,
    fontSize: 14,
    fontWeight: 800,
    color: t.text,
    lineHeight: 1.35,
  };

  const renderAcoes = (ctx: OrgTreeVisualAcaoCtx) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
      <button type="button" style={btnAcao} onClick={() => onAbrirVagas(ctx)}>
        Vagas
      </button>
      <button type="button" style={btnAcao} onClick={() => onAbrirEstrutura(ctx)}>
        Estrutura
      </button>
    </div>
  );

  const renderTime = (ti: RhOrgTime, g: RhOrgGerenciaComFilhos, d: RhOrgDiretoriaComFilhos) => {
    const lider = nomeLiderImediatoTime(d, g, ti, nomeResponsavel);
    const ctx: OrgTreeVisualAcaoCtx = { nivel: "time", id: ti.id, nome: ti.nome };
    return (
      <div
        key={ti.id}
        style={{ marginLeft: 20, marginTop: 8, borderLeft: `2px solid color-mix(in srgb, ${t.cardBorder} 70%, transparent)`, paddingLeft: 12 }}
      >
        <div style={nodeBox(ti.status === "inativo")}>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            <p style={tituloBloco}>Time {ti.nome}</p>
            {ti.status === "inativo" ? badgeInativo() : null}
          </div>
          <p style={linhasMeta}>
            {`Líder imediato: ${textoOuTraco(lider)}\nCentro de Custos: ${ti.centro_custos}`}
          </p>
          {renderAcoes(ctx)}
        </div>
      </div>
    );
  };

  const renderGerencia = (g: RhOrgGerenciaComFilhos, d: RhOrgDiretoriaComFilhos) => {
    const lider = nomeLiderImediatoGerencia(d, g, nomeResponsavel);
    const ctx: OrgTreeVisualAcaoCtx = { nivel: "gerencia", id: g.id, nome: g.nome };
    return (
      <div
        key={g.id}
        style={{ marginLeft: 16, marginTop: 10, borderLeft: `2px solid color-mix(in srgb, var(--brand-action, #7c3aed) 35%, transparent)`, paddingLeft: 12 }}
      >
        <div style={nodeBox(g.status === "inativo")}>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            <p style={tituloBloco}>Gerência {g.nome}</p>
            {g.status === "inativo" ? badgeInativo() : null}
          </div>
          <p style={linhasMeta}>
            {`Líder imediato: ${textoOuTraco(lider)}\nCentro de Custos: ${g.centro_custos}`}
          </p>
          {renderAcoes(ctx)}
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
      {arvore.map((d) => {
        const diretor = nomeResponsavel(d.diretor_funcionario_id, d.diretor_nome_livre);
        const ctx: OrgTreeVisualAcaoCtx = { nivel: "diretoria", id: d.id, nome: d.nome };
        return (
          <div key={d.id} style={{ marginBottom: 22 }}>
            <div style={nodeBox(d.status === "inativo")}>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                <p style={tituloBloco}>Diretoria {d.nome}</p>
                {d.status === "inativo" ? badgeInativo() : null}
              </div>
              <p style={linhasMeta}>
                {`Diretor(a): ${textoOuTraco(diretor)}\nCentro de Custos: ${d.centro_custos}`}
              </p>
              {renderAcoes(ctx)}
            </div>
            {d.gerencias.map((g) => renderGerencia(g, d))}
          </div>
        );
      })}
    </div>
  );
}
