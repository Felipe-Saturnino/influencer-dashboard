import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Edge Function: sync-metricas | Acquisition Hub (Spin Gaming)
// Busca métricas da API Plywood e faz upsert em influencer_metricas

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

// ── Erro especial para 403 ────────────────────────────────────

class TokenExpiradoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TokenExpiradoError'
  }
}

// ── Alerta de e-mail via Resend ───────────────────────────────
// Enviado quando a API CDA retorna 403 (token expirado OU API key revogada)

async function enviarAlertaAuthCda(): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.warn('[sync-metricas] RESEND_API_KEY não configurada — alerta ignorado.')
    return
  }

  const usaApiKey = !!Deno.env.get('CDA_INFLUENCERS_API_KEY')
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  const html = usaApiKey
    ? `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0; font-size: 18px;">⚠️ Sync de Métricas Interrompido</h2>
      </div>
      <div style="background: #f9f9f9; border: 1px solid #e5e5e5; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="margin: 0 0 16px; color: #333;">
          O sync automático de métricas da <strong>Casa de Apostas</strong> falhou às <strong>${agora}</strong>.
        </p>
        <p style="margin: 0 0 16px; color: #333;">
          <strong>Motivo:</strong> A API retornou erro <code style="background: #fee2e2; padding: 2px 6px; border-radius: 4px; color: #ef4444;">403 Forbidden</code> — credencial inválida.
        </p>
        <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
          <p style="margin: 0; color: #856404; font-weight: bold;">Verifique se a chave API (CDA_INFLUENCERS_API_KEY) está correta ou se foi revogada.</p>
        </div>
        <p style="margin: 0; color: #555;">Acesse Supabase → Edge Functions → Secrets e confira <code>CDA_INFLUENCERS_API_KEY</code>.</p>
      </div>
    </div>
  `
    : `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0; font-size: 18px;">⚠️ Sync de Métricas Interrompido</h2>
      </div>
      <div style="background: #f9f9f9; border: 1px solid #e5e5e5; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="margin: 0 0 16px; color: #333;">
          O sync automático de métricas da <strong>Casa de Apostas</strong> falhou às <strong>${agora}</strong>.
        </p>
        <p style="margin: 0 0 16px; color: #333;">
          <strong>Motivo:</strong> A API retornou erro <code style="background: #fee2e2; padding: 2px 6px; border-radius: 4px; color: #ef4444;">403 Forbidden</code> — o token de sessão expirou.
        </p>
        <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
          <p style="margin: 0; color: #856404; font-weight: bold;">Migre para CDA_INFLUENCERS_API_KEY (não expira). Ou renove SMARTICO_TOKEN conforme abaixo.</p>
        </div>
        <h3 style="color: #333; font-size: 15px; margin-bottom: 12px;">Como renovar token (temporário):</h3>
        <ol style="color: #555; padding-left: 20px; line-height: 1.8;">
          <li>Acesse <a href="https://admin.aff.casadeapostas.bet.br" style="color: #2563eb;">admin.aff.casadeapostas.bet.br</a> e faça login</li>
          <li>Abra o DevTools (F12) → aba <strong>Network</strong></li>
          <li>Recarregue a página (F5) e filtre por <code>getBoUserInfo</code></li>
          <li>Clique na requisição → aba <strong>Headers</strong> → copie o valor de <strong>Authorization</strong></li>
          <li>Acesse Supabase → Edge Functions → Secrets</li>
          <li>Atualize <code>SMARTICO_TOKEN</code> ou adicione <code>CDA_INFLUENCERS_API_KEY</code> (recomendado)</li>
        </ol>
      </div>
    </div>
  `

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Acquisition Hub <onboarding@resend.dev>',
        to: ['felipe.saturnino@spingaming.com.br'],
        subject: '⚠️ [Acquisition Hub] Erro de autenticação CDA (403) — sync interrompido',
        html,
      }),
    })
    if (res.ok) {
      console.log('[sync-metricas] Alerta de e-mail enviado.')
    } else {
      console.error(`[sync-metricas] Falha ao enviar e-mail: ${res.status}`)
    }
  } catch (e) {
    console.error(`[sync-metricas] Erro Resend: ${e}`)
  }
}

// ── Headers padrão CDA ───────────────────────────────────────
// Suporta: CDA_INFLUENCERS_API_KEY (não expira, recomendado) ou SMARTICO_TOKEN (cookie de sessão, expira)
// v1.6.0: Prioridade para CDA_INFLUENCERS_API_KEY; se ausente, usa SMARTICO_TOKEN (compatibilidade)

function buildHeaders(auth: { apiKey?: string; token?: string }, labelId: string): HeadersInit {
  const base: Record<string, string> = {
    'Content-Type': 'application/json;charset=UTF-8',
    'Active_label_id': labelId,
    'X-Smartico-Active-Label-Id': labelId,
    'Origin': 'https://admin.aff.casadeapostas.bet.br',
    'Referer': `https://data-api3.aff.casadeapostas.bet.br/?label_id=${labelId}&noNav=true`,
  }
  if (auth.apiKey) {
    base['Authorization'] = `Bearer ${auth.apiKey}`
  } else if (auth.token) {
    base['Cookie'] = `__smtaff_bo_token=${auth.token}`
  }
  return base
}

// ── Métricas base ────────────────────────────────────────────

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

// ── Busca métricas de um influencer (SPLIT por dia) ──────────

type CdaAuth = { apiKey?: string; token?: string }

async function fetchMetricasPorUtm(
  utmSource: string, dataInicio: string, dataFim: string, auth: CdaAuth, labelId: string
): Promise<DailyMetric[]> {

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
  if (!Array.isArray(splitData)) return []
  return splitData
}

// ── Varredura de UTMs: SPLIT por utm_source (sem filtro) ──────

async function fetchTodosUtms(
  dataInicio: string, dataFim: string, auth: CdaAuth, labelId: string
): Promise<UtmTotais[]> {

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

  console.log('[sync-metricas] Fase 2: Varrendo UTMs órfãos na CDA...')

  const response = await fetch('https://data-api3.aff.casadeapostas.bet.br/plywood?by=', { method: 'POST', headers: buildHeaders(auth, labelId), body: JSON.stringify(payload) })

  if (response.status === 403) throw new TokenExpiradoError('403 na varredura de UTMs')
  if (!response.ok) throw new Error(`Erro na varredura: ${response.status}`)

  const data = await response.json()
  const splitData: UtmSplitItem[] = data?.result?.data?.[0]?.SPLIT?.data

  if (!Array.isArray(splitData)) return []

  console.log(`[sync-metricas] Varredura: ${splitData.length} UTMs encontrados na CDA`)

  return splitData
    .filter(item => item.utm_source && item.utm_source !== 'Empty')
    .map(item => ({
      utm_source:          item.utm_source,
      total_visits:        Math.round(item.visit_count ?? 0),
      total_registrations: Math.round(item.registration_count ?? 0),
      total_ftds:          Math.round(item.ftd_count ?? 0),
      total_deposit:       parseFloat((item.deposit_total ?? 0).toFixed(2)),
      total_withdrawal:    parseFloat((item.withdrawal_total ?? 0).toFixed(2)),
      primeiro_visto:      dataInicio,
      ultimo_visto:        dataFim,
    }))
}

// ── Detecta e registra UTMs órfãos ───────────────────────────
// IMPORTANTE: 'ggr' é coluna GERADA (total_deposit - total_withdrawal)
// Nunca incluir no upsert — o banco calcula automaticamente.
// v1.3.0: inclui operadora_slug para CDA

async function detectarERegistrarOrfaos(
  supabase: ReturnType<typeof createClient>,
  todosUtmsCda: UtmTotais[],
  utmsMapeados: Set<string>
): Promise<{ novos: string[]; atualizados: string[]; erros: string[] }> {
  const novos: string[] = []
  const atualizados: string[] = []
  const erros: string[] = []

  const { data: aliasesExistentes } = await supabase
    .from('utm_aliases')
    .select('utm_source, status')

  const aliasesMap = new Map<string, string>(
    (aliasesExistentes ?? []).map((a: { utm_source: string; status: string }) => [a.utm_source, a.status])
  )

  const orfaos = todosUtmsCda.filter(u => !utmsMapeados.has(u.utm_source))
  console.log(`[sync-metricas] Órfãos detectados: ${orfaos.length} (total CDA: ${todosUtmsCda.length})`)

  for (const utm of orfaos) {
    const statusAtual = aliasesMap.get(utm.utm_source)

    // Não sobrescreve UTMs já resolvidos
    if (statusAtual === 'mapeado' || statusAtual === 'ignorado') continue

    const { error } = await supabase
      .from('utm_aliases')
      .upsert(
        {
          utm_source:          utm.utm_source,
          operadora_slug:      'casa_apostas',  // v1.3.0: identifica origem CDA
          status:              'pendente',
          total_visits:        utm.total_visits,
          total_registrations: utm.total_registrations,
          total_ftds:          utm.total_ftds,
          total_deposit:       utm.total_deposit,
          total_withdrawal:    utm.total_withdrawal,
          // ggr é coluna gerada — NÃO incluir aqui
          primeiro_visto:      utm.primeiro_visto,
          ultimo_visto:        utm.ultimo_visto,
          atualizado_em:       new Date().toISOString(),
        },
        { onConflict: 'utm_source', ignoreDuplicates: false }
      )

    if (error) {
      const msg = `Falha ao inserir UTM órfão ${utm.utm_source}: ${error.message}`
      console.error(`[sync-metricas] ${msg}`)
      erros.push(msg)
    } else {
      if (statusAtual) {
        atualizados.push(utm.utm_source)
      } else {
        novos.push(utm.utm_source)
        console.log(`[sync-metricas] Novo órfão: ${utm.utm_source} (${utm.total_ftds} FTDs)`)
      }
    }

    await new Promise(r => setTimeout(r, 50))
  }

  return { novos, atualizados, erros }
}

// ── Upsert métricas influencer ───────────────────────────────
// v1.3.0: inclui operadora_slug e onConflict alinhado à constraint
// UNIQUE(influencer_id, data, operadora_slug)

async function upsertMetricas(
  supabase: ReturnType<typeof createClient>,
  influencerId: string,
  metricas: DailyMetric[]
): Promise<{ inseridos: number; erros: string[] }> {
  if (metricas.length === 0) return { inseridos: 0, erros: [] }

  const rows = metricas.map((m) => ({
    influencer_id:      influencerId,
    data:               m.time.start.split('T')[0],
    operadora_slug:     'casa_apostas',  // v1.3.0: obrigatório após migration
    visit_count:        Math.round(m.visit_count ?? 0),
    registration_count: Math.round(m.registration_count ?? 0),
    ftd_count:          Math.round(m.ftd_count ?? 0),
    ftd_total:          parseFloat((m.ftd_total ?? 0).toFixed(2)),
    deposit_count:      Math.round(m.deposit_count ?? 0),
    deposit_total:      parseFloat((m.deposit_total ?? 0).toFixed(2)),
    withdrawal_count:   Math.round(m.withdrawal_count ?? 0),
    withdrawal_total:   parseFloat((m.withdrawal_total ?? 0).toFixed(2)),
    fonte:              'api',
  }))

  const { error } = await supabase
    .from('influencer_metricas')
    .upsert(rows, {
      onConflict: 'influencer_id,data,operadora_slug',  // v1.3.0: alinhado à constraint
      ignoreDuplicates: false
    })

  if (error) return { inseridos: 0, erros: [`Upsert falhou para ${influencerId}: ${error.message}`] }
  return { inseridos: rows.length, erros: [] }
}

// ── Grava sync_log para Status Técnico ─────────────────────────

async function gravarTechLog(
  supabase: ReturnType<typeof createClient>,
  tipo: string,
  descricao: string
): Promise<void> {
  try {
    await supabase.from('tech_logs').insert({
      integracao_slug: 'casa_apostas',
      tipo,
      descricao,
    })
  } catch (e) {
    console.error('[sync-metricas] Falha ao gravar tech_log:', e)
  }
}

async function gravarSyncLog(
  supabase: ReturnType<typeof createClient>,
  opts: {
    status: 'ok' | 'falha'
    registros_inseridos: number
    registros_atualizados?: number
    erros_count: number
    mensagem_erro?: string
    duracao_ms: number
    periodo_inicio: string
    periodo_fim: string
  }
): Promise<void> {
  try {
    await supabase.from('sync_logs').insert({
      integracao_slug:       'casa_apostas',
      status:                opts.status,
      registros_inseridos:   opts.registros_inseridos,
      registros_atualizados: opts.registros_atualizados ?? 0,
      erros_count:           opts.erros_count,
      mensagem_erro:         opts.mensagem_erro ?? null,
      duracao_ms:            opts.duracao_ms,
      periodo_inicio:       opts.periodo_inicio,
      periodo_fim:          opts.periodo_fim,
    })
  } catch (e) {
    console.error('[sync-metricas] Falha ao gravar sync_log:', e)
  }
}

// ── Handler principal ─────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    if (!req.headers.get('Authorization')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }

    let params: SyncRequest = {}
    try { params = await req.json() } catch { /* Body vazio ok */ }

    const hoje = new Date()
    // Início do projeto (dez/2025). Em produção, alterar para 60 dias: sessentaDiasAtras.setDate(hoje.getDate() - 60)
    const defaultInicio = '2025-12-01'

    const dataFim    = params.data_fim    ?? hoje.toISOString().split('T')[0]
    const dataInicio = params.data_inicio ?? defaultInicio

    const inicioMs = Date.now()
    console.log(`[sync-metricas] v1.6.0 | Período: ${dataInicio} → ${dataFim}`)

    const cdaApiKey    = Deno.env.get('CDA_INFLUENCERS_API_KEY')
    const smaticoToken = Deno.env.get('SMARTICO_TOKEN')
    const labelId      = Deno.env.get('SMARTICO_LABEL_ID') ?? '573703'

    const cdaAuth: CdaAuth = cdaApiKey
      ? { apiKey: cdaApiKey }
      : smaticoToken
        ? { token: smaticoToken }
        : (() => { throw new Error('Configure CDA_INFLUENCERS_API_KEY (recomendado, não expira) ou SMARTICO_TOKEN no Supabase Secrets.') })()

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

    // ── FASE 1: Sync influencers mapeados ─────────────────────
    let query = supabase.from('influencer_perfil').select('id, nome_artistico, utm_source').not('utm_source', 'is', null)
    if (params.utm_source) query = query.eq('utm_source', params.utm_source)

    const { data: influencers, error: errInfluencers } = await query
    if (errInfluencers) throw new Error(`Erro ao buscar influencers: ${errInfluencers.message}`)

    const utmsMapeados = new Set<string>((influencers ?? []).map((i: InfluencerPerfil) => i.utm_source))

    const { data: aliasesMapeados } = await supabase.from('utm_aliases').select('utm_source, influencer_id').eq('status', 'mapeado').or('operadora_slug.eq.casa_apostas,operadora_slug.is.null').not('influencer_id', 'is', null)
    ;(aliasesMapeados ?? []).forEach((a: { utm_source: string }) => utmsMapeados.add(a.utm_source))

    // Aliases mapeados: UTMs associados a influencers via Gestão de Links (podem não estar em influencer_perfil.utm_source)
    const aliasesParaSync = (aliasesMapeados ?? []).filter((a: { utm_source: string; influencer_id: string }) => a.utm_source && a.influencer_id)
    const influencerIdsAliases = [...new Set(aliasesParaSync.map((a: { influencer_id: string }) => a.influencer_id))]
    const { data: perfisAliases } = influencerIdsAliases.length > 0
      ? await supabase.from('influencer_perfil').select('id, utm_source, nome_artistico').in('id', influencerIdsAliases)
      : { data: [] }
    const perfilUtmMap = new Map<string, string>((perfisAliases ?? []).map((p: { id: string; utm_source: string }) => [p.id, p.utm_source ?? '']))
    // Só processar alias se o utm_source do alias é DIFERENTE do utm_source do perfil (evitar duplicata)
    const aliasesNovos = aliasesParaSync.filter((a: { utm_source: string; influencer_id: string }) => perfilUtmMap.get(a.influencer_id) !== a.utm_source)

    console.log(`[sync-metricas] Fase 1: ${influencers?.length ?? 0} influencer(s) perfil, ${aliasesNovos.length} alias(es) mapeado(s)`)

    const resultados: Array<{ utm_source: string; nome: string; dias_sincronizados: number; erros: string[] }> = []
    let totalInseridos = 0
    const todosErros: string[] = []
    const infNomeCache = new Map<string, string>([
      ...(influencers ?? []).map((i: InfluencerPerfil) => [i.id, i.nome_artistico] as [string, string]),
      ...(perfisAliases ?? []).map((p: { id: string; nome_artistico: string }) => [p.id, p.nome_artistico] as [string, string]),
    ])

    for (const influencer of (influencers ?? []) as InfluencerPerfil[]) {
      try {
        const metricas = await fetchMetricasPorUtm(influencer.utm_source, dataInicio, dataFim, cdaAuth, labelId)
        const { inseridos, erros } = await upsertMetricas(supabase, influencer.id, metricas)
        totalInseridos += inseridos
        todosErros.push(...erros)
        resultados.push({ utm_source: influencer.utm_source, nome: influencer.nome_artistico, dias_sincronizados: inseridos, erros })
        await new Promise(r => setTimeout(r, 300))
      } catch (err) {
        if (err instanceof TokenExpiradoError) {
          await enviarAlertaAuthCda()
          await gravarTechLog(supabase, 'auth', 'Token CDA expirado (403). Renovar SMARTICO_TOKEN.')
          const duracaoMs = Date.now() - inicioMs
          await gravarSyncLog(supabase, {
            status: 'falha',
            registros_inseridos: totalInseridos,
            erros_count: 1,
            mensagem_erro: `Token CDA expirado (403) — falhou em ${influencer.utm_source}`,
            duracao_ms: duracaoMs,
            periodo_inicio: dataInicio,
            periodo_fim: dataFim,
          })
          return new Response(JSON.stringify({
            ok: false,
            erro: 'Token CDA expirado (403). Alerta enviado para felipe.saturnino@spingaming.com.br.',
            influencer_que_falhou: influencer.utm_source,
            total_sincronizados_antes_da_falha: totalInseridos,
          }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
        }
        const msg = `Erro em ${influencer.utm_source}: ${err instanceof Error ? err.message : String(err)}`
        todosErros.push(msg)
        resultados.push({ utm_source: influencer.utm_source, nome: influencer.nome_artistico, dias_sincronizados: 0, erros: [msg] })
      }
    }

    // ── FASE 1b: Sync aliases mapeados (UTMs da Gestão de Links) ─
    for (const alias of aliasesNovos) {
      try {
        const metricas = await fetchMetricasPorUtm(alias.utm_source, dataInicio, dataFim, cdaAuth, labelId)
        const { inseridos, erros } = await upsertMetricas(supabase, alias.influencer_id, metricas)
        totalInseridos += inseridos
        todosErros.push(...erros)
        const nome = infNomeCache.get(alias.influencer_id) ?? '—'
        resultados.push({ utm_source: alias.utm_source, nome, dias_sincronizados: inseridos, erros })
        await new Promise(r => setTimeout(r, 300))
      } catch (err) {
        if (err instanceof TokenExpiradoError) {
          await enviarAlertaAuthCda()
          await gravarTechLog(supabase, 'auth', 'Token CDA expirado (403). Renovar SMARTICO_TOKEN.')
          const duracaoMs = Date.now() - inicioMs
          await gravarSyncLog(supabase, {
            status: 'falha',
            registros_inseridos: totalInseridos,
            erros_count: 1,
            mensagem_erro: `Token CDA expirado (403) — falhou em alias ${alias.utm_source}`,
            duracao_ms: duracaoMs,
            periodo_inicio: dataInicio,
            periodo_fim: dataFim,
          })
          return new Response(JSON.stringify({
            ok: false,
            erro: 'Token CDA expirado (403). Alerta enviado para felipe.saturnino@spingaming.com.br.',
            influencer_que_falhou: alias.utm_source,
            total_sincronizados_antes_da_falha: totalInseridos,
          }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
        }
        const msg = `Erro em alias ${alias.utm_source}: ${err instanceof Error ? err.message : String(err)}`
        todosErros.push(msg)
        const nome = infNomeCache.get(alias.influencer_id) ?? '—'
        resultados.push({ utm_source: alias.utm_source, nome, dias_sincronizados: 0, erros: [msg] })
      }
    }

    // ── FASE 2: Detecção de UTMs órfãos ───────────────────────
    let orfaosNovos: string[] = []
    let orfaosAtualizados: string[] = []
    let orfaosErros: string[] = []
    let totalUtmsCda = 0

    if (!params.utm_source && !params.skip_orfaos) {
      try {
        const todosUtmsCda = await fetchTodosUtms(dataInicio, dataFim, cdaAuth, labelId)
        totalUtmsCda = todosUtmsCda.length
        const resultado = await detectarERegistrarOrfaos(supabase, todosUtmsCda, utmsMapeados)
        orfaosNovos = resultado.novos
        orfaosAtualizados = resultado.atualizados
        orfaosErros = resultado.erros
        console.log(`[sync-metricas] Fase 2: ${orfaosNovos.length} novos, ${orfaosAtualizados.length} atualizados, ${orfaosErros.length} erros`)
      } catch (err) {
        if (err instanceof TokenExpiradoError) {
          await enviarAlertaAuthCda()
          await gravarTechLog(supabase, 'auth', 'Token CDA expirado (403) na varredura de UTMs.')
          const duracaoMs = Date.now() - inicioMs
          await gravarSyncLog(supabase, {
            status: 'falha',
            registros_inseridos: totalInseridos,
            erros_count: todosErros.length + 1,
            mensagem_erro: `Token CDA expirado (403) na varredura de UTMs`,
            duracao_ms: duracaoMs,
            periodo_inicio: dataInicio,
            periodo_fim: dataFim,
          })
          return new Response(JSON.stringify({
            ok: false,
            erro: 'Token CDA expirado (403). Alerta enviado.',
            total_sincronizados_antes_da_falha: totalInseridos,
          }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
        } else {
          const msg = `Erro na varredura: ${err instanceof Error ? err.message : String(err)}`
          todosErros.push(msg)
        }
      }
    }

    const duracaoMs = Date.now() - inicioMs
    await gravarSyncLog(supabase, {
      status: 'ok',
      registros_inseridos: totalInseridos,
      registros_atualizados: 0,
      erros_count: todosErros.length,
      mensagem_erro: todosErros.length > 0 ? todosErros.slice(0, 3).join('; ') : undefined,
      duracao_ms: duracaoMs,
      periodo_inicio: dataInicio,
      periodo_fim: dataFim,
    })

    const resposta = {
      ok: true,
      versao: 'v1.6.0',
      periodo: { data_inicio: dataInicio, data_fim: dataFim },
      fase1_influencers: {
        total: influencers?.length ?? 0,
        aliases_mapeados: aliasesNovos.length,
        registros_upserted: totalInseridos,
        erros: todosErros.length,
        detalhes: resultados,
      },
      fase2_orfaos: (params.utm_source || params.skip_orfaos) ? 'pulada' : {
        total_utms_cda: totalUtmsCda,
        total_mapeados: utmsMapeados.size,
        novos_detectados: orfaosNovos.length,
        atualizados: orfaosAtualizados.length,
        erros: orfaosErros.length,
        novos: orfaosNovos,
      },
    }

    console.log(`[sync-metricas] Concluído: ${totalInseridos} registros | ${orfaosNovos.length} novos órfãos`)

    return new Response(JSON.stringify(resposta), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[sync-metricas] Erro fatal: ${msg}`)
    return new Response(JSON.stringify({ ok: false, erro: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
