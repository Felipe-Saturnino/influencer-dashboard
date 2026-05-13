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

/** Título curto + detalhe (ex.: itálico no formulário público). `label` agregado para listagens internas. */
export const TIPOS_DENUNCIA: { key: TipoDenunciaKey; titulo: string; detalhe: string; label: string }[] = [
  {
    key: "assedio_moral",
    titulo: "Assédio moral",
    detalhe: "Tratamento abusivo, humilhações, constrangimentos, ameaças",
    label: "Assédio moral (tratamento abusivo, humilhações, constrangimentos, ameaças)",
  },
  {
    key: "assedio_sexual",
    titulo: "Assédio sexual",
    detalhe: "Condutas de cunho sexual indesejadas",
    label: "Assédio sexual (condutas de cunho sexual indesejadas)",
  },
  {
    key: "discriminacao",
    titulo: "Discriminação",
    detalhe: "Por raça, gênero, orientação sexual, religião, idade, deficiência, etc.",
    label: "Discriminação (por raça, gênero, orientação sexual, religião, idade, deficiência, etc.)",
  },
  {
    key: "fraudes_corrupcao",
    titulo: "Fraudes ou corrupção",
    detalhe: "Desvios de recursos, subornos, manipulação de informações",
    label: "Fraudes ou corrupção (desvios de recursos, subornos, manipulação de informações)",
  },
  {
    key: "conflito_interesses",
    titulo: "Conflito de interesses",
    detalhe: "Interesses pessoais interferem nas decisões profissionais",
    label: "Conflito de interesses (interesses pessoais interferem nas decisões profissionais)",
  },
  {
    key: "conduta_antietica",
    titulo: "Conduta antiética",
    detalhe: "Comportamentos que violam o código de ética da empresa",
    label: "Conduta antiética (violação do código de ética da empresa)",
  },
  {
    key: "violacao_politicas",
    titulo: "Violação de políticas internas",
    detalhe: "Descumprimento de normas, regras ou procedimentos",
    label: "Violação de políticas internas (descumprimento de normas, regras ou procedimentos)",
  },
  {
    key: "uso_indevido_recursos",
    titulo: "Uso indevido de recursos da empresa",
    detalhe: "Equipamentos, dinheiro, informações",
    label: "Uso indevido de recursos da empresa (equipamentos, dinheiro, informações)",
  },
  {
    key: "vazamento_info",
    titulo: "Vazamento ou uso indevido de informações",
    detalhe: "Dados confidenciais, LGPD, etc.",
    label: "Vazamento ou uso indevido de informações (dados confidenciais, LGPD, etc.)",
  },
  {
    key: "seguranca_trabalho",
    titulo: "Segurança do trabalho",
    detalhe: "Situações de risco ou negligência com a segurança",
    label: "Segurança do trabalho (situações de risco ou negligência com a segurança)",
  },
  {
    key: "retaliacao",
    titulo: "Retaliação",
    detalhe: "Punição ou ameaça a quem fez uma denúncia",
    label: "Retaliação (punição ou ameaça a quem fez uma denúncia)",
  },
  { key: "outro", titulo: "Outro", detalhe: "", label: "Outro" },
];

export function tipoLabel(key: string): string {
  const t = TIPOS_DENUNCIA.find((x) => x.key === key);
  if (!t) return key;
  return t.detalhe ? `${t.titulo} (${t.detalhe})` : t.titulo;
}

export function sanitizeStorageFileName(name: string): string {
  const base = name.replace(/[/\\]/g, "_").replace(/[^\w.\-()\s\u00C0-\u024F]/g, "_");
  return base.length > 180 ? base.slice(-180) : base;
}
