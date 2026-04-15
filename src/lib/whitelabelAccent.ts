/** No operador whitelabel, `--brand-extra*` não vem da operadora — mapeia para tokens válidos. */
export function resolveWhitelabelAccentCss(accentVar?: string): string {
  if (!accentVar) return "var(--brand-contrast, #1e36f8)";
  const map: Record<string, string> = {
    "--brand-extra1": "var(--brand-contrast, #1e36f8)",
    "--brand-extra2": "var(--brand-success, #22c55e)",
    "--brand-extra3": "var(--brand-extra3, #f59e0b)",
    "--brand-extra4": "var(--brand-danger, #e84025)",
    "--brand-primary": "var(--brand-action, #7c3aed)",
    "--brand-accent": "var(--brand-contrast, #1e36f8)",
    "--brand-secondary": "var(--brand-contrast, #1e36f8)",
    "--brand-icon": "var(--brand-icon-color)",
    "--brand-success": "var(--brand-success, #22c55e)",
    "--brand-icon-color": "var(--brand-icon-color)",
  };
  return map[accentVar] ?? `var(${accentVar})`;
}
