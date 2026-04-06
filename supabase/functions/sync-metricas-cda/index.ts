import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Edge Function: sync-metricas-cda | Data Intelligence (Spin Gaming)
// Integração CDA (Casa de Apostas): busca métricas da API Plywood OU Reporting API
// e faz upsert em influencer_metricas. Múltiplas UTMs por influencer são SOMADAS.
// Use CDA_USE_REPORTING_API=true para a Reporting API (recomendado se Plywood retorna 403)

// ── Tipos ────────────────────────────────────────────────────

interface SyncRequest {
  data_inicio?: string
  data_fim?: string
  utm_source?: string
  skip_orfaos?: boolean
}

interface DailyMetric {
  time: { start: string; end: string }
  visit_count: number
  registration_count: number
  deposit_count: number
  deposit_total: number
  ftd_count: number
  ftd_total: number
  withdrawal_count: number
  withdrawal_total: number
  net_deposit_total: number
  pl: number
  commissions_total: number
}

interface UtmTotais {
  utm_source: string
  total_visits: number
  total_registrations: number
  total_ftds: number
  total_deposit: number
  total_withdrawal: number
  primeiro_visto: string
  ultimo_visto: string
}

interface UtmSplitItem {
  utm_source: string
  visit_count: number
  registration_count: number
  ftd_count: number
  ftd_total: number
  deposit_total: number
  withdrawal_total: number
}

interface InfluencerPerfil {
  id: string
  utm_source: string
  nome_artistico: string
}

// ── Reporting API (af2_media_report_af) ─────────────────────────

interface ReportingApiDataItem {
  dt: string
  utm_source?: string
  visit_count: number
  registration_count: number
  deposit_count: number
  deposit_total: number
  ftd_count: number
  ftd_total: number
  withdrawal_count: number
  withdrawal_total: number
  net_deposit_total?: number
  pl?: number
  commissions_total?: number
}

function reportingItemToDailyMetric(item: ReportingApiDataItem): DailyMetric {
  const dt = item.dt?.split('T')[0] ?? ''
  return {
    time: { start: `${dt}T00:00:00.000Z`, end: `${dt}T23:59:59.999Z` },
    visit_count: item.visit_count ?? 0,
    registration_count: item.registration_count ?? 0,
    deposit_count: item.deposit_count ?? 0,
    deposit_total: item.deposit_total ?? 0,
    ftd_count: item.ftd_count ?? 0,
    ftd_total: item.ftd_total ?? 0,
    withdrawal_count: item.withdrawal_count ?? 0,
    withdrawal_total: item.withdrawal_total ?? 0,
    net_deposit_total: item.net_deposit_total ?? 0,
    pl: item.pl ?? 0,
    commissions_total: item.commissions_total ?? 0,
  }
}

/** Busca TODAS as métricas via Reporting API em uma única chamada. Retorna Map<utm_source, DailyMetric[]>. */
async function fetchMetricasReportingAPI(
  dataInicio: string,
  dataFim: string,
  apiKey: string,
  baseUrl: string,
  authFormat: 'Bearer' | 'direct',
  endpoint: 'af2_media_report_af' | 'af2_media_report_op' = 'af2_media_report_af',
  labelId: string,
  omitLabel = false
): Promise<Map<string, DailyMetric[]>> {
  const dateTo = new Date(dataFim)
  dateTo.setDate(dateTo.getDate() + 1)
  const dateToStr = dateTo.toISOString().split('T')[0]
  const params = new URLSearchParams({
    aggregation_period: 'DAY',
    group_by: 'utm_source',
    date_from: dataInicio,
    date_to: dateToStr,
  })
  if (!omitLabel) {
    params.set('label_id', labelId)
    params.set('lbl', labelId)
  }
  const authHeader = authFormat === 'direct' ? apiKey : `Bearer ${apiKey}`
  const url = `${baseUrl.replace(/\/$/, '')}/api/${endpoint}?${params}`
  const headers: Record<string, string> = { 'authorization': authHeader }
  if (!omitLabel) {
    headers['Active_label_id'] = labelId
    headers['X-Smartico-Active-Label-Id'] = labelId
    headers['Referer'] = `https://admin.aff.casadeapostas.bet.br/${labelId}/`
  }
  const response = await fetch(url, { method: 'GET', headers })
  if (response.status === 403) throw new TokenExpiradoError('403 na Reporting API')
  if (!response.ok) throw new Error(`Reporting API: ${response.status}`)
  const json = await response.json()
  const errorCode = (json as Record<string, unknown>)?.errorCode
  const errorMsg = (json as Record<string, unknown>)?.message
  if (errorCode != null || errorMsg != null) {
    throw new Error(`Reporting API erro: ${errorCode ?? 'N/A'} - ${String(errorMsg ?? 'sem detalhes')}`)
  }
  const data: ReportingApiDataItem[] = json?.data ?? json?.result ?? []
  if (data.length === 0) {
    const topKeys = json ? Object.keys(json).join(', ') : 'resposta vazia'
    console.log(`[sync-metricas-cda] Reporting API retornou 0 linhas. keys=${topKeys}`)
  }
  const byUtm = new Map<string, DailyMetric[]>()
  for (const item of data) {
    const raw = item as unknown as Record<string, unknown>
    const utm = raw?.utm_source ?? raw?.utmSource ?? 'Empty'
    const utmStr = String(utm)
    if (utmStr === 'Empty' || !utmStr) continue
    const m = reportingItemToDailyMetric(item)
    const list = byUtm.get(utmStr) ?? []
    list.push(m)
    byUtm.set(utmStr, list)
  }
  return byUtm
}

/** Obtém métricas por utm_source com fallback case-insensitive. */
function getMetricasPorUtm(cache: Map<string, DailyMetric[]>, utmSource: string): DailyMetric[] {
  const exact = cache.get(utmSource)
  if (exact) return exact
  const u = utmSource.toLowerCase()
  for (const [key, val] of cache) {
    if (key.toLowerCase() === u) return val
  }
  return []
}

/** Converte Map<utm, DailyMetric[]> em UtmTotais[] para órfãos. */
function reportingDataToUtmTotais(byUtm: Map<string, DailyMetric[]>, dataInicio: string, dataFim: string): UtmTotais[] {
  const out: UtmTotais[] = []
  for (const [utm, metrics] of byUtm) {
    out.push({
      utm_source: utm,
      total_visits: metrics.reduce((s, m) => s + (m.visit_count ?? 0), 0),
      total_registrations: metrics.reduce((s, m) => s + (m.registration_count ?? 0), 0),
      total_ftds: metrics.reduce((s, m) => s + (m.ftd_count ?? 0), 0),
      total_deposit: parseFloat(metrics.reduce((s, m) => s + (m.deposit_total ?? 0), 0).toFixed(2)),
      total_withdrawal: parseFloat(metrics.reduce((s, m) => s + (m.withdrawal_total ?? 0), 0).toFixed(2)),
      primeiro_visto: dataInicio,
      ultimo_visto: dataFim,
    })
  }
  return out.sort((a, b) => b.total_ftds - a.total_ftds).slice(0, 500)
}

class TokenExpiradoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TokenExpiradoError'
  }
}

async function enviarAlertaAuthCda(): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return
  const usaBasicAuth = !!(Deno.env.get('SMARTICO_USERNAME') && Deno.env.get('SMARTICO_PASSWORD'))
  const usaApiKey = !!Deno.env.get('CDA_INFLUENCERS_API_KEY')
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const html = (usaApiKey || usaBasicAuth)
    ? `<div><h2>⚠️ Sync CDA Interrompido</h2><p>Falhou às ${agora}. Motivo: 403 Forbidden — credencial inválida.</p></div>`
    : `<div><h2>⚠️ Sync CDA Interrompido</h2><p>Falhou às ${agora}. Token expirado.</p></div>`
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Data Intelligence <onboarding@resend.dev>',
        to: ['felipe.saturnino@spingaming.com.br'],
        subject: '⚠️ [Data Intelligence] Erro de autenticação CDA (403)',
        html,
      }),
    })
    if (!res.ok) console.error(`[sync-metricas-cda] Falha e-mail: ${res.status}`)
  } catch (e) {
    console.error(`[sync-metricas-cda] Erro Resend: ${e}`)
  }
}

type CdaAuthInput = {
  apiKey?: string
  authFormat?: 'Bearer' | 'direct'
  basicAuth?: { username: string; password: string }
  token?: string
}

function buildHeaders(auth: CdaAuthInput, labelId: string): HeadersInit {
  const base: Record<string, string> = {
    'Content-Type': 'application/json;charset=UTF-8',
    'Active_label_id': labelId,
    'X-Smartico-Active-Label-Id': labelId,
    'Origin': 'https://admin.aff.casadeapostas.bet.br',
    'Referer': `https://data-api3.aff.casadeapostas.bet.br/?label_id=${labelId}&noNav=true`,
  }
  if (auth.apiKey) {
    const format = auth.authFormat ?? 'Bearer'
    base['Authorization'] = format === 'direct' ? auth.apiKey : `Bearer ${auth.apiKey}`
  } else if (auth.basicAuth) {
    base['Authorization'] = `Basic ${btoa(`${auth.basicAuth.username}:${auth.basicAuth.password}`)}`
  } else if (auth.token) {
    base['Cookie'] = `__smtaff_bo_token=${auth.token}`
  }
  return base
}

const METRICS_APPLIES = [
  { name: 'visit_count',        expression: { op: 'sum', operand: { op: 'filter', operand: { op: 'ref', name: 'main' }, expression: { op: 'is', operand: { op: 'ref', name: 'fact_type_id' }, expression: { op: 'literal', value: 1 } } }, expression: { op: 'ref', name: 'c1' } } },
  { name: 'registration_count', expression: { op: 'sum', operand: { op: 'filter', operand: { op: 'ref', name: 'main' }, expression: { op: 'is', operand: { op: 'ref', name: 'fact_type_id' }, expression: { op: 'literal', value: 6 } } }, expression: { op: 'ref', name: 'c1' } } },
  { name: 'deposit_count',      expression: { op: 'sum', operand: { op: 'ref', name: 'main' }, expression: { op: 'ref', name: 'deposit_count' } } },
  { name: 'deposit_total',      expression: { op: 'add', operand: { op: 'sum', operand: { op: 'ref', name: 'main' }, expression: { op: 'ref', name: 'first_deposit' } }, expression: { op: 'sum', operand: { op: 'ref', name: 'main' }, expression: { op: 'ref', name: 'deposits' } } } },
  { name: 'ftd_count',          expression: { op: 'sum', operand: { op: 'ref', name: 'main' }, expression: { op: 'ref', name: 'is_ftd' } } },
  { name: 'ftd_total',          expression: { op: 'sum', operand: { op: 'ref', name: 'main' }, expression: { op: 'ref', name: 'first_deposit' } } },
  { name: 'withdrawal_count',   expression: { op: 'sum', operand: { op: 'ref', name: 'main' }, expression: { op: 'ref', name: 'withdrawal_count' } } },
  { name: 'withdrawal_total',   expression: { op: 'sum', operand: { op: 'ref', name: 'main' }, expression: { op: 'ref', name: 'withdrawals' } } },
  { name: 'net_deposit_total',  expression: { op: 'sum', operand: { op: 'ref', name: 'main' }, expression: { op: 'ref', name: 'net_deposits' } } },
  { name: 'pl',                 expression: { op: 'sum', operand: { op: 'ref', name: 'main' }, expression: { op: 'ref', name: 'net_pnl' } } },
]

function buildApplyChain(baseOp: object, applies: Array<{name: string, expression: object}>): object {
  return applies.reduce((acc, { name, expression }) => ({ op: 'apply', operand: acc, expression, name }), baseOp)
}

function buildTimeFilter(dataInicio: string, dataFim: string): object {
  return {
    op: 'overlap',
    operand: { op: 'ref', name: 'time' },
    expression: {
      op: 'literal', type: 'SET',
      value: { setType: 'TIME_RANGE', elements: [{ start: `${dataInicio}T00:00:00.000Z`, end: `${dataFim}T23:59:59.999Z` }] },
    },
  }
}

type CdaAuth = CdaAuthInput

async function fetchMetricasPorUtm(utmSource: string, dataInicio: string, dataFim: string, auth: CdaAuth, labelId: string): Promise<DailyMetric[]> {
  const utmFilter = {
    op: 'overlap',
    operand: { op: 'fallback', operand: { op: 'ref', name: 'utm_source' }, expression: { op: 'literal', value: 'Empty' } },
    expression: { op: 'literal', type: 'SET', value: { setType: 'STRING', elements: [utmSource] } },
  }
  const mainFilter = { op: 'and', operand: buildTimeFilter(dataInicio, dataFim), expression: utmFilter }
  const splitBase = {
    op: 'split', operand: { op: 'ref', name: 'main' }, name: 'time',
    expression: { op: 'timeBucket', operand: { op: 'ref', name: 'time' }, duration: 'P1D' }, dataName: 'main',
  }
  const sortedSplit = { op: 'sort', operand: buildApplyChain(splitBase, METRICS_APPLIES), expression: { op: 'ref', name: 'time' }, direction: 'descending' }
  const filteredMain = { op: 'filter', operand: { op: 'ref', name: 'main' }, expression: mainFilter }
  const outerBase = buildApplyChain(
    { op: 'literal', value: { attributes: [], data: [{}] }, type: 'DATASET' },
    [{ name: 'MillisecondsInInterval', expression: { op: 'literal', value: 2592000000 } }]
  )
  const withMain = { op: 'apply', operand: outerBase, expression: filteredMain, name: 'main' }
  const withSplit = { op: 'apply', operand: withMain, expression: sortedSplit, name: 'SPLIT' }
  const payload = { dataCube: 'data-cube-affiliate-general-affiliate-view4', timezone: 'Etc/UTC', version: '1.31.0', settingsVersion: 0, expression: withSplit }
  const response = await fetch('https://data-api3.aff.casadeapostas.bet.br/plywood?by=', { method: 'POST', headers: buildHeaders(auth, labelId), body: JSON.stringify(payload) })
  if (response.status === 403) throw new TokenExpiradoError(`403 para utm_source=${utmSource}`)
  if (!response.ok) throw new Error(`Erro API para ${utmSource}: ${response.status}`)
  const data = await response.json()
  const splitData = data?.result?.data?.[0]?.SPLIT?.data
  return Array.isArray(splitData) ? splitData : []
}

async function fetchTodosUtms(dataInicio: string, dataFim: string, auth: CdaAuth, labelId: string): Promise<UtmTotais[]> {
  const filteredMain = { op: 'filter', operand: { op: 'ref', name: 'main' }, expression: buildTimeFilter(dataInicio, dataFim) }
  const splitBase = {
    op: 'split', operand: { op: 'ref', name: 'main' }, name: 'utm_source',
    expression: { op: 'fallback', operand: { op: 'ref', name: 'utm_source' }, expression: { op: 'literal', value: 'Empty' } },
    dataName: 'main',
  }
  const sortedSplit = { op: 'sort', operand: buildApplyChain(splitBase, METRICS_APPLIES), expression: { op: 'ref', name: 'ftd_count' }, direction: 'descending' }
  const limitedSplit = { op: 'limit', operand: sortedSplit, value: 500 }
  const outerBase = buildApplyChain(
    { op: 'literal', value: { attributes: [], data: [{}] }, type: 'DATASET' },
    [{ name: 'MillisecondsInInterval', expression: { op: 'literal', value: 2592000000 } }]
  )
  const withMain = { op: 'apply', operand: outerBase, expression: filteredMain, name: 'main' }
  const withSplit = { op: 'apply', operand: withMain, expression: limitedSplit, name: 'SPLIT' }
  const payload = { dataCube: 'data-cube-affiliate-general-affiliate-view4', timezone: 'Etc/UTC', version: '1.31.0', settingsVersion: 0, expression: withSplit }
  console.log('[sync-metricas-cda] Fase 2: Varrendo UTMs órfãos na CDA...')
  const response = await fetch('https://data-api3.aff.casadeapostas.bet.br/plywood?by=', { method: 'POST', headers: buildHeaders(auth, labelId), body: JSON.stringify(payload) })
  if (response.status === 403) throw new TokenExpiradoError('403 na varredura de UTMs')
  if (!response.ok) throw new Error(`Erro na varredura: ${response.status}`)
  const data = await response.json()
  const splitData: UtmSplitItem[] = data?.result?.data?.[0]?.SPLIT?.data ?? []
  return splitData
    .filter(item => item.utm_source && item.utm_source !== 'Empty')
    .map(item => ({
      utm_source: item.utm_source,
      total_visits: Math.round(item.visit_count ?? 0),
      total_registrations: Math.round(item.registration_count ?? 0),
      total_ftds: Math.round(item.ftd_count ?? 0),
      total_deposit: parseFloat((item.deposit_total ?? 0).toFixed(2)),
      total_withdrawal: parseFloat((item.withdrawal_total ?? 0).toFixed(2)),
      primeiro_visto: dataInicio,
      ultimo_visto: dataFim,
    }))
}

async function detectarERegistrarOrfaos(
  supabase: ReturnType<typeof createClient>,
  todosUtmsCda: UtmTotais[],
  utmsMapeados: Set<string>
): Promise<{ novos: string[]; atualizados: string[]; erros: string[] }> {
  const novos: string[] = []
  const atualizados: string[] = []
  const erros: string[] = []
  const { data: aliasesExistentes } = await supabase.from('utm_aliases').select('utm_source, status')
  const aliasesMap = new Map<string, string>((aliasesExistentes ?? []).map((a: { utm_source: string; status: string }) => [a.utm_source, a.status]))
  const orfaos = todosUtmsCda.filter(u => !utmsMapeados.has(u.utm_source))
  console.log(`[sync-metricas-cda] Órfãos: ${orfaos.length} (total CDA: ${todosUtmsCda.length})`)
  for (const utm of orfaos) {
    const statusAtual = aliasesMap.get(utm.utm_source)
    if (statusAtual === 'mapeado' || statusAtual === 'ignorado') continue
    const { error } = await supabase.from('utm_aliases').upsert({
      utm_source: utm.utm_source,
      operadora_slug: 'casa_apostas',
      status: 'pendente',
      total_visits: utm.total_visits,
      total_registrations: utm.total_registrations,
      total_ftds: utm.total_ftds,
      total_deposit: utm.total_deposit,
      total_withdrawal: utm.total_withdrawal,
      primeiro_visto: utm.primeiro_visto,
      ultimo_visto: utm.ultimo_visto,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'utm_source', ignoreDuplicates: false })
    if (error) {
      erros.push(`Falha órfão ${utm.utm_source}: ${error.message}`)
    } else {
      if (statusAtual) atualizados.push(utm.utm_source)
      else novos.push(utm.utm_source)
    }
    await new Promise(r => setTimeout(r, 50))
  }
  return { novos, atualizados, erros }
}

async function upsertUtmMetricasDiarias(
  supabase: ReturnType<typeof createClient>,
  byUtm: Map<string, DailyMetric[]>,
  utmToInfluencerId: Map<string, string>
): Promise<{ inseridos: number; erros: string[] }> {
  const rows: Array<Record<string, unknown>> = []
  for (const [utm, metrics] of byUtm) {
    const influencerId = utmToInfluencerId.get(utm) ?? null
    for (const m of metrics) {
      const data = m.time.start.split('T')[0]
      rows.push({
        utm_source: utm,
        data,
        operadora_slug: 'casa_apostas',
        visit_count: Math.round(m.visit_count ?? 0),
        registration_count: Math.round(m.registration_count ?? 0),
        ftd_count: Math.round(m.ftd_count ?? 0),
        ftd_total: parseFloat((m.ftd_total ?? 0).toFixed(2)),
        deposit_count: Math.round(m.deposit_count ?? 0),
        deposit_total: parseFloat((m.deposit_total ?? 0).toFixed(2)),
        withdrawal_count: Math.round(m.withdrawal_count ?? 0),
        withdrawal_total: parseFloat((m.withdrawal_total ?? 0).toFixed(2)),
        influencer_id: influencerId,
        fonte: 'api',
      })
    }
  }
  if (rows.length === 0) return { inseridos: 0, erros: [] }
  const { error } = await supabase.from('utm_metricas_diarias').upsert(rows, {
    onConflict: 'utm_source,data,operadora_slug',
    ignoreDuplicates: false,
  })
  if (error) return { inseridos: 0, erros: [`utm_metricas_diarias: ${error.message}`] }
  return { inseridos: rows.length, erros: [] }
}

/** Agrega métricas de múltiplas UTMs por (influencer_id, data) e faz upsert. Múltiplas UTMs são SOMADAS. */
async function upsertMetricasAgregadas(
  supabase: ReturnType<typeof createClient>,
  influencerId: string,
  operadoraSlug: string,
  metricasAgregadas: Map<string, DailyMetric>
): Promise<{ inseridos: number; erros: string[] }> {
  if (metricasAgregadas.size === 0) return { inseridos: 0, erros: [] }
  const rows = Array.from(metricasAgregadas.entries()).map(([data, m]) => ({
    influencer_id: influencerId,
    data,
    operadora_slug: operadoraSlug,
    visit_count: Math.round(m.visit_count ?? 0),
    registration_count: Math.round(m.registration_count ?? 0),
    ftd_count: Math.round(m.ftd_count ?? 0),
    ftd_total: parseFloat((m.ftd_total ?? 0).toFixed(2)),
    deposit_count: Math.round(m.deposit_count ?? 0),
    deposit_total: parseFloat((m.deposit_total ?? 0).toFixed(2)),
    withdrawal_count: Math.round(m.withdrawal_count ?? 0),
    withdrawal_total: parseFloat((m.withdrawal_total ?? 0).toFixed(2)),
    fonte: 'api',
  }))
  const { error } = await supabase.from('influencer_metricas').upsert(rows, {
    onConflict: 'influencer_id,data,operadora_slug',
    ignoreDuplicates: false
  })
  if (error) return { inseridos: 0, erros: [`Upsert influencer_metricas: ${error.message}`] }
  return { inseridos: rows.length, erros: [] }
}

/** Agrega métricas de várias UTMs por data (soma). */
function agregarMetricasPorData(metricasArrays: DailyMetric[][]): Map<string, DailyMetric> {
  const byData = new Map<string, DailyMetric>()
  for (const arr of metricasArrays) {
    for (const m of arr) {
      const data = m.time.start.split('T')[0]
      const exist = byData.get(data)
      if (!exist) {
        byData.set(data, { ...m })
      } else {
        exist.visit_count += m.visit_count ?? 0
        exist.registration_count += m.registration_count ?? 0
        exist.deposit_count += m.deposit_count ?? 0
        exist.deposit_total += (m.deposit_total ?? 0)
        exist.ftd_count += m.ftd_count ?? 0
        exist.ftd_total += (m.ftd_total ?? 0)
        exist.withdrawal_count += m.withdrawal_count ?? 0
        exist.withdrawal_total += (m.withdrawal_total ?? 0)
      }
    }
  }
  return byData
}

async function gravarTechLog(supabase: ReturnType<typeof createClient>, tipo: string, descricao: string): Promise<void> {
  try {
    await supabase.from('tech_logs').insert({ integracao_slug: 'casa_apostas', tipo, descricao })
  } catch (e) {
    console.error('[sync-metricas-cda] Falha tech_log:', e)
  }
}

async function gravarSyncLog(supabase: ReturnType<typeof createClient>, opts: {
  status: 'ok' | 'falha'
  registros_inseridos: number
  registros_atualizados?: number
  erros_count: number
  mensagem_erro?: string
  duracao_ms: number
  periodo_inicio: string
  periodo_fim: string
}): Promise<void> {
  try {
    await supabase.from('sync_logs').insert({
      integracao_slug: 'casa_apostas',
      status: opts.status,
      registros_inseridos: opts.registros_inseridos,
      registros_atualizados: opts.registros_atualizados ?? 0,
      erros_count: opts.erros_count,
      mensagem_erro: opts.mensagem_erro ?? null,
      duracao_ms: opts.duracao_ms,
      periodo_inicio: opts.periodo_inicio,
      periodo_fim: opts.periodo_fim,
    })
  } catch (e) {
    console.error('[sync-metricas-cda] Falha sync_log:', e)
  }
}

// ── Handler principal ─────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }
  try {
    let params: SyncRequest = {}
    try { params = await req.json() } catch { /* Body vazio ok */ }
    const hoje = new Date()
    const defaultInicio = '2025-12-01'
    const dataFim = params.data_fim ?? hoje.toISOString().split('T')[0]
    const dataInicio = params.data_inicio ?? defaultInicio
    const inicioMs = Date.now()

    const cdaApiKey = Deno.env.get('CDA_INFLUENCERS_API_KEY')
    const smaticoToken = Deno.env.get('SMARTICO_TOKEN')
    const labelId = Deno.env.get('SMARTICO_LABEL_ID') ?? '573703'
    const authFormat = (Deno.env.get('CDA_AUTH_FORMAT') ?? 'Bearer').toLowerCase() === 'direct' ? 'direct' as const : 'Bearer' as const
    const smarticoUsername = Deno.env.get('SMARTICO_USERNAME')
    const smarticoPassword = Deno.env.get('SMARTICO_PASSWORD')
    const cdaAuth: CdaAuth = (smarticoUsername && smarticoPassword)
      ? { basicAuth: { username: smarticoUsername, password: smarticoPassword } }
      : cdaApiKey ? { apiKey: cdaApiKey, authFormat }
      : smaticoToken ? { token: smaticoToken }
      : (() => { throw new Error('Configure CDA_INFLUENCERS_API_KEY ou SMARTICO_USERNAME+SMARTICO_PASSWORD no Supabase Secrets.') })()

    const useReportingApi = Deno.env.get('CDA_USE_REPORTING_API') === 'true'
    const reportingBaseUrl = Deno.env.get('SMARTICO_REPORTING_API_URL') ?? 'https://boapi3.smartico.ai'
    const reportingEndpoint = (Deno.env.get('CDA_REPORTING_ENDPOINT') ?? 'af2_media_report_af').toLowerCase()
    const endpoint = reportingEndpoint.includes('_op') ? 'af2_media_report_op' as const : 'af2_media_report_af' as const

    if (useReportingApi && !cdaApiKey) {
      throw new Error('Reporting API exige CDA_INFLUENCERS_API_KEY.')
    }

    console.log(`[sync-metricas-cda] v2.0.0 CDA | ${useReportingApi ? 'Reporting API' : 'Plywood'} | Período: ${dataInicio} → ${dataFim}`)

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

    let reportingCache: Map<string, DailyMetric[]> | null = null
    if (useReportingApi && cdaApiKey) {
      const strategies: { ep: 'af2_media_report_op' | 'af2_media_report_af'; omitLabel: boolean }[] =
        endpoint === 'af2_media_report_op'
          ? [{ ep: 'af2_media_report_op', omitLabel: false }, { ep: 'af2_media_report_af', omitLabel: false }, { ep: 'af2_media_report_af', omitLabel: true }]
          : [{ ep: 'af2_media_report_af', omitLabel: false }, { ep: 'af2_media_report_af', omitLabel: true }]
      let lastErr: Error | null = null
      for (const { ep, omitLabel } of strategies) {
        try {
          reportingCache = await fetchMetricasReportingAPI(dataInicio, dataFim, cdaApiKey, reportingBaseUrl, authFormat, ep, labelId, omitLabel)
          console.log(`[sync-metricas-cda] Reporting API: ${reportingCache.size} UTMs`)
          lastErr = null
          break
        } catch (err) {
          lastErr = err instanceof Error ? err : new Error(String(err))
          if (String(lastErr.message).includes('Access to this label')) continue
          if (err instanceof TokenExpiradoError) {
            await enviarAlertaAuthCda()
            await gravarTechLog(supabase, 'auth', '403 na Reporting API')
            await gravarSyncLog(supabase, { status: 'falha', registros_inseridos: 0, erros_count: 1, mensagem_erro: '403', duracao_ms: Date.now() - inicioMs, periodo_inicio: dataInicio, periodo_fim: dataFim })
            return new Response(JSON.stringify({ ok: false, erro: '403 - Verifique CDA_INFLUENCERS_API_KEY' }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
          }
          throw err
        }
      }
      if (lastErr && !reportingCache) throw lastErr
    }

    const OPERADORA_CDA = 'casa_apostas'
    let query = supabase.from('influencer_perfil').select('id, nome_artistico, utm_source').not('utm_source', 'is', null)
    if (params.utm_source) query = query.eq('utm_source', params.utm_source)
    const { data: influencers, error: errInfluencers } = await query
    if (errInfluencers) throw new Error(`Erro influencers: ${errInfluencers.message}`)

    const { data: aliasesMapeados } = await supabase.from('utm_aliases').select('utm_source, influencer_id').eq('status', 'mapeado').or('operadora_slug.eq.casa_apostas,operadora_slug.is.null').not('influencer_id', 'is', null)
    const utmsMapeados = new Set<string>([
      ...(influencers ?? []).map((i: InfluencerPerfil) => i.utm_source),
      ...(aliasesMapeados ?? []).map((a: { utm_source: string }) => a.utm_source),
    ])

    const utmToInfluencerId = new Map<string, string>()
    ;(influencers ?? []).forEach((i: InfluencerPerfil) => utmToInfluencerId.set(i.utm_source, i.id))
    ;(aliasesMapeados ?? []).forEach((a: { utm_source: string; influencer_id: string }) => utmToInfluencerId.set(a.utm_source, a.influencer_id))

    const infToUtms = new Map<string, Set<string>>()
    ;(influencers ?? []).forEach((i: InfluencerPerfil) => {
      if (!infToUtms.has(i.id)) infToUtms.set(i.id, new Set())
      infToUtms.get(i.id)!.add(i.utm_source)
    })
    ;(aliasesMapeados ?? []).forEach((a: { utm_source: string; influencer_id: string }) => {
      if (!infToUtms.has(a.influencer_id)) infToUtms.set(a.influencer_id, new Set())
      infToUtms.get(a.influencer_id)!.add(a.utm_source)
    })

    if (params.utm_source) {
      infToUtms.forEach((utms, id) => {
        if (!utms.has(params.utm_source!)) infToUtms.delete(id)
        else infToUtms.set(id, new Set([params.utm_source!]))
      })
    }

    if (useReportingApi && reportingCache && reportingCache.size > 0) {
      const { inseridos: diarias, erros: errosDiarias } = await upsertUtmMetricasDiarias(supabase, reportingCache, utmToInfluencerId)
      if (errosDiarias.length > 0) console.warn('[sync-metricas-cda] utm_metricas_diarias:', errosDiarias)
      else if (diarias > 0) console.log(`[sync-metricas-cda] utm_metricas_diarias: ${diarias} linhas`)
    }

    let totalInseridos = 0
    const todosErros: string[] = []
    const resultados: Array<{ utm_source: string; nome: string; dias_sincronizados: number; erros: string[] }> = []
    const infNomeCache = new Map<string, string>((influencers ?? []).map((i: InfluencerPerfil) => [i.id, i.nome_artistico]))

    for (const [influencerId, utms] of infToUtms) {
      try {
        const metricasArrays: DailyMetric[][] = []
        for (const utm of utms) {
          const metricas = useReportingApi && reportingCache
            ? getMetricasPorUtm(reportingCache, utm)
            : await fetchMetricasPorUtm(utm, dataInicio, dataFim, cdaAuth, labelId)
          if (metricas.length > 0) metricasArrays.push(metricas)
          if (!useReportingApi) await new Promise(r => setTimeout(r, 300))
        }
        const agregadas = agregarMetricasPorData(metricasArrays)
        const { inseridos, erros } = await upsertMetricasAgregadas(supabase, influencerId, OPERADORA_CDA, agregadas)
        totalInseridos += inseridos
        todosErros.push(...erros)
        const nome = infNomeCache.get(influencerId) ?? '—'
        resultados.push({ utm_source: Array.from(utms).join(', '), nome, dias_sincronizados: inseridos, erros })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (err instanceof TokenExpiradoError) {
          await enviarAlertaAuthCda()
          await gravarTechLog(supabase, 'auth', msg)
          await gravarSyncLog(supabase, { status: 'falha', registros_inseridos: totalInseridos, erros_count: 1, mensagem_erro: msg, duracao_ms: Date.now() - inicioMs, periodo_inicio: dataInicio, periodo_fim: dataFim })
          return new Response(JSON.stringify({ ok: false, erro: msg }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
        }
        todosErros.push(msg)
        const nome = infNomeCache.get(influencerId) ?? '—'
        resultados.push({ utm_source: Array.from(utms).join(', '), nome, dias_sincronizados: 0, erros: [msg] })
      }
    }

    let orfaosNovos: string[] = []
    let orfaosAtualizados: string[] = []
    let totalUtmsCda = 0

    if (!params.utm_source && !params.skip_orfaos) {
      try {
        const todosUtmsCda = useReportingApi && reportingCache
          ? reportingDataToUtmTotais(reportingCache, dataInicio, dataFim)
          : await fetchTodosUtms(dataInicio, dataFim, cdaAuth, labelId)
        totalUtmsCda = todosUtmsCda.length
        const resultado = await detectarERegistrarOrfaos(supabase, todosUtmsCda, utmsMapeados)
        orfaosNovos = resultado.novos
        orfaosAtualizados = resultado.atualizados
      } catch (err) {
        if (err instanceof TokenExpiradoError) {
          await enviarAlertaAuthCda()
          await gravarSyncLog(supabase, { status: 'falha', registros_inseridos: totalInseridos, erros_count: 1, mensagem_erro: '403 varredura', duracao_ms: Date.now() - inicioMs, periodo_inicio: dataInicio, periodo_fim: dataFim })
          return new Response(JSON.stringify({ ok: false, erro: '403 na varredura' }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
        }
        todosErros.push(String(err))
      }
    }

    const duracaoMs = Date.now() - inicioMs
    await gravarSyncLog(supabase, {
      status: 'ok',
      registros_inseridos: totalInseridos,
      erros_count: todosErros.length,
      mensagem_erro: todosErros.length > 0 ? todosErros.slice(0, 3).join('; ') : undefined,
      duracao_ms: duracaoMs,
      periodo_inicio: dataInicio,
      periodo_fim: dataFim,
    })

    console.log(`[sync-metricas-cda] Concluído: ${totalInseridos} registros | ${orfaosNovos.length} novos órfãos`)

    return new Response(JSON.stringify({
      ok: true,
      versao: 'v2.0.0',
      integracao: 'casa_apostas',
      api_usada: useReportingApi ? 'Reporting API' : 'Plywood',
      periodo: { data_inicio: dataInicio, data_fim: dataFim },
      fase1_influencers: {
        total: infToUtms.size,
        registros_upserted: totalInseridos,
        erros: todosErros.length,
        detalhes: resultados,
      },
      fase2_orfaos: (params.utm_source || params.skip_orfaos) ? 'pulada' : {
        total_utms_cda: totalUtmsCda,
        novos_detectados: orfaosNovos.length,
        atualizados: orfaosAtualizados.length,
        novos: orfaosNovos,
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[sync-metricas-cda] Erro fatal: ${msg}`)
    return new Response(JSON.stringify({ ok: false, erro: msg }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
  }
})
