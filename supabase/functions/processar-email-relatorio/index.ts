import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── CORS ────────────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}
const jsonHeaders = { 'Content-Type': 'application/json', ...CORS }

interface ExtractedData {
  daily_summary?: Array<{ data: string; turnover: number; ggr: number; margin_pct: number | null; bets: number; uap: number; bet_size: number | null; arpu: number | null }>
  monthly_summary?: Array<{ mes: string; turnover: number | null; ggr: number | null; margin_pct: number | null; bets: number | null; uap: number | null; bet_size: number | null; arpu: number | null }>
  por_tabela?: Array<{ nome_tabela: string; ggr_d1: number | null; turnover_d1: number | null; bets_d1: number | null; ggr_d2: number | null; turnover_d2: number | null; bets_d2: number | null; ggr_mtd: number | null; turnover_mtd: number | null; bets_mtd: number | null }>
}

function decodeQP(str: string): string {
  return str.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
}

function extractImageFromEmlRaw(raw: string): string | null {
  const norm = raw.replace(/\r\n/g, '\n')
  const bm = norm.match(/boundary\s*=\s*["']?([^"'\s;\n]+)["']?/i)
  const boundary = bm?.[1]?.trim()
  if (!boundary) return null
  const esc = boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = norm.split(new RegExp(`--${esc}(?:--)?\n?`, 'i')).slice(1)
  for (const part of parts) {
    const hEnd = part.indexOf('\n\n')
    if (hEnd < 0) continue
    const headers = part.slice(0, hEnd).toLowerCase()
    const body = part.slice(hEnd + 2).trim()
    if (headers.includes('message/rfc822') || headers.includes('message/partial')) {
      let inner = body
      if (headers.includes('base64')) { try { inner = atob(body.replace(/\s/g, '')) } catch { continue } }
      const nested = extractImageFromEmlRaw(inner)
      if (nested) return nested
      continue
    }
    if (!/content-type:\s*image\//.test(headers) || !body) continue
    if (headers.includes('base64')) return body.replace(/\s/g, '')
    if (headers.includes('quoted-printable')) { try { return btoa(decodeQP(body)) } catch { continue } }
    try { return btoa(body) } catch { continue }
  }
  return null
}

function extractImageFromEml(emlBase64: string): string | null {
  try { return extractImageFromEmlRaw(atob(emlBase64.replace(/^data:[^;]+;base64,/, ''))) } catch { return null }
}

async function getImage(req: Request): Promise<{ base64: string; subject?: string; from?: string } | null> {
  const ct = req.headers.get('content-type') ?? ''
  let img: string | null = null
  let subject: string | undefined
  let from: string | undefined
  if (ct.includes('application/json')) {
    const b = await req.json()
    if (b.headers || b.attachments) {
      subject = b.headers?.subject
      from = b.headers?.from
      const attachments: Array<{ file_name?: string; content?: string; content_type?: string }> = b.attachments ?? []
      const imgAttach = attachments.find(a => (a.content_type ?? '').startsWith('image/'))
      if (imgAttach?.content) img = imgAttach.content.replace(/^data:[^;]+;base64,/, '')
      if (!img) {
        const emlAttach = attachments.find(a =>
          (a.file_name ?? '').toLowerCase().endsWith('.eml') || (a.content_type ?? '').includes('rfc822'))
        if (emlAttach?.content) img = extractImageFromEml(emlAttach.content)
      }
      if (!img && b.html) {
        const m = b.html.match(/src=["']data:image\/[^;]+;base64,([^"']+)["']/i)
        if (m) img = m[1]
      }
    } else {
      subject = b.subject; from = b.from
      if (b.image_base64) img = b.image_base64.replace(/^data:image\/\w+;base64,/, '')
      else if (b.eml_base64) img = extractImageFromEml(b.eml_base64)
    }
  } else if (ct.includes('multipart/form-data')) {
    const form = await req.formData()
    const imgFile = form.get('image') as File | null
    const emlFile = form.get('eml') as File | null
    if (imgFile) { const buf = await imgFile.arrayBuffer(); img = btoa(String.fromCharCode(...new Uint8Array(buf))) }
    else if (emlFile) { const buf = await emlFile.arrayBuffer(); img = extractImageFromEml(btoa(String.fromCharCode(...new Uint8Array(buf)))) }
  }
  if (!img) return null
  return { base64: img, subject, from }
}

async function extractWithClaude(imageBase64: string): Promise<ExtractedData> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada')
  const prompt = `Esta imagem é o relatório "PLS / Daily Commercial Report (SG)" com dados em BRL.\n\n1. "Daily summaries BRL" — colunas: Day (DD/MM/YYYY), Turnover, GGR, Margin %, Bets, UAP, Bet Size, ARPU. Mapeie Margin % para margin_pct (decimal: 5.6%→5.6).\n2. "Monthly summaries BRL" — DOIS blocos lado a lado, combine por mês. Colunas: Month (Mmm YYYY), Turnover, GGR, Change % (ou Margin %), Bets, UAP, Bet Size, ARPU. O valor percentual (Change % ou Margin %) vai em margin_pct como decimal (4.0%→4.0).\n3. "Per table BRL" — colunas: Table, GGR d-1, Turnover d-1, Bets d-1, GGR d-2, Turnover d-2, Bets d-2, GGR MTD, Turnover MTD, Bets MTD. IGNORE a linha "Summary".\n\nRetorne APENAS JSON válido:\n{\n  "daily_summary": [{"data":"DD/MM/YYYY","turnover":number,"ggr":number,"margin_pct":number|null,"bets":number,"uap":number,"bet_size":number|null,"arpu":number|null}],\n  "monthly_summary": [{"mes":"Mmm YYYY","turnover":number|null,"ggr":number|null,"margin_pct":number|null,"bets":number|null,"uap":number|null,"bet_size":number|null,"arpu":number|null}],\n  "por_tabela": [{"nome_tabela":"Nome","ggr_d1":number|null,"turnover_d1":number|null,"bets_d1":number|null,"ggr_d2":number|null,"turnover_d2":number|null,"bets_d2":number|null,"ggr_mtd":number|null,"turnover_mtd":number|null,"bets_mtd":number|null}]\n}\nRegras: remova separadores de milhar (ex: 229.903→229903), percentuais como decimal, negativos mantidos, null para vazio.`
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 4096, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageBase64 } }, { type: 'text', text: prompt }] }] }),
  })
  if (!response.ok) throw new Error(`Anthropic API ${response.status}: ${await response.text()}`)
  const data = await response.json()
  const content = data.content?.[0]?.text ?? ''
  if (!content) throw new Error('Resposta vazia da API Claude')
  return JSON.parse(content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()) as ExtractedData
}

function parseDataBR(s: string): string | null {
  const m = s?.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  return m ? `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}` : null
}

function parseMes(s: string): string | null {
  const mo: Record<string,string> = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' }
  const m = s?.toLowerCase().match(/(\w{3})\s*(\d{4})/)
  if (!m) return null
  const mm = mo[m[1].slice(0,3)]
  return mm ? `${m[2]}-${mm}-01` : null
}

function getDataRelatorio(extracted: ExtractedData, fallback: string): string {
  const datas = (extracted.daily_summary ?? [])
    .map(r => parseDataBR(r.data))
    .filter((d): d is string => d !== null)
    .sort()
  return datas.length > 0 ? datas[datas.length - 1] : fallback
}

async function insertData(supabase: ReturnType<typeof createClient>, extracted: ExtractedData, dataRelatorio: string) {
  let daily = 0, monthly = 0, porTabela = 0
  const errors: string[] = []
  for (const row of extracted.daily_summary ?? []) {
    const data = parseDataBR(row.data)
    if (!data) { errors.push(`daily: data inválida "${row.data}"`); continue }
    const { error } = await supabase.from('relatorio_daily_summary').upsert(
      { data, turnover: row.turnover??0, ggr: row.ggr??0, margin_pct: row.margin_pct??null, bets: row.bets??0, uap: row.uap??0, bet_size: row.bet_size??null, arpu: row.arpu??null, source: 'email_ocr' },
      { onConflict: 'data' }
    )
    if (error) errors.push(`daily ${data}: ${error.message}`); else daily++
  }
  for (const row of extracted.monthly_summary ?? []) {
    const mes = parseMes(row.mes)
    if (!mes) { errors.push(`monthly: mês inválido "${row.mes}"`); continue }
    const { error } = await supabase.from('relatorio_monthly_summary').upsert(
      { mes, turnover: row.turnover??null, ggr: row.ggr??null, margin_pct: row.margin_pct??null, bets: row.bets??null, uap: row.uap??null, bet_size: row.bet_size??null, arpu: row.arpu??null, source: 'email_ocr' },
      { onConflict: 'mes' }
    )
    if (error) errors.push(`monthly ${mes}: ${error.message}`); else monthly++
  }
  for (const row of extracted.por_tabela ?? []) {
    const { error } = await supabase.from('relatorio_por_tabela').upsert(
      { data_relatorio: dataRelatorio, nome_tabela: row.nome_tabela, ggr_d1: row.ggr_d1??null, turnover_d1: row.turnover_d1??null, bets_d1: row.bets_d1??null, ggr_d2: row.ggr_d2??null, turnover_d2: row.turnover_d2??null, bets_d2: row.bets_d2??null, ggr_mtd: row.ggr_mtd??null, turnover_mtd: row.turnover_mtd??null, bets_mtd: row.bets_mtd??null, source: 'email_ocr' },
      { onConflict: 'data_relatorio,nome_tabela' }
    )
    if (error) errors.push(`por_tabela "${row.nome_tabela}": ${error.message}`); else porTabela++
  }
  return { daily, monthly, porTabela, errors }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405, headers: jsonHeaders })
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
  let emailSubject: string | undefined
  let emailFrom: string | undefined
  try {
    const payload = await getImage(req)
    if (!payload) return new Response(JSON.stringify({ error: 'Nenhuma imagem encontrada nos anexos.' }), { status: 400, headers: jsonHeaders })
    emailSubject = payload.subject; emailFrom = payload.from
    const extracted = await extractWithClaude(payload.base64)
    const fallback = new Date().toISOString().slice(0, 10)
    const dataRelatorio = getDataRelatorio(extracted, fallback)
    const result = await insertData(supabase, extracted, dataRelatorio)
    const status = result.errors.length ? 'erro_parcial' : 'ok'
    await supabase.from('relatorio_processamento_log').insert({
      processado_em: new Date().toISOString(),
      email_subject: emailSubject, email_from: emailFrom,
      linhas_daily: result.daily, linhas_monthly: result.monthly, linhas_por_tabela: result.porTabela,
      erros: result.errors.length ? result.errors.join('; ') : null, status
    })
    return new Response(JSON.stringify({ success: true, status, data_relatorio: dataRelatorio, inserted: { daily: result.daily, monthly: result.monthly, por_tabela: result.porTabela }, errors: result.errors.length ? result.errors : undefined }), { status: 200, headers: jsonHeaders })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[processar-email-relatorio]', msg)
    await supabase.from('relatorio_processamento_log').insert({
      processado_em: new Date().toISOString(),
      email_subject: emailSubject, email_from: emailFrom, status: 'falha', erros: msg
    }).catch(() => {})
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500, headers: jsonHeaders })
  }
})
