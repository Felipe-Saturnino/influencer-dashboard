import { supabase } from "./supabase";
import { horaAtualBrasil, hojeIsoBrasil, subDiasIso } from "./dateBrasil";

export type TurnoRelatorioTurno = "manha" | "tarde" | "noite";
export type TurnoRelatorioEstudio = "manha" | "noite";

export const TURNO_TURNO_OPCOES: { value: TurnoRelatorioTurno; label: string }[] = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
];

export const TURNO_ESTUDIO_OPCOES: { value: TurnoRelatorioEstudio; label: string }[] = [
  { value: "manha", label: "Manhã" },
  { value: "noite", label: "Noite" },
];

export function labelTurno(turno: string): string {
  if (turno === "manha") return "Manhã";
  if (turno === "tarde") return "Tarde";
  if (turno === "noite") return "Noite";
  return turno;
}

export function formatDataBr(iso: string): string {
  const s = iso.slice(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/**
 * Data do turno = dia civil em que o turno começou (não a data da publicação).
 * Antes de 12h SP, default = ontem (relatório noturno costuma fechar de manhã).
 */
export function dataPadraoRelatorioTurno(): string {
  const hoje = hojeIsoBrasil();
  return horaAtualBrasil() < 12 ? subDiasIso(hoje, 1) : hoje;
}

/** Opções de Data do turno: ontem e hoje (fuso SP). */
export function opcoesDataTurnoRelatorio(): { value: string; label: string }[] {
  const hoje = hojeIsoBrasil();
  const ontem = subDiasIso(hoje, 1);
  return [
    { value: ontem, label: `${formatDataBr(ontem)} (ontem)` },
    { value: hoje, label: `${formatDataBr(hoje)} (hoje)` },
  ];
}

export const HINT_DATA_TURNO =
  "Data em que o turno começou (ex.: Noite que começa às 20h/23h = data desse dia, mesmo se publicar na manhã seguinte).";


export type EstudioAtivoOpt = { slug: string; nome: string };

export type RoletaOpt = { key: string; label: string };

export type ManutencaoPayload = {
  roletas: { key: string; label: string; feito: boolean }[];
  mesas: { slug: string; nome: string; feito: boolean }[];
  cc_machine: boolean;
  cartas_contadas: boolean;
};

export type RelatorioTurnoEstudioBloco = {
  estudio_slug: string;
  estudio_nome: string;
  gp_escalados: number;
  absenteismo: number;
  resumo: string;
};

export type RelatorioTurnoShufflerBloco = {
  shuffler_escalados: number;
  absenteismo: number;
  resumo: string;
};

export type RelatorioTurnoRow = {
  id: string;
  data: string;
  turno: TurnoRelatorioTurno;
  relator_user_id: string;
  relator_nome: string;
  geral: string;
  publicado_em: string;
  escala_relatorio_turno_estudio?: RelatorioTurnoEstudioBloco[] | null;
  escala_relatorio_turno_shuffler?: RelatorioTurnoShufflerBloco | null;
};

export type RelatorioEstudioRow = {
  id: string;
  data: string;
  turno: TurnoRelatorioEstudio;
  relator_user_id: string;
  relator_nome: string;
  sos: number;
  sinais: number;
  payout: number;
  resumo: string;
  manutencao: ManutencaoPayload;
  publicado_em: string;
};

function unwrapShuffler(emb: unknown): RelatorioTurnoShufflerBloco | null {
  if (emb == null) return null;
  if (Array.isArray(emb)) {
    const first = emb[0] as RelatorioTurnoShufflerBloco | undefined;
    return first ?? null;
  }
  return emb as RelatorioTurnoShufflerBloco;
}

function unwrapEstudios(
  emb: RelatorioTurnoEstudioBloco[] | RelatorioTurnoEstudioBloco | null | undefined,
): RelatorioTurnoEstudioBloco[] {
  if (emb == null) return [];
  return Array.isArray(emb) ? emb : [emb];
}

export function totaisRelatorioTurno(row: RelatorioTurnoRow): {
  escalados: number;
  absenteismo: number;
} {
  const blocos = unwrapEstudios(row.escala_relatorio_turno_estudio);
  const shuf = unwrapShuffler(row.escala_relatorio_turno_shuffler);
  const escalados =
    blocos.reduce((acc, b) => acc + (Number(b.gp_escalados) || 0), 0) +
    (Number(shuf?.shuffler_escalados) || 0);
  const absenteismo =
    blocos.reduce((acc, b) => acc + (Number(b.absenteismo) || 0), 0) +
    (Number(shuf?.absenteismo) || 0);
  return { escalados, absenteismo };
}

export function contagemManutencoes(m: ManutencaoPayload | null | undefined): {
  feitos: number;
  total: number;
} {
  if (!m) return { feitos: 0, total: 0 };
  const itens: boolean[] = [
    ...(m.roletas ?? []).map((r) => r.feito),
    ...(m.mesas ?? []).map((x) => x.feito),
    Boolean(m.cc_machine),
    Boolean(m.cartas_contadas),
  ];
  const total = itens.length;
  const feitos = itens.filter(Boolean).length;
  return { feitos, total };
}

export async function fetchEstudiosAtivosRelatorio(): Promise<EstudioAtivoOpt[]> {
  const { data, error } = await supabase
    .from("estudios_spin")
    .select("slug, nome")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []).map((r: { slug: string; nome: string }) => ({
    slug: r.slug,
    nome: r.nome,
  }));
}

export async function fetchOpcoesManutencao(): Promise<{
  estudios: EstudioAtivoOpt[];
  roletas: RoletaOpt[];
}> {
  const { data, error } = await supabase.rpc("escala_relatorio_turno_opcoes_manutencao");
  if (error) {
    console.error(error);
    const estudios = await fetchEstudiosAtivosRelatorio();
    return { estudios, roletas: [] };
  }
  const raw = data as { estudios?: EstudioAtivoOpt[]; roletas?: RoletaOpt[] } | null;
  return {
    estudios: raw?.estudios ?? [],
    roletas: raw?.roletas ?? [],
  };
}

export async function listarRelatoriosTurno(opts: {
  dataIni?: string;
  dataFim?: string;
}): Promise<RelatorioTurnoRow[]> {
  let q = supabase
    .from("escala_relatorio_turno")
    .select(
      "id, data, turno, relator_user_id, relator_nome, geral, publicado_em, escala_relatorio_turno_estudio(estudio_slug, estudio_nome, gp_escalados, absenteismo, resumo), escala_relatorio_turno_shuffler(shuffler_escalados, absenteismo, resumo)",
    )
    .order("data", { ascending: false })
    .order("publicado_em", { ascending: false })
    .limit(500);
  if (opts.dataIni) q = q.gte("data", opts.dataIni);
  if (opts.dataFim) q = q.lte("data", opts.dataFim);
  const { data, error } = await q;
  if (error) {
    console.error(error);
    throw error;
  }
  return ((data ?? []) as unknown as RelatorioTurnoRow[]).map((r) => ({
    ...r,
    escala_relatorio_turno_estudio: unwrapEstudios(r.escala_relatorio_turno_estudio),
    escala_relatorio_turno_shuffler: unwrapShuffler(r.escala_relatorio_turno_shuffler),
  }));
}

export async function listarRelatoriosEstudio(opts: {
  dataIni?: string;
  dataFim?: string;
}): Promise<RelatorioEstudioRow[]> {
  let q = supabase
    .from("escala_relatorio_estudio")
    .select(
      "id, data, turno, relator_user_id, relator_nome, sos, sinais, payout, resumo, manutencao, publicado_em",
    )
    .order("data", { ascending: false })
    .order("publicado_em", { ascending: false })
    .limit(500);
  if (opts.dataIni) q = q.gte("data", opts.dataIni);
  if (opts.dataFim) q = q.lte("data", opts.dataFim);
  const { data, error } = await q;
  if (error) {
    console.error(error);
    throw error;
  }
  return (data ?? []).map((r) => {
    const row = r as RelatorioEstudioRow & { sos: unknown; sinais: unknown; payout?: unknown };
    return {
      ...row,
      sos: Number(row.sos) || 0,
      sinais: Number(row.sinais) || 0,
      payout: Number(row.payout) || 0,
      manutencao: normalizarManutencao(row.manutencao),
    };
  });
}

function normalizarManutencao(raw: unknown): ManutencaoPayload {
  const m = (raw ?? {}) as Partial<ManutencaoPayload>;
  return {
    roletas: Array.isArray(m.roletas) ? m.roletas : [],
    mesas: Array.isArray(m.mesas) ? m.mesas : [],
    cc_machine: Boolean(m.cc_machine),
    cartas_contadas: Boolean(m.cartas_contadas),
  };
}

export async function publicarRelatorioTurno(input: {
  data: string;
  turno: TurnoRelatorioTurno;
  relatorNome: string;
  geral: string;
  estudios: RelatorioTurnoEstudioBloco[];
  shuffler: { shuffler_escalados: number; absenteismo: number; resumo: string };
}): Promise<{ ok: true } | { ok: false }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const dataIso = input.data.slice(0, 10);
  const { data: rel, error } = await supabase
    .from("escala_relatorio_turno")
    .insert({
      data: dataIso,
      turno: input.turno,
      relator_user_id: user.id,
      relator_nome: input.relatorNome.trim() || user.email || "Usuário",
      geral: input.geral.trim(),
    })
    .select("id")
    .single();
  if (error || !rel?.id) {
    console.error(error);
    return { ok: false };
  }

  const { error: errEst } = await supabase.from("escala_relatorio_turno_estudio").insert(
    input.estudios.map((e) => ({
      relatorio_id: rel.id,
      estudio_slug: e.estudio_slug,
      estudio_nome: e.estudio_nome,
      gp_escalados: e.gp_escalados,
      absenteismo: e.absenteismo,
      resumo: e.resumo.trim(),
    })),
  );
  if (errEst) {
    console.error(errEst);
    await supabase.from("escala_relatorio_turno").delete().eq("id", rel.id);
    return { ok: false };
  }

  const { error: errShuf } = await supabase.from("escala_relatorio_turno_shuffler").insert({
    relatorio_id: rel.id,
    shuffler_escalados: input.shuffler.shuffler_escalados,
    absenteismo: input.shuffler.absenteismo,
    resumo: input.shuffler.resumo.trim(),
  });
  if (errShuf) {
    console.error(errShuf);
    await supabase.from("escala_relatorio_turno").delete().eq("id", rel.id);
    return { ok: false };
  }
  return { ok: true };
}

export async function publicarRelatorioEstudio(input: {
  data: string;
  turno: TurnoRelatorioEstudio;
  relatorNome: string;
  sos: number;
  sinais: number;
  payout: number;
  resumo: string;
  manutencao: ManutencaoPayload;
}): Promise<{ ok: true } | { ok: false }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase.from("escala_relatorio_estudio").insert({
    data: input.data.slice(0, 10),
    turno: input.turno,
    relator_user_id: user.id,
    relator_nome: input.relatorNome.trim() || user.email || "Usuário",
    sos: input.sos,
    sinais: input.sinais,
    payout: input.payout,
    resumo: input.resumo.trim(),
    manutencao: input.manutencao,
  });
  if (error) {
    console.error(error);
    return { ok: false };
  }
  return { ok: true };
}

export function dataIsoNoMes(dataIso: string, ano: number, mes0: number): boolean {
  const s = dataIso.slice(0, 10);
  const ini = `${ano}-${String(mes0 + 1).padStart(2, "0")}-01`;
  const fimDate = new Date(Date.UTC(ano, mes0 + 1, 0));
  const fim = `${fimDate.getUTCFullYear()}-${String(fimDate.getUTCMonth() + 1).padStart(2, "0")}-${String(fimDate.getUTCDate()).padStart(2, "0")}`;
  return s >= ini && s <= fim;
}
