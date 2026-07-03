import type { SupabaseClient } from "@supabase/supabase-js";
import { encontrarVinculoParaFuncionarioRow, flattenVinculosDeGrupos, vinculoParaSelectValue } from "./rhOrganogramaTree";
import type { Role } from "../types";
import type { RhOrgOrganogramaGrupoPrestador, RhOrgPrestadorVinculoOpcao } from "../types/rhOrganograma";
import type { ValidacaoPublicar } from "./portalRhWorkflow";

export type RhDocumentoTipo = "politica_rh" | "procedimento" | "codigo" | "politica_ops";

export type RhDocumentoClassificacao = "uso_interno" | "uso_publico" | "confidencial";

/** Valor agregador canónico no campo aplicável a. */
export const PORTAL_RH_APLICAVEL_TODOS = "Todos os prestadores";

/**
 * Perfis que participam do fluxo de ciência no Portal RH — alinhado a Gestão de Usuários
 * (`FILTROS_PERFIL_LINHAS`: Perfis Gerenciais + Perfis Internos).
 */
export const PORTAL_RH_ROLES_CIENCIA: readonly Role[] = [
  "admin",
  "executivo",
  "gestor",
  "rh",
  "figurino",
  "comunicacao",
  "performance_coach",
  "service_manager",
  "shift_leader",
  "prestador",
];

export function perfilPortalRhParticipaCiencia(role: Role | undefined | null): boolean {
  if (!role) return false;
  return (PORTAL_RH_ROLES_CIENCIA as readonly string[]).includes(role);
}

export const RH_DOCUMENTO_TIPOS: { value: RhDocumentoTipo; label: string; prefixo: string }[] = [
  { value: "politica_rh", label: "Política RH", prefixo: "POL-RH-" },
  { value: "procedimento", label: "Procedimento", prefixo: "PROC-OPS-" },
  { value: "codigo", label: "Código", prefixo: "COD-" },
  { value: "politica_ops", label: "Política OPS", prefixo: "POL-OPS-" },
];

export const RH_DOCUMENTO_FILTRO_SUBTABS: { key: string; label: string; tipos: RhDocumentoTipo[] }[] = [
  { key: "politica_rh", label: "Políticas RH", tipos: ["politica_rh"] },
  { key: "procedimento", label: "Procedimentos", tipos: ["procedimento"] },
  { key: "codigo", label: "Códigos", tipos: ["codigo"] },
  { key: "operacoes", label: "Operações", tipos: ["politica_ops"] },
];

export const RH_DOCUMENTO_CLASSIFICACOES: { value: RhDocumentoClassificacao; label: string }[] = [
  { value: "uso_interno", label: "Uso Interno" },
  { value: "uso_publico", label: "Uso Público" },
  { value: "confidencial", label: "Confidencial" },
];

export type RhDocumentoNormativoCampos = {
  tipoDocumento: RhDocumentoTipo | "";
  codigo: string;
  versao: string;
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

export const FORM_POLITICA_NORMATIVA_VAZIO: RhDocumentoNormativoCampos = {
  tipoDocumento: "",
  codigo: "",
  versao: "1.0",
  titulo: "",
  areaResponsavel: "",
  classificacao: "",
  aplicavelA: [PORTAL_RH_APLICAVEL_TODOS],
  resumo: "",
  pdfPath: null,
  pdfNome: null,
  exigeCiencia: "",
  requerAprovacao: "",
  elaboradoPor: "",
  revisadoPor: "",
  aprovadoPorDoc: "",
  relacionadosIds: [],
};

export function prefixoCodigoDocumento(tipo: RhDocumentoTipo): string {
  return RH_DOCUMENTO_TIPOS.find((t) => t.value === tipo)?.prefixo ?? "";
}

/** Prefixo exibido entre parênteses no select (sem hífen final). */
export function prefixoCodigoRotulo(tipo: RhDocumentoTipo): string {
  return prefixoCodigoDocumento(tipo).replace(/-$/, "");
}

export function labelTipoDocumentoSelect(tipo: RhDocumentoTipo): string {
  const cfg = RH_DOCUMENTO_TIPOS.find((t) => t.value === tipo);
  if (!cfg) return tipo;
  return `${cfg.label} (${prefixoCodigoRotulo(tipo)})`;
}

export function extrairSufixoNumericoCodigo(codigo: string, prefixo: string): string {
  const upper = codigo.trim().toUpperCase();
  const p = prefixo.toUpperCase();
  if (p && upper.startsWith(p)) return upper.slice(p.length).replace(/\D/g, "");
  return upper.replace(/^.*?(\d+)$/, "$1").replace(/\D/g, "");
}

export function montarCodigoDocumento(prefixo: string, sufixoNumerico: string): string {
  const digits = sufixoNumerico.replace(/\D/g, "");
  const padded = digits.length > 0 ? digits.padStart(3, "0") : "000";
  return `${prefixo}${padded}`;
}

export function fmtDataEmissaoDocumentoPortal(date = new Date()): string {
  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return `${meses[date.getMonth()]}/${date.getFullYear()}`;
}

export function opcoesOrganogramaGerenciaTime(
  grupos: RhOrgOrganogramaGrupoPrestador[],
): { id: string; label: string }[] {
  return flattenVinculosDeGrupos(grupos)
    .filter((v) => v.nivel === "gerencia" || v.nivel === "time")
    .map((v) => ({ id: v.setorNome, label: v.label }));
}

export function areaResponsavelPadraoRh(grupos: RhOrgOrganogramaGrupoPrestador[]): string {
  const vinculos = flattenVinculosDeGrupos(grupos).filter((v) => v.nivel === "gerencia" || v.nivel === "time");
  const rh =
    vinculos.find((v) => /^rh$/i.test(v.setorNome.trim())) ??
    vinculos.find((v) => /recursos humanos/i.test(v.setorNome));
  return rh?.setorNome ?? "";
}

export function vinculoSelectValuePorSetorNome(
  grupos: RhOrgOrganogramaGrupoPrestador[],
  setorNome: string,
): string {
  if (!setorNome.trim()) return "";
  const v = flattenVinculosDeGrupos(grupos).find((x) => x.setorNome === setorNome);
  return v ? vinculoParaSelectValue(v) : "";
}

export function setorNomeDeVinculo(v: RhOrgPrestadorVinculoOpcao | null): string {
  return v?.setorNome ?? "";
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

export function labelClassificacaoDocumento(val: RhDocumentoClassificacao | "publico_interno" | null | undefined): string {
  if (!val) return "—";
  if (val === "publico_interno") return "Uso Público";
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
  if (!f.titulo.trim()) err.titulo = "Informe o título do documento.";
  if (!f.areaResponsavel.trim()) err.areaResponsavel = "Selecione a área responsável.";
  if (!f.classificacao) err.classificacao = "Selecione a classificação.";
  if (f.aplicavelA.length === 0) err.aplicavelA = "Selecione ao menos um público aplicável.";
  if (!f.resumo.trim()) err.resumo = "Informe o objetivo da política.";
  else if (f.resumo.length > 400) err.resumo = "Objetivo deve ter no máximo 400 caracteres.";
  if (!f.pdfPath?.trim() && !f.pdfNome) err.pdf = "Envie o documento PDF.";
  if (!f.exigeCiencia.trim()) err.exigeCiencia = "Informe se exige ciência do colaborador.";
  if (!f.requerAprovacao.trim()) err.requerAprovacao = "Informe se é necessária aprovação.";
  return err;
}

export function fmtAplicavelDocumento(aplicavel: string[] | null | undefined): string {
  if (!aplicavel?.length) return "—";
  if (aplicavel.includes(PORTAL_RH_APLICAVEL_TODOS)) return PORTAL_RH_APLICAVEL_TODOS;
  return aplicavel.join(", ");
}

function normalizarSetorAplicavel(nome: string): string {
  return nome.trim().toLowerCase();
}

/**
 * Nomes de gerência/time do usuário que podem coincidir com `aplicavel_a` do documento.
 * Prestador em time inclui também a gerência pai (documento aplicável à gerência vale para o time).
 */
export function setoresAplicavelDoUsuario(
  funcionario:
    | { org_time_id?: string | null; org_gerencia_id?: string | null; org_diretoria_id?: string | null }
    | null
    | undefined,
  vinculos: RhOrgPrestadorVinculoOpcao[],
): string[] {
  if (!funcionario) return [];
  const v = encontrarVinculoParaFuncionarioRow(funcionario, vinculos);
  if (!v) return [];
  const setores: string[] = [];
  if (v.setorNome.trim()) setores.push(v.setorNome);
  if (v.nivel === "time" && v.gerenciaNome.trim()) setores.push(v.gerenciaNome);
  return [...new Set(setores)];
}

/** Documento normativo atinge o organograma do usuário (ou «Todos os prestadores»). */
export function documentoAplicavelAoUsuario(
  aplicavel: string[] | null | undefined,
  setoresUsuario: readonly string[],
): boolean {
  if (!aplicavel?.length) return false;
  if (aplicavel.includes(PORTAL_RH_APLICAVEL_TODOS)) return true;
  if (setoresUsuario.length === 0) return false;
  const normUser = new Set(setoresUsuario.map(normalizarSetorAplicavel));
  return aplicavel.some((a) => normUser.has(normalizarSetorAplicavel(a)));
}

/** Ciência exigida só para perfis internos/gerenciais, quando o documento pede aceite e o público inclui o usuário. */
export function documentoExigeCienciaDoUsuario(
  doc: {
    requires_acknowledgment: boolean;
    aplicavel_a?: string[] | null;
    codigo?: string | null;
    tipo_documento?: RhDocumentoTipo | null;
  },
  setoresUsuario: readonly string[],
  role: Role | undefined | null,
): boolean {
  if (!perfilPortalRhParticipaCiencia(role)) return false;
  if (!doc.requires_acknowledgment) return false;
  if (!documentoUsaModeloNormativo(doc)) return true;
  if (!doc.aplicavel_a?.length) return true;
  return documentoAplicavelAoUsuario(doc.aplicavel_a, setoresUsuario);
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
