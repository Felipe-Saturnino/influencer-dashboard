import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Edge Function: email-agenda-diaria
// E-mail operacional: apenas bloco "Agenda do dia" (sem consolidado).

const EMAIL_TIPO = 'email_agenda_diaria' as const

interface LiveAgenda {
  horario: string
  influencer_name: string
  plataforma: string
  link?: string
}

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  }
}

function hojeISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function formatarData(iso: string): string {
  const [y, m, d] = iso.split('-')
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${parseInt(d, 10)} ${meses[parseInt(m, 10) - 1]} ${y}`
}

const TH = `padding:10px 14px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;background:#f9fafb;border-bottom:2px solid #e5e7eb;`
const TD = `padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#111827;`
const TD_R = `${TD}text-align:right;`

function trStyle(i: number): string {
  return i % 2 === 1 ? 'background:#f9f7ff;' : 'background:#ffffff;'
}

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

function gerarHTMLAgenda(
  dataHoje: string,
  agenda: LiveAgenda[],
  logoUrl: string,
  logoUrlDark: string,
): string {
  const dataHojeFmt = formatarData(dataHoje)

  const linhasAgenda =
    agenda.length === 0
      ? `<tr><td colspan="4" style="${TD}color:#9ca3af;font-style:italic;">Não há lives agendadas até o momento para hoje.</td></tr>`
      : agenda
          .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''))
          .map(
            (l, i) => `
          <tr style="${trStyle(i)}">
            <td style="${TD}font-weight:700;color:#4a2082;">${(l.horario || '').slice(0, 5)}</td>
            <td style="${TD}font-weight:600;">${l.influencer_name}</td>
            <td style="${TD}color:#6b7280;">${l.plataforma}</td>
            <td style="${TD_R}">${l.link
              ? `<a href="${l.link.startsWith('http') ? l.link : 'https://' + l.link}" style="color:#1e36f8;font-weight:600;text-decoration:none;">Abrir →</a>`
              : '—'
            }</td>
          </tr>`,
          )
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

  const logoDarkMode = logoUrl
    ? `<img src="${logoUrl}" alt="Spin Gaming" width="160" class="header-logo header-logo-dark" style="display:block;margin:0 auto 20px;max-width:160px;" />`
    : ''
  const logoLightMode = logoUrlDark
    ? `<img src="${logoUrlDark}" alt="Spin Gaming" width="160" class="header-logo header-logo-light" style="display:none;margin:0 auto 20px;max-width:160px;" />`
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Agenda do dia — ${dataHojeFmt}</title>
  <style>
    .email-header { background-color:#4a2082; background:linear-gradient(135deg,#4a2082 0%,#1e36f8 100%); padding:28px 32px; text-align:center; }
    .email-header h1, .email-header .subtitle { color:#ffffff !important; }
    .email-header .subtitle { color:rgba(255,255,255,0.80) !important; }
    .header-logo-dark { display:block !important; }
    .header-logo-light { display:none !important; }
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
        Agenda do dia — Influencers
      </h1>
      <p class="subtitle" style="margin:0;font-size:13px;letter-spacing:0.02em;">
        ${dataHojeFmt} · Time operacional · Data Intelligence Spin Gaming
      </p>
    </div>

    <div style="background:#ffffff;">
      ${secao(
        tituloSecao('📅 Agenda do dia'),
        subtitulo(`Lives agendadas para hoje (${dataHojeFmt})`) + tabelaAgenda,
        false,
      )}

      ${secao(
        '',
        `<div style="background:#f0eef8;border-radius:10px;padding:18px 20px;border:1px solid #ddd6fe;text-align:center;">
          <p style="margin:0;font-size:13px;color:#4b5563;line-height:1.6;text-align:center;">
            Dados operacionais do dia. Painel completo em
            <a href="https://data-intelligence.spingaming.com.br/" style="color:#1e36f8;font-weight:700;text-decoration:none;">
              Data Intelligence Spin Gaming
            </a>.
          </p>
        </div>`,
      )}
    </div>

    <div style="background:#f9f7ff;padding:14px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
        Data Intelligence Spin Gaming · E-mail automático (agenda) ·
        Enviado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
      </p>
    </div>
  </div>
</body>
</html>`
}

async function enviarAgenda(
  destinatarios: string[],
  dataHoje: string,
  agenda: LiveAgenda[],
): Promise<{ ok: boolean; error?: string }> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return { ok: false, error: 'RESEND_API_KEY não configurada' }

  const fromSpecific = (Deno.env.get('EMAIL_AGENDA_FROM') ?? '').trim()
  const fromFallback = (Deno.env.get('RESEND_FROM') ?? '').trim()
  const fromRaw = fromSpecific || fromFallback
  const from =
    fromRaw && /@[\w.-]+\.[a-z]{2,}/i.test(fromRaw)
      ? fromRaw
      : 'Data Intelligence <onboarding@resend.dev>'

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const logoUrl = supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/logos/Logo%20Spin%20Gaming%20White.png`
    : ''
  const logoUrlDark = supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/logos/Logo%20Spin%20Gaming.png`
    : ''

  const html = gerarHTMLAgenda(dataHoje, agenda, logoUrl, logoUrlDark)

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: destinatarios,
      subject: `Agenda do dia - ${formatarData(dataHoje)} | Influencers`,
      html,
    }),
  })

  if (res.ok) return { ok: true }
  const errText = await res.text()
  return { ok: false, error: `Resend ${res.status}: ${errText}` }
}

serve(async (req) => {
  const cors = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
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
      } catch { /* ok */
      }
    }

    let destinatarios = body.destinatarios?.filter((e) => typeof e === 'string' && e.includes('@')) ?? []
    if (destinatarios.length === 0) {
      const envDest = Deno.env.get('EMAIL_AGENDA_DESTINATARIOS')
      if (envDest) {
        destinatarios = envDest.split(/[,;]/).map((e) => e.trim().toLowerCase()).filter(Boolean)
      }
    }
    if (destinatarios.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Configure EMAIL_AGENDA_DESTINATARIOS ou envie destinatarios no body.',
        }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const dataHoje = hojeISO()

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
      horario: string
      influencer_id: string
      plataforma: string
      link?: string
    }) => ({
      horario: l.horario ?? '',
      influencer_name: nameMap[l.influencer_id] ?? '—',
      plataforma: l.plataforma ?? '',
      link: l.link,
    }))

    const result = await enviarAgenda(destinatarios, dataHoje, agenda)

    if (!result.ok) {
      try {
        await supabase.from('tech_logs').insert({
          integracao_slug: null,
          tipo: EMAIL_TIPO,
          descricao: result.error ?? 'Erro ao enviar e-mail via Resend',
        })
      } catch (e) {
        console.warn('[email-agenda-diaria] Falha ao registrar tech_log:', e)
      }
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    try {
      await supabase.from('email_envios').insert({
        data: dataHoje,
        tipo: EMAIL_TIPO,
        destinatarios_count: destinatarios.length,
      })
    } catch (e) {
      console.warn('[email-agenda-diaria] Falha ao registrar email_envios:', e)
    }

    return new Response(
      JSON.stringify({
        ok: true,
        data_agenda: dataHoje,
        total_agenda: agenda.length,
        destinatarios,
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    console.error('[email-agenda-diaria] Erro:', e)
    try {
      const supabaseErr = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      )
      await supabaseErr.from('tech_logs').insert({
        integracao_slug: null,
        tipo: EMAIL_TIPO,
        descricao: `[exceção] ${String(e)}`.slice(0, 2000),
      })
    } catch {
      /* ignora */
    }
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
