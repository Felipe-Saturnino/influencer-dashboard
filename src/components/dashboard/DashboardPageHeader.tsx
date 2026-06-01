import type { ReactNode } from "react";
import { PageHeader } from "../PageHeader";
import type { PageHeaderBrand } from "../../lib/pageHeaderStyles";

export type DashboardPageHeaderBrand = PageHeaderBrand;

export type DashboardPageHeaderTheme = {
  textMuted: string;
};

export interface DashboardPageHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  /** Mantido por compatibilidade — o layout usa `useDashboardBrand()` via `PageHeader`. */
  brand: DashboardPageHeaderBrand;
  /** Mantido por compatibilidade — o layout usa `useApp()` via `PageHeader`. */
  t: DashboardPageHeaderTheme;
  right?: ReactNode;
}

/** Alias de `PageHeader` para páginas que já importavam deste módulo. */
export function DashboardPageHeader({ icon, title, subtitle, right }: DashboardPageHeaderProps) {
  return <PageHeader icon={icon} title={title} subtitle={subtitle} actions={right} />;
}
