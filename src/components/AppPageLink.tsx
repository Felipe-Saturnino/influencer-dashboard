import type { CSSProperties, ReactNode } from "react";
import type { PageKey } from "../types";
import { FONT } from "../constants/theme";
import { getAppPageAbsoluteUrl } from "../lib/appPageLink";
import { useAppPageNav } from "../hooks/useAppPageNav";

type AppPageLinkProps = {
  pageKey: PageKey;
  tabSlug?: string | null;
  children?: ReactNode;
  /** Exibe a URL absoluta como texto do link (padrão Ajuda). */
  showAbsoluteUrl?: boolean;
  style?: CSSProperties;
};

export function AppPageLink({
  pageKey,
  tabSlug,
  children,
  showAbsoluteUrl = false,
  style,
}: AppPageLinkProps) {
  const { propsFor } = useAppPageNav();
  const nav = propsFor(pageKey, tabSlug);
  const label = children ?? (showAbsoluteUrl ? getAppPageAbsoluteUrl(pageKey, tabSlug) : nav.href);

  return (
    <a
      {...nav}
      style={{
        color: "var(--brand-primary, #7c3aed)",
        fontWeight: 600,
        textDecoration: "underline",
        wordBreak: "break-all",
        ...style,
      }}
    >
      {label}
    </a>
  );
}

/** Bloco padrão abaixo do primeiro parágrafo em Ajuda → Conheça / Troubleshooting. */
export function AjudaPaginaAcessoLink({ pageKey }: { pageKey: PageKey }) {
  return (
    <p
      style={{
        margin: "12px 0 0",
        fontSize: 13,
        lineHeight: 1.65,
        fontFamily: FONT.body,
      }}
    >
      Acesse a pagina aqui{" "}
      <AppPageLink pageKey={pageKey} showAbsoluteUrl />
    </p>
  );
}
