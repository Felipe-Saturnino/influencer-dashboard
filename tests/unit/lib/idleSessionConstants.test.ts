import { describe, expect, it } from "vitest";
import {
  idleSessionMsUntilExpiry,
  IDLE_SESSION_TIMEOUT_MS,
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
