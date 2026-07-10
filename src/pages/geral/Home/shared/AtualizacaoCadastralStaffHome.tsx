import { AlertTriangle } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import { FONT_TITLE } from "../../../../lib/dashboardConstants";
import { FONT } from "../../../../constants/theme";
import {
  getPageHeaderIconBoxStyle,
  getPageHeaderTitleRowStyle,
  PAGE_HEADER_ICON_PROPS,
} from "../../../../lib/pageHeaderStyles";
import {
  REVISAO_CADASTRO_GATE_MODAL_CTA,
  REVISAO_CADASTRO_HOME_MENSAGEM,
  tituloAtualizacaoCadastralPendente,
} from "../../../../lib/rhCadastroRevisao";
import { HOME_BODY_MUTED } from "./homeSharedUi";
import { useHomeAtualizacaoCadastral } from "../hooks/useHomeAtualizacaoCadastral";

export function AtualizacaoCadastralStaffHome({ sectionIdPrefix }: { sectionIdPrefix: string }) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const { propsFor } = useAppPageNav();
  const { loading, pendente, primeiroNome } = useHomeAtualizacaoCadastral();

  if (loading || !pendente) return null;

  const cardBg = brand.useBrand && brand.blockBg ? brand.blockBg : t.cardBg;
  const titleId = `${sectionIdPrefix}-atualizacao-cadastral-title`;
  const nav = propsFor("rh_dados_cadastro");

  return (
    <section
      aria-labelledby={titleId}
      style={{
        background: cardBg,
        border: "1px solid rgba(232, 64, 37, 0.35)",
        borderRadius: 20,
        padding: "24px 28px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: "linear-gradient(90deg, #e84025, #f59e0b)",
        }}
        aria-hidden
      />
      <div style={getPageHeaderTitleRowStyle()}>
        <div
          style={{
            ...getPageHeaderIconBoxStyle(brand),
            background: "rgba(232, 64, 37, 0.12)",
            border: "1px solid rgba(232, 64, 37, 0.35)",
            color: "#e84025",
          }}
        >
          <AlertTriangle {...PAGE_HEADER_ICON_PROPS} color="#e84025" />
        </div>
        <h2
          id={titleId}
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 800,
            color: t.text,
            fontFamily: FONT_TITLE,
            letterSpacing: "0.02em",
            lineHeight: 1.3,
          }}
        >
          {tituloAtualizacaoCadastralPendente(primeiroNome)}
        </h2>
      </div>
      <p
        style={{
          ...HOME_BODY_MUTED,
          color: t.textMuted,
          margin: "12px 0 16px",
          fontFamily: FONT.body,
        }}
      >
        {REVISAO_CADASTRO_HOME_MENSAGEM}
      </p>
      <a
        href={nav.href}
        onClick={nav.onClick}
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "10px 20px",
          borderRadius: 10,
          border: "1px solid rgba(232, 64, 37, 0.45)",
          background: "rgba(232, 64, 37, 0.12)",
          color: "#e84025",
          fontSize: 13,
          fontWeight: 700,
          fontFamily: FONT.body,
          textDecoration: "none",
          cursor: "pointer",
        }}
      >
        {REVISAO_CADASTRO_GATE_MODAL_CTA}
      </a>
    </section>
  );
}
