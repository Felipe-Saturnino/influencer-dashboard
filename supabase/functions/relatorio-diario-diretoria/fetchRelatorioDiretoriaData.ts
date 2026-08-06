import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { arpuFromGgrUap, fmtUltimaLeitura, hojeISO, ontemISO, primeiroDiaMes } from './common.ts'

export interface LiveAgenda {
  horario: string
  influencer_name: string
  plataforma: string
  link?: string
}

export interface ResultadoInfluencer {
  nome: string
  depositos_qtd: number
  depositos_valor: number
  saques_qtd: number
  saques_valor: number
  ggr: number
}

export interface OperadoraMtdRow {
  nome: string
  ggr: number
  turnover: number
  margem: number | null
  apostas: number
  apostaMedia: number | null
  uap: number | null
  arpu: number | null
  isTotal?: boolean
}

export interface StreamersMtdRow {
  ggr: number
  investimento: number
  roi: number | null
  registros: number
  ftds: number
  lives: number
  horas: number
}

export interface MidiasMtdRow {
  ggr: number
  investimento: number
  roi: number | null
  registros: number
  ftds: number
  postagens: number
  impressoes: number
}

/** Linha Mesas Dedicadas: posição no lobby Blaze / CDA (null → —). */
export interface PosicaoMesaDedicadaRow {
  mesa: string
  blaze: number | null
  cda: number | null
}

/** Linha Mesas Network: posição no lobby Blaze / CDA / Esportiva / Jonbet (null → —). */
export interface PosicaoMesaNetworkRow {
  mesa: string
  blaze: number | null
  cda: number | null
  esportiva: number | null
  jonbet: number | null
}

export interface RelatorioDiretoriaData {
  dataHoje: string
  dataOntem: string
  /** Última data com linha em daily Dedicado ou Network no MTD (Overview Spin → Overview). */
  dataAteMtd: string
  agenda: LiveAgenda[]
  influencersRows: ResultadoInfluencer[]
  /** MTD por operadora = Dedicado + Network (mesma regra da aba Overview). */
  operadorasMtd: OperadoraMtdRow[]
  streamersMtd: StreamersMtdRow
  midiasMtd: MidiasMtdRow
  posicionamentoUltimaLeituraFmt: string | null
  mesasDedicadas: PosicaoMesaDedicadaRow[]
  mesasNetwork: PosicaoMesaNetworkRow[]
}

/** Slugs de lobby usados no bloco Posicionamento. */
const LOBBY_SLUGS = ['blaze', 'casa_apostas', 'esportiva_bet', 'jonbet'] as const

/**
 * Estúdio network provisório cadastrado como operadora — não entra no consolidado
 * financeiro (business.mdc).
 */
const OPERADORAS_EXCLUIDAS_MTD = new Set(['sports_club'])

async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const pageSize = 1000
  let from = 0
  const all: T[] = []
  while (true) {
    const { data, error } = await fetchPage(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    const rows = data ?? []
    all.push(...rows)
    if (rows.length < pageSize) break
    from += pageSize
  }
  return all
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function sumCampanhas(rows: Array<Record<string, unknown>>) {
  return rows.reduce(
    (acc, c) => {
      acc.registros += Number(c.registros) || 0
      acc.ftds += Number(c.ftds) || 0
      acc.deposit_total += Number(c.deposit_total) || 0
      acc.withdrawal_total += Number(c.withdrawal_total) || 0
      return acc
    },
    { registros: 0, ftds: 0, deposit_total: 0, withdrawal_total: 0 },
  )
}

function totaisKpiOrganic(rows: Array<{ impressions?: number; posts_published?: number }>) {
  return rows.reduce(
    (acc, r) => {
      acc.impressoes += Number(r.impressions) || 0
      acc.postagens += Number(r.posts_published) || 0
      return acc
    },
    { impressoes: 0, postagens: 0 },
  )
}

function normNomeMesa(s: string): string {
  return s.trim().toLocaleLowerCase('pt-BR')
}

type LobbyPosRow = {
  mesa_identificacao: string
  nome_mesa: string
  posicao: number | null
}

function indexPosicoesLobby(rows: LobbyPosRow[]): {
  byId: Map<string, number | null>
  byNome: Map<string, number | null>
} {
  const byId = new Map<string, number | null>()
  const byNome = new Map<string, number | null>()
  for (const r of rows) {
    const id = (r.mesa_identificacao ?? '').trim()
    const nome = (r.nome_mesa ?? '').trim()
    const pos = r.posicao != null ? Number(r.posicao) : null
    if (id) byId.set(id, pos)
    if (nome) {
      const key = normNomeMesa(nome)
      if (!byNome.has(key)) byNome.set(key, pos)
    }
  }
  return { byId, byNome }
}

export async function fetchRelatorioDiretoriaData(
  supabase: SupabaseClient,
): Promise<RelatorioDiretoriaData> {
  const dataHoje = hojeISO()
  const dataOntem = ontemISO()
  const inicioMes = primeiroDiaMes(dataOntem)
  const ym = dataOntem.slice(0, 7)

  const [
    livesHojeRes,
    metricasOntemRes,
    livesOntemRes,
    dailyRes,
    dailyNetworkRes,
    monthlyRes,
    monthlyNetworkRes,
    operadorasRes,
    metMtdRes,
    livesMtdRes,
    metaAdsRes,
    kpiDailyRes,
    campRes,
    lobbyExecRes,
    estudiosRes,
    mesasCadRes,
  ] = await Promise.all([
    supabase
      .from('lives')
      .select('id, horario, plataforma, link, influencer_id')
      .eq('data', dataHoje)
      .eq('status', 'agendada')
      .order('horario', { ascending: true }),
    supabase
      .from('influencer_metricas')
      .select(
        'influencer_id, visit_count, registration_count, ftd_count, deposit_count, deposit_total, withdrawal_count, withdrawal_total, ggr',
      )
      .eq('data', dataOntem),
    supabase
      .from('lives')
      .select('id, influencer_id')
      .eq('data', dataOntem)
      .eq('status', 'realizada'),
    supabase
      .from('relatorio_daily_summary')
      .select('data, turnover, ggr, apostas, operadora_slug')
      .gte('data', inicioMes)
      .lte('data', dataOntem),
    /** Overview Spin (aba Overview) = Dedicado + Network por operadora. */
    supabase
      .from('relatorio_network_daily_summary')
      .select('data, turnover, ggr, apostas, operadora_slug')
      .gte('data', inicioMes)
      .lte('data', dataOntem),
    supabase
      .from('relatorio_monthly_summary')
      .select('mes, uap, operadora_slug')
      .eq('mes', inicioMes),
    supabase
      .from('relatorio_network_monthly_summary')
      .select('mes, uap, operadora_slug')
      .eq('mes', inicioMes),
    supabase.from('operadoras').select('slug, nome').eq('ativo', true).order('nome'),
    supabase
      .from('influencer_metricas')
      .select('influencer_id, registration_count, ftd_count, ggr')
      .gte('data', inicioMes)
      .lte('data', dataOntem),
    supabase
      .from('lives')
      .select('id, influencer_id')
      .eq('status', 'realizada')
      .gte('data', inicioMes)
      .lte('data', dataOntem),
    supabase
      .from('meta_ads_daily')
      .select('spend, impressions')
      .gte('date', inicioMes)
      .lte('date', dataOntem),
    supabase
      .from('kpi_daily')
      .select('impressions, posts_published')
      .gte('date', inicioMes)
      .lte('date', dataOntem),
    supabase.rpc('get_campanhas_performance', {
      p_data_inicio: inicioMes,
      p_data_fim: dataOntem,
      p_operadora_slug: null,
    }),
    supabase
      .from('lobby_monitor_execucao')
      .select('id, operadora_slug, executado_em, status')
      .in('operadora_slug', [...LOBBY_SLUGS])
      .in('status', ['ok', 'parcial'])
      .order('executado_em', { ascending: false })
      .limit(200),
    supabase.from('estudios_spin').select('slug, tipo, ativo').eq('ativo', true),
    supabase
      .from('mesas_spin_cadastro')
      .select('nome_mesa, mesa_identificacao, estudio_slug'),
  ])

  const nameMap: Record<string, string> = {}
  const nomePorSlug = new Map<string, string>()
  const operadorasAtivasMtd: { slug: string; nome: string }[] = []
  for (const o of (operadorasRes.data ?? []) as { slug: string; nome: string }[]) {
    nomePorSlug.set(o.slug, o.nome)
    if (!OPERADORAS_EXCLUIDAS_MTD.has(o.slug)) {
      operadorasAtivasMtd.push({ slug: o.slug, nome: o.nome })
    }
  }

  const infIdsAgenda = [...new Set((livesHojeRes.data ?? []).map((l: { influencer_id: string }) => l.influencer_id))]
  if (infIdsAgenda.length > 0) {
    const { data: profs } = await supabase.from('profiles').select('id, name').in('id', infIdsAgenda)
    for (const p of (profs ?? []) as { id: string; name?: string }[]) nameMap[p.id] = p.name ?? ''
  }

  const agenda: LiveAgenda[] = (livesHojeRes.data ?? []).map((l: {
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

  type MetRow = {
    influencer_id: string
    visit_count: number
    registration_count: number
    ftd_count: number
    deposit_count: number
    deposit_total: number
    withdrawal_count: number
    withdrawal_total: number
    ggr: number
  }

  const metricasPorInf = new Map<string, {
    visits: number
    regs: number
    ftds: number
    depQtd: number
    depVal: number
    wdQtd: number
    wdVal: number
    ggr: number
  }>()

  for (const m of (metricasOntemRes.data ?? []) as MetRow[]) {
    const cur = metricasPorInf.get(m.influencer_id) ?? {
      visits: 0, regs: 0, ftds: 0, depQtd: 0, depVal: 0, wdQtd: 0, wdVal: 0, ggr: 0,
    }
    cur.visits += m.visit_count ?? 0
    cur.regs += m.registration_count ?? 0
    cur.ftds += m.ftd_count ?? 0
    cur.depQtd += m.deposit_count ?? 0
    cur.depVal += m.deposit_total ?? 0
    cur.wdQtd += m.withdrawal_count ?? 0
    cur.wdVal += m.withdrawal_total ?? 0
    cur.ggr += m.ggr ?? 0
    metricasPorInf.set(m.influencer_id, cur)
  }

  const infComLive = new Set(
    (livesOntemRes.data ?? []).map((l: { influencer_id: string }) => l.influencer_id),
  )
  const infIdsAll = [...new Set([...metricasPorInf.keys(), ...infComLive])]

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

  const influencersRows: ResultadoInfluencer[] = []
  for (const id of infIdsAll) {
    const m = metricasPorInf.get(id) ?? {
      visits: 0, regs: 0, ftds: 0, depQtd: 0, depVal: 0, wdQtd: 0, wdVal: 0, ggr: 0,
    }
    const temKpi = m.depQtd > 0 || m.depVal > 0 || m.wdQtd > 0 || m.wdVal > 0 || m.ggr !== 0
    if (infComLive.has(id) || temKpi) {
      influencersRows.push({
        nome: nameMap[id] ?? '—',
        depositos_qtd: m.depQtd,
        depositos_valor: m.depVal,
        saques_qtd: m.wdQtd,
        saques_valor: m.wdVal,
        ggr: m.ggr,
      })
    }
  }

  const uapPorSlug = new Map<string, number | null>()
  const addUapMensal = (
    rows: Array<{ mes: string; uap: number | null; operadora_slug: string }> | null | undefined,
  ) => {
    for (const r of rows ?? []) {
      if (String(r.mes).slice(0, 7) !== ym) continue
      if (OPERADORAS_EXCLUIDAS_MTD.has(r.operadora_slug)) continue
      if (r.uap == null) continue
      const slug = r.operadora_slug
      uapPorSlug.set(slug, (uapPorSlug.get(slug) ?? 0) + Number(r.uap))
    }
  }
  addUapMensal(
    (monthlyRes.data ?? []) as { mes: string; uap: number | null; operadora_slug: string }[],
  )
  addUapMensal(
    (monthlyNetworkRes.data ?? []) as { mes: string; uap: number | null; operadora_slug: string }[],
  )

  const bySlugDaily = new Map<string, Array<{ turnover: number; ggr: number; apostas: number }>>()
  let dataAteMtd = inicioMes
  const ingestDaily = (
    rows: Array<{
      data: string
      turnover: number
      ggr: number
      apostas: number
      operadora_slug: string
    }> | null | undefined,
  ) => {
    for (const r of rows ?? []) {
      const d = String(r.data).slice(0, 10)
      if (d < inicioMes || d > dataOntem) continue
      if (d > dataAteMtd) dataAteMtd = d
      const slug = r.operadora_slug
      if (OPERADORAS_EXCLUIDAS_MTD.has(slug)) continue
      if (!bySlugDaily.has(slug)) bySlugDaily.set(slug, [])
      bySlugDaily.get(slug)!.push({
        turnover: Number(r.turnover) || 0,
        ggr: Number(r.ggr) || 0,
        apostas: Number(r.apostas) || 0,
      })
    }
  }
  ingestDaily(
    (dailyRes.data ?? []) as {
      data: string
      turnover: number
      ggr: number
      apostas: number
      operadora_slug: string
    }[],
  )
  ingestDaily(
    (dailyNetworkRes.data ?? []) as {
      data: string
      turnover: number
      ggr: number
      apostas: number
      operadora_slug: string
    }[],
  )
  if (!(dailyRes.data ?? []).length && !(dailyNetworkRes.data ?? []).length) {
    dataAteMtd = dataOntem
  }

  const metricasPorSlug = new Map<string, OperadoraMtdRow>()
  for (const [slug, dias] of bySlugDaily.entries()) {
    const turnover = dias.reduce((a, x) => a + x.turnover, 0)
    const ggr = dias.reduce((a, x) => a + x.ggr, 0)
    const apostas = dias.reduce((a, x) => a + x.apostas, 0)
    const uap = uapPorSlug.get(slug) ?? null
    metricasPorSlug.set(slug, {
      nome: nomePorSlug.get(slug) ?? slug,
      ggr,
      turnover,
      margem: turnover !== 0 ? (ggr / turnover) * 100 : null,
      apostas,
      apostaMedia: apostas !== 0 ? turnover / apostas : null,
      uap,
      arpu: arpuFromGgrUap(ggr, uap),
    })
  }

  /** Todas as operadoras ativas (parceiras), mesmo sem linha no daily no mês. */
  const operadorasLinhas: OperadoraMtdRow[] = operadorasAtivasMtd
    .map((op) => {
      const m = metricasPorSlug.get(op.slug)
      if (m) return { ...m, nome: op.nome }
      return {
        nome: op.nome,
        ggr: 0,
        turnover: 0,
        margem: null,
        apostas: 0,
        apostaMedia: null,
        uap: uapPorSlug.get(op.slug) ?? null,
        arpu: arpuFromGgrUap(0, uapPorSlug.get(op.slug) ?? null),
      }
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

  const totalGgr = operadorasLinhas.reduce((a, r) => a + r.ggr, 0)
  const totalTurnover = operadorasLinhas.reduce((a, r) => a + r.turnover, 0)
  const totalApostas = operadorasLinhas.reduce((a, r) => a + r.apostas, 0)
  const totalUap = operadorasLinhas.reduce((a, r) => a + (r.uap ?? 0), 0)

  const operadorasMtd: OperadoraMtdRow[] = [
    {
      nome: 'TOTAL',
      ggr: totalGgr,
      turnover: totalTurnover,
      margem: totalTurnover !== 0 ? (totalGgr / totalTurnover) * 100 : null,
      apostas: totalApostas,
      apostaMedia: totalApostas !== 0 ? totalTurnover / totalApostas : null,
      uap: totalUap || null,
      arpu: arpuFromGgrUap(totalGgr, totalUap || null),
      isTotal: true,
    },
    ...operadorasLinhas,
  ]

  let streamersGgr = 0
  let streamersRegs = 0
  let streamersFtds = 0
  for (const m of (metMtdRes.data ?? []) as { registration_count: number; ftd_count: number; ggr: number }[]) {
    streamersGgr += m.ggr ?? 0
    streamersRegs += m.registration_count ?? 0
    streamersFtds += m.ftd_count ?? 0
  }

  const livesMtd = (livesMtdRes.data ?? []) as { id: string }[]
  const liveIds = livesMtd.map((l) => l.id)
  let horasTotal = 0
  for (const batch of chunk(liveIds, 100)) {
    if (batch.length === 0) continue
    const { data: resData } = await supabase
      .from('live_resultados')
      .select('duracao_horas, duracao_min')
      .in('live_id', batch)
    for (const r of (resData ?? []) as { duracao_horas: number; duracao_min: number }[]) {
      horasTotal += (Number(r.duracao_horas) || 0) + (Number(r.duracao_min) || 0) / 60
    }
  }

  const { data: invData, error: invErr } = await supabase.rpc('get_investimento_pago', {
    p_inicio: inicioMes,
    p_fim: dataOntem,
    p_operadora_slug: null,
    p_influencer_ids: null,
    p_include_agentes: true,
  })
  if (invErr) throw new Error(invErr.message)
  if (campRes.error) throw new Error(campRes.error.message)
  const investimentoStreamers = Number((invData as { total?: number })?.total) || 0
  const roiStreamers = investimentoStreamers > 0
    ? ((streamersGgr - investimentoStreamers) / investimentoStreamers) * 100
    : null

  const streamersMtd: StreamersMtdRow = {
    ggr: streamersGgr,
    investimento: investimentoStreamers,
    roi: roiStreamers,
    registros: streamersRegs,
    ftds: streamersFtds,
    lives: livesMtd.length,
    horas: horasTotal,
  }

  const campRows = (campRes.data ?? []) as Array<Record<string, unknown>>
  const campTotais = sumCampanhas(campRows)
  const ggrMidias = campTotais.deposit_total - campTotais.withdrawal_total
  const investimentoMidias = (metaAdsRes.data ?? []).reduce(
    (a: number, r: { spend: number }) => a + (Number(r.spend) || 0),
    0,
  )
  const kpiTotais = totaisKpiOrganic((kpiDailyRes.data ?? []) as Array<{ impressions?: number; posts_published?: number }>)
  const impressoesMeta = (metaAdsRes.data ?? []).reduce(
    (a: number, r: { impressions: number }) => a + (Number(r.impressions) || 0),
    0,
  )
  const roiMidias = investimentoMidias > 0
    ? ((ggrMidias - investimentoMidias) / investimentoMidias) * 100
    : null

  const midiasMtd: MidiasMtdRow = {
    ggr: ggrMidias,
    investimento: investimentoMidias,
    roi: roiMidias,
    registros: campTotais.registros,
    ftds: campTotais.ftds,
    postagens: kpiTotais.postagens,
    impressoes: kpiTotais.impressoes + impressoesMeta,
  }

  // ── Posicionamento: Dedicadas × Network ──
  const tipoPorEstudio = new Map<string, 'dedicado' | 'network'>()
  for (const e of (estudiosRes.data ?? []) as { slug: string; tipo: string | null; ativo: boolean }[]) {
    if (!e.ativo) continue
    const t = e.tipo === 'network' ? 'network' : e.tipo === 'dedicado' ? 'dedicado' : null
    if (t) tipoPorEstudio.set(e.slug, t)
  }

  const nomesDedicadas = new Map<string, string>() // norm → display
  const networkPorId = new Map<string, string>() // mesa_identificacao → nome

  for (const m of (mesasCadRes.data ?? []) as {
    nome_mesa: string
    mesa_identificacao: string
    estudio_slug: string | null
  }[]) {
    const est = (m.estudio_slug ?? '').trim()
    const tipo = tipoPorEstudio.get(est)
    if (!tipo) continue
    const nome = (m.nome_mesa ?? '').trim()
    const id = (m.mesa_identificacao ?? '').trim()
    if (!nome) continue
    if (tipo === 'dedicado') {
      const key = normNomeMesa(nome)
      if (!nomesDedicadas.has(key)) nomesDedicadas.set(key, nome)
    } else if (id) {
      if (!networkPorId.has(id)) networkPorId.set(id, nome)
    }
  }

  const execs = (lobbyExecRes.data ?? []) as Array<{
    id: string
    operadora_slug: string
    executado_em: string
  }>
  const ultimaPorSlug = new Map<string, { id: string; executado_em: string }>()
  for (const e of execs) {
    if (!ultimaPorSlug.has(e.operadora_slug)) {
      ultimaPorSlug.set(e.operadora_slug, { id: e.id, executado_em: e.executado_em })
    }
  }

  let ultimaLeituraGlobal: string | null = null
  for (const slug of LOBBY_SLUGS) {
    const exec = ultimaPorSlug.get(slug)
    if (exec && (!ultimaLeituraGlobal || exec.executado_em > ultimaLeituraGlobal)) {
      ultimaLeituraGlobal = exec.executado_em
    }
  }

  const idxPorSlug = new Map<string, ReturnType<typeof indexPosicoesLobby>>()
  for (const slug of LOBBY_SLUGS) {
    const exec = ultimaPorSlug.get(slug)
    if (!exec) {
      idxPorSlug.set(slug, { byId: new Map(), byNome: new Map() })
      continue
    }
    const posRows = await fetchAllPages<LobbyPosRow>((from, to) =>
      supabase
        .from('lobby_monitor_posicao')
        .select('mesa_identificacao, nome_mesa, posicao')
        .eq('execucao_id', exec.id)
        .range(from, to),
    )
    idxPorSlug.set(slug, indexPosicoesLobby(posRows))
  }

  const blazeIdx = idxPorSlug.get('blaze')!
  const cdaIdx = idxPorSlug.get('casa_apostas')!
  const esportivaIdx = idxPorSlug.get('esportiva_bet')!
  const jonbetIdx = idxPorSlug.get('jonbet')!

  const mesasDedicadas: PosicaoMesaDedicadaRow[] = [...nomesDedicadas.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
    .map(([key, mesa]) => ({
      mesa,
      blaze: blazeIdx.byNome.get(key) ?? null,
      cda: cdaIdx.byNome.get(key) ?? null,
    }))

  const mesasNetwork: PosicaoMesaNetworkRow[] = [...networkPorId.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
    .map(([id, mesa]) => ({
      mesa,
      blaze: blazeIdx.byId.get(id) ?? blazeIdx.byNome.get(normNomeMesa(mesa)) ?? null,
      cda: cdaIdx.byId.get(id) ?? cdaIdx.byNome.get(normNomeMesa(mesa)) ?? null,
      esportiva: esportivaIdx.byId.get(id) ?? esportivaIdx.byNome.get(normNomeMesa(mesa)) ?? null,
      jonbet: jonbetIdx.byId.get(id) ?? jonbetIdx.byNome.get(normNomeMesa(mesa)) ?? null,
    }))

  return {
    dataHoje,
    dataOntem,
    dataAteMtd,
    agenda,
    influencersRows,
    operadorasMtd,
    streamersMtd,
    midiasMtd,
    posicionamentoUltimaLeituraFmt: ultimaLeituraGlobal ? fmtUltimaLeitura(ultimaLeituraGlobal) : null,
    mesasDedicadas,
    mesasNetwork,
  }
}
