import type { SupabaseClient } from "@supabase/supabase-js";
import type { ValidacaoPublicar } from "./portalRhWorkflow";

export type RhDocumentoTipo = "politica_rh" | "procedimento" | "codigo" | "politica_ops";

export type RhDocumentoClassificacao = "uso_interno" | "publico_interno";

export const RH_DOCUMENTO_TIPOS: { value: RhDocumentoTipo; label: string; prefixo: string }[] = [
  { value: "politica_rh", label: "Política RH (POL-RH-…)", prefixo: "POL-RH-" },
  { value: "procedimento", label: "Procedimento (PROC-OPS-…)", prefixo: "PROC-OPS-" },
  { value: "codigo", label: "Código (COD-…)", prefixo: "COD-" },
  { value: "politica_ops", label: "Política OPS (POL-OPS-…)", prefixo: "POL-OPS-" },
];

export const RH_DOCUMENTO_FILTRO_SUBTABS: { key: string; label: string; tipos: RhDocumentoTipo[] }[] = [
  { key: "politica_rh", label: "Políticas RH", tipos: ["politica_rh"] },
  { key: "procedimento", label: "Procedimentos", tipos: ["procedimento"] },
  { key: "codigo", label: "Códigos", tipos: ["codigo"] },
  { key: "operacoes", label: "Operações", tipos: ["politica_ops"] },
];

export const RH_DOCUMENTO_AREAS = [
  "Recursos Humanos",
  "Operações",
  "Figurino",
  "RH e Gestão de Operações",
  "Diretoria",
] as const;

export const RH_DOCUMENTO_CLASSIFICACOES: { value: RhDocumentoClassificacao; label: string }[] = [
  { value: "uso_interno", label: "Uso Interno" },
  { value: "publico_interno", label: "Público Interno" },
];

export const RH_DOCUMENTO_APLICAVEL_OPCOES = [
  "Todos os prestadores",
  "Game Presenters",
  "Shufflers",
  "Shift Leaders",
  "Lideranças operacionais",
  "Customer Service",
] as const;

export type RhDocumentoNormativoCampos = {
  tipoDocumento: RhDocumentoTipo | "";
  codigo: string;
  versao: string;
  dataEmissao: string;
  titulo: string;
  areaResponsavel: string;
  classificacao: RhDocumentoClassificacao | "";
  aplicavelA: string[];
  resumo: string;
  pdfPath: string | null;
  pdfNome: string | null;
  exigeCiencia: string;
  requerAprovacao: string;
  elaboradoPor: string;
  revisadoPor: string;
  aprovadoPorDoc: string;
  relacionadosIds: string[];
};

export function prefixoCodigoDocumento(tipo: RhDocumentoTipo): string {
  return RH_DOCUMENTO_TIPOS.find((t) => t.value === tipo)?.prefixo ?? "";
}

export function labelTipoDocumentoPortal(tipo: RhDocumentoTipo | null | undefined): string {
  if (!tipo) return "—";
  return RH_DOCUMENTO_TIPOS.find((t) => t.value === tipo)?.label.replace(/\s*\(.*\)$/, "") ?? tipo;
}

export function tagTipoDocumentoCor(tipo: RhDocumentoTipo | null | undefined): string {
  switch (tipo) {
    case "politica_rh":
      return "#6366f1";
    case "procedimento":
      return "#1e36f8";
    case "codigo":
      return "#7c3aed";
    case "politica_ops":
      return "#f59e0b";
    default:
      return "#6b7280";
  }
}

export function labelClassificacaoDocumento(val: RhDocumentoClassificacao | null | undefined): string {
  if (!val) return "—";
  return RH_DOCUMENTO_CLASSIFICACOES.find((c) => c.value === val)?.label ?? val;
}

export function documentoUsaModeloNormativo(row: {
  codigo?: string | null;
  tipo_documento?: RhDocumentoTipo | null;
}): boolean {
  return Boolean(row.codigo?.trim() || row.tipo_documento);
}

export function proximoCodigoSugerido(tipo: RhDocumentoTipo, codigosExistentes: string[]): string {
  const prefixo = prefixoCodigoDocumento(tipo);
  const nums = codigosExistentes
    .map((c) => c.trim().toUpperCase())
    .filter((c) => c.startsWith(prefixo.toUpperCase()))
    .map((c) => {
      const tail = c.slice(prefixo.length);
      const n = parseInt(tail.replace(/^0+/, "") || "0", 10);
      return Number.isFinite(n) ? n : 0;
    });
  const next = (nums.length ? Math.max(...nums) : -1) + 1;
  return `${prefixo}${String(next).padStart(3, "0")}`;
}

export function itemNoFiltroDocumento(
  doc: { tipo_documento?: RhDocumentoTipo | null },
  filtroKey: string,
): boolean {
  if (filtroKey === "todos") return true;
  const cfg = RH_DOCUMENTO_FILTRO_SUBTABS.find((x) => x.key === filtroKey);
  if (!cfg) return true;
  if (!doc.tipo_documento) return false;
  return cfg.tipos.includes(doc.tipo_documento);
}

export function validarPublicarDocumentoNormativo(f: RhDocumentoNormativoCampos): ValidacaoPublicar {
  const err: ValidacaoPublicar = {};
  if (!f.tipoDocumento) err.tipoDocumento = "Selecione o tipo de documento.";
  if (!f.codigo.trim()) err.codigo = "Informe o código do documento.";
  if (!f.versao.trim()) err.versao = "Informe a versão.";
  if (!f.dataEmissao.trim()) err.dataEmissao = "Informe a data de emissão.";
  if (!f.titulo.trim()) err.titulo = "Informe o título oficial.";
  if (!f.areaResponsavel.trim()) err.areaResponsavel = "Selecione a área responsável.";
  if (!f.classificacao) err.classificacao = "Selecione a classificação.";
  if (f.aplicavelA.length === 0) err.aplicavelA = "Selecione ao menos um público aplicável.";
  if (!f.resumo.trim()) err.resumo = "Informe o resumo para listagem.";
  else if (f.resumo.length > 400) err.resumo = "Resumo deve ter no máximo 400 caracteres.";
  if (!f.pdfPath?.trim() && !f.pdfNome) err.pdf = "Envie o PDF oficial do documento.";
  if (!f.exigeCiencia.trim()) err.exigeCiencia = "Informe se exige ciência do colaborador.";
  if (!f.requerAprovacao.trim()) err.requerAprovacao = "Informe se é necessária aprovação.";
  return err;
}

export function fmtAplicavelDocumento(aplicavel: string[] | null | undefined): string {
  if (!aplicavel?.length) return "—";
  if (aplicavel.includes("Todos os prestadores")) return "Todos os prestadores";
  return aplicavel.join(", ");
}

export async function sincronizarRelacionadosDocumentoPortal(
  supabase: SupabaseClient,
  documentoId: string,
  relacionadosIds: string[],
): Promise<string | null> {
  const { error: delErr } = await supabase.from("rh_portal_documento_relacao").delete().eq("documento_id", documentoId);
  if (delErr) return delErr.message;
  const ids = relacionadosIds.filter((id) => id && id !== documentoId);
  if (ids.length === 0) return null;
  const { error } = await supabase.from("rh_portal_documento_relacao").insert(
    ids.map((relacionado_id) => ({ documento_id: documentoId, relacionado_id })),
  );
  return error?.message ?? null;
}

export async function carregarRelacionadosDocumentoPortal(
  supabase: SupabaseClient,
  documentoId: string,
): Promise<{ id: string; codigo: string | null; titulo: string; versao: string | null }[]> {
  const { data: links, error: linkErr } = await supabase
    .from("rh_portal_documento_relacao")
    .select("relacionado_id")
    .eq("documento_id", documentoId);
  if (linkErr || !links?.length) return [];
  const ids = links.map((l) => (l as { relacionado_id: string }).relacionado_id);
  const { data: docs, error: docErr } = await supabase
    .from("rh_portal_documento")
    .select("id, codigo, titulo, versao")
    .in("id", ids);
  if (docErr || !docs) return [];
  return docs as { id: string; codigo: string | null; titulo: string; versao: string | null }[];
}
