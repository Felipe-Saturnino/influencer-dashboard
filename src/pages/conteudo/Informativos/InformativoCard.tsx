import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { CorpoHtmlInformativo } from "../../../components/conteudo/CorpoHtmlInformativo";
import { truncPreviewHtml, fmtDataColunaGerenciamento } from "../../../lib/informativosWorkflow";
import { labelPerfisInformativo } from "../../../lib/informativosRoles";
import type { ReactNode } from "react";

const PREVIEW_LEN = 280;

export function InformativoCard({
  assunto,
  descricao,
  perfis,
  dataPublicacao,
  autorNome,
  cardShadow,
  reacoes,
}: {
  assunto: string;
  descricao: string;
  perfis: string[];
  dataPublicacao: string | null;
  autorNome: string;
  cardShadow: string;
  reacoes?: ReactNode;
}) {
  const { theme: t } = useApp();

  return (
    <article
      style={{
        background: t.cardBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 14,
        padding: "16px 18px",
        boxShadow: cardShadow,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: t.text, fontFamily: FONT.body }}>{assunto}</h2>
      <div style={{ marginTop: 10 }}>
        <CorpoHtmlInformativo html={truncPreviewHtml(descricao, PREVIEW_LEN)} color={t.textMuted} />
      </div>
      <p style={{ fontSize: 12, color: t.textMuted, margin: "12px 0 0", fontFamily: FONT.body }}>
        {autorNome ? `${autorNome} · ` : ""}
        {dataPublicacao ? fmtDataColunaGerenciamento(dataPublicacao) : "—"}
        {perfis.length ? ` · ${labelPerfisInformativo(perfis)}` : ""}
      </p>
      {reacoes ? <div style={{ marginTop: 12 }}>{reacoes}</div> : null}
    </article>
  );
}
