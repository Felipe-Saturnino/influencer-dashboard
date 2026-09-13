import { afterEach, describe, expect, it } from "vitest";
import {
  consumeIdleSessionLogoutFlag,
  IDLE_SESSION_LOGOUT_FLAG_KEY,
  idleSessionMsUntilExpiry,
  IDLE_SESSION_TIMEOUT_MS,
  markIdleSessionLogout,
} from "../../../src/lib/idleSessionConstants";

describe("idleSessionMsUntilExpiry", () => {
  it("retorna tempo restante até expirar", () => {
    const now = 1_000_000;
    const last = now - 10 * 60 * 1000;
    expect(idleSessionMsUntilExpiry(last, now)).toBe(IDLE_SESSION_TIMEOUT_MS - 10 * 60 * 1000);
  });

  it("retorna 0 quando já expirou", () => {
    const now = 1_000_000;
    const last = now - IDLE_SESSION_TIMEOUT_MS - 1;
    expect(idleSessionMsUntilExpiry(last, now)).toBe(0);
  });
});

describe("markIdleSessionLogout / consumeIdleSessionLogoutFlag", () => {
  afterEach(() => {
    sessionStorage.removeItem(IDLE_SESSION_LOGOUT_FLAG_KEY);
  });

  it("marca e consome a flag uma única vez", () => {
    expect(consumeIdleSessionLogoutFlag()).toBe(false);
    markIdleSessionLogout();
    expect(sessionStorage.getItem(IDLE_SESSION_LOGOUT_FLAG_KEY)).toBe("1");
    expect(consumeIdleSessionLogoutFlag()).toBe(true);
    expect(consumeIdleSessionLogoutFlag()).toBe(false);
  });
});
