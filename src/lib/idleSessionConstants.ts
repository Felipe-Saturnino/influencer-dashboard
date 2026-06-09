/** Tempo máximo sem interação antes do logout automático. */
export const IDLE_SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/** Intervalo mínimo entre gravações de atividade no localStorage (sincronização entre abas). */
export const IDLE_SESSION_ACTIVITY_THROTTLE_MS = 15_000;

export const IDLE_SESSION_LAST_ACTIVITY_KEY = "spin_idle_last_activity";

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
