// ─── PLATAFORMAS DE INFLUENCERS ───────────────────────────────────────────────
// Usado em Scout, Influencers, Agenda, Resultados, Feedback

export type Plataforma =
  | "Twitch"
  | "YouTube"
  | "Kick"
  | "Instagram"
  | "TikTok"
  | "Discord"
  | "WhatsApp"
  | "Telegram";

export const PLATAFORMAS: Plataforma[] = [
  "Twitch",
  "YouTube",
  "Kick",
  "Instagram",
  "TikTok",
  "Discord",
  "WhatsApp",
  "Telegram",
];

export const PLAT_COLOR: Record<string, string> = {
  Twitch:   "#9146ff",
  YouTube:  "#ff0000",
  Kick:     "#53fc18",
  Instagram: "#e1306c",
  TikTok:   "#69c9d0",
  Discord:  "#5865f2",
  WhatsApp: "#25d366",
  Telegram: "#26a5e4",
};

export const PLAT_LOGO: Record<string, string> = {
  Twitch:   "https://cdn.simpleicons.org/twitch/9146FF",
  YouTube:  "https://cdn.simpleicons.org/youtube/FF0000",
  Kick:     "https://cdn.simpleicons.org/kick/53FC18",
  Instagram: "https://cdn.simpleicons.org/instagram/E1306C",
  TikTok:   "https://cdn.simpleicons.org/tiktok/000000",
  Discord:  "https://cdn.simpleicons.org/discord/5865F2",
  WhatsApp: "https://cdn.simpleicons.org/whatsapp/25D366",
  Telegram: "https://cdn.simpleicons.org/telegram/26A5E4",
};

export const PLAT_LOGO_DARK: Record<string, string> = {
  ...PLAT_LOGO,
  TikTok: "https://cdn.simpleicons.org/tiktok/FFFFFF",
};

// Mapeamento de plataforma para coluna de link em influencer_perfil
export const PLAT_LINK_KEY: Record<string, string> = {
  Twitch:   "link_twitch",
  YouTube:  "link_youtube",
  Kick:     "link_kick",
  Instagram: "link_instagram",
  TikTok:   "link_tiktok",
  Discord:  "link_discord",
  WhatsApp: "link_whatsapp",
  Telegram: "link_telegram",
};
