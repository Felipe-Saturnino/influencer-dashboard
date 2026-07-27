import type { Permissoes } from "../hooks/usePermission";
import type { RhFuncionarioSelfMedia, RhFuncionarioTipoContrato } from "../types/rhFuncionario";
import { podeEditarFuncionarioDadosCadastro } from "./rhDadosCadastroHelpers";

export const RH_PRESTADOR_SELF_MEDIA_BUCKET = "rh-prestador-self-media";

export const RH_PRESTADOR_DOC_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,application/pdf,image/png,image/jpeg,image/webp";

export type RhPrestadorDocumentoCategoria =
  | "rg"
  | "cpf"
  | "comprovante_residencia"
  | "cartao_cnpj"
  | "carteira_trabalho"
  | "comprovante_matricula_faculdade"
  | "comprovante_contas_bancarias"
  | "outros";

export const RH_PRESTADOR_DOCUMENTO_CATEGORIA_LABEL: Record<RhPrestadorDocumentoCategoria, string> = {
  rg: "RG",
  cpf: "CPF",
  comprovante_residencia: "Comprovante de Residência",
  cartao_cnpj: "Cartão CNPJ",
  carteira_trabalho: "Carteira de Trabalho",
  comprovante_matricula_faculdade: "Comprovante de Matrícula da Faculdade",
  comprovante_contas_bancarias: "Comprovante de Contas Bancárias",
  outros: "Outros",
};

/** Subtítulo (`SectionTitle sub`) dos blocos na aba Documentos — Dados de Cadastro. */
export const RH_PRESTADOR_DOCUMENTO_CATEGORIA_SUB: Partial<
  Record<RhPrestadorDocumentoCategoria, string>
> = {
  rg: "Pode ser a CNH ou outro documento que contenha o RG visível",
  cpf: "Pode ser a CNH ou outro documento que contenha o CPF visível",
  comprovante_residencia:
    "Contas ou outros documentos que apareçam o endereço registrado no bloco de Endereço residencial",
  cartao_cnpj:
    "Documento com CNPJ e endereço da empresa no contrato com a Spin, pode ser adquirido no site da Receita Federal",
  comprovante_contas_bancarias:
    "Comprovação do CNPJ titular da conta e dados da conta (Agência, Conta e Banco) da conta onde será realizado o pagamento",
  outros: "Outros documentos que acredite ser necessário ou forem solicitados pelo RH",
};

export const RH_PRESTADOR_DOCUMENTO_CATEGORIA_SUB_PADRAO =
  "Visualize ou substitua os arquivos desta categoria";

export function subtituloDocumentoPrestadorCategoria(
  categoria: RhPrestadorDocumentoCategoria,
): string {
  return (
    RH_PRESTADOR_DOCUMENTO_CATEGORIA_SUB[categoria] ?? RH_PRESTADOR_DOCUMENTO_CATEGORIA_SUB_PADRAO
  );
}

const BASE_CATEGORIAS: RhPrestadorDocumentoCategoria[] = [
  "rg",
  "cpf",
  "comprovante_residencia",
  "comprovante_contas_bancarias",
  "outros",
];

/** Categorias exibidas conforme tipo de contrato do prestador. */
export function categoriasDocumentoPorTipoContrato(
  tipo: RhFuncionarioTipoContrato | "" | null | undefined,
): RhPrestadorDocumentoCategoria[] {
  switch (tipo) {
    case "PJ":
      return [
        "rg",
        "cpf",
        "comprovante_residencia",
        "cartao_cnpj",
        "comprovante_contas_bancarias",
        "outros",
      ];
    case "CLT":
      return [
        "rg",
        "cpf",
        "comprovante_residencia",
        "carteira_trabalho",
        "comprovante_contas_bancarias",
        "outros",
      ];
    case "Temporario":
      return [...BASE_CATEGORIAS];
    case "Estagio":
      return [
        "rg",
        "cpf",
        "comprovante_residencia",
        "comprovante_matricula_faculdade",
        "comprovante_contas_bancarias",
        "outros",
      ];
    default:
      return [...BASE_CATEGORIAS];
  }
}

/** Categorias obrigatórias na revisão cadastral (todas exceto Outros). */
export function categoriasDocumentoObrigatorias(
  tipo: RhFuncionarioTipoContrato | "" | null | undefined,
): RhPrestadorDocumentoCategoria[] {
  return categoriasDocumentoPorTipoContrato(tipo).filter((c) => c !== "outros");
}

export function normalizarCategoriaDocumento(
  raw: string | null | undefined,
): RhPrestadorDocumentoCategoria {
  const v = (raw ?? "").trim() as RhPrestadorDocumentoCategoria;
  if (v && v in RH_PRESTADOR_DOCUMENTO_CATEGORIA_LABEL) return v;
  return "outros";
}

/** Upload/exclusão na aba Documentos do modal Editar (Gestão de Prestadores). */
export function podeEnviarDocumentosGestaoPrestador(
  perm: Pick<Permissoes, "canEditarOk" | "loading">,
  modalForm: "fechado" | "novo" | "editar" | "ver",
): boolean {
  return !perm.loading && modalForm === "editar" && perm.canEditarOk;
}

/** Upload/exclusão na aba Documentos (Dados de Cadastro) — mesma regra da edição cadastral. */
export function podeEnviarDocumentosDadosCadastro(
  perm: Pick<Permissoes, "canEditar" | "canEditarOk" | "loading">,
  meuPrestadorId: string | null,
  funcionarioId: string | null,
  opts?: { vistaApenasProprio?: boolean },
): boolean {
  if (perm.loading) return false;
  return podeEditarFuncionarioDadosCadastro(perm, meuPrestadorId, funcionarioId, opts);
}

export function inputIdDocumentoPrestador(
  escopo: "gestao" | "cadastro",
  funcionarioId: string,
  categoria: RhPrestadorDocumentoCategoria,
): string {
  return `${escopo}-doc-${funcionarioId}-${categoria}`;
}

export function agruparDocumentosPorCategoria(
  rows: RhFuncionarioSelfMedia[],
  categorias: RhPrestadorDocumentoCategoria[],
): Record<RhPrestadorDocumentoCategoria, RhFuncionarioSelfMedia[]> {
  const map = Object.fromEntries(
    categorias.map((c) => [c, [] as RhFuncionarioSelfMedia[]]),
  ) as Record<RhPrestadorDocumentoCategoria, RhFuncionarioSelfMedia[]>;

  for (const row of rows) {
    if (row.kind !== "documento") continue;
    const cat = normalizarCategoriaDocumento(row.document_category);
    if (map[cat]) map[cat].push(row);
    else if (map.outros) map.outros.push(row);
  }

  for (const cat of categorias) {
    // Mais antigo → mais recente: «Arquivo 1» permanece estável ao adicionar novos.
    map[cat].sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  return map;
}

/** Rótulo curto na lista (evita overflow sobre Visualizar/Download). Nome real no `title`. */
export function rotuloArquivoDocumentoPrestador(indiceNaCategoria: number): string {
  return `Arquivo ${indiceNaCategoria + 1}`;
}
