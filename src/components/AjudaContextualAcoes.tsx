import { BookOpen, GraduationCap, LifeBuoy } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { useApp } from "../context/AppContext";
import { useDashboardBrand } from "../hooks/useDashboardBrand";
import { buildAppPath, getAppRouteByPageKey } from "../lib/appRoutes";
import { getBtnIconeAcaoLinhaStyle } from "../lib/btnIconeAcaoLinhaStyles";
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
  const brand = useDashboardBrand();
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

  const linkStyle = {
    ...getBtnIconeAcaoLinhaStyle(t),
    width: 32,
    height: 32,
    borderRadius: 9,
    color: brand.primary,
    textDecoration: "none",
  };

  const LinkAjuda = ({ href, label, onClick, children }: LinkAjudaProps) => (
    <a href={href} aria-label={label} title={label} onClick={onClick} style={linkStyle}>
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
        href={buildAppPath("ajuda", "ConhecaAPlataforma", pageSlug)}
        label="Conheça esta página"
        onClick={(event) => {
          event.preventDefault();
          navigateTo("ajuda", "ConhecaAPlataforma", { detailSlug: pageSlug });
        }}
      >
        <BookOpen size={15} aria-hidden="true" />
      </LinkAjuda>
      <LinkAjuda
        href={buildAppPath("ajuda", "Troubleshooting", pageSlug)}
        label="Troubleshooting desta página"
        onClick={(event) => {
          event.preventDefault();
          navigateTo("ajuda", "Troubleshooting", { detailSlug: pageSlug });
        }}
      >
        <LifeBuoy size={15} aria-hidden="true" />
      </LinkAjuda>
      {tutorial && tutorialVisivel ? (
        <LinkAjuda
          href={buildAppPath("ajuda", "Tutoriais", tutorial.urlSlug)}
          label="Abrir tutorial desta seção"
          onClick={(event) => {
            event.preventDefault();
            navigateTo("ajuda", "Tutoriais", { detailSlug: tutorial.urlSlug });
          }}
        >
          <GraduationCap size={15} aria-hidden="true" />
        </LinkAjuda>
      ) : null}
    </div>
  );
}
