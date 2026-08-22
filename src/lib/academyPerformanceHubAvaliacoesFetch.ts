import { getPeriodoHistoricoCompetencias } from "./dashboardHelpers";
import { supabase } from "./supabase";
import { fetchAllPages } from "./supabasePaginate";
import type {
  PerformanceHubAvaliacao,
  PerformanceHubCriterioResposta,
  PerformanceHubHistoricoAcao,
  PerformanceHubHistoricoItem,
  PerformanceHubJogoKey,
  PerformanceHubStatus,
  PerformanceHubTimeSlug,
  PerformanceHubTipoAvaliacao,
  PerformanceHubTurno,
} from "./academyPerformanceHubTypes";

type AvaliacaoRow = {
  id: string;
  data_avaliacao: string;
  time_slug: PerformanceHubTimeSlug;
  avaliado_staff_id: string | null;
  avaliado_nome: string;
  avaliador_nome: string;
  status: PerformanceHubStatus;
  nota_total: number | null;
  nota_imagem: number | null;
  nota_comunicacao: number | null;
  nota_mesa: number | null;
  nota_procedimentos: number | null;
  tipo_avaliacao: PerformanceHubTipoAvaliacao | null;
  turno: PerformanceHubTurno | null;
  estudio_id: string | null;
  jogo: PerformanceHubJogoKey | null;
  mesa_id: string | null;
  pontos_fortes: string | null;
  pontos_desenvolver: string | null;
  criterios: Record<string, PerformanceHubCriterioResposta> | null;
  video_url: string | null;
  video_nome: string | null;
  video_removido_em: string | null;
  solicitacao_feedback_texto: string | null;
  solicitacao_feedback_por_nome: string | null;
  solicitacao_feedback_em: string | null;
  aplicacao_feedback_texto: string | null;
  aplicacao_feedback_por_nome: string | null;
  aplicacao_feedback_em: string | null;
};

/** `video_removido_em` é escrito só pela retenção (Edge Function) — nunca pela UI. */
type AvaliacaoWriteRow = Omit<AvaliacaoRow, "id" | "video_removido_em"> & { id?: string };

type HistoricoRow = {
  id: string;
  avaliacao_id: string;
  created_at: string;
  acao: PerformanceHubHistoricoAcao;
  usuario_nome: string;
  mensagem: string | null;
};

function formatDataBrFromIso(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

function parseDataBrParaIso(dataBr: string): string | null {
  const [dia, mes, ano] = dataBr.split("/").map(Number);
  if (!dia || !mes || !ano) return null;
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function mapRowParaAvaliacao(row: AvaliacaoRow): PerformanceHubAvaliacao {
  return {
    id: row.id,
    data: formatDataBrFromIso(row.data_avaliacao),
    time: row.time_slug,
    avaliadoNome: row.avaliado_nome,
    avaliadoStaffId: row.avaliado_staff_id ?? undefined,
    avaliadorNome: row.avaliador_nome,
    status: row.status,
    notaTotal: row.nota_total,
    notaImagem: row.nota_imagem,
    notaComunicacao: row.nota_comunicacao,
    notaMesa: row.nota_mesa,
    notaProcedimentos: row.nota_procedimentos,
    tipoAvaliacao: row.tipo_avaliacao,
    turno: row.turno,
    estudioId: row.estudio_id,
    jogo: row.jogo,
    mesaId: row.mesa_id,
    pontosFortes: row.pontos_fortes,
    pontosDesenvolver: row.pontos_desenvolver,
    criterios: row.criterios ?? undefined,
    videoUrl: row.video_url,
    videoNome: row.video_nome,
    videoRemovidoEm: row.video_removido_em,
    solicitacaoFeedbackTexto: row.solicitacao_feedback_texto,
    solicitacaoFeedbackPorNome: row.solicitacao_feedback_por_nome,
    solicitacaoFeedbackEm: row.solicitacao_feedback_em,
    aplicacaoFeedbackTexto: row.aplicacao_feedback_texto,
    aplicacaoFeedbackPorNome: row.aplicacao_feedback_por_nome,
    aplicacaoFeedbackEm: row.aplicacao_feedback_em,
  };
}

function mapAvaliacaoParaRow(row: PerformanceHubAvaliacao): AvaliacaoWriteRow {
  const dataIso = parseDataBrParaIso(row.data) ?? new Date().toISOString().slice(0, 10);
  return {
    id: row.id.startsWith("novo-") ? undefined : row.id,
    data_avaliacao: dataIso,
    time_slug: row.time,
    avaliado_staff_id: row.avaliadoStaffId ?? null,
    avaliado_nome: row.avaliadoNome,
    avaliador_nome: row.avaliadorNome,
    status: row.status,
    nota_total: row.notaTotal,
    nota_imagem: row.notaImagem,
    nota_comunicacao: row.notaComunicacao,
    nota_mesa: row.notaMesa,
    nota_procedimentos: row.notaProcedimentos,
    tipo_avaliacao: row.tipoAvaliacao ?? null,
    turno: row.turno ?? null,
    estudio_id: row.estudioId ?? null,
    jogo: row.jogo ?? null,
    mesa_id: row.mesaId ?? null,
    pontos_fortes: row.pontosFortes ?? null,
    pontos_desenvolver: row.pontosDesenvolver ?? null,
    criterios: row.criterios ?? null,
    video_url: row.videoUrl ?? null,
    video_nome: row.videoNome ?? null,
    solicitacao_feedback_texto: row.solicitacaoFeedbackTexto ?? null,
    solicitacao_feedback_por_nome: row.solicitacaoFeedbackPorNome ?? null,
    solicitacao_feedback_em: row.solicitacaoFeedbackEm ?? null,
    aplicacao_feedback_texto: row.aplicacaoFeedbackTexto ?? null,
    aplicacao_feedback_por_nome: row.aplicacaoFeedbackPorNome ?? null,
    aplicacao_feedback_em: row.aplicacaoFeedbackEm ?? null,
  };
}

function mapHistoricoRow(row: HistoricoRow): PerformanceHubHistoricoItem {
  return {
    id: row.id,
    avaliacaoId: row.avaliacao_id,
    createdAt: row.created_at,
    acao: row.acao,
    usuarioNome: row.usuario_nome,
    mensagem: row.mensagem,
  };
}

const SELECT_AVALIACAO = `
  id,
  data_avaliacao,
  time_slug,
  avaliado_staff_id,
  avaliado_nome,
  avaliador_nome,
  status,
  nota_total,
  nota_imagem,
  nota_comunicacao,
  nota_mesa,
  nota_procedimentos,
  tipo_avaliacao,
  turno,
  estudio_id,
  jogo,
  mesa_id,
  pontos_fortes,
  pontos_desenvolver,
  criterios,
  video_url,
  video_nome,
  video_removido_em,
  solicitacao_feedback_texto,
  solicitacao_feedback_por_nome,
  solicitacao_feedback_em,
  aplicacao_feedback_texto,
  aplicacao_feedback_por_nome,
  aplicacao_feedback_em
`;

export async function fetchPerformanceHubAvaliacoes(): Promise<PerformanceHubAvaliacao[]> {
  try {
    const { inicio, fim } = getPeriodoHistoricoCompetencias();
    const rows = await fetchAllPages<AvaliacaoRow>(async (from, to) =>
      supabase
        .from("academy_performance_hub_avaliacao")
        .select(SELECT_AVALIACAO)
        .gte("data_avaliacao", inicio)
        .lte("data_avaliacao", fim)
        .order("data_avaliacao", { ascending: false })
        .range(from, to),
    );
    return rows.map(mapRowParaAvaliacao);
  } catch (error) {
    console.error("Performance Hub: falha ao carregar avaliações", error);
    return [];
  }
}

export async function upsertPerformanceHubAvaliacao(
  row: PerformanceHubAvaliacao,
): Promise<PerformanceHubAvaliacao | null> {
  const payload = mapAvaliacaoParaRow(row);
  const isNovo = !payload.id;

  if (isNovo) {
    const { data, error } = await supabase
      .from("academy_performance_hub_avaliacao")
      .insert({ ...payload, id: undefined })
      .select(SELECT_AVALIACAO)
      .single();

    if (error) {
      console.error("Performance Hub: falha ao criar avaliação", error);
      return null;
    }
    return mapRowParaAvaliacao(data as AvaliacaoRow);
  }

  const { data, error } = await supabase
    .from("academy_performance_hub_avaliacao")
    .update(payload)
    .eq("id", payload.id!)
    .select(SELECT_AVALIACAO)
    .single();

  if (error) {
    console.error("Performance Hub: falha ao atualizar avaliação", error);
    return null;
  }
  return mapRowParaAvaliacao(data as AvaliacaoRow);
}

export async function fetchHistoricoAvaliacaoPerformanceHub(
  avaliacaoId: string,
): Promise<PerformanceHubHistoricoItem[]> {
  if (!avaliacaoId || avaliacaoId.startsWith("novo-")) return [];
  const { data, error } = await supabase
    .from("academy_performance_hub_avaliacao_historico")
    .select("id, avaliacao_id, created_at, acao, usuario_nome, mensagem")
    .eq("avaliacao_id", avaliacaoId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Performance Hub: falha ao carregar histórico", error);
    return [];
  }
  return ((data ?? []) as HistoricoRow[]).map(mapHistoricoRow);
}

export async function registrarHistoricoAvaliacaoPerformanceHub(opts: {
  avaliacaoId: string;
  acao: PerformanceHubHistoricoAcao;
  usuarioNome: string;
  mensagem?: string | null;
}): Promise<boolean> {
  if (!opts.avaliacaoId || opts.avaliacaoId.startsWith("novo-")) return false;
  const { error } = await supabase.from("academy_performance_hub_avaliacao_historico").insert({
    avaliacao_id: opts.avaliacaoId,
    acao: opts.acao,
    usuario_nome: opts.usuarioNome.trim() || "Usuário",
    mensagem: opts.mensagem?.trim() || null,
  });
  if (error) {
    console.error("Performance Hub: falha ao registrar histórico", error);
    return false;
  }
  return true;
}

export function formatDataHoraHistoricoPerformanceHub(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
