import { supabase } from "./supabase";

export const MSG_ERRO_CT =
  "Não foi possível carregar os dados. Se o problema persistir, entre em contato com o suporte.";
export const MSG_ERRO_CT_SALVAR =
  "Não foi possível salvar. Se o problema persistir, entre em contato com o suporte.";

export type CtTurno = "manha" | "tarde" | "noite";
export type CtMotivoAusencia = "medico" | "pessoal";
export type CtFeedbackRecomendacao =
  | "orientacao"
  | "alinhamento"
  | "notif_descumprimento"
  | "notif_suspensao"
  | "persistencia";
export type CtFeedbackStatus = "aplicado" | "revisar";
export type CtManutTipo = "ti" | "limpeza" | "tech_ops";
export type CtManutStatus = "aberto" | "em_andamento" | "concluido" | "cancelado";
export type CtRelatorioStatus = "rascunho" | "publicado";
export type CtPresencaStatus =
  | "presente"
  | "atraso"
  | "falta"
  | "pendente"
  | "saida_antecipada"
  | "hora_adicional";
export type CtPresencaTipo =
  | "falta"
  | "saida_antecipada"
  | "hora_adicional"
  | "registrar_horario";

export type CtMesaOpt = {
  id: string;
  label: string;
  nome: string;
  numero: string;
  estudioSlug: string;
  estudioNome: string;
  jogo: string;
};

export type CtEstudioOpt = { slug: string; nome: string };

export type CtPrestadorOpt = { id: string; nome: string; time: string };

export type CtFechamentoRow = {
  id: string;
  data_registro: string;
  mesa_id: string;
  hora_fechamento: string;
  hora_reabertura: string | null;
  nao_reaberta: boolean;
  observacao: string;
  lideranca_fechamento_user_id: string | null;
  lideranca_fechamento_nome: string;
  lideranca_reabertura_user_id: string | null;
  lideranca_reabertura_nome: string;
  mesa_label: string;
  mesa_nome: string;
  mesa_estudio: string;
  mesa_jogo: string;
};

export type CtAusenciaRow = {
  id: string;
  prestador_id: string;
  prestador_nome: string;
  motivo: CtMotivoAusencia;
  inicio: string;
  fim: string | null;
  fim_nao_informado: boolean;
  observacao: string;
  lideranca_user_id: string | null;
  lideranca_nome: string;
};

export type CtFeedbackRow = {
  id: string;
  data_registro: string;
  prestador_id: string;
  prestador_nome: string;
  recomendacao: CtFeedbackRecomendacao;
  status: CtFeedbackStatus;
  observacao: string;
  lideranca_user_id: string | null;
  lideranca_nome: string;
  aplicado_por_user_id: string | null;
  aplicado_por_nome: string;
};

export type CtManutencaoRow = {
  id: string;
  abertura: string;
  solicitante_user_id: string | null;
  solicitante_nome: string;
  tipo: CtManutTipo;
  local_key: string;
  mesa_ref: string | null;
  observacao: string;
  status: CtManutStatus;
};

/** JSON da checklist de manutenção do relatório CT (formato do mock/UI). */
export type CtRelatorioManutencaoJson = {
  roletas?: Record<string, boolean>;
  limpezaMesas?: Record<string, boolean>;
  trocaCartas?: Record<string, boolean>;
  cc?: boolean;
  cartas?: boolean;
};

export type CtRelatorioTurnoRow = {
  id: string;
  data: string;
  turno: CtTurno;
  status: CtRelatorioStatus;
  relator_user_id: string;
  relator_nome: string;
  sos: string;
  sos_nenhum: boolean;
  figurino: string;
  figurino_nenhum: boolean;
  equipamentos: string;
  equipamentos_nenhum: boolean;
  manutencao: CtRelatorioManutencaoJson;
  manutencao_resumo: string;
  comentarios: string;
  publicado_em: string | null;
  updated_at: string | null;
};

/** Linha da aba Escala do Turno — escalado do dia/turno com ponto + overlay CT. */
export type CtPresencaRow = {
  /** `rh_funcionarios.id` do prestador escalado. */
  id: string;
  nome: string;
  nickname: string;
  time: string;
  estudio: string;
  entrada: string;
  saida: string;
  status: CtPresencaStatus;
  registrado: boolean;
};

export type CtPresencaRegistroRow = {
  id: string;
  data: string;
  turno: CtTurno;
  prestador_id: string;
  tipo: CtPresencaTipo;
  status_presenca: CtPresencaStatus;
  entrada_hhmm: string;
  saida_hhmm: string;
  motivo: string;
  lideranca_user_id: string | null;
  lideranca_nome: string;
  created_at: string | null;
};

type MesaEmbed = {
  id?: string;
  nome_mesa?: string | null;
  numero_mesa?: string | null;
  tipo_jogo?: string | null;
  estudio_slug?: string | null;
};

type PrestadorEmbed = {
  id?: string;
  nome?: string | null;
};

function unwrapEmbed<T>(emb: T | T[] | null | undefined): T | null {
  if (emb == null) return null;
  return Array.isArray(emb) ? (emb[0] ?? null) : emb;
}

function isoDate(v: unknown): string {
  return String(v ?? "").slice(0, 10);
}

/** Postgres `time` → HH:MM para inputs `type="time"`. */
export function formatHoraCt(v: string | null | undefined): string {
  if (!v) return "";
  const s = String(v).trim();
  const m = /^(\d{1,2}):(\d{2})/.exec(s);
  if (!m) return s.slice(0, 5);
  return `${m[1]!.padStart(2, "0")}:${m[2]}`;
}

export function getCurrentUserNome(nomeFromCaller?: string | null): string {
  const n = (nomeFromCaller ?? "").trim();
  return n || "—";
}

async function authUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function labelMesa(estudioNome: string, nomeMesa: string, numeroMesa?: string): string {
  const e = estudioNome.trim() || "—";
  const n = nomeMesa.trim() || "—";
  const num = (numeroMesa ?? "").trim();
  return num ? `${e} - ${n} - ${num}` : `${e} - ${n}`;
}

export async function listEstudiosAtivos(): Promise<CtEstudioOpt[]> {
  const { data, error } = await supabase
    .from("estudios_spin")
    .select("slug, nome")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  if (error) {
    console.error(error);
    throw new Error(MSG_ERRO_CT);
  }
  return (data ?? []).map((e) => ({
    slug: String(e.slug),
    nome: (e.nome ?? "").trim() || String(e.slug),
  }));
}

export async function listMesasForFechamento(): Promise<CtMesaOpt[]> {
  const estudios = await listEstudiosAtivos().catch(() => [] as CtEstudioOpt[]);
  const nomeBySlug = new Map(estudios.map((e) => [e.slug, e.nome]));

  const attempts = [
    "id, nome_mesa, numero_mesa, tipo_jogo, estudio_slug",
    "id, nome_mesa, numero_mesa, tipo_jogo, operadora_slug",
    "id, nome_mesa, tipo_jogo, estudio_slug",
    "id, nome_mesa, tipo_jogo, operadora_slug",
  ];

  let rows: Record<string, unknown>[] = [];
  for (const select of attempts) {
    const { data, error } = await supabase
      .from("mesas_spin_cadastro")
      .select(select)
      .order("nome_mesa", { ascending: true });
    if (!error) {
      rows = (data ?? []) as unknown as Record<string, unknown>[];
      break;
    }
    console.error(error);
  }

  return rows.map((r) => {
    const id = String(r.id ?? "");
    const nome = String(r.nome_mesa ?? "").trim() || "—";
    const numero = String(r.numero_mesa ?? "").trim();
    const jogo = String(r.tipo_jogo ?? "").trim() || "—";
    const slug = String(r.estudio_slug ?? r.operadora_slug ?? "").trim();
    const estudioNome = nomeBySlug.get(slug) || slug || "—";
    return {
      id,
      nome,
      numero,
      jogo,
      estudioSlug: slug,
      estudioNome,
      label: labelMesa(estudioNome, nome, numero),
    };
  });
}

export async function listPrestadoresGpShuffler(): Promise<CtPrestadorOpt[]> {
  const { data, error } = await supabase.rpc("escala_controle_turno_prestadores_gp_shuffler");
  if (error) {
    console.error(error);
    throw new Error(MSG_ERRO_CT);
  }
  const arr = Array.isArray(data) ? data : [];
  return arr.map((raw) => {
    const r = raw as Record<string, unknown>;
    return {
      id: String(r.id ?? ""),
      nome: String(r.nome ?? "").trim() || "—",
      time: String(r.time ?? "").trim(),
    };
  });
}

function mapFechamento(
  row: Record<string, unknown>,
  mesaMap: Map<string, CtMesaOpt>,
): CtFechamentoRow {
  const mesaId = String(row.mesa_id ?? "");
  const emb = unwrapEmbed(row.mesas_spin_cadastro as MesaEmbed | MesaEmbed[] | null);
  const fromMap = mesaMap.get(mesaId);
  const nome = (emb?.nome_mesa ?? fromMap?.nome ?? "").trim() || "—";
  const numero = (emb?.numero_mesa ?? fromMap?.numero ?? "").trim();
  const jogo = (emb?.tipo_jogo ?? fromMap?.jogo ?? "").trim() || "—";
  const slug = (emb?.estudio_slug ?? fromMap?.estudioSlug ?? "").trim();
  const estudio = fromMap?.estudioNome || slug || "—";
  return {
    id: String(row.id ?? ""),
    data_registro: isoDate(row.data_registro),
    mesa_id: mesaId,
    hora_fechamento: formatHoraCt(row.hora_fechamento as string),
    hora_reabertura: row.hora_reabertura ? formatHoraCt(row.hora_reabertura as string) : null,
    nao_reaberta: Boolean(row.nao_reaberta),
    observacao: String(row.observacao ?? ""),
    lideranca_fechamento_user_id: (row.lideranca_fechamento_user_id as string | null) ?? null,
    lideranca_fechamento_nome: String(row.lideranca_fechamento_nome ?? ""),
    lideranca_reabertura_user_id: (row.lideranca_reabertura_user_id as string | null) ?? null,
    lideranca_reabertura_nome: String(row.lideranca_reabertura_nome ?? ""),
    mesa_label: fromMap?.label || labelMesa(estudio, nome, numero),
    mesa_nome: nome,
    mesa_estudio: estudio,
    mesa_jogo: jogo,
  };
}

export async function listFechamentos(diaIso: string): Promise<CtFechamentoRow[]> {
  const dia = diaIso.slice(0, 10);
  const mesas = await listMesasForFechamento().catch(() => [] as CtMesaOpt[]);
  const mesaMap = new Map(mesas.map((m) => [m.id, m]));

  const { data, error } = await supabase
    .from("escala_ct_fechamento_mesa")
    .select(
      "id, data_registro, mesa_id, hora_fechamento, hora_reabertura, nao_reaberta, observacao, lideranca_fechamento_user_id, lideranca_fechamento_nome, lideranca_reabertura_user_id, lideranca_reabertura_nome, mesas_spin_cadastro(id, nome_mesa, numero_mesa, tipo_jogo, estudio_slug)",
    )
    .or(`data_registro.eq.${dia},and(data_registro.lt.${dia},nao_reaberta.eq.true)`)
    .order("data_registro", { ascending: false })
    .order("hora_fechamento", { ascending: true });

  if (error) {
    console.error(error);
    throw new Error(MSG_ERRO_CT);
  }

  return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => mapFechamento(r, mesaMap));
}

export async function createFechamentos(input: {
  dataRegistro: string;
  mesas: {
    mesaId: string;
    horaFechamento: string;
    horaReabertura: string | null;
    naoReaberta: boolean;
    observacao: string;
  }[];
  liderancaNome: string;
}): Promise<void> {
  const uid = await authUserId();
  const nome = getCurrentUserNome(input.liderancaNome);
  const rows = input.mesas.map((m) => ({
    data_registro: input.dataRegistro.slice(0, 10),
    mesa_id: m.mesaId,
    hora_fechamento: m.horaFechamento,
    hora_reabertura: m.naoReaberta ? null : m.horaReabertura,
    nao_reaberta: m.naoReaberta,
    observacao: m.observacao.trim(),
    lideranca_fechamento_user_id: uid,
    lideranca_fechamento_nome: nome,
    lideranca_reabertura_user_id: m.naoReaberta ? null : uid,
    lideranca_reabertura_nome: m.naoReaberta ? "" : nome,
  }));
  const { error } = await supabase.from("escala_ct_fechamento_mesa").insert(rows);
  if (error) {
    console.error(error);
    throw new Error(MSG_ERRO_CT_SALVAR);
  }
}

export async function updateFechamento(input: {
  id: string;
  horaFechamento: string;
  horaReabertura: string | null;
  naoReaberta: boolean;
  observacao: string;
  liderancaFechamentoNome: string;
  liderancaReaberturaNome: string;
  setLiderancaReaberturaAtual: boolean;
  liderancaNomeAtual: string;
}): Promise<void> {
  const uid = await authUserId();
  const nomeAtual = getCurrentUserNome(input.liderancaNomeAtual);
  const payload: Record<string, unknown> = {
    hora_fechamento: input.horaFechamento,
    hora_reabertura: input.naoReaberta ? null : input.horaReabertura,
    nao_reaberta: input.naoReaberta,
    observacao: input.observacao.trim(),
    lideranca_fechamento_nome: input.liderancaFechamentoNome || nomeAtual,
  };
  if (input.naoReaberta) {
    payload.lideranca_reabertura_user_id = null;
    payload.lideranca_reabertura_nome = "";
  } else if (input.setLiderancaReaberturaAtual) {
    payload.lideranca_reabertura_user_id = uid;
    payload.lideranca_reabertura_nome = nomeAtual;
  } else {
    payload.lideranca_reabertura_nome = input.liderancaReaberturaNome;
  }
  const { error } = await supabase.from("escala_ct_fechamento_mesa").update(payload).eq("id", input.id);
  if (error) {
    console.error(error);
    throw new Error(MSG_ERRO_CT_SALVAR);
  }
}

function mapAusencia(row: Record<string, unknown>): CtAusenciaRow {
  const emb = unwrapEmbed(row.rh_funcionarios as PrestadorEmbed | PrestadorEmbed[] | null);
  return {
    id: String(row.id ?? ""),
    prestador_id: String(row.prestador_id ?? ""),
    prestador_nome: (emb?.nome ?? "").trim() || "—",
    motivo: row.motivo as CtMotivoAusencia,
    inicio: isoDate(row.inicio),
    fim: row.fim ? isoDate(row.fim) : null,
    fim_nao_informado: Boolean(row.fim_nao_informado),
    observacao: String(row.observacao ?? ""),
    lideranca_user_id: (row.lideranca_user_id as string | null) ?? null,
    lideranca_nome: String(row.lideranca_nome ?? ""),
  };
}

export async function listAusencias(diaIso: string): Promise<CtAusenciaRow[]> {
  const dia = diaIso.slice(0, 10);
  const { data, error } = await supabase
    .from("escala_ct_ausencia")
    .select(
      "id, prestador_id, motivo, inicio, fim, fim_nao_informado, observacao, lideranca_user_id, lideranca_nome, rh_funcionarios(id, nome)",
    )
    .lte("inicio", dia)
    .or(`fim_nao_informado.eq.true,fim.gte.${dia}`)
    .order("inicio", { ascending: false });

  if (error) {
    console.error(error);
    throw new Error(MSG_ERRO_CT);
  }
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapAusencia);
}

export async function createAusencia(input: {
  prestadorId: string;
  motivo: CtMotivoAusencia;
  inicio: string;
  fim: string | null;
  fimNaoInformado: boolean;
  observacao: string;
  liderancaNome: string;
}): Promise<void> {
  const uid = await authUserId();
  const { error } = await supabase.from("escala_ct_ausencia").insert({
    prestador_id: input.prestadorId,
    motivo: input.motivo,
    inicio: input.inicio.slice(0, 10),
    fim: input.fimNaoInformado ? null : input.fim?.slice(0, 10) ?? null,
    fim_nao_informado: input.fimNaoInformado,
    observacao: input.observacao.trim(),
    lideranca_user_id: uid,
    lideranca_nome: getCurrentUserNome(input.liderancaNome),
  });
  if (error) {
    console.error(error);
    throw new Error(MSG_ERRO_CT_SALVAR);
  }
}

export async function updateAusencia(input: {
  id: string;
  prestadorId: string;
  motivo: CtMotivoAusencia;
  inicio: string;
  fim: string | null;
  fimNaoInformado: boolean;
  observacao: string;
}): Promise<void> {
  const { error } = await supabase
    .from("escala_ct_ausencia")
    .update({
      prestador_id: input.prestadorId,
      motivo: input.motivo,
      inicio: input.inicio.slice(0, 10),
      fim: input.fimNaoInformado ? null : input.fim?.slice(0, 10) ?? null,
      fim_nao_informado: input.fimNaoInformado,
      observacao: input.observacao.trim(),
    })
    .eq("id", input.id);
  if (error) {
    console.error(error);
    throw new Error(MSG_ERRO_CT_SALVAR);
  }
}

function mapFeedback(row: Record<string, unknown>): CtFeedbackRow {
  const emb = unwrapEmbed(row.rh_funcionarios as PrestadorEmbed | PrestadorEmbed[] | null);
  return {
    id: String(row.id ?? ""),
    data_registro: isoDate(row.data_registro),
    prestador_id: String(row.prestador_id ?? ""),
    prestador_nome: (emb?.nome ?? "").trim() || "—",
    recomendacao: row.recomendacao as CtFeedbackRecomendacao,
    status: row.status as CtFeedbackStatus,
    observacao: String(row.observacao ?? ""),
    lideranca_user_id: (row.lideranca_user_id as string | null) ?? null,
    lideranca_nome: String(row.lideranca_nome ?? ""),
    aplicado_por_user_id: (row.aplicado_por_user_id as string | null) ?? null,
    aplicado_por_nome: String(row.aplicado_por_nome ?? ""),
  };
}

export async function listFeedbacks(diaIso: string): Promise<CtFeedbackRow[]> {
  const dia = diaIso.slice(0, 10);
  const { data, error } = await supabase
    .from("escala_ct_feedback")
    .select(
      "id, data_registro, prestador_id, recomendacao, status, observacao, lideranca_user_id, lideranca_nome, aplicado_por_user_id, aplicado_por_nome, rh_funcionarios(id, nome)",
    )
    .or(`data_registro.eq.${dia},and(data_registro.lt.${dia},status.eq.revisar)`)
    .order("data_registro", { ascending: false });

  if (error) {
    console.error(error);
    throw new Error(MSG_ERRO_CT);
  }
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapFeedback);
}

export async function createFeedback(input: {
  dataRegistro: string;
  prestadorId: string;
  recomendacao: CtFeedbackRecomendacao;
  observacao: string;
  liderancaNome: string;
}): Promise<void> {
  const uid = await authUserId();
  const nome = getCurrentUserNome(input.liderancaNome);
  const isOrientacao = input.recomendacao === "orientacao";
  const { error } = await supabase.from("escala_ct_feedback").insert({
    data_registro: input.dataRegistro.slice(0, 10),
    prestador_id: input.prestadorId,
    recomendacao: input.recomendacao,
    status: isOrientacao ? "aplicado" : "revisar",
    observacao: input.observacao.trim(),
    lideranca_user_id: uid,
    lideranca_nome: nome,
    aplicado_por_user_id: isOrientacao ? uid : null,
    aplicado_por_nome: isOrientacao ? nome : "",
  });
  if (error) {
    console.error(error);
    throw new Error(MSG_ERRO_CT_SALVAR);
  }
}

export async function updateFeedback(input: {
  id: string;
  status?: CtFeedbackStatus;
  observacao?: string;
  aplicadoPorNome?: string;
}): Promise<void> {
  const uid = await authUserId();
  const payload: Record<string, unknown> = {};
  if (input.status != null) payload.status = input.status;
  if (input.observacao != null) payload.observacao = input.observacao.trim();
  if (input.status === "aplicado") {
    payload.aplicado_por_user_id = uid;
    payload.aplicado_por_nome = getCurrentUserNome(input.aplicadoPorNome);
  }
  const { error } = await supabase.from("escala_ct_feedback").update(payload).eq("id", input.id);
  if (error) {
    console.error(error);
    throw new Error(MSG_ERRO_CT_SALVAR);
  }
}

function mapManutencao(row: Record<string, unknown>): CtManutencaoRow {
  return {
    id: String(row.id ?? ""),
    abertura: isoDate(row.abertura),
    solicitante_user_id: (row.solicitante_user_id as string | null) ?? null,
    solicitante_nome: String(row.solicitante_nome ?? ""),
    tipo: row.tipo as CtManutTipo,
    local_key: String(row.local_key ?? ""),
    mesa_ref: (row.mesa_ref as string | null) ?? null,
    observacao: String(row.observacao ?? ""),
    status: row.status as CtManutStatus,
  };
}

export async function listManutencoes(diaIso: string): Promise<CtManutencaoRow[]> {
  const dia = diaIso.slice(0, 10);
  const { data, error } = await supabase
    .from("escala_ct_manutencao")
    .select(
      "id, abertura, solicitante_user_id, solicitante_nome, tipo, local_key, mesa_ref, observacao, status",
    )
    .or(
      `abertura.eq.${dia},and(abertura.lt.${dia},status.not.in.(cancelado,concluido))`,
    )
    .order("abertura", { ascending: false });

  if (error) {
    console.error(error);
    throw new Error(MSG_ERRO_CT);
  }
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapManutencao);
}

export async function createManutencao(input: {
  abertura: string;
  tipo: CtManutTipo;
  localKey: string;
  mesaRef: string | null;
  observacao: string;
  solicitanteNome: string;
}): Promise<void> {
  const uid = await authUserId();
  const { error } = await supabase.from("escala_ct_manutencao").insert({
    abertura: input.abertura.slice(0, 10),
    solicitante_user_id: uid,
    solicitante_nome: getCurrentUserNome(input.solicitanteNome),
    tipo: input.tipo,
    local_key: input.localKey,
    mesa_ref: input.mesaRef,
    observacao: input.observacao.trim(),
    status: "aberto",
  });
  if (error) {
    console.error(error);
    throw new Error(MSG_ERRO_CT_SALVAR);
  }
}

export async function updateManutencao(input: {
  id: string;
  status?: CtManutStatus;
  observacao?: string;
}): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (input.status != null) payload.status = input.status;
  if (input.observacao != null) payload.observacao = input.observacao.trim();
  const { error } = await supabase.from("escala_ct_manutencao").update(payload).eq("id", input.id);
  if (error) {
    console.error(error);
    throw new Error(MSG_ERRO_CT_SALVAR);
  }
}

function mapRelatorio(row: Record<string, unknown>): CtRelatorioTurnoRow {
  const rawManut = row.manutencao;
  const manut =
    rawManut && typeof rawManut === "object" && !Array.isArray(rawManut)
      ? (rawManut as CtRelatorioManutencaoJson)
      : {};
  return {
    id: String(row.id ?? ""),
    data: isoDate(row.data),
    turno: row.turno as CtTurno,
    status: row.status as CtRelatorioStatus,
    relator_user_id: String(row.relator_user_id ?? ""),
    relator_nome: String(row.relator_nome ?? ""),
    sos: String(row.sos ?? ""),
    sos_nenhum: Boolean(row.sos_nenhum),
    figurino: String(row.figurino ?? ""),
    figurino_nenhum: Boolean(row.figurino_nenhum),
    equipamentos: String(row.equipamentos ?? ""),
    equipamentos_nenhum: Boolean(row.equipamentos_nenhum),
    manutencao: manut,
    manutencao_resumo: String(row.manutencao_resumo ?? ""),
    comentarios: String(row.comentarios ?? ""),
    publicado_em: row.publicado_em ? String(row.publicado_em) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

export async function listRelatoriosTurnoCt(diaIso: string): Promise<CtRelatorioTurnoRow[]> {
  const dia = diaIso.slice(0, 10);
  const { data, error } = await supabase
    .from("escala_ct_relatorio_turno")
    .select(
      "id, data, turno, status, relator_user_id, relator_nome, sos, sos_nenhum, figurino, figurino_nenhum, equipamentos, equipamentos_nenhum, manutencao, manutencao_resumo, comentarios, publicado_em, updated_at",
    )
    .eq("data", dia)
    .order("turno", { ascending: true });

  if (error) {
    console.error(error);
    throw new Error(MSG_ERRO_CT);
  }
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapRelatorio);
}

export async function getRelatorioTurnoCt(
  diaIso: string,
  turno: CtTurno,
): Promise<CtRelatorioTurnoRow | null> {
  const dia = diaIso.slice(0, 10);
  const { data, error } = await supabase
    .from("escala_ct_relatorio_turno")
    .select(
      "id, data, turno, status, relator_user_id, relator_nome, sos, sos_nenhum, figurino, figurino_nenhum, equipamentos, equipamentos_nenhum, manutencao, manutencao_resumo, comentarios, publicado_em, updated_at",
    )
    .eq("data", dia)
    .eq("turno", turno)
    .maybeSingle();

  if (error) {
    console.error(error);
    throw new Error(MSG_ERRO_CT);
  }
  if (!data) return null;
  return mapRelatorio(data as unknown as Record<string, unknown>);
}

export async function upsertRelatorioTurnoCt(input: {
  data: string;
  turno: CtTurno;
  status: CtRelatorioStatus;
  relatorNome: string;
  sos: string;
  sosNenhum: boolean;
  figurino: string;
  figurinoNenhum: boolean;
  equipamentos: string;
  equipamentosNenhum: boolean;
  manutencao: CtRelatorioManutencaoJson;
  manutencaoResumo: string;
  comentarios: string;
}): Promise<CtRelatorioTurnoRow> {
  const uid = await authUserId();
  if (!uid) throw new Error(MSG_ERRO_CT_SALVAR);

  const dia = input.data.slice(0, 10);
  const existing = await getRelatorioTurnoCt(dia, input.turno).catch(() => null);
  const nome = getCurrentUserNome(input.relatorNome);
  const payload = {
    data: dia,
    turno: input.turno,
    status: input.status,
    relator_user_id: existing?.relator_user_id || uid,
    relator_nome: existing?.relator_nome || nome,
    sos: input.sosNenhum ? "" : input.sos.trim(),
    sos_nenhum: input.sosNenhum,
    figurino: input.figurinoNenhum ? "" : input.figurino.trim(),
    figurino_nenhum: input.figurinoNenhum,
    equipamentos: input.equipamentosNenhum ? "" : input.equipamentos.trim(),
    equipamentos_nenhum: input.equipamentosNenhum,
    manutencao: input.manutencao,
    manutencao_resumo: input.manutencaoResumo.trim(),
    comentarios: input.comentarios.trim(),
    publicado_em: input.status === "publicado" ? new Date().toISOString() : existing?.publicado_em ?? null,
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from("escala_ct_relatorio_turno")
      .update(payload)
      .eq("id", existing.id)
      .select(
        "id, data, turno, status, relator_user_id, relator_nome, sos, sos_nenhum, figurino, figurino_nenhum, equipamentos, equipamentos_nenhum, manutencao, manutencao_resumo, comentarios, publicado_em, updated_at",
      )
      .single();
    if (error || !data) {
      console.error(error);
      throw new Error(MSG_ERRO_CT_SALVAR);
    }
    return mapRelatorio(data as unknown as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from("escala_ct_relatorio_turno")
    .insert({ ...payload, relator_user_id: uid, relator_nome: nome })
    .select(
      "id, data, turno, status, relator_user_id, relator_nome, sos, sos_nenhum, figurino, figurino_nenhum, equipamentos, equipamentos_nenhum, manutencao, manutencao_resumo, comentarios, publicado_em, updated_at",
    )
    .single();
  if (error || !data) {
    console.error(error);
    throw new Error(MSG_ERRO_CT_SALVAR);
  }
  return mapRelatorio(data as unknown as Record<string, unknown>);
}

const PRESENCA_REGISTRO_SELECT =
  "id, data, turno, prestador_id, tipo, status_presenca, entrada_hhmm, saida_hhmm, motivo, lideranca_user_id, lideranca_nome, created_at";

const PRESENCA_STATUS_VALIDOS: readonly CtPresencaStatus[] = [
  "presente",
  "atraso",
  "falta",
  "pendente",
  "saida_antecipada",
  "hora_adicional",
];

/** Status exibido na tabela conforme o tipo escolhido no modal Registrar. */
export function statusPresencaDoTipo(tipo: CtPresencaTipo): CtPresencaStatus {
  if (tipo === "falta") return "falta";
  if (tipo === "saida_antecipada") return "saida_antecipada";
  if (tipo === "hora_adicional") return "hora_adicional";
  return "presente";
}

function parsePresencaStatus(v: unknown): CtPresencaStatus {
  const s = String(v ?? "");
  return (PRESENCA_STATUS_VALIDOS as readonly string[]).includes(s)
    ? (s as CtPresencaStatus)
    : "pendente";
}

function mapPresencaRegistro(row: Record<string, unknown>): CtPresencaRegistroRow {
  return {
    id: String(row.id ?? ""),
    data: isoDate(row.data),
    turno: row.turno as CtTurno,
    prestador_id: String(row.prestador_id ?? ""),
    tipo: row.tipo as CtPresencaTipo,
    status_presenca: parsePresencaStatus(row.status_presenca),
    entrada_hhmm: String(row.entrada_hhmm ?? ""),
    saida_hhmm: String(row.saida_hhmm ?? ""),
    motivo: String(row.motivo ?? ""),
    lideranca_user_id: (row.lideranca_user_id as string | null) ?? null,
    lideranca_nome: String(row.lideranca_nome ?? ""),
    created_at: row.created_at ? String(row.created_at) : null,
  };
}

export async function listPresencaDiaTurno(
  diaIso: string,
  turno: CtTurno,
): Promise<CtPresencaRow[]> {
  const { data, error } = await supabase.rpc("escala_controle_turno_presenca_dia", {
    p_dia: diaIso.slice(0, 10),
    p_turno: turno,
  });
  if (error) {
    console.error(error);
    throw new Error(MSG_ERRO_CT);
  }
  const arr = Array.isArray(data) ? data : [];
  return arr.map((raw) => {
    const r = raw as Record<string, unknown>;
    return {
      id: String(r.id ?? ""),
      nome: String(r.nome ?? "").trim() || "—",
      nickname: String(r.nickname ?? "").trim(),
      time: String(r.time ?? "").trim(),
      estudio: String(r.estudio ?? "").trim() || "—",
      entrada: formatHoraCt(String(r.entrada ?? "")),
      saida: formatHoraCt(String(r.saida ?? "")),
      status: parsePresencaStatus(r.status),
      registrado: Boolean(r.registrado),
    };
  });
}

export async function upsertPresencaRegistro(input: {
  data: string;
  turno: CtTurno;
  prestadorId: string;
  tipo: CtPresencaTipo;
  entrada: string;
  saida: string;
  motivo: string;
  liderancaNome: string;
}): Promise<void> {
  const dia = input.data.slice(0, 10);
  const uid = await authUserId();
  const isFalta = input.tipo === "falta";
  const payload = {
    data: dia,
    turno: input.turno,
    prestador_id: input.prestadorId,
    tipo: input.tipo,
    status_presenca: statusPresencaDoTipo(input.tipo),
    entrada_hhmm: isFalta ? "" : input.entrada.trim(),
    saida_hhmm: isFalta ? "" : input.saida.trim(),
    motivo: input.motivo.trim(),
    lideranca_user_id: uid,
    lideranca_nome: getCurrentUserNome(input.liderancaNome),
  };

  const { data: existente, error: erroBusca } = await supabase
    .from("escala_ct_presenca_registro")
    .select("id")
    .eq("data", dia)
    .eq("turno", input.turno)
    .eq("prestador_id", input.prestadorId)
    .maybeSingle();
  if (erroBusca) {
    console.error(erroBusca);
    throw new Error(MSG_ERRO_CT_SALVAR);
  }

  const id = existente ? String((existente as { id?: unknown }).id ?? "") : "";
  const { error } = id
    ? await supabase.from("escala_ct_presenca_registro").update(payload).eq("id", id)
    : await supabase.from("escala_ct_presenca_registro").insert(payload);

  if (error) {
    console.error(error);
    throw new Error(MSG_ERRO_CT_SALVAR);
  }
}

/** Registros CT do prestador até o dia informado (mais novo primeiro). */
export async function listHistoricoPresenca(
  prestadorId: string,
  diaIso: string,
): Promise<CtPresencaRegistroRow[]> {
  const { data, error } = await supabase
    .from("escala_ct_presenca_registro")
    .select(PRESENCA_REGISTRO_SELECT)
    .eq("prestador_id", prestadorId)
    .lte("data", diaIso.slice(0, 10))
    .order("data", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error(error);
    throw new Error(MSG_ERRO_CT);
  }
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapPresencaRegistro);
}

/** Locais especiais (além de `estudio:<slug>`). */
export const CT_LOCAIS_ESPECIAIS: { value: string; label: string }[] = [
  { value: "shuffler_room", label: "Shuffler Room" },
  { value: "ocr", label: "OCR" },
];

export function locaisManutFromEstudios(estudios: CtEstudioOpt[]): {
  value: string;
  label: string;
  tipo: "estudio" | "especial";
  estudioSlug?: string;
  estudioNome?: string;
}[] {
  return [
    ...estudios.map((e) => ({
      value: `estudio:${e.slug}`,
      label: e.nome,
      tipo: "estudio" as const,
      estudioSlug: e.slug,
      estudioNome: e.nome,
    })),
    ...CT_LOCAIS_ESPECIAIS.map((l) => ({
      value: l.value,
      label: l.label,
      tipo: "especial" as const,
    })),
  ];
}
