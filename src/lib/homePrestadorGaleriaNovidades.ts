/** Janela de novidade — Blogueiro Spin (fotos + Spin na Rede) na Home staff. */
export const HOME_BLOGUEIRO_SPIN_NOVIDADE_DIAS = 10;

export function getHomeBlogueiroSpinNovidadeDesdeIso(ref: Date = new Date()): string {
  const d = new Date(ref);
  d.setDate(d.getDate() - HOME_BLOGUEIRO_SPIN_NOVIDADE_DIAS);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** @deprecated Usar `HOME_BLOGUEIRO_SPIN_NOVIDADE_DIAS`. */
export const HOME_PRESTADOR_GALERIA_NOVIDADE_DIAS = HOME_BLOGUEIRO_SPIN_NOVIDADE_DIAS;

/** @deprecated Usar `getHomeBlogueiroSpinNovidadeDesdeIso`. */
export function getHomePrestadorGaleriaNovidadeDesdeIso(ref: Date = new Date()): string {
  return getHomeBlogueiroSpinNovidadeDesdeIso(ref);
}
