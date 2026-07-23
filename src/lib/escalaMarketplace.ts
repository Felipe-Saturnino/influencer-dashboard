/**
 * Marketplace de turnos — ofertas (listar / criar / aceitar).
 *
 * Gap entre turnos: produto pede ≥12h entre fim de um turno e início do seguinte
 * ao ofertar/aceitar. A validação completa (horários da grade + operadora) fica
 * para o fluxo Ofertar; ver `gapMinimoMarketplaceOk` / `MS_12H` e
 * `rhCalendarioGap8hFolga` como referência de cálculo.
 */
import { supabase } from "./supabase";
import { fetchInBatched } from "./supabasePaginate";
import { normRhOrgRotuloOrganograma } from "./rhPrestadorUsuarioSync";
import type { RhCalendarioAcaoTipo } from "./rhCalendarioAcaoHelpers";
import type {
  EscalaTimeFiltro,
  LinhaOfertaMarketplace,
  OfertaStatusUi,
} from "./escalaTurnosUiConstants";

/** Intervalo mínimo entre turnos no Marketplace (produto: ≥12h). */
export const MS_12H = 12 * 60 * 60 * 1000;

/**
 * TODO: validar gap ≥12h entre fim do turno anterior e início do ofertado
 * (adaptar de `rhCalendarioGap8hFolga` quando o modal Ofertar estiver completo).
 * Por ora sempre `true` — não inventar cálculo parcial.
 */
export function gapMinimoMarketplaceOk(_args?: unknown): boolean {
  return true;
}

export type EscalaMarketplaceOfertaDb = {
  id: string;
  tipo: string;
  status: string;
  ofertante_funcionario_id: string;
  org_time_id: string;
  dia_iso: string;
  valor_celula_origem: string;
  turno_label: string | null;
  interessado_funcionario_id: string | null;
  dia_iso_interesse: string | null;
  valor_celula_interesse: string | null;
  criado_em: string;
  atualizado_em?: string;
  aceito_em?: string | null;
  observacao?: string | null;
};

const TIPOS_OFERTA: ReadonlySet<string> = new Set([
  "venda_turno",
  "venda_folga",
  "oferta_troca",
  "troca_cassada",
]);

function isoDate(v: string | null | undefined): string {
  if (!v) return "";
  return String(v).slice(0, 10);
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
  const label = (row.turno_label ?? "").trim();
  if (label) return label;
  const cel = (row.valor_celula_origem ?? "").trim();
  return cel || "—";
}

export function mapOfertaDbParaLinha(
  row: EscalaMarketplaceOfertaDb,
  nomesPorId: Map<string, string>,
  timeNomePorId: Map<string, string>,
  operadoraPorFuncId: Map<string, string>,
): LinhaOfertaMarketplace {
  const ofertanteId = row.ofertante_funcionario_id;
  const interessadoId = row.interessado_funcionario_id;
  const timeNome = timeNomePorId.get(row.org_time_id);
  const operadora = (operadoraPorFuncId.get(ofertanteId) ?? "").trim() || "—";

  return {
    id: row.id,
    dataOfertaIso: isoDate(row.dia_iso),
    dataAberturaIso: isoDate(row.criado_em) || undefined,
    tipo: mapTipoDb(row.tipo),
    turnoOferta: turnoLabelOferta(row),
    operadora,
    ofertante: nomesPorId.get(ofertanteId) ?? labelTruncadoUuid(ofertanteId),
    dataInteresseIso: isoDate(row.dia_iso_interesse) || undefined,
    turnoInteresse: (row.valor_celula_interesse ?? "").trim() || undefined,
    timeKey: timeKeyFromOrgTimeNome(timeNome),
    status: mapStatusDbParaUi(row.status),
    comprador: interessadoId
      ? (nomesPorId.get(interessadoId) ?? labelTruncadoUuid(interessadoId))
      : undefined,
    solicitanteStaffId: ofertanteId,
  };
}

async function carregarNomesFuncionarios(ids: string[]): Promise<{
  nomes: Map<string, string>;
  operadoras: Map<string, string>;
}> {
  const nomes = new Map<string, string>();
  const operadoras = new Map<string, string>();
  const uniq = [...new Set(ids.filter(Boolean))];
  if (!uniq.length) return { nomes, operadoras };

  const rows = await fetchInBatched(
    uniq,
    80,
    async (slice) => {
      const { data, error } = await supabase
        .from("rh_funcionarios")
        .select("id, nome, staff_operadora_slug")
        .in("id", slice);
      if (error) {
        console.error("[escalaMarketplace] rh_funcionarios", error);
        return [];
      }
      return (data ?? []) as { id: string; nome: string | null; staff_operadora_slug: string | null }[];
    },
    2,
  );

  for (const r of rows) {
    const nome = (r.nome ?? "").trim();
    if (nome) nomes.set(r.id, nome);
    const op = (r.staff_operadora_slug ?? "").trim();
    if (op) operadoras.set(r.id, op);
  }
  return { nomes, operadoras };
}

async function carregarNomesTimes(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const uniq = [...new Set(ids.filter(Boolean))];
  if (!uniq.length) return map;

  const rows = await fetchInBatched(
    uniq,
    80,
    async (slice) => {
      const { data, error } = await supabase.from("rh_org_times").select("id, nome").in("id", slice);
      if (error) {
        console.error("[escalaMarketplace] rh_org_times", error);
        return [];
      }
      return (data ?? []) as { id: string; nome: string | null }[];
    },
    2,
  );

  for (const r of rows) {
    const nome = (r.nome ?? "").trim();
    if (nome) map.set(r.id, nome);
  }
  return map;
}

/**
 * Lista ofertas do Marketplace.
 * @param refMesIso primeiro dia do mês (`YYYY-MM-01`) ou `null` = todo o histórico (RPC sem filtro de mês)
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

  const raw = (data ?? []) as EscalaMarketplaceOfertaDb[];
  if (!raw.length) return [];

  const funcIds: string[] = [];
  const timeIds: string[] = [];
  for (const r of raw) {
    if (r.ofertante_funcionario_id) funcIds.push(r.ofertante_funcionario_id);
    if (r.interessado_funcionario_id) funcIds.push(r.interessado_funcionario_id);
    if (r.org_time_id) timeIds.push(r.org_time_id);
  }

  const [{ nomes, operadoras }, timeNomes] = await Promise.all([
    carregarNomesFuncionarios(funcIds),
    carregarNomesTimes(timeIds),
  ]);

  return raw.map((r) => mapOfertaDbParaLinha(r, nomes, timeNomes, operadoras));
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
  const payload = data as { ok?: boolean; error?: string; area_key?: string } | null;
  if (!payload?.ok) {
    return { ok: false, error: payload?.error ?? "unknown" };
  }
  return { ok: true, areaKey: payload.area_key };
}

export type CriarOfertaMarketplaceInput = {
  tipo: string;
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
  const payload = data as { ok?: boolean; error?: string; id?: string } | null;
  if (!payload?.ok || !payload.id) {
    return { ok: false, error: payload?.error ?? "unknown" };
  }
  return { ok: true, id: String(payload.id) };
}
