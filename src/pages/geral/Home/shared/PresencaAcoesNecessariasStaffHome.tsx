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
import { HOME_BODY_MUTED } from "./homeSharedUi";
import { useHomePresencaAcoesNecessarias } from "../hooks/useHomePresencaAcoesNecessarias";

const CTA_PRESENCA = "Ir para Controle de Presença";
const TAB_SLUG_PRESENCA = "ControleDePresenca";

const COPY_AUSENCIA = {
  title: "Ausência de Check-in/Check-out",
  body: "Você possui dias escalados com ausência de Check-in/Check-out, por gentileza, realize a justificativa e correção para geração do demonstrativo financeiro.",
} as const;

const COPY_APROVACAO = {
  title: "Aprovação de Horas Prestadas",
  body: "Você possui horas prestadas pendente de aprovação, por gentileza, realize a análise e aprovação para geração do demonstrativo financeiro.",
} as const;

function AlertaPresencaCard({
  titleId,
  title,
  body,
}: {
  titleId: string;
  title: string;
  body: string;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const { propsFor } = useAppPageNav();
  const cardBg = brand.useBrand && brand.blockBg ? brand.blockBg : t.cardBg;
  const nav = propsFor("rh_calendario", TAB_SLUG_PRESENCA);

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
          {title}
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
        {body}
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
        {CTA_PRESENCA}
      </a>
    </section>
  );
}

/** Alertas de presença da Home Estúdio — Falta/Pendente e Registrado. */
export function PresencaAcoesNecessariasStaffHome({ sectionIdPrefix }: { sectionIdPrefix: string }) {
  const { loading, ausenciaCheckInOut, aprovacaoHoras } = useHomePresencaAcoesNecessarias();

  if (loading) return null;

  return (
    <>
      {ausenciaCheckInOut ? (
        <AlertaPresencaCard
          titleId={`${sectionIdPrefix}-presenca-ausencia-title`}
          title={COPY_AUSENCIA.title}
          body={COPY_AUSENCIA.body}
        />
      ) : null}
      {aprovacaoHoras ? (
        <AlertaPresencaCard
          titleId={`${sectionIdPrefix}-presenca-aprovacao-title`}
          title={COPY_APROVACAO.title}
          body={COPY_APROVACAO.body}
        />
      ) : null}
    </>
  );
}
