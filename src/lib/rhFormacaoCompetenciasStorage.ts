import { sanitizeStorageFileName } from "./rhVagaCandidaturaFiles";

export const RH_FORMACAO_PORTFOLIO_BUCKET = "rh-prestador-self-media";

export const RH_FORMACAO_PORTFOLIO_MAX_BYTES = 15 * 1024 * 1024;

export const RH_FORMACAO_PORTFOLIO_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,application/pdf,image/png,image/jpeg,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const PORTFOLIO_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function portfolioArquivoPermitido(file: File): boolean {
  if (file.size > RH_FORMACAO_PORTFOLIO_MAX_BYTES) return false;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf", "png", "jpg", "jpeg", "webp", "doc", "docx"].includes(ext)) return true;
  return PORTFOLIO_MIME.has(file.type);
}

export function buildPortfolioStoragePath(funcionarioId: string, fileName: string): string {
  return `${funcionarioId}/portfolio/${crypto.randomUUID()}_${sanitizeStorageFileName(fileName)}`;
}

export function validarUrlPortfolio(url: string): boolean {
  const t = url.trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function validarAnoFormacao(ano: number | null | undefined): boolean {
  if (ano == null) return true;
  const max = new Date().getFullYear() + 10;
  return Number.isInteger(ano) && ano >= 1950 && ano <= max;
}
