import { describe, expect, it } from "vitest";
import {
  emailNaStagingAllowlist,
  isStagingPagesHostname,
  parseStagingLoginAllowlist,
  podeAcessarStagingLogin,
} from "./stagingLoginAllowlist";

describe("stagingLoginAllowlist", () => {
  it("detecta hostname Pages staging", () => {
    expect(isStagingPagesHostname("influencer-dashboard-c5r.pages.dev")).toBe(true);
    expect(isStagingPagesHostname("foo.cloudflareapp.com")).toBe(true);
    expect(isStagingPagesHostname("data-intelligence.spingaming.com.br")).toBe(false);
    expect(isStagingPagesHostname("localhost")).toBe(false);
  });

  it("parseia e-mails e domínios", () => {
    expect(parseStagingLoginAllowlist("a@x.com, @spingaming.com.br; B@Y.COM")).toEqual([
      "a@x.com",
      "@spingaming.com.br",
      "b@y.com",
    ]);
  });

  it("valida allowlist", () => {
    const list = ["felipe@spingaming.com.br", "@spin.dev"];
    expect(emailNaStagingAllowlist("felipe@spingaming.com.br", list)).toBe(true);
    expect(emailNaStagingAllowlist("outro@spin.dev", list)).toBe(true);
    expect(emailNaStagingAllowlist("x@outro.com", list)).toBe(false);
    expect(emailNaStagingAllowlist("felipe@spingaming.com.br", [])).toBe(false);
  });

  it("fora de staging sempre libera; em staging exige lista", () => {
    expect(
      podeAcessarStagingLogin("qualquer@x.com", {
        hostname: "data-intelligence.spingaming.com.br",
        allowlistRaw: "",
      }),
    ).toBe(true);
    expect(
      podeAcessarStagingLogin("ok@spingaming.com.br", {
        hostname: "app.pages.dev",
        allowlistRaw: "ok@spingaming.com.br",
      }),
    ).toBe(true);
    expect(
      podeAcessarStagingLogin("nope@x.com", {
        hostname: "app.pages.dev",
        allowlistRaw: "ok@spingaming.com.br",
      }),
    ).toBe(false);
    expect(
      podeAcessarStagingLogin("ok@x.com", {
        hostname: "app.pages.dev",
        allowlistRaw: "",
      }),
    ).toBe(false);
  });
});
