/** Janela de novidade — Informações + Blogueiro Spin na Home staff. */
export const HOME_STAFF_FEED_NOVIDADE_DIAS = 10;

export function getHomeStaffFeedNovidadeDesdeIso(ref: Date = new Date()): string {
  const d = new Date(ref);
  d.setDate(d.getDate() - HOME_STAFF_FEED_NOVIDADE_DIAS);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** @deprecated Usar `HOME_STAFF_FEED_NOVIDADE_DIAS`. */
export const HOME_BLOGUEIRO_SPIN_NOVIDADE_DIAS = HOME_STAFF_FEED_NOVIDADE_DIAS;

/** @deprecated Usar `getHomeStaffFeedNovidadeDesdeIso`. */
export function getHomeBlogueiroSpinNovidadeDesdeIso(ref: Date = new Date()): string {
  return getHomeStaffFeedNovidadeDesdeIso(ref);
}

/** @deprecated Usar `HOME_STAFF_FEED_NOVIDADE_DIAS`. */
export const HOME_PRESTADOR_GALERIA_NOVIDADE_DIAS = HOME_STAFF_FEED_NOVIDADE_DIAS;

/** @deprecated Usar `getHomeStaffFeedNovidadeDesdeIso`. */
export function getHomePrestadorGaleriaNovidadeDesdeIso(ref: Date = new Date()): string {
  return getHomeStaffFeedNovidadeDesdeIso(ref);
}
