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

export const CANAL_DENUNCIA_ANEXO_MAX_BYTES = 20 * 1024 * 1024;

/** Tipos aceitos no envio público (PDF, JPG, PNG, MP4). */
export const CANAL_DENUNCIA_ANEXO_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.mp4,application/pdf,image/jpeg,image/png,video/mp4";

const CANAL_DENUNCIA_ANEXO_EXT = [".pdf", ".jpg", ".jpeg", ".png", ".mp4"] as const;
const CANAL_DENUNCIA_ANEXO_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "video/mp4",
]);

export function arquivoCanalDenunciaPermitido(file: { name: string; type?: string; size?: number }): boolean {
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  const extOk = CANAL_DENUNCIA_ANEXO_EXT.some((e) => name.endsWith(e));
  const mimeOk = type.length > 0 && CANAL_DENUNCIA_ANEXO_MIME.has(type);
  if (!extOk && !mimeOk) return false;
  if (typeof file.size === "number" && file.size > CANAL_DENUNCIA_ANEXO_MAX_BYTES) return false;
  return true;
}

const PROTOCOLO_CANAL_LEGADO_RE = /^CDSPIN[0-9]{5}$/;
const PROTOCOLO_CANAL_SIGILO_RE = /^CDSPIN-[0-9A-F]{16}$/;

export function normalizarProtocoloCanal(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function isProtocoloCanalFormatoValido(protocolo: string): boolean {
  return PROTOCOLO_CANAL_LEGADO_RE.test(protocolo) || PROTOCOLO_CANAL_SIGILO_RE.test(protocolo);
}

export const PROTOCOLO_CANAL_PLACEHOLDER = "Informe o protocolo recebido no envio";

export const MSG_CANAL_RATE_LIMITED = "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
export const MSG_CANAL_PROTOCOLO_NAO_ENCONTRADO =
  "Protocolo não encontrado. Se você se identificou, confira também o e-mail usado no envio.";

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
  | "elogios"
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
  {
    key: "elogios",
    titulo: "Elogios",
    detalhe: "Reconhecimento por atitudes, comportamentos ou resultados positivos",
    label: "Elogios (reconhecimento por atitudes, comportamentos ou resultados positivos)",
  },
  { key: "outro", titulo: "Outro", detalhe: "", label: "Outro" },
];

export function tipoLabel(key: string): string {
  const t = TIPOS_DENUNCIA.find((x) => x.key === key);
  if (!t) return key;
  return t.detalhe ? `${t.titulo} (${t.detalhe})` : t.titulo;
}

export type CanalDenunciaAutorOrigem = "rh" | "relator";

export type CanalDenunciaMensagemPublica = {
  id: string;
  texto: string;
  autor_origem: CanalDenunciaAutorOrigem;
  created_at: string;
  anexos: { id: string; file_name: string }[];
};

export function labelAutorMensagemPublica(origem: CanalDenunciaAutorOrigem): string {
  return origem === "relator" ? "Você" : "Equipe RH";
}

export function labelAutorMensagemRh(origem: CanalDenunciaAutorOrigem, nomeRh?: string | null): string {
  if (origem === "relator") return "Relator";
  const n = (nomeRh ?? "").trim();
  return n || "Equipe RH";
}

export function sanitizeStorageFileName(name: string): string {
  const base = name.replace(/[/\\]/g, "_").replace(/[^\w.\-()\s\u00C0-\u024F]/g, "_");
  return base.length > 180 ? base.slice(-180) : base;
}
