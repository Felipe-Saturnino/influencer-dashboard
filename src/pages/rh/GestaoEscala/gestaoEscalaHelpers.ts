import type { CSSProperties } from "react";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import {
  escalaPrestadorTemTurnosOperacionais,
  staffTurnoCoerenteComEscala,
  TURNO_ESCALA_5x2,
  turnoOperacionalParaSiglaGrade,
  turnoRhCoerenteComEscala,
  turnoStaffEhComercial5x2,
} from "../../../lib/rhEscalaTurnos";
import { feriadoLabelSaoPauloCapital } from "../../../lib/feriadosSaoPauloCapital";
import { valorCelulaHorarioComercialSintetico } from "../../../lib/overviewPrestadorCalendarioHelpers";
import {
  aplicarTurnoSnapshotNaLinha,
  chaveTurnoMes,
  sanitizarValorCelulaAlterarEscala,
  type EscalaTurnoMesMap,
} from "../../../lib/gestaoEscalaTurnoMes";
import {
  turnoOperacionalValorGrade,
  valorCelulaEhFolgaOperacional,
} from "../../../lib/rhCalendarioAcaoHelpers";
import {
  FILTRO_STAFF_ESTUDIO_NENHUM,
  FILTRO_STAFF_ESTUDIO_TODOS,
  STAFF_ESTUDIO_CADASTRO_TODOS,
  staffEstudioAtendeTodos,
  staffEstudioSlugsFromRow,
  staffRowPassaFiltroEstudio,
} from "../GestaoStaff/gestaoStaffEstudioHelpers";
import type { EscalaAlteracaoCelulaMeta } from "./CelulaIndicadorAlteracaoEscala";

const HELPERS_TURNO_SNAPSHOT = {
  escalaPrestadorTemTurnosOperacionais,
  staffTurnoCoerenteComEscala,
  turnoRhCoerenteComEscala,
  turnoOperacionalParaSiglaGrade,
} as const;

export type DiaMes = {
  dia: number;
  dowShort: string;
  isWeekend: boolean;
  /** Feriado nacional/municipal usual em São Paulo (capital) — mesma identificação visual do fim de semana. */
  isFeriadoSP: boolean;
  feriadoNome: string | null;
  iso: string;
};

/** Sábado, domingo ou feriado em SP (capital) para cor de cabeçalho / células. */
export function diaComDestaqueCalendario(dia: DiaMes): boolean {
  return dia.isWeekend || dia.isFeriadoSP;
}

export type LinhaColaborador = {
  id: string;
  nome: string;
  /** Nome completo do cadastro (Gestão de Prestadores) — título/aria-label. */
  nomeCompletoCadastro: string;
  nickname: string;
  /** Padrão 4x2/3x3 etc. (Gestão de Prestadores) — define opções na grade de geração. */
  escalaCadastro: string;
  /** Sigla do turno na Staff (MRN/AFT/NGT) para a grade; vazio se sem turno aplicável. */
  siglaTurnoStaff: string;
  /** Turno na Gestão de Staff (Manhã, Tarde ou Noite) — coluna fixa da tabela. */
  turnoStaffNome: string;
  /** Live no Estúdio (Gestão de Staff) — primeiro dia do ciclo de escala na sugestão. */
  liveNoEstudioIso: string | null;
};

/** Estado persistido em `rh_gestao_escala_grade_status` (null = sem linha na BD ainda). */
export type GradeStatusMetaDb = "rascunho" | "aprovada";

/** Estado da geração de escala por área (time). */
export type EscalaGerarEstadoFiltro = {
  celulas: Record<string, string>;
  statusGradeDb?: GradeStatusMetaDb | null;
  aprovadoEmDb?: string | null;
  aprovadoPorDb?: string | null;
  baseline: Record<string, string> | null;
  /** Grade sanitizada igual à última carga/salvamento no Supabase (para exibir «Salvar» só se houver diferença). */
  celulasSincronizadasComDb?: Record<string, string> | null;
  /** Após «Sugestão de Escala» ou primeira edição manual — mostra Nova Escala / Salvar / Aprovar. */
  posSugestao?: boolean;
  /** Legado (localStorage): tratar como `posSugestao`. */
  posSugestaoCs?: boolean;
  /** Última alteração pontual por célula (`prestadorId|YYYY-MM-DD`) — modal Alterar Escala. */
  alteracoesPorCelula?: Record<string, EscalaAlteracaoCelulaMeta>;
  /** Comentário de Compra/Venda/Troca originado no Marketplace. */
  comentariosMarketplacePorCelula?: Record<string, EscalaMarketplaceCelulaComentario>;
};

export function escalaGradeAprovadaNaBase(est: EscalaGerarEstadoFiltro | undefined): boolean {
  return est?.statusGradeDb === "aprovada";
}

export function posSugestaoAtiva(est: EscalaGerarEstadoFiltro | undefined): boolean {
  return Boolean(est?.posSugestao ?? est?.posSugestaoCs);
}

/** Escala Estúdio (`rh_gestao_escala`) vs Escala Escritório (`escala_escritorio`). */
export type EscalaGradeModo = "estudio" | "escritorio";

export function chaveStorageEscalaMes(ano: number, mes0: number, modo: EscalaGradeModo = "estudio"): string {
  const suffix = modo === "escritorio" ? "escritorio_" : "";
  return `rh_gestao_escala_v1_${suffix}${ano}-${String(mes0 + 1).padStart(2, "0")}`;
}

export function carregarEscalaMesGravada(
  ano: number,
  mes0: number,
  modo: EscalaGradeModo = "estudio",
): Record<string, EscalaGerarEstadoFiltro> {
  try {
    const r = localStorage.getItem(chaveStorageEscalaMes(ano, mes0, modo));
    if (!r) return {};
    const p = JSON.parse(r) as Record<string, EscalaGerarEstadoFiltro & { aprovado?: boolean }>;
    if (!p || typeof p !== "object") return {};
    for (const k of Object.keys(p)) {
      const v = p[k];
      if (v && typeof v === "object" && "aprovado" in v) {
        delete (v as { aprovado?: boolean }).aprovado;
      }
    }
    return p;
  } catch {
    return {};
  }
}

export function gravarEscalaMes(
  ano: number,
  mes0: number,
  est: Record<string, EscalaGerarEstadoFiltro>,
  modo: EscalaGradeModo = "estudio",
): void {
  try {
    const stripped: Record<string, EscalaGerarEstadoFiltro> = {};
    for (const [k, v] of Object.entries(est)) {
      const {
        alteracoesPorCelula: _omit,
        comentariosMarketplacePorCelula: _omitMarketplace,
        ...rest
      } = v;
      stripped[k] = rest;
    }
    localStorage.setItem(chaveStorageEscalaMes(ano, mes0, modo), JSON.stringify(stripped));
  } catch {
    /* quota / privado */
  }
}

/** Registra ações apenas no cliente (sugestão / nova escala em rascunho). */
export async function registrarHistoricoEscalaAcao(
  refMesIso: string,
  areaKey: string,
  acao: "sugestao" | "nova_escala",
): Promise<void> {
  try {
    await supabase.rpc("rh_gestao_escala_historico_registrar", {
      p_ref_mes: refMesIso,
      p_area_key: areaKey,
      p_acao: acao,
      p_detalhes: {},
    });
  } catch {
    /* histórico não bloqueia o fluxo principal */
  }
}

/** Primeiro dia do mês (YYYY-MM-DD) para RPC `date`. */
export function refMesISO(ano: number, mes0: number): string {
  return `${ano}-${String(mes0 + 1).padStart(2, "0")}-01`;
}

export type RpcGradeCarregarRow = {
  funcionario_id: string;
  dia_iso: string;
  valor: string | null;
};

/** Aceita jsonb (array) ou legado SETOF/TABLE — evita truncar ~1000 linhas no PostgREST. */
export function parseRhGestaoEscalaGradeCarregarPayload(data: unknown): RpcGradeCarregarRow[] {
  let payload: unknown = data;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(payload)) return [];
  const out: RpcGradeCarregarRow[] = [];
  for (const item of payload) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const funcionario_id = String(r.funcionario_id ?? "").trim();
    if (!funcionario_id) continue;
    const diaRaw = r.dia_iso;
    const dia_iso =
      typeof diaRaw === "string"
        ? diaRaw.slice(0, 10)
        : diaRaw instanceof Date
          ? diaRaw.toISOString().slice(0, 10)
          : String(diaRaw ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia_iso)) continue;
    out.push({
      funcionario_id,
      dia_iso,
      valor: r.valor == null ? null : String(r.valor),
    });
  }
  return out;
}

export type RpcGradeSalvarResult = {
  ok?: boolean;
  error?: string;
};

export type RpcGradeMetaRow = {
  area_key: string;
  status: string;
  aprovado_em: string | null;
  aprovado_por: string | null;
};

export type RpcGradeAprovarResult = {
  ok?: boolean;
  error?: string;
  aprovado_em?: string;
  aprovado_por?: string | null;
};

export type RpcGradeResetarResult = {
  ok?: boolean;
  error?: string;
};

export type RpcAlteracaoUltimaRow = {
  funcionario_id: string;
  dia_iso: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  observacao: string | null;
  alterado_em: string;
  alterado_por_nome: string | null;
};

export type EscalaMarketplaceCelulaComentario = {
  tipo: "compra" | "venda" | "troca";
  contraparteNome: string;
  turnoTrabalhar: string | null;
  estudioTrabalhar: string | null;
};

export function mapMarketplaceComentariosPorCelula(
  data: unknown,
): Record<string, EscalaMarketplaceCelulaComentario> {
  let payload: unknown = data;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload) as unknown;
    } catch {
      return {};
    }
  }
  if (!Array.isArray(payload)) return {};

  const out: Record<string, EscalaMarketplaceCelulaComentario> = {};
  for (const item of payload) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const funcionarioId = String(row.funcionario_id ?? "").trim();
    const diaIso = String(row.dia_iso ?? "").slice(0, 10);
    const tipo = String(row.tipo ?? "").trim();
    const contraparteNome = String(row.contraparte_nome ?? "").trim();
    if (
      !funcionarioId ||
      !/^\d{4}-\d{2}-\d{2}$/.test(diaIso) ||
      !["compra", "venda", "troca"].includes(tipo) ||
      !contraparteNome
    ) {
      continue;
    }
    out[chaveCelulaGerar(funcionarioId, diaIso)] = {
      tipo: tipo as EscalaMarketplaceCelulaComentario["tipo"],
      contraparteNome,
      turnoTrabalhar: row.turno_trabalhar == null ? null : String(row.turno_trabalhar).trim() || null,
      estudioTrabalhar:
        row.estudio_trabalhar == null ? null : String(row.estudio_trabalhar).trim() || null,
    };
  }
  return out;
}

export function mapAlteracoesUltimasPorCelula(rows: RpcAlteracaoUltimaRow[]): Record<string, EscalaAlteracaoCelulaMeta> {
  const out: Record<string, EscalaAlteracaoCelulaMeta> = {};
  for (const row of rows) {
    const isoRaw = row.dia_iso;
    const iso = typeof isoRaw === "string" ? isoRaw.slice(0, 10) : String(isoRaw).slice(0, 10);
    const k = chaveCelulaGerar(row.funcionario_id, iso);
    out[k] = {
      valorAnterior: (row.valor_anterior ?? "").trim(),
      alteradoPorNome: (row.alterado_por_nome ?? "").trim() || "Usuário",
      alteradoEm: row.alterado_em,
      observacao: row.observacao,
    };
  }
  return out;
}

export function chaveCelulaGerar(rowId: string, iso: string): string {
  return `${rowId}|${iso}`;
}

/** Mapa `funcionarioId|YYYY-MM-DD` → valor a partir do payload da RPC `grade_carregar`. */
export function mapaCelulasFromGradeCarregarPayload(data: unknown): Record<string, string> {
  const fromDb: Record<string, string> = {};
  for (const row of parseRhGestaoEscalaGradeCarregarPayload(data)) {
    fromDb[chaveCelulaGerar(row.funcionario_id, row.dia_iso)] = (row.valor ?? "").trim();
  }
  return fromDb;
}

export function celulasIguais(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if ((a[k] ?? "").trim() !== (b[k] ?? "").trim()) return false;
  }
  return true;
}

export type RpcPrestadorEscala = {
  id: string;
  nome: string;
  cargo: string | null;
  escala: string;
  staff_turno?: string | null;
  email: string;
  org_time_id: string | null;
  /** Gerência do Organograma (prestador só na gerência quando `org_time_id` é null). */
  org_gerencia_id?: string | null;
  nome_time: string;
  staff_nickname: string | null;
  /** Slug do estúdio primário (legado). */
  staff_estudio_slug?: string | null;
  /** Slugs específicos ou {todos} — filtro multi-estúdio na UI. */
  staff_estudio_slugs?: string[] | null;
  /** Legado — fallback de estúdio quando staff_estudio_slug ausente. */
  staff_operadora_slug?: string | null;
  /** Data da live no estúdio — ancoragem do padrão de escala (Gestão de Staff). */
  staff_live_no_estudio?: string | null;
  area_atuacao?: string | null;
};

/** Chave da aba/time na grade (`service_manager`, `eo_<uuid32>`, `g_<uuid32>`, …). */
export type AreaEscalaKey = string;

export type AreaEscalaLegada =
  | "game_presenter"
  | "shift_leader"
  | "shuffler"
  | "service_manager"
  | "customer_service"
  /** Aba unificada: Performance Coach + Treinamento (rótulo Academy). */
  | "academy";

export type AbaEscalaTipo = "time" | "gerencia";

export type AbaEscalaTime = {
  areaKey: AreaEscalaKey;
  /** Id do time ou da gerência (quando `tipo === "gerencia"`). */
  timeId: string;
  label: string;
  tipo: AbaEscalaTipo;
};

/** Filtro da Escala Diária acionado pelas linhas clicáveis do Consolidado (turno da Staff). */
export type FiltroTurnoConsolidadoRh = "manha" | "tarde" | "noite" | "comercial";

export type EscalaDiariaSortCol = "nome" | "nickname" | "turno";

export function linhaColaboradorNoFiltroTurnoConsolidado(
  row: LinhaColaborador,
  filtro: FiltroTurnoConsolidadoRh | null,
): boolean {
  if (filtro == null) return true;
  const nome = (row.turnoStaffNome ?? "").trim();
  switch (filtro) {
    case "manha":
      return nome === "Manhã";
    case "tarde":
      return nome === "Tarde";
    case "noite":
      return nome === "Noite";
    case "comercial":
      return nome === "Comercial" || nome === TURNO_ESCALA_5x2 || !row.siglaTurnoStaff.trim();
    default:
      return true;
  }
}

/** Ordem dos botões de área abaixo do carrossel do mês (Escala Estúdio). */
export const AREA_ESCALA_ORDEM_BOTOES: readonly AreaEscalaLegada[] = [
  "game_presenter",
  "shuffler",
  "shift_leader",
  "service_manager",
  "academy",
];

export const DEFAULT_AREA_ESCALA: AreaEscalaKey = "game_presenter";

export function isAreaEscalaLegada(area: string): area is AreaEscalaLegada {
  return (
    area === "game_presenter" ||
    area === "shift_leader" ||
    area === "shuffler" ||
    area === "service_manager" ||
    area === "customer_service" ||
    area === "academy"
  );
}

export function normalizarNomeTimeRh(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Performance Coach + Treinamento → aba Academy (Escala Estúdio). */
export function nomeOrganogramaEhGrupoAcademy(nome: string | null | undefined): boolean {
  const nt = normalizarNomeTimeRh(nome);
  if (!nt) return false;
  if (nt.includes("performance coach")) return true;
  if (nt === "academy") return true;
  if (nt === "treinamento" || nt.startsWith("treinamento ")) return true;
  return false;
}

/** Time Arte não entra na Escala Escritório. */
export function nomeOrganogramaExcluidoEscalaEscritorio(nome: string | null | undefined): boolean {
  return normalizarNomeTimeRh(nome) === "arte";
}

export function uuidFromHex32(hex: string): string | null {
  const s = hex.replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(s)) return null;
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

/** Extrai `org_time_id` de `eo_<hex32>` / `t_<hex32>`. */
export function orgTimeIdFromAreaKey(area: AreaEscalaKey): string | null {
  const a = (area ?? "").trim().toLowerCase();
  if (a.startsWith("eo_") && !a.startsWith("eog_")) {
    return uuidFromHex32(a.slice(3));
  }
  if (a.startsWith("t_")) {
    return uuidFromHex32(a.slice(2));
  }
  return null;
}

/** Extrai `org_gerencia_id` de `g_<hex32>` (Estúdio) / `eog_<hex32>` (Escritório). */
export function orgGerenciaIdFromAreaKey(area: AreaEscalaKey): string | null {
  const a = (area ?? "").trim().toLowerCase();
  if (a.startsWith("eog_")) return uuidFromHex32(a.slice(4));
  if (a.startsWith("g_")) return uuidFromHex32(a.slice(2));
  return null;
}

export function areaKeyLegadoFromNomeTime(nomeTimeRaw: string | null | undefined): AreaEscalaLegada | null {
  const nt = normalizarNomeTimeRh(nomeTimeRaw);
  if (!nt) return null;
  if (nomeOrganogramaEhGrupoAcademy(nomeTimeRaw)) return "academy";
  if (nt.includes("game presenter")) return "game_presenter";
  if (nt.includes("shift leader")) return "shift_leader";
  if (nt.includes("shuffler")) return "shuffler";
  if (nt.includes("service manager")) return "service_manager";
  return null;
}

/** Mapeia time do Organograma → `area_key` persistida na grade. */
export function areaKeyFromOrgTime(modo: EscalaGradeModo, timeId: string, nomeTime: string): AreaEscalaKey {
  const id = (timeId ?? "").trim().toLowerCase();
  if (!id) return modo === "escritorio" ? "eo_unknown" : "t_unknown";
  if (modo === "estudio") {
    const legado = areaKeyLegadoFromNomeTime(nomeTime);
    if (legado) return legado;
    return `t_${id.replace(/-/g, "")}`;
  }
  return `eo_${id.replace(/-/g, "")}`;
}

/** Mapeia gerência sem times → `area_key` (`g_` / `eog_`). Treinamento (Estúdio) → `academy`. */
export function areaKeyFromOrgGerencia(
  modo: EscalaGradeModo,
  gerenciaId: string,
  nomeGerencia?: string,
): AreaEscalaKey {
  if (modo === "estudio" && nomeOrganogramaEhGrupoAcademy(nomeGerencia)) return "academy";
  const id = (gerenciaId ?? "").trim().toLowerCase().replace(/-/g, "");
  if (!id) return modo === "escritorio" ? "eog_unknown" : "g_unknown";
  return modo === "escritorio" ? `eog_${id}` : `g_${id}`;
}

export function buildAbasEscalaFromTimes(
  modo: EscalaGradeModo,
  times: { id: string; nome: string; tipo?: AbaEscalaTipo | string | null }[],
): AbaEscalaTime[] {
  const abasBrutas: AbaEscalaTime[] = [];
  for (const t of times) {
    const timeId = String(t.id ?? "").trim();
    const labelRaw = (t.nome ?? "").trim() || (t.tipo === "gerencia" ? "Gerência" : "Time");
    if (!timeId) continue;
    if (modo === "escritorio" && nomeOrganogramaExcluidoEscalaEscritorio(labelRaw)) continue;
    const tipo: AbaEscalaTipo = t.tipo === "gerencia" ? "gerencia" : "time";
    const areaKey =
      tipo === "gerencia"
        ? areaKeyFromOrgGerencia(modo, timeId, labelRaw)
        : areaKeyFromOrgTime(modo, timeId, labelRaw);
    abasBrutas.push({
      areaKey,
      timeId,
      label: labelRaw,
      tipo: areaKey === "academy" ? "time" : tipo,
    });
  }

  // Unifica Performance Coach + Treinamento numa única aba Academy.
  const porChave = new Map<string, AbaEscalaTime>();
  for (const aba of abasBrutas) {
    const prev = porChave.get(aba.areaKey);
    if (!prev) {
      porChave.set(aba.areaKey, aba);
      continue;
    }
    if (aba.areaKey !== "academy") continue;
    const prevEhPc = normalizarNomeTimeRh(prev.label).includes("performance coach");
    const novoEhPc = normalizarNomeTimeRh(aba.label).includes("performance coach");
    if (novoEhPc && !prevEhPc) {
      porChave.set(aba.areaKey, aba);
    }
  }

  const abas = [...porChave.values()].map((a) =>
    a.areaKey === "academy" ? { ...a, label: "Academy", tipo: "time" as const } : a,
  );

  if (modo === "estudio") {
    abas.sort((a, b) => {
      const ia = AREA_ESCALA_ORDEM_BOTOES.indexOf(a.areaKey as AreaEscalaLegada);
      const ib = AREA_ESCALA_ORDEM_BOTOES.indexOf(b.areaKey as AreaEscalaLegada);
      const ra = ia >= 0 ? ia : 1000;
      const rb = ib >= 0 ? ib : 1000;
      if (ra !== rb) return ra - rb;
      if (a.tipo !== b.tipo) return a.tipo === "time" ? -1 : 1;
      return a.label.localeCompare(b.label, "pt-BR");
    });
  } else {
    abas.sort((a, b) => {
      if (a.tipo !== b.tipo) return a.tipo === "time" ? -1 : 1;
      return a.label.localeCompare(b.label, "pt-BR");
    });
  }
  return abas;
}

export function nomeTimePassaNaArea(nomeTimeRaw: string | null | undefined, area: AreaEscalaKey): boolean {
  if (!isAreaEscalaLegada(area)) return false;
  const nt = normalizarNomeTimeRh(nomeTimeRaw);
  if (!nt) return false;
  switch (area) {
    case "game_presenter":
      return nt.includes("game presenter");
    case "shift_leader":
      return nt.includes("shift leader");
    case "shuffler":
      return nt.includes("shuffler");
    case "service_manager":
      return nt.includes("service manager");
    case "customer_service":
      return nt.includes("customer service");
    case "academy":
      return nomeOrganogramaEhGrupoAcademy(nomeTimeRaw);
    default:
      return false;
  }
}

export function labelAreaEscala(area: AreaEscalaKey, abas?: AbaEscalaTime[]): string {
  const fromAba = abas?.find((a) => a.areaKey === area)?.label;
  if (fromAba) return fromAba;
  const m: Record<AreaEscalaLegada, string> = {
    game_presenter: "Game Presenter",
    shift_leader: "Shift Leader",
    shuffler: "Shuffler",
    service_manager: "Service Manager",
    customer_service: "Customer Service",
    academy: "Academy",
  };
  if (isAreaEscalaLegada(area)) return m[area];
  return area;
}

export function filtrarPorArea(rows: RpcPrestadorEscala[], area: AreaEscalaKey): RpcPrestadorEscala[] {
  if (isAreaEscalaLegada(area)) {
    return rows.filter((p) => nomeTimePassaNaArea(p.nome_time, area));
  }
  const gerenciaId = orgGerenciaIdFromAreaKey(area);
  if (gerenciaId) {
    return rows.filter(
      (p) =>
        !(p.org_time_id ?? "").trim() &&
        (p.org_gerencia_id ?? "").trim().toLowerCase() === gerenciaId.toLowerCase(),
    );
  }
  const timeId = orgTimeIdFromAreaKey(area);
  if (!timeId) return [];
  return rows.filter((p) => (p.org_time_id ?? "").trim().toLowerCase() === timeId.toLowerCase());
}

/** Filtro global por estúdio da Staff (`todos` | `nenhum` | slug ativo). */
export function filtrarPrestadoresPorEstudio(
  rows: RpcPrestadorEscala[],
  filtroEstudio: string,
  opParaEstudio: Record<string, string>,
): RpcPrestadorEscala[] {
  return rows.filter((p) => staffRowPassaFiltroEstudio(p, filtroEstudio, opParaEstudio));
}

/**
 * Célula conta no Consolidado da sigla pedida.
 * `Compra - Manhã|Tarde|Noite|Comercial` entra como dia escalado daquele turno;
 * `Venda` conta como Folga (operacionalmente livre).
 */
export function celulaConsolidadoContaComoSigla(
  valorArmazenado: string,
  sigla: "MRN" | "AFT" | "NGT" | "Comercial" | "Folga",
): boolean {
  const v = (valorArmazenado ?? "").trim();
  if (!v) return false;
  if (v === sigla) return true;
  if (sigla === "Folga") return valorCelulaEhFolgaOperacional(v);
  const turno = turnoOperacionalValorGrade(v);
  if (!turno) return false;
  if (sigla === "Comercial") return turno === "Comercial";
  return turnoOperacionalParaSiglaGrade(turno) === sigla;
}

export function contarCelulasComSigla(
  linhas: LinhaColaborador[],
  dias: DiaMes[],
  celulas: Record<string, string> | undefined,
  sigla: "MRN" | "AFT" | "NGT" | "Comercial" | "Folga",
): number[] {
  return dias.map((dia) =>
    linhas.reduce((acc, row) => {
      const k = chaveCelulaGerar(row.id, dia.iso);
      const v = celulas?.[k] ?? "";
      return acc + (celulaConsolidadoContaComoSigla(v, sigla) ? 1 : 0);
    }, 0),
  );
}

export const CONSOLIDADO_ESTUDIO_KEY_TODOS = "__todos__";
export const CONSOLIDADO_ESTUDIO_KEY_NENHUM = "__nenhum__";

/** Converte key do drilldown Consolidado → valor do `FiltroEstudioSelect`. */
export function filtroEstudioValueFromConsolidadoKey(key: string): string {
  if (key === CONSOLIDADO_ESTUDIO_KEY_TODOS) return FILTRO_STAFF_ESTUDIO_TODOS;
  if (key === CONSOLIDADO_ESTUDIO_KEY_NENHUM) return FILTRO_STAFF_ESTUDIO_NENHUM;
  return key;
}

/** Key do drilldown ativa conforme o filtro da barra.
 * «Todos Estúdios» na barra não destaca um bucket de slug — o destaque do bucket
 * `__todos__` usa o filtro de turno da linha pai (ver `alternarFiltroEstudioConsolidado`).
 */
export function consolidadoKeyFromFiltroEstudio(filtro: string): string | null {
  if (filtro === FILTRO_STAFF_ESTUDIO_TODOS) return null;
  if (filtro === FILTRO_STAFF_ESTUDIO_NENHUM) return CONSOLIDADO_ESTUDIO_KEY_NENHUM;
  return filtro;
}

export type ConsolidadoEstudioLinha = {
  key: string;
  label: string;
  counts: number[];
};

/** Bucket de estúdio para drilldown do Consolidado (primário / Todos / Sem estúdio). */
export function bucketEstudioConsolidado(
  row: Pick<RpcPrestadorEscala, "staff_estudio_slug" | "staff_estudio_slugs" | "staff_operadora_slug">,
  opParaEstudio: Record<string, string>,
  estudiosNome: Record<string, string>,
): { key: string; label: string } {
  const slugs = staffEstudioSlugsFromRow(row, opParaEstudio);
  if (slugs.length === 0) {
    return { key: CONSOLIDADO_ESTUDIO_KEY_NENHUM, label: "Sem estúdio" };
  }
  if (staffEstudioAtendeTodos(slugs) || slugs.includes(STAFF_ESTUDIO_CADASTRO_TODOS)) {
    return { key: CONSOLIDADO_ESTUDIO_KEY_TODOS, label: "Todos Estúdios" };
  }
  const slug = slugs[0]!;
  return { key: slug, label: estudiosNome[slug] ?? slug };
}

/**
 * Contagem por estúdio × dia para uma sigla de turno (Game Presenter + Todos Estúdios).
 * Ordena: estúdios nomeados A–Z, depois Todos Estúdios, depois Sem estúdio.
 */
export function contarCelulasComSiglaPorEstudio(
  prestadores: RpcPrestadorEscala[],
  dias: DiaMes[],
  celulas: Record<string, string> | undefined,
  sigla: "MRN" | "AFT" | "NGT" | "Comercial",
  opParaEstudio: Record<string, string>,
  estudiosNome: Record<string, string>,
): ConsolidadoEstudioLinha[] {
  const map = new Map<string, { label: string; counts: number[] }>();
  for (const p of prestadores) {
    const bucket = bucketEstudioConsolidado(p, opParaEstudio, estudiosNome);
    let entry = map.get(bucket.key);
    if (!entry) {
      entry = { label: bucket.label, counts: dias.map(() => 0) };
      map.set(bucket.key, entry);
    }
    for (let i = 0; i < dias.length; i++) {
      const dia = dias[i]!;
      const k = chaveCelulaGerar(p.id, dia.iso);
      if (celulaConsolidadoContaComoSigla(celulas?.[k] ?? "", sigla)) {
        entry.counts[i] = (entry.counts[i] ?? 0) + 1;
      }
    }
  }
  const rows: ConsolidadoEstudioLinha[] = [...map.entries()].map(([key, v]) => ({
    key,
    label: v.label,
    counts: v.counts,
  }));
  rows.sort((a, b) => {
    const rank = (k: string) =>
      k === CONSOLIDADO_ESTUDIO_KEY_TODOS ? 1 : k === CONSOLIDADO_ESTUDIO_KEY_NENHUM ? 2 : 0;
    const ra = rank(a.key);
    const rb = rank(b.key);
    if (ra !== rb) return ra - rb;
    return a.label.localeCompare(b.label, "pt-BR");
  });
  return rows.filter((r) => r.counts.some((n) => n > 0));
}

/** Valor interno gravado na célula para dia de trabalho (MRN / AFT / NGT). */
export function valorTurnoTrabalhoInternoParaLinha(siglaTurnoStaff: string, turnoStaffNome: string): string {
  if (turnoStaffEhComercial5x2(turnoStaffNome)) return "";
  const sigla = siglaTurnoStaff.trim();
  if (sigla === "MRN" || sigla === "AFT" || sigla === "NGT") return sigla;
  return "";
}

/**
 * Células Comercial: Escala Escritório (todas as abas) ou Escala Estúdio só na aba Academy.
 */
export function areaEscalaPermiteCelulaComercial(
  modo: EscalaGradeModo,
  areaKey?: string | null,
): boolean {
  return modo === "escritorio" || areaKey === "academy";
}

function labelTurnoOperacionalCelula(work: string): string {
  if (work === "MRN") return "Manhã";
  if (work === "AFT") return "Tarde";
  if (work === "NGT") return "Noite";
  return "";
}

/** Opções do `<select>` por tipo de turno — reutiliza o mesmo array (evita N×dias alocações). */
export const OPCOES_SELECT_CELULA_CACHE = new Map<string, { value: string; label: string }[]>();

const OPCOES_CELULA_ESCRITORIO: { value: string; label: string }[] = [
  { value: "", label: "—" },
  { value: "Folga", label: "Folga" },
  { value: "Comercial", label: "Comercial" },
];

/**
 * Grade padrão Escala Escritório: dias úteis = Comercial; fim de semana / feriado SP = Folga.
 * Valores existentes válidos (Comercial / Folga) prevalecem sobre o padrão.
 */
export function mesclarCelulasEscritorioComPadrao(
  linhas: { id: string }[],
  dias: { iso: string }[],
  existentes?: Record<string, string> | null,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of linhas) {
    for (const d of dias) {
      const k = chaveCelulaGerar(row.id, d.iso);
      const bruto = (existentes?.[k] ?? "").trim();
      const v = sanitizarValorCelulaGerar("", bruto, "", "escritorio");
      out[k] = v || valorCelulaHorarioComercialSintetico(d.iso);
    }
  }
  return out;
}

export function opcoesSelectCelulaGerar(
  row: Pick<LinhaColaborador, "siglaTurnoStaff" | "turnoStaffNome">,
  modo: EscalaGradeModo = "estudio",
  areaKey?: string | null,
): { value: string; label: string }[] {
  if (modo === "escritorio") return OPCOES_CELULA_ESCRITORIO;
  /** Academy + turno Comercial (5×2): mesmas opções do Escritório. */
  if (areaKey === "academy" && turnoStaffEhComercial5x2(row.turnoStaffNome)) {
    return OPCOES_CELULA_ESCRITORIO;
  }
  const work = valorTurnoTrabalhoInternoParaLinha(row.siglaTurnoStaff, row.turnoStaffNome);
  const cacheKey = `${areaKey === "academy" ? "academy|" : ""}${work || "__none__"}`;
  const cached = OPCOES_SELECT_CELULA_CACHE.get(cacheKey);
  if (cached) return cached;
  const out: { value: string; label: string }[] = [
    { value: "", label: "—" },
    { value: "Folga", label: "Folga" },
  ];
  const labelWork = labelTurnoOperacionalCelula(work);
  if (work && labelWork) {
    out.push({ value: work, label: labelWork });
  }
  if (areaKey === "academy") {
    out.push({ value: "Comercial", label: "Comercial" });
  }
  // Compra/Venda são preenchidos exclusivamente pela automação do Marketplace.
  out.push({ value: "Troca", label: "Troca" });
  OPCOES_SELECT_CELULA_CACHE.set(cacheKey, out);
  return out;
}

/**
 * Garante valor coerente: Folga; Compra/Venda/Troca; sigla/Comercial de trabalho da linha; vazio.
 * Aceita legado Manhã/Tarde/Noite se coincidir com a sigla permitida.
 * Comercial no Estúdio: somente aba Academy.
 */
export function sanitizarValorCelulaGerar(
  siglaTurnoStaff: string,
  valorArmazenado: string,
  turnoStaffNome: string,
  modo: EscalaGradeModo = "estudio",
  areaKey?: string | null,
): string {
  const v = (valorArmazenado ?? "").trim();
  if (modo === "escritorio") {
    if (v === "F" || v.toLowerCase() === "folga") return "Folga";
    if (v === "Comercial" || v.toLowerCase() === "comercial") return "Comercial";
    if (!v) return "";
    return "";
  }
  if (v === "Compra" || v === "Venda" || v === "Troca") return v;
  if (v === "F" || v.toLowerCase() === "folga") return "Folga";
  const work = valorTurnoTrabalhoInternoParaLinha(siglaTurnoStaff, turnoStaffNome);
  const permit = new Set<string>(["", "Folga", "Compra", "Venda", "Troca"]);
  if (work) permit.add(work);
  if (areaEscalaPermiteCelulaComercial(modo, areaKey)) {
    permit.add("Comercial");
  }
  if (v === "Comercial" || v.toLowerCase() === "comercial") {
    return permit.has("Comercial") ? "Comercial" : "";
  }
  if (permit.has(v)) return v;
  const comoSigla = turnoOperacionalParaSiglaGrade(v);
  if (comoSigla && permit.has(comoSigla)) return comoSigla;
  if (v === "T") {
    const mrn = turnoOperacionalParaSiglaGrade("Manhã");
    if (mrn && permit.has(mrn)) return mrn;
  }
  return "";
}

/** Snapshot completo (todas as chaves linha×dia) para comparar com a base. */
export function buildCelulasSnapshotGrade(
  linhasF: LinhaColaborador[],
  dias: DiaMes[],
  celulas: Record<string, string>,
  /** Grade aprovada: preserva MRN/AFT/NGT/Comercial sem amarrar ao Staff vivo. */
  celulasLivres = false,
  modo: EscalaGradeModo = "estudio",
  areaKey?: string | null,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of linhasF) {
    for (const d of dias) {
      const k = chaveCelulaGerar(row.id, d.iso);
      const bruto = celulas[k] ?? "";
      out[k] = celulasLivres
        ? sanitizarValorCelulaAlterarEscala(bruto, modo, areaKey)
        : sanitizarValorCelulaGerar(row.siglaTurnoStaff, bruto, row.turnoStaffNome, modo, areaKey);
    }
  }
  return out;
}

export type RpcTurnoMesListarRow = {
  area_key: string;
  funcionario_id: string;
  staff_turno: string;
  staff_horario_turno: string | null;
};

export function mapTurnoMesRowsParaEstado(rows: RpcTurnoMesListarRow[]): EscalaTurnoMesMap {
  const out: EscalaTurnoMesMap = {};
  for (const row of rows) {
    const area = (row.area_key ?? "").trim();
    const fid = (row.funcionario_id ?? "").trim();
    const turno = (row.staff_turno ?? "").trim();
    if (!area || !fid || !turno) continue;
    out[chaveTurnoMes(area, fid)] = {
      staff_turno: turno,
      staff_horario_turno: row.staff_horario_turno?.trim() || null,
    };
  }
  return out;
}

export function linhaComTurnoMesArea(
  r: RpcPrestadorEscala,
  areaKey: AreaEscalaKey,
  aprovada: boolean,
  turnoMes: EscalaTurnoMesMap,
): LinhaColaborador {
  const base = mapLinhaPrestador(r);
  return aplicarTurnoSnapshotNaLinha(base, aprovada, turnoMes[chaveTurnoMes(areaKey, r.id)], HELPERS_TURNO_SNAPSHOT);
}

/** Texto exibido na célula (grade ou somente leitura): Manhã / Tarde / Noite / Comercial. */
export function labelExibicaoCelulaEscala(
  siglaTurnoStaff: string,
  valorArmazenado: string | undefined,
  turnoStaffNome: string,
  modo: EscalaGradeModo = "estudio",
  areaKey?: string | null,
): string {
  const v = sanitizarValorCelulaGerar(siglaTurnoStaff, valorArmazenado ?? "", turnoStaffNome, modo, areaKey);
  if (!v) return "—";
  if (v === "Folga") return "Folga";
  if (v === "Comercial") return "Comercial";
  if (v === "Compra" || v === "Venda" || v === "Troca") return v;
  if (v === "MRN") return "Manhã";
  if (v === "AFT") return "Tarde";
  if (v === "NGT") return "Noite";
  return "—";
}

export const DOW_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;

/** Larguras fixas das colunas sticky (Nome / Nickname / Turno) — soma usada em `left`. */
export const STICKY_W_NOME = 180;
export const STICKY_W_NICK = 156;
export const STICKY_W_TURNO_STAFF = 112;
export const STICKY_LEFT_NICK = STICKY_W_NOME;
export const STICKY_LEFT_TURNO_STAFF = STICKY_W_NOME + STICKY_W_NICK;

/** Colunas fixas quando a coluna Nome está oculta (Service Manager, Shift Leader). */
export const STICKY_LEFT_NICK_SEM_NOME = 0;
export const STICKY_LEFT_TURNO_SEM_NOME = STICKY_W_NICK;

/** Consolidado: coluna Turno fixa ao rolar horizontalmente. */
export const CONSOLIDADO_COL_TURNO_W = 168;
export const CONSOLIDADO_FONT_HEADER = 12;
export const CONSOLIDADO_FONT_TURNO = 13;
export const CONSOLIDADO_FONT_DIA_HEADER = 11;
export const Z_CONSOLIDADO_STICKY_HEAD = 25;
export const Z_CONSOLIDADO_STICKY_ROW = 24;

/** Toolbar Escala Diária — fundos transparentes com tint semântico (Global § paleta de dados). */
export const ESCALA_TOOLBAR_AZUL = "#1e36f8";
export const ESCALA_TOOLBAR_VERDE = "#22c55e";
export const ESCALA_TOOLBAR_VERMELHO = "#e84025";

export function escalaToolbarBtnBase(extra?: CSSProperties): CSSProperties {
  return {
    padding: "10px 16px",
    borderRadius: 10,
    fontFamily: FONT.body,
    fontSize: 13,
    fontWeight: 700,
    whiteSpace: "nowrap",
    ...extra,
  };
}

export function escalaToolbarBtnAzul(extra?: CSSProperties): CSSProperties {
  return escalaToolbarBtnBase({
    border: `1px solid ${ESCALA_TOOLBAR_AZUL}`,
    background: `color-mix(in srgb, ${ESCALA_TOOLBAR_AZUL} 22%, transparent)`,
    color: ESCALA_TOOLBAR_AZUL,
    ...extra,
  });
}

export function escalaToolbarBtnVerde(extra?: CSSProperties): CSSProperties {
  return escalaToolbarBtnBase({
    border: `1px solid ${ESCALA_TOOLBAR_VERDE}`,
    background: `color-mix(in srgb, ${ESCALA_TOOLBAR_VERDE} 22%, transparent)`,
    color: ESCALA_TOOLBAR_VERDE,
    ...extra,
  });
}

export function escalaToolbarBtnVermelho(extra?: CSSProperties): CSSProperties {
  return escalaToolbarBtnBase({
    border: `1px solid ${ESCALA_TOOLBAR_VERMELHO}`,
    background: `color-mix(in srgb, ${ESCALA_TOOLBAR_VERMELHO} 22%, transparent)`,
    color: ESCALA_TOOLBAR_VERMELHO,
    ...extra,
  });
}

export function escalaToolbarBtnNeutro(
  t: { cardBorder: string; inputBg?: string; cardBg?: string; text: string },
  extra?: CSSProperties,
): CSSProperties {
  return escalaToolbarBtnBase({
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg ?? t.cardBg ?? "transparent",
    color: t.text,
    ...extra,
  });
}

/** Navegação e escala consideram a partir de abril de 2026 (sem escala antes). */
export const ESCALA_ANO_MIN = 2026;
/** Abril (0-indexado). */
export const ESCALA_MES0_MIN = 3;

export function primeiroDiaMes(ano: number, mes0: number): Date {
  return new Date(ano, mes0, 1);
}

export function dataMinimaEscalaCarrossel(): Date {
  return primeiroDiaMes(ESCALA_ANO_MIN, ESCALA_MES0_MIN);
}

/** Último mês permitido no carrossel: o mês civil seguinte ao de hoje (não listar meses além disso). */
export function dataMaximaEscalaCarrossel(diaReferencia: Date): Date {
  const min = dataMinimaEscalaCarrossel();
  const cand = primeiroDiaMes(diaReferencia.getFullYear(), diaReferencia.getMonth() + 1);
  return cand < min ? min : cand;
}

export function mesReferenciaInicial(): { ano: number; mes: number } {
  const hoje = new Date();
  const min = dataMinimaEscalaCarrossel();
  const max = dataMaximaEscalaCarrossel(hoje);
  let d = primeiroDiaMes(hoje.getFullYear(), hoje.getMonth());
  if (d < min) d = min;
  if (d > max) d = max;
  return { ano: d.getFullYear(), mes: d.getMonth() };
}

export function diasDoMes(ano: number, mes0: number): DiaMes[] {
  const ultimo = new Date(ano, mes0 + 1, 0).getDate();
  const out: DiaMes[] = [];
  for (let day = 1; day <= ultimo; day++) {
    const dt = new Date(ano, mes0, day);
    const dow = dt.getDay();
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const iso = `${y}-${m}-${dd}`;
    const feriadoNome = feriadoLabelSaoPauloCapital(iso) ?? null;
    out.push({
      dia: day,
      dowShort: DOW_SHORT[dow] ?? "",
      isWeekend: dow === 0 || dow === 6,
      isFeriadoSP: feriadoNome !== null,
      feriadoNome,
      iso,
    });
  }
  return out;
}

/** Formato: "Janeiro 2026" (nome do mês em pt-BR + ano). */
export function labelMesAno(ano: number, mes0: number): string {
  const nomeMes = new Date(ano, mes0, 1).toLocaleDateString("pt-BR", { month: "long" });
  const capitalizado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
  return `${capitalizado} ${ano}`;
}

/** Nome cadastrado na Gestão de Prestadores: apenas primeiro e último token (ex.: "Ana Paula Costa" → "Ana Costa"). */
export function primeiroEUltimoNomePrestador(nomeCompleto: string): string {
  const partes = nomeCompleto.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "—";
  if (partes.length === 1) return partes[0]!;
  return `${partes[0]!} ${partes[partes.length - 1]!}`;
}

export function mapLinhaPrestador(r: RpcPrestadorEscala): LinhaColaborador {
  const nick = (r.staff_nickname ?? "").trim();
  const esc = (r.escala ?? "").trim();
  const coOp = staffTurnoCoerenteComEscala(r.escala, r.staff_turno);
  const turnoRh = turnoRhCoerenteComEscala(r.escala, r.staff_turno);
  const siglaTurnoStaff = escalaPrestadorTemTurnosOperacionais(r.escala) ? turnoOperacionalParaSiglaGrade(coOp) : "";
  const turnoStaffNome = escalaPrestadorTemTurnosOperacionais(r.escala) ? coOp : turnoRh;
  const nomeCadastro = (r.nome ?? "").trim();
  const liveRaw = r.staff_live_no_estudio;
  const liveIso =
    liveRaw == null
      ? null
      : typeof liveRaw === "string"
        ? liveRaw.trim().slice(0, 10) || null
        : String(liveRaw).slice(0, 10) || null;
  return {
    id: r.id,
    nome: nomeCadastro ? primeiroEUltimoNomePrestador(nomeCadastro) : "—",
    nomeCompletoCadastro: nomeCadastro || "—",
    nickname: nick || "—",
    escalaCadastro: esc || "—",
    siglaTurnoStaff,
    turnoStaffNome,
    liveNoEstudioIso: liveIso,
  };
}

