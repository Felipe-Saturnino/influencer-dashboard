import { BookOpen, GraduationCap, LifeBuoy } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { useApp } from "../context/AppContext";
import { buildAppPath, getAppRouteByPageKey } from "../lib/appRoutes";
import {
  AJUDA_CONTEXTUAL_ICON_SIZE,
  getAjudaContextualAcaoStyle,
  type AjudaContextualAcao,
} from "../lib/ajudaContextualStyles";
import { tutorialVisivelParaRole } from "../lib/ajudaTutorialVisibilidade";
import type { PageKey } from "../types";

export type AjudaContextualTutorial = {
  id: string;
  urlSlug: string;
};

type AjudaContextualAcoesProps = {
  pageKey: PageKey;
  tutorial?: AjudaContextualTutorial | null;
};

type LinkAjudaProps = {
  acao: AjudaContextualAcao;
  href: string;
  label: string;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  children: ReactNode;
};

/** Atalhos da barra de filtros para Conheça, Troubleshooting e tutorial permitido. */
export function AjudaContextualAcoes({ pageKey, tutorial }: AjudaContextualAcoesProps) {
  const {
    theme: t,
    effectiveRole,
    navigateTo,
    tutorialVisibility,
    tutorialVisibilityLoaded,
  } = useApp();
  const pageSlug = getAppRouteByPageKey(pageKey)?.pageSlug;
  if (!pageSlug) return null;

  const tutorialVisivel =
    tutorial &&
    tutorialVisibilityLoaded &&
    tutorialVisivelParaRole(
      tutorial.id,
      effectiveRole,
      tutorialVisibility,
      effectiveRole === "admin",
    );

  const LinkAjuda = ({ acao, href, label, onClick, children }: LinkAjudaProps) => (
    <a
      href={href}
      aria-label={label}
      title={label}
      onClick={onClick}
      style={getAjudaContextualAcaoStyle(acao, t.isDark)}
    >
      {children}
    </a>
  );

  return (
    <div
      role="group"
      aria-label="Ajuda contextual"
      style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}
    >
      <LinkAjuda
        acao="conheca"
        href={buildAppPath("ajuda", "ConhecaAPlataforma", pageSlug)}
        label="Conheça esta página"
        onClick={(event) => {
          event.preventDefault();
          navigateTo("ajuda", "ConhecaAPlataforma", { detailSlug: pageSlug });
        }}
      >
        <BookOpen size={AJUDA_CONTEXTUAL_ICON_SIZE} aria-hidden="true" />
      </LinkAjuda>
      <LinkAjuda
        acao="troubleshooting"
        href={buildAppPath("ajuda", "Troubleshooting", pageSlug)}
        label="Troubleshooting desta página"
        onClick={(event) => {
          event.preventDefault();
          navigateTo("ajuda", "Troubleshooting", { detailSlug: pageSlug });
        }}
      >
        <LifeBuoy size={AJUDA_CONTEXTUAL_ICON_SIZE} aria-hidden="true" />
      </LinkAjuda>
      {tutorial && tutorialVisivel ? (
        <LinkAjuda
          acao="tutorial"
          href={buildAppPath("ajuda", "Tutoriais", tutorial.urlSlug)}
          label="Abrir tutorial desta seção"
          onClick={(event) => {
            event.preventDefault();
            navigateTo("ajuda", "Tutoriais", { detailSlug: tutorial.urlSlug });
          }}
        >
          <GraduationCap size={AJUDA_CONTEXTUAL_ICON_SIZE} aria-hidden="true" />
        </LinkAjuda>
      ) : null}
    </div>
  );
}
