export type Role = "admin" | "influencer";

export interface User {
  name:  string;
  email: string;
  role:  Role;
}

export type Language = "pt" | "en";

export type PageKey =
  | "dashboard"
  | "agenda"
  | "influencers"
  | "relatorios"
  | "vendas"
  | "perfil"
  | "configuracoes"
  | "ajuda";

export type Plataforma = "Twitch" | "YouTube" | "Instagram" | "TikTok" | "Kick";
export type Periodo    = "manha" | "tarde" | "noite";
export type LiveStatus = "agendada" | "realizada" | "nao_realizada";

export interface Live {
  id:             string;
  influencer_id:  string;
  influencer_name?: string; // join com profiles
  titulo:         string;
  data:           string;   // ISO date: "2026-02-24"
  horario:        string;   // "HH:MM"
  periodo:        Periodo;
  plataforma:     Plataforma;
  status:         LiveStatus;
  link?:          string;
  created_at?:    string;
}
