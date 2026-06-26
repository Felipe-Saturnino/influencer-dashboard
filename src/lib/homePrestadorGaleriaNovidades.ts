/** Janela de novidade de fotos na Home Prestador (sem estado “lido” no backend). */
export const HOME_PRESTADOR_GALERIA_NOVIDADE_DIAS = 7;

export function getHomePrestadorGaleriaNovidadeDesdeIso(ref: Date = new Date()): string {
  const d = new Date(ref);
  d.setDate(d.getDate() - HOME_PRESTADOR_GALERIA_NOVIDADE_DIAS);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
