/** Remove não-dígitos. */
export function somenteDigitos(s: string): string {
  return s.replace(/\D/g, "");
}

export function validarEmail(email: string): boolean {
  const t = email.trim();
  if (t.length < 5) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

/** CPF com 11 dígitos; valida dígitos verificadores. */
export function validarCpfDigitos(cpf: string): boolean {
  const d = somenteDigitos(cpf);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(d[i]!, 10) * (10 - i);
  let r = (s * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(d[9]!, 10)) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(d[i]!, 10) * (11 - i);
  r = (s * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(d[10]!, 10);
}

/** CNPJ com 14 dígitos; valida dígitos verificadores. */
export function validarCnpjDigitos(cnpj: string): boolean {
  const d = somenteDigitos(cnpj);
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let s = 0;
  for (let i = 0; i < 12; i++) s += parseInt(d[i]!, 10) * pesos1[i]!;
  let r = s % 11;
  const dv1 = r < 2 ? 0 : 11 - r;
  if (dv1 !== parseInt(d[12]!, 10)) return false;
  s = 0;
  for (let i = 0; i < 13; i++) s += parseInt(d[i]!, 10) * pesos2[i]!;
  r = s % 11;
  const dv2 = r < 2 ? 0 : 11 - r;
  return dv2 === parseInt(d[13]!, 10);
}

export function formatarCpfDigitos(d11: string): string {
  const d = somenteDigitos(d11).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatarCnpjDigitos(d14: string): string {
  const d = somenteDigitos(d14).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function formatarRgInput(raw: string): string {
  const d = somenteDigitos(raw).slice(0, 9);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}-${d.slice(8)}`;
}

export function formatarTelefoneBr(raw: string): string {
  const d = somenteDigitos(raw).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function formatarAgencia(raw: string): string {
  const d = somenteDigitos(raw).slice(0, 5);
  if (d.length <= 4) return d;
  return `${d.slice(0, 4)}-${d.slice(4)}`;
}

/** Exibe valor em centavos como R$ 0,00 enquanto digita (somente dígitos agregados). */
export function formatarMoedaDigitos(centsStr: string): string {
  const d = somenteDigitos(centsStr);
  if (!d) return "";
  const v = (parseInt(d, 10) / 100).toFixed(2);
  const [intp, frac] = v.split(".");
  const intn = intp!.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${intn},${frac}`;
}

export function centavosDeStringMoeda(s: string): string {
  return somenteDigitos(s);
}

export function numeroDeCentavosStr(centsStr: string): number {
  const d = somenteDigitos(centsStr);
  if (!d) return 0;
  const n = parseInt(d, 10) / 100;
  return Math.round(n * 100) / 100;
}

/** CEP brasileiro: até 8 dígitos com máscara 00000-000. */
export function formatarCepDigitos(s: string): string {
  const d = somenteDigitos(s).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}
