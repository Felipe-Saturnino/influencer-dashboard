import type { StatusProduto } from "../PipelineB2B/constants";
import { PIPELINE_COMERCIAL_NOMES } from "../PipelineB2B/constants";
import { mapContatoFromDb, normalizeRetificacoes } from "../PipelineB2B/helpers";
import type { CryptoMarcaRow, PossuiCrypto } from "./types";

/** CNPJ vazio não agrupa com outro CNPJ vazio. Prefixo só para a chave de merge. */
export const CNPJ_SOLO_PREFIX = "__solo:";

export function cnpjEhSolo(cnpj: string): boolean {
  return cnpj.startsWith(CNPJ_SOLO_PREFIX);
}

function possuiFromDb(raw: unknown): PossuiCrypto | null {
  return raw === "sim" || raw === "nao" ? raw : null;
}

function retornoFromDb(raw: unknown): StatusProduto | null {
  const v = String(raw ?? "");
  const ok: StatusProduto[] = [
    "sem_proposta",
    "em_negociacao",
    "sem_interesse",
    "desinteresse_comercial",
    "contrato_enviado",
    "contrato_assinado",
    "ativo",
  ];
  return ok.includes(v as StatusProduto) ? (v as StatusProduto) : null;
}

export const CRYPTO_MARCA_SELECT = `
  id, empresa_id, razao_social, cnpj, nome, dominio, status_dominio, status_pipeline, status_folha,
  comercial_user_id, possui_crypto, retorno, ultima_comunicacao, origem, created_at,
  empresa:comercial_empresas(id, razao_social, cnpj, portaria, portaria_retificacoes, requerimento_numero, requerimento_ano, cidade, estado),
  contatos:comercial_crypto_contatos(id, marca_id, nome, telefones, emails, linkedin, instagram, data_nascimento, ordem)
`;

export function mapCryptoMarcaFromDb(
  raw: Record<string, unknown>,
  comercialNames: Record<string, string> = {},
): CryptoMarcaRow {
  const id = String(raw.id);
  const empresaRaw = (raw.empresa as Record<string, unknown> | null) ?? null;
  const contatosRaw = (raw.contatos as Record<string, unknown>[] | null) ?? [];
  const comercialId = raw.comercial_user_id ? String(raw.comercial_user_id) : null;
  const rawComercialNome = comercialId ? (comercialNames[comercialId] ?? null) : null;
  const comercialNomeCanonico =
    rawComercialNome && (PIPELINE_COMERCIAL_NOMES as readonly string[]).includes(rawComercialNome)
      ? rawComercialNome
      : null;
  const retorno = retornoFromDb(raw.retorno);
  const cnpjReal = String(empresaRaw?.cnpj ?? raw.cnpj ?? "").trim();
  const razaoReal = String(empresaRaw?.razao_social ?? raw.razao_social ?? "").trim();
  const ultima = raw.ultima_comunicacao ? String(raw.ultima_comunicacao) : null;

  return {
    id,
    nome: String(raw.nome ?? ""),
    dominio: raw.dominio ? String(raw.dominio) : null,
    status_dominio: raw.status_dominio === "ok" ? "ok" : "inativo",
    status_pipeline: raw.status_pipeline as CryptoMarcaRow["status_pipeline"],
    status_folha: raw.status_folha as CryptoMarcaRow["status_folha"],
    comercial_user_id: comercialId,
    comercial_nome: comercialNomeCanonico,
    agregadora: null,
    ultimo_contato: ultima,
    ultima_comunicacao: ultima,
    possui_crypto: possuiFromDb(raw.possui_crypto),
    retorno,
    origem: raw.origem === "spa" ? "spa" : "manual",
    empresa: {
      id: empresaRaw?.id ? String(empresaRaw.id) : `manual:${id}`,
      razao_social: razaoReal || "—",
      cnpj: cnpjReal || `${CNPJ_SOLO_PREFIX}${id}`,
      portaria: empresaRaw?.portaria ? String(empresaRaw.portaria) : null,
      portaria_retificacoes: normalizeRetificacoes(empresaRaw?.portaria_retificacoes),
      requerimento_numero: empresaRaw?.requerimento_numero
        ? String(empresaRaw.requerimento_numero)
        : null,
      requerimento_ano: empresaRaw?.requerimento_ano ? String(empresaRaw.requerimento_ano) : null,
      cidade: empresaRaw?.cidade ? String(empresaRaw.cidade) : null,
      estado: empresaRaw?.estado ? String(empresaRaw.estado) : null,
    },
    contatos: contatosRaw.map(mapContatoFromDb),
    produtos: retorno ? [{ produto: "mesa_network", status_produto: retorno }] : [],
  };
}

export function formatCnpj(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 14) return null;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function normalizarDominio(raw: string): string | null {
  const v = raw.replace(/\s+/g, " ").trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(v)) return `https://${v}`;
  return null;
}
