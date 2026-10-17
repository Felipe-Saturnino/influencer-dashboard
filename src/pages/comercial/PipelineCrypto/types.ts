import type { PipelineMarcaRow } from "../PipelineB2B/types";
import type { StatusProduto } from "../PipelineB2B/constants";

export type PossuiCrypto = "sim" | "nao";
export type OrigemCrypto = "spa" | "manual";

/** Marca do Pipeline Crypto. `produtos` carrega só o Retorno em `mesa_network` para reusar o funil do B2B. */
export interface CryptoMarcaRow extends PipelineMarcaRow {
  possui_crypto: PossuiCrypto | null;
  retorno: StatusProduto | null;
  origem: OrigemCrypto;
}

export type CryptoTableCol =
  | "razao"
  | "marca"
  | "contato"
  | "comercial"
  | "status"
  | "possui_crypto"
  | "retorno"
  | "ultima_comunicacao"
  | "acao";
