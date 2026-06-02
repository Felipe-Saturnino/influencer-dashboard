import type { ReactNode } from "react";
import { FileText, History } from "lucide-react";
import { FILTRO_BAR_TAB_ICON_PROPS } from "../../../lib/filterBarStyles";
import type { RhFuncionario } from "../../../types/rhFuncionario";

export type AbaDetalheFig = "detalhes" | "historico";

export const DETALHE_ABAS: AbaDetalheFig[] = ["detalhes", "historico"];

export const DETALHE_TAB_ICONS: Record<AbaDetalheFig, ReactNode> = {
  detalhes: <FileText {...FILTRO_BAR_TAB_ICON_PROPS} />,
  historico: <History {...FILTRO_BAR_TAB_ICON_PROPS} />,
};

export const DETALHE_TAB_LABELS: Record<AbaDetalheFig, string> = {
  detalhes: "Detalhes",
  historico: "Histórico",
};

export type FluxoDevolucaoUi = "boa" | "possivel_descarte" | "manutencao";

export type PrestadorRetiradaRow = Pick<RhFuncionario, "id" | "nome" | "setor" | "status">;
