/**
 * Centro de custos: apenas dígitos, hierárquico (3+3+3).
 * Diretoria "001"; gerência "001002" (diretoria + ordem na diretoria); time "001002003" (gerência + ordem na gerência).
 */

const L_DIR = 3;
const L_GER = 3;
const L_TIME = 3;
const MAX_ORD = 999;

function soDigitos(s: string): string {
  return s.replace(/\D/g, "");
}

function padOrdem(n: number): string {
  const v = Math.min(Math.max(1, Math.floor(n)), MAX_ORD);
  return String(v).padStart(L_DIR, "0");
}

/** Código da diretoria sempre com 3 dígitos (ex.: "007"). */
export function normalizarCentroDiretoria(centro: string): string {
  const d = soDigitos(centro);
  if (d.length === 0) return "".padStart(L_DIR, "0");
  return d.padStart(L_DIR, "0").slice(-L_DIR);
}

/** Próximo código para nova diretoria (ex.: "004"). */
export function proximoCentroCustosDiretoria(diretorias: { centro_custos: string }[]): string {
  let max = 0;
  for (const row of diretorias) {
    const s = row.centro_custos.trim();
    if (!/^\d+$/.test(s) || s.length !== L_DIR) continue;
    const v = parseInt(s, 10);
    if (Number.isFinite(v)) max = Math.max(max, v);
  }
  return padOrdem(max + 1);
}

/** Próximo código para nova gerência na diretoria indicada (ex.: "005002"). */
export function proximoCentroCustosGerencia(
  codigoDiretoria: string,
  gerenciasDaDiretoria: { centro_custos: string }[],
): string {
  const prefix = normalizarCentroDiretoria(codigoDiretoria);
  let maxSuf = 0;
  for (const g of gerenciasDaDiretoria) {
    const s = g.centro_custos.trim();
    if (!/^\d+$/.test(s) || s.length !== L_DIR + L_GER) continue;
    if (!s.startsWith(prefix)) continue;
    const suf = parseInt(s.slice(L_DIR), 10);
    if (Number.isFinite(suf)) maxSuf = Math.max(maxSuf, suf);
  }
  return prefix + padOrdem(maxSuf + 1);
}

/** Próximo código para novo time na gerência indicada (ex.: "005002001"). */
export function proximoCentroCustosTime(
  codigoGerencia: string,
  timesDaGerencia: { centro_custos: string }[],
): string {
  const prefixRaw = soDigitos(codigoGerencia);
  const prefix = prefixRaw.padStart(L_DIR + L_GER, "0").slice(-(L_DIR + L_GER));
  let maxSuf = 0;
  for (const ti of timesDaGerencia) {
    const s = ti.centro_custos.trim();
    if (!/^\d+$/.test(s) || s.length !== L_DIR + L_GER + L_TIME) continue;
    if (!s.startsWith(prefix)) continue;
    const suf = parseInt(s.slice(L_DIR + L_GER), 10);
    if (Number.isFinite(suf)) maxSuf = Math.max(maxSuf, suf);
  }
  return prefix + padOrdem(maxSuf + 1);
}
