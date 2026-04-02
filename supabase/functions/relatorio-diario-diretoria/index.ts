import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Edge Function: relatorio-diario-diretoria
// Envia e-mail diário: agenda do dia + consolidado do dia anterior + acumulado mensal.

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface LiveAgenda {
  horario: string
  influencer_name: string
  plataforma: string
  link?: string
}

interface ResultadoInfluencer {
  nome: string
  depositos_qtd: number
  depositos_valor: number
  saques_qtd: number
  saques_valor: number
  ggr: number
}

interface TotaisMensal {
  ggrTotal: number
  investimento: number
  roi: number | null
  livesRealizadas: number
  totalRegistros: number
  totalFtds: number
}

// ── CORS ──────────────────────────────────────────────────────────────────────

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    // Browser + supabase-js enviam apikey e x-client-info; sem isso o preflight bloqueia o POST.
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  }
}

// ── Helpers de data ───────────────────────────────────────────────────────────

function hojeISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function ontemISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function formatarData(iso: string): string {
  const [y, m, d] = iso.split('-')
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${parseInt(d, 10)} ${meses[parseInt(m, 10) - 1]} ${y}`
}

function mesExtenso(iso: string): string {
  const [y, m] = iso.split('-')
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                 'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  return `${meses[parseInt(m, 10) - 1]} ${y}`
}

function primeiroDiaMes(iso: string): string {
  const [y, m] = iso.split('-')
  return `${y}-${m}-01`
}
function ultimoDiaMes(iso: string): string {
  const [y, m] = iso.split('-')
  const ultimo = new Date(parseInt(y), parseInt(m), 0).getDate()
  return `${y}-${m}-${String(ultimo).padStart(2, '0')}`
}

// ── Helpers de formatação ─────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toLocaleString('pt-BR')
}

function fmtMoeda(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// ── Estilos de e-mail reutilizáveis ───────────────────────────────────────────

const TH = `padding:10px 14px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;background:#f9fafb;border-bottom:2px solid #e5e7eb;`
const TD = `padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#111827;`
const TD_R = `${TD}text-align:right;`
const TD_C = `${TD}text-align:center;`

function trStyle(i: number): string {
  return i % 2 === 1 ? 'background:#f9f7ff;' : 'background:#ffffff;'
}

function corGGR(v: number): string {
  return v >= 0 ? '#166534' : '#e84025'
}

// ── Construtor de bloco de seção ──────────────────────────────────────────────

function secao(titulo: string, conteudo: string, borderTop = true): string {
  return `
  <div style="padding:28px 32px;${borderTop ? 'border-top:1px solid #e5e7eb;' : ''}">
    ${titulo}
    ${conteudo}
  </div>`
}

function subtitulo(txt: string): string {
  return `<p style="margin:0 0 16px;font-size:13px;color:#6b7280;font-style:italic;">${txt}</p>`
}

function tituloSecao(txt: string): string {
  return `<h2 style="margin:0 0 4px;font-size:17px;font-weight:800;color:#111827;letter-spacing:0.02em;">${txt}</h2>`
}

function tituloSubSecao(txt: string): string {
  return `<h3 style="margin:20px 0 4px;font-size:13px;font-weight:700;color:#4a2082;text-transform:uppercase;letter-spacing:0.08em;">${txt}</h3>`
}

// ── Geração do HTML do e-mail ─────────────────────────────────────────────────

function gerarHTML(
  dataHoje: string,
  dataOntem: string,
  agenda: LiveAgenda[],
  influencersRows: ResultadoInfluencer[],
  mensal: TotaisMensal,
  logoUrl: string,
  logoUrlDark: string,
): string {

  const dataHojeFmt   = formatarData(dataHoje)
  const dataOntemFmt  = formatarData(dataOntem)
  const mesFmt        = mesExtenso(dataOntem)

  const linhasAgenda = agenda.length === 0
    ? `<tr><td colspan="4" style="${TD}color:#9ca3af;font-style:italic;">Não há lives agendadas até o momento para hoje.</td></tr>`
    : agenda
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

  const tabelaAgenda = `
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

  const linhasInfluencers = influencersRows.length === 0
    ? `<tr><td colspan="6" style="${TD}color:#9ca3af;font-style:italic;">Nenhum resultado adicional no dia anterior.</td></tr>`
    : influencersRows
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

  const tabelaInfluencers = `
    <table style="width:100%;border-collapse:collapse;font-size:13px;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
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
      <tbody>${linhasInfluencers}</tbody>
    </table>`

  const roiStr = mensal.investimento > 0 && mensal.roi !== null
    ? `${mensal.roi >= 0 ? '+' : ''}${mensal.roi.toFixed(1)}%`
    : '—'
  const roiCor = mensal.roi !== null && mensal.roi >= 0 ? '#166534' : '#e84025'

  const tabelaMensal = `
    <table style="width:100%;border-collapse:collapse;font-size:13px;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
      <thead>
        <tr>
          <th style="${TH}text-align:right;">GGR Total</th>
          <th style="${TH}text-align:right;">Investimento</th>
          <th style="${TH}text-align:right;">ROI Geral</th>
          <th style="${TH}text-align:center;">Lives Realizadas</th>
          <th style="${TH}text-align:center;">Registros</th>
          <th style="${TH}text-align:center;">FTDs</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background:#ffffff;">
          <td style="${TD_R}font-weight:700;color:${corGGR(mensal.ggrTotal)};">${fmtMoeda(mensal.ggrTotal)}</td>
          <td style="${TD_R}">${fmtMoeda(mensal.investimento)}</td>
          <td style="${TD_R}font-weight:700;color:${roiCor};">${roiStr}</td>
          <td style="${TD_C}font-weight:600;">${mensal.livesRealizadas}</td>
          <td style="${TD_C}">${fmtNum(mensal.totalRegistros)}</td>
          <td style="${TD_C}font-weight:600;">${fmtNum(mensal.totalFtds)}</td>
        </tr>
      </tbody>
    </table>`

  const logoDarkMode = logoUrl ? `<img src="${logoUrl}" alt="Spin Gaming" width="160" class="header-logo header-logo-dark" style="display:block;margin:0 auto 20px;max-width:160px;" />` : ''
  const logoLightMode = logoUrlDark ? `<img src="${logoUrlDark}" alt="Spin Gaming" width="160" class="header-logo header-logo-light" style="display:none;margin:0 auto 20px;max-width:160px;" />` : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Relatório Diário — ${dataHojeFmt}</title>
  <style>
    /* Dark mode (padrão): fundo escuro, texto branco */
    .email-header { background-color:#4a2082; background:linear-gradient(135deg,#4a2082 0%,#1e36f8 100%); padding:28px 32px; text-align:center; }
    .email-header h1, .email-header .subtitle { color:#ffffff !important; }
    .email-header .subtitle { color:rgba(255,255,255,0.80) !important; }
    .header-logo-dark { display:block !important; }
    .header-logo-light { display:none !important; }
    /* Light mode: fundo claro, texto escuro (Apple Mail, etc.) */
    @media (prefers-color-scheme: light) {
      .email-header { background:#f0eef8 !important; background-color:#f0eef8 !important; }
      .email-header h1 { color:#4a2082 !important; }
      .email-header .subtitle { color:#6b7280 !important; }
      .header-logo-dark { display:none !important; }
      .header-logo-light { display:block !important; }
    }
  </style>
</head>
<body style="margin:0;padding:24px;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f0eef8;">

  <div style="max-width:740px;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(74,32,130,0.13);border:1px solid #e5e7eb;">

    <div class="email-header">
      ${logoDarkMode}${logoLightMode}
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;">
        Relatório Diário — Influencers
      </h1>
      <p class="subtitle" style="margin:0;font-size:13px;letter-spacing:0.02em;">
        ${dataHojeFmt} · Data Intelligence Spin Gaming
      </p>
    </div>

    <div style="background:#ffffff;">

      ${secao(
        tituloSecao('📅 Agenda do dia'),
        subtitulo(`Lives agendadas para hoje (${dataHojeFmt})`) + tabelaAgenda,
        false
      )}

      ${secao(
        tituloSecao(`📊 Consolidado de Resultados — ${dataOntemFmt}`),
        tituloSubSecao('Resultado de Influencers do dia anterior') +
        tabelaInfluencers +
        tituloSubSecao(`Resultados de Influencers — ${mesFmt}`) +
        tabelaMensal
      )}

      ${secao(
        '',
        `<div style="background:#f0eef8;border-radius:10px;padding:18px 20px;border:1px solid #ddd6fe;text-align:center;">
          <p style="margin:0;font-size:13px;color:#4b5563;line-height:1.6;text-align:center;">
            Estes são os dados sumarizados do dia. Para informações completas, análises detalhadas e histórico,
            acesse a
            <a href="https://data-intelligence.spingaming.com.br/" style="color:#1e36f8;font-weight:700;text-decoration:none;">
              Data Intelligence Spin Gaming
            </a>.
          </p>
        </div>`
      )}

    </div>

    <div style="background:#f9f7ff;padding:14px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
        Data Intelligence Spin Gaming · Relatório automático ·
        Enviado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
      </p>
    </div>

  </div>
</body>
</html>`
}

// ── Enviar via Resend ─────────────────────────────────────────────────────────

async function enviarRelatorio(
  destinatarios: string[],
  dataHoje: string,
  dataOntem: string,
  agenda: LiveAgenda[],
  influencersRows: ResultadoInfluencer[],
  mensal: TotaisMensal,
): Promise<{ ok: boolean; error?: string }> {

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return { ok: false, error: 'RESEND_API_KEY não configurada' }

  const fromEnv = (Deno.env.get('RESEND_FROM') ?? '').trim()
  const from = fromEnv && /@[\w.-]+\.[a-z]{2,}/i.test(fromEnv)
    ? fromEnv
    : 'Acquisition Hub <onboarding@resend.dev>'

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const logoUrl = supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/logos/Logo%20Spin%20Gaming%20White.png`
    : ''
  const logoUrlDark = supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/logos/Logo%20Spin%20Gaming.png`
    : ''

  const html = gerarHTML(dataHoje, dataOntem, agenda, influencersRows, mensal, logoUrl, logoUrlDark)

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: destinatarios,
      subject: `Relatório Diário - ${formatarData(dataHoje)} | Influencers`,
      html,
    }),
  })

  if (res.ok) return { ok: true }
  const errText = await res.text()
  return { ok: false, error: `Resend ${res.status}: ${errText}` }
}

// ── Handler principal ─────────────────────────────────────────────────────────

serve(async (req) => {
  const cors = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    let body: { destinatarios?: string[] } = {}
    if (req.method === 'POST') {
      try { body = (await req.json()) as { destinatarios?: string[] } } catch { /* ok */ }
    }

    let destinatarios = body.destinatarios?.filter((e) => typeof e === 'string' && e.includes('@')) ?? []
    if (destinatarios.length === 0) {
      const envDest = Deno.env.get('RELATORIO_DIRETORIA_DESTINATARIOS')
      if (envDest) {
        destinatarios = envDest.split(/[,;]/).map((e) => e.trim().toLowerCase()).filter(Boolean)
      }
    }
    if (destinatarios.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Configure RELATORIO_DIRETORIA_DESTINATARIOS ou envie destinatarios no body.' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const dataHoje  = hojeISO()
    const dataOntem = ontemISO()

    const { data: livesHoje } = await supabase
      .from('lives')
      .select('id, horario, plataforma, link, influencer_id')
      .eq('data', dataHoje)
      .eq('status', 'agendada')
      .order('horario', { ascending: true })

    const infIdsAgenda = [...new Set((livesHoje ?? []).map((l: { influencer_id: string }) => l.influencer_id))]
    const nameMap: Record<string, string> = {}

    if (infIdsAgenda.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('id, name').in('id', infIdsAgenda)
      for (const p of (profs ?? []) as { id: string; name?: string }[]) nameMap[p.id] = p.name ?? ''
    }

    const agenda: LiveAgenda[] = (livesHoje ?? []).map((l: {
      horario: string; influencer_id: string; plataforma: string; link?: string
    }) => ({
      horario: l.horario ?? '',
      influencer_name: nameMap[l.influencer_id] ?? '—',
      plataforma: l.plataforma ?? '',
      link: l.link,
    }))

    const { data: metricasRaw } = await supabase
      .from('influencer_metricas')
      .select('influencer_id, visit_count, registration_count, ftd_count, deposit_count, deposit_total, withdrawal_count, withdrawal_total, ggr')
      .eq('data', dataOntem)

    type MetRow = {
      influencer_id: string
      visit_count: number; registration_count: number; ftd_count: number
      deposit_count: number; deposit_total: number
      withdrawal_count: number; withdrawal_total: number; ggr: number
    }

    const metricasPorInf = new Map<string, {
      visits: number; regs: number; ftds: number
      depQtd: number; depVal: number
      wdQtd: number; wdVal: number; ggr: number
    }>()

    for (const m of (metricasRaw ?? []) as MetRow[]) {
      const cur = metricasPorInf.get(m.influencer_id) ?? {
        visits: 0, regs: 0, ftds: 0, depQtd: 0, depVal: 0, wdQtd: 0, wdVal: 0, ggr: 0,
      }
      cur.visits   += m.visit_count        ?? 0
      cur.regs     += m.registration_count ?? 0
      cur.ftds     += m.ftd_count          ?? 0
      cur.depQtd   += m.deposit_count      ?? 0
      cur.depVal   += m.deposit_total      ?? 0
      cur.wdQtd    += m.withdrawal_count   ?? 0
      cur.wdVal    += m.withdrawal_total   ?? 0
      cur.ggr      += m.ggr               ?? 0
      metricasPorInf.set(m.influencer_id, cur)
    }

    const { data: livesOntem } = await supabase
      .from('lives')
      .select('id, influencer_id')
      .eq('data', dataOntem)
      .eq('status', 'realizada')

    const infIdsAll = [...new Set([
      ...metricasPorInf.keys(),
      ...(livesOntem ?? []).map((l: { influencer_id: string }) => l.influencer_id),
    ])]

    if (infIdsAll.length > 0) {
      const [profRes, perfRes] = await Promise.all([
        supabase.from('profiles').select('id, name').in('id', infIdsAll),
        supabase.from('influencer_perfil').select('id, nome_artistico').in('id', infIdsAll),
      ])
      for (const p of (profRes.data ?? []) as { id: string; name?: string }[]) {
        if (!nameMap[p.id]) nameMap[p.id] = p.name ?? ''
      }
      for (const p of (perfRes.data ?? []) as { id: string; nome_artistico?: string }[]) {
        if (!nameMap[p.id]) nameMap[p.id] = p.nome_artistico ?? ''
      }
    }

    const infComLive = new Set(
      (livesOntem ?? []).map((l: { influencer_id: string }) => l.influencer_id)
    )

    const influencersRows: ResultadoInfluencer[] = []

    for (const id of infIdsAll) {
      const m = metricasPorInf.get(id) ?? { visits: 0, regs: 0, ftds: 0, depQtd: 0, depVal: 0, wdQtd: 0, wdVal: 0, ggr: 0 }
      const nome = nameMap[id] ?? '—'
      const temKpi = m.depQtd > 0 || m.depVal > 0 || m.wdQtd > 0 || m.wdVal > 0 || m.ggr !== 0
      if (infComLive.has(id) || temKpi) {
        influencersRows.push({
          nome,
          depositos_qtd: m.depQtd,
          depositos_valor: m.depVal,
          saques_qtd: m.wdQtd,
          saques_valor: m.wdVal,
          ggr: m.ggr,
        })
      }
    }

    const inicioMes = primeiroDiaMes(dataOntem)
    const fimMes    = ultimoDiaMes(dataOntem)

    const [{ data: metMesRaw }, { data: livesMesRaw }, { data: ciclosMes }] = await Promise.all([
      supabase
        .from('influencer_metricas')
        .select('influencer_id, registration_count, ftd_count, ggr')
        .gte('data', inicioMes).lte('data', fimMes),
      supabase
        .from('lives')
        .select('id, influencer_id')
        .eq('status', 'realizada')
        .gte('data', inicioMes).lte('data', fimMes),
      supabase.from('ciclos_pagamento').select('id').gte('data_fim', inicioMes).lte('data_fim', fimMes),
    ])

    const cicloIds = (ciclosMes ?? []).map((c: { id: string }) => c.id)
    let investimentoTotal = 0
    if (cicloIds.length > 0) {
      const [{ data: pags }, { data: ags }] = await Promise.all([
        supabase.from('pagamentos').select('total').eq('status', 'pago').in('ciclo_id', cicloIds),
        supabase.from('pagamentos_agentes').select('total').eq('status', 'pago').in('ciclo_id', cicloIds),
      ])
      investimentoTotal =
        (pags ?? []).reduce((s: number, r: { total: number }) => s + (Number(r.total) || 0), 0) +
        (ags ?? []).reduce((s: number, r: { total: number }) => s + (Number(r.total) || 0), 0)
    }

    const mensal: TotaisMensal = { ggrTotal: 0, investimento: investimentoTotal, roi: null, livesRealizadas: 0, totalRegistros: 0, totalFtds: 0 }

    for (const m of (metMesRaw ?? []) as { influencer_id: string; registration_count: number; ftd_count: number; ggr: number }[]) {
      mensal.ggrTotal       += m.ggr               ?? 0
      mensal.totalRegistros += m.registration_count ?? 0
      mensal.totalFtds      += m.ftd_count          ?? 0
    }

    mensal.livesRealizadas = (livesMesRaw ?? []).length

    if (mensal.investimento > 0) {
      mensal.roi = ((mensal.ggrTotal - mensal.investimento) / mensal.investimento) * 100
    }

    const result = await enviarRelatorio(
      destinatarios, dataHoje, dataOntem,
      agenda, influencersRows, mensal
    )

    if (!result.ok) {
      try {
        await supabase.from('tech_logs').insert({
          integracao_slug: null,
          tipo: 'relatorio_diretoria',
          descricao: result.error ?? 'Erro ao enviar e-mail via Resend',
        })
      } catch (e) {
        console.warn('[relatorio-diario-diretoria] Falha ao registrar tech_log:', e)
      }
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Registrar envio em email_envios para fluxo de dados (1 = cada destinatário)
    try {
      await supabase.from('email_envios').insert({
        data: dataHoje,
        tipo: 'relatorio_diretoria',
        destinatarios_count: destinatarios.length,
      })
    } catch (e) {
      console.warn('[relatorio-diario-diretoria] Falha ao registrar email_envios:', e)
    }

    return new Response(
      JSON.stringify({
        ok: true,
        data_agenda: dataHoje,
        data_consolidado: dataOntem,
        mes_consolidado: mesExtenso(dataOntem),
        total_agenda: agenda.length,
        total_influencer_rows: influencersRows.length,
        mensal,
        destinatarios,
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
    )

  } catch (e) {
    console.error('[relatorio-diario-diretoria] Erro:', e)
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      )
      await supabase.from('tech_logs').insert({
        integracao_slug: null,
        tipo: 'relatorio_diretoria',
        descricao: `[exceção] ${String(e)}`.slice(0, 2000),
      })
    } catch {
      /* ignora falha ao registrar */
    }
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
