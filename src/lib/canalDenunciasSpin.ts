/** Rota pública (respeita Vite base). */
export function canalDenunciasPublicPath(): string {
  const b = import.meta.env.BASE_URL || "/";
  return b.endsWith("/") ? `${b}canal-denuncias-spin` : `${b}/canal-denuncias-spin`;
}

export function isCanalDenunciasPublicPath(): boolean {
  const path = (typeof window !== "undefined" ? window.location.pathname : "/").replace(/\/+$/, "") || "/";
  const want = canalDenunciasPublicPath().replace(/\/+$/, "") || "/";
  return path === want;
}

export const STORAGE_BUCKET = "canal-denuncias-spin";

export type DenunciaStatusDb = "relatado" | "em_avaliacao" | "procedente" | "nao_procedente";

export const STATUS_OPTIONS: { value: DenunciaStatusDb; label: string }[] = [
  { value: "relatado", label: "Relatado" },
  { value: "em_avaliacao", label: "Em avaliação" },
  { value: "procedente", label: "Procedente" },
  { value: "nao_procedente", label: "Não procedente" },
];

export function statusLabel(s: DenunciaStatusDb): string {
  return STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
}

export type TipoDenunciaKey =
  | "assedio_moral"
  | "assedio_sexual"
  | "discriminacao"
  | "fraudes_corrupcao"
  | "conflito_interesses"
  | "conduta_antietica"
  | "violacao_politicas"
  | "uso_indevido_recursos"
  | "vazamento_info"
  | "seguranca_trabalho"
  | "retaliacao"
  | "outro";

export const TIPOS_DENUNCIA: { key: TipoDenunciaKey; label: string }[] = [
  { key: "assedio_moral", label: "Assédio moral (tratamento abusivo, humilhações, constrangimentos, ameaças)" },
  { key: "assedio_sexual", label: "Assédio sexual (condutas de cunho sexual indesejadas)" },
  { key: "discriminacao", label: "Discriminação (por raça, gênero, orientação sexual, religião, idade, deficiência, etc.)" },
  { key: "fraudes_corrupcao", label: "Fraudes ou corrupção (desvios de recursos, subornos, manipulação de informações)" },
  { key: "conflito_interesses", label: "Conflito de interesses (interesses pessoais interferem nas decisões profissionais)" },
  { key: "conduta_antietica", label: "Conduta antiética (violação do código de ética da empresa)" },
  { key: "violacao_politicas", label: "Violação de políticas internas (descumprimento de normas, regras ou procedimentos)" },
  { key: "uso_indevido_recursos", label: "Uso indevido de recursos da empresa (equipamentos, dinheiro, informações)" },
  { key: "vazamento_info", label: "Vazamento ou uso indevido de informações (dados confidenciais, LGPD, etc.)" },
  { key: "seguranca_trabalho", label: "Segurança do trabalho (situações de risco ou negligência com a segurança)" },
  { key: "retaliacao", label: "Retaliação (punição ou ameaça a quem fez uma denúncia)" },
  { key: "outro", label: "Outro" },
];

export function tipoLabel(key: string): string {
  return TIPOS_DENUNCIA.find((t) => t.key === key)?.label ?? key;
}

export function sanitizeStorageFileName(name: string): string {
  const base = name.replace(/[/\\]/g, "_").replace(/[^\w.\-()\s\u00C0-\u024F]/g, "_");
  return base.length > 180 ? base.slice(-180) : base;
}
