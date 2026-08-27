import type { SupabaseClient } from "@supabase/supabase-js";

export type RhPostagemTipoUi = "comunicado" | "politica" | "rh_talk";
export type RhPostagemContentType = "comunicado" | "documento" | "rh_talk";
export type RhPostagemStatus = "rascunho" | "aprovacao" | "publicado" | "arquivado";

export const RH_POSTAGEM_STATUS_LABEL: Record<RhPostagemStatus, string> = {
  rascunho: "Rascunho",
  aprovacao: "Aprovação",
  publicado: "Publicado",
  arquivado: "Arquivado",
};

export const RH_POSTAGEM_TIPO_UI_LABEL: Record<RhPostagemTipoUi, string> = {
  comunicado: "Comunicados",
  politica: "Políticas e Normativas",
  rh_talk: "RH Talks",
};

export const TIPOS_COMUNICADO = ["Urgente", "Geral", "Pagamento", "Eventos"] as const;
export const TIPOS_POLITICA = ["Conduta", "Segurança", "Bonificação", "Folha de Pagamento", "RH"] as const;

const SLUG_COMUNICADO: Record<(typeof TIPOS_COMUNICADO)[number], string> = {
  Urgente: "urgente",
  Geral: "geral",
  Pagamento: "pagamento",
  Eventos: "eventos",
};

const SLUG_POLITICA: Record<(typeof TIPOS_POLITICA)[number], string> = {
  Conduta: "conduta",
  Segurança: "seguranca",
  Bonificação: "bonificacao",
  "Folha de Pagamento": "folha_pagamento",
  RH: "rh",
};

export function contentTypeFromTipoUi(tipo: RhPostagemTipoUi): RhPostagemContentType {
  if (tipo === "politica") return "documento";
  return tipo;
}

export function tipoUiFromContentType(ct: RhPostagemContentType): RhPostagemTipoUi {
  if (ct === "documento") return "politica";
  return ct;
}

export function statusPosPublicar(requerAprovacao: boolean): RhPostagemStatus {
  return requerAprovacao ? "aprovacao" : "publicado";
}

export function requerAprovacaoEhSim(valor: string): boolean {
  return valor.trim().toLowerCase() === "sim";
}

export function requerAprovacaoLabelFromDb(requer: boolean): "Sim" | "Não" {
  return requer ? "Sim" : "Não";
}

/** Colunas da tabela de gerenciamento: DD/MM/AA - HH:MM */
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

export type SnapshotPostagemEdicao = {
  tipoPostagem: RhPostagemTipoUi;
  tipoComunicado: string;
  tipoPolitica: string;
  requerAprovacao: string;
  assunto: string;
  introducao: string;
  descricao: string;
  imagemPath: string | null;
  anexoPath: string | null;
  anexoNome: string | null;
  /** RH Talks — público-alvo (nomes de setor / Todos os prestadores). */
  aplicavelA: string[];
};

function textoCorpoIgual(a: string, b: string): boolean {
  return stripHtmlText(sanitizePortalRhHtml(a)) === stripHtmlText(sanitizePortalRhHtml(b));
}

export function diffEdicaoRascunho(antes: SnapshotPostagemEdicao, depois: SnapshotPostagemEdicao): string[] {
  const alteracoes: string[] = [];
  if (antes.tipoPostagem !== depois.tipoPostagem) {
    alteracoes.push("Tipo de postagem alterado");
  }
  if (antes.tipoPostagem === "comunicado" && antes.tipoComunicado !== depois.tipoComunicado) {
    alteracoes.push("Tipo de comunicado alterado");
  }
  if (antes.tipoPostagem === "politica" && antes.tipoPolitica !== depois.tipoPolitica) {
    alteracoes.push("Tipo de política/normativa alterado");
  }
  if (antes.tipoPostagem === "politica" && antes.requerAprovacao !== depois.requerAprovacao) {
    alteracoes.push(`É necessário aprovação? alterado de «${antes.requerAprovacao}» para «${depois.requerAprovacao}»`);
  }
  if (antes.assunto.trim() !== depois.assunto.trim()) {
    alteracoes.push("Assunto alterado");
  }
  if (
    (antes.tipoPostagem === "politica" || antes.tipoPostagem === "rh_talk") &&
    antes.introducao.trim() !== depois.introducao.trim()
  ) {
    alteracoes.push("Introdução alterada");
  }
  if (!textoCorpoIgual(antes.descricao, depois.descricao)) {
    alteracoes.push("Descrição alterada");
  }
  if (antes.imagemPath !== depois.imagemPath) {
    alteracoes.push(depois.imagemPath ? "Imagem alterada" : "Imagem removida");
  }
  if (antes.anexoPath !== depois.anexoPath || antes.anexoNome !== depois.anexoNome) {
    alteracoes.push(depois.anexoPath ? "Anexo alterado" : "Anexo removido");
  }
  if (antes.tipoPostagem === "rh_talk") {
    const a = [...antes.aplicavelA].map((s) => s.trim()).filter(Boolean).sort().join("|");
    const b = [...depois.aplicavelA].map((s) => s.trim()).filter(Boolean).sort().join("|");
    if (a !== b) alteracoes.push("Aplicável a alterado");
  }
  return alteracoes;
}

export async function registrarHistoricoEdicoesRascunho(
  supabase: SupabaseClient,
  contentType: RhPostagemContentType,
  contentId: string,
  alteracoes: string[],
  userId: string,
): Promise<string | null> {
  if (alteracoes.length === 0) return null;
  const rows = alteracoes.map((alteracao) => ({
    content_type: contentType,
    content_id: contentId,
    status_de: "rascunho",
    status_para: "rascunho",
    alteracao,
    created_by: userId,
  }));
  const { error } = await supabase.from("rh_portal_postagem_status_historico").insert(rows);
  return error?.message ?? null;
}

export function textoHistoricoStatus(de: RhPostagemStatus | null, para: RhPostagemStatus): string {
  if (!de) return `Status definido como ${RH_POSTAGEM_STATUS_LABEL[para]}`;
  return `Status alterado de ${RH_POSTAGEM_STATUS_LABEL[de]} para ${RH_POSTAGEM_STATUS_LABEL[para]}`;
}

export async function registrarHistoricoStatus(
  supabase: SupabaseClient,
  contentType: RhPostagemContentType,
  contentId: string,
  statusDe: RhPostagemStatus | null,
  statusPara: RhPostagemStatus,
  userId: string,
): Promise<string | null> {
  if (statusDe === statusPara) return null;
  const { error } = await supabase.from("rh_portal_postagem_status_historico").insert({
    content_type: contentType,
    content_id: contentId,
    status_de: statusDe ?? statusPara,
    status_para: statusPara,
    alteracao: textoHistoricoStatus(statusDe, statusPara),
    created_by: userId,
  });
  return error?.message ?? null;
}

export function slugComunicadoFromLabel(label: string): string | null {
  const k = TIPOS_COMUNICADO.find((t) => t === label);
  return k ? SLUG_COMUNICADO[k] : null;
}

export function slugPoliticaFromLabel(label: string): string | null {
  const k = TIPOS_POLITICA.find((t) => t === label);
  return k ? SLUG_POLITICA[k] : null;
}

export function labelComunicadoFromSlug(slug: string): string {
  for (const [label, s] of Object.entries(SLUG_COMUNICADO)) {
    if (s === slug) return label;
  }
  return slug;
}

export function labelPoliticaFromSlug(slug: string): string {
  for (const [label, s] of Object.entries(SLUG_POLITICA)) {
    if (s === slug) return label;
  }
  return slug;
}

export function fmtDataHoraPt(iso: string | null | undefined): string {
  return fmtDataColunaGerenciamento(iso);
}

export function fmtDataPt(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

const PORTAL_RH_HTML_TAGS = new Set([
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
]);

/** Mantém apenas formatação básica do editor (negrito, itálico, sublinhado, listas). */
export function sanitizePortalRhHtml(html: string): string {
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
      if (!PORTAL_RH_HTML_TAGS.has(el.tagName)) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
        continue;
      }
      for (const attr of [...el.attributes]) {
        el.removeAttribute(attr.name);
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
    el.innerHTML = sanitizePortalRhHtml(html);
    return (el.textContent ?? "").replace(/\u00a0/g, " ").trim();
  }
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function truncPreviewHtml(s: string, max = 200): string {
  const t = stripHtmlText(s ?? "");
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

export function isHtmlEmpty(html: string): boolean {
  return stripHtmlText(html).length === 0;
}

export type ValidacaoPublicar = Record<string, string>;

export function validarPublicarComunicado(f: {
  tipoComunicado: string;
  assunto: string;
  descricao: string;
}): ValidacaoPublicar {
  const err: ValidacaoPublicar = {};
  if (!f.tipoComunicado.trim()) err.tipoComunicado = "Selecione o tipo de comunicado.";
  if (!f.assunto.trim()) err.assunto = "Informe o assunto.";
  if (isHtmlEmpty(f.descricao)) err.descricao = "Informe a descrição.";
  return err;
}

export function validarPublicarPolitica(f: {
  tipoPolitica: string;
  requerAprovacao: string;
  assunto: string;
  introducao: string;
  descricao: string;
}): ValidacaoPublicar {
  const err: ValidacaoPublicar = {};
  if (!f.tipoPolitica.trim()) err.tipoPolitica = "Selecione o tipo de política/normativa.";
  if (!f.requerAprovacao.trim()) err.requerAprovacao = "Informe se é necessária aprovação.";
  if (!f.assunto.trim()) err.assunto = "Informe o assunto.";
  if (!f.introducao.trim()) err.introducao = "Informe a introdução.";
  else if (f.introducao.length > 400) err.introducao = "Introdução deve ter no máximo 400 caracteres.";
  if (isHtmlEmpty(f.descricao)) err.descricao = "Informe a descrição.";
  return err;
}

export function validarPublicarRhTalk(f: {
  assunto: string;
  introducao: string;
  descricao: string;
  aplicavelA: string[];
}): ValidacaoPublicar {
  const err: ValidacaoPublicar = {};
  if (!f.assunto.trim()) err.assunto = "Informe o assunto.";
  if (!f.introducao.trim()) err.introducao = "Informe a introdução.";
  else if (f.introducao.length > 400) err.introducao = "Introdução deve ter no máximo 400 caracteres.";
  if (isHtmlEmpty(f.descricao)) err.descricao = "Informe a descrição.";
  if (f.aplicavelA.length === 0) err.aplicavelA = "Selecione ao menos um público aplicável.";
  return err;
}
