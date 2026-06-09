/** Nome canônico do produto em e-mails — sempre nesta ordem. */
export const MARCA_PRODUTO = 'Spin Gaming Data Intelligence'

/** Subtítulo do header: `{data} · Spin Gaming Data Intelligence` */
export function subtituloEmailComData(dataFormatada: string): string {
  return `${dataFormatada} · ${MARCA_PRODUTO}`
}
