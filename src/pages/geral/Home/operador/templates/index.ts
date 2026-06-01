/**
 * Registo de Homes dedicadas por operadora.
 * Ao criar um template novo:
 * 1. Componente em `operador/templates/<key>.tsx`
 * 2. registerHomeOperadorTemplates({ [key]: Component })
 * 3. Entrada em HOME_OPERADOR_TEMPLATES_DEDICADOS (`lib/homeOperadoraTemplate.ts`)
 */
import { registerHomeOperadorTemplates } from "../../../../../lib/homeOperadoraTemplate";

registerHomeOperadorTemplates({
  // blaze: HomeOperadoraBlaze,
});
