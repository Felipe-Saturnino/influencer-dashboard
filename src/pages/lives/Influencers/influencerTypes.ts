import { BRAND } from "../../../lib/dashboardConstants";
import type { InfluencerOperadora } from "../../../types";
import type { Plataforma } from "../../../constants/platforms";

export type InfluencerModalTab = "cadastral" | "canais" | "financeiro" | "operadoras" | "historico";

export type StatusInfluencer = "ativo" | "inativo" | "cancelado";

export const STATUS_OPTS: StatusInfluencer[] = ["ativo", "inativo", "cancelado"];

export const STATUS_COLOR: Record<StatusInfluencer, string> = {
  ativo: BRAND.verde,
  inativo: BRAND.amarelo,
  cancelado: BRAND.vermelho,
};

export const STATUS_LABEL: Record<StatusInfluencer, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  cancelado: "Cancelado",
};

export interface Perfil {
  id: string;
  nome_artistico?: string;
  nome_completo?: string;
  status?: StatusInfluencer;
  telefone?: string;
  cpf?: string;
  canais?: Plataforma[];
  link_twitch?: string;
  link_youtube?: string;
  link_kick?: string;
  link_instagram?: string;
  link_tiktok?: string;
  link_discord?: string;
  link_whatsapp?: string;
  link_telegram?: string;
  cache_hora?: number;
  banco?: string;
  agencia?: string;
  conta?: string;
  chave_pix?: string;
  created_at?: string;
  updated_at?: string;
  status_alterado_em?: string;
}

export interface Influencer {
  id: string;
  name: string;
  email: string;
  ativo?: boolean | null;
  perfil: Perfil | null;
  operadoras: InfluencerOperadora[];
}

export const emptyPerfil = (id: string): Perfil => ({
  id,
  nome_artistico: "",
  nome_completo: "",
  status: "ativo",
  telefone: "",
  cpf: "",
  canais: [],
  link_twitch: "",
  link_youtube: "",
  link_kick: "",
  link_instagram: "",
  link_tiktok: "",
  link_discord: "",
  link_whatsapp: "",
  link_telegram: "",
  cache_hora: 0,
  banco: "",
  agencia: "",
  conta: "",
  chave_pix: "",
});
