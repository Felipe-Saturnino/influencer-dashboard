/**
 * Marketplace de turnos — ofertas (listar / criar / aceitar / cancelar).
 *
 * Listagem vem de `escala_marketplace_ofertas_listar` já em jsonb e com nomes
 * resolvidos no servidor: o prestador não lê `rh_funcionarios` de colegas por RLS.
 * O escopo também é do servidor — Ver = Sim devolve todos os times, Ver = Próprios
 * só o time do prestador.
 *
 * Antecedência: só dias a ≥24h da publicação entram nas listas de oferta
 * (`primeiroDiaOfertavelIso` = hoje + 2, porque a oferta é por dia e não por hora).
 *
 * Gap entre turnos: produto pede ≥12h entre o fim de um turno e o início do
 * seguinte, verificado nas duas pontas do dia negociado (`gapEntreTurnosOk`).
 * Os horários dependem de escala, turno de staff e operadora, que vivem no
 * cliente — por isso a regra é aplicada aqui e no modal, enquanto o banco valida
 * o que é estrutural (dia futuro, escala aprovada, célula coerente, conflito).
 */
import { supabase } from "./supabase";
import { normRhOrgRotuloOrganograma } from "./rhPrestadorUsuarioSync";
import {
  instanteFimTurnoTrabalhadoNoDia,
  instanteInicioTurnoOfertadoNaFolga,
  proximoInicioTurnoTrabalhadoDepoisDoDia,
  ultimoFimTurnoTrabalhadoAntesDaFolga,
  type OperadoraTurnosPick,
  type PrestadorHorarioCtx,
} from "./rhCalendarioGap8hFolga";
import { turnoOperacionalParaSiglaGrade } from "./rhEscalaTurnos";
import {
  turnoExibicaoValorGrade,
  turnosBaseOfertaNaFolga,
  valorCelulaEhFolga,
} from "./rhCalendarioAcaoHelpers";
import type { RhCalendarioAcaoTipo } from "./rhCalendarioAcaoHelpers";
import type {
  EscalaTimeFiltro,
  LinhaOfertaMarketplace,
  OfertaStatusUi,
} from "./escalaTurnosUiConstants";

/** Intervalo mínimo entre turnos no Marketplace (produto: ≥12h). */
export const MS_12H = 12 * 60 * 60 * 1000;

/** Tipos de oferta publicáveis no Marketplace. */
export type TipoOfertaMarketplace = "venda_turno" | "venda_folga" | "oferta_troca" | "troca_cassada";

const TIPOS_OFERTA: ReadonlySet<string> = new Set([
  "venda_turno",
  "venda_folga",
  "oferta_troca",
  "troca_cassada",
]);

/** Linha da oferta como devolvida por `escala_marketplace_ofertas_listar`. */
export type EscalaMarketplaceOfertaDb = {
  id: string;
  tipo: string;
  status: string;
  dia_iso: string;
  valor_celula_origem: string;
  turno_label: string | null;
  dia_iso_interesse: string | null;
  valor_celula_interesse: string | null;
  criado_em: string;
  atualizado_em?: string | null;
  aceito_em?: string | null;
  observacao?: string | null;
  ofertante_funcionario_id: string;
  ofertante_nome: string | null;
  operadora_slug?: string | null;
  operadora_nome?: string | null;
  org_time_id: string;
  time_nome: string | null;
  interessado_funcionario_id: string | null;
  interessado_nome: string | null;
  sou_ofertante?: boolean;
  sou_interessado?: boolean;
  mesmo_time?: boolean;
};

function isoDate(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function texto(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function labelTruncadoUuid(id: string): string {
  const s = id.replace(/-/g, "");
  return s.length >= 8 ? `${s.slice(0, 8)}…` : id;
}

function mapStatusDbParaUi(status: string): OfertaStatusUi {
  switch (status) {
    case "aberta":
      return "aberto";
    case "interessado":
      return "interessado";
    case "aceita":
      return "aprovada";
    case "recusada":
      return "recusada";
    case "cancelada":
    case "expirada":
      return "cancelada";
    default:
      return "aberto";
  }
}

function mapTipoDb(tipo: string): RhCalendarioAcaoTipo {
  if (TIPOS_OFERTA.has(tipo)) return tipo as RhCalendarioAcaoTipo;
  return "venda_turno";
}

/** Mapeia nome do time do organograma → slug do filtro Marketplace. */
export function timeKeyFromOrgTimeNome(nome: string | null | undefined): EscalaTimeFiltro {
  const t = normRhOrgRotuloOrganograma(nome);
  if (t.includes("service manager")) return "service_manager";
  if (t.includes("game presenter")) return "game_presenter";
  if (t.includes("performance coach")) return "performance_coach";
  if (t.includes("shift leader")) return "shift_leader";
  if (t.includes("shuffler")) return "shuffler";
  if (t.includes("treinamento")) return "treinamento";
  return "todos";
}

function turnoLabelOferta(row: EscalaMarketplaceOfertaDb): string {
  const label = texto(row.turno_label);
  if (label) return label;
  const cel = texto(row.valor_celula_origem);
  if (!cel) return "—";
  return turnoExibicaoValorGrade(cel) ?? cel;
}

export function mapOfertaDbParaLinha(row: EscalaMarketplaceOfertaDb): LinhaOfertaMarketplace {
  const ofertanteId = texto(row.ofertante_funcionario_id);
  const interessadoId = texto(row.interessado_funcionario_id);
  const operadora = texto(row.operadora_nome) || texto(row.operadora_slug) || "—";
  const turnoInteresseCel = texto(row.valor_celula_interesse);

  return {
    id: String(row.id),
    dataOfertaIso: isoDate(row.dia_iso),
    dataAberturaIso: isoDate(row.criado_em) || undefined,
    tipo: mapTipoDb(texto(row.tipo)),
    turnoOferta: turnoLabelOferta(row),
    operadora,
    ofertante: texto(row.ofertante_nome) || labelTruncadoUuid(ofertanteId),
    dataInteresseIso: isoDate(row.dia_iso_interesse) || undefined,
    turnoInteresse: turnoInteresseCel
      ? (turnoExibicaoValorGrade(turnoInteresseCel) ?? turnoInteresseCel)
      : undefined,
    timeKey: timeKeyFromOrgTimeNome(row.time_nome),
    status: mapStatusDbParaUi(texto(row.status)),
    comprador: interessadoId
      ? texto(row.interessado_nome) || labelTruncadoUuid(interessadoId)
      : undefined,
    solicitanteStaffId: ofertanteId,
    observacao: texto(row.observacao) || undefined,
    souOfertante: row.sou_ofertante === true,
    souInteressado: row.sou_interessado === true,
    mesmoTime: row.mesmo_time === true,
  };
}

/** Aceita jsonb (array), string serializada ou legado SETOF. */
function parseArrayPayload(data: unknown): unknown[] {
  let payload: unknown = data;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload) as unknown;
    } catch {
      return [];
    }
  }
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.rows)) return obj.rows;
  }
  return [];
}

export function parseOfertasMarketplacePayload(data: unknown): LinhaOfertaMarketplace[] {
  const out: LinhaOfertaMarketplace[] = [];
  for (const item of parseArrayPayload(data)) {
    if (!item || typeof item !== "object") continue;
    const row = item as EscalaMarketplaceOfertaDb;
    if (!texto(row.id)) continue;
    out.push(mapOfertaDbParaLinha(row));
  }
  return out;
}

/**
 * Lista ofertas do Marketplace.
 * @param refMesIso primeiro dia do mês (`YYYY-MM-01`) ou `null` = todo o histórico
 */
export async function carregarOfertasMarketplace(
  refMesIso: string | null,
): Promise<LinhaOfertaMarketplace[]> {
  const { data, error } = await supabase.rpc("escala_marketplace_ofertas_listar", {
    p_ref_mes: refMesIso,
  });
  if (error) {
    console.error("[carregarOfertasMarketplace]", error);
    return [];
  }
  return parseOfertasMarketplacePayload(data);
}

// ─── Contexto do prestador e grade própria ──────────────────────────────────

export type MarketplaceMeuContexto = {
  escopo: "sim" | "proprios";
  funcionarioId: string | null;
  nome: string;
  orgTimeId: string | null;
  timeNome: string;
  areaKey: string;
  areaAtuacao: string;
  horario: PrestadorHorarioCtx;
  operadora: OperadoraTurnosPick | null;
};

function objetoPayload(data: unknown): Record<string, unknown> | null {
  let payload: unknown = data;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload) as unknown;
    } catch {
      return null;
    }
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  return payload as Record<string, unknown>;
}

export function parseMeuContextoMarketplace(data: unknown): MarketplaceMeuContexto | null {
  const obj = objetoPayload(data);
  if (!obj || obj.ok !== true) return null;
  const escopo = obj.escopo === "sim" ? "sim" : "proprios";
  const func = objetoPayload(obj.funcionario);
  const op = objetoPayload(obj.operadora);
  if (!func) {
    return {
      escopo,
      funcionarioId: null,
      nome: "",
      orgTimeId: null,
      timeNome: "",
      areaKey: "",
      areaAtuacao: "",
      horario: { escala: null },
      operadora: null,
    };
  }
  return {
    escopo,
    funcionarioId: texto(func.id) || null,
    nome: texto(func.nome),
    orgTimeId: texto(func.org_time_id) || null,
    timeNome: texto(func.time_nome),
    areaKey: texto(func.area_key),
    areaAtuacao: texto(func.area_atuacao),
    horario: {
      escala: texto(func.escala) || null,
      staff_turno: texto(func.staff_turno) || null,
      staff_horario_turno: texto(func.staff_horario_turno) || null,
    },
    operadora: op
      ? {
          turno_manha_inicio: texto(op.turno_manha_inicio) || null,
          turno_tarde_inicio: texto(op.turno_tarde_inicio) || null,
          turno_noite_inicio: texto(op.turno_noite_inicio) || null,
        }
      : null,
  };
}

export async function carregarMeuContextoMarketplace(): Promise<MarketplaceMeuContexto | null> {
  const { data, error } = await supabase.rpc("escala_marketplace_meu_contexto");
  if (error) {
    console.error("[carregarMeuContextoMarketplace]", error);
    return null;
  }
  return parseMeuContextoMarketplace(data);
}

export type MarketplaceMinhaGrade = {
  aprovada: boolean;
  areaKey: string;
  /** Célula da grade por dia (`YYYY-MM-DD` → valor). */
  valorPorIso: Map<string, string>;
};

export function parseMinhaGradeMarketplace(data: unknown): MarketplaceMinhaGrade {
  const obj = objetoPayload(data);
  const valorPorIso = new Map<string, string>();
  if (!obj || obj.ok !== true) return { aprovada: false, areaKey: "", valorPorIso };
  for (const item of parseArrayPayload(obj.dias)) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const iso = isoDate(r.dia_iso);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue;
    valorPorIso.set(iso, texto(r.valor));
  }
  return {
    aprovada: obj.aprovada === true,
    areaKey: texto(obj.area_key),
    valorPorIso,
  };
}

export async function carregarMinhaGradeMarketplace(
  refMesIso: string,
): Promise<MarketplaceMinhaGrade> {
  const { data, error } = await supabase.rpc("escala_marketplace_minha_grade_mes", {
    p_ref_mes: refMesIso,
  });
  if (error) {
    console.error("[carregarMinhaGradeMarketplace]", error);
    return { aprovada: false, areaKey: "", valorPorIso: new Map() };
  }
  return parseMinhaGradeMarketplace(data);
}

// ─── Regra de intervalo mínimo (12h) ────────────────────────────────────────

export type GapEntreTurnosArgs = {
  /** Dia do turno assumido (`YYYY-MM-DD`). */
  diaIso: string;
  /** Nome do turno assumido no dia (Manhã / Tarde / Noite / Comercial). */
  turnoNome: string;
  /** Grade do prestador: célula por dia. */
  valorPorIso: Map<string, string>;
  horario: PrestadorHorarioCtx;
  operadora: OperadoraTurnosPick | null | undefined;
  /** Gap mínimo em milissegundos (default 12h). */
  gapMs?: number;
};

/**
 * `true` se assumir `turnoNome` em `diaIso` respeita o gap mínimo nas duas pontas:
 * após o último turno trabalhado antes do dia e antes do próximo turno depois dele.
 * Sem horários resolvíveis (cadastro incompleto) não bloqueia — a validação
 * estrutural do banco continua valendo.
 */
export function gapEntreTurnosOk(args: GapEntreTurnosArgs): boolean {
  const { diaIso, turnoNome, valorPorIso, horario, operadora } = args;
  const gapMs = args.gapMs ?? MS_12H;

  const inicio = instanteInicioTurnoOfertadoNaFolga(diaIso, turnoNome, horario, operadora);
  if (!inicio) return true;

  const ultimoFim = ultimoFimTurnoTrabalhadoAntesDaFolga(diaIso, valorPorIso, horario, operadora);
  if (ultimoFim && inicio.getTime() - ultimoFim.getTime() < gapMs) return false;

  const proximoInicio = proximoInicioTurnoTrabalhadoDepoisDoDia(
    diaIso,
    valorPorIso,
    horario,
    operadora,
  );
  if (!proximoInicio) return true;

  const fim = instanteFimTurnoTrabalhadoNoDia(
    diaIso,
    valorCelulaDoTurno(turnoNome),
    horario,
    operadora,
  );
  if (!fim) return true;
  return proximoInicio.getTime() - fim.getTime() >= gapMs;
}

/** Nome do turno → valor equivalente na célula da grade (`MRN`/`AFT`/`NGT`/`Comercial`). */
function valorCelulaDoTurno(turnoNome: string): string {
  const nome = turnoNome.trim();
  if (nome === "Comercial") return "Comercial";
  return turnoOperacionalParaSiglaGrade(nome) || nome;
}

/**
 * Turnos que o prestador pode ofertar num dia de folga respeitando o gap de 12h
 * nas duas pontas: depois do último turno trabalhado e antes do próximo.
 * Ex.: Noite no dia 12 e folga no 13 → no 13 só a Noite fica disponível; no 14
 * todos os turnos voltam a caber.
 */
export function turnosOfertaveisNaFolgaMarketplace(
  diaFolgaIso: string,
  valorPorIso: Map<string, string>,
  horario: PrestadorHorarioCtx,
  operadora: OperadoraTurnosPick | null | undefined,
): string[] {
  return turnosBaseOfertaNaFolga(horario.escala).filter((turnoNome) =>
    gapEntreTurnosOk({ diaIso: diaFolgaIso, turnoNome, valorPorIso, horario, operadora }),
  );
}

// ─── Dias elegíveis para ofertar ────────────────────────────────────────────

export type DiaOfertavelMarketplace = {
  iso: string;
  label: string;
  /** Turno da célula (dias escalados) — vazio em dias de folga. */
  turno: string;
  valorCelula: string;
};

function labelDiaCurto(iso: string): string {
  const [y, mo, d] = iso.slice(0, 10).split("-");
  if (!y || !mo || !d) return iso;
  return `${d}/${mo}/${y}`;
}

function isoLocal(ref: Date): string {
  const p2 = (n: number) => String(n).padStart(2, "0");
  return `${ref.getFullYear()}-${p2(ref.getMonth() + 1)}-${p2(ref.getDate())}`;
}

/**
 * Produto exige ≥24h de antecedência entre a publicação e o dia negociado.
 * Como a oferta é por dia (não por horário), o primeiro dia elegível é
 * `hoje + 2` — assim qualquer horário de publicação respeita as 24h.
 */
export const DIAS_ANTECEDENCIA_MINIMA_OFERTA = 2;

/** Primeiro dia (`YYYY-MM-DD`) que pode ser ofertado a partir de `ref`. */
export function primeiroDiaOfertavelIso(ref: Date = new Date()): string {
  const limite = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  limite.setDate(limite.getDate() + DIAS_ANTECEDENCIA_MINIMA_OFERTA);
  return isoLocal(limite);
}

function isoComAntecedenciaMinima(iso: string, primeiroIso: string): boolean {
  return iso.slice(0, 10) >= primeiroIso;
}

/**
 * Dias do mês que o prestador pode ofertar conforme o tipo, sempre com ≥24h de
 * antecedência: turno/troca = dias em que está escalado; folga = dias de folga.
 * Células já negociadas (Compra / Venda / Troca) ficam fora.
 */
export function diasOfertaveisMarketplace(
  tipo: TipoOfertaMarketplace,
  valorPorIso: Map<string, string>,
  hoje: Date = new Date(),
): DiaOfertavelMarketplace[] {
  const primeiroIso = primeiroDiaOfertavelIso(hoje);
  const out: DiaOfertavelMarketplace[] = [];
  const isos = [...valorPorIso.keys()].sort();

  for (const iso of isos) {
    if (!isoComAntecedenciaMinima(iso, primeiroIso)) continue;
    const valor = (valorPorIso.get(iso) ?? "").trim();
    if (!valor) continue;

    if (tipo === "venda_folga") {
      if (!valorCelulaEhFolga(valor)) continue;
      out.push({ iso, label: labelDiaCurto(iso), turno: "", valorCelula: valor });
      continue;
    }

    if (valorCelulaEhFolga(valor)) continue;
    const turno = turnoExibicaoValorGrade(valor);
    if (!turno || turno === "Compra" || turno === "Venda" || turno === "Troca") continue;
    out.push({ iso, label: `${labelDiaCurto(iso)} — ${turno}`, turno, valorCelula: valor });
  }

  return out;
}

// ─── Mutações ───────────────────────────────────────────────────────────────

type RpcResultado = { ok?: boolean; error?: string; id?: string; area_key?: string } | null;

function payloadResultado(data: unknown): RpcResultado {
  const obj = objetoPayload(data);
  if (!obj) return null;
  return obj as RpcResultado;
}

export type AceitarOfertaMarketplaceResult =
  | { ok: true; areaKey?: string }
  | { ok: false; error: string };

export async function aceitarOfertaMarketplace(
  id: string,
  diaInteresse?: string | null,
  valorInteresse?: string | null,
): Promise<AceitarOfertaMarketplaceResult> {
  const { data, error } = await supabase.rpc("escala_marketplace_oferta_aceitar", {
    p_oferta_id: id,
    p_dia_iso_interesse: diaInteresse ?? null,
    p_valor_celula_interesse: valorInteresse ?? null,
  });
  if (error) {
    console.error("[aceitarOfertaMarketplace]", error);
    return { ok: false, error: "rpc_error" };
  }
  const payload = payloadResultado(data);
  if (!payload?.ok) {
    return { ok: false, error: payload?.error ?? "unknown" };
  }
  return { ok: true, areaKey: payload.area_key };
}

export type CriarOfertaMarketplaceInput = {
  tipo: TipoOfertaMarketplace;
  diaIso: string;
  valorCelula: string;
  turnoLabel?: string | null;
  observacao?: string | null;
};

export type CriarOfertaMarketplaceResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function criarOfertaMarketplace(
  input: CriarOfertaMarketplaceInput,
): Promise<CriarOfertaMarketplaceResult> {
  const { data, error } = await supabase.rpc("escala_marketplace_oferta_criar", {
    p_tipo: input.tipo,
    p_dia_iso: input.diaIso,
    p_valor_celula: input.valorCelula,
    p_turno_label: input.turnoLabel ?? null,
    p_observacao: input.observacao ?? null,
  });
  if (error) {
    console.error("[criarOfertaMarketplace]", error);
    return { ok: false, error: "rpc_error" };
  }
  const payload = payloadResultado(data);
  if (!payload?.ok || !payload.id) {
    return { ok: false, error: payload?.error ?? "unknown" };
  }
  return { ok: true, id: String(payload.id) };
}

export type CancelarOfertaMarketplaceResult = { ok: true } | { ok: false; error: string };

export async function cancelarOfertaMarketplace(
  id: string,
): Promise<CancelarOfertaMarketplaceResult> {
  const { data, error } = await supabase.rpc("escala_marketplace_oferta_cancelar", {
    p_oferta_id: id,
  });
  if (error) {
    console.error("[cancelarOfertaMarketplace]", error);
    return { ok: false, error: "rpc_error" };
  }
  const payload = payloadResultado(data);
  if (!payload?.ok) {
    return { ok: false, error: payload?.error ?? "unknown" };
  }
  return { ok: true };
}

// ─── Mensagens de erro (PT-BR) ──────────────────────────────────────────────

const MSG_ERRO_GENERICO =
  "Não foi possível concluir a ação. Se o problema persistir, entre em contato com o suporte.";

const MENSAGENS_ERRO_OFERTA: Record<string, string> = {
  forbidden: "Você não tem permissão para esta ação no Marketplace.",
  dia_nao_futuro: "Só é possível ofertar dias futuros.",
  antecedencia_minima: "A oferta precisa de pelo menos 24h de antecedência.",
  prestador_nao_encontrado:
    "Não encontramos o seu cadastro de prestador de estúdio. Entre em contato com o suporte.",
  area_invalida: "O seu time não está configurado na Escala Estúdio. Entre em contato com o suporte.",
  escala_nao_aprovada: "A escala do mês ainda não está aprovada.",
  oferta_duplicada: "Você já tem uma oferta aberta para este dia.",
  dia_nao_folga: "Este dia não está como folga na sua escala.",
  dia_sem_turno: "Este dia não tem turno na sua escala.",
  dia_em_negociacao: "Este dia já está em negociação na escala (Compra, Venda ou Troca).",
  turno_obrigatorio: "Escolha o turno que pretende trabalhar.",
  not_found: "Esta oferta não está mais disponível.",
  status_invalido: "Esta oferta já foi aceita ou encerrada.",
  mesmo_ofertante: "Você não pode aceitar a sua própria oferta.",
  times_diferentes: "O aceite só é permitido entre prestadores do mesmo time.",
  aceitante_ja_escalado: "Você já tem turno neste dia.",
  aceitante_sem_turno: "Você precisa estar escalado neste dia para aceitar esta oferta.",
  aceitante_em_negociacao: "O seu dia já está em negociação na escala (Compra, Venda ou Troca).",
  turno_diferente: "O turno oferecido não é o mesmo do seu turno neste dia.",
  dia_interesse_obrigatorio: "Escolha o dia que você oferece em troca.",
  dia_interesse_nao_futuro: "O dia oferecido em troca deve ser futuro.",
  escala_interesse_nao_aprovada:
    "A escala do mês do dia oferecido em troca ainda não está aprovada.",
  dia_interesse_sem_turno: "O dia oferecido em troca não tem turno na sua escala.",
  dia_interesse_em_negociacao: "O dia oferecido em troca já está em negociação na escala.",
  ofertante_ja_escalado: "O ofertante já tem turno no dia que você oferece em troca.",
  nao_e_ofertante: "Só o autor da oferta pode cancelá-la.",
  gap_minimo: "É necessário respeitar o intervalo mínimo de 12h entre turnos.",
};

/** Mensagem de produto para o código devolvido pelas RPCs do Marketplace. */
export function mensagemErroOfertaMarketplace(codigo: string): string {
  return MENSAGENS_ERRO_OFERTA[codigo] ?? MSG_ERRO_GENERICO;
}
