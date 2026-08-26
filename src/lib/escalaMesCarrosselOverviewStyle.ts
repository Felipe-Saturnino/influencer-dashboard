/** Nomes completos dos meses (pt-BR), alinhado ao Overview Spin. */
export const ESCALA_CARROSSEL_MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

/** Primeiro mês listado no carrossel Escala / Marketplace / Solicitações / Overview Prestador. */
export const ESCALA_CARROSSEL_MIN_ANO = 2026;
/** Julho (0-based) — inclui piloto de KPIs de mesa; início oficial da escala continua agosto. */
export const ESCALA_CARROSSEL_MIN_MES = 6;

export type MesCarrosselEscalaEntry = { ano: number; mes: number; label: string };

/**
 * Meses de julho/2026 até o mês civil corrente (inclusivo).
 * Antes de julho/2026, devolve só o mês mínimo para permitir pré-visualizar a grade.
 */
export function getMesesDisponiveisEscalaCarrossel(hoje = new Date()): MesCarrosselEscalaEntry[] {
  const lista: MesCarrosselEscalaEntry[] = [];
  let ano = ESCALA_CARROSSEL_MIN_ANO;
  let mes = ESCALA_CARROSSEL_MIN_MES;
  const fimAno = hoje.getFullYear();
  const fimMes = hoje.getMonth();

  if (fimAno < ESCALA_CARROSSEL_MIN_ANO || (fimAno === ESCALA_CARROSSEL_MIN_ANO && fimMes < ESCALA_CARROSSEL_MIN_MES)) {
    return [
      {
        ano: ESCALA_CARROSSEL_MIN_ANO,
        mes: ESCALA_CARROSSEL_MIN_MES,
        label: `${ESCALA_CARROSSEL_MESES_PT[ESCALA_CARROSSEL_MIN_MES]} ${ESCALA_CARROSSEL_MIN_ANO}`,
      },
    ];
  }

  while (ano < fimAno || (ano === fimAno && mes <= fimMes)) {
    lista.push({ ano, mes, label: `${ESCALA_CARROSSEL_MESES_PT[mes]} ${ano}` });
    mes++;
    if (mes > 11) {
      mes = 0;
      ano++;
    }
  }
  return lista;
}

/**
 * Meses de julho/2026 até o mês civil corrente + mês seguinte (inclusivo).
 * Alinhado a `dataMaximaEscalaCarrossel` na Gestão de Escala — permite ofertar dias
 * da escala já aprovada no mês seguinte enquanto ainda estamos no mês corrente.
 */
export function getMesesDisponiveisEscalaCarrosselComMesSeguinte(hoje = new Date()): MesCarrosselEscalaEntry[] {
  const base = getMesesDisponiveisEscalaCarrossel(hoje);
  const last = base[base.length - 1];
  if (!last) return base;

  let nextMes = last.mes + 1;
  let nextAno = last.ano;
  if (nextMes > 11) {
    nextMes = 0;
    nextAno += 1;
  }

  if (base.some((m) => m.ano === nextAno && m.mes === nextMes)) return base;

  return [...base, { ano: nextAno, mes: nextMes, label: `${ESCALA_CARROSSEL_MESES_PT[nextMes]} ${nextAno}` }];
}

/** Índice do mês atual na lista (ou último se o mês atual não existir na janela). */
export function idxMesInicialEscalaCarrossel(meses: MesCarrosselEscalaEntry[], hoje = new Date()): number {
  const idx = meses.findIndex((m) => m.ano === hoje.getFullYear() && m.mes === hoje.getMonth());
  return idx >= 0 ? idx : Math.max(0, meses.length - 1);
}
