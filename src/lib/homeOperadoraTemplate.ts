import type { ComponentType } from "react";

/** Valor canónico gravado quando a operadora usa a Home Operador Padrão. */
export const HOME_OPERADOR_TEMPLATE_PADRAO = "default";

export type HomeOperadorTemplateMeta = {
  key: string;
  label: string;
  description: string;
};

/** Templates dedicados além do padrão — registrar aqui ao criar nova Home por operadora. */
export const HOME_OPERADOR_TEMPLATES_DEDICADOS: HomeOperadorTemplateMeta[] = [
  // Ex.: { key: "blaze", label: "Blaze", description: "Home customizada para operadora Blaze." },
];

export const HOME_OPERADOR_TEMPLATE_SELECT_OPTIONS: { value: string; label: string }[] = [
  { value: HOME_OPERADOR_TEMPLATE_PADRAO, label: "Home Operador Padrão" },
  ...HOME_OPERADOR_TEMPLATES_DEDICADOS.map((t) => ({ value: t.key, label: t.label })),
];

/** Normaliza valor da BD: null / vazio / default / padrao → usa Home Padrão. */
export function normalizeHomeOperadorTemplateKey(raw: string | null | undefined): string | null {
  const k = raw?.trim().toLowerCase();
  if (!k || k === HOME_OPERADOR_TEMPLATE_PADRAO || k === "padrao" || k === "padrao_operador") {
    return null;
  }
  return k;
}

export function isHomeOperadorTemplatePadrao(raw: string | null | undefined): boolean {
  return normalizeHomeOperadorTemplateKey(raw) === null;
}

export type HomeOperadorTemplateProps = {
  operadoraSlug: string | null;
  sectionIdPrefix: string;
};

type HomeOperadorTemplateRegistry = Record<string, ComponentType<HomeOperadorTemplateProps>>;

let dedicatedRegistry: HomeOperadorTemplateRegistry = {};

/** Registo lazy de templates dedicados (import dinâmico ao adicionar operadora). */
export function registerHomeOperadorTemplates(entries: HomeOperadorTemplateRegistry): void {
  dedicatedRegistry = { ...dedicatedRegistry, ...entries };
}

export function getRegisteredHomeOperadorTemplateKeys(): string[] {
  return Object.keys(dedicatedRegistry);
}

export function resolveHomeOperadorTemplateComponent(
  rawTemplateKey: string | null | undefined,
  Padrao: ComponentType<HomeOperadorTemplateProps>,
): ComponentType<HomeOperadorTemplateProps> {
  const key = normalizeHomeOperadorTemplateKey(rawTemplateKey);
  if (!key) return Padrao;
  return dedicatedRegistry[key] ?? Padrao;
}
