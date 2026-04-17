import { somenteDigitos } from "./rhFuncionarioValidators";

/** Resposta JSON do ViaCEP (https://viacep.com.br/). */
export type ViaCepJson = {
  erro?: string | boolean;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

/**
 * Consulta CEP no ViaCEP (API pública, sem chave).
 * Uso no front: ao completar 8 dígitos, pré-preenche logradouro/cidade/UF; o usuário pode editar.
 */
export async function buscarEnderecoPorCep(cepRaw: string): Promise<
  | { ok: true; logradouro: string; complemento: string; cidade: string; uf: string }
  | { ok: false; message: string }
> {
  const cep = somenteDigitos(cepRaw);
  if (cep.length !== 8) return { ok: false, message: "CEP deve ter 8 dígitos." };
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { method: "GET" });
    if (!res.ok) return { ok: false, message: "Não foi possível consultar o CEP." };
    const data = (await res.json()) as ViaCepJson;
    if (data.erro === true || data.erro === "true") return { ok: false, message: "CEP não encontrado." };
    const logradouro = (data.logradouro ?? "").trim();
    const complVia = (data.complemento ?? "").trim();
    const bairro = (data.bairro ?? "").trim();
    const complemento = [complVia, bairro].filter(Boolean).join(" — ");
    const cidade = (data.localidade ?? "").trim();
    const uf = (data.uf ?? "").trim().toUpperCase();
    if (!logradouro && !cidade) return { ok: false, message: "CEP sem endereço cadastrado na base dos Correios." };
    return { ok: true, logradouro, complemento, cidade, uf };
  } catch {
    return { ok: false, message: "Falha de rede ao consultar o CEP." };
  }
}
