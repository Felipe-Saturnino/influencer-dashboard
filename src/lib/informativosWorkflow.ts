import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "../types";
import { validarOperadorEscopoInformativo } from "./informativosOperadorEscopo";

export type InformativoStatus = "rascunho" | "aprovacao" | "publicado" | "arquivado";

/** Destinos que não permitem publicação direta — só «Enviar para aprovação». */
export const PERFIS_INFORMATIVO_FLUXO_APROVACAO: readonly Role[] = [
  "admin",
  "executivo",
  "operador",
  "agencia",
  "influencer",
  "afiliado",
  "investidor",
] as const;

/** Se o informativo incluir algum destes perfis, só Administrador pode aprovar. */
export const PERFIS_INFORMATIVO_APROVACAO_SOMENTE_ADMIN: readonly Role[] = [
  "admin",
  "executivo",
  "operador",
] as const;

/** Se o informativo incluir algum destes (e nenhum de aprovação restrita a admin), Admin/Executivo/Gestor aprovam. */
export const PERFIS_INFORMATIVO_APROVACAO_GESTAO: readonly Role[] = [
  "agencia",
  "influencer",
  "afiliado",
] as const;


/** Pelo menos um perfil alvo exige fluxo de aprovação (sem botão Publicar). */
export function perfisRequeremFluxoAprovacao(perfis: string[]): boolean {
  return perfis.some((p) => PERFIS_INFORMATIVO_FLUXO_APROVACAO.includes(p as Role));
}

/** Todos os perfis alvo permitem publicação direta (ex.: só Gestor, RH, Prestadores…). */
export function podePublicarDiretoInformativo(perfis: string[]): boolean {
  return perfis.length > 0 && !perfisRequeremFluxoAprovacao(perfis);
}

/** Administrador pode aprovar a própria postagem; demais precisam de outro aprovador. */
export function podeAutoAprovarInformativo(role: Role | undefined | null): boolean {
  return role === "admin";
}

/**
 * Quem pode aprovar conforme os perfis alvo do informativo.
 * Regra mais restritiva prevalece (admin/executivo/operador → só admin).
 */
export function rolePodeAprovarInformativo(role: Role | undefined | null, perfisAlvo: string[]): boolean {
  if (!role) return false;
  if (!perfisAlvo.length) return false;

  const exigeAdmin = perfisAlvo.some((p) => PERFIS_INFORMATIVO_APROVACAO_SOMENTE_ADMIN.includes(p as Role));
  if (exigeAdmin) return role === "admin";

  const exigeGestao = perfisAlvo.some((p) => PERFIS_INFORMATIVO_APROVACAO_GESTAO.includes(p as Role));
  if (exigeGestao) return role === "admin" || role === "executivo" || role === "gestor";

  return false;
}

export function podeUsuarioAprovarInformativo(
  userRole: Role | undefined | null,
  userId: string | undefined | null,
  createdBy: string | null | undefined,
  perfisAlvo: string[],
): boolean {
  if (!userId || !rolePodeAprovarInformativo(userRole, perfisAlvo)) return false;
  if (podeAutoAprovarInformativo(userRole)) return true;
  return !!createdBy && createdBy !== userId;
}

export function acaoEnvioPermitida(acao: "publicar" | "aprovacao", perfis: string[]): boolean {
  if (acao === "publicar") return podePublicarDiretoInformativo(perfis);
  return perfisRequeremFluxoAprovacao(perfis);
}

export const INFORMATIVO_STATUS_LABEL: Record<InformativoStatus, string> = {
  rascunho: "Rascunho",
  aprovacao: "Aprovação",
  publicado: "Publicado",
  arquivado: "Arquivado",
};

export function fmtDataColunaGerenciamento(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${p(d.getFullYear() % 100)} - ${p(d.getHours())}:${p(d.getMinutes())}`;
  } catch {
    return "—";
  }
}

export function fmtDataHoraPt(iso: string | null | undefined): string {
  return fmtDataColunaGerenciamento(iso);
}

const INFORMATIVO_HTML_TAGS = new Set([
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "UL",
  "OL",
  "LI",
  "DIV",
  "P",
  "BR",
  "A",
]);

function sanitizeHref(href: string): string | null {
  const h = (href ?? "").trim();
  if (!h) return null;
  try {
    const u = new URL(h, typeof window !== "undefined" ? window.location.origin : "https://example.com");
    if (u.protocol === "http:" || u.protocol === "https:") return u.href;
  } catch {
    return null;
  }
  return null;
}

/** Negrito, itálico, sublinhado, listas e hiperlinks https. */
export function sanitizeInformativoHtml(html: string): string {
  const raw = (html ?? "").trim();
  if (!raw) return "";
  if (typeof document === "undefined") {
    return raw.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "").replace(/on\w+="[^"]*"/gi, "");
  }

  const doc = new DOMParser().parseFromString(raw, "text/html");
  const sanitizeNode = (parent: Node) => {
    const children = [...parent.childNodes];
    for (const child of children) {
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      const el = child as Element;
      if (!INFORMATIVO_HTML_TAGS.has(el.tagName)) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
        continue;
      }
      if (el.tagName === "A") {
        const safe = sanitizeHref(el.getAttribute("href") ?? "");
        for (const attr of [...el.attributes]) el.removeAttribute(attr.name);
        if (safe) {
          el.setAttribute("href", safe);
          el.setAttribute("rel", "noopener noreferrer");
          el.setAttribute("target", "_blank");
        } else {
          while (el.firstChild) parent.insertBefore(el.firstChild, el);
          parent.removeChild(el);
          continue;
        }
      } else {
        for (const attr of [...el.attributes]) el.removeAttribute(attr.name);
      }
      sanitizeNode(el);
    }
  };
  sanitizeNode(doc.body);
  return doc.body.innerHTML;
}

export function stripHtmlText(html: string): string {
  if (typeof document !== "undefined") {
    const el = document.createElement("div");
    el.innerHTML = sanitizeInformativoHtml(html);
    return (el.textContent ?? "").replace(/\u00a0/g, " ").trim();
  }
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function isHtmlEmpty(html: string): boolean {
  return stripHtmlText(html).length === 0;
}

export function truncPreviewHtml(s: string, max = 200): string {
  const t = stripHtmlText(s ?? "");
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

export function textoHistoricoStatus(de: InformativoStatus | null, para: InformativoStatus): string {
  if (!de) return `Status definido como ${INFORMATIVO_STATUS_LABEL[para]}`;
  return `Status alterado de ${INFORMATIVO_STATUS_LABEL[de]} para ${INFORMATIVO_STATUS_LABEL[para]}`;
}

export async function registrarHistoricoStatus(
  supabase: SupabaseClient,
  informativoId: string,
  statusDe: InformativoStatus | null,
  statusPara: InformativoStatus,
  userId: string,
): Promise<void> {
  if (statusDe === statusPara) return;
  const { error } = await supabase.from("conteudo_informativo_status_historico").insert({
    informativo_id: informativoId,
    status_de: statusDe ?? statusPara,
    status_para: statusPara,
    alteracao: textoHistoricoStatus(statusDe, statusPara),
    created_by: userId,
  });
  if (error) console.error("[informativosWorkflow] historico status:", error);
}

export type SnapshotInformativoEdicao = {
  assunto: string;
  descricao: string;
  perfis: string[];
  operador_escopo: string | null;
};

function perfisIguais(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function textoCorpoIgual(a: string, b: string): boolean {
  return stripHtmlText(sanitizeInformativoHtml(a)) === stripHtmlText(sanitizeInformativoHtml(b));
}

export function diffEdicaoRascunho(antes: SnapshotInformativoEdicao, depois: SnapshotInformativoEdicao): string[] {
  const alteracoes: string[] = [];
  if (antes.assunto.trim() !== depois.assunto.trim()) alteracoes.push("Assunto alterado");
  if (!textoCorpoIgual(antes.descricao, depois.descricao)) alteracoes.push("Descrição alterada");
  if (!perfisIguais(antes.perfis, depois.perfis)) alteracoes.push("Perfis alterados");
  if ((antes.operador_escopo ?? null) !== (depois.operador_escopo ?? null)) {
    alteracoes.push("Escopo Operador alterado");
  }
  return alteracoes;
}

export async function registrarHistoricoEdicoesRascunho(
  supabase: SupabaseClient,
  informativoId: string,
  alteracoes: string[],
  userId: string,
): Promise<void> {
  if (alteracoes.length === 0) return;
  const rows = alteracoes.map((alteracao) => ({
    informativo_id: informativoId,
    status_de: "rascunho",
    status_para: "rascunho",
    alteracao,
    created_by: userId,
  }));
  const { error } = await supabase.from("conteudo_informativo_status_historico").insert(rows);
  if (error) console.error("[informativosWorkflow] historico edicoes:", error);
}

export function validarPublicarInformativo(f: {
  assunto: string;
  descricao: string;
  perfis: string[];
  operador_escopo?: string | null;
}): Record<string, string> {
  const err: Record<string, string> = {};
  if (!f.assunto.trim()) err.assunto = "Informe o assunto.";
  if (isHtmlEmpty(f.descricao)) err.descricao = "Informe a descrição.";
  if (!f.perfis.length) err.perfis = "Selecione ao menos um perfil.";
  const escopoErr = validarOperadorEscopoInformativo(f.perfis, f.operador_escopo ?? null);
  if (escopoErr) err.operador_escopo = escopoErr;
  return err;
}

/** Validação mínima ao salvar rascunho (inclui escopo Operador quando aplicável). */
export function validarSalvarInformativo(f: {
  perfis: string[];
  operador_escopo?: string | null;
}): Record<string, string> {
  const err: Record<string, string> = {};
  if (!f.perfis.length) err.perfis = "Selecione ao menos um perfil.";
  const escopoErr = validarOperadorEscopoInformativo(f.perfis, f.operador_escopo ?? null);
  if (escopoErr) err.operador_escopo = escopoErr;
  return err;
}
