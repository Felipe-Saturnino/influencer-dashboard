export type Role = "admin";
export interface User {
  id:    string;
  name:  string;
  email: string;
  role:  Role;
}
export type PageKey =
  | "dashboard"
  | "agenda"
  | "resultado_lives"
  | "feedback"
  | "influencers"
  | "configuracoes"
  | "ajuda";
export type Plataforma = "Twitch" | "YouTube" | "Instagram" | "TikTok" | "Kick";
export type LiveStatus = "agendada" | "realizada" | "nao_realizada";
export interface LiveResultado {
  id?:           string;
  live_id:       string;
  duracao_horas: number;
  duracao_min:   number;
  media_views:   number;
  max_views:     number;
  observacao?:   string;
}
export interface Live {
  id:               string;
  influencer_id:    string;
  influencer_name?: string; // join com profiles
  created_by?:      string; // auth.uid() de quem criou
  titulo:           string;
  data:             string;  // ISO date: "2026-02-24"
  horario:          string;  // "HH:MM"
  observacao?:      string;
  plataforma:       Plataforma;
  status:           LiveStatus;
  link?:            string;
  created_at?:      string;
}
