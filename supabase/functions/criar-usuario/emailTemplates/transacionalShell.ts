import { emailHeaderStyles, formatarData, hojeISO } from '../relatorioEmails/common.ts'
import { MARCA_PRODUTO } from './emailBrand.ts'

export const DEFAULT_LOGIN_URL = 'https://data-intelligence.spingaming.com.br'

/** Aba Conheça a Plataforma — alinhado a `buildAppPath('ajuda', 'ConhecaAPlataforma')`. */
export const AJUDA_CONHECA_PATH = '/Ajuda/ConhecaAPlataforma'

export function resolveAjudaConhecaUrl(loginUrl: string): string {
  const base = (loginUrl.trim() || DEFAULT_LOGIN_URL).replace(/\/$/, '')
  return `${base}${AJUDA_CONHECA_PATH}`
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function resolveLogoUrls(supabaseUrl: string): { logoDark: string; logoLight: string } {
  const base = supabaseUrl.replace(/\/$/, '')
  return {
    logoDark: `${base}/storage/v1/object/public/logos/Logo%20Spin%20Gaming%20White.png`,
    logoLight: `${base}/storage/v1/object/public/logos/Logo%20Spin%20Gaming.png`,
  }
}

function logoImg(url: string, className: string): string {
  return `<img src="${url}" alt="Spin Gaming" class="${className}" width="160" style="display:block;margin:0 auto 16px;max-width:160px;height:auto;" />`
}

export function emailTransacionalShell(params: {
  title: string
  /** Linha abaixo do h1 — ex.: data · Spin Gaming Data Intelligence */
  subtitle: string
  bodyHtml: string
  footerLabel: string
  logoDark: string
  logoLight: string
  pageTitle?: string
  /** Nome da marca no rodapé — default legado crons/transacionais antigos */
  footerBrand?: string
}): string {
  const pageTitle = escapeHtml(params.pageTitle ?? params.title)
  const h1 = escapeHtml(params.title)
  const subtitle = escapeHtml(params.subtitle)
  const footerLabel = escapeHtml(params.footerLabel)
  const footerBrand = escapeHtml(params.footerBrand ?? MARCA_PRODUTO)
  const enviadoEm = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${pageTitle}</title>
  <style>${emailHeaderStyles()}</style>
</head>
<body style="margin:0;padding:24px;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f0eef8;">

  <div style="max-width:740px;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(74,32,130,0.13);border:1px solid #e5e7eb;">

    <div class="email-header">
      ${logoImg(params.logoDark, 'header-logo-dark')}
      ${logoImg(params.logoLight, 'header-logo-light')}
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;">
        ${h1}
      </h1>
      <p class="subtitle" style="margin:0;font-size:13px;letter-spacing:0.02em;">
        ${subtitle}
      </p>
    </div>

    <div style="background:#ffffff;">
      ${params.bodyHtml}
    </div>

    <div style="background:#f9f7ff;padding:14px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
        ${footerBrand} · ${footerLabel} ·
        Enviado em ${enviadoEm}
      </p>
    </div>

  </div>
</body>
</html>`
}

/** @deprecated Preferir `subtituloEmailComData` de `emailBrand.ts` */
export function subtituloTransacionalData(): string {
  return `${formatarData(hojeISO())} · ${MARCA_PRODUTO}`
}
