import type { ReactNode } from "react";
import { Briefcase, Building2, Contact, FileText, GraduationCap, History } from "lucide-react";
import { FILTRO_BAR_TAB_ICON_PROPS } from "../../../components/dashboard";

export type AbaCadastro =
  | "trabalho"
  | "cadastral"
  | "documentos"
  | "formacao"
  | "experiencia"
  | "historico";

export const ABAS_CADASTRO: { key: AbaCadastro; label: string }[] = [
  { key: "trabalho", label: "Histórico de trabalho" },
  { key: "cadastral", label: "Dados cadastrais" },
  { key: "documentos", label: "Documentos" },
  { key: "formacao", label: "Formação e Competências" },
  { key: "experiencia", label: "Experiência Profissional" },
  { key: "historico", label: "Histórico" },
];

export const CADASTRO_TAB_IDS = [
  "trabalho",
  "cadastral",
  "documentos",
  "formacao",
  "experiencia",
  "historico",
] as const satisfies readonly AbaCadastro[];

export const CADASTRO_TAB_ICONS: Record<AbaCadastro, ReactNode> = {
  trabalho: <Briefcase {...FILTRO_BAR_TAB_ICON_PROPS} />,
  cadastral: <Contact {...FILTRO_BAR_TAB_ICON_PROPS} />,
  documentos: <FileText {...FILTRO_BAR_TAB_ICON_PROPS} />,
  formacao: <GraduationCap {...FILTRO_BAR_TAB_ICON_PROPS} />,
  experiencia: <Building2 {...FILTRO_BAR_TAB_ICON_PROPS} />,
  historico: <History {...FILTRO_BAR_TAB_ICON_PROPS} />,
};
