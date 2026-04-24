/**
 * Lista de bancos para o campo Banco em RH (Gestão de Prestadores).
 * O `value` é o texto gravado em `rh_funcionarios.banco`.
 */
const RH_BANCOS_BRASIL_BASE: { value: string; label: string }[] = [
  { value: "Agibank", label: "Agibank" },
  { value: "Banco ABC Brasil", label: "Banco ABC Brasil" },
  { value: "Banco da Amazônia", label: "Banco da Amazônia" },
  { value: "Banco do Brasil", label: "Banco do Brasil" },
  { value: "Banco do Nordeste", label: "Banco do Nordeste" },
  { value: "Banco Inter", label: "Inter" },
  { value: "Banco BS2", label: "Banco BS2" },
  { value: "Banco Modal", label: "Banco Modal" },
  { value: "Banco Original", label: "Banco Original" },
  { value: "Banco Pan", label: "Banco Pan" },
  { value: "Banco Safra", label: "Banco Safra" },
  { value: "Banco Sofisa Direto", label: "Banco Sofisa Direto" },
  { value: "Banco Votorantim", label: "Banco Votorantim" },
  { value: "Banestes", label: "Banestes" },
  { value: "Banpará", label: "Banpará" },
  { value: "Banrisul", label: "Banrisul" },
  { value: "BMG", label: "BMG" },
  { value: "Bradesco", label: "Bradesco" },
  { value: "BTG Pactual", label: "BTG Pactual" },
  { value: "C6 Bank", label: "C6 Bank" },
  { value: "Caixa Econômica Federal", label: "Caixa Econômica Federal" },
  { value: "Contabilizei", label: "Contabilizei" },
  { value: "Citibank", label: "Citibank" },
  { value: "Itaú Unibanco", label: "Itaú Unibanco" },
  { value: "Mercado Pago", label: "Mercado Pago" },
  { value: "Neon", label: "Neon" },
  { value: "Nubank", label: "Nubank" },
  { value: "PagBank", label: "PagBank" },
  { value: "Santander", label: "Santander" },
  { value: "Sicoob", label: "Sicoob" },
  { value: "Sicredi", label: "Sicredi" },
  { value: "Stone", label: "Stone" },
  { value: "Will Bank", label: "Will Bank" },
];

export const RH_BANCOS_BRASIL: readonly { value: string; label: string }[] = [...RH_BANCOS_BRASIL_BASE].sort((a, b) =>
  a.label.localeCompare(b.label, "pt-BR"),
);

const RH_BANCO_VALUES = new Set(RH_BANCOS_BRASIL.map((x) => x.value));

/** Normaliza nomes comuns vindos de cadastros antigos ou planilhas para um `value` da lista. */
const RH_BANCO_ALIASES: Record<string, string> = {
  caixa: "Caixa Econômica Federal",
  cef: "Caixa Econômica Federal",
  inter: "Banco Inter",
  "banco inter": "Banco Inter",
  contabilizei: "Contabilizei",
  contailizei: "Contabilizei",
  bs2: "Banco BS2",
  "banco bs2": "Banco BS2",
  itau: "Itaú Unibanco",
  "itaú": "Itaú Unibanco",
  bb: "Banco do Brasil",
  bradesco: "Bradesco",
  santander: "Santander",
  nubank: "Nubank",
  nu: "Nubank",
  sicredi: "Sicredi",
  sicoob: "Sicoob",
  banrisul: "Banrisul",
  "banco pan": "Banco Pan",
  pan: "Banco Pan",
  bmg: "BMG",
  "mercado pago": "Mercado Pago",
  pagbank: "PagBank",
  "pag bank": "PagBank",
  neon: "Neon",
  c6: "C6 Bank",
  "c6 bank": "C6 Bank",
  btg: "BTG Pactual",
  "btg pactual": "BTG Pactual",
  stone: "Stone",
  "will bank": "Will Bank",
  agibank: "Agibank",
  banestes: "Banestes",
  banpara: "Banpará",
  "banpará": "Banpará",
  "banco da amazônia": "Banco da Amazônia",
  "banco do nordeste": "Banco do Nordeste",
  "banco original": "Banco Original",
  "banco safra": "Banco Safra",
  "banco votorantim": "Banco Votorantim",
  "banco modal": "Banco Modal",
  "banco sofisa": "Banco Sofisa Direto",
  "sofisa direto": "Banco Sofisa Direto",
  citibank: "Citibank",
  "abc brasil": "Banco ABC Brasil",
  "banco abc brasil": "Banco ABC Brasil",
};

/**
 * Valor do `<select>` de banco: string da lista, vazio ou `"__legacy__"` quando o texto salvo não corresponde à lista.
 */
export function rhBancoParaSelectValue(bancoDb: string): string | "__legacy__" | "" {
  const t = String(bancoDb ?? "").trim();
  if (!t || t === "—" || t === "-") return "";
  if (RH_BANCO_VALUES.has(t)) return t;
  const byLower = RH_BANCO_ALIASES[t.toLowerCase()];
  if (byLower && RH_BANCO_VALUES.has(byLower)) return byLower;
  return "__legacy__";
}
