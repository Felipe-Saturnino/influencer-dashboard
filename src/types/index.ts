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
