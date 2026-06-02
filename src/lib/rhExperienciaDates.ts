import { RH_EXPERIENCIA_PERIODO_ATUAL } from "./rhExperienciaProfissionalConstants";

const MESES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"] as const;

/** Converte valor de `<input type="month">` (YYYY-MM) ou ISO date para date SQL (YYYY-MM-01). */
export function mesAnoInputParaDateSql(value: string): string | null {
  const t = value.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}$/.test(t)) return `${t}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t.slice(0, 8) + "01";
  return null;
}

/** Converte date SQL para valor de `<input type="month">`. */
export function dateSqlParaMesAnoInput(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  return String(isoDate).slice(0, 7);
}

export function formatarMesAnoPtBr(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const s = String(isoDate).slice(0, 10);
  const parts = s.split("-");
  if (parts.length < 2) return s;
  const mes = Number(parts[1]);
  const ano = parts[0];
  if (mes < 1 || mes > 12) return s;
  return `${MESES_CURTO[mes - 1]}/${ano}`;
}

export function formatarPeriodoExperiencia(inicio: string, fim: string | null | undefined): string {
  const ini = formatarMesAnoPtBr(inicio);
  if (!fim) return `${ini} — ${RH_EXPERIENCIA_PERIODO_ATUAL}`;
  return `${ini} — ${formatarMesAnoPtBr(fim)}`;
}

export function validarPeriodoExperiencia(inicioSql: string, fimSql: string | null): boolean {
  if (!fimSql) return true;
  return fimSql >= inicioSql;
}
