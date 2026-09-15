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
  /**
   * Conta TAP na CDA:
   * — influencers (default): CDA_INFLUENCERS_API_KEY → sync_logs casa_apostas
   * — afiliados: CDA_AFILIADOS_API_KEY → sync_logs casa_apostas_afiliados
   * Métricas gravam sempre com operadora_slug = casa_apostas.
   */
  conta?: 'influencers' | 'afiliados'
  /** Só leitura: Reporting API com group_by utm_source,ext_customer_id. Não grava. */
  probe_ext_customer?: boolean
  /** Pula a fase jogadores (IDs por UTM). O sync agregado continua. */
  skip_jogadores?: boolean
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

function mascaraIdTap(id: unknown): string {
  const s = String(id ?? '').trim()
  if (!s) return '(vazio)'
  if (s.length <= 4) return '****'
  return `${s.slice(0, 2)}***${s.slice(-2)}`
}

type ReportingRawMeta = {
  ok: boolean
  endpoint: string
  omitLabel: boolean
  httpStatus: number
  erro?: string
  linhas: number
  chavesPrimeiraLinha: string[]
}

async function fetchReportingRaw(
  dataInicio: string,
  dataFim: string,
  apiKey: string,
  baseUrl: string,
  authFormat: 'Bearer' | 'direct',
  endpoint: 'af2_media_report_af' | 'af2_media_report_op',
  labelId: string,
  omitLabel: boolean,
  groupBy: string,
): Promise<{ meta: ReportingRawMeta; data: Record<string, unknown>[] }> {
  const dateTo = new Date(dataFim)
  dateTo.setDate(dateTo.getDate() + 1)
  const dateToStr = dateTo.toISOString().split('T')[0]
  const params = new URLSearchParams({
    aggregation_period: 'DAY',
    group_by: groupBy,
    date_from: dataInicio,
    date_to: dateToStr,
  })
  if (!omitLabel) {
    params.set('label_id', labelId)
    params.set('lbl', labelId)
  }
  const authHeader = authFormat === 'direct' ? apiKey : `Bearer ${apiKey}`
  const url = `${baseUrl.replace(/\/$/, '')}/api/${endpoint}?${params}`
  const headers: Record<string, string> = { authorization: authHeader }
  if (!omitLabel) {
    headers['Active_label_id'] = labelId
    headers['X-Smartico-Active-Label-Id'] = labelId
    headers['Referer'] = `https://admin.aff.casadeapostas.bet.br/${labelId}/`
  }
  const response = await fetch(url, { method: 'GET', headers })
  const httpStatus = response.status
  let json: Record<string, unknown> = {}
  try {
    json = await response.json() as Record<string, unknown>
  } catch {
    json = {}
  }
  const errorCode = json?.errorCode
  const errorMsg = json?.message
  const dataRaw = json?.data ?? json?.result
  const data = Array.isArray(dataRaw) ? dataRaw as Record<string, unknown>[] : []
  const erro = !response.ok
    ? `HTTP ${httpStatus}`
    : (errorCode != null || errorMsg != null)
      ? `Reporting API erro: ${errorCode ?? 'N/A'} - ${String(errorMsg ?? 'sem detalhes')}`
      : undefined
  const primeira = data[0] ?? {}
  return {
    meta: {
      ok: !erro,
      endpoint,
      omitLabel,
      httpStatus,
      erro,
      linhas: data.length,
      chavesPrimeiraLinha: Object.keys(primeira),
    },
    data,
  }
}

function resumirProbeExtCustomer(data: Record<string, unknown>[], groupBy: string) {
  const utms = new Set<string>()
  const ids = new Set<string>()
  let comId = 0
  let semId = 0
  let somaRegistros = 0
  const amostra: Array<{ utm: string; ext: string; regs: number }> = []
  for (const row of data) {
    const utm = String(row.utm_source ?? row.utmSource ?? '').trim()
    const ext = String(row.ext_customer_id ?? row.extCustomerId ?? '').trim()
    const regs = Number(row.registration_count ?? 0)
    if (utm) utms.add(utm)
    if (ext) {
      ids.add(ext)
      comId++
    } else {
      semId++
    }
    somaRegistros += Number.isFinite(regs) ? regs : 0
    if (amostra.length < 5) {
      amostra.push({ utm: utm || '(sem utm)', ext: mascaraIdTap(ext), regs })
    }
  }
  return {
    group_by: groupBy,
    linhas: data.length,
    utms_distintos: utms.size,
    ext_customer_id_distintos: ids.size,
    linhas_com_ext_customer_id: comId,
    linhas_sem_ext_customer_id: semId,
    soma_registration_count: somaRegistros,
    amostra_mascarada: amostra,
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

/** Registra falha 403 na CDA — monitoramento via tech_logs / sync_logs / Status Técnico (sem e-mail). */
function logAlertaAuthCda(motivo: string): void {
  console.warn(`[sync-metricas-cda] Auth CDA (403): ${motivo}`)
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

type UtmAliasOrfaoRow = {
  utm_source: string
  status: string
  influencer_id: string | null
  mapeado_por: string | null
}

async function detectarERegistrarOrfaos(
  supabase: ReturnType<typeof createClient>,
  todosUtmsCda: UtmTotais[],
  utmsMapeados: Set<string>,
  conta: 'influencers' | 'afiliados',
): Promise<{ novos: string[]; atualizados: string[]; erros: string[] }> {
  const novos: string[] = []
  const atualizados: string[] = []
  const erros: string[] = []
  const { data: aliasesExistentes } = await supabase
    .from('utm_aliases')
    .select('utm_source, status, influencer_id, mapeado_por')
  const aliasesMap = new Map<string, UtmAliasOrfaoRow>(
    (aliasesExistentes ?? []).map((a: UtmAliasOrfaoRow) => [a.utm_source, a]),
  )
  const mapeadosLower = new Set([...utmsMapeados].map((u) => u.toLowerCase()))
  const orfaos = todosUtmsCda.filter(
    (u) => !utmsMapeados.has(u.utm_source) && !mapeadosLower.has(u.utm_source.toLowerCase()),
  )
  console.log(`[sync-metricas-cda] Órfãos (${conta}): ${orfaos.length} (total CDA: ${todosUtmsCda.length})`)
  for (const utm of orfaos) {
    const aliasAtual = aliasesMap.get(utm.utm_source)
      ?? [...aliasesMap.entries()].find(([k]) => k.toLowerCase() === utm.utm_source.toLowerCase())?.[1]
    const statusAtual = aliasAtual?.status
    if (statusAtual === 'mapeado' || statusAtual === 'ignorado') continue

    const metricasPayload = {
      total_visits: utm.total_visits,
      total_registrations: utm.total_registrations,
      total_ftds: utm.total_ftds,
      total_deposit: utm.total_deposit,
      total_withdrawal: utm.total_withdrawal,
      primeiro_visto: utm.primeiro_visto,
      ultimo_visto: utm.ultimo_visto,
      atualizado_em: new Date().toISOString(),
      cda_conta: conta,
    }

    // Link emitido em Links e Materiais: nunca rebaixar para pendente (corrige race com sync)
    const influencerEmitido = aliasAtual?.influencer_id ?? aliasAtual?.mapeado_por ?? null
    if (influencerEmitido) {
      const { error } = await supabase.from('utm_aliases').update({
        ...metricasPayload,
        status: 'mapeado',
        influencer_id: influencerEmitido,
        operadora_slug: 'casa_apostas',
      }).eq('utm_source', aliasAtual?.utm_source ?? utm.utm_source)
      if (error) {
        erros.push(`Falha órfão emitido ${utm.utm_source}: ${error.message}`)
      } else {
        atualizados.push(utm.utm_source)
      }
      await new Promise(r => setTimeout(r, 50))
      continue
    }

    const { error } = await supabase.from('utm_aliases').upsert({
      utm_source: utm.utm_source,
      operadora_slug: 'casa_apostas',
      status: 'pendente',
      ...metricasPayload,
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

const JOGADORES_UPSERT_CHUNK = 400
const JOGADOR_ORIGEM_SEM_UTM = 'sem_utm'

function numTap(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

function influencerIdPorUtm(map: Map<string, string>, utm: string): string | null {
  const exact = map.get(utm)
  if (exact) return exact
  const u = utm.toLowerCase()
  for (const [k, v] of map) {
    if (k.toLowerCase() === u) return v
  }
  return null
}

type JogadorMetricaDiariaUpsert = {
  data: string
  operadora_slug: string
  origem_tipo: 'tap_utm'
  origem: string
  ext_customer_id: string
  registration_id: string | null
  cda_conta: 'influencers' | 'afiliados'
  influencer_id: string | null
  visit_count: number
  registration_count: number
  ftd_count: number
  ftd_total: number
  deposit_count: number
  deposit_total: number
  withdrawal_count: number
  withdrawal_total: number
  fonte: 'tap'
}

function reportingRowsToJogadoresDiarias(
  data: Record<string, unknown>[],
  utmToInfluencerId: Map<string, string>,
  conta: 'influencers' | 'afiliados',
): { rows: JogadorMetricaDiariaUpsert[]; ids: number } {
  const rows: JogadorMetricaDiariaUpsert[] = []
  const ids = new Set<string>()
  for (const row of data) {
    const ext = String(row.ext_customer_id ?? row.extCustomerId ?? '').trim()
    if (!ext) continue
    const dataDia = String(row.dt ?? row.date ?? '').split('T')[0]
    if (!dataDia) continue
    const utmRaw = String(row.utm_source ?? row.utmSource ?? '').trim()
    const origem = utmRaw && utmRaw.toLowerCase() !== 'empty' ? utmRaw : JOGADOR_ORIGEM_SEM_UTM
    const registrationId = String(row.registration_id ?? row.registrationId ?? '').trim() || null
    ids.add(ext)
    rows.push({
      data: dataDia,
      operadora_slug: 'casa_apostas',
      origem_tipo: 'tap_utm',
      origem,
      ext_customer_id: ext,
      registration_id: registrationId,
      cda_conta: conta,
      influencer_id: origem === JOGADOR_ORIGEM_SEM_UTM ? null : influencerIdPorUtm(utmToInfluencerId, origem),
      visit_count: Math.round(numTap(row.visit_count)),
      registration_count: Math.round(numTap(row.registration_count)),
      ftd_count: Math.round(numTap(row.ftd_count)),
      ftd_total: parseFloat(numTap(row.ftd_total).toFixed(2)),
      deposit_count: Math.round(numTap(row.deposit_count)),
      deposit_total: parseFloat(numTap(row.deposit_total).toFixed(2)),
      withdrawal_count: Math.round(numTap(row.withdrawal_count)),
      withdrawal_total: parseFloat(numTap(row.withdrawal_total).toFixed(2)),
      fonte: 'tap',
    })
  }
  return { rows, ids: ids.size }
}

async function upsertJogadoresTap(
  supabase: ReturnType<typeof createClient>,
  data: Record<string, unknown>[],
  utmToInfluencerId: Map<string, string>,
  conta: 'influencers' | 'afiliados',
): Promise<{ inseridos: number; ids: number; erros: string[] }> {
  const { rows, ids } = reportingRowsToJogadoresDiarias(data, utmToInfluencerId, conta)
  if (rows.length === 0) return { inseridos: 0, ids: 0, erros: [] }
  const erros: string[] = []
  let inseridos = 0
  for (let i = 0; i < rows.length; i += JOGADORES_UPSERT_CHUNK) {
    const slice = rows.slice(i, i + JOGADORES_UPSERT_CHUNK)
    const { error } = await supabase.from('jogadores_metricas_diarias').upsert(slice, {
      onConflict: 'data,operadora_slug,origem_tipo,origem,ext_customer_id',
      ignoreDuplicates: false,
    })
    if (error) {
      erros.push(`jogadores_metricas_diarias: ${error.message}`)
      break
    }
    inseridos += slice.length
  }
  return { inseridos, ids, erros }
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

async function gravarTechLog(
  supabase: ReturnType<typeof createClient>,
  tipo: string,
  descricao: string,
  integracaoSlug: string,
): Promise<void> {
  try {
    await supabase.from('tech_logs').insert({ integracao_slug: integracaoSlug, tipo, descricao })
  } catch (e) {
    console.error('[sync-metricas-cda] Falha tech_log:', e)
  }
}

async function gravarSyncLog(supabase: ReturnType<typeof createClient>, opts: {
  integracaoSlug: string
  status: 'ok' | 'falha'
  registros_inseridos: number
  registros_atualizados?: number
  erros_count: number
  mensagem_erro?: string
  duracao_ms: number
  periodo_inicio: string
  periodo_fim: string
}): Promise<void> {
  const { error } = await supabase.from('sync_logs').insert({
    integracao_slug: opts.integracaoSlug,
    status: opts.status,
    registros_inseridos: opts.registros_inseridos,
    registros_atualizados: opts.registros_atualizados ?? 0,
    erros_count: opts.erros_count,
    mensagem_erro: opts.mensagem_erro ?? null,
    duracao_ms: opts.duracao_ms,
    periodo_inicio: opts.periodo_inicio,
    periodo_fim: opts.periodo_fim,
  })
  // PostgREST não lança — sem este check o Actions fica verde e o Status Técnico alerta “não executou”.
  if (error) {
    console.error('[sync-metricas-cda] Falha sync_log:', error.message, error.code, error.details)
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

    const conta = params.conta === 'afiliados' ? 'afiliados' as const : 'influencers' as const
    const integracaoSlug = conta === 'afiliados' ? 'casa_apostas_afiliados' : 'casa_apostas'
    const secretNameApiKey = conta === 'afiliados' ? 'CDA_AFILIADOS_API_KEY' : 'CDA_INFLUENCERS_API_KEY'

    const cdaApiKey = Deno.env.get(secretNameApiKey)
    const smaticoToken = conta === 'influencers' ? Deno.env.get('SMARTICO_TOKEN') : undefined
    const labelId =
      (conta === 'afiliados' ? Deno.env.get('SMARTICO_LABEL_ID_AFILIADOS') : null)
      ?? Deno.env.get('SMARTICO_LABEL_ID')
      ?? '573703'
    const authFormat = (Deno.env.get('CDA_AUTH_FORMAT') ?? 'Bearer').toLowerCase() === 'direct' ? 'direct' as const : 'Bearer' as const
    const smarticoUsername = conta === 'influencers' ? Deno.env.get('SMARTICO_USERNAME') : undefined
    const smarticoPassword = conta === 'influencers' ? Deno.env.get('SMARTICO_PASSWORD') : undefined

    let cdaAuth: CdaAuth
    if (conta === 'afiliados') {
      if (!cdaApiKey) {
        throw new Error('Configure CDA_AFILIADOS_API_KEY no Supabase → Edge Functions → Secrets.')
      }
      cdaAuth = { apiKey: cdaApiKey, authFormat }
    } else if (smarticoUsername && smarticoPassword) {
      cdaAuth = { basicAuth: { username: smarticoUsername, password: smarticoPassword } }
    } else if (cdaApiKey) {
      cdaAuth = { apiKey: cdaApiKey, authFormat }
    } else if (smaticoToken) {
      cdaAuth = { token: smaticoToken }
    } else {
      throw new Error('Configure CDA_INFLUENCERS_API_KEY ou SMARTICO_USERNAME+SMARTICO_PASSWORD no Supabase Secrets.')
    }

    const useReportingApi = Deno.env.get('CDA_USE_REPORTING_API') === 'true' || conta === 'afiliados'
    const reportingBaseUrl = Deno.env.get('SMARTICO_REPORTING_API_URL') ?? 'https://boapi3.smartico.ai'
    const reportingEndpointEnv =
      (conta === 'afiliados' ? Deno.env.get('CDA_AFILIADOS_REPORTING_ENDPOINT') : null)
      ?? Deno.env.get('CDA_REPORTING_ENDPOINT')
      ?? 'af2_media_report_af'
    const reportingEndpoint = reportingEndpointEnv.toLowerCase()
    const endpoint = reportingEndpoint.includes('_op') ? 'af2_media_report_op' as const : 'af2_media_report_af' as const

    if (useReportingApi && !cdaApiKey) {
      throw new Error(`Reporting API exige ${secretNameApiKey}.`)
    }

    console.log(`[sync-metricas-cda] v2.2.0 CDA conta=${conta} | ${useReportingApi ? 'Reporting API' : 'Plywood'} | Período: ${dataInicio} → ${dataFim}`)

    if (params.probe_ext_customer) {
      if (!cdaApiKey) {
        throw new Error(`Probe ext_customer_id exige ${secretNameApiKey}.`)
      }
      const cors = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      const strategies: { ep: 'af2_media_report_op' | 'af2_media_report_af'; omitLabel: boolean }[] =
        endpoint === 'af2_media_report_op'
          ? [{ ep: 'af2_media_report_op', omitLabel: false }, { ep: 'af2_media_report_af', omitLabel: false }, { ep: 'af2_media_report_af', omitLabel: true }]
          : [{ ep: 'af2_media_report_af', omitLabel: false }, { ep: 'af2_media_report_af', omitLabel: true }]
      const tentativas: ReportingRawMeta[] = []
      let baseline: ReturnType<typeof resumirProbeExtCustomer> | null = null
      let jogadores: ReturnType<typeof resumirProbeExtCustomer> | null = null
      let metaOk: ReportingRawMeta | null = null
      for (const { ep, omitLabel } of strategies) {
        const base = await fetchReportingRaw(
          dataInicio, dataFim, cdaApiKey, reportingBaseUrl, authFormat, ep, labelId, omitLabel, 'utm_source',
        )
        tentativas.push(base.meta)
        if (!base.meta.ok) continue
        const jog = await fetchReportingRaw(
          dataInicio, dataFim, cdaApiKey, reportingBaseUrl, authFormat, ep, labelId, omitLabel, 'utm_source,ext_customer_id',
        )
        tentativas.push(jog.meta)
        if (!jog.meta.ok) continue
        baseline = resumirProbeExtCustomer(base.data, 'utm_source')
        jogadores = resumirProbeExtCustomer(jog.data, 'utm_source,ext_customer_id')
        metaOk = jog.meta
        break
      }
      console.log(`[sync-metricas-cda] probe_ext_customer conta=${conta} linhas=${jogadores?.linhas ?? 0} ids=${jogadores?.ext_customer_id_distintos ?? 0}`)
      return new Response(JSON.stringify({
        ok: Boolean(jogadores),
        probe: true,
        conta,
        periodo: { de: dataInicio, ate_inclusivo: dataFim },
        endpoint_ok: metaOk,
        tentativas,
        agregado_utm_source: baseline,
        por_jogador: jogadores,
      }), { status: 200, headers: cors })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

    let reportingCache: Map<string, DailyMetric[]> | null = null
    let reportingStrategy: { ep: 'af2_media_report_op' | 'af2_media_report_af'; omitLabel: boolean } | null = null
    if (useReportingApi && cdaApiKey) {
      const strategies: { ep: 'af2_media_report_op' | 'af2_media_report_af'; omitLabel: boolean }[] =
        endpoint === 'af2_media_report_op'
          ? [{ ep: 'af2_media_report_op', omitLabel: false }, { ep: 'af2_media_report_af', omitLabel: false }, { ep: 'af2_media_report_af', omitLabel: true }]
          : [{ ep: 'af2_media_report_af', omitLabel: false }, { ep: 'af2_media_report_af', omitLabel: true }]
      let lastErr: Error | null = null
      for (const { ep, omitLabel } of strategies) {
        try {
          reportingCache = await fetchMetricasReportingAPI(dataInicio, dataFim, cdaApiKey, reportingBaseUrl, authFormat, ep, labelId, omitLabel)
          reportingStrategy = { ep, omitLabel }
          console.log(`[sync-metricas-cda] Reporting API (${conta}): ${reportingCache.size} UTMs`)
          lastErr = null
          break
        } catch (err) {
          lastErr = err instanceof Error ? err : new Error(String(err))
          if (String(lastErr.message).includes('Access to this label')) continue
          if (err instanceof TokenExpiradoError) {
            logAlertaAuthCda(`403 na Reporting API (${conta})`)
            await gravarTechLog(supabase, 'auth', `403 na Reporting API (${conta})`, integracaoSlug)
            await gravarSyncLog(supabase, { integracaoSlug, status: 'falha', registros_inseridos: 0, erros_count: 1, mensagem_erro: '403', duracao_ms: Date.now() - inicioMs, periodo_inicio: dataInicio, periodo_fim: dataFim })
            return new Response(JSON.stringify({ ok: false, erro: `403 - Verifique ${secretNameApiKey}` }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
          }
          throw err
        }
      }
      if (lastErr && !reportingCache) throw lastErr
    }

    const OPERADORA_CDA = 'casa_apostas'

    // Escopo por role via profiles (sem embed — não há FK PostgREST influencer_perfil↔profiles)
    let idsEscopoConta: Set<string>
    if (conta === 'afiliados') {
      const { data: afiliadosRows, error: errAf } = await supabase.from('profiles').select('id').eq('role', 'afiliado')
      if (errAf) throw new Error(`Erro profiles (afiliados): ${errAf.message}`)
      idsEscopoConta = new Set((afiliadosRows ?? []).map((r: { id: string }) => r.id))
    } else {
      const { data: naoAfiliados, error: errInf } = await supabase.from('profiles').select('id').neq('role', 'afiliado')
      if (errInf) throw new Error(`Erro profiles (influencers): ${errInf.message}`)
      idsEscopoConta = new Set((naoAfiliados ?? []).map((r: { id: string }) => r.id))
    }

    let query = supabase
      .from('influencer_perfil')
      .select('id, nome_artistico, utm_source')
      .not('utm_source', 'is', null)
    if (params.utm_source) query = query.eq('utm_source', params.utm_source)
    const { data: influencersRaw, error: errInfluencers } = await query
    if (errInfluencers) throw new Error(`Erro influencers: ${errInfluencers.message}`)
    const influencers = ((influencersRaw ?? []) as InfluencerPerfil[]).filter((i) =>
      idsEscopoConta.has(i.id),
    )

    const { data: aliasesMapeadosRaw } = await supabase
      .from('utm_aliases')
      .select('utm_source, influencer_id')
      .eq('status', 'mapeado')
      .or('operadora_slug.eq.casa_apostas,operadora_slug.is.null')
      .not('influencer_id', 'is', null)
    const aliasesMapeados = (aliasesMapeadosRaw ?? []).filter((a: { influencer_id: string }) =>
      idsEscopoConta.has(a.influencer_id),
    )
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

    let faseJogadores: { ok: boolean; linhas: number; ids: number; erro?: string } | null = null
    if (!params.skip_jogadores && useReportingApi && cdaApiKey && reportingStrategy) {
      try {
        const jog = await fetchReportingRaw(
          dataInicio,
          dataFim,
          cdaApiKey,
          reportingBaseUrl,
          authFormat,
          reportingStrategy.ep,
          labelId,
          reportingStrategy.omitLabel,
          'utm_source,ext_customer_id',
        )
        if (!jog.meta.ok) {
          faseJogadores = { ok: false, linhas: 0, ids: 0, erro: jog.meta.erro }
          console.warn(`[sync-metricas-cda] jogadores TAP (${conta}): ${jog.meta.erro}`)
        } else {
          const r = await upsertJogadoresTap(supabase, jog.data, utmToInfluencerId, conta)
          faseJogadores = {
            ok: r.erros.length === 0,
            linhas: r.inseridos,
            ids: r.ids,
            erro: r.erros[0],
          }
          console.log(`[sync-metricas-cda] jogadores TAP (${conta}): ${r.inseridos} linhas / ${r.ids} ids`)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        faseJogadores = { ok: false, linhas: 0, ids: 0, erro: msg }
        console.warn(`[sync-metricas-cda] jogadores TAP (${conta}) falhou (sync agregado segue): ${msg}`)
      }
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
          logAlertaAuthCda(msg)
          await gravarTechLog(supabase, 'auth', msg, integracaoSlug)
          await gravarSyncLog(supabase, { integracaoSlug, status: 'falha', registros_inseridos: totalInseridos, erros_count: 1, mensagem_erro: msg, duracao_ms: Date.now() - inicioMs, periodo_inicio: dataInicio, periodo_fim: dataFim })
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
        const resultado = await detectarERegistrarOrfaos(supabase, todosUtmsCda, utmsMapeados, conta)
        orfaosNovos = resultado.novos
        orfaosAtualizados = resultado.atualizados
      } catch (err) {
        if (err instanceof TokenExpiradoError) {
          logAlertaAuthCda('403 na varredura de UTMs')
          await gravarSyncLog(supabase, { integracaoSlug, status: 'falha', registros_inseridos: totalInseridos, erros_count: 1, mensagem_erro: '403 varredura', duracao_ms: Date.now() - inicioMs, periodo_inicio: dataInicio, periodo_fim: dataFim })
          return new Response(JSON.stringify({ ok: false, erro: '403 na varredura' }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
        }
        todosErros.push(String(err))
      }
    }

    const duracaoMs = Date.now() - inicioMs
    await gravarSyncLog(supabase, {
      integracaoSlug,
      status: 'ok',
      registros_inseridos: totalInseridos,
      erros_count: todosErros.length,
      mensagem_erro: todosErros.length > 0 ? todosErros.slice(0, 3).join('; ') : undefined,
      duracao_ms: duracaoMs,
      periodo_inicio: dataInicio,
      periodo_fim: dataFim,
    })

    console.log(`[sync-metricas-cda] Concluído (${conta}): ${totalInseridos} registros | ${orfaosNovos.length} novos órfãos`)

    return new Response(JSON.stringify({
      ok: true,
      versao: 'v2.2.0',
      integracao: integracaoSlug,
      conta,
      api_usada: useReportingApi ? 'Reporting API' : 'Plywood',
      periodo: { data_inicio: dataInicio, data_fim: dataFim },
      fase_jogadores: faseJogadores ?? 'pulada',
      fase1_influencers: {
        total: infToUtms.size,
        registros_upserted: totalInseridos,
        erros: todosErros.length,
        aliases_mapeados: (aliasesMapeados ?? []).length,
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
