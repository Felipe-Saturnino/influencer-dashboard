import { supabase } from "./supabase";
import {
  RH_FORMACAO_HISTORICO_ACAO_LABEL,
  RH_FORMACAO_HISTORICO_BLOCO_LABEL,
} from "./rhFormacaoCompetenciasConstants";
import type { RhFormacaoHistoricoAcao, RhFormacaoHistoricoBloco } from "../types/rhFormacaoCompetencias";

export function montarResumoHistoricoFormacao(
  acao: RhFormacaoHistoricoAcao,
  bloco: RhFormacaoHistoricoBloco,
  resumo: string,
): string {
  const prefixo = RH_FORMACAO_HISTORICO_ACAO_LABEL[acao];
  const blocoLabel = RH_FORMACAO_HISTORICO_BLOCO_LABEL[bloco];
  const detalhe = resumo.trim();
  return detalhe ? `${prefixo} — ${blocoLabel}: ${detalhe}` : `${prefixo} — ${blocoLabel}`;
}

export async function registrarHistoricoFormacaoCompetencias(opts: {
  rhFuncionarioId: string;
  acao: RhFormacaoHistoricoAcao;
  bloco: RhFormacaoHistoricoBloco;
  resumo: string;
  usuarioLabel: string;
}): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("rh_funcionario_historico").insert({
    rh_funcionario_id: opts.rhFuncionarioId,
    tipo: "formacao_competencias",
    detalhes: {
      acao: opts.acao,
      bloco: opts.bloco,
      resumo: opts.resumo.trim(),
      usuario_label: opts.usuarioLabel,
    },
    anexos: [],
  });
  if (error) return { error: new Error(error.message) };
  return { error: null };
}
