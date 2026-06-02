import { supabase } from "./supabase";
import { RH_EXPERIENCIA_HISTORICO_ACAO_LABEL } from "./rhExperienciaProfissionalConstants";
import type { RhExperienciaHistoricoAcao } from "../types/rhExperienciaProfissional";

export function montarResumoHistoricoExperiencia(acao: RhExperienciaHistoricoAcao, resumo: string): string {
  const prefixo = RH_EXPERIENCIA_HISTORICO_ACAO_LABEL[acao];
  const detalhe = resumo.trim();
  return detalhe ? `${prefixo} — ${detalhe}` : prefixo;
}

export function resumoExperienciaHistorico(cargo: string, empresa: string): string {
  return `${cargo.trim()} · ${empresa.trim()}`;
}

export async function registrarHistoricoExperienciaProfissional(opts: {
  rhFuncionarioId: string;
  acao: RhExperienciaHistoricoAcao;
  resumo: string;
  usuarioLabel: string;
}): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("rh_funcionario_historico").insert({
    rh_funcionario_id: opts.rhFuncionarioId,
    tipo: "experiencia_profissional",
    detalhes: {
      acao: opts.acao,
      resumo: opts.resumo.trim(),
      usuario_label: opts.usuarioLabel,
    },
    anexos: [],
  });
  if (error) return { error: new Error(error.message) };
  return { error: null };
}
