import type { SupabaseClient } from "@supabase/supabase-js";

export type AcademyPostagemTipoUi = "comunicado" | "dica" | "manual";
export type AcademyPostagemContentType = "comunicado" | "dica" | "manual";
export type AcademyPostagemStatus = "rascunho" | "publicado" | "arquivado";

export const ACADEMY_POSTAGEM_STATUS_LABEL: Record<AcademyPostagemStatus, string> = {
  rascunho: "Rascunho",
  publicado: "Publicado",
  arquivado: "Arquivado",
};

export const ACADEMY_POSTAGEM_TIPO_UI_LABEL: Record<AcademyPostagemTipoUi, string> = {
  comunicado: "Comunicados",
  dica: "Dicas",
  manual: "Manuais",
};

export const TIPOS_COMUNICADO_ACADEMY = ["Treinamentos", "Geral"] as const;
export const TIPOS_DICA_MANUAL = ["Jogos", "Imagem", "Comunicação", "Geral"] as const;

const SLUG_COMUNICADO: Record<(typeof TIPOS_COMUNICADO_ACADEMY)[number], string> = {
  Treinamentos: "treinamentos",
  Geral: "geral",
};

const SLUG_DICA_MANUAL: Record<(typeof TIPOS_DICA_MANUAL)[number], string> = {
  Jogos: "jogos",
  Imagem: "imagem",
  Comunicação: "comunicacao",
  Geral: "geral",
};

export function contentTypeFromTipoUi(tipo: AcademyPostagemTipoUi): AcademyPostagemContentType {
  return tipo;
}

export function tipoUiFromContentType(ct: AcademyPostagemContentType): AcademyPostagemTipoUi {
  return ct;
}

export function slugComunicadoFromLabel(label: string): string {
  return SLUG_COMUNICADO[label as (typeof TIPOS_COMUNICADO_ACADEMY)[number]] ?? label.toLowerCase();
}

export function slugDicaManualFromLabel(label: string): string {
  return SLUG_DICA_MANUAL[label as (typeof TIPOS_DICA_MANUAL)[number]] ?? label.toLowerCase();
}

export function labelComunicadoFromSlug(slug: string): string {
  const entry = Object.entries(SLUG_COMUNICADO).find(([, s]) => s === slug);
  return entry?.[0] ?? slug;
}

export function labelDicaManualFromSlug(slug: string): string {
  const entry = Object.entries(SLUG_DICA_MANUAL).find(([, s]) => s === slug);
  return entry?.[0] ?? slug;
}

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

export function stripHtmlText(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function truncPreviewHtml(html: string, maxLen: number): string {
  const plain = stripHtmlText(html);
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, maxLen).trim()}…`;
}

export type SnapshotPostagemEdicaoAcademy = {
  tipoPostagem: AcademyPostagemTipoUi;
  tipoSubcategoria: string;
  titulo: string;
  introducao: string;
  descricao: string;
  jogoMesa: string[];
  codigo: string;
  versao: string;
  exigeCiencia: string;
  imagemPath: string | null;
  anexoPath: string | null;
  anexoNome: string | null;
};

export function validarPublicarComunicado(fields: {
  tipoComunicado: string;
  titulo: string;
  descricao: string;
}): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!fields.tipoComunicado.trim()) errs.tipoComunicado = "Selecione o tipo de comunicado.";
  if (!fields.titulo.trim()) errs.titulo = "Informe o título.";
  if (!stripHtmlText(fields.descricao)) errs.descricao = "Informe a descrição.";
  return errs;
}

export function validarPublicarDica(fields: {
  tipoDica: string;
  titulo: string;
  descricao: string;
  jogoMesa: string[];
}): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!fields.tipoDica.trim()) errs.tipoDica = "Selecione o tipo de dica.";
  if (fields.tipoDica === "Jogos" && fields.jogoMesa.length === 0) errs.jogoMesa = "Selecione ao menos um jogo.";
  if (!fields.titulo.trim()) errs.titulo = "Informe o título.";
  if (!stripHtmlText(fields.descricao)) errs.descricao = "Informe a descrição.";
  return errs;
}

export function validarPublicarManual(fields: {
  tipoManual: string;
  titulo: string;
  introducao: string;
  descricao: string;
  jogoMesa: string[];
  exigeCiencia: string;
}): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!fields.tipoManual.trim()) errs.tipoManual = "Selecione o tipo de manual.";
  if (fields.tipoManual === "Jogos" && fields.jogoMesa.length === 0) errs.jogoMesa = "Selecione ao menos um jogo.";
  if (!fields.titulo.trim()) errs.titulo = "Informe o título.";
  if (!fields.introducao.trim()) errs.introducao = "Informe a introdução.";
  if (!stripHtmlText(fields.descricao)) errs.descricao = "Informe a descrição.";
  if (!fields.exigeCiencia.trim()) errs.exigeCiencia = "Informe se exige ciência.";
  return errs;
}

export async function registrarHistoricoStatus(
  supabase: SupabaseClient,
  contentType: AcademyPostagemContentType,
  contentId: string,
  statusDe: AcademyPostagemStatus | null,
  statusPara: AcademyPostagemStatus,
  userId: string,
): Promise<void> {
  const de = statusDe ?? "rascunho";
  if (de === statusPara) return;
  const alteracao = `Status alterado de «${ACADEMY_POSTAGEM_STATUS_LABEL[de]}» para «${ACADEMY_POSTAGEM_STATUS_LABEL[statusPara]}»`;
  await supabase.from("academy_portal_postagem_status_historico").insert({
    content_type: contentType,
    content_id: contentId,
    status_de: de,
    status_para: statusPara,
    alteracao,
    created_by: userId,
  });
}

export async function registrarHistoricoEdicoesRascunho(
  supabase: SupabaseClient,
  contentType: AcademyPostagemContentType,
  contentId: string,
  alteracoes: string[],
  userId: string,
): Promise<void> {
  if (alteracoes.length === 0) return;
  for (const alt of alteracoes) {
    await supabase.from("academy_portal_postagem_status_historico").insert({
      content_type: contentType,
      content_id: contentId,
      status_de: "rascunho",
      status_para: "rascunho",
      alteracao: alt,
      created_by: userId,
    });
  }
}

export function diffEdicaoRascunho(
  antes: SnapshotPostagemEdicaoAcademy,
  depois: SnapshotPostagemEdicaoAcademy,
): string[] {
  const alteracoes: string[] = [];
  if (antes.tipoPostagem !== depois.tipoPostagem) alteracoes.push("Tipo de postagem alterado");
  if (antes.tipoSubcategoria !== depois.tipoSubcategoria) alteracoes.push("Subcategoria alterada");
  if (antes.titulo.trim() !== depois.titulo.trim()) alteracoes.push("Título alterado");
  if (antes.introducao.trim() !== depois.introducao.trim()) alteracoes.push("Introdução alterada");
  if (stripHtmlText(antes.descricao) !== stripHtmlText(depois.descricao)) alteracoes.push("Descrição alterada");
  if (antes.jogoMesa.length !== depois.jogoMesa.length || antes.jogoMesa.some((j, i) => j !== depois.jogoMesa[i])) {
    alteracoes.push("Jogos alterados");
  }
  if (antes.codigo.trim() !== depois.codigo.trim()) alteracoes.push("Código alterado");
  if (antes.versao.trim() !== depois.versao.trim()) alteracoes.push("Versão alterada");
  if (antes.exigeCiencia !== depois.exigeCiencia) alteracoes.push("Exige ciência alterado");
  if (antes.imagemPath !== depois.imagemPath) alteracoes.push(depois.imagemPath ? "Imagem/vídeo alterado" : "Imagem/vídeo removido");
  if (antes.anexoPath !== depois.anexoPath || antes.anexoNome !== depois.anexoNome) {
    alteracoes.push(depois.anexoPath ? "Anexo alterado" : "Anexo removido");
  }
  return alteracoes;
}
