import { supabase } from "./supabase";
import type {
  PerformanceHubAvaliacao,
  PerformanceHubCriterioResposta,
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
  solicitacao_feedback_texto: string | null;
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
    solicitacaoFeedbackTexto: row.solicitacao_feedback_texto,
  };
}

function mapAvaliacaoParaRow(
  row: PerformanceHubAvaliacao,
): Omit<AvaliacaoRow, "id"> & { id?: string } {
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
  solicitacao_feedback_texto
`;

export async function fetchPerformanceHubAvaliacoes(): Promise<PerformanceHubAvaliacao[]> {
  const { data, error } = await supabase
    .from("academy_performance_hub_avaliacao")
    .select(SELECT_AVALIACAO)
    .order("data_avaliacao", { ascending: false });

  if (error) {
    console.error("Performance Hub: falha ao carregar avaliações", error);
    return [];
  }

  return ((data ?? []) as AvaliacaoRow[]).map(mapRowParaAvaliacao);
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
