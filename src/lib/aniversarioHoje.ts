/** Primeira palavra do nome completo (cadastro RH ou perfil). */
export function extrairPrimeiroNome(nome: string): string {
  const trimmed = nome.trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0];
}

/**
 * Dia e mês civil local igual a hoje (ignora ano).
 * `dataIso` em YYYY-MM-DD (`data_nascimento`, `data_inicio`, etc.).
 */
export function isMesDiaHoje(dataIso: string | null | undefined, ref = new Date()): boolean {
  if (!dataIso?.trim()) return false;
  const iso = dataIso.trim().slice(0, 10);
  const parts = iso.split("-");
  if (parts.length !== 3) return false;
  const mes = Number(parts[1]);
  const dia = Number(parts[2]);
  if (!Number.isFinite(mes) || !Number.isFinite(dia) || mes < 1 || mes > 12 || dia < 1 || dia > 31) {
    return false;
  }
  return ref.getMonth() + 1 === mes && ref.getDate() === dia;
}

/**
 * Aniversário pessoal — `rh_funcionarios.data_nascimento`.
 */
export function isAniversarioHoje(dataNascimento: string | null | undefined, ref = new Date()): boolean {
  return isMesDiaHoje(dataNascimento, ref);
}

/**
 * Aniversário de empresa (Spin) — `rh_funcionarios.data_inicio`.
 */
export function isAniversarioEmpresaHoje(dataInicio: string | null | undefined, ref = new Date()): boolean {
  return isMesDiaHoje(dataInicio, ref);
}
