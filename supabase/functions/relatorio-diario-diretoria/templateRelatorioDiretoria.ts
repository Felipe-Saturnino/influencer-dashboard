import type { RelatorioDiretoriaData } from './fetchRelatorioDiretoriaData.ts'
import { MARCA_PRODUTO, subtituloEmailComData } from './emailBrand.ts'
import {
  TD,
  TD_C,
  TD_R,
  TH,
  corGGR,
  emailHeaderStyles,
  fmtHorasTotal,
  fmtMoeda,
  fmtNum,
  fmtPct,
  formatarData,
  mesExtenso,
  secao,
  subtitulo,
  tituloSecao,
  tituloSubSecao,
  trStyle,
} from './common.ts'

function tabelaOperadoras(rows: RelatorioDiretoriaData['operadorasMtd']): string {
  if (rows.length === 0) {
    return `<p style="margin:0;font-size:13px;color:#9ca3af;font-style:italic;">Sem dados para o período selecionado.</p>`
  }
  const linhas = rows.map((r, i) => {
    const bg = r.isTotal ? 'background:#f0eef8;' : trStyle(r.isTotal ? 0 : i - 1)
    return `
      <tr style="${bg}">
        <td style="${TD}${r.isTotal ? 'font-weight:800;' : 'font-weight:600;'}">${r.nome}</td>
        <td style="${TD_R}font-weight:700;color:${corGGR(r.ggr)};">${fmtMoeda(r.ggr)}</td>
        <td style="${TD_R}${r.isTotal ? 'font-weight:600;' : ''}">${fmtMoeda(r.turnover)}</td>
        <td style="${TD_R}">${fmtPct(r.margem)}</td>
        <td style="${TD_C}">${fmtNum(r.apostas)}</td>
        <td style="${TD_R}">${r.apostaMedia != null ? fmtMoeda(r.apostaMedia) : '—'}</td>
        <td style="${TD_C}${r.isTotal ? 'font-weight:600;' : ''}">${r.uap != null ? fmtNum(r.uap) : '—'}</td>
        <td style="${TD_R}">${r.arpu != null ? fmtMoeda(r.arpu) : '—'}</td>
      </tr>`
  }).join('')

  return `
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
      <table style="width:100%;min-width:720px;border-collapse:collapse;font-size:13px;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
        <thead>
          <tr>
            <th style="${TH}text-align:left;">Operadora</th>
            <th style="${TH}text-align:right;">GGR</th>
            <th style="${TH}text-align:right;">Turnover</th>
            <th style="${TH}text-align:right;">% Margem</th>
            <th style="${TH}text-align:center;">Apostas</th>
            <th style="${TH}text-align:right;">Aposta Média</th>
            <th style="${TH}text-align:center;">UAP</th>
            <th style="${TH}text-align:right;">ARPU</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`
}

function tabelaLinhaUnica(headers: string[], cells: string[], minWidth = 640): string {
  const ths = headers.map((h, idx) => {
    const align = idx === 0 ? 'right' : h.includes('Lives') || h.includes('Horas') || h.includes('Registros') || h.includes('FTDs') || h.includes('Postagens') || h.includes('Impressões')
      ? 'center'
      : h.includes('ROI') || h.includes('GGR') || h.includes('Investimento')
      ? 'right'
      : 'center'
    return `<th style="${TH}text-align:${align};">${h}</th>`
  }).join('')
  const tds = cells.join('')
  return `
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
      <table style="width:100%;min-width:${minWidth}px;border-collapse:collapse;font-size:13px;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
        <thead><tr>${ths}</tr></thead>
        <tbody><tr>${tds}</tr></tbody>
      </table>
    </div>`
}

function tabelaStreamers(s: RelatorioDiretoriaData['streamersMtd']): string {
  const roiCor = s.roi !== null && s.roi >= 0 ? '#166534' : '#e84025'
  return tabelaLinhaUnica(
    ['GGR', 'Investimento', '% ROI', 'Registros', 'FTDs', 'Lives Realizadas', 'Horas Realizadas'],
    [
      `<td style="${TD_R}font-weight:700;color:${corGGR(s.ggr)};">${fmtMoeda(s.ggr)}</td>`,
      `<td style="${TD_R}">${fmtMoeda(s.investimento)}</td>`,
      `<td style="${TD_R}font-weight:700;color:${s.roi !== null ? roiCor : '#111827'};">${fmtPct(s.roi, true)}</td>`,
      `<td style="${TD_C}">${fmtNum(s.registros)}</td>`,
      `<td style="${TD_C}font-weight:600;">${fmtNum(s.ftds)}</td>`,
      `<td style="${TD_C}">${fmtNum(s.lives)}</td>`,
      `<td style="${TD_C}">${fmtHorasTotal(s.horas)}</td>`,
    ],
  )
}

function tabelaMidias(m: RelatorioDiretoriaData['midiasMtd']): string {
  const roiCor = m.roi !== null && m.roi >= 0 ? '#166534' : '#e84025'
  return tabelaLinhaUnica(
    ['GGR', 'Investimento', '% ROI', 'Registros', 'FTDs', 'Postagens', 'Impressões Totais'],
    [
      `<td style="${TD_R}font-weight:700;color:${corGGR(m.ggr)};">${fmtMoeda(m.ggr)}</td>`,
      `<td style="${TD_R}">${fmtMoeda(m.investimento)}</td>`,
      `<td style="${TD_R}font-weight:700;color:${m.roi !== null ? roiCor : '#111827'};">${fmtPct(m.roi, true)}</td>`,
      `<td style="${TD_C}">${fmtNum(m.registros)}</td>`,
      `<td style="${TD_C}font-weight:600;">${fmtNum(m.ftds)}</td>`,
      `<td style="${TD_C}">${fmtNum(m.postagens)}</td>`,
      `<td style="${TD_C}">${fmtNum(m.impressoes)}</td>`,
    ],
  )
}

function tabelaPosicionamento(bloco: RelatorioDiretoriaData['posicionamento'][0]): string {
  const linhas = bloco.mesas.length === 0
    ? `<tr><td colspan="3" style="${TD}color:#9ca3af;font-style:italic;">Sem leitura disponível.</td></tr>`
    : bloco.mesas.map((m, i) => `
        <tr style="${trStyle(i)}">
          <td style="${TD}font-weight:600;">${m.mesa}</td>
          <td style="${TD_C}font-weight:700;color:#4a2082;">${m.posicao ?? '—'}</td>
          <td style="${TD_C}">${fmtNum(m.concorrentes)}</td>
        </tr>`).join('')

  return `
    <table style="width:100%;border-collapse:collapse;font-size:13px;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;margin-bottom:8px;">
      <thead>
        <tr>
          <th style="${TH}text-align:left;">Mesa</th>
          <th style="${TH}text-align:center;">Posição</th>
          <th style="${TH}text-align:center;">Concorrentes à Frente</th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>`
}

function tabelaAgenda(agenda: RelatorioDiretoriaData['agenda'], dataHojeFmt: string): string {
  const linhasAgenda = agenda.length === 0
    ? `<tr><td colspan="4" style="${TD}color:#9ca3af;font-style:italic;">Não há lives agendadas até o momento para hoje.</td></tr>`
    : [...agenda]
        .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''))
        .map((l, i) => `
          <tr style="${trStyle(i)}">
            <td style="${TD}font-weight:700;color:#4a2082;">${(l.horario || '').slice(0, 5)}</td>
            <td style="${TD}font-weight:600;">${l.influencer_name}</td>
            <td style="${TD}color:#6b7280;">${l.plataforma}</td>
            <td style="${TD_R}">${l.link
              ? `<a href="${l.link.startsWith('http') ? l.link : 'https://' + l.link}" style="color:#1e36f8;font-weight:600;text-decoration:none;">Abrir →</a>`
              : '—'
            }</td>
          </tr>`)
        .join('')

  return `
    ${subtitulo(`Lives agendadas para hoje (${dataHojeFmt})`)}
    <table style="width:100%;border-collapse:collapse;font-size:13px;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
      <thead>
        <tr>
          <th style="${TH}text-align:left;">Horário</th>
          <th style="${TH}text-align:left;">Influencer</th>
          <th style="${TH}text-align:left;">Plataforma</th>
          <th style="${TH}text-align:right;">Link</th>
        </tr>
      </thead>
      <tbody>${linhasAgenda}</tbody>
    </table>
    <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;font-style:italic;">
      ⚠️ Os horários informados são previstos e podem sofrer alterações ou atrasos ao longo do dia.
    </p>`
}

function tabelaInfluencersD1(rows: RelatorioDiretoriaData['influencersRows'], dataOntemFmt: string): string {
  const linhas = rows.length === 0
    ? `<tr><td colspan="6" style="${TD}color:#9ca3af;font-style:italic;">Nenhum resultado adicional no dia anterior.</td></tr>`
    : [...rows]
        .sort((a, b) => b.ggr - a.ggr)
        .map((r, i) => `
          <tr style="${trStyle(i)}">
            <td style="${TD}font-weight:600;">${r.nome}</td>
            <td style="${TD_C}">${fmtNum(r.depositos_qtd)}</td>
            <td style="${TD_R}">${fmtMoeda(r.depositos_valor)}</td>
            <td style="${TD_C}">${fmtNum(r.saques_qtd)}</td>
            <td style="${TD_R}">${fmtMoeda(r.saques_valor)}</td>
            <td style="${TD_R}font-weight:700;color:${corGGR(r.ggr)};">${fmtMoeda(r.ggr)}</td>
          </tr>`)
        .join('')

  return `
    ${subtitulo(dataOntemFmt)}
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
      <table style="width:100%;min-width:560px;border-collapse:collapse;font-size:13px;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
        <thead>
          <tr>
            <th style="${TH}text-align:left;">Influencer</th>
            <th style="${TH}text-align:center;"># Depósitos</th>
            <th style="${TH}text-align:right;">R$ Depósitos</th>
            <th style="${TH}text-align:center;"># Saques</th>
            <th style="${TH}text-align:right;">R$ Saques</th>
            <th style="${TH}text-align:right;">GGR</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`
}

export function gerarHTMLRelatorioDiretoria(
  data: RelatorioDiretoriaData,
  logoUrl: string,
  logoUrlDark: string,
): string {
  const dataHojeFmt = formatarData(data.dataHoje)
  const dataOntemFmt = formatarData(data.dataOntem)
  const mesFmt = mesExtenso(data.dataOntem)
  const ultimaLeitura = data.posicionamento.find((p) => p.ultimaLeituraFmt)?.ultimaLeituraFmt

  const logoDarkMode = logoUrl
    ? `<img src="${logoUrl}" alt="Spin Gaming" width="160" class="header-logo header-logo-dark" style="display:block;margin:0 auto 20px;max-width:160px;" />`
    : ''
  const logoLightMode = logoUrlDark
    ? `<img src="${logoUrlDark}" alt="Spin Gaming" width="160" class="header-logo header-logo-light" style="display:none;margin:0 auto 20px;max-width:160px;" />`
    : ''

  const blocoPosicionamento = data.posicionamento.map((b) =>
    tituloSubSecao(b.titulo) + tabelaPosicionamento(b),
  ).join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Relatório Diário — ${dataHojeFmt}</title>
  <style>${emailHeaderStyles()}</style>
</head>
<body style="margin:0;padding:24px;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f0eef8;">

  <div style="max-width:740px;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(74,32,130,0.13);border:1px solid #e5e7eb;">

    <div class="email-header">
      ${logoDarkMode}${logoLightMode}
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;">
        Relatório Diário — Aquisição
      </h1>
      <p class="subtitle" style="margin:0;font-size:13px;letter-spacing:0.02em;">
        ${subtituloEmailComData(dataHojeFmt)}
      </p>
    </div>

    <div style="background:#ffffff;">

      ${secao(
        tituloSecao(`📊 Consolidado de Resultados — ${mesFmt}`),
        subtitulo('Consolidado MTD') +
        tituloSubSecao('Resultado por Operadoras') +
        tabelaOperadoras(data.operadorasMtd) +
        tituloSubSecao('Resultado de Streamers') +
        tabelaStreamers(data.streamersMtd) +
        tituloSubSecao('Resultado de Mídias Sociais') +
        tabelaMidias(data.midiasMtd),
        false,
      )}

      ${secao(
        tituloSecao('📍 Posicionamento'),
        (ultimaLeitura ? subtitulo(`Última leitura: ${ultimaLeitura}`) : '') + blocoPosicionamento,
      )}

      ${secao(
        tituloSecao('🎬 Streamers'),
        tituloSubSecao('Agenda do dia') +
        tabelaAgenda(data.agenda, dataHojeFmt) +
        tituloSubSecao('Resultado de Influencers do dia anterior') +
        tabelaInfluencersD1(data.influencersRows, dataOntemFmt),
      )}

      ${secao(
        '',
        `<div style="background:#f0eef8;border-radius:10px;padding:18px 20px;border:1px solid #ddd6fe;text-align:center;">
          <p style="margin:0;font-size:13px;color:#4b5563;line-height:1.6;text-align:center;">
            Estes são os dados sumarizados do dia. Para informações completas, análises detalhadas e histórico,
            acesse a
            <a href="https://data-intelligence.spingaming.com.br/" style="color:#1e36f8;font-weight:700;text-decoration:none;">
              ${MARCA_PRODUTO}
            </a>.
          </p>
        </div>`,
      )}

    </div>

    <div style="background:#f9f7ff;padding:14px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
        ${MARCA_PRODUTO} · Relatório automático ·
        Enviado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
      </p>
    </div>

  </div>
</body>
</html>`
}
