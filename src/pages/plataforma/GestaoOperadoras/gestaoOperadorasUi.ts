export function tableRowHoverBg(isDark: boolean): string {
  return isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
}

export type ModalTabId = "dados" | "brand" | "operacoes";

export type MesaCadastroResumo = {
  tipo_jogo: string;
  nome_mesa: string;
  numero_mesa: string | null;
  mesa_identificacao: string;
  mesa_identificacao_operadora: string | null;
};

export { timeDbToInput } from "../../../lib/turnosDealers";
