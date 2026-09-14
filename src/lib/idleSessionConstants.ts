/** Tempo máximo sem interação antes do logout automático. */
export const IDLE_SESSION_TIMEOUT_MS = 60 * 60 * 1000;

/** Intervalo mínimo entre gravações de atividade no localStorage (sincronização entre abas). */
export const IDLE_SESSION_ACTIVITY_THROTTLE_MS = 15_000;

export const IDLE_SESSION_LAST_ACTIVITY_KEY = "spin_idle_last_activity";

/** Flag lida no Login após logout por inatividade. */
export const IDLE_SESSION_LOGOUT_FLAG_KEY = "spin_idle_logout";

export const IDLE_SESSION_LOGOUT_MSG =
  "Sua sessão foi encerrada por inatividade. Faça login novamente.";

export function markIdleSessionLogout(): void {
  try {
    sessionStorage.setItem(IDLE_SESSION_LOGOUT_FLAG_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Consome a flag (uma vez) — `true` se o logout foi por idle. */
export function consumeIdleSessionLogoutFlag(): boolean {
  try {
    const v = sessionStorage.getItem(IDLE_SESSION_LOGOUT_FLAG_KEY);
    if (v == null) return false;
    sessionStorage.removeItem(IDLE_SESSION_LOGOUT_FLAG_KEY);
    return true;
  } catch {
    return false;
  }
}

export function readIdleSessionLastActivity(): number {
  const last = readIdleSessionLastActivityOrNull();
  return last ?? Date.now();
}

export function readIdleSessionLastActivityOrNull(): number | null {
  try {
    const raw = localStorage.getItem(IDLE_SESSION_LAST_ACTIVITY_KEY);
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function writeIdleSessionLastActivity(timestamp: number): void {
  try {
    localStorage.setItem(IDLE_SESSION_LAST_ACTIVITY_KEY, String(timestamp));
  } catch {
    /* quota / modo privado — timer local continua válido nesta aba */
  }
}

export function clearIdleSessionLastActivity(): void {
  try {
    localStorage.removeItem(IDLE_SESSION_LAST_ACTIVITY_KEY);
  } catch {
    /* ignore */
  }
}

export function idleSessionMsUntilExpiry(lastActivity: number, now = Date.now()): number {
  return Math.max(0, IDLE_SESSION_TIMEOUT_MS - (now - lastActivity));
}
