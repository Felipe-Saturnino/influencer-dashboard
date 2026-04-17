import { formatarCepDigitos, somenteDigitos } from "./rhFuncionarioValidators";

export type EnderecoPartes = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  cidade: string;
  estado: string;
};

/** Texto único para colunas legadas `endereco_*` / relatórios. */
export function montarEnderecoResumoLine(parts: EnderecoPartes): string {
  const cep = somenteDigitos(parts.cep);
  const cepFmt = cep.length === 8 ? formatarCepDigitos(cep) : parts.cep.trim();
  const rua = [
    parts.logradouro.trim(),
    parts.numero.trim() ? `nº ${parts.numero.trim()}` : "",
    parts.complemento.trim(),
  ]
    .filter(Boolean)
    .join(", ");
  const tail = [parts.cidade.trim(), parts.estado.trim().toUpperCase()].filter(Boolean).join(" — ");
  const head = cepFmt ? `CEP ${cepFmt}` : "";
  const out = [head, rua, tail].filter(Boolean).join(" — ");
  return out || "—";
}

export function montarContatoEmergenciaLinha(nome: string, parentesco: string, telefone: string): string {
  const p = [nome.trim(), parentesco.trim(), somenteDigitos(telefone)].filter(Boolean).join(" | ");
  return p || "—";
}
