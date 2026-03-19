import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Edge Function: relatorio-diario-diretoria
// Envia e-mail diário às 9h BRT: agenda do dia + consolidado de resultados do dia anterior.
// Destinatários: RELATORIO_DIRETORIA_DESTINATARIOS (vírgula) ou body.destinatarios

// ── Tipos ────────────────────────────────────────────────────

interface LiveAgenda {
  horario: string
  influencer_name: string
  plataforma: string
  link?: string
}

interface ResultadoInfluencer {
  nome: string
  lives: number
  horas: number
  views: number
  acessos: number
  registros: number
  ftds: number
  depositos_qtd: number
  depositos_valor: number
  ggr: number
}

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Max-Age': '86400',
  }
}

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
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${parseInt(d, 10)} ${meses[parseInt(m, 10) - 1]} ${y}`
}

function fmtNum(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toLocaleString('pt-BR')
}

function fmtMoeda(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// ── Enviar e-mail via Resend ───────────────────────────────

async function enviarRelatorio(
  destinatarios: string[],
  dataHoje: string,
  dataOntem: string,
  agenda: LiveAgenda[],
  resultados: ResultadoInfluencer[],
  totais: { lives: number; horas: number; views: number; acessos: number; registros: number; ftds: number; depositos_valor: number; ggr: number }
): Promise<{ ok: boolean; error?: string }> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return { ok: false, error: 'RESEND_API_KEY não configurada' }

  const from = Deno.env.get('RESEND_FROM') || 'Acquisition Hub <onboarding@resend.dev>'
  const dataHojeFmt = formatarData(dataHoje)
  const dataOntemFmt = formatarData(dataOntem)

  const linhasAgenda =
    agenda.length === 0
      ? '<tr><td colspan="3" style="padding:12px;color:#666;font-style:italic;">Nenhuma live agendada.</td></tr>'
      : agenda
          .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''))
          .map(
            (l) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-weight:600;">${(l.horario || '').slice(0, 5)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;">${l.influencer_name} · ${l.plataforma}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;">${l.link ? `<a href="${l.link.startsWith('http') ? l.link : 'https://' + l.link}" style="color:#2563eb;">Abrir</a>` : '—'}</td>
      </tr>
    `
          )
          .join('')

  const linhasResultados =
    resultados.length === 0
      ? '<tr><td colspan="9" style="padding:16px;color:#666;font-style:italic;">Nenhum dado do dia anterior.</td></tr>'
      : resultados
          .sort((a, b) => b.ggr - a.ggr)
          .map(
            (r) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-weight:600;">${r.nome}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:center;">${r.lives}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:right;">${r.horas.toFixed(1)}h</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmtNum(r.views)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmtNum(r.acessos)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmtNum(r.registros)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmtNum(r.ftds)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmtMoeda(r.depositos_valor)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${fmtMoeda(r.ggr)}</td>
      </tr>
    `
          )
          .join('')

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Relatório Diário — ${dataHojeFmt}</title>
</head>
<body style="margin:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f3f4f6;padding:24px;">
  <div style="max-width:720px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#4a2082,#1e36f8);color:#fff;padding:24px 28px;">
      <h1 style="margin:0;font-size:20px;font-weight:700;letter-spacing:0.02em;">Relatório Diário — Diretoria</h1>
      <p style="margin:8px 0 0;font-size:14px;opacity:0.9;">${dataHojeFmt} · Acquisition Hub</p>
    </div>

    <!-- Agenda do dia -->
    <div style="padding:24px 28px;border-bottom:1px solid #e5e7eb;">
      <h2 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#111;">📅 Agenda do dia</h2>
      <p style="margin:0 0 12px;font-size:13px;color:#6b7280;">Lives agendadas para hoje (${dataHojeFmt})</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:10px 14px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;">Horário</th>
            <th style="padding:10px 14px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;">Influencer · Plataforma</th>
            <th style="padding:10px 14px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;">Link</th>
          </tr>
        </thead>
        <tbody>${linhasAgenda}</tbody>
      </table>
    </div>

    <!-- Consolidado do dia anterior -->
    <div style="padding:24px 28px;">
      <h2 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#111;">📊 Consolidado — ${dataOntemFmt}</h2>
      <p style="margin:0 0 16px;font-size:13px;color:#6b7280;">Resultados de influencers do dia anterior</p>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:10px 14px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;">Influencer</th>
            <th style="padding:10px 14px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;">Lives</th>
            <th style="padding:10px 14px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase;">Horas</th>
            <th style="padding:10px 14px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase;">Views</th>
            <th style="padding:10px 14px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase;">Acessos</th>
            <th style="padding:10px 14px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase;">Reg.</th>
            <th style="padding:10px 14px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase;">FTDs</th>
            <th style="padding:10px 14px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase;">Depósitos</th>
            <th style="padding:10px 14px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase;">GGR</th>
          </tr>
        </thead>
        <tbody>${linhasResultados}</tbody>
      </table>
      
      <!-- Totais -->
      <div style="margin-top:20px;padding:16px 20px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
        <p style="margin:0;font-size:13px;font-weight:700;color:#166534;">Totais: ${totais.lives} lives · ${totais.horas.toFixed(1)}h · ${fmtNum(totais.views)} views · ${fmtNum(totais.ftds)} FTDs · ${fmtMoeda(totais.depositos_valor)} depósitos · <strong>${fmtMoeda(totais.ggr)} GGR</strong></p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:16px 28px;background:#f9fafb;font-size:11px;color:#9ca3af;">
      Acquisition Hub — Relatório automático · Enviado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
    </div>
  </div>
</body>
</html>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: destinatarios,
      subject: `Relatório Diário — ${dataHojeFmt} | Agenda + Consolidado ${dataOntemFmt}`,
      html,
    }),
  })

  if (res.ok) return { ok: true }
  const errText = await res.text()
  return { ok: false, error: `Resend ${res.status}: ${errText}` }
}

// ── Handler ───────────────────────────────────────────────────

serve(async (req) => {
  const cors = corsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    let body: { destinatarios?: string[] } = {}
    if (req.method === 'POST') {
      try {
        body = (await req.json()) as { destinatarios?: string[] }
      } catch {
        /* ok */
      }
    }

    let destinatarios: string[] = body.destinatarios?.filter((e) => typeof e === 'string' && e.includes('@')) ?? []
    if (destinatarios.length === 0) {
      const envDest = Deno.env.get('RELATORIO_DIRETORIA_DESTINATARIOS')
      if (envDest) {
        destinatarios = envDest.split(/[,;]/).map((e) => e.trim().toLowerCase()).filter(Boolean)
      }
    }
    if (destinatarios.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Configure RELATORIO_DIRETORIA_DESTINATARIOS (Supabase Secrets) ou envie destinatarios no body.',
        }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const dataHoje = hojeISO()
    const dataOntem = ontemISO()

    // 1. Agenda do dia (lives agendadas)
    const { data: livesHoje } = await supabase
      .from('lives')
      .select('id, horario, plataforma, link, influencer_id')
      .eq('data', dataHoje)
      .eq('status', 'agendada')
      .order('horario', { ascending: true })

    const infIdsAgenda = [...new Set((livesHoje ?? []).map((l: { influencer_id: string }) => l.influencer_id))]
    let nameMap: Record<string, string> = {}
    if (infIdsAgenda.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('id, name').in('id', infIdsAgenda)
      for (const p of (profs ?? []) as { id: string; name?: string }[]) {
        nameMap[p.id] = p.name ?? ''
      }
    }

    const agenda: LiveAgenda[] = (livesHoje ?? []).map((l: { horario: string; influencer_id: string; plataforma: string; link?: string }) => ({
      horario: l.horario ?? '',
      influencer_name: nameMap[l.influencer_id] ?? '—',
      plataforma: l.plataforma ?? '',
      link: l.link,
    }))

    // 2. Métricas do dia anterior (influencer_metricas)
    const { data: metricasRaw } = await supabase
      .from('influencer_metricas')
      .select('influencer_id, visit_count, registration_count, ftd_count, deposit_count, deposit_total, withdrawal_total, ggr')
      .eq('data', dataOntem)

    const metricasPorInf = new Map<
      string,
      { visits: number; regs: number; ftds: number; depQtd: number; depVal: number; wd: number; ggr: number }
    >()
    for (const m of metricasRaw ?? []) {
      const cur = metricasPorInf.get(m.influencer_id) ?? { visits: 0, regs: 0, ftds: 0, depQtd: 0, depVal: 0, wd: 0, ggr: 0 }
      cur.visits += m.visit_count ?? 0
      cur.regs += m.registration_count ?? 0
      cur.ftds += m.ftd_count ?? 0
      cur.depQtd += m.deposit_count ?? 0
      cur.depVal += m.deposit_total ?? 0
      cur.wd += m.withdrawal_total ?? 0
      cur.ggr += m.ggr ?? 0
      metricasPorInf.set(m.influencer_id, cur)
    }

    // 3. Lives realizadas + resultados do dia anterior
    const { data: livesOntem } = await supabase
      .from('lives')
      .select('id, influencer_id')
      .eq('data', dataOntem)
      .eq('status', 'realizada')

    const liveIds = (livesOntem ?? []).map((l: { id: string }) => l.id)
    let resultadosMap: Record<string, { duracao_horas: number; duracao_min: number; viewsSum: number; liveComViews: number }> = {}
    if (liveIds.length > 0) {
      const { data: resData } = await supabase
        .from('live_resultados')
        .select('live_id, duracao_horas, duracao_min, media_views')
        .in('live_id', liveIds)
      const liveToRes = new Map((resData ?? []).map((r: { live_id: string }) => [r.live_id, r]))
      const liveToInf = new Map((livesOntem ?? []).map((l: { id: string; influencer_id: string }) => [l.id, l.influencer_id]))
      for (const [lid, res] of liveToRes) {
        const infId = liveToInf.get(lid)
        if (!infId) continue
        const cur = resultadosMap[infId] ?? { duracao_horas: 0, duracao_min: 0, viewsSum: 0, liveComViews: 0 }
        cur.duracao_horas += res.duracao_horas ?? 0
        cur.duracao_min += res.duracao_min ?? 0
        if (res.media_views) {
          cur.viewsSum += res.media_views
          cur.liveComViews += 1
        }
        resultadosMap[infId] = cur
      }
    }

    const infIdsAll = [...new Set([...metricasPorInf.keys(), ...Object.keys(resultadosMap)])]
    if (infIdsAll.length > 0) {
      const { data: perfis } = await supabase.from('influencer_perfil').select('id, nome_artistico').in('id', infIdsAll)
      for (const p of (perfis ?? []) as { id: string; nome_artistico?: string }[]) {
        if (!nameMap[p.id]) nameMap[p.id] = p.nome_artistico ?? ''
      }
    }

    const resultados: ResultadoInfluencer[] = infIdsAll.map((id) => {
      const m = metricasPorInf.get(id) ?? { visits: 0, regs: 0, ftds: 0, depQtd: 0, depVal: 0, wd: 0, ggr: 0 }
      const r = resultadosMap[id] ?? { duracao_horas: 0, duracao_min: 0, viewsSum: 0, liveComViews: 0 }
      const livesCount = (livesOntem ?? []).filter((l: { influencer_id: string }) => l.influencer_id === id).length
      const horas = r.duracao_horas + r.duracao_min / 60
      const views = r.liveComViews > 0 ? Math.round(r.viewsSum / r.liveComViews) : 0
      return {
        nome: nameMap[id] ?? '—',
        lives: livesCount,
        horas,
        views,
        acessos: m.visits,
        registros: m.regs,
        ftds: m.ftds,
        depositos_qtd: m.depQtd,
        depositos_valor: m.depVal,
        ggr: m.ggr,
      }
    })

    const totais = resultados.reduce(
      (acc, r) => ({
        lives: acc.lives + r.lives,
        horas: acc.horas + r.horas,
        views: acc.views + r.views,
        acessos: acc.acessos + r.acessos,
        registros: acc.registros + r.registros,
        ftds: acc.ftds + r.ftds,
        depositos_valor: acc.depositos_valor + r.depositos_valor,
        ggr: acc.ggr + r.ggr,
      }),
      { lives: 0, horas: 0, views: 0, acessos: 0, registros: 0, ftds: 0, depositos_valor: 0, ggr: 0 }
    )

    const result = await enviarRelatorio(destinatarios, dataHoje, dataOntem, agenda, resultados, totais)

    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        ok: true,
        data_agenda: dataHoje,
        data_consolidado: dataOntem,
        total_agenda: agenda.length,
        total_influencers: resultados.length,
        destinatarios,
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('[relatorio-diario-diretoria] Erro:', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
