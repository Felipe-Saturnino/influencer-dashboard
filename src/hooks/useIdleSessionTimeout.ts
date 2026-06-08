import { useEffect, useRef } from "react";
import {
  clearIdleSessionLastActivity,
  idleSessionMsUntilExpiry,
  IDLE_SESSION_ACTIVITY_THROTTLE_MS,
  IDLE_SESSION_LAST_ACTIVITY_KEY,
  readIdleSessionLastActivityOrNull,
  writeIdleSessionLastActivity,
} from "../lib/idleSessionConstants";

const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"] as const;

/**
 * Encerra a sessão após período sem interação. Sincroniza última atividade entre abas via localStorage.
 */
export function useIdleSessionTimeout(enabled: boolean, onTimeout: () => void | Promise<void>) {
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWriteRef = useRef(0);
  const firingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const clearScheduled = () => {
      if (timeoutIdRef.current != null) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    };

    const fireTimeout = () => {
      if (firingRef.current) return;
      firingRef.current = true;
      clearScheduled();
      void Promise.resolve(onTimeoutRef.current()).finally(() => {
        firingRef.current = false;
      });
    };

    const schedule = (lastActivity: number) => {
      clearScheduled();
      const remaining = idleSessionMsUntilExpiry(lastActivity);
      if (remaining <= 0) {
        fireTimeout();
        return;
      }
      timeoutIdRef.current = setTimeout(fireTimeout, remaining);
    };

    const bumpActivity = () => {
      const now = Date.now();
      if (now - lastWriteRef.current < IDLE_SESSION_ACTIVITY_THROTTLE_MS) return;
      lastWriteRef.current = now;
      writeIdleSessionLastActivity(now);
      schedule(now);
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key !== IDLE_SESSION_LAST_ACTIVITY_KEY || e.newValue == null) return;
      const ts = Number(e.newValue);
      if (!Number.isFinite(ts)) return;
      schedule(ts);
    };

    const lastActivity = readIdleSessionLastActivityOrNull();
    if (lastActivity == null) {
      const now = Date.now();
      writeIdleSessionLastActivity(now);
      lastWriteRef.current = now;
      schedule(now);
    } else if (idleSessionMsUntilExpiry(lastActivity) <= 0) {
      fireTimeout();
      return () => {
        clearScheduled();
      };
    } else {
      schedule(lastActivity);
    }

    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, bumpActivity, { passive: true });
    }
    window.addEventListener("storage", onStorage);

    return () => {
      clearScheduled();
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, bumpActivity);
      }
      window.removeEventListener("storage", onStorage);
      clearIdleSessionLastActivity();
    };
  }, [enabled]);
}
